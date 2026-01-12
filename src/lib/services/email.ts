
import nodemailer from 'nodemailer';

export class EmailService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendEmail(to: string, subject: string, html: string) {
        try {
            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM, // sender address
                to, // list of receivers
                subject, // Subject line
                html, // html body
            });

            console.log("Message sent: %s", info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error: any) {
            console.error("Error sending email: ", error);
            return { success: false, error: error.message };
        }
    }
}
