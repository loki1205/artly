import type { Category, Idea } from "./types";

export interface FilterState {
  search: string;
  categoryFilter: string | "all";
  statusFilter: string;
  badgeFilter: string;
  favoritesOnly: boolean;
  sort: string;
}

export function selectIdeas(ideas: Idea[], categories: Category[], f: FilterState): Idea[] {
  const catName = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));
  const q = f.search.trim().toLowerCase();

  let out = ideas.filter((i) => {
    if (f.categoryFilter !== "all" && i.category_id !== f.categoryFilter) return false;
    if (f.statusFilter !== "all" && i.status !== f.statusFilter) return false;
    if (f.badgeFilter !== "all" && i.ranking.key !== f.badgeFilter) return false;
    if (f.favoritesOnly && !i.favorite) return false;
    if (q) {
      const hay = [
        i.title,
        i.notes,
        i.tags.join(" "),
        i.category_id ? catName.get(i.category_id) ?? "" : "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const byUpdated = (a: Idea, b: Idea) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
  switch (f.sort) {
    case "manual":
      out = out.sort((a, b) => a.order - b.order);
      break;
    case "newest":
      out = out.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
      break;
    case "oldest":
      out = out.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
      break;
    case "alpha":
      out = out.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "updated":
      out = out.sort(byUpdated);
      break;
    case "ranking":
    default:
      out = out.sort((a, b) => b.ranking.score - a.ranking.score || byUpdated(a, b));
  }
  return out;
}
