import { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
    title: "Política de Cookies - Ritmo",
    description: "Informação sobre os cookies utilizados no Ritmo",
};

export default function CookiesPage() {
    return (
        <div className="flex min-h-screen flex-col bg-white">
            {/* Header */}
            <header className="border-b border-zinc-100">
                <div className="container mx-auto flex h-14 items-center justify-between px-6">
                    <Link href="/" className="text-xl font-bold text-black">
                        Ritmo
                    </Link>
                    <Link
                        href="/login"
                        className="text-sm text-zinc-500 hover:text-black transition-colors"
                    >
                        Entrar
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 py-16 px-6">
                <div className="container mx-auto max-w-3xl">
                    <h1 className="text-3xl font-bold text-zinc-900 mb-8">Política de Cookies</h1>

                    <div className="prose prose-zinc max-w-none space-y-8">
                        {/* O que são cookies */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
                                O que são cookies?
                            </h2>
                            <p className="text-zinc-600 leading-relaxed">
                                Cookies são pequenos ficheiros de texto que são armazenados no seu
                                dispositivo quando visita um website. São amplamente utilizados para
                                fazer os websites funcionarem de forma mais eficiente, bem como para
                                fornecer informações aos proprietários do site.
                            </p>
                        </section>

                        {/* Que cookies usamos */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
                                Que cookies utilizamos?
                            </h2>
                            <p className="text-zinc-600 leading-relaxed mb-4">
                                O Ritmo utiliza <strong>apenas cookies estritamente necessários</strong> para
                                o funcionamento da aplicação. Estes cookies são essenciais para:
                            </p>
                            <ul className="list-disc pl-6 text-zinc-600 space-y-2">
                                <li>
                                    <strong>Autenticação e sessão:</strong> Manter a sua sessão ativa
                                    enquanto navega na aplicação, permitindo que permaneça autenticado.
                                </li>
                                <li>
                                    <strong>Segurança:</strong> Proteção contra ataques CSRF (Cross-Site
                                    Request Forgery) e outras vulnerabilidades de segurança.
                                </li>
                                <li>
                                    <strong>Preferências funcionais:</strong> Armazenar preferências
                                    essenciais como o tema da interface (claro/escuro).
                                </li>
                            </ul>

                            <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                <h3 className="font-medium text-zinc-900 mb-2">
                                    Exemplos de cookies utilizados:
                                </h3>
                                <ul className="text-sm text-zinc-600 space-y-1">
                                    <li>
                                        <code className="bg-zinc-200 px-1 rounded">authjs.session-token</code> —
                                        Token de sessão para autenticação
                                    </li>
                                    <li>
                                        <code className="bg-zinc-200 px-1 rounded">authjs.csrf-token</code> —
                                        Proteção contra ataques CSRF
                                    </li>
                                    <li>
                                        <code className="bg-zinc-200 px-1 rounded">authjs.callback-url</code> —
                                        URL de redirecionamento após login
                                    </li>
                                    <li>
                                        <code className="bg-zinc-200 px-1 rounded">ritmo_ref</code> —
                                        Código de referência de parceiro (se aplicável)
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* Cookies de terceiros */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
                                Cookies de terceiros
                            </h2>
                            <p className="text-zinc-600 leading-relaxed">
                                Atualmente, <strong>não utilizamos cookies de marketing, analytics ou
                                publicidade de terceiros</strong>. Não partilhamos dados com plataformas
                                de publicidade nem utilizamos ferramentas de tracking como Google Analytics,
                                Meta Pixel, ou similares.
                            </p>
                            <p className="text-zinc-500 text-sm mt-2 italic">
                                Esta política pode ser atualizada se no futuro adicionarmos ferramentas
                                de analytics ou marketing. Quaisquer alterações serão refletidas nesta página.
                            </p>
                        </section>

                        {/* Como gerir cookies */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 mb-3">
                                Como gerir cookies no browser?
                            </h2>
                            <p className="text-zinc-600 leading-relaxed mb-4">
                                Pode gerir ou eliminar cookies através das definições do seu navegador.
                                No entanto, se bloquear os cookies essenciais, algumas funcionalidades
                                do Ritmo podem não funcionar corretamente (por exemplo, não conseguirá
                                manter a sessão iniciada).
                            </p>
                            <p className="text-zinc-600 leading-relaxed">
                                Para mais informações sobre como gerir cookies, consulte a documentação
                                do seu navegador:
                            </p>
                            <ul className="list-disc pl-6 text-zinc-600 space-y-1 mt-2">
                                <li>
                                    <a
                                        href="https://support.google.com/chrome/answer/95647"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        Google Chrome
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://support.mozilla.org/pt-PT/kb/cookies-informacao-que-os-sites-guardam-no-seu-com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        Mozilla Firefox
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://support.apple.com/pt-pt/guide/safari/sfri11471/mac"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        Safari
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://support.microsoft.com/pt-pt/microsoft-edge/eliminar-cookies-no-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        Microsoft Edge
                                    </a>
                                </li>
                            </ul>
                        </section>

                        {/* Contacto */}
                        <section>
                            <h2 className="text-xl font-semibold text-zinc-900 mb-3">Contacto</h2>
                            <p className="text-zinc-600 leading-relaxed">
                                Se tiver dúvidas sobre a nossa utilização de cookies, pode contactar-nos
                                através de{" "}
                                <a
                                    href="mailto:ritmo@useritmo.pt"
                                    className="text-blue-600 hover:underline"
                                >
                                    ritmo@useritmo.pt
                                </a>
                                .
                            </p>
                        </section>

                        {/* Última atualização */}
                        <p className="text-sm text-zinc-400 pt-8 border-t border-zinc-100">
                            Última atualização: Janeiro de 2026
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
