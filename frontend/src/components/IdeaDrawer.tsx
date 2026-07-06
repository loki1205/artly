import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Clock, Loader2, Plus, Sparkles } from "lucide-react";
import type { Category, Idea, Status } from "../lib/types";
import { STATUS_META, STATUS_ORDER } from "../lib/constants";
import { cn, timeAgo } from "../lib/utils";
import { useMutations } from "../hooks/data";
import { celebrate } from "../lib/confetti";
import { Drawer, Menu, MenuItem } from "./ui/overlay";
import { StatusPill } from "./ui/badges";
import { Chip, TextArea } from "./ui/primitives";
import { ImagePanel } from "./ImagePanel";
import { VotePanel } from "./VotePanel";
import { Comments } from "./Comments";

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="label">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

export function IdeaDrawer({
  idea,
  categories,
  allTags,
  onClose,
}: {
  idea: Idea | null;
  categories: Category[];
  allTags: string[];
  onClose: () => void;
}) {
  const { update } = useMutations();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setNotes(idea.notes);
    }
  }, [idea?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!idea) return <Drawer open={false} onClose={onClose}>{null}</Drawer>;

  const category = idea.category_id ? categories.find((c) => c.id === idea.category_id) : undefined;

  const flashSaved = () => {
    setSavedFlash(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedFlash(false), 1400);
  };
  const save = (body: Partial<Idea>) => update.mutate({ id: idea.id, body }, { onSuccess: flashSaved });

  const setStatus = (status: Status) => {
    save({ status });
    if (status === "finished" && idea.status !== "finished") celebrate();
  };
  const addTag = (t: string) => {
    const tag = t.trim().replace(/^#/, "").toLowerCase();
    if (tag && !idea.tags.includes(tag)) save({ tags: [...idea.tags, tag] });
    setTagDraft("");
  };
  const removeTag = (t: string) => save({ tags: idea.tags.filter((x) => x !== t) });

  const suggestions = allTags.filter((t) => t.includes(tagDraft.toLowerCase()) && !idea.tags.includes(t)).slice(0, 5);

  return (
    <Drawer open={!!idea} onClose={onClose}>
      {/* header */}
      <div className="relative shrink-0 border-b border-line/10 p-6 pr-16">
        <div className="mb-3 flex items-center gap-2">
          {/* status selector */}
          <Menu
            trigger={({ toggle }) => (
              <button onClick={toggle} className="ring-focus rounded-full">
                <span className="flex items-center gap-1">
                  <StatusPill status={idea.status} />
                  <ChevronDown size={14} className="text-muted" />
                </span>
              </button>
            )}
          >
            {(close) => (
              <div>
                {STATUS_ORDER.map((s) => (
                  <MenuItem
                    key={s}
                    icon={<span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_META[s].color }} />}
                    onClick={() => {
                      setStatus(s);
                      close();
                    }}
                  >
                    <span className="flex-1">{STATUS_META[s].label}</span>
                    {idea.status === s && <Check size={14} className="text-primary" />}
                  </MenuItem>
                ))}
              </div>
            )}
          </Menu>

          <span className="flex items-center gap-1 text-xs text-muted">
            {update.isPending ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Saving…
              </>
            ) : savedFlash ? (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1" style={{ color: "#6E8B6A" }}>
                <Check size={12} /> Saved
              </motion.span>
            ) : null}
          </span>
        </div>

        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== idea.title && save({ title: title.trim() })}
          rows={1}
          className="ring-focus w-full resize-none bg-transparent text-2xl font-bold leading-tight outline-none placeholder:text-muted/50"
          placeholder="Untitled idea"
        />
      </div>

      {/* scrollable body */}
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* category + favorite */}
        <div className="flex flex-wrap items-center gap-2">
          <Menu
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="ring-focus flex items-center gap-1.5 rounded-md border border-line/15 px-3 py-1.5 text-sm text-fg transition-colors hover:bg-fg/[0.04]"
              >
                {category ? (
                  <>
                    <span className="h-2 w-2 rounded-full" style={{ background: category.color }} />
                    {category.name}
                  </>
                ) : (
                  <span className="text-muted">No category</span>
                )}
                <ChevronDown size={14} className="text-muted" />
              </button>
            )}
          >
            {(close) => (
              <div className="max-h-64 overflow-y-auto">
                <MenuItem onClick={() => { save({ category_id: null }); close(); }}>No category</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} icon={<span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />} onClick={() => { save({ category_id: c.id }); close(); }}>
                    <span className="flex-1">{c.name}</span>
                    {idea.category_id === c.id && <Check size={14} className="text-primary" />}
                  </MenuItem>
                ))}
              </div>
            )}
          </Menu>

          <button
            onClick={() => save({ favorite: !idea.favorite })}
            className={cn(
              "ring-focus flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
              idea.favorite ? "border-primary/40 bg-primary/10 text-primary" : "border-line/15 text-muted hover:bg-fg/[0.04] hover:text-fg",
            )}
          >
            <Sparkles size={14} /> {idea.favorite ? "Favorited" : "Favorite"}
          </button>
        </div>

        {/* tags */}
        <Section title="Tags">
          <div className="flex flex-wrap items-center gap-1.5">
            {idea.tags.map((t) => (
              <Chip key={t} onRemove={() => removeTag(t)}>#{t}</Chip>
            ))}
            <div className="relative">
              <div className="flex items-center gap-1 rounded-full border border-dashed border-line/25 px-2.5 py-1">
                <Plus size={12} className="text-muted" />
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag(tagDraft);
                    }
                  }}
                  placeholder="add tag"
                  className="w-20 bg-transparent text-xs outline-none placeholder:text-muted/60"
                />
              </div>
              {tagDraft && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-40 overflow-hidden rounded-lg border border-line/12 bg-surface p-1 shadow-float">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => addTag(s)}
                      className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-fg/[0.06]"
                    >
                      #{s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* notes */}
        <Section title="Notes">
          <TextArea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== idea.notes && save({ notes })}
            placeholder="Describe the idea, palette, size, mood…"
          />
        </Section>

        {/* images */}
        <Section title={`Reference Images · ${idea.image_count}`}>
          <ImagePanel idea={idea} />
        </Section>

        {/* voting */}
        <Section title="Voting">
          <VotePanel idea={idea} />
        </Section>

        {/* comments */}
        <Section title={`Comments · ${idea.comment_count}`}>
          <Comments idea={idea} />
        </Section>

        {/* timeline */}
        <Section title="Timeline">
          <div className="space-y-2">
            {[...idea.activity].reverse().map((a) => (
              <div key={a.id} className="flex items-center gap-2.5 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line/10 text-muted">
                  <Clock size={12} />
                </span>
                <span className="text-fg/80">{a.text}</span>
                <span className="ml-auto text-xs text-muted">{timeAgo(a.at)}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </Drawer>
  );
}
