import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Termos de Serviço | Ritmo",
    description: "Termos e condições de utilização do Ritmo",
};

export default function TermosPage() {
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

                <h1 className="mb-8 text-3xl font-bold">Termos de Serviço</h1>

                <div className="prose prose-invert max-w-none space-y-6 text-[var(--color-muted-foreground)]">
                    <p>
                        <strong className="text-[var(--color-foreground)]">Última atualização:</strong> Janeiro 2026
                    </p>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            1. Aceitação dos termos
                        </h2>
                        <p>
                            Ao utilizar o Ritmo, aceita estes termos de serviço. Se não concordar,
                            não deve utilizar a plataforma.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            2. Descrição do serviço
                        </h2>
                        <p>
                            O Ritmo é uma plataforma de gestão de follow-up de orçamentos para PMEs.
                            Permite criar orçamentos, agendar lembretes automáticos, e acompanhar propostas.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            3. Conta e responsabilidades
                        </h2>
                        <p>
                            É responsável por manter a confidencialidade da sua conta e password.
                            Deve notificar-nos imediatamente de qualquer uso não autorizado.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            4. Planos e pagamentos
                        </h2>
                        <p>
                            Os planos pagos são cobrados mensalmente. Pode cancelar a qualquer momento,
                            mantendo acesso até ao fim do período pago.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            5. Uso aceitável
                        </h2>
                        <p>
                            Não pode usar o Ritmo para enviar spam, conteúdo ilegal, ou de forma que
                            prejudique outros utilizadores ou a infraestrutura do serviço.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            6. Limitação de responsabilidade
                        </h2>
                        <p>
                            O Ritmo é fornecido &quot;tal como está&quot;. Não garantimos disponibilidade
                            ininterrupta ou resultados específicos de negócio.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            7. Alterações aos termos
                        </h2>
                        <p>
                            Podemos atualizar estes termos. Notificaremos alterações significativas
                            por email ou na plataforma.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            8. Contacto
                        </h2>
                        <p>
                            Para questões sobre estes termos:{" "}
                            <a
                                href="mailto:geral@ritmo.app?subject=Termos"
                                className="text-[var(--color-primary)] hover:underline"
                            >
                                geral@ritmo.app
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
