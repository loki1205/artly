import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Background } from "./components/Background";
import { TopBar } from "./components/TopBar";
import { FilterBar } from "./components/FilterBar";
import { IdeaGrid } from "./components/IdeaGrid";
import { IdeaDrawer } from "./components/IdeaDrawer";
import { Dashboard } from "./components/Dashboard";
import { TrashView } from "./components/TrashView";
import { CommandPalette } from "./components/CommandPalette";
import { CreateIdeaModal } from "./components/CreateIdeaModal";
import { CategoryManager } from "./components/CategoryManager";
import { SettingsSheet } from "./components/SettingsSheet";
import { BulkBar } from "./components/BulkBar";
import { Toaster } from "./components/Toaster";
import { EmptyState } from "./components/EmptyState";
import { Button, Skeleton } from "./components/ui/primitives";
import { useCategories, useIdeas, useInvalidateOnRealtime, useMutations, useStats } from "./hooks/data";
import { useTheme } from "./hooks/useTheme";
import { useRealtime } from "./lib/realtime";
import { selectIdeas } from "./lib/filter";
import { useUI } from "./stores/ui";
import { toast } from "./stores/toast";
import { cn } from "./lib/utils";

function StatsStrip() {
  const { data: stats } = useStats();
  const { data: categories = [] } = useCategories();
  if (!stats) return null;
  const topCat = categories.find((c) => c.id === stats.top_category_id);
  const items = [
    { label: "Ideas", value: String(stats.total), mono: true },
    { label: "Favorites", value: String(stats.favorites), mono: true },
    { label: "Sold", value: String(stats.by_status.sold ?? 0), mono: true },
    { label: "Top category", value: topCat ? topCat.name : "—", mono: false },
  ];
  return (
    <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line/12 bg-line/10 sm:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="bg-bg px-5 py-4">
          <div
            className={cn(
              "truncate text-[22px] font-semibold leading-none tracking-tight",
              s.mono ? "tnum" : "font-display",
            )}
          >
            {s.value}
          </div>
          <div className="label mt-2">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  useTheme(); // applies data-theme from settings
  const invalidate = useInvalidateOnRealtime();
  const conn = useRealtime(invalidate);

  const { route, search, categoryFilter, statusFilter, badgeFilter, favoritesOnly, sort, openIdeaId, openIdea, setCreateOpen, setPalette } = useUI();
  const { data: ideas = [], isLoading } = useIdeas(false);
  const { data: categories = [] } = useCategories();
  const { data: stats } = useStats();
  const { duplicate, update, remove, restore } = useMutations();

  const visible = useMemo(
    () => selectIdeas(ideas, categories, { search, categoryFilter, statusFilter, badgeFilter, favoritesOnly, sort }),
    [ideas, categories, search, categoryFilter, statusFilter, badgeFilter, favoritesOnly, sort],
  );
  const allTags = useMemo(() => Array.from(new Set(ideas.flatMap((i) => i.tags))).sort(), [ideas]);
  const openIdeaObj = openIdeaId ? ideas.find((i) => i.id === openIdeaId) ?? null : null;

  // Global keyboard shortcuts
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    };
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
        return;
      }
      if (isTyping(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("artly-search")?.focus();
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setCreateOpen(true);
      } else if (openIdeaId) {
        if (e.key.toLowerCase() === "f") update.mutate({ id: openIdeaId, body: { favorite: !openIdeaObj?.favorite } });
        else if (e.key.toLowerCase() === "d") duplicate.mutate(openIdeaId);
        else if (e.key === "Delete" || e.key === "Backspace") {
          const id = openIdeaId;
          openIdea(null);
          remove.mutate(id, { onSuccess: () => toast.undo("Idea moved to Trash", () => restore.mutate(id)) });
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [openIdeaId, openIdeaObj?.favorite]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen">
      <Background />
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-28 sm:px-8">
        <TopBar conn={conn} trashCount={stats?.trash_count ?? 0} />

        <AnimatePresence mode="wait">
          <motion.div
            key={route}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {route === "board" && (
              <>
                <StatsStrip />
                <FilterBar />
                {isLoading ? (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-72" />
                    ))}
                  </div>
                ) : visible.length === 0 ? (
                  ideas.length === 0 ? (
                    <EmptyState
                      title="No ideas yet"
                      subtitle="Add your first canvas idea to get started."
                      action={
                        <Button variant="primary" onClick={() => setCreateOpen(true)}>
                          <Plus size={16} /> New idea
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState title="No matches" subtitle="Try adjusting your search or filters." />
                  )
                ) : (
                  <IdeaGrid ideas={visible} categories={categories} manual={sort === "manual"} />
                )}
              </>
            )}
            {route === "dashboard" && <Dashboard />}
            {route === "trash" && <TrashView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* mobile sticky add button — board & dashboard only */}
      {(route === "board" || route === "dashboard") && (
        <button
          onClick={() => setCreateOpen(true)}
          className="ring-focus fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-fg shadow-float sm:hidden"
          aria-label="New idea"
        >
          <Plus size={22} />
        </button>
      )}

      {/* overlays */}
      <IdeaDrawer idea={openIdeaObj} categories={categories} allTags={allTags} onClose={() => openIdea(null)} />
      <CreateIdeaModal />
      <CommandPalette />
      <CategoryManager />
      <SettingsSheet />
      <BulkBar />
      <Toaster />
    </div>
  );
}
