'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { runInconsistencias } from '@/app/actions/inconsistencias';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

export default function InconsistenciasPage() {
    const [loading, setLoading] = useState(false);
    const [linhaInicial, setLinhaInicial] = useState('2');
    const [linhaFinal, setLinhaFinal] = useState('2000');
    const [result, setResult] = useState<any>(null);

    const handleVerificar = async () => {
        setLoading(true);
        setResult(null);
        try {
            const start = parseInt(linhaInicial);
            const end = parseInt(linhaFinal);

            if (isNaN(start) || isNaN(end) || start < 2 || end < start) {
                alert('Intervalo de linhas inválido');
                setLoading(false);
                return;
            }

            const res = await runInconsistencias(start, end);
            setResult(res);
        } catch (error) {
            console.error(error);
            setResult({ success: false, message: 'Erro ao verificar inconsistências' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">Inconsistências</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Verificar e Corrigir Inconsistências</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        Esta ferramenta verifica erros de cadastro na <strong>Aba Principal</strong> e aplica correções automáticas.
                    </p>

                    <div className="grid grid-cols-2 gap-4 max-w-sm">
                        <div className="space-y-2">
                            <Label htmlFor="start">Linha Inicial</Label>
                            <Input
                                id="start"
                                type="number"
                                value={linhaInicial}
                                onChange={(e) => setLinhaInicial(e.target.value)}
                                min="2"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end">Linha Final</Label>
                            <Input
                                id="end"
                                type="number"
                                value={linhaFinal}
                                onChange={(e) => setLinhaFinal(e.target.value)}
                                min="2"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleVerificar}
                        disabled={loading}
                        className="w-full sm:w-auto"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                        Verificar e Corrigir
                    </Button>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Resultados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`p-4 rounded-md mb-4 ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            <p className="font-medium">{result.success ? 'Concluído!' : 'Erro'}</p>
                            <p>{result.message}</p>
                            {result.success && (
                                <div className="mt-2 text-sm grid grid-cols-3 gap-4">
                                    <div>
                                        <span className="block font-bold">Verificados</span>
                                        <span>{result.total_verificado} linhas</span>
                                    </div>
                                    <div>
                                        <span className="block font-bold">Encontrados</span>
                                        <span className="text-amber-600">{result.total_inconsistencias} erros</span>
                                    </div>
                                    <div>
                                        <span className="block font-bold">Corrigidos</span>
                                        <span className="text-green-600">{result.corrigidas} correções</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {result.inconsistencias && result.inconsistencias.length > 0 && (
                            <div className="border rounded-md overflow-hidden">
                                <div className="max-h-[500px] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted sticky top-0">
                                            <tr className="text-left">
                                                <th className="p-2">Linha</th>
                                                <th className="p-2">Tipo</th>
                                                <th className="p-2">Escola Anterior</th>
                                                <th className="p-2">Correção Aplicada</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.inconsistencias.map((item: any, i: number) => (
                                                <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                                                    <td className="p-2 font-bold">{item.linha}</td>
                                                    <td className="p-2 text-xs text-muted-foreground">{item.tipo}</td>
                                                    <td className="p-2 text-red-500 line-through">{item.escola_anterior}</td>
                                                    <td className="p-2 text-green-600 font-medium flex items-center">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        {item.correcao}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {result.success && result.total_inconsistencias === 0 && (
                            <div className="text-center p-8 text-muted-foreground">
                                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                                <p>Nenhuma inconsistência encontrada no intervalo.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
