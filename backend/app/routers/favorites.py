"""Favorites router — manage liked songs and favorite playlists."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List, Any

from app.database import get_session
from app.models.favorite import Favorite, FavoriteCreate, FavoriteRead
from app.models.song import Song, SongRead
from app.models.playlist import Playlist, PlaylistRead

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=List[FavoriteRead])
async def list_favorites(session: AsyncSession = Depends(get_session)) -> Any:
    """Get all favorite markers."""
    stmt = select(Favorite).order_by(Favorite.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/songs", response_model=List[SongRead])
async def get_liked_songs(session: AsyncSession = Depends(get_session)) -> Any:
    """Get the list of all liked songs (resolved Song objects)."""
    stmt = (
        select(Song)
        .join(Favorite, Favorite.reference_id == Song.id)
        .where(Favorite.type == "song")
        .order_by(Favorite.created_at.desc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/playlists", response_model=List[PlaylistRead])
async def get_favorite_playlists(session: AsyncSession = Depends(get_session)) -> Any:
    """Get the list of all favorite playlists (resolved Playlist objects)."""
    stmt = (
        select(Playlist)
        .join(Favorite, Favorite.reference_id == Playlist.id)
        .where(Favorite.type == "playlist")
        .order_by(Favorite.created_at.desc())
    )
    result = await session.execute(stmt)
    playlists = result.scalars().all()
    
    # We need to map to PlaylistRead and count songs
    from sqlalchemy import text
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


@router.post("", response_model=FavoriteRead)
async def add_favorite(
    payload: FavoriteCreate,
    session: AsyncSession = Depends(get_session),
) -> Any:
    """Add a favorite entry (like a song or playlist)."""
    if payload.type not in ("song", "playlist", "artist"):
        raise HTTPException(status_code=400, detail="Invalid favorite type")
        
    # Check if exists
    stmt = select(Favorite).where(
        Favorite.type == payload.type,
        Favorite.reference_id == payload.reference_id
    )
    exists = (await session.execute(stmt)).scalars().first()
    if exists:
        return exists
        
    # Verify entity exists
    if payload.type == "song":
        entity = await session.get(Song, payload.reference_id)
    elif payload.type == "playlist":
        entity = await session.get(Playlist, payload.reference_id)
    else:
        entity = True  # Artists are string-based and don't have a direct table currently
        
    if not entity:
        raise HTTPException(status_code=404, detail="Referenced entity not found")
        
    fav = Favorite(type=payload.type, reference_id=payload.reference_id)
    session.add(fav)
    await session.commit()
    await session.refresh(fav)
    return fav


@router.delete("/toggle/{type}/{reference_id}")
async def toggle_favorite_off(
    type: str,
    reference_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    """Remove a favorite entry by type and reference ID."""
    stmt = select(Favorite).where(
        Favorite.type == type,
        Favorite.reference_id == reference_id
    )
    fav = (await session.execute(stmt)).scalars().first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")
        
    await session.delete(fav)
    await session.commit()
    return {"success": True}


@router.get("/check/{type}/{reference_id}")
async def check_favorite(
    type: str,
    reference_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    """Check if a resource is favorited."""
    stmt = select(Favorite).where(
        Favorite.type == type,
        Favorite.reference_id == reference_id
    )
    exists = (await session.execute(stmt)).scalars().first()
    return {"is_favorite": exists is not None}
