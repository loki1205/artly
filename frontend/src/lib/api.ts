import { clientId } from "./identity";
import type { Category, Idea, Settings, Stats, Status, VoteValue } from "./types";

// Backend origin. Empty string = same-origin (single-server prod mode or the dev
// proxy). Set VITE_API_URL at build time (e.g. https://artly-api.onrender.com)
// when the frontend is hosted separately from the backend (Netlify/Vercel).
export const API_ORIGIN = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const BASE = `${API_ORIGIN}/api`;

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "X-Client-Id": clientId(),
    ...(options.headers as Record<string, string>),
  };
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return (await res.blob()) as unknown as T;
  return res.json();
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const api = {
  // ideas
  ideas: (trash = false) => req<Idea[]>(`/ideas?trash=${trash}`),
  idea: (id: string) => req<Idea>(`/ideas/${id}`),
  createIdea: (body: Partial<Idea>) => req<Idea>("/ideas", { method: "POST", ...json(body) }),
  updateIdea: (id: string, body: Partial<Idea>) =>
    req<Idea>(`/ideas/${id}`, { method: "PUT", ...json(body) }),
  deleteIdea: (id: string) => req<Idea>(`/ideas/${id}`, { method: "DELETE" }),
  restoreIdea: (id: string) => req<Idea>(`/ideas/${id}/restore`, { method: "POST" }),
  purgeIdea: (id: string) => req<{ ok: boolean }>(`/ideas/${id}/permanent`, { method: "DELETE" }),
  duplicateIdea: (id: string) => req<Idea>(`/ideas/${id}/duplicate`, { method: "POST" }),
  vote: (id: string, vote: VoteValue | null) =>
    req<Idea>(`/ideas/${id}/vote`, { method: "POST", ...json({ vote }) }),
  reorderIdeas: (order: string[]) =>
    req<{ ok: boolean }>("/ideas/reorder", { method: "PUT", ...json({ order }) }),
  bulk: (ids: string[], action: string, category_id?: string | null) =>
    req<{ ok: boolean }>("/ideas/bulk", { method: "POST", ...json({ ids, action, category_id }) }),

  // images
  uploadImages: (id: string, files: File[], url?: string) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    if (url) fd.append("url", url);
    return req<{ added: string[]; errors: string[]; idea: Idea }>(`/ideas/${id}/images`, {
      method: "POST",
      body: fd,
    });
  },
  deleteImage: (id: string, filename: string) =>
    req<Idea>(`/ideas/${id}/images/${encodeURIComponent(filename)}`, { method: "DELETE" }),
  setCover: (id: string, filename: string) =>
    req<Idea>(`/ideas/${id}/cover`, { method: "PUT", ...json({ filename }) }),
  reorderImages: (id: string, order: string[]) =>
    req<Idea>(`/ideas/${id}/images/reorder`, { method: "PUT", ...json({ order }) }),

  // comments
  addComment: (id: string, text: string) =>
    req<Idea>(`/ideas/${id}/comments`, { method: "POST", ...json({ text }) }),
  editComment: (commentId: string, text: string) =>
    req<Idea>(`/comments/${commentId}`, { method: "PUT", ...json({ text }) }),
  deleteComment: (commentId: string) =>
    req<Idea>(`/comments/${commentId}`, { method: "DELETE" }),

  // categories
  categories: () => req<Category[]>("/categories"),
  createCategory: (body: { name: string; color: string; emoji: string }) =>
    req<Category>("/categories", { method: "POST", ...json(body) }),
  updateCategory: (id: string, body: Partial<Category>) =>
    req<Category>(`/categories/${id}`, { method: "PUT", ...json(body) }),
  deleteCategory: (id: string) =>
    req<{ ok: boolean }>(`/categories/${id}`, { method: "DELETE" }),

  // settings + stats
  settings: () => req<Settings>("/settings"),
  updateSettings: (body: Partial<Settings>) =>
    req<Settings>("/settings", { method: "PUT", ...json(body) }),
  stats: () => req<Stats>("/stats"),

  // import / export
  exportUrl: `${BASE}/export`,
  importBoard: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return req<{ ok: boolean }>("/import", { method: "POST", body: fd });
  },
};

export function uploadUrl(filename: string, thumb = false): string {
  return `${API_ORIGIN}/uploads/${thumb ? "thumbs/" : ""}${filename}`;
}

export type { Idea, Category, Settings, Stats, Status, VoteValue };
