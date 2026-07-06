import { ThumbsDown, ThumbsUp, Minus } from "lucide-react";
import type { Idea, VoteValue } from "../lib/types";
import { cn } from "../lib/utils";
import { useMutations } from "../hooks/data";
import { RankBadge } from "./ui/badges";

const OPTIONS: { value: VoteValue; icon: typeof ThumbsUp; label: string; tint: string }[] = [
  { value: "like", icon: ThumbsUp, label: "Like", tint: "#6E8B6A" },
  { value: "neutral", icon: Minus, label: "Neutral", tint: "#B08A4E" },
  { value: "dislike", icon: ThumbsDown, label: "Don't like", tint: "#B0524A" },
];

export function VotePanel({ idea }: { idea: Idea }) {
  const { vote } = useMutations();
  const cast = (v: VoteValue) => vote.mutate({ id: idea.id, vote: idea.my_vote === v ? null : v });

  return (
    <div className="rounded-lg border border-line/12 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] text-muted">Your vote is anonymous</span>
        <RankBadge ranking={idea.ranking} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const active = idea.my_vote === o.value;
          const Icon = o.icon;
          return (
            <button
              key={o.value}
              onClick={() => cast(o.value)}
              className={cn(
                "ring-focus flex flex-col items-center gap-1.5 rounded-md border py-3 text-xs transition-colors",
                active ? "text-fg" : "border-line/15 text-muted hover:border-line/30 hover:text-fg",
              )}
              style={active ? { borderColor: `${o.tint}80`, background: `${o.tint}14`, color: o.tint } : undefined}
              aria-pressed={active}
            >
              <Icon size={17} strokeWidth={1.75} />
              <span className="font-medium">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
