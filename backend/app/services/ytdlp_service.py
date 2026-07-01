"""yt-dlp wrapper — search YouTube, extract info, and fetch available formats."""

import asyncio
import logging
from typing import Any

import yt_dlp

logger = logging.getLogger(__name__)


class YTDLPService:
    """Thin async wrapper around yt-dlp's Python API."""

    # ── YouTube search ────────────────────────────────────────────────────────

    @staticmethod
    async def search(query: str, search_type: str = "song", limit: int = 10) -> list[dict[str, Any]]:
        """Search YouTube and return a list of result dicts.

        search_type: "song" | "artist" | "playlist"
        """
        if search_type == "playlist":
            search_query = f"ytsearch{limit}:{query} playlist"
        elif search_type == "artist":
            search_query = f"ytsearch{limit}:{query} artist"
        else:
            search_query = f"ytsearch{limit}:{query}"

        ydl_opts: dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": True,
            "skip_download": True,
        }

        def _extract() -> list[dict[str, Any]]:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(search_query, download=False)
                if result is None:
                    return []

                entries = result.get("entries", [])
                items: list[dict[str, Any]] = []
                for entry in entries:
                    if entry is None:
                        continue
                    items.append(
                        {
                            "id": entry.get("id", ""),
                            "title": entry.get("title", ""),
                            "url": entry.get("url") or entry.get("webpage_url") or f"https://www.youtube.com/watch?v={entry.get('id', '')}",
                            "thumbnail": entry.get("thumbnail") or entry.get("thumbnails", [{}])[-1].get("url") if entry.get("thumbnails") else None,
                            "duration": entry.get("duration"),
                            "channel": entry.get("channel") or entry.get("uploader", ""),
                            "view_count": entry.get("view_count"),
                            "type": search_type,
                        }
                    )
                return items

        return await asyncio.to_thread(_extract)

    # ── Extract info from URL ─────────────────────────────────────────────────

    @staticmethod
    async def extract_info(url: str) -> dict[str, Any]:
        """Extract metadata for a single video or playlist URL without downloading."""
        ydl_opts: dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
        }

        def _extract() -> dict[str, Any]:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if result is None:
                    return {}
                return result

        return await asyncio.to_thread(_extract)

    # ── Available formats ─────────────────────────────────────────────────────

    @staticmethod
    async def get_formats(youtube_id: str) -> list[dict[str, Any]]:
        """Return available download formats for a YouTube video."""
        url = f"https://www.youtube.com/watch?v={youtube_id}"
        ydl_opts: dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
        }

        def _extract() -> list[dict[str, Any]]:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if result is None:
                    return []

                formats_raw = result.get("formats", [])
                formats: list[dict[str, Any]] = []
                for f in formats_raw:
                    formats.append(
                        {
                            "format_id": f.get("format_id"),
                            "ext": f.get("ext"),
                            "resolution": f.get("resolution") or f.get("format_note"),
                            "filesize": f.get("filesize") or f.get("filesize_approx"),
                            "abr": f.get("abr"),
                            "vbr": f.get("vbr"),
                            "acodec": f.get("acodec"),
                            "vcodec": f.get("vcodec"),
                            "format_note": f.get("format_note"),
                            "audio_only": f.get("vcodec") == "none",
                        }
                    )
                return formats

        return await asyncio.to_thread(_extract)

    # ── Extract info for playlist URL ─────────────────────────────────────────

    @staticmethod
    async def extract_playlist(url: str) -> dict[str, Any]:
        """Extract metadata for a playlist URL, returning title + entries."""
        ydl_opts: dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": True,
            "skip_download": True,
        }

        def _extract() -> dict[str, Any]:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if result is None:
                    return {}

                entries = []
                for entry in result.get("entries", []):
                    if entry is None:
                        continue
                    entries.append(
                        {
                            "id": entry.get("id", ""),
                            "title": entry.get("title", ""),
                            "url": entry.get("url") or f"https://www.youtube.com/watch?v={entry.get('id', '')}",
                            "thumbnail": entry.get("thumbnail"),
                            "duration": entry.get("duration"),
                            "channel": entry.get("channel") or entry.get("uploader", ""),
                        }
                    )
                return {
                    "title": result.get("title", ""),
                    "id": result.get("id", ""),
                    "url": url,
                    "entries": entries,
                    "entry_count": len(entries),
                }

        return await asyncio.to_thread(_extract)
