import { AnimatePresence, motion } from "framer-motion";
import { Check, Undo2, X } from "lucide-react";
import { useToasts } from "../stores/toast";
import { cn } from "../lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex w-full items-center gap-3 rounded-lg border border-line/12 bg-surface px-4 py-3 shadow-float"
          >
            {t.tone === "success" && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#6E8B6A" }} />
            )}
            {t.tone === "error" && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#B0524A" }} />
            )}
            <span className={cn("flex-1 text-[13px]", t.tone === "error" ? "text-fg" : "text-fg/90")}>
              {t.message}
            </span>
            {t.actionLabel && (
              <button
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
                className="ring-focus flex items-center gap-1.5 rounded-md border border-line/15 px-2.5 py-1 text-xs font-medium text-fg transition-colors hover:bg-fg/[0.05]"
              >
                <Undo2 size={13} />
                {t.actionLabel}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} className="ring-focus text-muted hover:text-fg" aria-label="Dismiss">
              <X size={15} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
