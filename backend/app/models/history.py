"""Play history model — records each time a song is played."""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class PlayHistoryBase(SQLModel):
    song_id: int = Field(foreign_key="songs.id", index=True)
    played_duration: Optional[float] = Field(default=None)


class PlayHistory(PlayHistoryBase, table=True):
    __tablename__ = "play_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    played_at: datetime = Field(default_factory=datetime.utcnow)


class PlayHistoryCreate(SQLModel):
    song_id: int
    played_duration: Optional[float] = None


class PlayHistoryRead(SQLModel):
    id: int
    song_id: int
    played_at: datetime
    played_duration: Optional[float]
