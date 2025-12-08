'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { searchRaCascade } from '@/app/actions/ra-search';
import { Loader2, Search } from 'lucide-react';

export function RaSearchForm() {
    const [startLine, setStartLine] = useState('');
    const [endLine, setEndLine] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);

    const handleSearch = async () => {
        if (!startLine || !endLine) return;

        setLoading(true);
        setResults(null);

        try {
            const start = parseInt(startLine);
            const end = parseInt(endLine);

            const res = await searchRaCascade(start, end);
            setResults(res);
        } catch (error) {
            console.error(error);
            setResults({ success: false, message: 'Erro ao executar pesquisa' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Parâmetros de Pesquisa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startLine">Linha Inicial</Label>
                            <Input
                                id="startLine"
                                type="number"
                                placeholder="Ex: 2"
                                value={startLine}
                                onChange={(e) => setStartLine(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endLine">Linha Final</Label>
                            <Input
                                id="endLine"
                                type="number"
                                placeholder="Ex: 100"
                                value={endLine}
                                onChange={(e) => setEndLine(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleSearch}
                        disabled={loading || !startLine || !endLine}
                        className="w-full"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Pesquisar RA (Automático)
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                        Tenta localizar por Nome, depois por Mãe e por último por CPF.
                    </p>
                </CardContent>
            </Card>

            {results && (
                <Card>
                    <CardHeader>
                        <CardTitle>Resultados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p><strong>Status:</strong> {results.success ? 'Sucesso' : 'Erro'}</p>
                            {results.message && <p>{results.message}</p>}
                            {results.total !== undefined && (
                                <>
                                    <p><strong>Total Processado:</strong> {results.total}</p>
                                    <p><strong>Encontrados:</strong> {results.found}</p>
                                </>
                            )}
                        </div>

                        {results.details && (
                            <div className="mt-4 max-h-60 overflow-y-auto border rounded-md p-2">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b">
                                            <th className="p-2">Linha</th>
                                            <th className="p-2">Nome</th>
                                            <th className="p-2">RA</th>
                                            <th className="p-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.details.map((item: any, i: number) => (
                                            <tr key={i} className="border-b last:border-0">
                                                <td className="p-2">{item.line}</td>
                                                <td className="p-2">{item.nome}</td>
                                                <td className="p-2 font-mono">{item.ra || '-'}</td>
                                                <td className={`p-2 ${item.ra ? 'text-green-600' : 'text-red-500'}`}>
                                                    {item.status}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
