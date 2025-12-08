'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { runCompatibilizacao, saveCompatibilizacaoToMain } from '@/app/actions/compatibilizacao';
import { Loader2, Settings, Save } from 'lucide-react';

export default function CompatibilizacaoPage() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleCompatibilizacao = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await runCompatibilizacao();
            setResult(res);
        } catch (error) {
            console.error(error);
            setResult({ success: false, message: 'Erro ao executar compatibilização' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveToMain = async () => {
        if (!result || !result.resultados) return;
        setSaving(true);
        try {
            const saveRes = await saveCompatibilizacaoToMain(result.resultados);
            if (saveRes.success) {
                alert(`Sucesso: ${saveRes.message}`);
            } else {
                alert(`Erro ao salvar: ${saveRes.message}`);
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar na aba principal');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">Compatibilização</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Executar Compatibilização</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-muted-foreground">
                        Esta ação irá:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Ler a classificação dos alunos (Aba 8)</li>
                            <li>Ler as vagas disponíveis (Aba 4)</li>
                            <li>Alocar alunos nas vagas conforme prioridade e turno</li>
                            <li>Salvar o resultado na <strong>Aba 3</strong> (para conferência)</li>
                        </ul>
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                            <strong>Atenção:</strong> A atualização da situação dos alunos na <strong>Aba Principal</strong> agora deve ser feita manualmente após conferir os resultados abaixo.
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={handleCompatibilizacao}
                            disabled={loading}
                            className="w-full sm:w-auto"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                            Executar Compatibilização
                        </Button>

                        <Button
                            onClick={handleSaveToMain}
                            disabled={saving || !result || !result.success}
                            variant="secondary"
                            className="w-full sm:w-auto"
                        >
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar na Aba Principal
                        </Button>
                    </div>
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
                            {result.details && (
                                <div className="mt-2 text-sm">
                                    <p><strong>Salvar Aba 3:</strong> {result.details.save_sheet_2}</p>
                                    {result.details.stats && (
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            <div className="bg-white/50 p-2 rounded">
                                                <span className="block text-xs font-bold">Atendidos</span>
                                                <span className="text-lg">{result.details.stats.atendidos}</span>
                                            </div>
                                            <div className="bg-white/50 p-2 rounded">
                                                <span className="block text-xs font-bold">Não Atendidos</span>
                                                <span className="text-lg">{result.details.stats.nao_atendidos}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {result.resultados && (
                            <div className="border rounded-md overflow-hidden">
                                <div className="max-h-[500px] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted sticky top-0">
                                            <tr className="text-left">
                                                <th className="p-2">Nome</th>
                                                <th className="p-2">Idade</th>
                                                <th className="p-2">Atendido</th>
                                                <th className="p-2">Escola Destino</th>
                                                <th className="p-2">Motivo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.resultados.slice(0, 100).map((item: any, i: number) => (
                                                <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                                                    <td className="p-2 font-medium">{item.nome}</td>
                                                    <td className="p-2">{item.idade}</td>
                                                    <td className={`p-2 font-bold ${item.atendido === 'SIM' ? 'text-green-600' : 'text-red-500'}`}>
                                                        {item.atendido}
                                                    </td>
                                                    <td className="p-2">{item.escola_destino || '-'}</td>
                                                    <td className="p-2 text-xs text-muted-foreground max-w-[200px] truncate" title={item.motivo}>
                                                        {item.motivo}
                                                    </td>
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
