"""Playlists router — manage playlists and their song associations."""

import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, text
from typing import List, Optional, Any
from pydantic import BaseModel

from app.database import get_session
from app.models.playlist import Playlist, PlaylistCreate, PlaylistUpdate, PlaylistRead, PlaylistSong
from app.models.song import Song, SongRead

router = APIRouter(prefix="/playlists", tags=["playlists"])


class ReorderRequest(BaseModel):
    song_ids: List[int]


class PlaylistExport(BaseModel):
    name: str
    description: Optional[str] = None
    songs: List[str]  # YouTube IDs of songs


@router.get("", response_model=List[PlaylistRead])
async def list_playlists(session: AsyncSession = Depends(get_session)) -> Any:
    """List all playlists and calculate the number of songs in each."""
    stmt = select(Playlist).order_by(Playlist.name)
    result = await session.execute(stmt)
    playlists = result.scalars().all()
    
    read_playlists = []
    for p in playlists:
        count_result = await session.execute(
            text("SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = :id"),
            {"id": p.id}
        )
        song_count = count_result.scalar() or 0
        read_playlists.append(
            PlaylistRead(
                id=p.id,  # type: ignore
                name=p.name,
                description=p.description,
                artwork_path=p.artwork_path,
                created_at=p.created_at,
                updated_at=p.updated_at,
                song_count=song_count
            )
        )
    return read_playlists


@router.post("", response_model=PlaylistRead)
async def create_playlist(
    payload: PlaylistCreate,
    session: AsyncSession = Depends(get_session),
) -> Any:
    """Create a new playlist."""
    playlist = Playlist(
        name=payload.name,
        description=payload.description,
        artwork_path=payload.artwork_path,
    )
    session.add(playlist)
    await session.commit()
    await session.refresh(playlist)
    return PlaylistRead(
        id=playlist.id,  # type: ignore
        name=playlist.name,
        description=playlist.description,
        artwork_path=playlist.artwork_path,
        created_at=playlist.created_at,
        updated_at=playlist.updated_at,
        song_count=0
    )


@router.get("/{id}")
async def get_playlist(id: int, session: AsyncSession = Depends(get_session)) -> Any:
    """Get a playlist details along with its songs sorted by position."""
    playlist = await session.get(Playlist, id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    # Query songs in playlist ordered by position
    sql = text(
        """
        SELECT s.*, ps.position
        FROM songs s
        JOIN playlist_songs ps ON ps.song_id = s.id
        WHERE ps.playlist_id = :id
        ORDER BY ps.position ASC
        """
    )
    result = await session.execute(sql, {"id": id})
    rows = result.mappings().all()
    
    songs = []
    for r in rows:
        song_dict = dict(r)
        # remove position for Song class instantiation, but we'll include it in the response
        pos = song_dict.pop("position")
        song_obj = Song(**song_dict)
        songs.append({"song": song_obj, "position": pos})
        
    return {
        "id": playlist.id,
        "name": playlist.name,
        "description": playlist.description,
        "artwork_path": playlist.artwork_path,
        "created_at": playlist.created_at,
        "updated_at": playlist.updated_at,
        "songs": songs,
    }


@router.patch("/{id}", response_model=PlaylistRead)
async def update_playlist(
    id: int,
    payload: PlaylistUpdate,
    session: AsyncSession = Depends(get_session),
) -> Any:
    """Update playlist details."""
    playlist = await session.get(Playlist, id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(playlist, key, value)
    playlist.updated_at = datetime.utcnow()
    
    session.add(playlist)
    await session.commit()
    await session.refresh(playlist)
    
    count_result = await session.execute(
        text("SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = :id"),
        {"id": id}
    )
    song_count = count_result.scalar() or 0
    
    return PlaylistRead(
        id=playlist.id,  # type: ignore
        name=playlist.name,
        description=playlist.description,
        artwork_path=playlist.artwork_path,
        created_at=playlist.created_at,
        updated_at=playlist.updated_at,
        song_count=song_count
    )


@router.delete("/{id}")
async def delete_playlist(id: int, session: AsyncSession = Depends(get_session)) -> dict[str, bool]:
    """Delete playlist and its song links."""
    playlist = await session.get(Playlist, id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    await session.delete(playlist)
    
    # Remove from junctions
    await session.execute(
        text("DELETE FROM playlist_songs WHERE playlist_id = :id"),
        {"id": id}
    )
    
    # Remove from favorites
    await session.execute(
        text("DELETE FROM favorites WHERE type = 'playlist' AND reference_id = :id"),
        {"id": id}
    )
    
    await session.commit()
    return {"success": True}


@router.post("/{id}/songs")
async def add_song_to_playlist(
    id: int,
    song_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Add a song to a playlist at the end."""
    playlist = await session.get(Playlist, id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    song = await session.get(Song, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
        
    # Check if already in playlist
    check_stmt = select(PlaylistSong).where(
        PlaylistSong.playlist_id == id,
        PlaylistSong.song_id == song_id
    )
    exists = (await session.execute(check_stmt)).scalars().first()
    if exists:
        return {"success": True, "message": "Song already in playlist"}
        
    # Find next position
    pos_result = await session.execute(
        text("SELECT COALESCE(MAX(position), -1) FROM playlist_songs WHERE playlist_id = :id"),
        {"id": id}
    )
    max_pos = pos_result.scalar()
    next_pos = 0 if max_pos is None else max_pos + 1
    
    ps = PlaylistSong(
        playlist_id=id,
        song_id=song_id,
        position=next_pos
    )
    session.add(ps)
    
    # Update playlist update time
    playlist.updated_at = datetime.utcnow()
    session.add(playlist)
    
    await session.commit()
    return {"success": True, "position": next_pos}


@router.delete("/{id}/songs/{song_id}")
async def remove_song_from_playlist(
    id: int,
    song_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    """Remove a song from a playlist and re-index the position of remaining songs."""
    playlist = await session.get(Playlist, id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    stmt = select(PlaylistSong).where(
        PlaylistSong.playlist_id == id,
        PlaylistSong.song_id == song_id
    )
    ps = (await session.execute(stmt)).scalars().first()
    if not ps:
        raise HTTPException(status_code=404, detail="Song not in playlist")
        
    removed_pos = ps.position
    await session.delete(ps)
    
    # Reindex remaining songs
    await session.execute(
        text(
            """
            UPDATE playlist_songs
            SET position = position - 1
            WHERE playlist_id = :id AND position > :removed_pos
            """
        ),
        {"id": id, "removed_pos": removed_pos}
    )
    
    # Update playlist update time
    playlist.updated_at = datetime.utcnow()
    session.add(playlist)
    
    await session.commit()
    return {"success": True}


@router.put("/{id}/songs/reorder")
async def reorder_playlist_songs(
    id: int,
    payload: ReorderRequest,
    session: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    """Reorder songs in a playlist based on a complete list of song IDs in new order."""
    playlist = await session.get(Playlist, id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    # Update positions of each song_id for this playlist
    for position, song_id in enumerate(payload.song_ids):
        await session.execute(
            text(
                """
                UPDATE playlist_songs
                SET position = :position
                WHERE playlist_id = :id AND song_id = :song_id
                """
            ),
            {"position": position, "id": id, "song_id": song_id}
        )
        
    # Update playlist update time
    playlist.updated_at = datetime.utcnow()
    session.add(playlist)
    
    await session.commit()
    return {"success": True}


@router.get("/{id}/export")
async def export_playlist(
    id: int,
    session: AsyncSession = Depends(get_session),
) -> PlaylistExport:
    """Export a playlist structure as JSON (just metadata and list of YouTube IDs)."""
    playlist = await session.get(Playlist, id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    # Fetch songs
    sql = text(
        """
        SELECT s.youtube_id
        FROM songs s
        JOIN playlist_songs ps ON ps.song_id = s.id
        WHERE ps.playlist_id = :id
        ORDER BY ps.position ASC
        """
    )
    result = await session.execute(sql, {"id": id})
    yt_ids = [row[0] for row in result.all() if row[0]]
    
    return PlaylistExport(
        name=playlist.name,
        description=playlist.description,
        songs=yt_ids
    )


@router.post("/import", response_model=PlaylistRead)
async def import_playlist(
    payload: PlaylistExport,
    session: AsyncSession = Depends(get_session),
) -> Any:
    """Import a playlist. Link existing songs in the library by YouTube ID."""
    playlist = Playlist(
        name=payload.name,
        description=payload.description or "Imported playlist",
    )
    session.add(playlist)
    await session.commit()
    await session.refresh(playlist)
    
    # Resolve songs by youtube_id and add them in order
    position = 0
    for yt_id in payload.songs:
        song_stmt = select(Song).where(Song.youtube_id == yt_id)
        song = (await session.execute(song_stmt)).scalars().first()
        if song:
            ps = PlaylistSong(
                playlist_id=playlist.id,  # type: ignore
                song_id=song.id,  # type: ignore
                position=position
            )
            session.add(ps)
            position += 1
            
    await session.commit()
    
    return PlaylistRead(
        id=playlist.id,  # type: ignore
        name=playlist.name,
        description=playlist.description,
        artwork_path=playlist.artwork_path,
        created_at=playlist.created_at,
        updated_at=playlist.updated_at,
        song_count=position
    )
