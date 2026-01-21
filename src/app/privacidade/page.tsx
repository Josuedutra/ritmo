import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Política de Privacidade | Ritmo",
    description: "Política de privacidade do Ritmo",
};

export default function PrivacidadePage() {
    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <div className="container-app py-16">
                <Link
                    href="/"
                    className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar à página inicial
                </Link>

                <h1 className="mb-8 text-3xl font-bold">Política de Privacidade</h1>

                <div className="prose prose-invert max-w-none space-y-6 text-[var(--color-muted-foreground)]">
                    <p>
                        <strong className="text-[var(--color-foreground)]">Última atualização:</strong> Janeiro 2026
                    </p>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            1. Dados que recolhemos
                        </h2>
                        <p>
                            Recolhemos apenas os dados necessários para prestar o serviço: nome, email,
                            informação da empresa, e dados de orçamentos que introduz na plataforma.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            2. Como usamos os dados
                        </h2>
                        <p>
                            Os seus dados são usados exclusivamente para operar o serviço Ritmo:
                            gestão de orçamentos, envio de follow-ups, e comunicações relacionadas com a sua conta.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            3. Partilha de dados
                        </h2>
                        <p>
                            Não vendemos nem partilhamos os seus dados com terceiros para fins de marketing.
                            Podemos partilhar dados com prestadores de serviços essenciais (hosting, email)
                            sob acordos de confidencialidade.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            4. Segurança
                        </h2>
                        <p>
                            Utilizamos encriptação e boas práticas de segurança para proteger os seus dados.
                            O acesso é restrito a pessoal autorizado.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            5. Os seus direitos
                        </h2>
                        <p>
                            Pode aceder, corrigir ou eliminar os seus dados a qualquer momento.
                            Contacte-nos em{" "}
                            <a
                                href="mailto:geral@useritmo.pt"
                                className="text-[var(--color-primary)] hover:underline"
                            >
                                geral@useritmo.pt
                            </a>
                            .
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            6. Contacto
                        </h2>
                        <p>
                            Para questões sobre privacidade:{" "}
                            <a
                                href="mailto:geral@useritmo.pt?subject=Privacidade"
                                className="text-[var(--color-primary)] hover:underline"
                            >
                                geral@useritmo.pt
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
