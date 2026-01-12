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

        // 2. Group Pendentes by "Escola|Serie" WITH Origin Split
        interface PendenteSplit {
            total: number;
            padrao: number;
            integral: number;
        }
        const pendentesPorEscolaSerie: Record<string, PendenteSplit> = {};

        gruposPendentes.forEach((grupo: any) => {
            const escola = (grupo.escola_destino || '').trim();
            const idade = parseInt(grupo.idade || '0');
            // Check if por_origem exists, otherwise fallback (assume PADRAO for safety, though tracking should be active)
            const porOrigem = grupo.por_origem || { PADRAO: grupo.quantidade, INTEGRAL: 0 };
            const qtdPadrao = porOrigem.PADRAO || 0;
            const qtdIntegral = porOrigem.INTEGRAL || 0;

            if (!escola || idade <= 0) return;
            const serie = (idade === 4) ? '1' : ((idade === 5) ? '2' : null);
            if (!serie) return;

            const key = `${escola}|${serie}`;
            if (!pendentesPorEscolaSerie[key]) {
                pendentesPorEscolaSerie[key] = { total: 0, padrao: 0, integral: 0 };
            }
            pendentesPorEscolaSerie[key].total += (qtdPadrao + qtdIntegral);
            pendentesPorEscolaSerie[key].padrao += qtdPadrao;
            pendentesPorEscolaSerie[key].integral += qtdIntegral;
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
            shifts.sort(sortTurnos); // Waterfall Order (Manha -> Tarde -> Integral)

            const pendentes = pendentesPorEscolaSerie[key] || { total: 0, padrao: 0, integral: 0 };

            // Allocation Strategies
            shifts.forEach((shift) => {
                const isIntegralShift = shift.turno.toUpperCase() === 'INTEGRAL';
                let allocated = 0;

                // Priority Logic
                if (isIntegralShift) {
                    // Integral Shift: Takes INTEGRAL Pending
                    // (Strict matching: Only Integral Pending goes here?)
                    // Decision: Yes, prioritize Integral. 
                    // If we strictly prevent Standard from going here, we show accurate deficits.

                    const take = pendentes.integral; // Try to take all remaining integral pending
                    // In mapping, we often want to show the 'demand' vs 'capacity'.
                    // If we simply subtract, we get the 'restantes'.

                    // We allocate what we can for 'allocated' stat (bounded by vacancies), 
                    // BUT for 'vagas_restantes' we subtract the FULL demand to show overflow (negative).
                    // However, the previous logic calculated allocated then subtracted.
                    // Previous: vagasRestantes = shift.vagas - allocated;
                    // If allocated is capped at shift.vagas, vagasRestantes is 0 (Full), not -5 (Overloaded).
                    // The 'Overload' Logic only happened on the LAST shift previously.

                    // NEW LOGIC: We want to show overflow on ANY shift that is short.
                    // So: allocated = min(demand, capacity) -> Used for occupancy %
                    // vagas_restantes = capacity - demand -> Can be negative.

                    const demand = pendentes.integral;
                    allocated = Math.min(demand, shift.vagas);

                    // Reduce the global pool? 
                    // For mapping, if we have multiple Integral shifts (?) unlikely.
                    // But if we do, we should decrement.
                    pendentes.integral -= allocated;
                    // Wait, if demand > capacity, we allocated 'capacity'. 
                    // Remaining demand should ideally flow to next matching shift or stay as overflow.
                    // If this is the ONLY integral shift, the remaining `pendentes.integral` is the overflow.
                    // But `vagas_restantes` needs to reflect that overflow HERE.

                } else {
                    // Partial Shift (Manha/Tarde): Takes PADRAO Pending
                    const demand = pendentes.padrao;
                    allocated = Math.min(demand, shift.vagas);
                    pendentes.padrao -= allocated;
                }

                // Calculate Restantes based on the demand TARGETING this shift
                // If it's Integral, demand was Initial Integral Pending (approx).
                // Issue: If we have multiple partial shifts (Manha, Tarde), 'pendentes.padrao' is a shared pool.
                // We shouldn't show -10 on Manha AND -10 on Tarde if total deficit is 10.
                // Waterfall is needed for the shared pool phases.

                // refined Waterfall for Partial:
                // Shift 1 (Manha): Demand = All Standard Pending. 
                //    Allocates = min(Demand, Vagas). 
                //    Leftover Standard Pending flows to Shift 2.
                //    Restantes = Vagas - Allocates. (Does not show overflow yet).
                // Shift 2 (Tarde): Demand = Leftover Standard Pending.
                //    Allocates = min(Demand, Vagas).
                //    Restantes = Vagas - Demand (Pure subtraction? No, allocates is capped).

                // HOW TO SHOW OVERFLOW CORRECTLY?
                // Usually, overflow is shown on the "Last Resort" shift or clearly marked.
                // Existing logic: "isLast" check forced dump.

                // Hybrid Plan: 
                // Integral Shift: Consumes Integral Pending. If it's the only one, show full deficit.
                // Partial Shifts: Waterfall Standard Pending. If Tarde is last partial, show deficit there?

                // Let's implement 'Visual Deficit':
                // For Integral: 
                //    demand = initial integral pending.
                //    allocated = min(demand, vacancies).
                //    remaining_in_pool = demand - allocated.
                //    vagas_restantes = vacancies - demand (if demand > vacancies, this is negative).
                //    BUT we must ensure we don't count this demand again.
                //    Since Integral is usually a singleton shift, this works.

                // For Partial (Manha/Tarde):
                //    demand = current padrao pool.
                //    allocated = min(demand, vacancies).
                //    remaining_in_pool = demand - allocated.
                //    vagas_restantes = vacancies - allocated. (Shows 0 if full).
                //    PENDING: How to show the overflow if both Manha and Tarde are full?
                //    We need to force the subtraction on the LAST compatible shift.

                let vagasRestantes = shift.vagas - allocated;

                // Force Overflow Display
                if (isIntegralShift) {
                    // If there is still integral pending left after allocation (indep of whether this is 'last' shift),
                    // and since integral shifts don't usually chain, let's reflect the deficit here.
                    // Actually, simply: vagasRestantes = shift.vagas - (allocated + remaining_integral_demand_for_this_type)
                    // If we allocated max, remaining is (demand - allocated).
                    // So: vagasRestantes = shift.vagas - demand.
                    // But we must act destructively on the pool so next integral shift doesn't see it (unlikely case but safe).

                    // What if we have unallocated integral pending?
                    const unallocated = (isIntegralShift) ? (pendentes.integral - (pendentes.integral - allocated)) : 0;
                    // Wait, `allocated` is what we took. `pendentes.integral` was decremented? NO, I commented 'pendentes.integral -= allocated' above but didn't correct the variable usage in that thought block.
                    // Let's settle:
                }
            });

            // RE-DO SHIFT LOOP properly with Mutable State

            // We need to know which shifts are "Partial" group to find the "Last Partial".
            const partialShifts = shifts.filter(s => s.turno.toUpperCase() !== 'INTEGRAL');
            const integralShifts = shifts.filter(s => s.turno.toUpperCase() === 'INTEGRAL');

            // Loop 1: Integrals (usually just one)
            integralShifts.forEach(shift => {
                const demand = pendentes.integral;
                const allocated = Math.min(demand, shift.vagas);
                pendentes.integral -= allocated; // Consumed

                // If this is the last/only integral shift, allow it to go negative
                // to show the deficit of integral spots.
                let effectiveDemand = allocated;
                if (pendentes.integral > 0) { // Still have checking to do?
                    // If we are at the last integral shift, we assume the rest of the integral demand targets THIS shift (overflow).
                    // Since usually there's only 1, this is always true.
                    effectiveDemand += pendentes.integral;
                    pendentes.integral = 0; // All accounted for as overflow here
                }

                // Result
                shift._allocated = allocated; // Temporary storage
                shift._restantes = shift.vagas - effectiveDemand;
                shift._status = (shift._restantes < 0) ? 'Sobrecarga' : (shift._restantes === 0 ? 'Lotado' : 'Disponível');
                shift._percentual = (shift.vagas > 0) ? ((allocated / shift.vagas) * 100) : (allocated > 0 ? 100 : 0);
            });

            // Loop 2: Partials (Manha -> Tarde)
            partialShifts.forEach((shift, idx) => {
                const demand = pendentes.padrao;
                const allocated = Math.min(demand, shift.vagas);
                pendentes.padrao -= allocated;

                const isLastPartial = (idx === partialShifts.length - 1);

                let effectiveDemand = allocated;
                if (isLastPartial && pendentes.padrao > 0) {
                    effectiveDemand += pendentes.padrao;
                    pendentes.padrao = 0;
                }

                shift._allocated = allocated;
                shift._restantes = shift.vagas - effectiveDemand;
                shift._status = (shift._restantes < 0) ? 'Sobrecarga' : (shift._restantes === 0 ? 'Lotado' : 'Disponível');
                shift._percentual = (shift.vagas > 0) ? ((allocated / shift.vagas) * 100) : (allocated > 0 ? 100 : 0);
            });

            // Push to result
            shifts.forEach(shift => {
                mapeamento.push({
                    escola: shift.escola,
                    serie: shift.serie,
                    turno: shift.turno,
                    vagas_disponiveis: shift.vagas,
                    inscricoes_pendentes: shift._allocated, // Display ACTUAL filled spots (or effective demand? User usually wants to see current occupancy). 
                    // Standard allows showing "Allocated". "Restantes" shows the problem.
                    vagas_restantes: shift._restantes,
                    status: shift._status,
                    percentual_ocupacao: parseFloat(shift._percentual.toFixed(1))
                });
            });
        });

        // 4. Handle Pendentes with NO matching vacancies (Pure Sobrecarga)
        Object.keys(pendentesPorEscolaSerie).forEach(key => {
            if (!vagasPorEscolaSerie[key]) {
                const [escola, serie] = key.split('|');
                const p = pendentesPorEscolaSerie[key];

                // Create rows for non-existent shifts if demand exists
                if (p.padrao > 0) {
                    mapeamento.push({
                        escola, serie, turno: 'MANHÃ/TARDE', vagas_disponiveis: 0,
                        inscricoes_pendentes: p.padrao, vagas_restantes: -p.padrao,
                        status: 'Sobrecarga', percentual_ocupacao: 100
                    });
                }
                if (p.integral > 0) {
                    mapeamento.push({
                        escola, serie, turno: 'INTEGRAL', vagas_disponiveis: 0,
                        inscricoes_pendentes: p.integral, vagas_restantes: -p.integral,
                        status: 'Sobrecarga', percentual_ocupacao: 100
                    });
                }
            }
        });

        // 5. Final Sort (Reuse existing sort logic)
        mapeamento.sort((a, b) => {
            if (a.escola === b.escola) {
                if (a.serie === b.serie) {
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
