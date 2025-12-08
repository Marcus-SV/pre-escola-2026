'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { searchMatriculasInterval } from '@/app/actions/matricula-search';
import { Loader2 } from 'lucide-react';

export function MatriculaSearchForm() {
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

            const res = await searchMatriculasInterval(start, end);
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
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Pesquisar Matrículas
                    </Button>
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
                                            <th className="p-2">RA</th>
                                            <th className="p-2">Escola</th>
                                            <th className="p-2">Município</th>
                                            <th className="p-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.details.map((item: any, i: number) => (
                                            <tr key={i} className="border-b last:border-0">
                                                <td className="p-2">{item.line}</td>
                                                <td className="p-2 font-mono">{item.ra}</td>
                                                <td className="p-2">{item.escola || '-'}</td>
                                                <td className="p-2">{item.municipio}</td>
                                                <td className={`p-2 ${item.escola ? 'text-green-600' : 'text-yellow-600'}`}>
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
