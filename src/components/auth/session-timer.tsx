'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SessionTimerProps {
    onExpire?: () => void;
}

export function SessionTimer({ onExpire }: SessionTimerProps) {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        // Check for existing session
        const storedExpiry = localStorage.getItem('sed_token_expiry');

        if (storedExpiry) {
            const expiry = parseInt(storedExpiry, 10);
            const now = Date.now();

            if (expiry > now) {
                setTimeLeft(Math.floor((expiry - now) / 1000));
            } else {
                localStorage.removeItem('sed_token_expiry');
                setTimeLeft(0);
                if (onExpire) onExpire();
            }
        }
    }, [onExpire]);

    useEffect(() => {
        if (timeLeft === null) return;

        if (timeLeft <= 0) {
            localStorage.removeItem('sed_token_expiry');
            if (onExpire) onExpire();
            return;
        }

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null || prev <= 0) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timeLeft, onExpire]);

    useEffect(() => {
        if (timeLeft !== null) {
            // 30 minutes = 1800 seconds
            const totalSeconds = 30 * 60;
            const currentProgress = (timeLeft / totalSeconds) * 100;
            setProgress(currentProgress);
        }
    }, [timeLeft]);

    if (timeLeft === null) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const isLowTime = timeLeft < 300; // Less than 5 minutes

    return (
        <div className="w-full space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                    {isLowTime ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
                    ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={`font-medium ${isLowTime ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                        Sessão Ativa
                    </span>
                </div>
                <span className={`font-mono font-bold ${isLowTime ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`}>
                    {formattedTime}
                </span>
            </div>
            <Progress value={progress} className={`h-2 ${isLowTime ? '[&>div]:bg-amber-500' : ''}`} />
        </div>
    );
}
