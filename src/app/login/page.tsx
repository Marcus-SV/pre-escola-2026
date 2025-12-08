'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
            <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
                <CardHeader className="space-y-4 text-center pb-8">
                    <div className="flex justify-center">
                        <div className="p-4 rounded-full bg-primary/10 ring-8 ring-primary/5">
                            <ShieldCheck className="w-12 h-12 text-primary" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-3xl font-bold tracking-tight">
                            Bem-vindo
                        </CardTitle>
                        <CardDescription className="text-base">
                            Faça login para acessar o Sistema Pré-Escola
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Button
                        className="w-full h-12 text-base font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                        size="lg"
                        onClick={() => signIn('google', { callbackUrl: '/' })}
                    >
                        <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Entrar com Google
                    </Button>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 pt-6 border-t bg-muted/20">
                    <p className="text-xs text-center text-muted-foreground">
                        Sistema de Compatibilização Pré-Escola 2026
                        <br />
                        &copy; Secretaria de Educação
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
