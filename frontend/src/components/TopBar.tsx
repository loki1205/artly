import { Command, Plus, Search, Settings, Tags } from "lucide-react";
import type { ConnState } from "../lib/realtime";
import { useUI, type Route } from "../stores/ui";
import { cn } from "../lib/utils";
import { Button, TextInput } from "./ui/primitives";

const NAV: { route: Route; label: string }[] = [
  { route: "board", label: "Board" },
  { route: "dashboard", label: "Dashboard" },
  { route: "trash", label: "Trash" },
];

function LiveDot({ state }: { state: ConnState }) {
  const color = state === "online" ? "#6E8B6A" : state === "connecting" ? "#B08A4E" : "#B0524A";
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted" title={`Live sync: ${state}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      <span className="hidden sm:inline">Live</span>
    </span>
  );
}

export function TopBar({ conn, trashCount }: { conn: ConnState; trashCount: number }) {
  const { route, setRoute, search, setSearch, setCreateOpen, setPalette, setCategoryManager, setSettings } = useUI();

  return (
    <header className="sticky top-0 z-30 -mx-4 mb-8 border-b border-line/10 bg-bg/90 px-4 backdrop-blur-sm sm:-mx-8 sm:px-8">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 py-3 sm:h-16 sm:flex-nowrap sm:gap-x-6 sm:py-0">
        {/* wordmark */}
        <div className="order-1 flex items-center gap-3">
          <span className="h-3.5 w-3.5 rounded-[3px] bg-primary" />
          <span className="font-display text-[19px] font-bold tracking-tightest">Artly</span>
          <span className="ml-1 hidden md:block">
            <LiveDot state={conn} />
          </span>
        </div>

        {/* actions — stay on the first row (right) on every size */}
        <div className="order-2 ml-auto flex items-center gap-0.5 sm:order-4">
          <Button variant="ghost" size="icon" onClick={() => setPalette(true)} aria-label="Command palette" className="hidden sm:grid">
            <Command size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCategoryManager(true)} aria-label="Categories">
            <Tags size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSettings(true)} aria-label="Settings">
            <Settings size={16} />
          </Button>
          <Button variant="primary" onClick={() => setCreateOpen(true)} className="ml-1.5 hidden sm:inline-flex">
            <Plus size={16} />
            <span>New</span>
          </Button>
        </div>

        {/* nav — its own full-width row on mobile, inline on desktop */}
        <nav className="no-scrollbar order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto sm:order-2 sm:mx-0 sm:w-auto sm:overflow-visible">
          {NAV.map((n) => (
            <button
              key={n.route}
              onClick={() => setRoute(n.route)}
              className={cn(
                "ring-focus relative flex h-10 shrink-0 items-center gap-1.5 px-1 text-[13px] font-medium transition-colors sm:h-16",
                route === n.route ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              <span className="px-1.5">{n.label}</span>
              {n.route === "trash" && trashCount > 0 && (
                <span className="tnum rounded-full bg-fg/[0.08] px-1.5 py-0.5 text-[10px] text-muted">{trashCount}</span>
              )}
              {route === n.route && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary sm:-bottom-px" />}
            </button>
          ))}
        </nav>

        {/* search — full-width row on mobile, flexible inline on desktop */}
        {route === "board" && (
          <div className="relative order-4 w-full sm:order-3 sm:ml-2 sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
            <TextInput
              id="artly-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-9 pl-9"
            />
          </div>
        )}
      </div>
    </header>
  );
}
