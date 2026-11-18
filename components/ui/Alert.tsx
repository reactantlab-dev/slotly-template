import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "info" | "success" | "error";

const tones: Record<Tone, string> = {
  info: "border-line bg-surface text-ink",
  success: "border-success/30 bg-success-soft text-success",
  error: "border-danger/30 bg-danger-soft text-danger",
};

export type AlertProps = { tone?: Tone; title?: string; children: ReactNode; className?: string };

/** Inline message. Errors use role="alert" so screen readers announce them. */
export function Alert({ tone = "info", title, children, className }: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-[var(--radius-control)] border px-4 py-3 text-sm", tones[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-0.5" : undefined}>{children}</div>
    </div>
  );
}
