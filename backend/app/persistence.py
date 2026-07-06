"""Pluggable persistence backends for the Store.

The Store keeps everything in memory behind a write-lock and, on every change,
persists the *whole* affected collection (ideas / categories / settings). That
contract is unchanged here — a backend just decides where those collections
live:

- JsonBackend     — JSON files in a data dir (the original, zero-setup default).
- SupabaseBackend — three Postgres tables in Supabase, each a (id, data jsonb)
                    key/value shape that mirrors the in-memory dicts 1:1.

build_backend() picks one from the environment: if SUPABASE_URL and a key are
set it uses Supabase, otherwise it falls back to JSON files so local dev and the
export/import zip keep working with no extra setup.
"""
from __future__ import annotations

import json
import os
import secrets
from pathlib import Path
from typing import Any

# Collections the Store persists. ideas/categories are {id: obj}; settings is a
# single flat dict.
COLLECTIONS = ("ideas", "categories", "settings")
_SETTINGS_ROW_ID = "app"  # settings is a single row in its table


class JsonBackend:
    """Atomic JSON files — write temp then os.replace, exactly as before."""

    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self._paths = {
            "ideas": data_dir / "ideas.json",
            "categories": data_dir / "categories.json",
            "settings": data_dir / "settings.json",
        }

    def init(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def read(self, which: str) -> Any:
        try:
            with open(self._paths[which], "r", encoding="utf-8") as fh:
                return json.load(fh)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def write(self, which: str, data: Any) -> None:
        path = self._paths[which]
        tmp = path.with_suffix(path.suffix + f".tmp{secrets.token_hex(4)}")
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)


class SupabaseBackend:
    """Three Postgres tables in Supabase, each shaped (id text pk, data jsonb).

    ideas/categories rows map to the in-memory {id: obj} dicts; settings is a
    single row (id='app'). On write we reconcile the whole table — upsert every
    current row, then delete rows that no longer exist — so the JSON store's
    "rewrite the whole file" semantics (including deletes) are preserved. See
    schema.sql for the DDL to run in the Supabase SQL editor.
    """

    def __init__(self, url: str, key: str) -> None:
        # Imported lazily so the JSON path has no hard dependency on supabase.
        from supabase import create_client

        self.client = create_client(url, key)

    def init(self) -> None:
        # Tables are provisioned via schema.sql; nothing to create at runtime.
        pass

    def read(self, which: str) -> Any:
        if which == "settings":
            resp = self.client.table("settings").select("data").eq("id", _SETTINGS_ROW_ID).execute()
            rows = resp.data or []
            return rows[0]["data"] if rows else {}
        resp = self.client.table(which).select("id,data").execute()
        return {row["id"]: row["data"] for row in (resp.data or [])}

    def write(self, which: str, data: Any) -> None:
        if which == "settings":
            self.client.table("settings").upsert(
                {"id": _SETTINGS_ROW_ID, "data": data}
            ).execute()
            return

        table = self.client.table(which)
        ids = list(data.keys())
        if ids:
            table.upsert([{"id": k, "data": v} for k, v in data.items()]).execute()
            # Drop rows that were removed in memory (purge / delete_category).
            table.delete().not_.in_("id", ids).execute()
        else:
            # Empty collection — clear the table. A delete needs a filter, so
            # match every real id: all ids are non-empty, so id <> '' is true
            # for every row. (Avoid a NUL sentinel — Postgres text rejects \x00.)
            table.delete().neq("id", "").execute()


def _load_dotenv() -> None:
    """Best-effort load of a backend/.env file so env vars can live in a file.

    Optional: if python-dotenv isn't installed we just rely on real env vars.
    """
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    # backend/.env — two levels up from this file (app/persistence.py).
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def build_backend(data_dir: Path):
    """Return a Supabase backend if configured, else the JSON file backend."""
    _load_dotenv()
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")
    if url and key:
        return SupabaseBackend(url, key)
    return JsonBackend(data_dir)
