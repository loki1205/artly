import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "../stores/toast";
import type { Category, Idea, Settings } from "../lib/types";

export const keys = {
  ideas: (trash: boolean) => ["ideas", trash] as const,
  categories: ["categories"] as const,
  settings: ["settings"] as const,
  stats: ["stats"] as const,
};

export function useIdeas(trash = false) {
  return useQuery({ queryKey: keys.ideas(trash), queryFn: () => api.ideas(trash) });
}
export function useCategories() {
  return useQuery({ queryKey: keys.categories, queryFn: api.categories });
}
export function useSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: api.settings });
}
export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: api.stats });
}

/** Invalidate caches for a resource pushed over the WebSocket. */
export function useInvalidateOnRealtime() {
  const qc = useQueryClient();
  return (resource: string) => {
    if (resource === "ideas") {
      qc.invalidateQueries({ queryKey: ["ideas"] });
      qc.invalidateQueries({ queryKey: keys.stats });
    } else if (resource === "categories") {
      qc.invalidateQueries({ queryKey: keys.categories });
      qc.invalidateQueries({ queryKey: ["ideas"] });
    } else if (resource === "settings") {
      qc.invalidateQueries({ queryKey: keys.settings });
    }
  };
}

/** All write operations, each invalidating the right caches + surfacing errors. */
export function useMutations() {
  const qc = useQueryClient();
  const bumpIdeas = () => {
    qc.invalidateQueries({ queryKey: ["ideas"] });
    qc.invalidateQueries({ queryKey: keys.stats });
  };
  const bumpCats = () => qc.invalidateQueries({ queryKey: keys.categories });
  const onErr = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong");

  const m = {
    create: useMutation({ mutationFn: (b: Partial<Idea>) => api.createIdea(b), onSuccess: bumpIdeas, onError: onErr }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<Idea> }) => api.updateIdea(id, body),
      onSuccess: bumpIdeas,
      onError: onErr,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.deleteIdea(id), onSuccess: bumpIdeas, onError: onErr }),
    restore: useMutation({ mutationFn: (id: string) => api.restoreIdea(id), onSuccess: bumpIdeas, onError: onErr }),
    purge: useMutation({ mutationFn: (id: string) => api.purgeIdea(id), onSuccess: bumpIdeas, onError: onErr }),
    duplicate: useMutation({ mutationFn: (id: string) => api.duplicateIdea(id), onSuccess: bumpIdeas, onError: onErr }),
    vote: useMutation({
      mutationFn: ({ id, vote }: { id: string; vote: Idea["my_vote"] }) => api.vote(id, vote),
      onSuccess: bumpIdeas,
      onError: onErr,
    }),
    reorder: useMutation({ mutationFn: (order: string[]) => api.reorderIdeas(order), onSuccess: bumpIdeas, onError: onErr }),
    bulk: useMutation({
      mutationFn: ({ ids, action, category_id }: { ids: string[]; action: string; category_id?: string | null }) =>
        api.bulk(ids, action, category_id),
      onSuccess: bumpIdeas,
      onError: onErr,
    }),
    upload: useMutation({
      mutationFn: ({ id, files, url }: { id: string; files: File[]; url?: string }) => api.uploadImages(id, files, url),
      onSuccess: bumpIdeas,
      onError: onErr,
    }),
    deleteImage: useMutation({
      mutationFn: ({ id, filename }: { id: string; filename: string }) => api.deleteImage(id, filename),
      onSuccess: bumpIdeas,
      onError: onErr,
    }),
    setCover: useMutation({
      mutationFn: ({ id, filename }: { id: string; filename: string }) => api.setCover(id, filename),
      onSuccess: bumpIdeas,
      onError: onErr,
    }),
    reorderImages: useMutation({
      mutationFn: ({ id, order }: { id: string; order: string[] }) => api.reorderImages(id, order),
      onSuccess: bumpIdeas,
      onError: onErr,
    }),
    addComment: useMutation({
      mutationFn: ({ id, text }: { id: string; text: string }) => api.addComment(id, text),
      onSuccess: bumpIdeas,
      onError: onErr,
    }),
    editComment: useMutation({
      mutationFn: ({ commentId, text }: { commentId: string; text: string }) => api.editComment(commentId, text),
      onSuccess: bumpIdeas,
      onError: onErr,
    }),
    deleteComment: useMutation({ mutationFn: (commentId: string) => api.deleteComment(commentId), onSuccess: bumpIdeas, onError: onErr }),
    createCategory: useMutation({
      mutationFn: (b: { name: string; color: string; emoji: string }) => api.createCategory(b),
      onSuccess: bumpCats,
      onError: onErr,
    }),
    updateCategory: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<Category> }) => api.updateCategory(id, body),
      onSuccess: bumpCats,
      onError: onErr,
    }),
    deleteCategory: useMutation({ mutationFn: (id: string) => api.deleteCategory(id), onSuccess: bumpCats, onError: onErr }),
    updateSettings: useMutation({
      mutationFn: (b: Partial<Settings>) => api.updateSettings(b),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.settings }),
      onError: onErr,
    }),
    importBoard: useMutation({
      mutationFn: (file: File) => api.importBoard(file),
      onSuccess: () => {
        bumpIdeas();
        bumpCats();
      },
      onError: onErr,
    }),
  };
  return m;
}
