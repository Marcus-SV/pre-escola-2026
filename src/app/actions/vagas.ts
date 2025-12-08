'use server';

import { VagasService } from '@/lib/services/vagas';

export async function pesquisarVagas() {
    const service = new VagasService();
    return await service.pesquisarVagas();
}

export async function getEstatisticasVagas() {
    const service = new VagasService();
    return await service.obterEstatisticas();
}
