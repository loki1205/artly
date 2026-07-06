import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [active, onClose]);
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onClick={onClose}
      className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-[1px]"
    />
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function Modal({
  open,
  onClose,
  children,
  className,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
}) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <>
          <Backdrop onClose={onClose} />
          <div className="fixed inset-0 z-50 grid place-items-center p-4" onMouseDown={onClose}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={{ duration: 0.2, ease: EASE }}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                "relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line/12 bg-surface p-6 shadow-float",
                className,
              )}
              role="dialog"
              aria-modal="true"
            >
              {title && (
                <h2 className="mb-5 font-display text-lg font-semibold tracking-tightest">{title}</h2>
              )}
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Drawer({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <>
          <Backdrop onClose={onClose} />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: EASE }}
            className={cn(
              "fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-line/12 bg-surface shadow-float",
              className,
            )}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={onClose}
              className="ring-focus absolute right-5 top-5 z-10 grid h-8 w-8 place-items-center rounded-md text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
              aria-label="Close"
            >
              <X size={17} />
            </button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Lightweight dropdown menu anchored below its trigger. */
export function Menu({
  trigger,
  children,
  align = "start",
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);
  useEscape(open, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={cn(
              "absolute z-50 mt-1.5 min-w-[12rem] overflow-hidden rounded-lg border border-line/12 bg-surface p-1 shadow-float",
              align === "end" ? "right-0" : "left-0",
              className,
            )}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  danger,
  icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "ring-focus flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors",
        danger ? "text-red-500 hover:bg-red-500/10" : "text-fg/80 hover:bg-fg/[0.06] hover:text-fg",
      )}
    >
      {icon && <span className="grid w-4 place-items-center text-muted">{icon}</span>}
      {children}
    </button>
  );
}
