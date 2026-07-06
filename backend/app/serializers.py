"""Public serialization. Strips the raw votes map and never emits counts.

We surface only:
  - ranking: the derived badge (with a private score used for sorting)
  - my_vote: the requesting browser's own vote (so it can highlight its choice)
  - comment_count / image_count: safe cardinalities (NOT vote counts)
"""
from __future__ import annotations

from typing import Optional

from .ranking import compute_ranking


def public_idea(idea: dict, client_id: Optional[str]) -> dict:
    votes = idea.get("votes", {})
    ranking = compute_ranking(votes)
    comments = idea.get("comments", [])
    return {
        "id": idea["id"],
        "title": idea.get("title", ""),
        "category_id": idea.get("category_id"),
        "tags": idea.get("tags", []),
        "notes": idea.get("notes", ""),
        "status": idea.get("status", "idea"),
        "images": idea.get("images", []),
        "cover": idea.get("cover"),
        "favorite": idea.get("favorite", False),
        "order": idea.get("order", 0),
        "created_at": idea.get("created_at"),
        "updated_at": idea.get("updated_at"),
        "deleted": idea.get("deleted", False),
        "deleted_at": idea.get("deleted_at"),
        "comments": comments,
        "activity": idea.get("activity", []),
        "comment_count": len(comments),
        "image_count": len(idea.get("images", [])),
        "ranking": ranking,
        "my_vote": votes.get(client_id) if client_id else None,
    }


def public_ideas(ideas: list[dict], client_id: Optional[str]) -> list[dict]:
    return [public_idea(i, client_id) for i in ideas]
