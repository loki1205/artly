import { motion } from "framer-motion";
import { Archive, Check, Copy, ImageIcon, MessageCircle, MoreHorizontal, Star, Trash2 } from "lucide-react";
import { uploadUrl } from "../lib/api";
import type { Category, Idea } from "../lib/types";
import { cn, coverGradient, timeAgo } from "../lib/utils";
import { useMutations } from "../hooks/data";
import { useUI } from "../stores/ui";
import { toast } from "../stores/toast";
import { Menu, MenuItem } from "./ui/overlay";
import { RankBadge, StatusPill } from "./ui/badges";

export function IdeaCard({ idea, category }: { idea: Idea; category?: Category }) {
  const { update, duplicate, remove, restore } = useMutations();
  const { openIdea, selectMode, selected, toggleSelected } = useUI();
  const isSelected = selected.has(idea.id);

  const onClick = () => {
    if (selectMode) toggleSelected(idea.id);
    else openIdea(idea.id);
  };

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    update.mutate({ id: idea.id, body: { favorite: !idea.favorite } });
  };

  const del = () => {
    remove.mutate(idea.id, {
      onSuccess: () => toast.undo("Idea moved to Trash", () => restore.mutate(idea.id)),
    });
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer rounded-xl border bg-surface transition-colors",
        isSelected ? "border-primary" : "border-line/12 hover:border-line/30",
      )}
    >
      {/* cover — clip the image here (not the whole card) so the menu can overflow */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl border-b border-line/10">
        {idea.cover ? (
          <img
            src={uploadUrl(idea.cover, true)}
            alt={idea.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full" style={{ background: coverGradient(idea.id) }} />
        )}

        {selectMode && (
          <div
            className={cn(
              "absolute left-3 top-3 grid h-5 w-5 place-items-center rounded-full border transition-colors",
              isSelected ? "border-primary bg-primary text-primary-fg" : "border-white/70 bg-black/20",
            )}
          >
            {isSelected && <Check size={12} />}
          </div>
        )}

        {!selectMode && (
          <button
            onClick={toggleFav}
            className={cn(
              "ring-focus absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-md border backdrop-blur-sm transition-colors",
              idea.favorite
                ? "border-primary/40 bg-primary text-primary-fg"
                : "border-white/20 bg-black/25 text-white/90 opacity-0 hover:bg-black/40 group-hover:opacity-100",
            )}
            aria-label={idea.favorite ? "Unfavorite" : "Favorite"}
          >
            <Star size={13} fill={idea.favorite ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      {/* body */}
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          {category && (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: category.color }} />
              <span className="truncate">{category.name}</span>
            </span>
          )}
          <span className="ml-auto shrink-0">
            <RankBadge ranking={idea.ranking} size="sm" />
          </span>
        </div>

        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug tracking-tight">{idea.title}</h3>

        {idea.notes && <p className="line-clamp-2 text-[13px] leading-relaxed text-muted">{idea.notes}</p>}

        <div className="flex items-center justify-between border-t border-line/10 pt-2.5">
          <StatusPill status={idea.status} />
          <div className="flex items-center gap-3 text-[11px] text-muted">
            {idea.image_count > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon size={12} /> {idea.image_count}
              </span>
            )}
            {idea.comment_count > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle size={12} /> {idea.comment_count}
              </span>
            )}
            <span className="tnum">{timeAgo(idea.updated_at)}</span>
            <Menu
              align="end"
              trigger={({ toggle }) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle();
                  }}
                  className="ring-focus -mr-1 grid h-6 w-6 place-items-center rounded text-muted opacity-0 transition-opacity hover:bg-fg/[0.06] hover:text-fg group-hover:opacity-100"
                  aria-label="More actions"
                >
                  <MoreHorizontal size={15} />
                </button>
              )}
            >
              {(close) => (
                <div onClick={(e) => e.stopPropagation()}>
                  <MenuItem icon={<Star size={14} />} onClick={() => { update.mutate({ id: idea.id, body: { favorite: !idea.favorite } }); close(); }}>
                    {idea.favorite ? "Remove favorite" : "Favorite"}
                  </MenuItem>
                  <MenuItem icon={<Copy size={14} />} onClick={() => { duplicate.mutate(idea.id); close(); }}>
                    Duplicate
                  </MenuItem>
                  <MenuItem icon={<Archive size={14} />} onClick={() => { update.mutate({ id: idea.id, body: { status: "archived" } }); close(); }}>
                    Archive
                  </MenuItem>
                  <MenuItem icon={<Trash2 size={14} />} danger onClick={() => { del(); close(); }}>
                    Delete
                  </MenuItem>
                </div>
              )}
            </Menu>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
