import { AnimatePresence, motion } from "framer-motion";
import { Archive, FolderInput, Star, Trash2, X } from "lucide-react";
import { useCategories, useMutations } from "../hooks/data";
import { useUI } from "../stores/ui";
import { Button } from "./ui/primitives";
import { Menu, MenuItem } from "./ui/overlay";
import { toast } from "../stores/toast";

export function BulkBar() {
  const { selectMode, selected, clearSelected, toggleSelectMode } = useUI();
  const { data: categories = [] } = useCategories();
  const { bulk } = useMutations();
  const ids = Array.from(selected);
  const open = selectMode && ids.length > 0;

  const run = (action: string, category_id?: string | null) =>
    bulk.mutate(
      { ids, action, category_id },
      {
        onSuccess: () => {
          toast.success(`${ids.length} idea${ids.length > 1 ? "s" : ""} updated`);
          clearSelected();
        },
      },
    );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 16, x: "-50%" }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-1rem)] items-center gap-1.5 overflow-x-auto rounded-lg border border-line/12 bg-surface px-2.5 py-2 shadow-float sm:bottom-6 sm:gap-2 sm:px-3 sm:py-2.5"
        >
          <span className="shrink-0 whitespace-nowrap px-1.5 text-[13px] font-medium sm:px-2">
            <span className="tnum">{ids.length}</span><span className="hidden text-muted sm:inline"> selected</span>
          </span>
          <div className="mx-0.5 h-6 w-px shrink-0 bg-line/15 sm:mx-1" />
          <Button size="sm" variant="glass" onClick={() => run("favorite")} className="shrink-0" aria-label="Favorite selected">
            <Star size={14} /> <span className="hidden sm:inline">Favorite</span>
          </Button>
          <Button size="sm" variant="glass" onClick={() => run("archive")} className="shrink-0" aria-label="Archive selected">
            <Archive size={14} /> <span className="hidden sm:inline">Archive</span>
          </Button>
          <Menu
            align="end"
            trigger={({ toggle }) => (
              <Button size="sm" variant="glass" onClick={toggle} className="shrink-0" aria-label="Move selected to category">
                <FolderInput size={14} /> <span className="hidden sm:inline">Move</span>
              </Button>
            )}
          >
            {(close) => (
              <div className="max-h-56 overflow-y-auto">
                {categories.map((c) => (
                  <MenuItem key={c.id} icon={<span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />} onClick={() => { run("move_category", c.id); close(); }}>
                    {c.name}
                  </MenuItem>
                ))}
              </div>
            )}
          </Menu>
          <Button size="sm" variant="danger" onClick={() => run("delete")} className="shrink-0" aria-label="Delete selected">
            <Trash2 size={14} /> <span className="hidden sm:inline">Delete</span>
          </Button>
          <button onClick={toggleSelectMode} className="ring-focus ml-0.5 shrink-0 rounded-lg p-2 text-muted hover:text-fg sm:ml-1" aria-label="Cancel selection">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
