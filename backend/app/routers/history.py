"""Play history router — track play history and recently played tracks."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, text
from datetime import datetime
from typing import List, Any

from app.database import get_session
from app.models.history import PlayHistory, PlayHistoryCreate, PlayHistoryRead
from app.models.song import Song, SongRead

router = APIRouter(prefix="/history", tags=["history"])


@router.post("", response_model=PlayHistoryRead)
async def log_play(
    payload: PlayHistoryCreate,
    session: AsyncSession = Depends(get_session),
) -> Any:
    """Record a song play event. Updates play count and last played in songs table."""
    song = await session.get(Song, payload.song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
        
    # Create history record
    history = PlayHistory(
        song_id=payload.song_id,
        played_duration=payload.played_duration
    )
    session.add(history)
    
    # Update song stats
    song.play_count += 1
    song.last_played = datetime.utcnow()
    session.add(song)
    
    await session.commit()
    await session.refresh(history)
    return history


@router.get("", response_model=List[dict])
async def list_play_history(
    limit: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_session)
) -> Any:
    """Get raw play history with resolved song details."""
    sql = text(
        """
        SELECT h.id as history_id, h.played_at, h.played_duration, s.*
        FROM play_history h
        JOIN songs s ON s.id = h.song_id
        ORDER BY h.played_at DESC
        LIMIT :limit
        """
    )
    result = await session.execute(sql, {"limit": limit})
    rows = result.mappings().all()
    
    history_list = []
    for r in rows:
        item = dict(r)
        h_id = item.pop("history_id")
        p_at = item.pop("played_at")
        p_dur = item.pop("played_duration")
        song_obj = Song(**item)
        history_list.append({
            "id": h_id,
            "played_at": p_at,
            "played_duration": p_dur,
            "song": song_obj
        })
    return history_list


@router.get("/recent", response_model=List[SongRead])
async def get_recently_played_songs(
    limit: int = Query(10, ge=1, le=50),
    session: AsyncSession = Depends(get_session)
) -> Any:
    """Get the unique recently played songs in reverse chronological order of their last play."""
    sql = text(
        """
        SELECT s.*
        FROM songs s
        WHERE s.last_played IS NOT NULL
        ORDER BY s.last_played DESC
        LIMIT :limit
        """
    )
    result = await session.execute(sql, {"limit": limit})
    rows = result.mappings().all()
    return [Song(**dict(r)) for r in rows]
