import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Tags,
  Trash2,
  Download,
  Grid3x3,
} from "lucide-react";
import { useIdeas } from "../hooks/data";
import { useUI } from "../stores/ui";
import { useTheme } from "../hooks/useTheme";
import { api } from "../lib/api";
import { useEscape } from "./ui/overlay";
import { Kbd } from "./ui/primitives";
import { cn } from "../lib/utils";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
  group: string;
}

export function CommandPalette() {
  const { paletteOpen, setPalette, setRoute, setCreateOpen, openIdea, setCategoryManager, setSettings } = useUI();
  const { theme, toggle } = useTheme();
  const { data: ideas = [] } = useIdeas(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEscape(paletteOpen, () => setPalette(false));

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [paletteOpen]);

  const commands = useMemo<Cmd[]>(() => {
    const base: Cmd[] = [
      { id: "new", label: "New idea", hint: "N", icon: <Plus size={16} />, group: "Actions", run: () => setCreateOpen(true) },
      { id: "board", label: "Go to Board", icon: <Grid3x3 size={16} />, group: "Navigate", run: () => setRoute("board") },
      { id: "dash", label: "Go to Dashboard", icon: <LayoutDashboard size={16} />, group: "Navigate", run: () => setRoute("dashboard") },
      { id: "trash", label: "Go to Trash", icon: <Trash2 size={16} />, group: "Navigate", run: () => setRoute("trash") },
      { id: "cats", label: "Manage categories", icon: <Tags size={16} />, group: "Actions", run: () => setCategoryManager(true) },
      { id: "settings", label: "Open settings", icon: <Settings size={16} />, group: "Actions", run: () => setSettings(true) },
      {
        id: "theme",
        label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        icon: theme === "dark" ? <Sun size={16} /> : <Moon size={16} />,
        group: "Actions",
        run: toggle,
      },
      { id: "export", label: "Export board", icon: <Download size={16} />, group: "Actions", run: () => window.open(api.exportUrl, "_blank") },
    ];
    const ideaCmds: Cmd[] = ideas.map((i) => ({
      id: `idea-${i.id}`,
      label: i.title,
      hint: i.ranking.has_badge ? i.ranking.label : undefined,
      icon: <Search size={16} />,
      group: "Ideas",
      run: () => openIdea(i.id),
    }));
    return [...base, ...ideaCmds];
  }, [ideas, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands.filter((c) => c.group !== "Ideas").concat(commands.filter((c) => c.group === "Ideas").slice(0, 4));
    return commands.filter((c) => c.label.toLowerCase().includes(s)).slice(0, 12);
  }, [q, commands]);

  useEffect(() => setActive(0), [q]);

  const runActive = () => {
    const cmd = filtered[active];
    if (cmd) {
      cmd.run();
      setPalette(false);
    }
  };

  const groups = filtered.reduce<Record<string, Cmd[]>>((acc, c) => {
    (acc[c.group] ||= []).push(c);
    return acc;
  }, {});
  let idx = -1;

  return (
    <AnimatePresence>
      {paletteOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPalette(false)}
            className="fixed inset-0 z-[65] bg-bg/70 backdrop-blur-[1px]"
          />
          <div className="fixed inset-x-0 top-[12vh] z-[66] mx-auto w-[min(92vw,40rem)] px-2">
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-xl border border-line/12 bg-surface shadow-float"
            >
              <div className="flex items-center gap-3 border-b border-line/10 px-4">
                <Search size={18} className="text-muted" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActive((a) => Math.min(a + 1, filtered.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActive((a) => Math.max(a - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      runActive();
                    }
                  }}
                  placeholder="Search ideas or type a command…"
                  className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted/60"
                />
                <Kbd>Esc</Kbd>
              </div>
              <div className="max-h-[52vh] overflow-y-auto p-2">
                {filtered.length === 0 && <p className="p-6 text-center text-sm text-muted">No matches.</p>}
                {Object.entries(groups).map(([group, cmds]) => (
                  <div key={group} className="mb-1">
                    <p className="label px-3 py-1.5">{group}</p>
                    {cmds.map((c) => {
                      idx += 1;
                      const isActive = idx === active;
                      const myIdx = idx;
                      return (
                        <button
                          key={c.id}
                          onMouseEnter={() => setActive(myIdx)}
                          onClick={runActive}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] transition-colors",
                            isActive ? "bg-fg/[0.06] text-fg" : "text-fg/80 hover:bg-fg/[0.04]",
                          )}
                        >
                          <span className="text-muted">{c.icon}</span>
                          <span className="flex-1 truncate">{c.label}</span>
                          {c.hint && <span className="font-mono text-[10px] uppercase tracking-label text-muted">{c.hint}</span>}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
