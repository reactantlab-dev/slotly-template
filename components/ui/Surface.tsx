import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type Props = HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "article" | "li" };

/** Raised panel for grouped content. */
export function Surface({ as: Tag = "div", className, ...props }: Props) {
  return (
    <Tag
      className={cn("rounded-[var(--radius-panel)] bg-surface p-5 shadow-[var(--shadow-panel)] sm:p-6", className)}
      {...props}
    />
  );
}
