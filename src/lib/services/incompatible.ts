
import { GoogleSheetsService } from './google-sheets';
import { EmailService } from './email';

export interface IncompatibleStudent {
    id: string;
    nome: string;
    dataNascimento: string;
    idade: string;
    escolaOrigem: string;
    linha: number;
    emailEscola?: string; // We might need to fetch this or it might be in the row
    atendido: string;
    emailResponsavel?: string;
}

export class IncompatibleService {
    private sheetsService: GoogleSheetsService;
    private emailService: EmailService;

    // Based on classification.ts logic
    // Sheet 0 headers: 
    // Col S (18) = ID
    // Col C (2) = Nome
    // Col V (21) = Idade (calculated or direct) - We need to check columns again if needed
    // Col Y (24) = Atendido
    // But dataNascimento might be another column. 
    // Let's refine based on previous `view_file` of `classification.ts` which showed:
    // row[0] = Carimbo
    // row[2] = Nome
    // row[18] = ID
    // row[24] = Atendido (Y)
    // row[indexIdade] = Idade (V - 21)

    // We need DataNascimento. Let's assume it's somewhere. 
    // In `classification.ts`, it doesn't seem explicitly used as Date, just Age.
    // I will try to find the Date of Birth column index dynamically or guess it.
    // Usually "Data de Nascimento" or similar.

    constructor() {
        this.sheetsService = new GoogleSheetsService();
        this.emailService = new EmailService();
    }

    async getIncompatibleStudents(): Promise<IncompatibleStudent[]> {
        try {
            const data = await this.sheetsService.getData('A:Z'); // Fetch enough columns
            if (!data || data.length < 2) return [];

            const header = data[0];
            const rows = data.slice(1);

            const idxId = 18; // S
            const idxNome = 2; // C
            const idxIdade = 21; // V
            const idxAtendido = 24; // Y
            const idxEscolaOrigem = 15; // P (Escola/Motivo)

            // Find Data Nascimento
            const idxDataNasc = this.sheetsService.findColumnIndex(header, ['data de nascimento', 'data nascimento', 'nascimento'], -1, true);

            // Find 'Endereço de e-mail' column
            // We'll search for 'endereço de e-mail', 'email', 'e-mail'
            const idxEmail = this.sheetsService.findColumnIndex(header, ['endereço de e-mail', 'email', 'e-mail'], 1); // Default to B (1)

            const incompatible: IncompatibleStudent[] = [];

            rows.forEach((row, index) => {
                const idade = (row[idxIdade] || '').trim();
                const atendido = (row[idxAtendido] || '').trim().toUpperCase();

                // Criterion: Age != 4 and != 5 AND Atendido != 'SIM'
                if (idade !== '4' && idade !== '5' && atendido !== 'SIM') {
                    // Check if it's potentially empty row
                    if (!row[idxNome]) return;

                    const escolaOrigem = row[idxEscolaOrigem] || '';
                    // Use email from the row itself as requested
                    const emailEscola = row[idxEmail] || '';

                    incompatible.push({
                        id: row[idxId] || `ROW-${index + 2}`,
                        nome: row[idxNome],
                        dataNascimento: idxDataNasc !== -1 ? row[idxDataNasc] : '',
                        idade,
                        escolaOrigem,
                        linha: index + 2, // 1-based index (header is 1, first data is 2)
                        atendido: atendido || 'NÃO',
                        emailEscola
                    });
                }
            });

            return incompatible;

        } catch (error) {
            console.error('Error fetching incompatible students:', error);
            return [];
        }
    }

    // private async loadSchoolEmails(): Promise<Record<string, string>> { ... } // Removed or kept unused if needed later
    // Removing unused method to clean up
    getPreviewData(student: IncompatibleStudent) {
        const subject = 'Inscrição Pré-Escola 2026 - Incompatibilidade de Idade';

        const html = `
            <p>Prezados,</p>
            <p>Observamos que a inscrição da criança <strong>${student.nome}</strong>, data de nascimento <strong>${student.dataNascimento}</strong>, não tem idade compatível com a pré-escola.</p>
            <p>Solicitamos revisar a data de nascimento e, caso esteja correta, deverá refazer a inscrição no formulário correto.</p>
            <br>
            <p>Atenciosamente,</p>
            <p>Equipe de Matrícula</p>
        `;

        return {
            to: student.emailEscola || '',
            from: process.env.SMTP_FROM || '',
            subject,
            html
        };
    }

    async resolveStudent(student: IncompatibleStudent) {
        try {
            if (!student.emailEscola) {
                return { success: false, message: 'Escola não tem email cadastrado.' };
            }

            const preview = this.getPreviewData(student);
            const emailResult = await this.emailService.sendEmail(preview.to, preview.subject, preview.html);

            if (!emailResult.success) {
                throw new Error(`Falha ao enviar email: ${emailResult.error}`);
            }

            // Update Sheet
            // Set ATENDIDO (Col Y / 24) = SIM
            // Range: Y{linha}
            const range = `Y${student.linha}`;
            const values = [['SIM']];

            await this.sheetsService.writeData(range, values); // Default sheet is 0

            return { success: true, message: 'Email enviado e status atualizado.' };

        } catch (error: any) {
            console.error('Error resolving student:', error);
            return { success: false, message: error.message };
        }
    }
}
