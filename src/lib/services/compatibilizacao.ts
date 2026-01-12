import { GoogleSheetsService } from './google-sheets';
import { MapeamentoService } from './mapeamento';
import { ClassificationService } from './classification';
import { PendentesService } from './pendentes';

interface Compatibilizado {
    nome: string;
    id: string;
    escola1: string;
    escola2: string;
    escola3: string;
    idade: string;
    atendido: string;
    escola_destino: string;
    prazo: string;
    vagas_restantes: number;
    motivo: string;
    periodo: string;
}

export class CompatibilizacaoService {
    private sheetsService: GoogleSheetsService;
    private mapeamentoService: MapeamentoService;
    private classificationService: ClassificationService;
    private pendentesService: PendentesService;

    constructor() {
        this.sheetsService = new GoogleSheetsService();
        this.mapeamentoService = new MapeamentoService();
        this.classificationService = new ClassificationService();
        this.pendentesService = new PendentesService();
    }

    async executarCompatibilizacao() {
        try {
            // 1. Get Classified Students
            console.log('[DEBUG] Iniciando classificação...');
            const classificacaoResult = await this.classificationService.classificarGeral();
            console.log('[DEBUG] Classificação success:', classificacaoResult.success, 'Count:', classificacaoResult.resultados?.length);

            if (!classificacaoResult.success || !classificacaoResult.resultados) {
                return { success: false, message: classificacaoResult.message || 'Erro na classificação' };
            }

            // 2. Get Vacancies (Mapeamento)
            console.log('[DEBUG] Iniciando mapeamento...');
            const mapeamentoResult = await this.mapeamentoService.gerarMapeamento();
            console.log('[DEBUG] Mapeamento success:', mapeamentoResult.success);

            if (!mapeamentoResult.success) {
                return { success: false, message: (mapeamentoResult as any).message || 'Erro no mapeamento' };
            }

            if (!('data' in mapeamentoResult)) {
                return { success: false, message: 'Dados de mapeamento inválidos' };
            }

            // 3. Get Pendentes Statistics (Standard + Integral)
            console.log('[DEBUG] Obtendo estatísticas de pendentes...');
            const pendentesResult = await this.pendentesService.obterEstatisticas();

            // 4. Process
            console.log('[DEBUG] Iniciando processamento...');
            // Pass pendentes result (even if failed/empty - handle inside)
            const resultado = this.processarCompatibilizacao(
                classificacaoResult.resultados,
                (mapeamentoResult as any).data,
                pendentesResult.success ? (pendentesResult as any).detalhado : []
            );

            return {
                success: true,
                data: resultado.compatibilizados,
                estatisticas: resultado.estatisticas,
                vagas_atualizadas: resultado.vagas_atualizadas,
                total_processados: classificacaoResult.resultados.length,
                total_atendidos: resultado.estatisticas.atendidos,
                total_nao_atendidos: resultado.estatisticas.nao_atendidos
            };

        } catch (error: any) {
            console.error('Erro ao executar compatibilização:', error);
            return { success: false, message: error.message };
        }
    }

    private processarCompatibilizacao(classificados: any[], mapeamento: any[], pendentes: any[]) {
        // Map vacancies by Key: Escola|Serie|Turno
        const mapaVagas: Record<string, number> = {};
        mapeamento.forEach(m => {
            const key = `${m.escola}|${m.serie}|${this.normalizarTurno(m.turno)}`;
            mapaVagas[key] = m.vagas_restantes; // Use remaining vacancies
        });

        // --- SUBTRACT PENDING ---
        if (pendentes && pendentes.length > 0) {
            console.log(`[DEBUG] Subtraindo ${pendentes.length} grupos de pendentes das vagas...`);
            pendentes.forEach((p: any) => {
                const escola = p.escola_destino;
                const idade = p.idade;
                const quantidade = p.quantidade;

                // Determine Serie based on Age (approximate logic, check requirements if strict)
                // Age 4 -> Serie 1, Age 5 -> Serie 2
                let serie = '';
                if (idade === '4') serie = '1';
                else if (idade === '5') serie = '2';

                // Determine Turno. 
                // IMPORTANT: The prompt implies Integral Pending = Integral Vacancies
                // But the 'Pending' object doesn't strictly have a 'Periodo' field from the sheet read logic,
                // except it came from 'Integral' sheet or is generalized. 
                // However, the `pendentes.ts` currently groups by School|Age. 
                // If the prompt says "subtract these vacancies", we must assume which shift they consume.
                // Since the request specific "Menu Pendentes considera vagas do periodo integral",
                // and we are adding them.
                // Assuming standard pendentes use the same logic as allocation? 
                // Or should we assume they consume INTEGRAL slots if they come from the Integral sheet?
                // The current `GrupoPendente` doesn't distinguish source (Integral vs Standard).
                // But logically, if a child is pending for a school/age, they occupy a spot.
                // If the user request implies specifically INTEGRAL pending, we might need to know the shift.
                // BUT, looking at `pendentes.ts`, we only capture `escola_destino` and `idade`.
                // Let's assume for now they consume from the 'INTEGRAL' pool if available, or we might need to be smarter.
                // Wait, the prompt says: "Verique se o menu 'Pendentes' considera as vagas do periodo integral que são as excessôes."
                // "Discriminar os pendentes de cada planilha e somar o resultado das duas"
                // "No menu 'Compatibilização' é necessário subtrair as vagas deste totas de pendentas das vagas restantes"

                // If we don't know the shift, we can't subtract accurately from Key: Escola|Serie|Turno.
                // Let's assume the safest bet: The "Integral" sheet implies INTEGRAL shift. 
                // The "Standard" sheet implies... what?
                // If we look at `pendentes.ts`, it reads 'PRAZO', 'ESCOLA DESTINO', 'IDADE'. It does NOT read 'TURNO'.
                // If we simply subtract from matching School/Serie, we have to pick a Turno.
                // Let's assume 'INTEGRAL' for the new ones.
                // But we merged them.
                // Let's check `PendentesService`.
                // Maybe we should update `PendentesService` to include `origem` or `turno`?
                // The prompt for Pendentes: "Atualizar para verificar pendentes da planilha integral... Filtrando para escolas de exceção... considera as vagas do periodo integral"
                // This strongly suggests these ARE integral vacancies.
                // Standard pendentes? Probably also occupy slots.
                // Let's iterate and try to subtract from INTEGRAL first, then others?
                // Or maybe we should improve `pendentes.ts` to flag them.

                // Actually, let's look at `mapeamento` keys again: Escola|Serie|Turno.
                // If I have 5 pending kids for School X, Age 4. 
                // They need slots. 
                // I will try to subtract from INTEGRAL first (as they are likely full-time priority or exception),
                // then maybe MANHA/TARDE? 
                // Or, considering the user specifically mentioned "Integral Pending", 
                // I'll subtract from INTEGRAL key first.

                const turnosParaChecar = ['INTEGRAL', 'MANHA', 'TARDE'];

                let qtdParaSubtrair = quantidade;

                if (serie) {
                    for (const turno of turnosParaChecar) {
                        if (qtdParaSubtrair <= 0) break;

                        const key = `${escola}|${serie}|${turno}`;
                        if (mapaVagas[key] && mapaVagas[key] > 0) {
                            const disponivel = mapaVagas[key];
                            const deduzir = Math.min(disponivel, qtdParaSubtrair);

                            mapaVagas[key] -= deduzir;
                            qtdParaSubtrair -= deduzir;

                            console.log(`[Pending Ded.] ${escola} | Age ${idade} | ${turno} -> Subtracted ${deduzir}. Remaining pending: ${qtdParaSubtrair}`);
                        }
                    }
                }
            });
        }
        // -----------------------

        const compatibilizados: Compatibilizado[] = [];
        const estatisticas = {
            atendidos: 0,
            nao_atendidos: 0,
            por_escola: {} as Record<string, number>,
            por_idade: {} as Record<string, { atendidos: number, nao_atendidos: number }>
        };

        let prazo = '';
        try {
            prazo = this.calcularPrazo();
            console.log('[DEBUG] CHECKPOINT 2 - Prazo calculated:', prazo);
        } catch (e) {
            console.error('[DEBUG] Error calculating prazo:', e);
        }

        if (classificados && Array.isArray(classificados)) {
            console.log('[DEBUG] CHECKPOINT 3 - Classificados is Array. Length:', classificados.length);
            if (classificados.length > 0) {
                console.log('[DEBUG] First student object:', JSON.stringify(classificados[0], null, 2));
            } else {
                console.log('[DEBUG] Classificados array is empty!');
            }
        } else {
            console.log('[DEBUG] CHECKPOINT 3 - Classificados is NOT Array:', typeof classificados);
        }

        let validStudentsCount = 0;
        classificados.forEach(a => {
            if (a.idade === '4' || a.idade === '5') validStudentsCount++;
        });
        console.log(`[DEBUG] Total students with valid age (4 or 5): ${validStudentsCount} out of ${classificados.length}`);

        try {
            classificados.forEach((aluno, index) => {
                if (index === 0) console.log('[DEBUG] CHECKPOINT 4 - Inside Loop First Item');
                let escolaAtendida = '';
                let vagasRestantes = 0;
                let atendido = false;
                let motivo = 'Nenhuma escola preferida tem vaga disponível no turno solicitado';

                const serie = (aluno.idade === '4') ? '1' : ((aluno.idade === '5') ? '2' : null);

                if (compatibilizados.length < 5) {
                    console.log(`[DEBUG] Raw Aluno: ${aluno.nome}, Idade: '${aluno.idade}' (Type: ${typeof aluno.idade}), Serie Calc: ${serie}`);
                }

                if (!serie) {
                    motivo = 'Idade não válida para pré-escola';
                } else {
                    const escolas = [
                        { nome: aluno.escola1, label: 'ESCOLA1' },
                        { nome: aluno.escola2, label: 'ESCOLA2' },
                        { nome: aluno.escola3, label: 'ESCOLA3' }
                    ];

                    // DEBUG: Log first few students
                    if (compatibilizados.length < 5) {
                        console.log(`[DEBUG] Aluno: ${aluno.nome}, Idade: ${aluno.idade}, Serie: ${serie}, Turno: ${aluno.periodo}`);
                        console.log(`[DEBUG] Escolas: ${JSON.stringify(escolas)}`);
                    }

                    for (const esc of escolas) {
                        if (!esc.nome) continue;

                        const alocacao = this.tentarAlocarVaga(aluno, esc.nome, serie, mapaVagas);

                        if (alocacao) {
                            escolaAtendida = esc.nome;
                            const chaveVaga = alocacao.chave;

                            // Decrement vacancy
                            mapaVagas[chaveVaga]--;
                            vagasRestantes = mapaVagas[chaveVaga];

                            atendido = true;
                            motivo = `Vaga disponível na ${esc.label} (${alocacao.turno})`;
                            break;
                        } else if (compatibilizados.length < 5) {
                            console.log(`[DEBUG] Falha ao alocar em ${esc.nome}.`);
                        }
                    }
                }

                // Stats
                if (atendido) {
                    if (!estatisticas.por_escola[escolaAtendida]) estatisticas.por_escola[escolaAtendida] = 0;
                    estatisticas.por_escola[escolaAtendida]++;
                    estatisticas.atendidos++;
                } else {
                    estatisticas.nao_atendidos++;
                }

                if (!estatisticas.por_idade[aluno.idade]) {
                    estatisticas.por_idade[aluno.idade] = { atendidos: 0, nao_atendidos: 0 };
                }
                if (atendido) {
                    estatisticas.por_idade[aluno.idade].atendidos++;
                } else {
                    estatisticas.por_idade[aluno.idade].nao_atendidos++;
                }

                compatibilizados.push({
                    nome: aluno.nome,
                    id: aluno.id,
                    escola1: aluno.escola1,
                    escola2: aluno.escola2,
                    escola3: aluno.escola3,
                    idade: aluno.idade,
                    atendido: atendido ? 'SIM' : 'NÃO',
                    escola_destino: escolaAtendida,
                    prazo: atendido ? prazo : '',
                    vagas_restantes: vagasRestantes,
                    motivo: motivo,
                    periodo: aluno.periodo
                });
            });
        } catch (error) {
            console.error('[DEBUG] Error inside loop:', error);
        }

        return { compatibilizados, estatisticas, vagas_atualizadas: mapaVagas };
    }

    private tentarAlocarVaga(aluno: any, escola: string, serie: string, mapaVagas: Record<string, number>) {
        const periodoSolicitado = this.normalizarTurno(aluno.periodo || '');
        const isPrioridade1 = aluno.prioridade === 1;

        const check = (turno: string) => {
            const chave = `${escola}|${serie}|${turno}`;
            // console.log(`[DEBUG] Checking key: ${chave}, Available: ${mapaVagas[chave]}`);
            if (mapaVagas[chave] && mapaVagas[chave] > 0) {
                return { chave, turno };
            }
            return null;
        };

        if (periodoSolicitado === 'PARCIAL') {
            // Priority 1: Try Manha -> Tarde -> Integral
            // Others: Try Manha -> Tarde
            if (isPrioridade1) {
                return check('MANHA') || check('TARDE') || check('INTEGRAL');
            } else {
                return check('MANHA') || check('TARDE');
            }
        } else if (periodoSolicitado === 'MANHA') {
            // Priority 1: Try Manha -> Integral
            // Others: Try Manha
            if (isPrioridade1) {
                return check('MANHA') || check('INTEGRAL');
            } else {
                return check('MANHA');
            }
        } else if (periodoSolicitado === 'TARDE') {
            // Priority 1: Try Tarde -> Integral
            // Others: Try Tarde
            if (isPrioridade1) {
                return check('TARDE') || check('INTEGRAL');
            } else {
                return check('TARDE');
            }
        } else if (periodoSolicitado === 'INTEGRAL') {
            return check('INTEGRAL');
        } else {
            // Fallback: try exact match or any available?
            // Legacy says: try exact match of what came in
            return check(periodoSolicitado);
        }
    }

    private normalizarTurno(texto: string): string {
        if (!texto) return '';
        return texto.trim().toUpperCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace('Ã', 'A').replace('Ç', 'C'); // Manual fix just in case
    }

    private calcularPrazo(): string {
        const hoje = new Date();
        let diasUteis = 0;

        while (diasUteis < 5) {
            hoje.setDate(hoje.getDate() + 1);
            const diaSemana = hoje.getDay(); // 0 = Dom, 6 = Sab
            if (diaSemana !== 0 && diaSemana !== 6) {
                diasUteis++;
            }
        }

        return hoje.toLocaleDateString('pt-BR');
    }

    async salvarCompatibilizacao(dados: Compatibilizado[]) {
        try {
            const header = [
                'ID', 'NOME', 'ESCOLA1', 'ESCOLA2', 'ESCOLA3', 'IDADE', 'ATENDIDO',
                'ESCOLA DESTINO', 'PRAZO', 'VAGAS RESTANTES', 'MOTIVO'
            ];

            const rows = dados.map(d => [
                d.id, d.nome, d.escola1, d.escola2, d.escola3, d.idade, d.atendido,
                d.escola_destino, d.prazo, d.vagas_restantes, d.motivo
            ]);

            const data = [header, ...rows];

            // Save to Sheet Index 2 (3rd tab)
            await this.sheetsService.clearSheet(2);
            await this.sheetsService.writeData(`A1:K${data.length}`, data, 2);

            return { success: true, message: 'Compatibilização salva na aba 3' };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async salvarCompatibilizacaoNaAbaPrincipal(compatibilizados: Compatibilizado[]) {
        try {
            const atendidos = compatibilizados.filter(c => c.atendido === 'SIM' && c.id);
            if (atendidos.length === 0) {
                return { success: true, message: 'Nenhum aluno atendido para atualizar.' };
            }

            // Get IDs from Sheet 0 (Column S)
            const idData = await this.sheetsService.getData('S:S', 0);
            if (!idData) throw new Error('Falha ao ler IDs da aba principal');

            const idMap: Record<string, number> = {};
            idData.forEach((row, index) => {
                if (row[0]) idMap[row[0].toString().trim()] = index + 1; // 1-based row
            });

            const updates: any[] = [];
            const notFound: string[] = [];

            atendidos.forEach(aluno => {
                const row = idMap[aluno.id.toString().trim()];
                if (row) {
                    // Update Y (ATENDIDO), Z (PRAZO), AA (ESCOLA DESTINO)
                    // Y is col 25, Z is 26, AA is 27.
                    // Range Y{row}:AA{row}
                    updates.push({
                        range: `Y${row}:AA${row}`,
                        values: [[aluno.atendido, aluno.prazo, aluno.escola_destino]]
                    });
                } else {
                    notFound.push(aluno.id);
                }
            });

            if (updates.length > 0) {
                const sheetName = await this.sheetsService.getSheetName(0);
                if (sheetName) {
                    await this.sheetsService.batchUpdate(sheetName, updates);
                }
            }

            return {
                success: true,
                message: 'Aba principal atualizada.',
                total_atualizados: updates.length,
                ids_nao_encontrados: notFound
            };

        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
}
