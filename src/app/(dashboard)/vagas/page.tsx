'use client';

import { useState, useEffect } from 'react';
import { DoorOpen, Search, BarChart, School, Users, CheckCircle, RefreshCw } from 'lucide-react';
import { pesquisarVagas, getEstatisticasVagas } from '@/app/actions/vagas';
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

export default function VagasPage() {
    const [loading, setLoading] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoadingStats(true);
        try {
            const result = await getEstatisticasVagas();
            if (result.success) {
                setStats(result);
                setData(result); // Show table initially if data exists
            }
        } catch (err) {
            console.error('Erro ao carregar estatísticas', err);
        } finally {
            setLoadingStats(false);
        }
    };

    const handlePesquisarVagas = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await pesquisarVagas();
            if (result.success) {
                // Reload stats to get fresh data from sheets
                alert('Vagas pesquisadas e salvas com sucesso! A planilha foi atualizada.');
                await loadStats();
            } else {
                setError((result as any).message || 'Erro ao pesquisar vagas');
            }
        } catch (err) {
            setError('Erro de conexão ao pesquisar vagas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <DoorOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                    Vagas Disponíveis
                </h1>
                <p className="text-muted-foreground">
                    Consulta de vagas disponíveis na SED por escola e idade
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-indigo-600" />
                        Pesquisar Vagas na SED
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">
                        Pesquise vagas disponíveis em todas as escolas do município através da API SED.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            onClick={handlePesquisarVagas}
                            disabled={loading}
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Pesquisando...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Pesquisar Vagas
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={loadStats}
                            disabled={loadingStats}
                            variant="outline"
                            className="border-indigo-200 hover:bg-indigo-50 text-indigo-700"
                        >
                            {loadingStats ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Carregando...
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

            {stats && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-l-4 border-l-green-500">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <DoorOpen className="h-8 w-8 text-green-500" />
                                    <span className="text-3xl font-bold">{stats.total_vagas}</span>
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">Total de Vagas</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-blue-500">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <Users className="h-8 w-8 text-blue-500" />
                                    <span className="text-3xl font-bold">{stats.total_classes}</span>
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">Total de Classes</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-purple-500">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <School className="h-8 w-8 text-purple-500" />
                                    <span className="text-3xl font-bold">{Object.keys(stats.por_escola || {}).length}</span>
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">Total de Escolas</p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-indigo-500">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <CheckCircle className="h-8 w-8 text-indigo-500" />
                                    <span className="text-3xl font-bold">{Object.keys(stats.por_turno || {}).length}</span>
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">Turnos</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <School className="h-5 w-5 text-indigo-600" />
                                Detalhamento das Vagas
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
                                            <TableHead>Idade</TableHead>
                                            <TableHead>Capacidade</TableHead>
                                            <TableHead>Ocupadas</TableHead>
                                            <TableHead>Vagas</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats.dados && stats.dados.length > 0 ? (
                                            stats.dados.map((item: any, index: number) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{item.escola}</TableCell>
                                                    <TableCell>{item.serie}</TableCell>
                                                    <TableCell>{item.turno}</TableCell>
                                                    <TableCell>{item.idade} anos</TableCell>
                                                    <TableCell>{item.capacidade}</TableCell>
                                                    <TableCell>{item.ocupadas}</TableCell>
                                                    <TableCell className={`font-bold ${item.vagas > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {item.vagas}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
