# Artly 🎨

A premium collaborative **idea discussion board** where a small group of artists
decide together which miniature canvas paintings to create and sell.

- **Anonymous** — no login, no usernames. Each browser gets a random UUID in
  localStorage. Votes are one-per-browser; identities are never shown.
- **Badge-only ranking** — raw vote counts are never displayed. Ideas show a
  qualitative badge (🔥 Top Pick · ⭐ Strong Choice · 👍 Good Choice · 🤔 Mixed ·
  👎 Low Priority), computed from votes once an idea has ≥3 votes.
- **Real-time** — every change broadcasts over WebSocket; all open browsers
  update with no manual refresh.
- **Pluggable persistence** — ideas/categories/settings live in JSON files by
  default (zero setup), or in **Supabase Postgres** when configured. Either way
  a single write-lock serializes changes so concurrent writes can't corrupt the
  data. Uploaded images always live in a local images folder.

## Stack
- **Frontend:** React + Vite + TypeScript + TailwindCSS + Framer Motion +
  TanStack Query + Zustand + dnd-kit + lucide-react.
- **Backend:** FastAPI + Pydantic + Uvicorn + Pillow (thumbnails).

## Run it (two terminals)

### 1. Backend  →  http://localhost:8000
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate            # Windows;  source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
python -m seed                    # optional: 6 sample ideas so the board isn't empty
python -m uvicorn app.main:app --port 8000 --reload
```

### 2. Frontend  →  http://localhost:5173
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173**. The Vite dev server proxies `/api`, `/uploads`,
and `/ws` to the backend on :8000. Open two tabs to see real-time sync.

## Single-server (production) mode
Build the frontend, then the backend serves the API, WebSocket, uploaded images,
**and** the built SPA from one port:
```bash
cd frontend && npm run build      # emits frontend/dist
cd ../backend && python -m uvicorn app.main:app --port 8000
```
Open **http://localhost:8000**. To expose on your LAN, add `--host 0.0.0.0`.

## Data
By default everything lives under `backend/data/`:
```
ideas.json        categories.json        settings.json
images/           images/thumbs/         (uploaded reference images + thumbnails)
```
Export/Import (a zip of all of the above) is available in **Settings** or via
`GET /api/export` / `POST /api/import`.

### Supabase (optional)
Point the backend at Supabase Postgres for ideas/categories/settings instead of
the JSON files (uploaded images stay local either way):

1. In the [Supabase](https://supabase.com) SQL editor, run
   [`backend/schema.sql`](backend/schema.sql) to create the three tables.
2. `cp backend/.env.example backend/.env` and fill in `SUPABASE_URL` and
   `SUPABASE_SERVICE_KEY` from **Settings → API** (use the *service_role* key —
   it's server-side only and must never reach the browser).
3. Start the backend as usual. On boot it detects the env vars and uses
   Supabase; with them unset it falls back to JSON files. `python -m seed` seeds
   whichever backend is active.

The API, WebSocket live-sync, and the entire frontend are unchanged — only where
the data is stored differs.

## Deploy
See **[DEPLOYMENT.md](DEPLOYMENT.md)**. In short, two paths: run it on your
**local network** (`uvicorn --host 0.0.0.0`, open the firewall port, share your
IP), or on the **web** — static frontend on **Vercel**, data in **Supabase
Postgres**, and the WebSocket backend on any small always-on host (Render / Railway
/ Fly / VPS).

## Keyboard shortcuts
`⌘/Ctrl + K` command palette · `N` new idea · `/` focus search · `Esc` close ·
with an idea open: `F` favorite, `D` duplicate, `Delete` move to trash.

---
Built by hand to the Artly spec. (An earlier attempt via the `appgen` pipeline
produced a Node/vanilla-JS app instead of the required React/FastAPI stack, so it
was discarded — see `Artly.txt` for the original brief.)
