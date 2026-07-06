import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { useCategories, useMutations } from "../hooks/data";
import { CATEGORY_COLORS } from "../lib/constants";
import { useUI } from "../stores/ui";
import { Modal } from "./ui/overlay";
import { Button, TextInput } from "./ui/primitives";
import { toast } from "../stores/toast";
import { cn } from "../lib/utils";

// Categories are identified by colour, not emoji — the API still stores an
// emoji field, so we send a neutral placeholder that is never rendered.
const CATEGORY_EMOJI = "•";

export function CategoryManager() {
  const { categoryManagerOpen, setCategoryManager } = useUI();
  const { data: categories = [] } = useCategories();
  const { createCategory, updateCategory, deleteCategory } = useMutations();
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);

  const add = () => {
    if (!name.trim()) return;
    createCategory.mutate({ name: name.trim(), color, emoji: CATEGORY_EMOJI }, { onSuccess: () => setName("") });
  };

  return (
    <Modal open={categoryManagerOpen} onClose={() => setCategoryManager(false)} title="Categories" className="max-w-lg">
      <div className="space-y-5">
        {/* existing */}
        <div className="space-y-1.5">
          {categories.map((c) => (
            <motion.div key={c.id} layout className="flex items-center gap-3 rounded-md border border-line/10 px-3 py-2">
              <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: c.color }} />
              <input
                defaultValue={c.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && updateCategory.mutate({ id: c.id, body: { name: e.target.value.trim() } })}
                className="ring-focus min-w-0 flex-1 rounded bg-transparent px-1.5 py-1 text-sm outline-none hover:bg-fg/[0.04] focus:bg-fg/[0.04]"
              />
              <div className="flex gap-1.5">
                {CATEGORY_COLORS.slice(0, 6).map((col) => (
                  <button
                    key={col}
                    onClick={() => updateCategory.mutate({ id: c.id, body: { color: col } })}
                    className={cn(
                      "h-4 w-4 rounded-full ring-2 ring-offset-2 ring-offset-surface transition",
                      c.color === col ? "ring-line/40" : "ring-transparent",
                    )}
                    style={{ background: col }}
                    aria-label="Set color"
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  deleteCategory.mutate(c.id, {
                    onError: () => toast.error("Category is in use — reassign those ideas first"),
                  })
                }
                className="ring-focus rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                aria-label="Delete category"
              >
                <Trash2 size={15} />
              </button>
            </motion.div>
          ))}
        </div>

        {/* create */}
        <div className="rounded-lg border border-line/12 p-4">
          <p className="label mb-3">New category</p>
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 shrink-0 rounded-md" style={{ background: color }} />
            <TextInput value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Category name" />
            <Button variant="primary" size="icon" onClick={add} aria-label="Add category">
              <Plus size={17} />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((col) => (
              <button
                key={col}
                onClick={() => setColor(col)}
                className={cn(
                  "h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-surface transition",
                  color === col ? "ring-line/40" : "ring-transparent",
                )}
                style={{ background: col }}
                aria-label="Pick color"
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
