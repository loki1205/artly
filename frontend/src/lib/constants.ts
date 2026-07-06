import type { Status } from "./types";

// Muted, warm-leaning status hues — distinguishable but never loud. The `emoji`
// field is retained for data compatibility but is no longer rendered (the UI
// uses a small colour dot instead).
export const STATUS_META: Record<Status, { label: string; color: string; emoji: string }> = {
  idea: { label: "Idea", color: "#9A948A", emoji: "💡" },
  approved: { label: "Approved", color: "#5E7A9B", emoji: "✅" },
  sketching: { label: "Sketching", color: "#927B9B", emoji: "✏️" },
  painting: { label: "Painting", color: "#B05B40", emoji: "🎨" },
  finished: { label: "Finished", color: "#6E8B6A", emoji: "🌟" },
  sold: { label: "Sold", color: "#B08A4E", emoji: "💰" },
  archived: { label: "Archived", color: "#A29A8D", emoji: "📦" },
};

export const STATUS_ORDER: Status[] = [
  "idea",
  "approved",
  "sketching",
  "painting",
  "finished",
  "sold",
  "archived",
];

export const BADGE_TINT: Record<string, string> = {
  top_pick: "#B05B40", // clay — the brand accent marks the strongest ideas
  strong: "#B08A4E", // ochre
  good: "#6E8B6A", // muted green
  mixed: "#9A948A", // warm gray
  low: "#A29A8D", // light warm gray
  new: "#A29A8D",
};

export const SORTS: { value: string; label: string }[] = [
  { value: "ranking", label: "Ranking" },
  { value: "manual", label: "Manual" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "alpha", label: "Alphabetical" },
  { value: "updated", label: "Recently updated" },
];

// Muted, warm-leaning category colours — distinguishable but part of the same
// gallery palette (no neon primaries).
export const CATEGORY_COLORS = [
  "#B0684E", "#5E7A9B", "#6E8B6A", "#B08A4E", "#927B9B",
  "#9B6A5C", "#5F8079", "#A6794E", "#8A8578", "#7C766B",
];

export const EMOJI_CHOICES = [
  "🎨", "🖼️", "🏔️", "🎭", "🌀", "🍎", "🌊", "🌸", "🔥", "🌙",
  "⭐", "🌿", "🦋", "🪷", "🍂", "🌅", "🫧", "🎇",
];
