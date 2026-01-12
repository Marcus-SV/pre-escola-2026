import { GoogleSheetsService } from './google-sheets';

interface Pendente {
    escola_destino: string;
    idade: string;
    prazo: string;
    origem: 'PADRAO' | 'INTEGRAL'; // Track source
}

interface GrupoPendente {
    escola_destino: string;
    idade: string;
    quantidade: number;
    por_origem: {
        PADRAO: number;
        INTEGRAL: number;
    };
}

export class PendentesService {
    private sheetsService: GoogleSheetsService;

    constructor() {
        this.sheetsService = new GoogleSheetsService();
    }

    async verificarPendentes() {
        try {
            // 1. Fetch Standard Pendentes (Sheet 0)
            const standardResult = await this.verificarPendentesPadrao();

            // 2. Fetch Integral Pendentes (Specific Sheet ID)
            const integralResult = await this.verificarPendentesIntegral();

            const todosPendentes = [
                ...(standardResult.success ? standardResult.pendentes || [] : []),
                ...(integralResult.success ? integralResult.pendentes || [] : [])
            ];

            const totalPendentes = todosPendentes.length;
            let totalPadrao = 0;
            let totalIntegral = 0;

            // Group by School and Age
            const agrupadosMap: Record<string, GrupoPendente> = {};

            todosPendentes.forEach(p => {
                if (p.origem === 'PADRAO') totalPadrao++;
                else if (p.origem === 'INTEGRAL') totalIntegral++;

                const key = `${p.escola_destino}|${p.idade}`;
                if (!agrupadosMap[key]) {
                    agrupadosMap[key] = {
                        escola_destino: p.escola_destino,
                        idade: p.idade,
                        quantidade: 0,
                        por_origem: { PADRAO: 0, INTEGRAL: 0 }
                    };
                }
                agrupadosMap[key].quantidade++;
                if (p.origem) {
                    agrupadosMap[key].por_origem[p.origem]++;
                }
            });

            return {
                success: true,
                message: 'Pendentes verificados com sucesso (Padrão + Integral)',
                total_pendentes: totalPendentes,
                total_padrao: totalPadrao,
                total_integral: totalIntegral,
                agrupados: Object.values(agrupadosMap),
                data_verificacao: new Date().toLocaleDateString('pt-BR')
            };

        } catch (error: any) {
            console.error('Erro ao verificar pendentes:', error);
            return { success: false, message: error.message };
        }
    }

    // Renamed original logic to verificarPendentesPadrao
    private async verificarPendentesPadrao() {
        try {
            // Fetch all data from Sheet Index 0 (A:AL)
            const data = await this.sheetsService.getData('A:AL', 0);

            if (!data || data.length === 0) {
                return { success: false, message: 'Nenhum dado encontrado na planilha padrão' };
            }

            const header = data[0];
            const rows = data.slice(1);

            // Find columns dynamically
            const prazoCol = this.sheetsService.findColumnIndex(header, ['PRAZO'], 25, false); // Index 25 (Z)
            const escolaDestinoCol = this.sheetsService.findColumnIndex(header, ['ESCOLA DESTINO'], 26, false); // Index 26 (AA)
            const idadeCol = this.sheetsService.findColumnIndex(header, ['IDADE'], 21, false); // Index 21 (V)

            if (prazoCol === undefined || escolaDestinoCol === undefined || idadeCol === undefined) {
                return {
                    success: false,
                    message: 'Colunas necessárias não encontradas na planilha padrão: PRAZO, ESCOLA DESTINO, IDADE'
                };
            }

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const pendentes: Pendente[] = [];

            rows.forEach(row => {
                const prazo = row[prazoCol];
                const escolaDestino = row[escolaDestinoCol];
                const idade = row[idadeCol];

                if (prazo) {
                    // Parse date dd/mm/yyyy
                    const parts = prazo.split('/');
                    if (parts.length === 3) {
                        const dataPrazo = new Date(
                            parseInt(parts[2]),
                            parseInt(parts[1]) - 1,
                            parseInt(parts[0])
                        );

                        if (dataPrazo >= hoje) {
                            pendentes.push({
                                escola_destino: escolaDestino,
                                idade: idade,
                                prazo: prazo,
                                origem: 'PADRAO'
                            });
                        }
                    }
                }
            });

            return { success: true, pendentes };
        } catch (error: any) {
            console.error('Erro ao verificar pendentes padrão:', error);
            return { success: false, message: error.message };
        }
    }

    private async verificarPendentesIntegral() {
        try {
            const integralSheetId = '1At7qlj7EuXvEaBss16ylbCmKk-riOlPox_ow1Gv5GRQ';
            // Use a temporary service for the external sheet
            const integralService = new GoogleSheetsService(integralSheetId);

            // Fetch data from first tab
            const data = await integralService.getData('A:Z', 0); // Assuming reasonable range

            if (!data || data.length === 0) {
                return { success: false, message: 'Nenhum dado encontrado na planilha integral' };
            }

            const header = data[0];
            const rows = data.slice(1);

            // Find columns dynamically
            const prazoCol = this.sheetsService.findColumnIndex(header, ['PRAZO'], -1, false);
            const escolaDestinoCol = this.sheetsService.findColumnIndex(header, ['ESCOLA DESTINO'], -1, false);
            const idadeCol = this.sheetsService.findColumnIndex(header, ['IDADE'], -1, false);

            if (prazoCol === -1 || escolaDestinoCol === -1 || idadeCol === -1) {
                console.warn('[PendentesService] Colunas não encontradas na planilha integral. Pulando.');
                return { success: true, pendentes: [] }; // Return empty success to not block
            }

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const pendentes: Pendente[] = [];
            const escolasExcecao = [
                'A BELA ADORMECIDA', 'AGOSTINHO BRANDI', 'ALBERTO JOSE ISMAEL',
                'CEU ENCANTADO', 'CINDERELA', 'FADA AZUL',
                'GEORGINA ATRA HAWILLA', 'LUZIA APARECIDA PENHA DOS SANTOS',
                'MODESTO RODRIGUES MARQUES', 'PAULO JOSÉ FROES',
                'PEDRO D\'AMICO', 'SACI PERERE'
            ];

            rows.forEach(row => {
                const prazo = row[prazoCol];
                const escolaDestino = row[escolaDestinoCol]; // Should be string
                const idade = row[idadeCol];

                if (!escolaDestino || !escolasExcecao.includes(escolaDestino.trim().toUpperCase())) {
                    return; // Skip if not in exception list
                }

                if (prazo) {
                    // Parse date dd/mm/yyyy
                    const parts = prazo.split('/');
                    if (parts.length === 3) {
                        // Careful with header format provided in prompt: dd/mm/yyyy
                        const dataPrazo = new Date(
                            parseInt(parts[2]),
                            parseInt(parts[1]) - 1,
                            parseInt(parts[0])
                        );

                        if (dataPrazo >= hoje) {
                            pendentes.push({
                                escola_destino: escolaDestino,
                                idade: idade,
                                prazo: prazo,
                                origem: 'INTEGRAL'
                            });
                        }
                    }
                }
            });

            return { success: true, pendentes };

        } catch (error: any) {
            console.error('Erro ao verificar pendentes integral:', error);
            // Allow failure without breaking main flow? Or report? 
            // Logic says just log and return empty to avoid total failure
            return { success: false, message: error.message };
        }
    }

    async obterEstatisticas() {
        try {
            const resultado = await this.verificarPendentes();

            if (!resultado.success || !resultado.agrupados) {
                return resultado;
            }

            const agrupados = resultado.agrupados;
            const totalPendentes = resultado.total_pendentes;

            const porEscola: Record<string, number> = {};
            const porIdade: Record<string, number> = {};

            agrupados.forEach((item: GrupoPendente) => {
                // By School
                if (!porEscola[item.escola_destino]) porEscola[item.escola_destino] = 0;
                porEscola[item.escola_destino] += item.quantidade;

                // By Age
                if (!porIdade[item.idade]) porIdade[item.idade] = 0;
                porIdade[item.idade] += item.quantidade;
            });

            return {
                success: true,
                total_pendentes: totalPendentes,
                total_padrao: resultado.total_padrao,
                total_integral: resultado.total_integral,
                por_escola: porEscola,
                por_idade: porIdade,
                detalhado: agrupados,
                data_verificacao: resultado.data_verificacao
            };

        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
}
