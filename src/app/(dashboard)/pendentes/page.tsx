'use client';

import { useState } from 'react';
import { Clock, BarChart, RefreshCw, School, Baby, Calendar } from 'lucide-react';
import { getEstatisticasPendentes } from '@/app/actions/pendentes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function PendentesPage() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCheckPendentes = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getEstatisticasPendentes();
            if (result.success) {
                setData(result);
            } else {
                setError((result as any).message || 'Erro ao verificar pendentes');
            }
        } catch (err) {
            setError('Erro de conexão ao verificar pendentes');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Clock className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                    Pendentes
                </h1>
                <p className="text-muted-foreground">
                    Crianças convocadas para matrículas dentro do prazo
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart className="h-5 w-5 text-indigo-600" />
                        Estatísticas dos Pendentes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">
                        Verifique o número de crianças que ainda estão dentro do prazo para efetivar a matrícula.
                    </p>
                    <Button
                        onClick={handleCheckPendentes}
                        disabled={loading}
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Carregando...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Verificar Pendentes
                            </>
                        )}
                    </Button>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>

            {data && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-l-4 border-l-yellow-500">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <Clock className="h-8 w-8 text-yellow-500" />
                                    <span className="text-3xl font-bold">{data.total_pendentes}</span>
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">Total de Pendentes</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-blue-500">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <School className="h-8 w-8 text-blue-500" />
                                    <span className="text-3xl font-bold">{Object.keys(data.por_escola || {}).length}</span>
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">Por Escola</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-green-500">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <Baby className="h-8 w-8 text-green-500" />
                                    <span className="text-3xl font-bold">{Object.keys(data.por_idade || {}).length}</span>
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">Por Idade</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-purple-500">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <Calendar className="h-8 w-8 text-purple-500" />
                                    <span className="text-lg font-bold">{data.data_verificacao}</span>
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">Última Atualização</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <School className="h-5 w-5 text-indigo-600" />
                                Detalhamento por Escola e Idade
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Escola Destino</TableHead>
                                            <TableHead>Idade</TableHead>
                                            <TableHead>Quantidade</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.detalhado && data.detalhado.length > 0 ? (
                                            data.detalhado.map((item: any, index: number) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{item.escola_destino}</TableCell>
                                                    <TableCell>{item.idade} anos</TableCell>
                                                    <TableCell className="font-bold text-indigo-600">{item.quantidade}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                    Nenhum dado disponível
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
