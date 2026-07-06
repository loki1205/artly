import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useStats } from "../hooks/data";
import { STATUS_META, STATUS_ORDER } from "../lib/constants";
import { useUI } from "../stores/ui";
import { Skeleton } from "./ui/primitives";
import { timeAgo } from "../lib/utils";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

function Card({ children, className = "", span = "" }: { children: React.ReactNode; className?: string; span?: string }) {
  return (
    <motion.div variants={item} className={`rounded-xl border border-line/12 bg-surface p-5 ${span} ${className}`}>
      {children}
    </motion.div>
  );
}

export function Dashboard() {
  const { data: stats, isLoading } = useStats();
  const { openIdea } = useUI();

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card span="col-span-2 md:col-span-2">
        <div className="label">Total ideas</div>
        <div className="tnum mt-3 text-5xl font-semibold tracking-tight">{stats.total}</div>
        <p className="mt-2 text-[13px] text-muted">{stats.trash_count} in trash</p>
      </Card>

      <Card>
        <div className="label">Favorites</div>
        <div className="tnum mt-3 text-4xl font-semibold tracking-tight">{stats.favorites}</div>
      </Card>

      <Card>
        <div className="label">Top category</div>
        <div className="mt-3 truncate font-display text-xl font-semibold tracking-tight">
          {stats.top_category_name ?? "—"}
        </div>
      </Card>

      {/* status breakdown */}
      <Card span="col-span-2 md:col-span-4">
        <div className="label mb-4">By status</div>
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          {STATUS_ORDER.map((s) => (
            <div key={s} className="flex items-baseline gap-2.5">
              <span className="h-1.5 w-1.5 translate-y-[-2px] rounded-full" style={{ background: STATUS_META[s].color }} />
              <span className="tnum text-2xl font-semibold tracking-tight">{stats.by_status[s] ?? 0}</span>
              <span className="text-[13px] text-muted">{STATUS_META[s].label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* most discussed */}
      <Card span="col-span-2" className="flex flex-col">
        <div className="label">Most discussed</div>
        {stats.most_discussed ? (
          <button
            onClick={() => openIdea(stats.most_discussed!.id)}
            className="mt-3 flex items-center justify-between rounded-md border border-line/10 p-3 text-left transition-colors hover:bg-fg/[0.04]"
          >
            <span className="truncate font-medium">{stats.most_discussed.title}</span>
            <span className="ml-3 flex shrink-0 items-center gap-1 text-[13px] text-muted">
              <MessageCircle size={13} /> {stats.most_discussed.comment_count}
            </span>
          </button>
        ) : (
          <p className="mt-3 text-[13px] text-muted">No comments yet.</p>
        )}
      </Card>

      {/* recently updated */}
      <Card span="col-span-2">
        <div className="label">Recently updated</div>
        <div className="mt-2 space-y-0.5">
          {stats.recent.map((r) => (
            <button
              key={r.id}
              onClick={() => openIdea(r.id)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-fg/[0.05]"
            >
              <span className="truncate">{r.title}</span>
              <span className="tnum ml-3 shrink-0 text-xs text-muted">{timeAgo(r.updated_at)}</span>
            </button>
          ))}
          {stats.recent.length === 0 && <p className="text-[13px] text-muted">Nothing yet.</p>}
        </div>
      </Card>
    </motion.div>
  );
}
