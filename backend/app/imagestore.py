"""Where uploaded image *files* live.

This mirrors persistence.py, but for the image binaries rather than the JSON
data. Two backends, chosen from the same environment:

- LocalImageStore    — files under DATA_DIR/images/ (+ thumbs/), served by the
                       /uploads route. Zero setup, but the disk is *ephemeral*
                       on hosts with no attached volume, so images vanish on
                       restart/redeploy. This was the original behaviour.
- SupabaseImageStore — objects in a public Supabase Storage bucket. Durable on a
                       diskless free host, so images survive restarts. Uses the
                       SAME SUPABASE_URL + service key as the DB backend.

build_image_store() picks Supabase Storage when SUPABASE_URL + a key are set,
else local disk — so switching the DB to Supabase also moves images there, which
is almost certainly what you want (otherwise the data is durable but the images
it references are not).
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Iterator, Optional

from . import images as imagelib
from .persistence import _load_dotenv

DEFAULT_BUCKET = "artly-images"


class LocalImageStore:
    """Files on local disk, served by the /uploads static route."""

    redirects = False  # /uploads serves the file directly

    def __init__(self, data_dir: Path) -> None:
        self.root = data_dir / "images"
        self.thumbs = self.root / "thumbs"
        self.root.mkdir(parents=True, exist_ok=True)
        self.thumbs.mkdir(parents=True, exist_ok=True)

    def save(self, raw: bytes, original_ext: str = "") -> str:
        p = imagelib.process(raw, original_ext)
        (self.root / p.filename).write_bytes(p.original)
        (self.thumbs / p.filename).write_bytes(p.thumbnail)
        return p.filename

    def save_from_url(self, url: str) -> str:
        raw, ext = imagelib.fetch_url(url)
        return self.save(raw, ext)

    def delete(self, filename: str) -> None:
        for p in (self.root / filename, self.thumbs / filename):
            try:
                p.unlink()
            except (FileNotFoundError, OSError):
                pass

    def local_path(self, key: str) -> Optional[Path]:
        """Absolute path for a /uploads key, or None if it escapes the root."""
        root = self.root.resolve()
        candidate = (self.root / key).resolve()
        if root != candidate and root not in candidate.parents:
            return None  # path traversal attempt
        return candidate

    def export_files(self) -> Iterator[tuple[str, bytes]]:
        if self.root.exists():
            for p in self.root.rglob("*"):
                if p.is_file():
                    yield p.relative_to(self.root).as_posix(), p.read_bytes()

    def import_file(self, relpath: str, data: bytes) -> None:
        target = self.root / relpath
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)


class SupabaseImageStore:
    """Objects in a public Supabase Storage bucket.

    Keys mirror the local layout: ``<filename>`` for the original and
    ``thumbs/<filename>`` for the thumbnail. The /uploads route 307-redirects to
    the object's public URL, so the frontend needs no changes.
    """

    redirects = True  # /uploads redirects to the public object URL

    def __init__(self, url: str, key: str, bucket: str) -> None:
        # Imported lazily so the local path has no hard dependency on supabase.
        from supabase import create_client

        self.public_base = url.rstrip("/")
        self.bucket = bucket
        self.client = create_client(url, key)
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        try:
            self.client.storage.create_bucket(self.bucket, options={"public": True})
        except Exception:  # noqa: BLE001
            # Already exists (the common case) — or we lack create perms, in
            # which case the first upload surfaces a clearer error.
            pass

    def _b(self):
        return self.client.storage.from_(self.bucket)

    def _upload(self, key: str, data: bytes, content_type: str) -> None:
        try:
            self._b().upload(
                path=key,
                file=data,
                file_options={
                    "content-type": content_type,
                    "cache-control": "3600",
                    "upsert": "true",
                },
            )
        except Exception as exc:  # noqa: BLE001
            raise imagelib.ImageError(f"Upload to storage failed: {exc}") from exc

    def save(self, raw: bytes, original_ext: str = "") -> str:
        p = imagelib.process(raw, original_ext)
        self._upload(p.filename, p.original, p.content_type)
        self._upload(f"thumbs/{p.filename}", p.thumbnail, p.content_type)
        return p.filename

    def save_from_url(self, url: str) -> str:
        raw, ext = imagelib.fetch_url(url)
        return self.save(raw, ext)

    def delete(self, filename: str) -> None:
        try:
            self._b().remove([filename, f"thumbs/{filename}"])
        except Exception:  # noqa: BLE001
            pass

    def public_url(self, key: str) -> str:
        return f"{self.public_base}/storage/v1/object/public/{self.bucket}/{key}"

    def export_files(self) -> Iterator[tuple[str, bytes]]:
        b = self._b()

        def walk(prefix: str) -> Iterator[tuple[str, bytes]]:
            for entry in b.list(prefix) or []:
                name = entry.get("name")
                if not name:
                    continue
                full = f"{prefix}/{name}" if prefix else name
                # Supabase returns "folders" as entries with no id/metadata.
                if entry.get("id") is None:
                    yield from walk(full)
                else:
                    try:
                        yield full, b.download(full)
                    except Exception:  # noqa: BLE001
                        pass

        yield from walk("")

    def import_file(self, relpath: str, data: bytes) -> None:
        self._upload(relpath, data, imagelib.content_type_for(relpath))


def build_image_store(data_dir: Path):
    """Supabase Storage if configured, else local disk (mirrors build_backend)."""
    _load_dotenv()
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")
    bucket = os.environ.get("SUPABASE_IMAGE_BUCKET", DEFAULT_BUCKET)
    if url and key:
        return SupabaseImageStore(url, key, bucket)
    return LocalImageStore(data_dir)
