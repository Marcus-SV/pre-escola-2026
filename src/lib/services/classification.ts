import { GoogleSheetsService } from './google-sheets';

interface Aluno {
    linha: number;
    nome: string;
    idade: string;
    escola: string;
    carimbo: string;
    email: string;
    escola1: string;
    escola2: string;
    escola3: string;
    id: string;
    endereco_tipo: string;
    cidade: string;
    prioridade: number;
    prioridade_endereco: number;
    periodo: string;
    classificacao?: number;
}

interface ClassificacaoEscola {
    escola: string;
    idade: string;
    ordem_classificacao: number;
    prioridade: number;
    id: string;
    nome: string;
    escola_preferencia: string;
    endereco_tipo: string;
    email: string;
    email_escola: string;
}

export class ClassificationService {
    private sheetsService: GoogleSheetsService;
    private escolasEmails: Record<string, string> = {};

    constructor() {
        this.sheetsService = new GoogleSheetsService();
    }

    // TODO: Implement loading emails from CSV if needed, or fetch from a sheet
    // For now, we'll skip email loading or implement a placeholder
    private async carregarEmailsEscolas() {
        try {
            // Sheet Index 1 (2nd tab) - Assuming it contains school info
            const data = await this.sheetsService.getData('A:Z', 1);
            if (!data || data.length < 2) return;

            const header = data[0];
            const rows = data.slice(1);

            const idxNome = this.sheetsService.findColumnIndex(header, ['outDescNomeEscola', 'outDescNomeAbrevEscola', 'Escola', 'Nome'], -1);
            const idxEmail = this.sheetsService.findColumnIndex(header, ['outEmail', 'Email', 'E-mail'], 18); // Fallback to S (18)

            if (idxNome === -1) {
                console.warn('[WARN] Coluna de Nome da Escola não encontrada na Aba 2');
                return;
            }

            rows.forEach(row => {
                const nome = (row[idxNome] || '').trim();
                const email = (row[idxEmail] || '').trim();
                if (nome && email) {
                    this.escolasEmails[nome] = email;
                }
            });

        } catch (error) {
            console.error('Erro ao carregar emails das escolas:', error);
        }
    }

    private buscarEmailEscola(nomeEscola: string): string {
        return this.escolasEmails[nomeEscola] || '';
    }

    async classificarGeral() {
        try {
            // Fetch all data (A:AL)
            const data = await this.sheetsService.getData('A:AL');

            if (!data || data.length === 0) {
                return { success: false, message: 'Nenhum dado encontrado na planilha' };
            }

            // Filter students NOT attended (Column Y / index 24 = 'NÃO')
            // Note: data includes header in row 0 if we read from A1, but getData usually returns raw values
            // Let's assume row 0 is header if we read range. 
            // Actually sheetsService.getData returns values.

            // Let's identify header row. Usually first row.
            const header = data[0];
            const rows = data.slice(1);

            let alunosNaoAtendidos = rows.map((row, index) => ({ row, index: index + 2 }))
                .filter(item => {
                    const atendido = item.row[24]; // Column Y
                    return (atendido || '').trim().toUpperCase() === 'NÃO';
                });

            // If no 'NÃO' found, take all (fallback logic from legacy)
            if (alunosNaoAtendidos.length === 0) {
                alunosNaoAtendidos = rows.map((row, index) => ({ row, index: index + 2 }));
            }

            if (alunosNaoAtendidos.length === 0) {
                return { success: false, message: 'Nenhum aluno encontrado para classificar' };
            }

            // Map priorities
            const prioridades: Record<string, number> = {
                'Ingressar na Rede Pública (disponibiliza a vaga até 2 km de distância do endereço)': 1,
                'Transferência - Mudança de Endereço (disponibliza a vaga até 2 km de distância do endereço)': 2,
                'Intenção de Transferência (Selecione uma Unidade Escolar de interesse - Atendimento não prioritário)': 3
            };

            // Log headers for debugging
            console.log('[DEBUG] Headers encontrados:', header);

            // Find 'Período' column index
            let indexPeriodo = this.sheetsService.findColumnIndex(header, ['definir período', 'definir periodo', 'período', 'periodo', 'turno'], -1, true);

            if (indexPeriodo === -1) {
                // Try partial match if exact match failed (though findColumnIndex does partial match too, but let's stick to the robust list above first)
                // Actually findColumnIndex does partial match.
                // Let's trust the helper.
                console.warn('[WARN] Coluna Período não encontrada! Tentando índice fixo 17 (R) como fallback.');
                indexPeriodo = 17; // Column R based on user info
            }

            // Find 'Idade' column index
            const indexIdade = this.sheetsService.findColumnIndex(header, ['IDADE'], 21, false); // Index 21 (V)

            console.log(`[DEBUG] Coluna Idade index: ${indexIdade}, Header: ${header[indexIdade]}`);
            console.log(`[DEBUG] Coluna Periodo index: ${indexPeriodo}, Header: ${header[indexPeriodo]}`);

            const alunosProcessados: Aluno[] = alunosNaoAtendidos.map(item => {
                const row = item.row;
                const escola = row[15] || ''; // Col P (index 15) - Escola (Motivo)

                const prioridade = prioridades[escola] || 4;
                const enderecoTipo = row[13] || ''; // Col N (index 13)
                const prioridadeEndereco = (enderecoTipo === 'Residencial') ? 1 : ((enderecoTipo === 'Profissional') ? 2 : 3);

                return {
                    linha: item.index,
                    nome: row[2] || '', // Col C
                    idade: (row[indexIdade] || '').trim(),
                    escola: escola,
                    carimbo: row[0] || '', // Col A
                    email: row[1] || '', // Col B
                    escola1: row[30] || '', // Col AE
                    escola2: row[32] || '', // Col AG
                    escola3: row[34] || '', // Col AI
                    id: row[18] || '', // Col S
                    endereco_tipo: enderecoTipo,
                    cidade: row[23] || '', // Col X
                    prioridade,
                    prioridade_endereco: prioridadeEndereco,
                    periodo: indexPeriodo !== -1 ? (row[indexPeriodo] || '') : ''
                };
            });

            // Sort
            alunosProcessados.sort((a, b) => {
                // 1. Idade
                if (a.idade !== b.idade) return a.idade.localeCompare(b.idade);
                // 2. Prioridade
                if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
                // 3. Prioridade Endereço
                if (a.prioridade_endereco !== b.prioridade_endereco) return a.prioridade_endereco - b.prioridade_endereco;
                // 4. ID (Int)
                return parseInt(a.id || '0') - parseInt(b.id || '0');
            });

            // Add classification within age group
            let classificacao = 1;
            let idadeAnterior: string | null = null;

            alunosProcessados.forEach(aluno => {
                if (idadeAnterior !== null && aluno.idade !== idadeAnterior) {
                    classificacao = 1;
                }
                aluno.classificacao = classificacao;
                classificacao++;
                idadeAnterior = aluno.idade;
            });

            return {
                success: true,
                resultados: alunosProcessados
            };

        } catch (error: any) {
            console.error('Erro na classificação geral:', error);
            return { success: false, message: error.message };
        }
    }

    async classificarPorEscola() {
        try {
            // Load emails first
            await this.carregarEmailsEscolas();

            const geral = await this.classificarGeral();
            if (!geral.success || !geral.resultados) {
                return { success: false, message: geral.message || 'Erro na classificação geral' };
            }

            const alunos = geral.resultados;
            const classificacaoPorEscola: any[] = [];

            alunos.forEach(aluno => {
                // Escola 1
                if (aluno.escola1) {
                    classificacaoPorEscola.push({
                        ...aluno,
                        escola_alvo: aluno.escola1,
                        escola_preferencia: 'ESCOLA1'
                    });
                }
                // Escola 2
                if (aluno.escola2) {
                    classificacaoPorEscola.push({
                        ...aluno,
                        escola_alvo: aluno.escola2,
                        escola_preferencia: 'ESCOLA2'
                    });
                }
                // Escola 3
                if (aluno.escola3) {
                    classificacaoPorEscola.push({
                        ...aluno,
                        escola_alvo: aluno.escola3,
                        escola_preferencia: 'ESCOLA3'
                    });
                }
            });

            // Sort by School, Age, Priority, ID
            classificacaoPorEscola.sort((a, b) => {
                if (a.escola_alvo !== b.escola_alvo) return a.escola_alvo.localeCompare(b.escola_alvo);
                if (a.idade !== b.idade) return a.idade.localeCompare(b.idade);
                if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
                return parseInt(a.id || '0') - parseInt(b.id || '0');
            });

            // Add order
            let ordem = 1;
            let escolaAnterior: string | null = null;
            let idadeAnterior: string | null = null;

            const resultadosFinais: ClassificacaoEscola[] = classificacaoPorEscola.map(item => {
                if (escolaAnterior !== null && (item.escola_alvo !== escolaAnterior || item.idade !== idadeAnterior)) {
                    ordem = 1;
                }

                const res = {
                    escola: item.escola_alvo,
                    idade: item.idade,
                    ordem_classificacao: ordem,
                    prioridade: item.prioridade,
                    id: item.id,
                    nome: item.nome,
                    escola_preferencia: item.escola_preferencia,
                    endereco_tipo: item.endereco_tipo,
                    email: item.email,
                    email_escola: this.buscarEmailEscola(item.escola_alvo)
                };

                ordem++;
                escolaAnterior = item.escola_alvo;
                idadeAnterior = item.idade;
                return res;
            });

            return {
                success: true,
                resultados: resultadosFinais,
                total: resultadosFinais.length
            };

        } catch (error: any) {
            console.error('Erro na classificação por escola:', error);
            return { success: false, message: error.message };
        }
    }

    async salvarClassificacao(resultados: ClassificacaoEscola[]) {
        try {
            const header = [
                'ESCOLA', 'IDADE', 'Ordem de Classificação', 'Prioridade', 'ID',
                'Nome Completo do(a) Aluno(a)', 'O Endereço informado é',
                'Endereço de e-mail', 'Email da Escola', 'ESCOLA_PREFERENCIA'
            ];

            const rows = resultados.map(r => [
                r.escola, r.idade, r.ordem_classificacao, r.prioridade, r.id,
                r.nome, r.endereco_tipo, r.email, r.email_escola, r.escola_preferencia
            ]);

            const data = [header, ...rows];

            // Save to Sheet Index 7 (8th tab)
            await this.sheetsService.clearSheet(7);
            await this.sheetsService.writeData(`A1:J${data.length}`, data, 7);

            return { success: true };
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            return { success: false, message: error.message };
        }
    }
}
