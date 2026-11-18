import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "accent" | "success" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-muted ring-line",
  accent: "bg-accent-soft text-accent-strong ring-accent/20",
  success: "bg-success-soft text-success ring-success/20",
  danger: "bg-danger-soft text-danger ring-danger/20",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone])}>
      {children}
    </span>
  );
}
