import { GoogleSheetsService } from '../src/lib/services/google-sheets';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function debugIntegral() {
    console.log('--- Debugging Integral Spreadsheet ---');
    const integralSheetId = '1At7qlj7EuXvEaBss16ylbCmKk-riOlPox_ow1Gv5GRQ';
    const service = new GoogleSheetsService(integralSheetId);

    try {
        console.log(`Fetching data from sheet ID: ${integralSheetId}`);
        // Fetch first 20 rows
        const data = await service.getData('A1:Z20', 0);

        if (!data || data.length === 0) {
            console.error('No data found!');
            return;
        }

        const header = data[0];
        console.log('Header Row:', header);

        const targetSchool = 'FADA AZUL';
        console.log(`Looking for school containing: ${targetSchool}`);

        const rows = data.slice(1);
        let countFound = 0;

        rows.forEach((row, i) => {
            // Just verify content loosely first
            const rowString = row.join(' | ');
            if (rowString.toUpperCase().includes(targetSchool)) {
                console.log(`[Row ${i + 2}] Found FADA AZUL:`);
                console.log(row);
                countFound++;
            }
        });

        console.log(`Total rows with '${targetSchool}': ${countFound}`);

        // Try to identify columns
        const findCol = (name: string) => header.findIndex(h => h.toUpperCase().trim() === name.toUpperCase());

        const prazoIdx = findCol('PRAZO');
        const escolaIdx = findCol('ESCOLA DESTINO');
        const idadeIdx = findCol('IDADE');

        console.log('Column Indices Found:');
        console.log('PRAZO:', prazoIdx);
        console.log('ESCOLA DESTINO:', escolaIdx);
        console.log('IDADE:', idadeIdx);

        if (countFound > 0 && prazoIdx !== -1) {
            // Check date parsing for one example
            const exampleRow = rows.find(r => r.join(' | ').toUpperCase().includes(targetSchool));
            if (exampleRow) {
                const prazoVal = exampleRow[prazoIdx];
                console.log(`Sample Date Value: '${prazoVal}'`);

                try {
                    const parts = prazoVal.split('/');
                    console.log('Date Parts:', parts);
                    if (parts.length === 3) {
                        const dateObj = new Date(
                            parseInt(parts[2]),
                            parseInt(parts[1]) - 1,
                            parseInt(parts[0])
                        );
                        console.log('Parsed Date:', dateObj.toDateString());
                        console.log('Today:', new Date().toDateString());
                        console.log('Is valid (>= Today)?', dateObj >= new Date(new Date().setHours(0, 0, 0, 0)));
                    } else {
                        console.warn('Date split failed (length != 3)');
                    }
                } catch (e) {
                    console.error('Date parsing error', e);
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

debugIntegral();
