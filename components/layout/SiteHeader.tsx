import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/services" className="font-display text-2xl font-semibold tracking-tight text-ink">
          Slotly<span className="text-accent">.</span>
        </Link>
        <ul className="flex items-center gap-5 text-sm font-medium">
          <li>
            <Link href="/services" className="text-ink-muted transition-colors hover:text-ink">
              Services
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
