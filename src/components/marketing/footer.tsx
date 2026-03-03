import Link from "next/link";

/**
 * Footer reutilizável para páginas de marketing.
 * Links: Privacidade | Termos | Cookies | LinkedIn | Contacto
 */
export function Footer() {
  return (
    <footer className="border-t border-zinc-100 bg-white py-12 text-center text-sm text-zinc-500">
      <div className="container mx-auto">
        <p>© 2026 Ritmo. Todos os direitos reservados.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-6 sm:gap-8">
          <Link href="/privacidade" className="transition-colors hover:text-black">
            Privacidade
          </Link>
          <Link href="/termos" className="transition-colors hover:text-black">
            Termos
          </Link>
          <Link href="/partners" className="transition-colors hover:text-black">
            Parceiros
          </Link>
          <Link href="/cookies" className="transition-colors hover:text-black">
            Cookies
          </Link>
          <a href="#" className="termly-display-preferences transition-colors hover:text-black">
            Preferências de Consentimento
          </a>
          <a
            href="https://linkedin.com/company/ritmo"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-black"
          >
            LinkedIn
          </a>
          <a href="mailto:ritmo@useritmo.pt" className="transition-colors hover:text-black">
            Contacto
          </a>
        </div>
      </div>
    </footer>
  );
}
