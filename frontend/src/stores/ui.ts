import { create } from "zustand";
import type { Status } from "../lib/types";

export type Route = "board" | "dashboard" | "trash";
export type BadgeFilter = "all" | "top_pick" | "strong" | "good" | "mixed" | "low" | "new";

interface UIState {
  route: Route;
  setRoute: (r: Route) => void;

  search: string;
  setSearch: (s: string) => void;

  categoryFilter: string | "all";
  statusFilter: Status | "all";
  badgeFilter: BadgeFilter;
  favoritesOnly: boolean;
  sort: string;
  setFilter: (patch: Partial<Pick<UIState, "categoryFilter" | "statusFilter" | "badgeFilter" | "favoritesOnly" | "sort">>) => void;
  resetFilters: () => void;

  // multi-select / bulk
  selectMode: boolean;
  selected: Set<string>;
  toggleSelectMode: () => void;
  toggleSelected: (id: string) => void;
  clearSelected: () => void;

  openIdeaId: string | null;
  openIdea: (id: string | null) => void;

  paletteOpen: boolean;
  setPalette: (open: boolean) => void;
  categoryManagerOpen: boolean;
  setCategoryManager: (open: boolean) => void;
  settingsOpen: boolean;
  setSettings: (open: boolean) => void;
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  route: "board",
  setRoute: (route) => set({ route, selectMode: false, selected: new Set() }),

  search: "",
  setSearch: (search) => set({ search }),

  categoryFilter: "all",
  statusFilter: "all",
  badgeFilter: "all",
  favoritesOnly: false,
  sort: "ranking",
  setFilter: (patch) => set(patch),
  resetFilters: () =>
    set({ categoryFilter: "all", statusFilter: "all", badgeFilter: "all", favoritesOnly: false, search: "" }),

  selectMode: false,
  selected: new Set(),
  toggleSelectMode: () =>
    set((s) => ({ selectMode: !s.selectMode, selected: new Set() })),
  toggleSelected: (id) =>
    set((s) => {
      const next = new Set(s.selected);
      next.has(id) ? next.delete(id) : next.add(id);
      return { selected: next };
    }),
  clearSelected: () => set({ selected: new Set() }),

  openIdeaId: null,
  openIdea: (openIdeaId) => set({ openIdeaId }),

  paletteOpen: false,
  setPalette: (paletteOpen) => set({ paletteOpen }),
  categoryManagerOpen: false,
  setCategoryManager: (categoryManagerOpen) => set({ categoryManagerOpen }),
  settingsOpen: false,
  setSettings: (settingsOpen) => set({ settingsOpen }),
  createOpen: false,
  setCreateOpen: (createOpen) => set({ createOpen }),
}));
