import { GoogleSheetsService } from './google-sheets';
import { SedApiService } from './sed-api';

export class RaSearchService {
    private sheetsService: GoogleSheetsService;
    private sedService: SedApiService;

    constructor() {
        this.sheetsService = new GoogleSheetsService();
        this.sedService = new SedApiService();
    }

    private formatDate(dateStr: string): string | null {
        if (!dateStr) return null;

        // DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

        // YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [y, m, d] = dateStr.split('-');
            return `${d}/${m}/${y}`;
        }

        // DD-MM-YYYY
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
            return dateStr.replace(/-/g, '/');
        }

        return null;
    }

    async searchRaInterval(startLine: number, endLine: number) {
        try {
            const range = `A${startLine}:Z${endLine}`;
            const data = await this.sheetsService.getData(range);

            const results: any[] = [];
            const rasToSave: string[][] = [];
            const studentsToSearch: any[] = [];

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const line = startLine + i;

                // Col C (index 2) = Name, Col D (index 3) = DOB, Col F (index 5) = Mother's Name
                const nome = row[2] || '';
                const dataNascimento = row[3] || '';
                const nomeMae = row[5] || '';

                const formattedDate = this.formatDate(dataNascimento);

                if (!nome || !formattedDate) {
                    rasToSave.push(['']);
                    results.push({
                        line,
                        nome,
                        ra: null,
                        status: 'Dados incompletos ou data inválida',
                    });
                    continue;
                }

                studentsToSearch.push({
                    index: i,
                    nome,
                    data_nascimento: formattedDate,
                    nome_mae: nomeMae,
                    line,
                });

                // Placeholder for now, will be filled after batch search
                rasToSave.push(['']);
            }

            if (studentsToSearch.length > 0) {
                const searchResults = await this.sedService.pesquisarRAs(studentsToSearch);

                searchResults.forEach((result, idx) => {
                    const originalIndex = studentsToSearch[idx].index;
                    const ra = result.ra;

                    rasToSave[originalIndex] = [ra || ''];
                    results.push({
                        line: studentsToSearch[idx].line,
                        nome: studentsToSearch[idx].nome,
                        ra,
                        status: ra ? 'RA encontrado' : (result.error ? `Erro: ${result.error}` : 'RA não encontrado'),
                    });
                });
            }

            // Save to Column T
            await this.sheetsService.writeData(`T${startLine}:T${endLine}`, rasToSave);

            return {
                success: true,
                total: results.length,
                found: results.filter(r => r.ra).length,
                details: results,
            };
        } catch (error: any) {
            console.error('Error in searchRaInterval:', error);
            return { success: false, message: error.message };
        }
    }

    async searchRaByMotherInterval(startLine: number, endLine: number) {
        try {
            const range = `A${startLine}:Z${endLine}`;
            const data = await this.sheetsService.getData(range);

            const results: any[] = [];
            const rasToSave: string[][] = [];

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const line = startLine + i;

                const dataNascimento = row[3] || '';
                const nomeMae = row[5] || '';
                const formattedDate = this.formatDate(dataNascimento);

                if (!nomeMae || !formattedDate) {
                    rasToSave.push(['']);
                    results.push({
                        line,
                        nome_mae: nomeMae,
                        ra: null,
                        status: 'Dados incompletos',
                    });
                    continue;
                }

                // Note: SED Service doesn't have batch search for Mother yet, doing sequential for now
                // or we could extend SED service. For now, sequential is safer to implement quickly.
                // Actually, let's use Promise.all for concurrency
                rasToSave.push(['PENDING']); // Placeholder
            }

            // Process in parallel
            const promises = data.map(async (row, i) => {
                const nomeMae = row[5] || '';
                const dataNascimento = row[3] || '';
                const formattedDate = this.formatDate(dataNascimento);

                if (!nomeMae || !formattedDate) return null;

                try {
                    // We need to expose a method in SedApiService for this or use the existing one
                    // The ported SedApiService has pesquisarRA which takes arguments.
                    // But we need search by Mother specifically.
                    // The ported service has `pesquisarRA` which takes `nomeMae` as optional arg.
                    // But `pesquisarRAPorMae` in PHP used specific params (empty student name).
                    // Let's check SedApiService port again.
                    // It has `pesquisarRA` taking all params.
                    return await this.sedService.pesquisarRA('', formattedDate, '', nomeMae);
                } catch (e) {
                    return null;
                }
            });

            const raResults = await Promise.all(promises);

            raResults.forEach((ra, i) => {
                rasToSave[i] = [ra || ''];
                results.push({
                    line: startLine + i,
                    ra,
                    status: ra ? 'RA encontrado' : 'RA não encontrado'
                });
            });

            // Save to Column U
            await this.sheetsService.writeData(`U${startLine}:U${endLine}`, rasToSave);

            return {
                success: true,
                total: results.length,
                found: results.filter(r => r.ra).length,
                details: results,
            };

        } catch (error: any) {
            console.error('Error in searchRaByMotherInterval:', error);
            return { success: false, message: error.message };
        }
    }

    async searchRaByCpfInterval(startLine: number, endLine: number) {
        try {
            const range = `A${startLine}:Z${endLine}`;
            const data = await this.sheetsService.getData(range);

            const results: any[] = [];
            const rasToSave: string[][] = [];

            for (let i = 0; i < data.length; i++) {
                // Placeholder for parallel processing
                rasToSave.push(['PENDING']);
            }

            // Process in parallel
            const promises = data.map(async (row, i) => {
                // Column E (index 4) = CPF
                const cpf = (row[4] || '').replace(/\D/g, ''); // Remove non-digits

                if (!cpf || cpf.length !== 11) {
                    return {
                        line: startLine + i,
                        cpf: row[4],
                        ra: null,
                        status: 'CPF inválido ou ausente'
                    };
                }

                try {
                    const ra = await this.sedService.pesquisarRAPorCPF(cpf);
                    return {
                        line: startLine + i,
                        cpf,
                        ra,
                        status: ra ? 'RA encontrado' : 'RA não encontrado'
                    };
                } catch (e: any) {
                    return {
                        line: startLine + i,
                        cpf,
                        ra: null,
                        status: `Erro: ${e.message}`
                    };
                }
            });

            const searchResults = await Promise.all(promises);

            searchResults.forEach((result, i) => {
                rasToSave[i] = [result.ra || ''];
                results.push(result);
            });

            // Save to Column U (same as Mother search)
            await this.sheetsService.writeData(`U${startLine}:U${endLine}`, rasToSave);

            return {
                success: true,
                total: results.length,
                found: results.filter(r => r.ra).length,
                details: results,
            };

        } catch (error: any) {
            console.error('Error in searchRaByCpfInterval:', error);
            return { success: false, message: error.message };
        }
    }

    async searchRaCascade(startLine: number, endLine: number) {
        try {
            const range = `A${startLine}:Z${endLine}`;
            const data = await this.sheetsService.getData(range);

            const results: any[] = [];
            const rasToSave: string[][] = [];

            for (let i = 0; i < data.length; i++) {
                rasToSave.push(['PENDING']);
            }

            // Process in parallel
            const promises = data.map(async (row, i) => {
                const line = startLine + i;

                // Extract data
                const nome = row[2] || '';
                const dataNascimento = row[3] || '';
                const cpf = (row[4] || '').replace(/\D/g, '');
                const nomeMae = row[5] || '';

                const formattedDate = this.formatDate(dataNascimento);

                let ra: string | null = null;
                let method = '';
                let status = '';

                // 1. Try by Name + DOB
                if (nome && formattedDate) {
                    try {
                        ra = await this.sedService.pesquisarRA(nome, formattedDate);
                        if (ra) method = 'Nome';
                    } catch (e) { console.error(e); }
                }

                // 2. Try by Mother + DOB
                if (!ra && nomeMae && formattedDate) {
                    try {
                        ra = await this.sedService.pesquisarRAPorMae(nomeMae, formattedDate);
                        if (ra) method = 'Mãe';
                    } catch (e) { console.error(e); }
                }

                // 3. Try by CPF
                if (!ra && cpf && cpf.length === 11) {
                    try {
                        ra = await this.sedService.pesquisarRAPorCPF(cpf);
                        if (ra) method = 'CPF';
                    } catch (e) { console.error(e); }
                }

                if (ra) {
                    status = `Encontrado por ${method}`;
                } else {
                    status = 'Não encontrado';
                }

                return {
                    line,
                    nome,
                    ra,
                    status,
                    method
                };
            });

            const searchResults = await Promise.all(promises);

            searchResults.forEach((result, i) => {
                rasToSave[i] = [result.ra || ''];
                results.push(result);
            });

            // Save to Column T (Main RA Column)
            await this.sheetsService.writeData(`T${startLine}:T${endLine}`, rasToSave);

            return {
                success: true,
                total: results.length,
                found: results.filter(r => r.ra).length,
                details: results,
            };

        } catch (error: any) {
            console.error('Error in searchRaCascade:', error);
            return { success: false, message: error.message };
        }
    }
}

