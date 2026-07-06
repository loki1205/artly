"""Image storage + thumbnail generation.

Files live under DATA_DIR/images/. A thumbnail (max 640px, quality 82) is written
to DATA_DIR/images/thumbs/ with the same filename. JSON stores only filenames.
"""
from __future__ import annotations

import io
import secrets
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ALLOWED = {".jpg", ".jpeg", ".png", ".webp"}
_EXT_BY_FORMAT = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
THUMB_MAX = 640
MAX_BYTES = 25 * 1024 * 1024  # 25 MB per image


class ImageError(Exception):
    pass


def _dirs(data_dir: Path) -> tuple[Path, Path]:
    images = data_dir / "images"
    thumbs = images / "thumbs"
    images.mkdir(parents=True, exist_ok=True)
    thumbs.mkdir(parents=True, exist_ok=True)
    return images, thumbs


def _safe_name(ext: str) -> str:
    return f"{secrets.token_hex(12)}{ext}"


def save_bytes(data_dir: Path, raw: bytes, original_ext: str = "") -> str:
    """Validate, store the original, generate a thumbnail. Returns the filename."""
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

    images, thumbs = _dirs(data_dir)
    filename = _safe_name(ext)

    # Save the (re-encoded) original, honoring EXIF orientation.
    img = ImageOps.exif_transpose(img)
    save_kwargs = {}
    save_img = img
    if fmt in ("JPEG",) or ext == ".jpg":
        save_img = img.convert("RGB")
        save_kwargs = {"quality": 90}
    save_img.save(images / filename, **save_kwargs)

    # Thumbnail
    thumb = img.copy()
    thumb.thumbnail((THUMB_MAX, THUMB_MAX), Image.LANCZOS)
    if ext == ".jpg":
        thumb = thumb.convert("RGB")
        thumb.save(thumbs / filename, quality=82)
    else:
        thumb.save(thumbs / filename)

    return filename


def save_from_url(data_dir: Path, url: str) -> str:
    if not (url.startswith("http://") or url.startswith("https://")):
        raise ImageError("URL must be http(s)")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Artly/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:  # noqa: S310
            raw = resp.read(MAX_BYTES + 1)
    except Exception as exc:  # noqa: BLE001
        raise ImageError("Could not download image from URL") from exc
    ext = Path(url.split("?")[0]).suffix.lower()
    return save_bytes(data_dir, raw, ext)


def delete_file(data_dir: Path, filename: str) -> None:
    images, thumbs = _dirs(data_dir)
    for p in (images / filename, thumbs / filename):
        try:
            p.unlink()
        except FileNotFoundError:
            pass
        except OSError:
            pass
