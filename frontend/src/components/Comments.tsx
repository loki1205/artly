import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Send, Trash2 } from "lucide-react";
import type { Comment, Idea } from "../lib/types";
import { timeAgo } from "../lib/utils";
import { useMutations } from "../hooks/data";
import { Button, TextArea } from "./ui/primitives";

export function Comments({ idea }: { idea: Idea }) {
  const { addComment, editComment, deleteComment } = useMutations();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    addComment.mutate({ id: idea.id, text: draft.trim() });
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <TextArea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="Add a comment…  (⌘/Ctrl + Enter)"
        />
        <Button variant="primary" size="icon" onClick={submit} disabled={!draft.trim()} aria-label="Send">
          <Send size={16} />
        </Button>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {idea.comments.length === 0 && (
            <p className="py-3 text-center text-sm text-muted">No comments yet — start the discussion.</p>
          )}
          {[...idea.comments].reverse().map((c: Comment) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="group rounded-lg border border-line/10 p-3"
            >
              {editing === c.id ? (
                <div className="space-y-2">
                  <TextArea rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        editComment.mutate({ commentId: c.id, text: editText.trim() });
                        setEditing(null);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm text-fg/90">{c.text}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-muted">
                      Anonymous · {timeAgo(c.created_at)}
                      {c.updated_at && " · edited"}
                    </span>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => {
                          setEditing(c.id);
                          setEditText(c.text);
                        }}
                        className="ring-focus rounded-md p-1 text-muted hover:text-fg"
                        aria-label="Edit comment"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteComment.mutate(c.id)}
                        className="ring-focus rounded-md p-1 text-muted hover:text-red-500"
                        aria-label="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
