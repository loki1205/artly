"""Populate the board with sample ideas so a fresh install looks alive.

Run:  python -m seed        (from the backend/ dir, after installing deps)
Overwrites the ideas/categories store (JSON files, or Supabase when configured)
with demo content. Images are not seeded (cards fall back to a gradient cover),
so no binary files are needed.
"""
from __future__ import annotations

import os
from pathlib import Path

from app.persistence import build_backend
from app.store import Store, new_id, now_iso

DATA_DIR = Path(os.environ.get("ARTLY_DATA_DIR", Path(__file__).resolve().parent / "data"))


def main() -> None:
    store = Store(build_backend(DATA_DIR))
    store.load()
    cats = list(store.categories.values())
    cat = {c["name"]: c["id"] for c in cats}

    demo = [
        ("Misty Fjord at Dawn", "Landscapes", "approved",
         ["landscape", "blue hour", "calm"],
         "Tiny 6x6cm canvas. Cool blues bleeding into a warm sunrise sliver on the water.",
         {"a": "like", "b": "like", "c": "like", "d": "neutral"}, ["Love the palette 🎨", "Would sell instantly."]),
        ("Neon Koi", "Abstract", "sketching",
         ["neon", "water", "flow"],
         "Fluid abstract koi in electric pinks and teals on black gesso.",
         {"a": "like", "b": "like", "c": "dislike", "d": "like", "e": "like"}, ["So bold 🔥"]),
        ("Grandmother's Hands", "Portraits", "idea",
         ["intimate", "warm", "story"],
         "Close crop of weathered hands holding tea. Muted gold + ivory.",
         {"a": "like", "b": "neutral", "c": "like"}, ["This one hits different.", "Yes please 🥹"]),
        ("Split Pomegranate", "Still Life", "painting",
         ["red", "texture", "contrast"],
         "Deep crimson seeds against a bruised navy backdrop. High texture.",
         {"a": "like", "b": "dislike", "c": "neutral", "d": "neutral"}, []),
        ("Storm Over Wheat", "Landscapes", "finished",
         ["drama", "gold", "sky"],
         "Golden field, indigo storm rolling in. Sold twice already as prints.",
         {"a": "like", "b": "like", "c": "like", "d": "like"}, ["A classic.", "Frame it 🖼️", "Chef's kiss"]),
        ("Fragmented Self", "Abstract", "idea",
         ["cubist", "identity"],
         "Cubist-ish face fractured into warm coral and forest-green shards.",
         {"a": "dislike", "b": "neutral", "c": "dislike"}, ["Not sure about this direction."]),
    ]

    store.ideas = {}
    for order, (title, catname, status, tags, notes, votes, comments) in enumerate(demo):
        iid = new_id()
        store.ideas[iid] = {
            "id": iid, "title": title, "category_id": cat.get(catname),
            "tags": tags, "notes": notes, "status": status,
            "images": [], "cover": None, "favorite": order in (0, 4),
            "votes": votes,
            "comments": [{"id": new_id(), "text": t, "author": f"seed{n}", "created_at": now_iso(), "updated_at": None}
                         for n, t in enumerate(comments)],
            "activity": [{"id": new_id(), "text": "Idea created", "at": now_iso()}],
            "order": float(order), "created_at": now_iso(), "updated_at": now_iso(),
            "deleted": False, "deleted_at": None,
        }
    store._persist_all()
    print(f"Seeded {len(store.ideas)} ideas across {len(store.categories)} categories -> {DATA_DIR}")


if __name__ == "__main__":
    main()
