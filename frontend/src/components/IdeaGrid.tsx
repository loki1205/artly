import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence } from "framer-motion";
import type { Category, Idea } from "../lib/types";
import { IdeaCard } from "./IdeaCard";
import { useMutations } from "../hooks/data";

function SortableItem({ idea, category }: { idea: Idea; category?: Category }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: idea.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 40 : undefined, opacity: isDragging ? 0.85 : 1 }}
      {...attributes}
      {...listeners}
    >
      <IdeaCard idea={idea} category={category} />
    </div>
  );
}

export function IdeaGrid({
  ideas,
  categories,
  manual,
}: {
  ideas: Idea[];
  categories: Category[];
  manual: boolean;
}) {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const { reorder } = useMutations();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  if (manual) {
    const onDragEnd = (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const ids = ideas.map((i) => i.id);
      const next = arrayMove(ids, ids.indexOf(active.id as string), ids.indexOf(over.id as string));
      reorder.mutate(next);
    };
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ideas.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ideas.map((idea) => (
              <SortableItem key={idea.id} idea={idea} category={idea.category_id ? catMap.get(idea.category_id) : undefined} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <AnimatePresence>
        {ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} category={idea.category_id ? catMap.get(idea.category_id) : undefined} />
        ))}
      </AnimatePresence>
    </div>
  );
}
