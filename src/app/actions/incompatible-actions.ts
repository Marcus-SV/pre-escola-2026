
'use server'

import { IncompatibleService, IncompatibleStudent } from '@/lib/services/incompatible';

const service = new IncompatibleService();

export async function getIncompatibleStudents(): Promise<{ success: boolean; data?: IncompatibleStudent[]; message?: string }> {
    try {
        const data = await service.getIncompatibleStudents();
        return { success: true, data };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function resolveStudentAction(student: IncompatibleStudent) {
    return await service.resolveStudent(student);
}

export async function getStudentPreviewAction(student: IncompatibleStudent) {
    try {
        const preview = service.getPreviewData(student);
        return { success: true, preview };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
