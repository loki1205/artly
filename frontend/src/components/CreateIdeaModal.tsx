import { useEffect, useRef, useState } from "react";
import { useCategories, useMutations } from "../hooks/data";
import { useUI } from "../stores/ui";
import { Modal } from "./ui/overlay";
import { Button, Chip, TextInput } from "./ui/primitives";
import { toast } from "../stores/toast";

export function CreateIdeaModal() {
  const { createOpen, setCreateOpen, openIdea } = useUI();
  const { data: categories = [] } = useCategories();
  const { create } = useMutations();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (createOpen) {
      setTitle("");
      setCategoryId(null);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [createOpen]);

  const submit = () => {
    create.mutate(
      { title: title.trim() || "Untitled idea", category_id: categoryId },
      {
        onSuccess: (idea) => {
          setCreateOpen(false);
          toast.success("Idea created");
          openIdea(idea.id);
        },
      },
    );
  };

  return (
    <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="✨ New idea" className="max-w-md">
      <div className="space-y-4">
        <TextInput
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="What should we paint?"
          className="h-12 text-base"
        />
        <div>
          <p className="label mb-2">Category</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={categoryId === null} onClick={() => setCategoryId(null)}>
              None
            </Chip>
            {categories.map((c) => (
              <Chip key={c.id} color={c.color} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={create.isPending}>
            Create idea
          </Button>
        </div>
      </div>
    </Modal>
  );
}
