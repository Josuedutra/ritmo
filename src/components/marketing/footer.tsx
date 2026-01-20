import Link from "next/link";

/**
 * Footer reutilizável para páginas de marketing.
 * Links: Privacidade | Termos | Cookies | LinkedIn | Contacto
 */
export function Footer() {
    return (
        <footer className="py-12 bg-white border-t border-zinc-100 text-center text-sm text-zinc-500">
            <div className="container mx-auto">
                <p>© 2026 Ritmo. Todos os direitos reservados.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-6 sm:gap-8">
                    <Link href="/privacidade" className="hover:text-black transition-colors">
                        Privacidade
                    </Link>
                    <Link href="/termos" className="hover:text-black transition-colors">
                        Termos
                    </Link>
                    <Link href="/cookies" className="hover:text-black transition-colors">
                        Cookies
                    </Link>
                    <a
                        href="https://linkedin.com/company/ritmo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-black transition-colors"
                    >
                        LinkedIn
                    </a>
                    <a href="mailto:ola@ritmo.app" className="hover:text-black transition-colors">
                        Contacto
                    </a>
                </div>
            </div>
        </footer>
    );
}
