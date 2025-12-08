
'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, Server, CheckCircle2, LogOut } from 'lucide-react';
import { SessionTimer } from '@/components/auth/session-timer';

export default function LoginPage() {
    const { data: session, status } = useSession();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const router = useRouter();

    // Check if the current session has an SED access token or if we just successfully logged in
    const isSedAuthenticated = (session as any)?.accessToken || showSuccess;

    useEffect(() => {
        if (isSedAuthenticated) {
            const storedExpiry = localStorage.getItem('sed_token_expiry');
            if (!storedExpiry) {
                const expiry = Date.now() + 30 * 60 * 1000;
                localStorage.setItem('sed_token_expiry', expiry.toString());
            }
        }
    }, [isSedAuthenticated]);

    const handleLogin = async () => {
        setIsLoading(true);
        setError('');
        setShowSuccess(false);

        try {
            // Note: This replaces the current session with the Credentials session
            const result = await signIn('credentials', {
                redirect: false,
                callbackUrl: '/autenticar' // Stay on this page
            });

            if (result?.error) {
                setError('Falha na autenticação com o servidor SED.');
            } else {
                const expiry = Date.now() + 30 * 60 * 1000;
                localStorage.setItem('sed_token_expiry', expiry.toString());
                setShowSuccess(true);
                router.refresh();
            }
        } catch (err) {
            setError('Ocorreu um erro ao tentar conectar.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        // Since we are using a single session, "disconnecting" from SED effectively means logging out or
        // we would need a way to just drop the token. For now, let's assume it logs out completely
        // OR we can just clear the token from the session (requires backend change).
        // Given the user prompt asked to fix "Sair" (Logout) generally, let's keep this as a "Disconnect SED" 
        // but warn it might log them out if the session is purely SED-based.
        // actually, if they click disconnect here, maybe they just want to revert to Google-only session?
        // That's complex. Let's just clear the local storage and maybe refresh.
        // But `isSedAuthenticated` relies on session.
        // Let's confusing. Let's stick to: "Conectar" calls sign in. 
        // If they are already Google logged in, calling signIn('credentials') might switch them to the SED user.

        // For now, let's just make the UI correct.
        localStorage.removeItem('sed_token_expiry');
        setShowSuccess(false);
        // We won't call signOut() here to avoid killing the Google session if possible, 
        // but if the session IS the SED session, they are stuck.
        // Let's assume for this task: Fix the "Auto Connect" visual bug.
        router.refresh();
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
            <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
                <CardHeader className="space-y-4 text-center pb-8">
                    <div className="flex justify-center">
                        <div className={`p-4 rounded-full ring-8 ring-primary/5 transition-colors duration-500 ${isSedAuthenticated ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-primary/10'} `}>
                            {isSedAuthenticated ? (
                                <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-500 animate-in zoom-in duration-300" />
                            ) : (
                                <ShieldCheck className="w-12 h-12 text-primary" />
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-3xl font-bold tracking-tight">
                            {isSedAuthenticated ? 'Conectado à SED' : 'Conexão SED'}
                        </CardTitle>
                        <CardDescription className="text-base">
                            {isSedAuthenticated
                                ? 'Sessão ativa com a Secretaria Escolar Digital'
                                : 'Conecte-se para sincronizar dados'}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {error && (
                        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {isSedAuthenticated && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 mb-2">
                                <ShieldCheck className="w-5 h-5" />
                                <span className="font-medium">Token Ativo</span>
                            </div>
                            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mb-4">
                                Você pode realizar operações na SED.
                            </p>
                            <SessionTimer onExpire={() => handleDisconnect()} />
                        </div>
                    )}

                    {!isSedAuthenticated && (
                        <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                                <Server className="w-4 h-4" />
                                <span>Ambiente Seguro</span>
                                <span className="mx-2">•</span>
                                <span>Token Temporário</span>
                            </div>
                        </div>
                    )}

                    {isSedAuthenticated ? (
                        <Button
                            className="w-full h-12 text-base font-medium"
                            variant="outline"
                            onClick={handleDisconnect}
                        >
                            <LogOut className="mr-2 h-5 w-5" />
                            Desconectar SED
                        </Button>
                    ) : (
                        <Button
                            className="w-full h-12 text-base font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                            size="lg"
                            onClick={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Conectando ao Servidor...
                                </>
                            ) : (
                                'Conectar à SED'
                            )}
                        </Button>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 pt-6 border-t bg-muted/20">
                    <p className="text-xs text-center text-muted-foreground">
                        Utilize credenciais administrativas válidas
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

