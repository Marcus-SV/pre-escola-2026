import { config } from 'dotenv';
import { resolve } from 'path';
import { SedApiService } from '../src/lib/services/sed-api';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function testSedApi() {
    console.log('Testing SED API...');

    if (!process.env.SED_USER || !process.env.SED_PASSWORD) {
        console.error('Error: SED_USER or SED_PASSWORD not found in .env.local');
        process.exit(1);
    }

    const service = new SedApiService();

    try {
        // Test 1: Authentication (implicit in any request)
        console.log('1. Testing Authentication & RA Search...');
        // Using a known dummy or just testing auth by searching a non-existent student
        // or we can try to search for a common name if we want a hit, but auth check is primary.
        const ra = await service.pesquisarRA('TESTE', '01/01/2000', '', 'MAE TESTE');
        console.log('Search Result:', ra);
        console.log('✅ Authentication successful');

    } catch (error: any) {
        console.error('❌ SED API Error:', error.message);
        process.exit(1);
    }
}

testSedApi();
