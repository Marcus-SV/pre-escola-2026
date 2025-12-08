import { GoogleSheetsService } from './google-sheets';
import { PendentesService } from './pendentes';

interface MapeamentoItem {
    escola: string;
    serie: string;
    turno: string;
    vagas_disponiveis: number;
    inscricoes_pendentes: number;
    vagas_restantes: number;
    status: string;
    percentual_ocupacao: number;
}

export class MapeamentoService {
    private sheetsService: GoogleSheetsService;
    private pendentesService: PendentesService;

    constructor() {
        this.sheetsService = new GoogleSheetsService();
        this.pendentesService = new PendentesService();
    }

    async gerarMapeamento() {
        try {
            // 1. Get Vagas from Sheet Index 3 (A:ZZ)
            const vagasResult = await this.obterDadosVagas();
            if (!vagasResult.success || !vagasResult.data) {
                return vagasResult;
            }

            // 2. Get Pendentes
            const pendentesResult = await this.pendentesService.verificarPendentes();
            if (!pendentesResult.success || !pendentesResult.agrupados) {
                return pendentesResult;
            }

            // 3. Process
            const mapeamento = this.processarMapeamento(vagasResult, pendentesResult.agrupados);

            // 4. Stats
            const totalVagas = mapeamento.reduce((sum, item) => sum + item.vagas_disponiveis, 0);
            const totalPendentes = mapeamento.reduce((sum, item) => sum + item.inscricoes_pendentes, 0);
            const totalRestantes = mapeamento.reduce((sum, item) => sum + item.vagas_restantes, 0);
            const escolas = new Set(mapeamento.map(m => m.escola));

            return {
                success: true,
                data: mapeamento,
                total_escolas: escolas.size,
                total_vagas: totalVagas,
                total_pendentes: totalPendentes,
                total_vagas_restantes: totalRestantes
            };

        } catch (error: any) {
            console.error('Erro ao gerar mapeamento:', error);
            return { success: false, message: error.message };
        }
    }

    private async obterDadosVagas() {
        try {
            // Sheet Index 3 (4th tab)
            const data = await this.sheetsService.getData('A:ZZ', 3);

            if (!data || data.length <= 1) {
                return { success: false, message: 'Nenhum dado de vagas encontrado na aba 4' };
            }

            const header = data[0];
            const rows = data.slice(1);

            const colIndices: Record<string, number> = {};
            header.forEach((h: string, i: number) => {
                const cleanName = h.replace('#', '').trim();
                colIndices[cleanName] = i;
                colIndices[h.trim()] = i;
            });

            // Required columns
            const colunasNecessarias = ['outDescNomeAbrevEscola', 'outCodSerieAno', 'outVagas'];
            for (const col of colunasNecessarias) {
                if (colIndices[col] === undefined) {
                    // Try case-insensitive
                    const found = Object.keys(colIndices).find(k => k.toLowerCase() === col.toLowerCase());
                    if (found) {
                        colIndices[col] = colIndices[found];
                    } else {
                        return { success: false, message: `Coluna '${col}' não encontrada na aba de vagas` };
                    }
                }
            }

            // Turno column
            let colTurno = 'outDescricaoTurno';
            if (colIndices[colTurno] === undefined) {
                const found = Object.keys(colIndices).find(k => k.toLowerCase().includes('turno') || k.toLowerCase().includes('periodo'));
                if (found) {
                    colTurno = found;
                } else {
                    console.warn('Coluna de Turno não encontrada. Assumindo vazio.');
                }
            }

            return {
                success: true,
                data: rows,
                colIndices,
                colTurno
            };

        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    private processarMapeamento(dadosVagas: any, gruposPendentes: any[]): MapeamentoItem[] {
        const vagasPorEscolaSerie: Record<string, any[]> = {};
        const rows = dadosVagas.data;
        const colIndices = dadosVagas.colIndices;
        const colTurno = dadosVagas.colTurno;

        // 1. Group Vagas by "Escola|Serie"
        rows.forEach((row: any[]) => {
            const escola = (row[colIndices['outDescNomeAbrevEscola']] || '').trim();
            const serie = (row[colIndices['outCodSerieAno']] || '').trim();
            const vagas = parseInt(row[colIndices['outVagas']] || '0');
            const turno = colIndices[colTurno] !== undefined ? (row[colIndices[colTurno]] || '').trim() : 'N/D';

            if (!escola || !serie) return;

            const key = `${escola}|${serie}`;
            if (!vagasPorEscolaSerie[key]) {
                vagasPorEscolaSerie[key] = [];
            }
            // Check if shift already exists for this group (aggregate if so)
            const existing = vagasPorEscolaSerie[key].find(v => v.turno === turno);
            if (existing) {
                existing.vagas += vagas;
            } else {
                vagasPorEscolaSerie[key].push({ escola, serie, turno, vagas });
            }
        });

        // 2. Group Pendentes by "Escola|Serie"
        const pendentesPorEscolaSerie: Record<string, number> = {};
        gruposPendentes.forEach((grupo: any) => {
            const escola = (grupo.escola_destino || '').trim();
            const idade = parseInt(grupo.idade || '0');
            const qtd = parseInt(grupo.quantidade || '0');

            if (!escola || idade <= 0) return;
            const serie = (idade === 4) ? '1' : ((idade === 5) ? '2' : null);
            if (!serie) return;

            const key = `${escola}|${serie}`;
            if (!pendentesPorEscolaSerie[key]) pendentesPorEscolaSerie[key] = 0;
            pendentesPorEscolaSerie[key] += qtd;
        });

        const mapeamento: MapeamentoItem[] = [];

        // Helper to sort shifts: MANHA -> TARDE -> INTEGRAL -> NOITE -> Others
        const sortTurnos = (a: any, b: any) => {
            const order: Record<string, number> = {
                'MANHA': 1, 'MANHÃ': 1,
                'TARDE': 2,
                'INTEGRAL': 3,
                'NOITE': 4
            };
            const valA = order[a.turno.toUpperCase()] || 99;
            const valB = order[b.turno.toUpperCase()] || 99;
            return valA - valB;
        };

        // 3. Process each School/Series Group
        Object.keys(vagasPorEscolaSerie).forEach(key => {
            const shifts = vagasPorEscolaSerie[key];
            shifts.sort(sortTurnos); // Waterfall Order

            let totalPendentes = pendentesPorEscolaSerie[key] || 0;

            // Distribute pendentes across shifts
            shifts.forEach((shift, index) => {
                const isLast = index === shifts.length - 1;
                let allocated = 0;

                if (totalPendentes > 0) {
                    if (isLast) {
                        // Last shift takes all remaining, even if it causes overload (negative rest)
                        allocated = totalPendentes;
                    } else {
                        // Take up to capacity
                        allocated = Math.min(totalPendentes, shift.vagas);
                    }
                    totalPendentes -= allocated;
                }

                const vagasRestantes = shift.vagas - allocated;

                // Status Logic
                let status = 'Disponível';
                if (vagasRestantes < 0) status = 'Sobrecarga';
                else if (vagasRestantes === 0) status = 'Lotado';

                // Occupancy Logic
                let percentual = 0;
                if (shift.vagas > 0) {
                    percentual = parseFloat(((allocated / shift.vagas) * 100).toFixed(1));
                } else if (allocated > 0) {
                    percentual = 100; // No spots but allocated -> 100% (or more)
                }

                mapeamento.push({
                    escola: shift.escola,
                    serie: shift.serie,
                    turno: shift.turno,
                    vagas_disponiveis: shift.vagas,
                    inscricoes_pendentes: allocated, // We show allocated here to explain the usage
                    vagas_restantes: vagasRestantes,
                    status,
                    percentual_ocupacao: percentual
                });
            });
        });

        // 4. Handle Pendentes with NO matching vacancies (Pure Sobrecarga)
        Object.keys(pendentesPorEscolaSerie).forEach(key => {
            if (!vagasPorEscolaSerie[key]) {
                const [escola, serie] = key.split('|');
                const qtd = pendentesPorEscolaSerie[key];

                mapeamento.push({
                    escola,
                    serie,
                    turno: 'N/D',
                    vagas_disponiveis: 0,
                    inscricoes_pendentes: qtd,
                    vagas_restantes: -qtd,
                    status: 'Sobrecarga',
                    percentual_ocupacao: 100
                });
            }
        });

        // 5. Final Sort
        mapeamento.sort((a, b) => {
            if (a.escola === b.escola) {
                if (a.serie === b.serie) {
                    // Reuse sort helper logic for final display order
                    const order: Record<string, number> = {
                        'MANHA': 1, 'MANHÃ': 1,
                        'TARDE': 2,
                        'INTEGRAL': 3,
                        'NOITE': 4,
                        'N/D': 99
                    };
                    const tA = order[a.turno.toUpperCase()] || 50;
                    const tB = order[b.turno.toUpperCase()] || 50;
                    return tA - tB;
                }
                return a.serie.localeCompare(b.serie);
            }
            return a.escola.localeCompare(b.escola);
        });

        return mapeamento;
    }

    async salvarMapeamento(mapeamento: MapeamentoItem[]) {
        try {
            const header = [
                'Escola', 'Série', 'Turno', 'Vagas Disponíveis',
                'Inscrições Pendentes (Total Série)', 'Vagas Restantes (Turno)',
                'Status', 'Percentual Ocupação'
            ];

            const rows = mapeamento.map(m => [
                m.escola, m.serie, m.turno, m.vagas_disponiveis,
                m.inscricoes_pendentes, m.vagas_restantes, m.status, `${m.percentual_ocupacao}%`
            ]);

            const data = [header, ...rows];

            // Save to Sheet Index 8 (9th tab)
            await this.sheetsService.clearSheet(8);
            await this.sheetsService.writeData(`A1:H${data.length}`, data, 8);

            return { success: true, message: `Mapeamento salvo com sucesso! ${rows.length} linhas.` };

        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async obterEstatisticas() {
        try {
            const result = await this.gerarMapeamento();
            if (!result.success) {
                return result;
            }

            if (!('data' in result)) {
                return { success: false, message: 'Dados de mapeamento inválidos' };
            }

            const mapeamento = result.data as MapeamentoItem[];
            const stats = {
                total_escolas: (result as any).total_escolas,
                total_vagas: (result as any).total_vagas,
                total_pendentes: (result as any).total_pendentes,
                total_vagas_restantes: (result as any).total_vagas_restantes,
                escolas_com_sobrecarga: mapeamento.filter(m => m.status === 'Sobrecarga').length,
                escolas_disponiveis: mapeamento.filter(m => m.status === 'Disponível').length,
                percentual_ocupacao_geral: 0
            };

            if (stats.total_vagas > 0) {
                stats.percentual_ocupacao_geral = parseFloat(((stats.total_pendentes / stats.total_vagas) * 100).toFixed(1));
            }

            return { success: true, data: stats };

        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
}
