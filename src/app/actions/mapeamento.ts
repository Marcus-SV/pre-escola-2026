'use server';

import { MapeamentoService } from '@/lib/services/mapeamento';

export async function gerarMapeamento() {
    const service = new MapeamentoService();
    return await service.gerarMapeamento();
}

export async function salvarMapeamento(dados: any) {
    const service = new MapeamentoService();
    // The service expects an array of MapeamentoItem, but the frontend sends { dados: ... }
    // We need to extract the array if it's wrapped
    const items = dados.dados || dados;
    return await service.salvarMapeamento(items);
}

export async function getEstatisticasMapeamento() {
    const service = new MapeamentoService();
    return await service.obterEstatisticas();
}
