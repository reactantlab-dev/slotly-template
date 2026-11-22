import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

export const inputClasses =
  "h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3.5 text-ink " +
  "placeholder:text-ink-muted/70 transition-shadow duration-150 " +
  "focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(inputClasses, className)} {...props} />;
}

export type FieldProps = InputProps & {
  label: string;
  hint?: ReactNode;
  error?: string;
};

/** Labelled input with hint and error text wired up for screen readers. */
export function Field({ label, hint, error, id, className, ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        {...props}
      />
      {hint && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
