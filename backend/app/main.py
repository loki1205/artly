"""Artly backend — FastAPI.

Serves the REST API, a WebSocket for live sync, uploaded images (with thumbnails),
and — in production — the built frontend, all from one process. Persistence is
pluggable: Supabase (Postgres for data + Storage for images) when configured,
else JSON files + a local images folder guarded by a single write-lock.
"""
from __future__ import annotations

import io
import json
import os
import zipfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Request,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from . import images as imagelib
from . import models as m
from .imagestore import build_image_store
from .persistence import build_backend
from .realtime import hub
from .serializers import public_idea, public_ideas
from .store import STATUSES, Store

DATA_DIR = Path(os.environ.get("ARTLY_DATA_DIR", Path(__file__).resolve().parent.parent / "data"))
FRONTEND_DIST = Path(os.environ.get("ARTLY_FRONTEND_DIST", Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"))

# Persists to Supabase Postgres when SUPABASE_URL + a key are set, else JSON files.
store = Store(build_backend(DATA_DIR))
# Uploaded image files: Supabase Storage when configured, else local disk. Keeps
# images durable on diskless hosts (the JSON data alone surviving isn't enough —
# it references image files that a local disk loses on restart).
imgstore = build_image_store(DATA_DIR)


@asynccontextmanager
async def lifespan(app: FastAPI):
    store.load()
    yield


app = FastAPI(title="Artly", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def client_id(x_client_id: Optional[str] = Header(default=None)) -> Optional[str]:
    return x_client_id


async def notify(resource: str, origin: Optional[str] = None) -> None:
    await hub.broadcast(resource, origin)


# ---- health ----------------------------------------------------------------
@app.get("/api/health")
async def health():
    return {"ok": True, "statuses": STATUSES}


# ---- ideas -----------------------------------------------------------------
@app.get("/api/ideas")
async def list_ideas(trash: bool = False, cid: Optional[str] = Depends(client_id)):
    items = [i for i in store.ideas.values() if bool(i.get("deleted")) == trash]
    items.sort(key=lambda i: i.get("order", 0))
    return public_ideas(items, cid)


@app.get("/api/ideas/{iid}")
async def get_idea(iid: str, cid: Optional[str] = Depends(client_id)):
    idea = store.ideas.get(iid)
    if not idea:
        raise HTTPException(404, "Idea not found")
    return public_idea(idea, cid)


@app.post("/api/ideas", status_code=201)
async def create_idea(body: m.IdeaCreate, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        idea = store.create_idea(body.model_dump())
    await notify("ideas", cid)
    return public_idea(idea, cid)


@app.put("/api/ideas/reorder")
async def reorder_ideas(body: m.ReorderBody, cid: Optional[str] = Depends(client_id)):
    # NOTE: must be declared before PUT /api/ideas/{iid}, otherwise Starlette
    # matches "reorder" as an {iid} and this endpoint is shadowed (404).
    async with store.lock:
        store.reorder(body.order)
    await notify("ideas", cid)
    return {"ok": True}


@app.put("/api/ideas/{iid}")
async def update_idea(iid: str, body: m.IdeaUpdate, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        idea = store.update_idea(iid, body.model_dump(exclude_unset=True))
    if not idea:
        raise HTTPException(404, "Idea not found")
    await notify("ideas", cid)
    return public_idea(idea, cid)


@app.delete("/api/ideas/{iid}")
async def delete_idea(iid: str, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        idea = store.soft_delete(iid)
    if not idea:
        raise HTTPException(404, "Idea not found")
    await notify("ideas", cid)
    return public_idea(idea, cid)


@app.post("/api/ideas/{iid}/restore")
async def restore_idea(iid: str, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        idea = store.restore(iid)
    if not idea:
        raise HTTPException(404, "Idea not found")
    await notify("ideas", cid)
    return public_idea(idea, cid)


@app.delete("/api/ideas/{iid}/permanent")
async def purge_idea(iid: str, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        idea = store.purge(iid)
        if idea:
            for f in idea.get("images", []):
                imgstore.delete(f)
    if not idea:
        raise HTTPException(404, "Idea not found")
    await notify("ideas", cid)
    return {"ok": True}


@app.post("/api/ideas/{iid}/duplicate", status_code=201)
async def duplicate_idea(iid: str, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        idea = store.duplicate(iid)
    if not idea:
        raise HTTPException(404, "Idea not found")
    await notify("ideas", cid)
    return public_idea(idea, cid)


@app.post("/api/ideas/{iid}/vote")
async def vote(iid: str, body: m.VoteBody, cid: Optional[str] = Depends(client_id)):
    if not cid:
        raise HTTPException(400, "Missing X-Client-Id header")
    async with store.lock:
        idea = store.set_vote(iid, cid, body.vote)
    if not idea:
        raise HTTPException(404, "Idea not found")
    await notify("ideas", cid)
    return public_idea(idea, cid)


@app.post("/api/ideas/bulk")
async def bulk(body: m.BulkAction, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        store.bulk(body.ids, body.action, body.category_id)
    await notify("ideas", cid)
    return {"ok": True}


# ---- images ----------------------------------------------------------------
@app.post("/api/ideas/{iid}/images")
async def upload_images(
    iid: str,
    files: list[UploadFile] = File(default=[]),
    url: Optional[str] = Form(default=None),
    cid: Optional[str] = Depends(client_id),
):
    if iid not in store.ideas:
        raise HTTPException(404, "Idea not found")
    added: list[str] = []
    errors: list[str] = []
    for f in files:
        raw = await f.read()
        try:
            ext = Path(f.filename or "").suffix
            name = imgstore.save(raw, ext)
            async with store.lock:
                store.add_image(iid, name)
            added.append(name)
        except imagelib.ImageError as exc:
            errors.append(f"{f.filename}: {exc}")
    if url:
        try:
            name = imgstore.save_from_url(url)
            async with store.lock:
                store.add_image(iid, name)
            added.append(name)
        except imagelib.ImageError as exc:
            errors.append(str(exc))
    if not added and errors:
        raise HTTPException(400, "; ".join(errors))
    await notify("ideas", cid)
    idea = store.ideas.get(iid)
    return {"added": added, "errors": errors, "idea": public_idea(idea, cid)}


@app.delete("/api/ideas/{iid}/images/{filename}")
async def delete_image(iid: str, filename: str, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        idea = store.remove_image(iid, filename)
        still_used = any(filename in i.get("images", []) for i in store.ideas.values())
    if not idea:
        raise HTTPException(404, "Image not found on idea")
    if not still_used:
        imgstore.delete(filename)
    await notify("ideas", cid)
    return public_idea(idea, cid)


@app.put("/api/ideas/{iid}/cover")
async def set_cover(iid: str, body: m.CoverBody, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        idea = store.set_cover(iid, body.filename)
    if not idea:
        raise HTTPException(404, "Image not found on idea")
    await notify("ideas", cid)
    return public_idea(idea, cid)


@app.put("/api/ideas/{iid}/images/reorder")
async def reorder_images(iid: str, body: m.ImageReorderBody, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        idea = store.reorder_images(iid, body.order)
    if not idea:
        raise HTTPException(404, "Idea not found")
    await notify("ideas", cid)
    return public_idea(idea, cid)


# ---- comments --------------------------------------------------------------
@app.post("/api/ideas/{iid}/comments", status_code=201)
async def add_comment(iid: str, body: m.CommentBody, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        idea = store.add_comment(iid, cid or "anon", body.text)
    if not idea:
        raise HTTPException(404, "Idea not found")
    await notify("ideas", cid)
    return public_idea(idea, cid)


@app.put("/api/comments/{comment_id}")
async def edit_comment(comment_id: str, body: m.CommentBody, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        idea = store.edit_comment(comment_id, body.text)
    if not idea:
        raise HTTPException(404, "Comment not found")
    await notify("ideas", cid)
    return public_idea(idea, cid)


@app.delete("/api/comments/{comment_id}")
async def delete_comment(comment_id: str, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        idea = store.delete_comment(comment_id)
    if not idea:
        raise HTTPException(404, "Comment not found")
    await notify("ideas", cid)
    return public_idea(idea, cid)


# ---- categories ------------------------------------------------------------
@app.get("/api/categories")
async def list_categories():
    return list(store.categories.values())


@app.post("/api/categories", status_code=201)
async def create_category(body: m.CategoryCreate, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        cat = store.create_category(body.model_dump())
    await notify("categories", cid)
    return cat


@app.put("/api/categories/{cid_}")
async def update_category(cid_: str, body: m.CategoryUpdate, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        cat = store.update_category(cid_, body.model_dump(exclude_unset=True))
    if not cat:
        raise HTTPException(404, "Category not found")
    await notify("categories", cid)
    return cat


@app.delete("/api/categories/{cid_}")
async def delete_category(cid_: str, cid: Optional[str] = Depends(client_id)):
    if store.category_in_use(cid_):
        raise HTTPException(409, "Category is in use and cannot be deleted")
    async with store.lock:
        ok = store.delete_category(cid_)
    if not ok:
        raise HTTPException(404, "Category not found")
    await notify("categories", cid)
    return {"ok": True}


# ---- settings --------------------------------------------------------------
@app.get("/api/settings")
async def get_settings():
    return store.settings


@app.put("/api/settings")
async def put_settings(body: m.SettingsUpdate, cid: Optional[str] = Depends(client_id)):
    async with store.lock:
        s = store.update_settings(body.model_dump(exclude_unset=True))
    await notify("settings", cid)
    return s


# ---- dashboard stats -------------------------------------------------------
@app.get("/api/stats")
async def stats():
    live = [i for i in store.ideas.values() if not i.get("deleted")]
    by_status = {s: 0 for s in STATUSES}
    for i in live:
        by_status[i.get("status", "idea")] = by_status.get(i.get("status", "idea"), 0) + 1
    cat_counts: dict[str, int] = {}
    for i in live:
        c = i.get("category_id")
        if c:
            cat_counts[c] = cat_counts.get(c, 0) + 1
    top_cat_id = max(cat_counts, key=cat_counts.get) if cat_counts else None
    most_discussed = max(live, key=lambda i: len(i.get("comments", [])), default=None)
    recent = sorted(live, key=lambda i: i.get("updated_at") or "", reverse=True)[:5]
    return {
        "total": len(live),
        "by_status": by_status,
        "favorites": sum(1 for i in live if i.get("favorite")),
        "top_category_id": top_cat_id,
        "top_category_name": store.categories.get(top_cat_id, {}).get("name") if top_cat_id else None,
        "most_discussed": {"id": most_discussed["id"], "title": most_discussed["title"],
                           "comment_count": len(most_discussed.get("comments", []))}
        if most_discussed and most_discussed.get("comments") else None,
        "recent": [{"id": i["id"], "title": i["title"], "updated_at": i["updated_at"]} for i in recent],
        "trash_count": sum(1 for i in store.ideas.values() if i.get("deleted")),
    }


# ---- export / import -------------------------------------------------------
@app.get("/api/export")
async def export_board():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("ideas.json", json.dumps(store.ideas, ensure_ascii=False, indent=2))
        z.writestr("categories.json", json.dumps(store.categories, ensure_ascii=False, indent=2))
        z.writestr("settings.json", json.dumps(store.settings, ensure_ascii=False, indent=2))
        for relpath, data in imgstore.export_files():
            z.writestr(f"images/{relpath}", data)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=Artly.zip"},
    )


@app.post("/api/import")
async def import_board(file: UploadFile = File(...), cid: Optional[str] = Depends(client_id)):
    raw = await file.read()
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            names = set(z.namelist())
            ideas = json.loads(z.read("ideas.json")) if "ideas.json" in names else {}
            categories = json.loads(z.read("categories.json")) if "categories.json" in names else {}
            settings = json.loads(z.read("settings.json")) if "settings.json" in names else None
            for name in names:
                if name.startswith("images/") and not name.endswith("/"):
                    imgstore.import_file(name[len("images/"):], z.read(name))
    except (zipfile.BadZipFile, KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(400, f"Invalid Artly export: {exc}")
    async with store.lock:
        store.replace_all(ideas, categories, settings)
    await notify("ideas", cid)
    await notify("categories", cid)
    return {"ok": True, "ideas": len(ideas), "categories": len(categories)}


# ---- websocket -------------------------------------------------------------
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await hub.connect(ws)
    try:
        while True:
            await ws.receive_text()  # keepalive / ignore client messages
    except WebSocketDisconnect:
        await hub.disconnect(ws)
    except Exception:  # noqa: BLE001
        await hub.disconnect(ws)


# ---- static: uploaded images + built frontend ------------------------------
@app.get("/uploads/{key:path}")
async def serve_upload(key: str):
    """Serve an uploaded image by key (``<file>`` or ``thumbs/<file>``).

    Supabase-backed: 307-redirect to the public object URL. Local disk: serve
    the file. The frontend builds these /uploads URLs itself, so it stays the
    same regardless of backend.
    """
    if imgstore.redirects:
        return RedirectResponse(
            imgstore.public_url(key),
            status_code=307,
            headers={"Cache-Control": "public, max-age=3600"},
        )
    path = imgstore.local_path(key)
    if path is None or not path.is_file():
        raise HTTPException(404, "Not found")
    return FileResponse(path)


if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str, request: Request):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
