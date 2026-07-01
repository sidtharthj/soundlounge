"""Download queue model — tracks pending / active / completed downloads."""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class DownloadQueueBase(SQLModel):
    youtube_id: Optional[str] = Field(default=None, index=True)
    youtube_url: str
    title: Optional[str] = Field(default=None)
    thumbnail_url: Optional[str] = Field(default=None)
    status: str = Field(default="pending", index=True)   # pending | downloading | completed | failed | paused
    progress: float = Field(default=0.0)
    speed: Optional[str] = Field(default=None)
    eta: Optional[str] = Field(default=None)
    format: str = Field(default="mp3")
    quality: str = Field(default="192")
    output_template: Optional[str] = Field(default=None)
    download_path: Optional[str] = Field(default=None)
    options_json: Optional[str] = Field(default=None)
    error_message: Optional[str] = Field(default=None)


class DownloadQueue(DownloadQueueBase, table=True):
    __tablename__ = "download_queue"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)


class DownloadQueueCreate(SQLModel):
    youtube_url: str
    youtube_id: Optional[str] = None
    title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    format: str = "mp3"
    quality: str = "192"
    output_template: Optional[str] = None
    options_json: Optional[str] = None


class DownloadQueueRead(SQLModel):
    id: int
    youtube_id: Optional[str]
    youtube_url: str
    title: Optional[str]
    thumbnail_url: Optional[str]
    status: str
    progress: float
    speed: Optional[str]
    eta: Optional[str]
    format: str
    quality: str
    output_template: Optional[str]
    download_path: Optional[str]
    options_json: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
