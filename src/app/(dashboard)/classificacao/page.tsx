'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { runClassification } from '@/app/actions/classification';
import { Loader2, FileSpreadsheet } from 'lucide-react';

export default function ClassificacaoPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleClassification = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await runClassification();
            setResult(res);
        } catch (error) {
            console.error(error);
            setResult({ success: false, message: 'Erro ao executar classificação' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">Classificação</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Executar Classificação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        Esta ação irá processar todos os alunos da planilha, aplicar as regras de prioridade e gerar a lista classificada por escola na <strong>Aba 8</strong>.
                    </p>

                    <Button
                        onClick={handleClassification}
                        disabled={loading}
                        className="w-full sm:w-auto"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                        Executar Classificação Geral
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
                            <p className="font-medium">{result.success ? 'Sucesso!' : 'Erro'}</p>
                            <p>{result.message}</p>
                            {result.total && <p className="mt-2">Total de registros gerados: {result.total}</p>}
                        </div>

                        {result.resultados && (
                            <div className="border rounded-md overflow-hidden">
                                <div className="max-h-[500px] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted sticky top-0">
                                            <tr className="text-left">
                                                <th className="p-2">Escola</th>
                                                <th className="p-2">Idade</th>
                                                <th className="p-2">Classificação</th>
                                                <th className="p-2">Nome</th>
                                                <th className="p-2">Prioridade</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.resultados.slice(0, 100).map((item: any, i: number) => (
                                                <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                                                    <td className="p-2 font-medium">{item.escola}</td>
                                                    <td className="p-2">{item.idade}</td>
                                                    <td className="p-2 text-center font-bold">{item.ordem_classificacao}º</td>
                                                    <td className="p-2">{item.nome}</td>
                                                    <td className="p-2">{item.prioridade}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {result.resultados.length > 100 && (
                                    <div className="p-2 text-center text-xs text-muted-foreground bg-muted/20">
                                        Exibindo os primeiros 100 registros de {result.resultados.length}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
