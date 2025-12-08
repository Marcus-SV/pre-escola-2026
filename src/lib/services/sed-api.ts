import { headers } from 'next/headers';

interface SedConfig {
    usuario?: string;
    senha?: string;
    baseUrl: string;
}

interface TokenInfo {
    token: string;
    expiresAt: number;
}

let cachedToken: TokenInfo | null = null;

export class SedApiService {
    private config: SedConfig;

    constructor() {
        this.config = {
            usuario: process.env.SED_USER,
            senha: process.env.SED_PASSWORD,
            baseUrl: 'https://integracaosed.educacao.sp.gov.br/ncaapi/api',
        };
    }

    private async authenticate(): Promise<string> {
        // Check cache
        if (cachedToken && cachedToken.expiresAt > Date.now()) {
            return cachedToken.token;
        }

        if (!this.config.usuario || !this.config.senha) {
            throw new Error('SED credentials not configured');
        }

        return this.login(this.config.usuario, this.config.senha);
    }

    async login(usuario: string, senha: string): Promise<string> {
        const url = `${this.config.baseUrl}/Usuario/ValidarUsuario`;
        const auth = Buffer.from(`${usuario}:${senha}`).toString('base64');

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Authorization': `Basic ${auth}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.outAutenticacao) {
                const token = data.outAutenticacao;
                // Cache for 29 minutes (API gives 30 usually)
                // Only cache if it's the system user
                if (usuario === this.config.usuario) {
                    cachedToken = {
                        token,
                        expiresAt: Date.now() + 29 * 60 * 1000,
                    };
                }
                return token;
            } else {
                throw new Error('Token not found in response');
            }
        } catch (error) {
            console.error('Error authenticating with SED:', error);
            throw error;
        }
    }

    private async request(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
        const token = await this.authenticate();
        const url = `${this.config.baseUrl}${endpoint}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': `Bearer ${token}`,
        };

        const options: RequestInit = {
            method,
            headers,
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP Error ${response.status}: ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error requesting ${endpoint}:`, error);
            throw error;
        }
    }

    async pesquisarRA(nomeAluno: string, dataNascimento: string, nomeSocial: string = '', nomeMae: string = '') {
        const params = new URLSearchParams({
            inNomeAluno: nomeAluno,
            inNomeSocial: nomeSocial,
            inNomeMae: nomeMae,
            inDataNascimento: dataNascimento,
        });

        try {
            const data = await this.request(`/Aluno/ListarAlunos?${params.toString()}`);

            if (data.outListaAlunos && data.outListaAlunos.length > 0) {
                return data.outListaAlunos[0].outNumRA;
            }
            return null;
        } catch (error) {
            console.error('Error searching RA:', error);
            return null;
        }
    }

    async pesquisarMatriculas(ra: string) {
        const params = new URLSearchParams({
            inNumRA: ra,
            inDigitoRA: '',
            inSiglaUFRA: 'SP',
        });

        try {
            const data = await this.request(`/Matricula/ListarMatriculasRA?${params.toString()}`);

            if (data.outListaMatriculas && data.outListaMatriculas.length > 0) {
                const matricula = data.outListaMatriculas[0];
                if (matricula.outDescSitMatricula === 'ATIVO') {
                    return {
                        escola: matricula.outDescNomeAbrevEscola || '',
                        municipio: matricula.outMunicipio || '',
                        status: 'ATIVO',
                    };
                } else {
                    return {
                        escola: '',
                        municipio: 'Fora da Escola',
                        status: matricula.outDescSitMatricula || 'INATIVO',
                    };
                }
            }

            return {
                escola: '',
                municipio: 'Fora da Escola',
                status: 'SEM_MATRICULA',
            };
        } catch (error) {
            console.error('Error searching matriculas:', error);
            return {
                escola: '',
                municipio: 'Erro na consulta',
                status: 'ERRO',
            };
        }
    }

    async pesquisarRAPorMae(nomeMae: string, dataNascimento: string) {
        const params = new URLSearchParams({
            inNomeAluno: '',
            inNomeSocial: '',
            inNomeMae: nomeMae,
            inDataNascimento: dataNascimento,
        });

        try {
            const data = await this.request(`/Aluno/ListarAlunos?${params.toString()}`);

            if (data.outListaAlunos && data.outListaAlunos.length > 0) {
                return data.outListaAlunos[0].outNumRA;
            }
            return null;
        } catch (error) {
            console.error('Error searching RA by Mother:', error);
            return null;
        }
    }

    async pesquisarRAPorCPF(cpf: string) {
        const params = new URLSearchParams({
            inNumRG: '',
            inDigitoRG: '',
            inUFRG: '',
            inCPF: cpf,
            inNumNIS: '',
            inNumINEP: '',
            inNumCertidaoNova: '',
            CertidaoNasc: ''
        });

        try {
            const data = await this.request(`/Aluno/ListarAlunos?${params.toString()}`);

            if (data.outListaAlunos && data.outListaAlunos.length > 0) {
                return data.outListaAlunos[0].outNumRA;
            }
            return null;
        } catch (error) {
            console.error('Error searching RA by CPF:', error);
            return null;
        }
    }

    // Batch operations can be implemented using Promise.all
    async pesquisarRAs(alunos: { nome: string; data_nascimento: string; nome_social?: string; nome_mae?: string }[]) {
        // Limit concurrency if needed, but for now Promise.all is fine for small batches
        // For large batches, we might want to use a queue or p-limit
        const results = await Promise.all(
            alunos.map(async (aluno) => {
                try {
                    const ra = await this.pesquisarRA(
                        aluno.nome,
                        aluno.data_nascimento,
                        aluno.nome_social,
                        aluno.nome_mae
                    );
                    return {
                        ...aluno,
                        ra,
                        error: null,
                    };
                } catch (error: any) {
                    return {
                        ...aluno,
                        ra: null,
                        error: error.message || 'Unknown error',
                    };
                }
            })
        );
        return results;
    }

    async getEscolas(municipio: string = '9659', diretoria: string = '20710', rede: string = '2') {
        const params = new URLSearchParams({
            inCodDiretoria: diretoria,
            inCodMunicipio: municipio,
            inCodRedeEnsino: rede
        });

        try {
            const data = await this.request(`/DadosBasicos/EscolasPorMunicipio?${params.toString()}`);

            if (data.outEscolas && Array.isArray(data.outEscolas)) {
                return data.outEscolas.map((e: any) => e.outCodEscola);
            }
            return [];
        } catch (error) {
            console.error('Error fetching schools:', error);
            return [];
        }
    }

    async getClasses(escolas: string[]) {
        // Fetch classes for multiple schools in parallel (with limit)
        const BATCH_SIZE = 10;
        const results: any[] = [];

        for (let i = 0; i < escolas.length; i += BATCH_SIZE) {
            const batch = escolas.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(cie => this.getClassesPorEscola(cie));

            const batchResults = await Promise.all(batchPromises);
            batchResults.forEach(res => {
                if (res) results.push(res);
            });
        }

        return results;
    }

    private async getClassesPorEscola(cie: string) {
        const params = new URLSearchParams({
            inAnoLetivo: '2026',
            inCodEscola: cie,
            inCodTipoEnsino: '6',
            inCodSerieAno: '',
            inCodTurno: '',
            inSemestre: ''
        });

        try {
            const data = await this.request(`/RelacaoAlunosClasse/RelacaoClasses?${params.toString()}`);

            if (data.outClasses && Array.isArray(data.outClasses)) {
                let nomeEscola = data.outDescNomeAbrevEscola || '';
                if (Array.isArray(nomeEscola)) {
                    nomeEscola = nomeEscola.join(', ');
                }

                return {
                    outCodEscola: cie,
                    outDescNomeAbrevEscola: nomeEscola,
                    outClasses: data.outClasses
                };
            }
            return null;
        } catch (error) {
            console.error(`Error fetching classes for school ${cie}:`, error);
            return null;
        }
    }
}
