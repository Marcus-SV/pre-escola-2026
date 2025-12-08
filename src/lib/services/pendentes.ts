import { GoogleSheetsService } from './google-sheets';

interface Pendente {
    escola_destino: string;
    idade: string;
    prazo: string;
}

interface GrupoPendente {
    escola_destino: string;
    idade: string;
    quantidade: number;
}

export class PendentesService {
    private sheetsService: GoogleSheetsService;

    constructor() {
        this.sheetsService = new GoogleSheetsService();
    }

    async verificarPendentes() {
        try {
            // Fetch all data from Sheet Index 0 (A:AL)
            const data = await this.sheetsService.getData('A:AL', 0);

            if (!data || data.length === 0) {
                return { success: false, message: 'Nenhum dado encontrado na planilha' };
            }

            const header = data[0];
            const rows = data.slice(1);

            // Find columns dynamically
            const prazoCol = this.sheetsService.findColumnIndex(header, ['PRAZO'], 25, false); // Index 25 (Z)
            const escolaDestinoCol = this.sheetsService.findColumnIndex(header, ['ESCOLA DESTINO'], 26, false); // Index 26 (AA)
            const idadeCol = this.sheetsService.findColumnIndex(header, ['IDADE'], 21, false); // Index 21 (V)

            console.log(`[DEBUG] Pendentes Cols - Prazo: ${prazoCol}, Escola: ${escolaDestinoCol}, Idade: ${idadeCol}`);

            if (prazoCol === undefined || escolaDestinoCol === undefined || idadeCol === undefined) {
                return {
                    success: false,
                    message: 'Colunas necessárias não encontradas: PRAZO, ESCOLA DESTINO, IDADE'
                };
            }

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const pendentes: Pendente[] = [];
            let totalPendentes = 0;

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
                                prazo: prazo
                            });
                            totalPendentes++;
                        }
                    }
                }
            });

            // Group by School and Age
            const agrupadosMap: Record<string, GrupoPendente> = {};

            pendentes.forEach(p => {
                const key = `${p.escola_destino}|${p.idade}`;
                if (!agrupadosMap[key]) {
                    agrupadosMap[key] = {
                        escola_destino: p.escola_destino,
                        idade: p.idade,
                        quantidade: 0
                    };
                }
                agrupadosMap[key].quantidade++;
            });

            return {
                success: true,
                message: 'Pendentes verificados com sucesso',
                total_pendentes: totalPendentes,
                agrupados: Object.values(agrupadosMap),
                data_verificacao: hoje.toLocaleDateString('pt-BR')
            };

        } catch (error: any) {
            console.error('Erro ao verificar pendentes:', error);
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
