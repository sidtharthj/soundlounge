"""Download manager — async queue processor with concurrent downloads."""

import asyncio
import json
import logging
import os
from datetime import datetime
from typing import Any

import yt_dlp
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.config import settings
from app.database import async_session
from app.models.queue import DownloadQueue
from app.models.song import Song
from app.services.thumbnail_service import ThumbnailService
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)


class DownloadManager:
    """Manages a background download queue with concurrency control."""

    def __init__(self) -> None:
        self._semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_DOWNLOADS)
        self._active_tasks: dict[int, asyncio.Task[None]] = {}
        self._paused: set[int] = set()
        self._cancel_flags: dict[int, bool] = {}

    # ── Public API ────────────────────────────────────────────────────────────

    async def enqueue(self, queue_item: DownloadQueue) -> None:
        """Start processing a queued download item."""
        task = asyncio.create_task(self._process(queue_item.id))  # type: ignore[arg-type]
        self._active_tasks[queue_item.id] = task  # type: ignore[index]

    async def pause(self, queue_id: int) -> bool:
        """Pause a download (sets flag; actual pause happens in progress hook)."""
        self._paused.add(queue_id)
        async with async_session() as session:
            item = await session.get(DownloadQueue, queue_id)
            if item:
                item.status = "paused"
                session.add(item)
                await session.commit()
                await ws_manager.broadcast_download_progress(
                    queue_id, "paused", item.progress, title=item.title
                )
        return True

    async def resume(self, queue_id: int) -> bool:
        """Resume a paused download by re-enqueueing it."""
        self._paused.discard(queue_id)
        async with async_session() as session:
            item = await session.get(DownloadQueue, queue_id)
            if item and item.status == "paused":
                item.status = "pending"
                session.add(item)
                await session.commit()
                await self.enqueue(item)
                return True
        return False

    async def cancel(self, queue_id: int) -> bool:
        """Cancel an active or pending download. Returns True if cancelled, False if already inactive."""
        self._cancel_flags[queue_id] = True
        self._paused.discard(queue_id)
        task = self._active_tasks.pop(queue_id, None)
        was_active = False

        async with async_session() as session:
            item = await session.get(DownloadQueue, queue_id)
            if item:
                if item.status in ("pending", "downloading", "paused"):
                    item.status = "cancelled"
                    item.error_message = "Cancelled by user"
                    session.add(item)
                    await session.commit()
                    was_active = True

        if task and not task.done():
            task.cancel()
            
        if was_active:
            await ws_manager.broadcast_download_progress(queue_id, "cancelled", 0)
            
        return was_active

    async def resume_pending_on_startup(self) -> None:
        """Re-enqueue any downloads left in pending/downloading state (e.g. after crash)."""
        async with async_session() as session:
            stmt = select(DownloadQueue).where(
                DownloadQueue.status.in_(["pending", "downloading"])  # type: ignore[union-attr]
            )
            results = await session.execute(stmt)
            items = results.scalars().all()
            for item in items:
                item.status = "pending"
                item.progress = 0.0
                session.add(item)
            await session.commit()
            for item in items:
                await self.enqueue(item)

    # ── Internal processing ───────────────────────────────────────────────────

    async def _process(self, queue_id: int) -> None:
        """Acquire semaphore slot and run the download."""
        async with self._semaphore:
            if queue_id in self._paused or self._cancel_flags.pop(queue_id, False):
                return
            await self._download(queue_id)

    async def _download(self, queue_id: int) -> None:
        """Execute the actual yt-dlp download in a thread."""
        async with async_session() as session:
            item = await session.get(DownloadQueue, queue_id)
            if item is None:
                return

            item.status = "downloading"
            item.started_at = datetime.utcnow()
            session.add(item)
            await session.commit()

            await ws_manager.broadcast_download_progress(
                queue_id, "downloading", 0, title=item.title
            )

            # Build yt-dlp options
            output_template = item.output_template or "%(title)s.%(ext)s"
            download_dir = str(settings.DOWNLOADS_DIR)
            output_path = os.path.join(download_dir, output_template)

            ydl_opts: dict[str, Any] = {
                "format": "bestaudio/best",
                "outtmpl": output_path,
                "quiet": True,
                "no_warnings": True,
                "writethumbnail": True,
                "postprocessors": [],
            }

            # Check DB for custom ffmpeg path
            from app.models.settings import Setting
            stmt = select(Setting).where(Setting.key == "ffmpeg_path")
            db_ffmpeg = (await session.execute(stmt)).scalars().first()
            ffmpeg_loc = db_ffmpeg.value if db_ffmpeg and db_ffmpeg.value else settings.FFMPEG_PATH

            if ffmpeg_loc:
                ydl_opts["ffmpeg_location"] = ffmpeg_loc

            # Audio post-processing
            audio_format = item.format or settings.DEFAULT_AUDIO_FORMAT
            audio_quality = item.quality or settings.DEFAULT_AUDIO_QUALITY
            ydl_opts["postprocessors"].append(
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": audio_format,
                    "preferredquality": audio_quality,
                }
            )
            # Embed metadata
            ydl_opts["postprocessors"].append({"key": "FFmpegMetadata"})
            # Embed thumbnail into audio file
            ydl_opts["postprocessors"].append({"key": "EmbedThumbnail"})

            # Merge extra options from options_json
            if item.options_json:
                try:
                    extra = json.loads(item.options_json)
                    if isinstance(extra, dict):
                        ydl_opts.update(extra)
                except json.JSONDecodeError:
                    pass

            # Progress hook — runs in the download thread
            loop = asyncio.get_event_loop()

            def progress_hook(d: dict[str, Any]) -> None:
                if queue_id in self._paused:
                    raise yt_dlp.utils.DownloadError("__PAUSED__")

                status = d.get("status", "")
                if status == "downloading":
                    total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                    downloaded = d.get("downloaded_bytes", 0)
                    pct = (downloaded / total * 100) if total else 0
                    speed_raw = d.get("speed")
                    speed_str = (
                        f"{speed_raw / 1024 / 1024:.1f} MB/s" if speed_raw else None
                    )
                    eta_raw = d.get("eta")
                    eta_str = f"{eta_raw}s" if eta_raw is not None else None

                    asyncio.run_coroutine_threadsafe(
                        ws_manager.broadcast_download_progress(
                            queue_id, "downloading", round(pct, 1), speed_str, eta_str, item.title
                        ),
                        loop,
                    )
                elif status == "finished":
                    asyncio.run_coroutine_threadsafe(
                        ws_manager.broadcast_download_progress(
                            queue_id, "processing", 100, title=item.title
                        ),
                        loop,
                    )

            ydl_opts["progress_hooks"] = [progress_hook]

        # Run download in thread
        try:
            info = await asyncio.to_thread(self._run_ytdlp, ydl_opts, item.youtube_url)
        except Exception as exc:
            err_msg = str(exc)
            if "__PAUSED__" in err_msg:
                return  # paused — will be re-enqueued on resume
            await self._mark_failed(queue_id, err_msg)
            return

        # Success — create Song record
        await self._mark_complete(queue_id, info)

    @staticmethod
    def _run_ytdlp(opts: dict[str, Any], url: str) -> dict[str, Any]:
        """Blocking yt-dlp download (runs in thread)."""
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            return info or {}

    async def _mark_failed(self, queue_id: int, error: str) -> None:
        async with async_session() as session:
            item = await session.get(DownloadQueue, queue_id)
            if item:
                item.status = "failed"
                item.error_message = error[:500]
                item.completed_at = datetime.utcnow()
                session.add(item)
                await session.commit()
                await ws_manager.broadcast_download_error(queue_id, error[:200], item.title)
        self._active_tasks.pop(queue_id, None)

    async def _mark_complete(self, queue_id: int, info: dict[str, Any]) -> None:
        async with async_session() as session:
            item = await session.get(DownloadQueue, queue_id)
            if item is None:
                return

            # Determine final file path
            audio_format = item.format or settings.DEFAULT_AUDIO_FORMAT
            title = info.get("title", item.title or "Unknown")
            # yt-dlp renames after post-processing; reconstruct the path
            output_template = item.output_template or "%(title)s.%(ext)s"
            expected_name = output_template.replace("%(title)s", title).replace(
                "%(ext)s", audio_format
            )
            file_path = os.path.join(str(settings.DOWNLOADS_DIR), expected_name)

            # If the expected file doesn't exist, search for it
            if not os.path.isfile(file_path):
                file_path = self._find_downloaded_file(str(settings.DOWNLOADS_DIR), title, audio_format)

            # Download thumbnail
            artwork_path = None
            thumb_url = info.get("thumbnail")
            if thumb_url:
                youtube_id = info.get("id", item.youtube_id or "")
                artwork_path = await ThumbnailService.download_thumbnail(thumb_url, youtube_id)

            # Create song record
            song = Song(
                title=title,
                artist=info.get("artist") or info.get("uploader") or info.get("channel") or "Unknown Artist",
                album=info.get("album", "YouTube"),
                duration=info.get("duration"),
                file_path=file_path,
                artwork_path=artwork_path,
                youtube_id=info.get("id", item.youtube_id),
                youtube_url=item.youtube_url,
                format=audio_format,
                bitrate=int(item.quality) if item.quality.isdigit() else None,
                file_size=os.path.getsize(file_path) if os.path.isfile(file_path) else None,
                metadata_json=json.dumps(
                    {
                        "channel": info.get("channel"),
                        "upload_date": info.get("upload_date"),
                        "view_count": info.get("view_count"),
                        "description": (info.get("description") or "")[:500],
                    }
                ),
            )
            session.add(song)

            # Update queue item
            item.status = "completed"
            item.progress = 100.0
            item.download_path = file_path
            item.completed_at = datetime.utcnow()
            session.add(item)
            await session.commit()
            await session.refresh(song)

            await ws_manager.broadcast_download_complete(queue_id, song.id, song.title)

        self._active_tasks.pop(queue_id, None)

    @staticmethod
    def _find_downloaded_file(directory: str, title: str, ext: str) -> str:
        """Best-effort search for the downloaded file in the directory."""
        # Sanitize title for filesystem matching
        safe_title = "".join(c for c in title if c not in r'\/:*?"<>|')
        for fname in os.listdir(directory):
            if fname.endswith(f".{ext}"):
                if safe_title.lower() in fname.lower():
                    return os.path.join(directory, fname)
        # Fallback: return most recently modified file with the right extension
        candidates = [
            os.path.join(directory, f)
            for f in os.listdir(directory)
            if f.endswith(f".{ext}")
        ]
        if candidates:
            return max(candidates, key=os.path.getmtime)
        return os.path.join(directory, f"{safe_title}.{ext}")


# Singleton
download_manager = DownloadManager()
