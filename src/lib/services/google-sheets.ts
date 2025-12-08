import { google, sheets_v4 } from 'googleapis';
import { getAuth } from '../google-auth';

export class GoogleSheetsService {
    private service: sheets_v4.Sheets | null = null;
    private spreadsheetId: string;

    constructor(spreadsheetId?: string) {
        this.spreadsheetId = spreadsheetId || process.env.SHEET_ID || '';
        if (!this.spreadsheetId) {
            console.warn('GoogleSheetsService: SHEET_ID not provided and not found in env.');
        }
    }

    private async getService(): Promise<sheets_v4.Sheets> {
        if (this.service) return this.service;

        const auth = getAuth();
        const client = await auth.getClient();
        this.service = google.sheets({ version: 'v4', auth: client as any });
        return this.service;
    }

    async getSheetName(index: number): Promise<string | null> {
        try {
            const service = await this.getService();
            const response = await service.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
            });

            const sheet = response.data.sheets?.[index];
            return sheet?.properties?.title || null;
        } catch (error) {
            console.error('Error getting sheet name:', error);
            return null;
        }
    }

    private async formatRange(range: string, sheetIndex?: number): Promise<string> {
        if (sheetIndex !== undefined && sheetIndex !== null) {
            const sheetName = await this.getSheetName(sheetIndex);
            if (sheetName) {
                return `'${sheetName}'!${range}`;
            }
            throw new Error(`Sheet with index ${sheetIndex} not found`);
        }
        return range;
    }

    async getData(range: string = 'A:Z', sheetIndex?: number): Promise<string[][]> {
        try {
            const service = await this.getService();
            const formattedRange = await this.formatRange(range, sheetIndex);

            const response = await service.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: formattedRange,
            });

            return response.data.values as string[][] || [];
        } catch (error) {
            console.error('Error getting data from Sheets:', error);
            throw error;
        }
    }

    async writeData(range: string, values: any[][], sheetIndex?: number) {
        try {
            const service = await this.getService();
            const formattedRange = await this.formatRange(range, sheetIndex);

            const response = await service.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: formattedRange,
                valueInputOption: 'RAW',
                requestBody: {
                    values,
                },
            });

            return response.data;
        } catch (error) {
            console.error('Error writing data to Sheets:', error);
            throw error;
        }
    }

    async clearSheet(sheetIndex: number) {
        try {
            const sheetName = await this.getSheetName(sheetIndex);
            if (!sheetName) throw new Error(`Sheet index ${sheetIndex} not found`);

            const service = await this.getService();
            // Clear by updating with empty values or using clear method
            // The PHP version used update with empty values, but clear is cleaner.
            // However, to match PHP logic exactly:
            const range = `'${sheetName}'!A:Z`;

            await service.spreadsheets.values.clear({
                spreadsheetId: this.spreadsheetId,
                range,
            });

            return true;
        } catch (error) {
            console.error('Error clearing sheet:', error);
            throw error;
        }
    }

    async batchUpdate(sheetName: string, updates: { range: string; values: any[][] }[]) {
        try {
            if (updates.length === 0) return 0;

            const service = await this.getService();
            const data = updates.map(update => ({
                range: `${sheetName}!${update.range}`,
                values: update.values,
            }));

            await service.spreadsheets.values.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                requestBody: {
                    valueInputOption: 'RAW',
                    data,
                },
            });

            return updates.length;
        } catch (error) {
            console.error('Error in batch update:', error);
            throw error;
        }
    }

    findColumnIndex(header: string[], possibleNames: string[], fallbackIndex: number, partialMatch: boolean = false): number {
        if (!header || header.length === 0) return fallbackIndex;

        const idx = header.findIndex((h: string) => {
            const c = (h || '').toLowerCase().trim();
            return possibleNames.some(name => {
                const n = name.toLowerCase();
                return c === n || (partialMatch && c.includes(n));
            });
        });

        return idx !== -1 ? idx : fallbackIndex;
    }
}
