"""Image validation + thumbnail generation (storage-agnostic).

This module only *processes* images: it validates the bytes, re-encodes the
original honoring EXIF orientation, and builds a thumbnail (max 640px). It does
NOT decide where the resulting bytes live — that's the ImageStore's job (local
disk or Supabase Storage). See imagestore.py.
"""
from __future__ import annotations

import io
import secrets
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps

ALLOWED = {".jpg", ".jpeg", ".png", ".webp"}
_EXT_BY_FORMAT = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
_CT_BY_EXT = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
THUMB_MAX = 640
MAX_BYTES = 25 * 1024 * 1024  # 25 MB per image


class ImageError(Exception):
    pass


@dataclass
class ProcessedImage:
    """A validated image ready to store: original + thumbnail bytes."""

    filename: str
    content_type: str
    original: bytes
    thumbnail: bytes


def _safe_name(ext: str) -> str:
    return f"{secrets.token_hex(12)}{ext}"


def content_type_for(name: str) -> str:
    return _CT_BY_EXT.get(Path(name).suffix.lower(), "application/octet-stream")


def _encode(img: Image.Image, ext: str, quality: int) -> bytes:
    out = io.BytesIO()
    if ext == ".jpg":
        img.convert("RGB").save(out, format="JPEG", quality=quality)
    elif ext == ".png":
        img.save(out, format="PNG")
    else:  # .webp
        img.save(out, format="WEBP", quality=quality)
    return out.getvalue()


def process(raw: bytes, original_ext: str = "") -> ProcessedImage:
    """Validate the bytes and return re-encoded original + thumbnail, in memory."""
    if len(raw) > MAX_BYTES:
        raise ImageError("Image exceeds 25MB limit")
    try:
        img = Image.open(io.BytesIO(raw))
        img.verify()  # integrity check
        img = Image.open(io.BytesIO(raw))  # reopen after verify
    except Exception as exc:  # noqa: BLE001
        raise ImageError("File is not a valid image") from exc

    fmt = (img.format or "").upper()
    ext = _EXT_BY_FORMAT.get(fmt)
    if ext is None:
        # fall back to provided extension if it is allowed
        ext = original_ext.lower() if original_ext.lower() in ALLOWED else None
    if ext is None:
        raise ImageError("Unsupported image type (allowed: jpg, jpeg, png, webp)")

    img = ImageOps.exif_transpose(img)  # honor EXIF orientation

    original = _encode(img, ext, quality=90)

    thumb = img.copy()
    thumb.thumbnail((THUMB_MAX, THUMB_MAX), Image.LANCZOS)
    thumbnail = _encode(thumb, ext, quality=82)

    return ProcessedImage(_safe_name(ext), _CT_BY_EXT[ext], original, thumbnail)


def fetch_url(url: str) -> tuple[bytes, str]:
    """Download image bytes from an http(s) URL. Returns (bytes, extension)."""
    if not (url.startswith("http://") or url.startswith("https://")):
        raise ImageError("URL must be http(s)")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Artly/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:  # noqa: S310
            raw = resp.read(MAX_BYTES + 1)
    except Exception as exc:  # noqa: BLE001
        raise ImageError("Could not download image from URL") from exc
    ext = Path(url.split("?")[0]).suffix.lower()
    return raw, ext
