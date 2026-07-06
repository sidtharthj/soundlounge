"""Song model — represents a downloaded audio track."""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class SongBase(SQLModel):
    title: str = Field(index=True)
    artist: str = Field(default="Unknown Artist", index=True)
    album: str = Field(default="Unknown Album")
    duration: Optional[float] = Field(default=None)
    file_path: str
    artwork_path: Optional[str] = Field(default=None)
    youtube_id: Optional[str] = Field(default=None, unique=True, index=True)
    youtube_url: Optional[str] = Field(default=None)
    format: str = Field(default="mp3")
    bitrate: Optional[int] = Field(default=None)
    file_size: Optional[int] = Field(default=None)
    metadata_json: Optional[str] = Field(default=None)


class Song(SongBase, table=True):
    __tablename__ = "songs"

    id: Optional[int] = Field(default=None, primary_key=True)
    date_downloaded: datetime = Field(default_factory=datetime.utcnow)
    play_count: int = Field(default=0)
    last_played: Optional[datetime] = Field(default=None)


class SongCreate(SQLModel):
    title: str
    artist: str = "Unknown Artist"
    album: str = "Unknown Album"
    duration: Optional[float] = None
    file_path: str
    artwork_path: Optional[str] = None
    youtube_id: Optional[str] = None
    youtube_url: Optional[str] = None
    format: str = "mp3"
    bitrate: Optional[int] = None
    file_size: Optional[int] = None
    metadata_json: Optional[str] = None


class SongRead(SQLModel):
    id: int
    title: str
    artist: str
    album: str
    duration: Optional[float]
    file_path: str
    artwork_path: Optional[str]
    youtube_id: Optional[str]
    youtube_url: Optional[str]
    format: str
    bitrate: Optional[int]
    file_size: Optional[int]
    date_downloaded: datetime
    play_count: int
    last_played: Optional[datetime]
    metadata_json: Optional[str]


class SongUpdate(SQLModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    duration: Optional[float] = None
    artwork_path: Optional[str] = None
    format: Optional[str] = None
    bitrate: Optional[int] = None
    metadata_json: Optional[str] = None
