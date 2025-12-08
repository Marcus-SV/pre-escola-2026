import { GoogleSheetsService } from './google-sheets';

interface Inconsistencia {
    linha: number;
    tipo: string;
    escola_anterior: string;
    cidade: string;
    correcao: string;
}

export class InconsistenciasService {
    private sheetsService: GoogleSheetsService;

    constructor() {
        this.sheetsService = new GoogleSheetsService();
    }

    async verificarInconsistencias(linhaInicial: number, linhaFinal: number) {
        try {
            // Read data from Sheet Index 0
            // Range includes header if starting from line 2 (index 0 in array logic if we read from A1, but let's follow legacy)
            // Legacy reads "A{linhaInicial}:Z{linhaFinal}"
            const range = `A${linhaInicial}:Z${linhaFinal}`;
            const data = await this.sheetsService.getData(range, 0);

            if (!data || data.length === 0) {
                return { success: false, message: 'Nenhum dado encontrado no intervalo especificado' };
            }

            // Header logic
            let cabecalho: string[] = [];
            if (linhaInicial === 2) {
                cabecalho = data.shift() || []; // Remove first line as header
            } else {
                // Read header separately
                const headerData = await this.sheetsService.getData('A2:Z2', 0);
                if (headerData && headerData.length > 0) {
                    cabecalho = headerData[0];
                } else {
                    return { success: false, message: 'Não foi possível ler o cabeçalho da linha 2.' };
                }
            }

            // Fixed Indices (Legacy)
            // Escola = P (Index 15)
            // Cidade = X (Index 23)
            const idxEscola = 15;
            const idxCidade = 23;
            const idxCorrecao = 15; // Overwrite Escola

            const inconsistencias: Inconsistencia[] = [];
            const updates: { range: string; values: any[][] }[] = [];

            data.forEach((linha, index) => {
                // Calculate real line number
                // If start=2, index 0 is line 3 (since we shifted header).
                // If start>2, index 0 is startLine.
                const linhaReal = (linhaInicial === 2) ? index + 3 : index + linhaInicial;

                const escola = (linha[idxEscola] || '').trim();
                const cidade = (linha[idxCidade] || '').trim();
                const cidadeUpper = cidade.toUpperCase();

                // CASE 1: Escola = Ingressar... AND Cidade = SJRP
                if (escola === 'Ingressar na Rede Pública (disponibiliza a vaga até 2 km de distância do endereço)' &&
                    (cidade === 'SAO JOSE DO RIO PRETO' || cidadeUpper === 'SAO JOSE DO RIO PRETO' || cidade === 'SÃO JOSÉ DO RIO PRETO')) {

                    const correcao = 'Transferência - Mudança de Endereço (disponibiliza a vaga até 2 km de distância do endereço)';

                    inconsistencias.push({
                        linha: linhaReal,
                        tipo: 'Caso 1: Escola = Ingressar... e CIDADE = SAO JOSE DO RIO PRETO',
                        escola_anterior: escola,
                        cidade: cidade,
                        correcao: correcao
                    });

                    updates.push({
                        range: `P${linhaReal}`,
                        values: [[correcao]]
                    });
                }

                // CASE 2: Escola != Ingressar... AND Cidade = Fora da Escola
                if (escola !== 'Ingressar na Rede Pública (disponibiliza a vaga até 2 km de distância do endereço)' &&
                    cidade === 'Fora da Escola') {

                    const correcao = 'Ingressar na Rede Pública (disponibiliza a vaga até 2 km de distância do endereço)';

                    inconsistencias.push({
                        linha: linhaReal,
                        tipo: 'Caso 2: Escola != Ingressar... e CIDADE = Fora da Escola',
                        escola_anterior: escola,
                        cidade: cidade,
                        correcao: correcao
                    });

                    updates.push({
                        range: `P${linhaReal}`,
                        values: [[correcao]]
                    });
                }
            });

            // Batch Update
            let corrigidas = 0;
            if (updates.length > 0) {
                const sheetName = await this.sheetsService.getSheetName(0);
                if (sheetName) {
                    corrigidas = await this.sheetsService.batchUpdate(sheetName, updates);
                }
            }

            return {
                success: true,
                total_verificado: data.length,
                total_inconsistencias: inconsistencias.length,
                corrigidas: corrigidas,
                inconsistencias: inconsistencias
            };

        } catch (error: any) {
            console.error('Erro ao verificar inconsistências:', error);
            return { success: false, message: error.message };
        }
    }
}
