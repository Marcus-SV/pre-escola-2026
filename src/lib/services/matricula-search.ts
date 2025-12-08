import { GoogleSheetsService } from './google-sheets';
import { SedApiService } from './sed-api';

export class MatriculaSearchService {
    private sheetsService: GoogleSheetsService;
    private sedService: SedApiService;

    constructor() {
        this.sheetsService = new GoogleSheetsService();
        this.sedService = new SedApiService();
    }

    async searchMatriculasInterval(startLine: number, endLine: number) {
        try {
            // Read Column T (RA)
            const range = `T${startLine}:T${endLine}`;
            const data = await this.sheetsService.getData(range);

            const results: any[] = [];
            const schoolsToSave: string[][] = [];
            const municipalitiesToSave: string[][] = [];
            const statusNaoToSave: string[][] = [];

            // Prepare batch requests
            const promises = data.map(async (row, index) => {
                const ra = row[0] || '';
                const line = startLine + index;

                if (!ra) {
                    return {
                        line,
                        ra,
                        escola: '',
                        municipio: 'Fora da Escola',
                        status: 'RA não informado'
                    };
                }

                try {
                    const matricula = await this.sedService.pesquisarMatriculas(ra);
                    return {
                        line,
                        ra,
                        ...matricula
                    };
                } catch (error: any) {
                    return {
                        line,
                        ra,
                        escola: '',
                        municipio: 'Erro na consulta',
                        status: 'ERRO'
                    };
                }
            });

            const searchResults = await Promise.all(promises);

            // Process results
            searchResults.forEach((result, i) => {
                schoolsToSave[i] = [result.escola || ''];
                municipalitiesToSave[i] = [result.municipio || ''];

                // ATENDIDO logic: Always NÃO at this stage (SIM is for allocation)
                statusNaoToSave[i] = ['NÃO'];

                results.push(result);
            });

            // Save to Columns W, X, Y
            await Promise.all([
                this.sheetsService.writeData(`W${startLine}:W${endLine}`, schoolsToSave),
                this.sheetsService.writeData(`X${startLine}:X${endLine}`, municipalitiesToSave),
                this.sheetsService.writeData(`Y${startLine}:Y${endLine}`, statusNaoToSave)
            ]);

            return {
                success: true,
                total: results.length,
                found: results.filter(r => r.escola).length,
                details: results,
            };

        } catch (error: any) {
            console.error('Error in searchMatriculasInterval:', error);
            return { success: false, message: error.message };
        }
    }
}
