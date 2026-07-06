"""Thumbnail service — download and cache thumbnail images."""

import logging
import os
from urllib.parse import urlparse

import aiofiles
import aiofiles.os

from app.config import settings

logger = logging.getLogger(__name__)

# Try to import aiohttp for async downloads; fall back to urllib
try:
    import aiohttp
    _HAS_AIOHTTP = True
except ImportError:
    _HAS_AIOHTTP = False


class ThumbnailService:
    """Download, cache, and look up thumbnail images."""

    @staticmethod
    async def download_thumbnail(url: str, youtube_id: str) -> str | None:
        """Download a thumbnail and save it to the thumbnails directory.

        Returns the absolute file path on success, None on failure.
        """
        if not url or not youtube_id:
            return None

        # Determine extension from URL
        parsed = urlparse(url)
        ext = os.path.splitext(parsed.path)[1] or ".jpg"
        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
            ext = ".jpg"

        filename = f"{youtube_id}{ext}"
        filepath = os.path.join(str(settings.THUMBNAILS_DIR), filename)

        # Skip if already cached
        if os.path.isfile(filepath):
            return filepath

        try:
            if _HAS_AIOHTTP:
                await ThumbnailService._download_aiohttp(url, filepath)
            else:
                await ThumbnailService._download_urllib(url, filepath)
            return filepath
        except Exception as exc:
            logger.warning("Failed to download thumbnail %s: %s", url, exc)
            return None

    @staticmethod
    async def _download_aiohttp(url: str, filepath: str) -> None:
        async with aiohttp.ClientSession() as client_session:
            async with client_session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status == 200:
                    data = await resp.read()
                    async with aiofiles.open(filepath, "wb") as f:
                        await f.write(data)

    @staticmethod
    async def _download_urllib(url: str, filepath: str) -> None:
        import asyncio
        from urllib.request import urlopen, Request

        def _fetch() -> bytes:
            req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(req, timeout=15) as response:
                return response.read()

        data = await asyncio.to_thread(_fetch)
        async with aiofiles.open(filepath, "wb") as f:
            await f.write(data)

    @staticmethod
    def get_thumbnail_path(youtube_id: str) -> str | None:
        """Return the cached thumbnail path for a given YouTube ID, if it exists."""
        for ext in (".jpg", ".jpeg", ".png", ".webp"):
            filepath = os.path.join(str(settings.THUMBNAILS_DIR), f"{youtube_id}{ext}")
            if os.path.isfile(filepath):
                return filepath
        return None
