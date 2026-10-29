import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto mt-4 hidden w-full max-w-[1440px] flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-6 text-[12.5px] text-ink-4 sm:px-8 lg:flex lg:px-12">
      <p>© 2026 Athenaeum · Club Noctua · Ajedrez gratuito</p>
      <nav className="flex gap-6">
        <Link href="/legal?id=about" className="hover:text-ink-2">Acerca de</Link>
        <Link href="/legal?id=terms" className="hover:text-ink-2">Términos</Link>
        <Link href="/legal?id=privacy" className="hover:text-ink-2">Privacidad</Link>
        <a href="mailto:hola@athenaeum.club" className="hover:text-ink-2">Contacto</a>
      </nav>
    </footer>
  );
}
