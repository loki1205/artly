# Deploying Artly

Two supported ways to run Artly:

1. **On your local network (LAN)** — share it with devices on the same Wi-Fi. No
   cloud, no accounts, ~2 minutes.
2. **On the web** — frontend on **Vercel**, data in **Supabase Postgres**, backend
   on any small always-on host.

---

## Run on your local network (LAN)

Want people on the same Wi-Fi to open the app from their phones/laptops without
deploying anywhere? Run the single-server build bound to all network interfaces.

1. **Build the frontend once** so the backend serves the SPA + API + WebSocket
   from one port:
   ```bash
   cd frontend && npm install && npm run build
   ```
2. **Start the backend on all interfaces** (`0.0.0.0`, not `127.0.0.1` — that's
   what makes it reachable from other devices):
   ```bash
   cd ../backend
   python -m venv .venv && .venv/Scripts/activate   # first time, Windows
   pip install -r requirements.txt
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
3. **Find this machine's LAN IP:**
   - Windows: `ipconfig` → the Wi-Fi adapter's *IPv4 Address* (e.g. `192.168.1.31`)
   - macOS: `ipconfig getifaddr en0` · Linux: `hostname -I`
4. **Open the firewall for the port** (first time only). On **Windows**, in an
   **Administrator** PowerShell:
   ```powershell
   New-NetFirewallRule -DisplayName "Artly 8000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8000 -Profile Any
   ```
   Remove it later with `Remove-NetFirewallRule -DisplayName "Artly 8000"`.
5. On any device on the same network, open **`http://<your-ip>:8000`**
   (e.g. `http://192.168.1.31:8000`). The API and live-sync WebSocket target the
   page's own origin automatically, so there's nothing else to configure. Open it
   on two devices to see real-time sync.

**Gotchas**
- All devices must be on the **same** network.
- **Public / guest / office Wi-Fi** often enables *client isolation* (AP
  isolation), which blocks device-to-device traffic entirely — no firewall change
  fixes that. Use a home router or a personal hotspot instead.
- Keep the host machine awake and the process running, or the site goes down.
- This serves plain **http** over the LAN — fine for a trusted local network. For
  anything internet-facing, use the web deploy below (HTTPS comes from Vercel and
  your backend host).

---

## Deploy to the web — Vercel (frontend) + Supabase (data)

Board data (ideas, votes, comments, categories, settings) lives in **Supabase
Postgres**, the UI is served from Vercel's CDN at `your-app.vercel.app`, and the
FastAPI backend runs on a small **free** always-on host. ~15 minutes, no code
changes needed.

> **Why isn't the backend on Vercel too?** It can't be. Vercel's functions are
> *serverless*: they can't hold the open **WebSocket** Artly uses for live sync,
> and their filesystem is ephemeral. Artly's backend is a long-running process,
> so it needs a tiny always-on host. The good news: because the **data** lives in
> Supabase, that host needs **no paid disk** — a free instance is enough. (Only
> *uploaded images* still sit on the backend's local disk — see the image caveat.)

**0 — Get the code on GitHub.**
```bash
cd artly
git init && git add . && git commit -m "Artly"
git remote add origin https://github.com/<you>/artly.git && git push -u origin main
```
Both Vercel and the backend host deploy straight from this repo. A `.gitignore`
keeps `node_modules`, `.venv`, `dist`, local `data/`, and `.env` out of commits.

**1 — Supabase (create the database).**
   1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
   2. **SQL Editor → New query**, paste the contents of
      [`backend/schema.sql`](backend/schema.sql), and **Run**. This creates the
      `ideas`, `categories`, and `settings` tables.
   3. **Settings → API** and copy two values:
      - **Project URL** → `SUPABASE_URL` (e.g. `https://abcd1234.supabase.co`)
      - **`service_role` secret** → `SUPABASE_SERVICE_KEY`
        *(server-side only — it bypasses Row Level Security, so never put it in
        the frontend or commit it).*

**2 — Backend on a small always-on host (do this before Vercel; you need its URL).**
   Using **Render** as the example (Railway / Fly.io / any small VPS work the same
   way — install deps, run uvicorn):
   1. New → **Web Service** → connect the GitHub repo from step 0.
   2. **Root Directory:** `backend`
   3. **Build Command:** `pip install -r requirements.txt`
   4. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   5. **Instance type:** **Free** — no disk needed, because data is in Supabase.
   6. **Environment variables:**
      `SUPABASE_URL = https://<your-project>.supabase.co`
      `SUPABASE_SERVICE_KEY = <your service_role key>`
   7. Deploy, then copy the service URL, e.g. `https://artly-api.onrender.com`.
   8. (Optional) run `python -m seed` from the host's shell to load 6 sample ideas
      **into Supabase** (the seed uses the same env vars).
   9. Sanity check: `https://artly-api.onrender.com/api/health` → `{"ok":true,...}`.

   > **Image caveat.** Reference images you *upload* are stored on the backend's
   > local disk, which is ephemeral on a free instance — they're lost on restart
   > or redeploy (your ideas/votes/comments in Supabase are **not**). If you rely
   > on uploaded images, attach a small disk on the host and set
   > `ARTLY_DATA_DIR=/data`, or add images by URL instead.

**3 — Frontend on Vercel.**
   1. Vercel → **Add New → Project** → import the repo.
   2. Set **Root Directory = `frontend`** (so `frontend/vercel.json` is used — it
      rewrites all routes to `index.html` for the SPA). Vite is auto-detected
      (build `npm run build`, output `dist`).
   3. Add an **Environment Variable**:
      `VITE_API_URL = https://artly-api.onrender.com`  *(https, no trailing slash —
      an HTTPS page can only open a secure `wss://` socket)*
   4. **Deploy.** Open the resulting `*.vercel.app` URL.

   > ⚠️ `VITE_*` vars are inlined **at build time**, not runtime. If you change
   > `VITE_API_URL`, trigger a **fresh deploy/rebuild** — a cached build won't pick
   > it up.

**4 — Verify.** The header's "Live" dot should be **green** (WebSocket connected).
Open two tabs and confirm creating/voting syncs live. In Supabase, open
**Table Editor → ideas** and watch rows appear as you add ideas. If the dot is red
or data won't load: the backend URL is wrong, the backend is down, it's `http://`
(mixed-content blocked), or CORS is restricted.

The backend sends permissive CORS (`Access-Control-Allow-Origin: *`) and
authenticates via the `X-Client-Id` header (no cookies), so a cross-origin
frontend works out of the box. To lock it down, edit `allow_origins` in
`backend/app/main.py` to your Vercel URL.

---

## Environment variables

| Var | Where | Purpose | Default |
| --- | --- | --- | --- |
| `SUPABASE_URL` | backend | Supabase project URL. Set with the key below to store data in Postgres. Unset → JSON files. | *(unset)* |
| `SUPABASE_SERVICE_KEY` | backend | Supabase **service_role** key (server-side only; bypasses RLS — never expose to the browser). | *(unset)* |
| `VITE_API_URL` | frontend build | Backend origin when the frontend is hosted separately (Vercel). Leave **unset** for the same-origin LAN build. | `""` (same origin) |
| `ARTLY_DATA_DIR` | backend | Folder for uploaded images (and the JSON files when Supabase is off). Point at a mounted disk if you need durable images. | `backend/data` |
| `ARTLY_FRONTEND_DIST` | backend | Path to the built SPA the backend serves (LAN / single-server mode). | `../frontend/dist` |
| `PORT` | backend | Port to bind; injected by most hosts. | `8000` |

### Using Supabase for data
Run [`backend/schema.sql`](backend/schema.sql) in the Supabase SQL editor, then
set `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` on the backend. It then keeps
ideas/categories/settings in Postgres — so board data survives with **no
persistent disk**. With those env vars unset, the backend falls back to JSON files
automatically. For local dev, copy `backend/.env.example` → `backend/.env` and
fill it in (`.env` is git-ignored).

## Why the backend needs its own host
Pointing Artly at Supabase moves the *data* off local disk, but two things still
require a long-running process (so it can't be pure serverless): the **WebSocket**
live-sync (a persistent connection), and **image uploads** (written to local
disk). That's why the backend runs on a small always-on host while Vercel serves
the static frontend. Moving images to object storage (S3/R2/Supabase Storage) and
swapping the WebSocket for hosted pub/sub would remove that requirement — a larger
change, not needed for a small board.
