import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 p-6 md:ml-64 bg-muted/10">
                    {children}
                </main>
            </div>
        </div>
    );
}
