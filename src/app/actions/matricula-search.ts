'use server';

import { MatriculaSearchService } from '@/lib/services/matricula-search';

export async function searchMatriculasInterval(startLine: number, endLine: number) {
    const service = new MatriculaSearchService();
    return await service.searchMatriculasInterval(startLine, endLine);
}
