"""Pydantic request/response models for Artly.

The persisted shape (in ideas.json) is a superset of what we expose: it also
holds the raw `votes` map keyed by browser-UUID, which is NEVER sent to clients.
Public serialization lives in serializers.py.
"""
from __future__ import annotations

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field


class Status(str, Enum):
    idea = "idea"
    approved = "approved"
    sketching = "sketching"
    painting = "painting"
    finished = "finished"
    sold = "sold"
    archived = "archived"


VoteValue = Literal["like", "neutral", "dislike"]


# ---- Ideas -----------------------------------------------------------------
class IdeaCreate(BaseModel):
    title: str = Field(default="Untitled idea", max_length=200)
    category_id: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    notes: str = ""
    status: Status = Status.idea


class IdeaUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    category_id: Optional[str] = None
    tags: Optional[list[str]] = None
    notes: Optional[str] = None
    status: Optional[Status] = None
    favorite: Optional[bool] = None


class VoteBody(BaseModel):
    # null clears the vote
    vote: Optional[VoteValue] = None


class CommentBody(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class ReorderBody(BaseModel):
    order: list[str]


class ImageReorderBody(BaseModel):
    order: list[str]


class RenameImageBody(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class CoverBody(BaseModel):
    filename: str


class UrlImageBody(BaseModel):
    url: str


class BulkAction(BaseModel):
    ids: list[str]
    action: Literal["archive", "delete", "move_category", "favorite", "unfavorite"]
    category_id: Optional[str] = None


# ---- Categories ------------------------------------------------------------
class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str = "#7C6BF2"
    emoji: str = "🎨"


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=80)
    color: Optional[str] = None
    emoji: Optional[str] = None


# ---- Settings --------------------------------------------------------------
class SettingsUpdate(BaseModel):
    theme: Optional[Literal["dark", "light"]] = None
    sound: Optional[bool] = None
    default_sort: Optional[str] = None
