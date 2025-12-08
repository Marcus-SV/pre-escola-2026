import { RaSearchForm } from '@/components/features/ra-search-form';

export default function PesquisarRaPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Pesquisar RA</h1>
                <p className="text-muted-foreground">
                    Pesquise RAs na SED e atualize a planilha automaticamente.
                </p>
            </div>

            <RaSearchForm />
        </div>
    );
}
