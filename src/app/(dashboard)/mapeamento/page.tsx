'use client';

import { useState, useEffect } from 'react';
import { Map, DoorOpen, Clock, CheckCircle, AlertTriangle, RefreshCw, Save, Table as TableIcon, BarChart } from 'lucide-react';
import { gerarMapeamento, salvarMapeamento, getEstatisticasMapeamento } from '@/app/actions/mapeamento';
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

export default function MapeamentoPage() {
    const [loading, setLoading] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoadingStats(true);
        try {
            const result = await getEstatisticasMapeamento();
            if (result.success) {
                setStats((result as any).data);
            }
        } catch (err) {
            console.error('Erro ao carregar estatísticas', err);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleGerarMapeamento = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await gerarMapeamento();
            if (result.success) {
                const res = result as any;
                setData(res.data);
                // Update stats with the fresh result
                setStats({
                    total_vagas: res.total_vagas,
                    total_pendentes: res.total_pendentes,
                    total_vagas_restantes: res.total_vagas_restantes,
                    escolas_com_sobrecarga: (res.data as any[]).filter((m: any) => m.status === 'Sobrecarga').length
                });
            } else {
                setError((result as any).message || 'Erro ao gerar mapeamento');
            }
        } catch (err) {
            setError('Erro de conexão ao gerar mapeamento');
        } finally {
            setLoading(false);
        }
    };

    const handleSalvarMapeamento = async () => {
        if (!data) return;
        setSalvando(true);
        try {
            const result = await salvarMapeamento({ dados: data });
            if (result.success) {
                alert('Mapeamento salvo com sucesso!');
            } else {
                alert('Erro ao salvar: ' + result.message);
            }
        } catch (err) {
            alert('Erro de conexão ao salvar');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Map className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                    Mapeamento de Vagas
                </h1>
                <p className="text-muted-foreground">
                    Análise comparativa entre vagas disponíveis e inscrições pendentes por escola
                </p>
            </div>

            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-l-4 border-l-blue-500 text-center hover:scale-105 transition-transform duration-200">
                        <CardContent className="pt-6">
                            <div className="mb-3 flex justify-center">
                                <DoorOpen className="h-8 w-8 text-blue-500" />
                            </div>
                            <div className="text-4xl font-bold text-blue-600 mb-2">{stats.total_vagas}</div>
                            <div className="text-muted-foreground font-medium">Total de Vagas</div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-yellow-500 text-center hover:scale-105 transition-transform duration-200">
                        <CardContent className="pt-6">
                            <div className="mb-3 flex justify-center">
                                <Clock className="h-8 w-8 text-yellow-500" />
                            </div>
                            <div className="text-4xl font-bold text-yellow-600 mb-2">{stats.total_pendentes}</div>
                            <div className="text-muted-foreground font-medium">Inscrições Pendentes</div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-500 text-center hover:scale-105 transition-transform duration-200">
                        <CardContent className="pt-6">
                            <div className="mb-3 flex justify-center">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                            </div>
                            <div className="text-4xl font-bold text-green-600 mb-2">{stats.total_vagas_restantes}</div>
                            <div className="text-muted-foreground font-medium">Vagas Restantes</div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-red-500 text-center hover:scale-105 transition-transform duration-200">
                        <CardContent className="pt-6">
                            <div className="mb-3 flex justify-center">
                                <AlertTriangle className="h-8 w-8 text-red-500" />
                            </div>
                            <div className="text-4xl font-bold text-red-600 mb-2">{stats.escolas_com_sobrecarga}</div>
                            <div className="text-muted-foreground font-medium">Escolas com Sobrecarga</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={handleGerarMapeamento}
                            disabled={loading}
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Gerando...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Gerar Mapeamento
                                </>
                            )}
                        </Button>

                        {data && (
                            <Button
                                onClick={handleSalvarMapeamento}
                                disabled={salvando}
                                className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
                            >
                                {salvando ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Salvar na Planilha
                                    </>
                                )}
                            </Button>
                        )}

                        <Button
                            onClick={loadStats}
                            disabled={loadingStats}
                            variant="outline"
                            className="border-yellow-200 hover:bg-yellow-50 text-yellow-700"
                        >
                            {loadingStats ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Atualizando...
                                </>
                            ) : (
                                <>
                                    <BarChart className="mr-2 h-4 w-4" />
                                    Atualizar Estatísticas
                                </>
                            )}
                        </Button>
                    </div>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>

            {data && (
                <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TableIcon className="h-5 w-5 text-indigo-600" />
                            Resultado do Mapeamento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border max-h-[600px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                        <TableHead>Escola</TableHead>
                                        <TableHead>Série</TableHead>
                                        <TableHead>Turno</TableHead>
                                        <TableHead>Vagas Disponíveis</TableHead>
                                        <TableHead>Inscrições Pendentes</TableHead>
                                        <TableHead>Vagas Restantes</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>% Ocupação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.length > 0 ? (
                                        data.map((item: any, index: number) => {
                                            const statusClass = item.status === 'Sobrecarga'
                                                ? 'bg-red-100 text-red-800'
                                                : item.status === 'Lotado'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-green-100 text-green-800';

                                            const ocupacaoClass = item.percentual_ocupacao >= 100
                                                ? 'text-red-600 font-bold'
                                                : item.percentual_ocupacao >= 80
                                                    ? 'text-yellow-600 font-semibold'
                                                    : 'text-green-600';

                                            return (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{item.escola}</TableCell>
                                                    <TableCell>{item.serie}</TableCell>
                                                    <TableCell>{item.turno}</TableCell>
                                                    <TableCell>{item.vagas_disponiveis}</TableCell>
                                                    <TableCell>{item.inscricoes_pendentes}</TableCell>
                                                    <TableCell className={`font-semibold ${item.vagas_restantes < 0 ? 'text-red-600' : ''}`}>
                                                        {item.vagas_restantes}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusClass}`}>
                                                            {item.status}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className={ocupacaoClass}>
                                                        {item.percentual_ocupacao}%
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                Nenhum dado disponível
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
