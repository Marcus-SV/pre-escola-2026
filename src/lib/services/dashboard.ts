import { GoogleSheetsService } from './google-sheets';

export interface DashboardMetrics {
    totalAlunos: number;
    vagasDisponiveis: number;
    cancelados: number;
    compatibilizados: number;
}

export class DashboardService {
    async getMetrics(): Promise<DashboardMetrics> {
        try {
            const sheetsService = new GoogleSheetsService();
            // 1. Fetch main data from Google Sheets (Tab index 0)
            const data = await sheetsService.getData('A:Z', 0);

            let totalAlunos = 0;
            let cancelados = 0;
            let compatibilizados = 0;

            if (data && data.length > 1) {
                const headers = data[0];
                // Find column indices
                const raIndex = headers.indexOf('RA');
                const escolaIndex = headers.indexOf('ESCOLA');
                const atendidoIndex = headers.indexOf('ATENDIDO');
                const prazoIndex = headers.indexOf('PRAZO');

                // Process rows (skipping header)
                data.slice(1).forEach(row => {
                    // Count total students (rows with content)
                    if (row.length > 0) {
                        totalAlunos++;
                    }

                    // Count Cancelados: ATENDIDO == "SIM" AND PRAZO is empty
                    const atendido = atendidoIndex !== -1 ? (row[atendidoIndex] || '').toUpperCase() : '';
                    const prazo = prazoIndex !== -1 ? (row[prazoIndex] || '').trim() : '';

                    if (atendido === 'SIM' && prazo === '') {
                        cancelados++;
                    }

                    // Count Compatibilizados: Has assigned school
                    if (escolaIndex !== -1 && row[escolaIndex] && row[escolaIndex].trim() !== '') {
                        compatibilizados++;
                    }
                });
            }

            // 2. Fetch vacancies from Google Sheets (Tab index 3)
            let vagasDisponiveis = 0;
            try {
                const sheetsService = new GoogleSheetsService();
                // Read from sheet index 3 (as per legacy system)
                const vagasData = await sheetsService.getData('A:Z', 3);

                if (vagasData && vagasData.length > 1) {
                    const headers = vagasData[0];
                    const outVagasIndex = headers.indexOf('outVagas');

                    if (outVagasIndex !== -1) {
                        // Sum the 'outVagas' column, skipping the header
                        vagasDisponiveis = vagasData.slice(1).reduce((total, row) => {
                            const vagas = parseInt(row[outVagasIndex] || '0', 10);
                            return total + (isNaN(vagas) ? 0 : vagas);
                        }, 0);
                    }
                }
            } catch (error) {
                console.error('Error fetching vacancies:', error);
                // Keep 0 if error occurs
            }

            return {
                totalAlunos,
                vagasDisponiveis,
                cancelados,
                compatibilizados
            };
        } catch (error) {
            console.error('Error fetching dashboard metrics:', error);
            return {
                totalAlunos: 0,
                vagasDisponiveis: 0,
                cancelados: 0,
                compatibilizados: 0
            };
        }
    }
}
