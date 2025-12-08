'use server';

import { InconsistenciasService } from '@/lib/services/inconsistencias';

export async function runInconsistencias(linhaInicial: number, linhaFinal: number) {
    const service = new InconsistenciasService();

    try {
        const result = await service.verificarInconsistencias(linhaInicial, linhaFinal);
        return result;
    } catch (error: any) {
        console.error('Erro na action runInconsistencias:', error);
        return { success: false, message: error.message };
    }
}
