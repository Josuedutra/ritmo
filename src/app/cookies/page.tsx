import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Política de Cookies | Ritmo",
    description: "Informação sobre os cookies utilizados no Ritmo",
};

export default function CookiesPage() {
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

                <h1 className="mb-2 text-3xl font-bold">Política de Cookies</h1>
                <p className="mb-8 text-[var(--color-muted-foreground)]">
                    <strong className="text-[var(--color-foreground)]">Última atualização:</strong> Janeiro 2026
                </p>

                <div className="prose prose-invert max-w-none space-y-8 text-[var(--color-muted-foreground)]">
                    {/* O que são cookies */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            1. O que são cookies?
                        </h2>
                        <p>
                            Cookies são pequenos ficheiros de texto que são armazenados no seu
                            dispositivo quando visita um website. São amplamente utilizados para
                            fazer os websites funcionarem de forma mais eficiente, bem como para
                            fornecer informações aos proprietários do site.
                        </p>
                    </section>

                    {/* Que cookies usamos */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            2. Que cookies utilizamos?
                        </h2>
                        <p className="mb-3">
                            O Ritmo utiliza <strong className="text-[var(--color-foreground)]">apenas cookies estritamente necessários</strong> para
                            o funcionamento da aplicação. Estes cookies são essenciais para:
                        </p>
                        <ul className="mb-3 list-disc space-y-1 pl-6">
                            <li>
                                <strong className="text-[var(--color-foreground)]">Autenticação e sessão:</strong> Manter a sua sessão ativa
                                enquanto navega na aplicação, permitindo que permaneça autenticado.
                            </li>
                            <li>
                                <strong className="text-[var(--color-foreground)]">Segurança:</strong> Proteção contra ataques CSRF (Cross-Site
                                Request Forgery) e outras vulnerabilidades de segurança.
                            </li>
                            <li>
                                <strong className="text-[var(--color-foreground)]">Preferências funcionais:</strong> Armazenar preferências
                                essenciais como o tema da interface (claro/escuro).
                            </li>
                        </ul>

                        <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-6">
                            <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
                                Cookies utilizados:
                            </h3>
                            <ul className="space-y-2 text-sm">
                                <li>
                                    <code className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-[var(--color-foreground)]">authjs.session-token</code>
                                    <span className="ml-2">— Token de sessão para autenticação</span>
                                </li>
                                <li>
                                    <code className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-[var(--color-foreground)]">authjs.csrf-token</code>
                                    <span className="ml-2">— Proteção contra ataques CSRF</span>
                                </li>
                                <li>
                                    <code className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-[var(--color-foreground)]">authjs.callback-url</code>
                                    <span className="ml-2">— URL de redirecionamento após login</span>
                                </li>
                                <li>
                                    <code className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-[var(--color-foreground)]">ritmo_ref</code>
                                    <span className="ml-2">— Código de referência de parceiro (se aplicável)</span>
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Cookies de terceiros */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            3. Cookies de terceiros
                        </h2>
                        <p className="mb-3">
                            Atualmente, <strong className="text-[var(--color-foreground)]">não utilizamos cookies de marketing, analytics ou
                            publicidade de terceiros</strong>. Não partilhamos dados com plataformas
                            de publicidade nem utilizamos ferramentas de tracking como Google Analytics,
                            Meta Pixel, ou similares.
                        </p>
                        <p className="text-sm italic">
                            Esta política pode ser atualizada se no futuro adicionarmos ferramentas
                            de analytics ou marketing. Quaisquer alterações serão refletidas nesta página.
                        </p>
                    </section>

                    {/* Como gerir cookies */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            4. Como gerir cookies no browser?
                        </h2>
                        <p className="mb-3">
                            Pode gerir ou eliminar cookies através das definições do seu navegador.
                            No entanto, se bloquear os cookies essenciais, algumas funcionalidades
                            do Ritmo podem não funcionar corretamente (por exemplo, não conseguirá
                            manter a sessão iniciada).
                        </p>
                        <p className="mb-3">
                            Para mais informações sobre como gerir cookies, consulte a documentação
                            do seu navegador:
                        </p>
                        <ul className="list-disc space-y-1 pl-6">
                            <li>
                                <a
                                    href="https://support.google.com/chrome/answer/95647"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--color-primary)] hover:underline"
                                >
                                    Google Chrome
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://support.mozilla.org/pt-PT/kb/cookies-informacao-que-os-sites-guardam-no-seu-com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--color-primary)] hover:underline"
                                >
                                    Mozilla Firefox
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://support.apple.com/pt-pt/guide/safari/sfri11471/mac"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--color-primary)] hover:underline"
                                >
                                    Safari
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://support.microsoft.com/pt-pt/microsoft-edge/eliminar-cookies-no-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--color-primary)] hover:underline"
                                >
                                    Microsoft Edge
                                </a>
                            </li>
                        </ul>
                    </section>

                    {/* Contacto */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                            5. Contacto
                        </h2>
                        <p>
                            Se tiver dúvidas sobre a nossa utilização de cookies, pode contactar-nos
                            através de{" "}
                            <a
                                href="mailto:privacidade@useritmo.pt"
                                className="text-[var(--color-primary)] hover:underline"
                            >
                                privacidade@useritmo.pt
                            </a>
                            .
                        </p>
                    </section>

                    {/* Links relacionados */}
                    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-6">
                        <h2 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
                            Documentos Relacionados
                        </h2>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/privacidade" className="text-[var(--color-primary)] hover:underline">
                                    Política de Privacidade
                                </Link>
                            </li>
                            <li>
                                <Link href="/termos" className="text-[var(--color-primary)] hover:underline">
                                    Termos e Condições
                                </Link>
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
