"""Download router — manage download tasks and queue control."""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List, Optional, Any
from pydantic import BaseModel

from app.database import get_session
from app.models.queue import DownloadQueue, DownloadQueueCreate, DownloadQueueRead
from app.services.download_manager import download_manager

router = APIRouter(prefix="/download", tags=["download"])


class PlaylistDownloadItem(BaseModel):
    youtube_id: str
    youtube_url: str
    title: str
    thumbnail_url: Optional[str] = None
    format: str = "mp3"
    quality: str = "192"
    output_template: Optional[str] = None
    options_json: Optional[str] = None


class PlaylistDownloadRequest(BaseModel):
    playlist_title: str
    playlist_url: str
    songs: List[PlaylistDownloadItem]


@router.get("/queue", response_model=List[DownloadQueueRead])
async def get_download_queue(
    session: AsyncSession = Depends(get_session),
    limit: int = 100,
) -> Any:
    """Get the list of all downloads in the queue (pending, active, completed, etc.)."""
    stmt = select(DownloadQueue).order_by(DownloadQueue.created_at.desc()).limit(limit)  # type: ignore
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=DownloadQueueRead)
async def enqueue_download(
    payload: DownloadQueueCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> Any:
    """Enqueue a single video/audio download."""
    db_item = DownloadQueue(
        youtube_id=payload.youtube_id,
        youtube_url=payload.youtube_url,
        title=payload.title or "Fetching details...",
        thumbnail_url=payload.thumbnail_url,
        status="pending",
        format=payload.format,
        quality=payload.quality,
        output_template=payload.output_template,
        options_json=payload.options_json,
    )
    session.add(db_item)
    await session.commit()
    await session.refresh(db_item)

    # Trigger async processing
    background_tasks.add_task(download_manager.enqueue, db_item)
    return db_item


@router.post("/playlist", response_model=List[DownloadQueueRead])
async def enqueue_playlist_downloads(
    payload: PlaylistDownloadRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> Any:
    """Enqueue multiple downloads selected from a playlist."""
    queued_items = []
    for index, song in enumerate(payload.songs):
        # Allow playlist_index in output template if requested
        out_tmpl = song.output_template
        if out_tmpl and "%(playlist_index)s" in out_tmpl:
            # We can format/replace or pass info in options_json if needed
            pass
        
        db_item = DownloadQueue(
            youtube_id=song.youtube_id,
            youtube_url=song.youtube_url,
            title=song.title,
            thumbnail_url=song.thumbnail_url,
            status="pending",
            format=song.format,
            quality=song.quality,
            output_template=out_tmpl,
            options_json=song.options_json,
        )
        session.add(db_item)
        queued_items.append(db_item)
    
    await session.commit()
    
    # Refresh and enqueue all
    for item in queued_items:
        await session.refresh(item)
        background_tasks.add_task(download_manager.enqueue, item)
        
    return queued_items


@router.post("/queue/{id}/pause")
async def pause_download(id: int) -> dict[str, bool]:
    """Pause an active download."""
    success = await download_manager.pause(id)
    if not success:
        raise HTTPException(status_code=404, detail="Download task not found or cannot be paused")
    return {"success": True}


@router.post("/queue/{id}/resume")
async def resume_download(id: int) -> dict[str, bool]:
    """Resume a paused download."""
    success = await download_manager.resume(id)
    if not success:
        raise HTTPException(status_code=404, detail="Download task not found or cannot be resumed")
    return {"success": True}


@router.delete("/queue/{id}")
async def cancel_download(
    id: int,
    session: AsyncSession = Depends(get_session)
) -> dict[str, bool]:
    """Cancel a pending or downloading task, or delete a completed record from history."""
    success = await download_manager.cancel(id)
    if not success:
        # If it's not active in download manager, we can delete the database record
        item = await session.get(DownloadQueue, id)
        if item:
            await session.delete(item)
            await session.commit()
            return {"success": True}
        raise HTTPException(status_code=404, detail="Download task not found")
    return {"success": True}
