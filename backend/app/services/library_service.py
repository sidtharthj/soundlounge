"""Library service — FTS5 search and song management helpers."""

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, text

from app.models.song import Song

logger = logging.getLogger(__name__)


class LibraryService:
    """Helpers for searching and querying the local song library."""

    @staticmethod
    async def fts_search(session: AsyncSession, query: str, limit: int = 50, offset: int = 0) -> list[Song]:
        """Full-text search using SQLite FTS5.

        Supports prefix matching via appending '*' automatically.
        """
        # Sanitize: wrap each token with quotes and append *
        tokens = query.strip().split()
        fts_query = " ".join(f'"{t}"*' for t in tokens if t)

        if not fts_query:
            return []

        sql = text(
            """
            SELECT s.*
            FROM songs s
            JOIN songs_fts ON songs_fts.rowid = s.id
            WHERE songs_fts MATCH :query
            ORDER BY rank
            LIMIT :limit OFFSET :offset
            """
        )
        result = await session.execute(sql, {"query": fts_query, "limit": limit, "offset": offset})
        rows = result.mappings().all()
        return [Song(**dict(row)) for row in rows]

    @staticmethod
    async def get_songs_paginated(
        session: AsyncSession,
        limit: int = 50,
        offset: int = 0,
        sort_by: str = "date_downloaded",
        sort_order: str = "desc",
    ) -> tuple[list[Song], int]:
        """Return paginated song list and total count."""
        # Validate sort column to prevent SQL injection
        allowed_sort = {"title", "artist", "album", "date_downloaded", "play_count", "duration", "file_size"}
        if sort_by not in allowed_sort:
            sort_by = "date_downloaded"

        # Count
        count_result = await session.execute(text("SELECT COUNT(*) FROM songs"))
        total = count_result.scalar() or 0

        # Fetch
        order_dir = "DESC" if sort_order.lower() == "desc" else "ASC"
        sql = text(f"SELECT * FROM songs ORDER BY {sort_by} {order_dir} LIMIT :limit OFFSET :offset")
        result = await session.execute(sql, {"limit": limit, "offset": offset})
        rows = result.mappings().all()
        songs = [Song(**dict(row)) for row in rows]
        return songs, total

    @staticmethod
    async def get_song_by_youtube_id(session: AsyncSession, youtube_id: str) -> Song | None:
        """Look up a song by its YouTube video ID."""
        stmt = select(Song).where(Song.youtube_id == youtube_id)
        result = await session.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def get_stats(session: AsyncSession) -> dict[str, Any]:
        """Return library statistics."""
        total_result = await session.execute(text("SELECT COUNT(*) FROM songs"))
        total = total_result.scalar() or 0

        size_result = await session.execute(text("SELECT COALESCE(SUM(file_size), 0) FROM songs"))
        total_size = size_result.scalar() or 0

        duration_result = await session.execute(text("SELECT COALESCE(SUM(duration), 0) FROM songs"))
        total_duration = duration_result.scalar() or 0

        return {
            "total_songs": total,
            "total_size_bytes": total_size,
            "total_duration_seconds": total_duration,
        }
