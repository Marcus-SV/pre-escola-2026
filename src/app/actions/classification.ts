'use server';

import { ClassificationService } from '@/lib/services/classification';

export async function runClassification() {
    const service = new ClassificationService();

    try {
        const result = await service.classificarPorEscola();

        if (result.success && result.resultados) {
            const saveResult = await service.salvarClassificacao(result.resultados);
            if (!saveResult.success) {
                return { success: false, message: `Classificação gerada, mas erro ao salvar: ${saveResult.message}` };
            }
            return {
                success: true,
                message: 'Classificação realizada e salva com sucesso!',
                total: result.total,
                resultados: result.resultados
            };
        }

        return result;
    } catch (error: any) {
        console.error('Erro na action runClassification:', error);
        return { success: false, message: error.message };
    }
}
