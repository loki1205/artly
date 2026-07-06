"""In-memory store with a global write-lock over a pluggable backend.

Everything lives in memory; a single asyncio.Lock serializes every
read-modify-write so concurrent requests from multiple browsers can never
corrupt the data. On each change the whole affected collection is handed to a
persistence backend (see persistence.py):

- JSON files (the original, zero-setup default), or
- Supabase Postgres, when SUPABASE_URL + a key are configured.

The store's logic and public API are backend-agnostic — it only ever calls
backend.read() / backend.write(); it never touches files or SQL directly.
"""
from __future__ import annotations

import asyncio
import json
import secrets
from datetime import datetime, timezone
from typing import Any, Optional

DEFAULT_SETTINGS = {"theme": "light", "sound": False, "default_sort": "ranking"}
STATUSES = ["idea", "approved", "sketching", "painting", "finished", "sold", "archived"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return secrets.token_hex(10)


def status_str(value: Any) -> Any:
    """Normalize a status to its plain string value.

    IdeaCreate/IdeaUpdate carry a `str`-Enum (Status.approved); this yields the
    underlying value ("approved") so stored data and the timeline text stay
    plain strings instead of leaking "Status.approved". A plain string passes
    through unchanged.
    """
    return getattr(value, "value", value)


class Store:
    def __init__(self, backend) -> None:
        self.backend = backend
        self.ideas: dict[str, dict] = {}
        self.categories: dict[str, dict] = {}
        self.settings: dict = dict(DEFAULT_SETTINGS)
        self.lock = asyncio.Lock()

    # ---- persistence -------------------------------------------------------
    def load(self) -> None:
        self.backend.init()
        self.ideas = self.backend.read("ideas") or {}
        self.categories = self.backend.read("categories") or {}
        self.settings = {**DEFAULT_SETTINGS, **(self.backend.read("settings") or {})}
        if not self.categories:
            self._seed_categories()
        self._persist_all()

    def _persist(self, which: str) -> None:
        self.backend.write(which, getattr(self, which))

    def _persist_all(self) -> None:
        for which in ("ideas", "categories", "settings"):
            self._persist(which)

    def _seed_categories(self) -> None:
        defaults = [
            ("Landscapes", "#5E7A9B", "•"),
            ("Portraits", "#9B6A5C", "•"),
            ("Abstract", "#927B9B", "•"),
            ("Still Life", "#B08A4E", "•"),
        ]
        for name, color, emoji in defaults:
            cid = new_id()
            self.categories[cid] = {"id": cid, "name": name, "color": color, "emoji": emoji, "created_at": now_iso()}

    # ---- ideas -------------------------------------------------------------
    def _next_order(self) -> float:
        if not self.ideas:
            return 1.0
        return max((i.get("order", 0) for i in self.ideas.values()), default=0.0) + 1.0

    def _activity(self, idea: dict, text: str) -> None:
        idea.setdefault("activity", []).append({"id": new_id(), "text": text, "at": now_iso()})
        idea["activity"] = idea["activity"][-50:]

    def create_idea(self, data: dict) -> dict:
        iid = new_id()
        ts = now_iso()
        idea = {
            "id": iid,
            "title": data.get("title") or "Untitled idea",
            "category_id": data.get("category_id"),
            "tags": data.get("tags", []),
            "notes": data.get("notes", ""),
            "status": status_str(data.get("status", "idea")),
            "images": [],
            "cover": None,
            "favorite": False,
            "votes": {},
            "comments": [],
            "activity": [],
            "order": self._next_order(),
            "created_at": ts,
            "updated_at": ts,
            "deleted": False,
            "deleted_at": None,
        }
        self._activity(idea, "Idea created")
        self.ideas[iid] = idea
        self._persist("ideas")
        return idea

    def update_idea(self, iid: str, patch: dict) -> Optional[dict]:
        idea = self.ideas.get(iid)
        if not idea:
            return None
        prev_status = idea.get("status")
        for key in ("title", "category_id", "tags", "notes", "status", "favorite"):
            if key in patch and patch[key] is not None:
                idea[key] = patch[key]
        if "status" in patch and patch["status"] is not None:
            idea["status"] = status_str(patch["status"])
            if idea["status"] != prev_status:
                self._activity(idea, f"Status → {idea['status']}")
        idea["updated_at"] = now_iso()
        self._persist("ideas")
        return idea

    def soft_delete(self, iid: str) -> Optional[dict]:
        idea = self.ideas.get(iid)
        if not idea:
            return None
        idea["deleted"] = True
        idea["deleted_at"] = now_iso()
        idea["updated_at"] = now_iso()
        self._persist("ideas")
        return idea

    def restore(self, iid: str) -> Optional[dict]:
        idea = self.ideas.get(iid)
        if not idea:
            return None
        idea["deleted"] = False
        idea["deleted_at"] = None
        idea["updated_at"] = now_iso()
        self._persist("ideas")
        return idea

    def purge(self, iid: str) -> Optional[dict]:
        """Permanently remove. Returns the removed idea (for image cleanup)."""
        idea = self.ideas.pop(iid, None)
        if idea:
            self._persist("ideas")
        return idea

    def duplicate(self, iid: str) -> Optional[dict]:
        src = self.ideas.get(iid)
        if not src:
            return None
        ts = now_iso()
        nid = new_id()
        clone = {
            **json_clone(src),
            "id": nid,
            "title": f"{src['title']} (copy)",
            "votes": {},
            "comments": [],
            "activity": [],
            "order": self._next_order(),
            "created_at": ts,
            "updated_at": ts,
            "deleted": False,
            "deleted_at": None,
            # images are shared references (same files); keep filenames
        }
        self._activity(clone, "Duplicated from another idea")
        self.ideas[nid] = clone
        self._persist("ideas")
        return clone

    def set_vote(self, iid: str, client_id: str, vote: Optional[str]) -> Optional[dict]:
        idea = self.ideas.get(iid)
        if not idea:
            return None
        votes = idea.setdefault("votes", {})
        if vote is None:
            votes.pop(client_id, None)
        else:
            votes[client_id] = vote
        idea["updated_at"] = now_iso()
        self._persist("ideas")
        return idea

    def reorder(self, order: list[str]) -> None:
        for index, iid in enumerate(order):
            if iid in self.ideas:
                self.ideas[iid]["order"] = float(index)
        self._persist("ideas")

    # ---- images ------------------------------------------------------------
    def add_image(self, iid: str, filename: str) -> Optional[dict]:
        idea = self.ideas.get(iid)
        if not idea:
            return None
        idea.setdefault("images", []).append(filename)
        if not idea.get("cover"):
            idea["cover"] = filename
        idea["updated_at"] = now_iso()
        self._activity(idea, "Added a reference image")
        self._persist("ideas")
        return idea

    def remove_image(self, iid: str, filename: str) -> Optional[dict]:
        idea = self.ideas.get(iid)
        if not idea or filename not in idea.get("images", []):
            return None
        idea["images"].remove(filename)
        if idea.get("cover") == filename:
            idea["cover"] = idea["images"][0] if idea["images"] else None
        idea["updated_at"] = now_iso()
        self._persist("ideas")
        return idea

    def set_cover(self, iid: str, filename: str) -> Optional[dict]:
        idea = self.ideas.get(iid)
        if not idea or filename not in idea.get("images", []):
            return None
        idea["cover"] = filename
        idea["updated_at"] = now_iso()
        self._persist("ideas")
        return idea

    def reorder_images(self, iid: str, order: list[str]) -> Optional[dict]:
        idea = self.ideas.get(iid)
        if not idea:
            return None
        current = set(idea.get("images", []))
        new_order = [f for f in order if f in current]
        # keep any not mentioned at the end
        new_order += [f for f in idea.get("images", []) if f not in new_order]
        idea["images"] = new_order
        idea["updated_at"] = now_iso()
        self._persist("ideas")
        return idea

    # ---- comments ----------------------------------------------------------
    def add_comment(self, iid: str, client_id: str, text: str) -> Optional[dict]:
        idea = self.ideas.get(iid)
        if not idea:
            return None
        comment = {"id": new_id(), "text": text, "author": client_id, "created_at": now_iso(), "updated_at": None}
        idea.setdefault("comments", []).append(comment)
        idea["updated_at"] = now_iso()
        self._activity(idea, "New comment")
        self._persist("ideas")
        return idea

    def edit_comment(self, comment_id: str, text: str) -> Optional[dict]:
        for idea in self.ideas.values():
            for c in idea.get("comments", []):
                if c["id"] == comment_id:
                    c["text"] = text
                    c["updated_at"] = now_iso()
                    idea["updated_at"] = now_iso()
                    self._persist("ideas")
                    return idea
        return None

    def delete_comment(self, comment_id: str) -> Optional[dict]:
        for idea in self.ideas.values():
            comments = idea.get("comments", [])
            for c in comments:
                if c["id"] == comment_id:
                    comments.remove(c)
                    idea["updated_at"] = now_iso()
                    self._persist("ideas")
                    return idea
        return None

    # ---- categories --------------------------------------------------------
    def create_category(self, data: dict) -> dict:
        cid = new_id()
        cat = {"id": cid, "name": data["name"], "color": data.get("color", "#7C6BF2"),
               "emoji": data.get("emoji", "🎨"), "created_at": now_iso()}
        self.categories[cid] = cat
        self._persist("categories")
        return cat

    def update_category(self, cid: str, patch: dict) -> Optional[dict]:
        cat = self.categories.get(cid)
        if not cat:
            return None
        for key in ("name", "color", "emoji"):
            if key in patch and patch[key] is not None:
                cat[key] = patch[key]
        self._persist("categories")
        return cat

    def category_in_use(self, cid: str) -> bool:
        return any(i.get("category_id") == cid for i in self.ideas.values())

    def delete_category(self, cid: str) -> bool:
        if cid in self.categories:
            del self.categories[cid]
            self._persist("categories")
            return True
        return False

    # ---- settings ----------------------------------------------------------
    def update_settings(self, patch: dict) -> dict:
        for key in ("theme", "sound", "default_sort"):
            if key in patch and patch[key] is not None:
                self.settings[key] = patch[key]
        self._persist("settings")
        return self.settings

    # ---- bulk --------------------------------------------------------------
    def bulk(self, ids: list[str], action: str, category_id: Optional[str]) -> None:
        for iid in ids:
            idea = self.ideas.get(iid)
            if not idea:
                continue
            if action == "archive":
                idea["status"] = "archived"
            elif action == "delete":
                idea["deleted"] = True
                idea["deleted_at"] = now_iso()
            elif action == "move_category":
                idea["category_id"] = category_id
            elif action == "favorite":
                idea["favorite"] = True
            elif action == "unfavorite":
                idea["favorite"] = False
            idea["updated_at"] = now_iso()
        self._persist("ideas")

    # ---- import / export ---------------------------------------------------
    def replace_all(self, ideas: dict, categories: dict, settings: dict | None) -> None:
        self.ideas = ideas
        self.categories = categories
        if settings:
            self.settings = {**DEFAULT_SETTINGS, **settings}
        self._persist_all()


def json_clone(obj: Any) -> Any:
    return json.loads(json.dumps(obj))
