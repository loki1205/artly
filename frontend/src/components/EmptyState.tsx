import { motion } from "framer-motion";

export function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto flex max-w-sm flex-col items-center gap-3 py-28 text-center"
    >
      <div className="mb-1 h-8 w-8 rounded-md border border-line/25" />
      <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
      {subtitle && <p className="text-[13px] leading-relaxed text-muted">{subtitle}</p>}
      {action && <div className="mt-3">{action}</div>}
    </motion.div>
  );
}
