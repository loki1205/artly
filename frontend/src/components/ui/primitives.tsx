import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "ghost" | "glass" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

// Flat, quiet, hairline-based. Colour appears only on the primary action.
const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary/90 active:bg-primary/85",
  outline: "border border-line/20 text-fg hover:bg-fg/[0.04] hover:border-line/30",
  glass: "border border-line/15 bg-surface text-fg hover:bg-fg/[0.04]",
  ghost: "text-muted hover:text-fg hover:bg-fg/[0.05]",
  danger: "border border-line/15 text-fg hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30",
};
const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-md",
  lg: "h-11 px-5 text-sm gap-2 rounded-lg",
  icon: "h-9 w-9 rounded-md grid place-items-center",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "outline", size = "md", ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className={cn(
        "ring-focus inline-flex select-none items-center justify-center font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...(props as any)}
    />
  ),
);
Button.displayName = "Button";

export function Chip({
  children,
  color,
  onClick,
  active,
  className,
  onRemove,
}: {
  children: React.ReactNode;
  color?: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  onRemove?: () => void;
}) {
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
        onClick && "cursor-pointer",
        active
          ? "border-line/30 bg-fg/[0.06] text-fg"
          : "border-line/15 text-muted hover:text-fg hover:border-line/25",
        className,
      )}
    >
      {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-0.5 ml-0.5 grid h-3.5 w-3.5 place-items-center rounded-full text-muted hover:text-fg"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "ring-focus relative h-5 w-9 shrink-0 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-fg/15",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 700, damping: 40 }}
        className="absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-sm"
        style={{ left: checked ? "calc(100% - 1.125rem)" : "0.125rem" }}
      />
    </button>
  );
}

const FIELD =
  "ring-focus w-full rounded-md border border-line/20 bg-fg/[0.02] text-sm text-fg placeholder:text-muted/60 transition-colors focus:border-primary/50 focus:bg-transparent";

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(FIELD, "h-9 px-3", className)} {...props} />
  ),
);
TextInput.displayName = "TextInput";

export const TextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(FIELD, "resize-none px-3 py-2.5 leading-relaxed", className)} {...props} />
  ),
);
TextArea.displayName = "TextArea";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-fg/[0.05]", className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-fg/[0.06] to-transparent" />
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line/20 bg-fg/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-muted">
      {children}
    </kbd>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("h-5 w-5 animate-spin rounded-full border-2 border-fg/15 border-t-primary", className)} />
  );
}
