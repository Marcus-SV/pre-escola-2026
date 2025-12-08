'use server';

import { PendentesService } from '@/lib/services/pendentes';

export async function getEstatisticasPendentes() {
    const service = new PendentesService();
    return await service.obterEstatisticas();
}
