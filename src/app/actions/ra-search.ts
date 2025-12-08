'use server';

import { RaSearchService } from '@/lib/services/ra-search';

export async function searchRaInterval(startLine: number, endLine: number) {
    const service = new RaSearchService();
    return await service.searchRaInterval(startLine, endLine);
}

export async function searchRaByMotherInterval(startLine: number, endLine: number) {
    const service = new RaSearchService();
    return await service.searchRaByMotherInterval(startLine, endLine);
}

export async function searchRaByCpfInterval(startLine: number, endLine: number) {
    const service = new RaSearchService();
    return await service.searchRaByCpfInterval(startLine, endLine);
}

export async function searchRaCascade(startLine: number, endLine: number) {
    const service = new RaSearchService();
    return await service.searchRaCascade(startLine, endLine);
}
