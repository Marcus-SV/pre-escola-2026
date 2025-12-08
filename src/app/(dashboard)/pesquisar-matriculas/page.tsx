import { MatriculaSearchForm } from '@/components/features/matricula-search-form';

export default function PesquisarMatriculasPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Pesquisar Matrículas</h1>
                <p className="text-muted-foreground">
                    Verifique a situação de matrícula dos alunos na SED.
                </p>
            </div>

            <MatriculaSearchForm />
        </div>
    );
}
