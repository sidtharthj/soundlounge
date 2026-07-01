"""Favorites model — liked songs, playlists, or artists."""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class FavoriteBase(SQLModel):
    type: str = Field(index=True)          # "song" | "playlist" | "artist"
    reference_id: int = Field(index=True)  # FK to songs.id or playlists.id


class Favorite(FavoriteBase, table=True):
    __tablename__ = "favorites"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FavoriteCreate(SQLModel):
    type: str
    reference_id: int


class FavoriteRead(SQLModel):
    id: int
    type: str
    reference_id: int
    created_at: datetime
