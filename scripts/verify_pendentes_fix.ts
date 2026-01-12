import { PendentesService } from '../src/lib/services/pendentes';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function verify() {
    console.log('--- Verifying Pendentes Service ---');
    const service = new PendentesService();
    const result = await service.verificarPendentes();

    console.log('Success:', result.success);
    console.log('Total Pendentes:', result.total_pendentes);
    console.log('Total Padrão:', result.total_padrao);
    console.log('Total Integral:', result.total_integral);

    if (result.agrupados) {
        const integralGroups = result.agrupados.filter((g: any) => g.por_origem.INTEGRAL > 0);
        console.log('Groups with Integral Pending:', integralGroups.length);
        integralGroups.forEach((g: any) => {
            console.log(`- ${g.escola_destino} | Age ${g.idade}: ${g.por_origem.INTEGRAL}`);
        });
    }
}

verify();
