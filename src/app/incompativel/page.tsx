'use client';

import { useState, useEffect } from 'react';
import { getIncompatibleStudents, resolveStudentAction, getStudentPreviewAction } from '../actions/incompatible-actions';
import { IncompatibleStudent } from '@/lib/services/incompatible';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Mail } from 'lucide-react';

export default function IncompatiblePage() {
    const [students, setStudents] = useState<IncompatibleStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<IncompatibleStudent | null>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        setLoading(true);
        const result = await getIncompatibleStudents();
        if (result.success && result.data) {
            setStudents(result.data);
        } else {
            toast.error("Erro ao carregar", {
                description: result.message || "Falha ao buscar inscrições."
            });
        }
        setLoading(false);
    };

    const handlePreview = async (student: IncompatibleStudent) => {
        if (!student.emailEscola) {
            toast.error("Email indisponível", {
                description: "Escola de origem não possui email cadastrado."
            });
            return;
        }

        setSelectedStudent(student);
        setProcessingId(student.id);

        const result = await getStudentPreviewAction(student);
        setProcessingId(null);

        if (result.success && result.preview) {
            setPreviewData(result.preview);
            setIsPreviewOpen(true);
        } else {
            toast.error("Erro ao gerar visualização", { description: result.message });
        }
    };

    const handleConfirmSend = async () => {
        if (!selectedStudent) return;

        setSending(true);
        const result = await resolveStudentAction(selectedStudent);
        setSending(false);
        setIsPreviewOpen(false); // Close dialog

        if (result.success) {
            toast.success("Sucesso", {
                description: "Email enviado e status atualizado."
            });
            // Remove from list
            setStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
        } else {
            toast.error("Erro", {
                description: result.message
            });
        }
        setSelectedStudent(null);
        setPreviewData(null);
    };

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Inscrições com Idade Incompatível</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Alunos Pendentes ({students.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            Nenhuma inscrição incompatível encontrada.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Data Nasc.</TableHead>
                                    <TableHead>Idade</TableHead>
                                    <TableHead>Escola Origem</TableHead>
                                    <TableHead>Email Escola</TableHead>
                                    <TableHead>Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell>{student.nome}</TableCell>
                                        <TableCell>{student.dataNascimento}</TableCell>
                                        <TableCell>{student.idade}</TableCell>
                                        <TableCell>{student.escolaOrigem}</TableCell>
                                        <TableCell>{student.emailEscola || <span className="text-red-500">Não encontrado</span>}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePreview(student)}
                                                disabled={!!processingId || !student.emailEscola}
                                            >
                                                {processingId === student.id ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Mail className="mr-2 h-4 w-4" />
                                                )}
                                                Revisar e Enviar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Revisar Email</DialogTitle>
                        <DialogDescription>
                            Verifique os dados abaixo antes de enviar.
                        </DialogDescription>
                    </DialogHeader>
                    {previewData && (
                        <div className="space-y-4 border rounded p-4 bg-muted/50 text-sm">
                            <div className="grid grid-cols-[80px_1fr] gap-2">
                                <span className="font-semibold text-right">De:</span>
                                <span>{previewData.from || 'SMTP_FROM não configurado'}</span>

                                <span className="font-semibold text-right">Para:</span>
                                <span>{previewData.to}</span>

                                <span className="font-semibold text-right">Assunto:</span>
                                <span>{previewData.subject}</span>
                            </div>
                            <div className="border-t pt-4">
                                <span className="font-semibold block mb-2">Mensagem:</span>
                                <div
                                    className="bg-white p-4 rounded border dark:bg-black/50"
                                    dangerouslySetInnerHTML={{ __html: previewData.html }}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPreviewOpen(false)} disabled={sending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleConfirmSend} disabled={sending}>
                            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar envio
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
