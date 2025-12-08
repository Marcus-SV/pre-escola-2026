import { config } from 'dotenv';
import { resolve } from 'path';
import { GoogleSheetsService } from '../src/lib/services/google-sheets';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function testSheetsApi() {
    console.log('Testing Google Sheets API...');

    if (!process.env.SHEET_ID) {
        console.error('Error: SHEET_ID not found in .env.local');
        process.exit(1);
    }

    const service = new GoogleSheetsService();

    try {
        // Test 1: Read a small range
        console.log('1. Reading range A1:B2...');
        const data = await service.getData('A1:B2');
        console.log('Data received:', data);

        if (Array.isArray(data)) {
            console.log('✅ Google Sheets Read successful');
        } else {
            console.error('❌ Unexpected data format');
        }

    } catch (error: any) {
        console.error('❌ Google Sheets Error:', error.message);
        process.exit(1);
    }
}

testSheetsApi();
