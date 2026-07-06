"""Songs router — manage local library and search."""

import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, text
from typing import List, Optional, Any

from app.database import get_session
from app.models.song import Song, SongRead, SongUpdate
from app.services.library_service import LibraryService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/songs", tags=["songs"])


@router.get("", response_model=dict)
async def list_songs(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("date_downloaded"),
    sort_order: str = Query("desc"),
    session: AsyncSession = Depends(get_session),
) -> Any:
    """List songs with pagination and sorting."""
    try:
        songs, total = await LibraryService.get_songs_paginated(
            session=session,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        return {
            "songs": songs,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list songs: {str(e)}")


@router.get("/search", response_model=List[SongRead])
async def search_library(
    q: str = Query(..., min_length=1),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> Any:
    """FTS5 full text search on song library (instant/local)."""
    try:
        results = await LibraryService.fts_search(
            session=session,
            query=q,
            limit=limit,
            offset=offset,
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/stats")
async def get_library_stats(session: AsyncSession = Depends(get_session)) -> Any:
    """Get library statistics (total songs, total size, total duration)."""
    try:
        stats = await LibraryService.get_stats(session)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.get("/{id}", response_model=SongRead)
async def get_song_details(id: int, session: AsyncSession = Depends(get_session)) -> Any:
    """Get details for a single song."""
    song = await session.get(Song, id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return song


@router.patch("/{id}", response_model=SongRead)
async def update_song(
    id: int,
    payload: SongUpdate,
    session: AsyncSession = Depends(get_session),
) -> Any:
    """Update song metadata."""
    song = await session.get(Song, id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(song, key, value)
        
    session.add(song)
    await session.commit()
    await session.refresh(song)
    return song


@router.delete("/{id}")
async def delete_song(id: int, session: AsyncSession = Depends(get_session)) -> dict[str, bool]:
    """Delete song from database and also delete files from disk."""
    song = await session.get(Song, id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    file_path = song.file_path
    artwork_path = song.artwork_path
    
    # Delete from database first
    await session.delete(song)
    
    # Also clean up playlist links
    # SQLite triggers or foreign keys would handle this, but we'll do it explicitly to be safe
    await session.execute(
        text("DELETE FROM playlist_songs WHERE song_id = :id"),
        {"id": id}
    )
    
    # Clean up favorites
    await session.execute(
        text("DELETE FROM favorites WHERE type = 'song' AND reference_id = :id"),
        {"id": id}
    )
    
    await session.commit()
    
    # Clean up files on disk
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            logger.warning(f"Could not remove audio file: {file_path}. Error: {e}")
            
    if artwork_path and os.path.exists(artwork_path):
        # Only delete artwork if no other song is using it
        other_uses = await session.execute(
            select(Song).where(Song.artwork_path == artwork_path)
        )
        if not other_uses.scalars().first():
            try:
                os.remove(artwork_path)
            except Exception as e:
                logger.warning(f"Could not remove artwork file: {artwork_path}. Error: {e}")
                
    return {"success": True}
