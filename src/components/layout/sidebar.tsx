'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';
import {
    LayoutDashboard,
    Search,
    Users,
    FileSpreadsheet,
    AlertTriangle,
    Settings,
    LogOut,
    Menu,
    LogIn,
    Clock,
    DoorOpen,
    Map,
    MapPin,
    UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const menuItems = [
    {
        title: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
    },
    {
        title: 'Autenticar',
        href: '/autenticar',
        icon: LogIn,
    },
    {
        title: 'Pesquisar RA',
        href: '/pesquisar-ra',
        icon: Search,
    },
    {
        title: 'Pesquisar Matrículas',
        href: '/pesquisar-matriculas',
        icon: Users,
    },

    {
        title: 'Inconsistências',
        href: '/inconsistencias',
        icon: AlertTriangle,
    },
    {
        title: 'Classificação',
        href: '/classificacao',
        icon: FileSpreadsheet,
    },
    {
        title: 'Pendentes',
        href: '/pendentes',
        icon: Clock,
    },
    {
        title: 'Vagas',
        href: '/vagas',
        icon: DoorOpen,
    },
    {
        title: 'Mapeamento',
        href: '/mapeamento',
        icon: Map,
    },
    {
        title: 'Compatibilização',
        href: '/compatibilizacao',
        icon: Settings,
    },
    {
        title: 'Inscrições Incompatíveis',
        href: '/incompativel',
        icon: UserX,
    },

];

export function Sidebar() {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile Trigger */}
            <Button
                variant="ghost"
                size="icon"
                className="md:hidden fixed top-4 left-4 z-50"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                <Menu className="h-6 w-6" />
            </Button>

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-40 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out md:translate-x-0',
                    isMobileOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex flex-col h-full">
                    <div className="h-16 flex items-center px-6 border-b">
                        <h1 className="text-xl font-bold text-primary">Pré-Escola</h1>
                    </div>

                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
                                        isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                >
                                    <Icon className="mr-3 h-5 w-5" />
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 font-medium"
                            onClick={async () => await signOut({ callbackUrl: '/login' })}
                        >
                            <LogOut className="mr-3 h-5 w-5" />
                            Sair
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
}
