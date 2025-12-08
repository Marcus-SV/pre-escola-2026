'use server';

import { DashboardService } from '@/lib/services/dashboard';

export async function getDashboardMetrics() {
    const service = new DashboardService();
    return await service.getMetrics();
}
