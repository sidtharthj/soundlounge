"""Playlist and PlaylistSong models."""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


# ── Playlist ──────────────────────────────────────────────────────────────────

class PlaylistBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    artwork_path: Optional[str] = Field(default=None)


class Playlist(PlaylistBase, table=True):
    __tablename__ = "playlists"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PlaylistCreate(SQLModel):
    name: str
    description: Optional[str] = None
    artwork_path: Optional[str] = None


class PlaylistUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    artwork_path: Optional[str] = None


class PlaylistRead(SQLModel):
    id: int
    name: str
    description: Optional[str]
    artwork_path: Optional[str]
    created_at: datetime
    updated_at: datetime
    song_count: int = 0


class PlaylistReadWithSongs(PlaylistRead):
    songs: list = []


# ── PlaylistSong (junction table) ────────────────────────────────────────────

class PlaylistSongBase(SQLModel):
    playlist_id: int = Field(foreign_key="playlists.id", index=True)
    song_id: int = Field(foreign_key="songs.id", index=True)
    position: int = Field(default=0)


class PlaylistSong(PlaylistSongBase, table=True):
    __tablename__ = "playlist_songs"

    id: Optional[int] = Field(default=None, primary_key=True)
    added_at: datetime = Field(default_factory=datetime.utcnow)


class PlaylistSongCreate(SQLModel):
    song_id: int
    position: Optional[int] = None
