import { motion } from "framer-motion";
import { MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { useIdeas, useMutations } from "../hooks/data";
import { coverGradient, timeAgo } from "../lib/utils";
import { uploadUrl } from "../lib/api";
import { EmptyState } from "./EmptyState";
import { Menu, MenuItem } from "./ui/overlay";
import { toast } from "../stores/toast";

export function TrashView() {
  const { data: ideas = [], isLoading } = useIdeas(true);
  const { restore, purge } = useMutations();

  if (!isLoading && ideas.length === 0) {
    return <EmptyState title="Trash is empty" subtitle="Deleted ideas will appear here for restore or permanent removal." />;
  }

  return (
    <div className="space-y-2.5">
      {ideas.map((idea) => (
        <motion.div
          key={idea.id}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -16 }}
          className="flex items-center gap-4 rounded-lg border border-line/12 bg-surface p-3"
        >
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-line/10">
            {idea.cover ? (
              <img src={uploadUrl(idea.cover, true)} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full" style={{ background: coverGradient(idea.id) }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{idea.title}</p>
            <p className="tnum text-xs text-muted">Deleted {timeAgo(idea.deleted_at)}</p>
          </div>
          <Menu
            align="end"
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="ring-focus grid h-8 w-8 place-items-center rounded-md text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
                aria-label="More actions"
              >
                <MoreHorizontal size={16} />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem
                  icon={<RotateCcw size={14} />}
                  onClick={() => {
                    restore.mutate(idea.id, { onSuccess: () => toast.success("Restored") });
                    close();
                  }}
                >
                  Restore
                </MenuItem>
                <MenuItem
                  icon={<Trash2 size={14} />}
                  danger
                  onClick={() => {
                    if (confirm(`Permanently delete “${idea.title}”? This cannot be undone.`))
                      purge.mutate(idea.id, { onSuccess: () => toast.success("Permanently deleted") });
                    close();
                  }}
                >
                  Delete permanently
                </MenuItem>
              </>
            )}
          </Menu>
        </motion.div>
      ))}
    </div>
  );
}
