import { GoogleSheetsService } from './google-sheets';
import { SedApiService } from './sed-api';

export class VagasService {
    private sheetsService: GoogleSheetsService;
    private sedService: SedApiService;

    constructor() {
        this.sheetsService = new GoogleSheetsService();
        this.sedService = new SedApiService();
    }

    async pesquisarVagas() {
        const startTime = Date.now();
        try {
            // 1. Get Schools
            const escolas = await this.sedService.getEscolas();
            if (!escolas || escolas.length === 0) {
                return { success: false, message: 'Nenhuma escola encontrada' };
            }

            // 2. Get Classes
            const relacaoClasses = await this.sedService.getClasses(escolas);
            if (!relacaoClasses || relacaoClasses.length === 0) {
                return { success: false, message: 'Nenhuma classe encontrada' };
            }

            // 3. Process Data
            const dadosProcessados = this.processarDadosClasses(relacaoClasses);

            // 4. Save to Sheets (Index 3)
            await this.salvarVagasNaPlanilha(dadosProcessados);

            const elapsed = (Date.now() - startTime) / 1000;

            return {
                success: true,
                message: 'Vagas pesquisadas e salvas com sucesso',
                total_escolas: escolas.length,
                total_classes: relacaoClasses.length,
                total_linhas: dadosProcessados.length,
                tempo_total: `${elapsed.toFixed(2)}s`
            };

        } catch (error: any) {
            console.error('Erro ao pesquisar vagas:', error);
            return { success: false, message: error.message };
        }
    }

    private processarDadosClasses(relacaoClasses: any[]) {
        const dadosProcessados: any[] = [];
        const escolasExcecao = [
            'AGOSTINHO BRANDI', 'ALBERTO JOSE ISMAEL', 'CEU ENCANTADO', 'CINDERELA',
            'FADA AZUL', 'GEORGINA ATRA HAWILLA', 'LUZIA APARECIDA PENHA DOS SANTOS',
            'MODESTO RODRIGUES MARQUES', 'PAULO JOSÉ FROES', 'PEDRO D\'AMICO', 'SACI PERERE',
            'A BELA ADORMECIDA'
        ];

        relacaoClasses.forEach(escola => {
            const nomeEscola = escola.outDescNomeAbrevEscola || '';
            const codEscola = escola.outCodEscola || '';

            if (escola.outClasses && Array.isArray(escola.outClasses)) {
                escola.outClasses.forEach((classe: any) => {
                    // Filter series < 3
                    const codSerieAno = parseInt(classe.outCodSerieAno || '0');
                    if (codSerieAno >= 3) return;

                    // Filter full time (except exceptions)
                    const codTurno = classe.outCodTurno || '';
                    if (codTurno === '6' && !escolasExcecao.includes(nomeEscola)) return;

                    // Calculate vacancies
                    const capacidadeMax = parseInt(classe.outCapacidadeFisicaMax || '0');
                    const qtdAtual = parseInt(classe.outQtdAtual || '0');
                    const vagas = capacidadeMax - qtdAtual;

                    // Determine age
                    const idade = (codSerieAno === 1) ? 4 : 5;

                    // Process row
                    const linhaProcessada: any = {};

                    // Add all class columns
                    Object.keys(classe).forEach(key => {
                        let value = classe[key];
                        if (Array.isArray(value)) value = value.join(', ');
                        linhaProcessada[key] = value;
                    });

                    // Add calculated fields
                    linhaProcessada['outDescNomeAbrevEscola'] = nomeEscola;
                    linhaProcessada['outCodUnidade'] = codEscola;
                    linhaProcessada['outVagas'] = vagas;
                    linhaProcessada['Idade'] = idade;

                    dadosProcessados.push(linhaProcessada);
                });
            }
        });

        return dadosProcessados;
    }

    private async salvarVagasNaPlanilha(dados: any[]) {
        // Clear Sheet Index 3
        await this.sheetsService.clearSheet(3);

        if (dados.length === 0) return;

        // Generate header
        const cabecalho = Object.keys(dados[0]);
        const values = [cabecalho];

        // Generate rows
        dados.forEach(linha => {
            const row: string[] = [];
            cabecalho.forEach(col => {
                let val = linha[col];
                if (val === undefined || val === null) val = '';
                row.push(String(val));
            });
            values.push(row);
        });

        // Write to Sheet Index 3
        // Calculate range based on columns
        const lastCol = this.getColumnLetter(cabecalho.length - 1);
        const range = `A1:${lastCol}${values.length}`;

        await this.sheetsService.writeData(range, values, 3);
    }

    private getColumnLetter(index: number): string {
        let letter = '';
        while (index >= 0) {
            letter = String.fromCharCode((index % 26) + 65) + letter;
            index = Math.floor(index / 26) - 1;
        }
        return letter;
    }

    async obterEstatisticas() {
        try {
            // Read all data from Sheet Index 3
            const data = await this.sheetsService.getData('A:ZZ', 3);

            if (!data || data.length <= 1) {
                return { success: false, message: 'Nenhum dado de vagas encontrado' };
            }

            const header = data[0];
            const rows = data.slice(1);

            // Map indices
            const colMap: Record<string, number> = {};
            header.forEach((h, i) => colMap[h] = i);

            const idxEscola = colMap['outDescNomeAbrevEscola'];
            const idxIdade = colMap['Idade'];
            const idxTurno = colMap['outDescTurno'] || colMap['outDescricaoTurno'];
            const idxVagas = colMap['outVagas'];
            const idxSerie = colMap['outCodSerieAno'];
            const idxCapacidade = colMap['outCapacidadeFisicaMax'];
            const idxOcupadas = colMap['outQtdAtual'];

            let totalVagas = 0;
            const porEscola: Record<string, number> = {};
            const porIdade: Record<string, number> = {};
            const porTurno: Record<string, number> = {};
            const dadosAgrupados: any[] = [];

            rows.forEach(row => {
                const escola = row[idxEscola] || '';
                const idade = parseInt(row[idxIdade] || '0');
                const turno = row[idxTurno] || '';
                const vagas = parseInt(row[idxVagas] || '0');
                const serie = row[idxSerie] || '';
                const capacidade = parseInt(row[idxCapacidade] || '0');
                const ocupadas = parseInt(row[idxOcupadas] || '0');

                totalVagas += vagas;

                if (!porEscola[escola]) porEscola[escola] = 0;
                porEscola[escola] += vagas;

                if (idade > 0) {
                    if (!porIdade[idade]) porIdade[idade] = 0;
                    porIdade[idade] += vagas;
                }

                if (turno) {
                    if (!porTurno[turno]) porTurno[turno] = 0;
                    porTurno[turno] += vagas;
                }

                dadosAgrupados.push({
                    escola,
                    serie,
                    turno,
                    idade,
                    capacidade,
                    ocupadas,
                    vagas
                });
            });

            return {
                success: true,
                total_vagas: totalVagas,
                total_classes: rows.length,
                por_escola: porEscola,
                por_idade: porIdade,
                por_turno: porTurno,
                dados: dadosAgrupados
            };

        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
}
