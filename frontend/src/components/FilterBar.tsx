import { ArrowUpDown, Check, CheckSquare, ChevronDown, Star } from "lucide-react";
import { useCategories } from "../hooks/data";
import { BADGE_TINT, SORTS, STATUS_META, STATUS_ORDER } from "../lib/constants";
import { useUI } from "../stores/ui";
import { Chip } from "./ui/primitives";
import { Menu, MenuItem } from "./ui/overlay";
import { cn } from "../lib/utils";

const BADGES = [
  { key: "top_pick", label: "Top Pick" },
  { key: "strong", label: "Strong" },
  { key: "good", label: "Good" },
  { key: "mixed", label: "Mixed" },
  { key: "low", label: "Low" },
];

function Dot({ color }: { color: string }) {
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />;
}

function Dropdown({ label, children, className }: { label: React.ReactNode; children: (close: () => void) => React.ReactNode; className?: string }) {
  return (
    <Menu
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className={cn(
            "ring-focus flex w-full items-center justify-between gap-1.5 rounded-md border border-line/15 px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:border-line/25 hover:text-fg sm:w-auto sm:justify-start",
            className,
          )}
        >
          {label}
          <ChevronDown size={13} className="text-muted" />
        </button>
      )}
    >
      {children}
    </Menu>
  );
}

export function FilterBar() {
  const {
    categoryFilter,
    statusFilter,
    badgeFilter,
    favoritesOnly,
    sort,
    setFilter,
    selectMode,
    toggleSelectMode,
  } = useUI();
  const { data: categories = [] } = useCategories();

  const statusLabel = statusFilter === "all" ? "Status" : STATUS_META[statusFilter as keyof typeof STATUS_META].label;
  const badgeLabel = badgeFilter === "all" ? "Badge" : BADGES.find((b) => b.key === badgeFilter)?.label ?? "Badge";
  const sortLabel = SORTS.find((s) => s.value === sort)?.label ?? "Sort";

  return (
    <div className="mb-7 space-y-3">
      {/* categories — single row, horizontally scrollable, scrollbar hidden */}
      <div className="no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <Chip className="shrink-0 whitespace-nowrap" active={categoryFilter === "all"} onClick={() => setFilter({ categoryFilter: "all" })}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.id}
            color={c.color}
            className="shrink-0 whitespace-nowrap"
            active={categoryFilter === c.id}
            onClick={() => setFilter({ categoryFilter: categoryFilter === c.id ? "all" : c.id })}
          >
            {c.name}
          </Chip>
        ))}
      </div>

      {/* controls — two per row on mobile, inline on desktop */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Dropdown label={<span className={statusFilter !== "all" ? "text-fg" : ""}>{statusLabel}</span>}>
          {(close) => (
            <div>
              <MenuItem onClick={() => { setFilter({ statusFilter: "all" }); close(); }}>All statuses</MenuItem>
              {STATUS_ORDER.map((s) => (
                <MenuItem key={s} icon={<Dot color={STATUS_META[s].color} />} onClick={() => { setFilter({ statusFilter: s }); close(); }}>
                  <span className="flex-1">{STATUS_META[s].label}</span>
                  {statusFilter === s && <Check size={13} className="text-primary" />}
                </MenuItem>
              ))}
            </div>
          )}
        </Dropdown>

        <Dropdown label={<span className={badgeFilter !== "all" ? "text-fg" : ""}>{badgeLabel}</span>}>
          {(close) => (
            <div>
              <MenuItem onClick={() => { setFilter({ badgeFilter: "all" }); close(); }}>All badges</MenuItem>
              {BADGES.map((b) => (
                <MenuItem key={b.key} icon={<Dot color={BADGE_TINT[b.key]} />} onClick={() => { setFilter({ badgeFilter: b.key as any }); close(); }}>
                  <span className="flex-1">{b.label}</span>
                  {badgeFilter === b.key && <Check size={13} className="text-primary" />}
                </MenuItem>
              ))}
            </div>
          )}
        </Dropdown>

        <button
          onClick={() => setFilter({ favoritesOnly: !favoritesOnly })}
          className={cn(
            "ring-focus flex w-full items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] transition-colors sm:w-auto",
            favoritesOnly ? "border-primary/40 bg-primary/10 text-primary" : "border-line/15 text-muted hover:border-line/25 hover:text-fg",
          )}
        >
          <Star size={13} fill={favoritesOnly ? "currentColor" : "none"} /> Favorites
        </button>

        {/* view controls — right-aligned on desktop, part of the grid on mobile */}
        <div className="contents sm:ml-auto sm:flex sm:items-center sm:gap-2">
          <Dropdown
            label={
              <span className="flex items-center gap-1.5 text-fg">
                <ArrowUpDown size={13} /> {sortLabel}
              </span>
            }
          >
            {(close) => (
              <div>
                {SORTS.map((s) => (
                  <MenuItem key={s.value} onClick={() => { setFilter({ sort: s.value }); close(); }}>
                    <span className="flex-1">{s.label}</span>
                    {sort === s.value && <Check size={13} className="text-primary" />}
                  </MenuItem>
                ))}
              </div>
            )}
          </Dropdown>

          <button
            onClick={toggleSelectMode}
            className={cn(
              "ring-focus col-span-2 flex w-full items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] transition-colors sm:col-span-1 sm:w-auto",
              selectMode ? "border-primary/40 bg-primary/10 text-primary" : "border-line/15 text-muted hover:border-line/25 hover:text-fg",
            )}
          >
            <CheckSquare size={13} /> Select
          </button>
        </div>
      </div>
    </div>
  );
}
