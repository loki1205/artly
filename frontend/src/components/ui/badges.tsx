import { BADGE_TINT, STATUS_META } from "../../lib/constants";
import type { Ranking, Status } from "../../lib/types";
import { cn } from "../../lib/utils";

/** Status as a small colour dot + label. No pill, no emoji. */
export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-fg/75", className)}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

/**
 * The ONLY vote signal ever shown — a qualitative badge, never a count. Below
 * MIN_VOTES it reads as a quiet "New". Rendered as a tracked-out mono label with
 * a small tint dot, so it feels like a caption rather than a sticker.
 */
export function RankBadge({ ranking, size = "md" }: { ranking: Ranking; size?: "sm" | "md" }) {
  const tint = BADGE_TINT[ranking.key] ?? BADGE_TINT.new;
  const cls = cn(
    "inline-flex items-center gap-1.5 font-mono uppercase tracking-label",
    size === "sm" ? "text-[9.5px]" : "text-[10px]",
  );
  if (!ranking.has_badge) {
    return <span className={cn(cls, "text-muted")}>New</span>;
  }
  return (
    <span className={cls} style={{ color: tint }} title={ranking.label}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tint }} />
      {ranking.label}
    </span>
  );
}
