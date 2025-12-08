'use server';

import { CompatibilizacaoService } from '@/lib/services/compatibilizacao';

export async function runCompatibilizacao() {
    console.log('[DEBUG] ACTION runCompatibilizacao called');
    const service = new CompatibilizacaoService();

    try {
        const result = await service.executarCompatibilizacao();

        if (result.success && result.data) {
            // Save to Sheet 2 (Preview/Record)
            const saveResult = await service.salvarCompatibilizacao(result.data);
            if (!saveResult.success) {
                return { success: false, message: `Compatibilização gerada, mas erro ao salvar na aba 3: ${saveResult.message}` };
            }

            // DO NOT save to Sheet 0 automatically anymore

            return {
                success: true,
                message: 'Compatibilização realizada com sucesso! Verifique os dados antes de salvar na aba principal.',
                details: {
                    save_sheet_2: saveResult.message,
                    stats: result.estatisticas
                },
                resultados: result.data
            };
        }

        return result;
    } catch (error: any) {
        console.error('Erro na action runCompatibilizacao:', error);
        return { success: false, message: error.message };
    }
}

export async function saveCompatibilizacaoToMain(compatibilizados: any[]) {
    const service = new CompatibilizacaoService();
    try {
        return await service.salvarCompatibilizacaoNaAbaPrincipal(compatibilizados);
    } catch (error: any) {
        console.error('Erro na action saveCompatibilizacaoToMain:', error);
        return { success: false, message: error.message };
    }
}
