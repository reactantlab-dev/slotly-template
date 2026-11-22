import type { ReactNode } from "react";

export type PageHeaderProps = { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode };

/** Page title block. Renders the page's single <h1>. */
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-xl">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>}
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 text-ink-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}
