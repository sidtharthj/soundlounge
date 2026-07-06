"""Database engine, session, and initialization (SQLite + FTS5)."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, text

from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False},
)

async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncSession:  # type: ignore[misc]
    """FastAPI dependency that yields an async database session."""
    async with async_session() as session:
        yield session


FTS5_SETUP_SQL = [
    """
    CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(
        title,
        artist,
        album,
        content='songs',
        content_rowid='id'
    );
    """,
    """
    CREATE TRIGGER IF NOT EXISTS songs_ai AFTER INSERT ON songs BEGIN
        INSERT INTO songs_fts(rowid, title, artist, album)
        VALUES (new.id, new.title, new.artist, new.album);
    END;
    """,
    """
    CREATE TRIGGER IF NOT EXISTS songs_ad AFTER DELETE ON songs BEGIN
        INSERT INTO songs_fts(songs_fts, rowid, title, artist, album)
        VALUES ('delete', old.id, old.title, old.artist, old.album);
    END;
    """,
    """
    CREATE TRIGGER IF NOT EXISTS songs_au AFTER UPDATE ON songs BEGIN
        INSERT INTO songs_fts(songs_fts, rowid, title, artist, album)
        VALUES ('delete', old.id, old.title, old.artist, old.album);
        INSERT INTO songs_fts(rowid, title, artist, album)
        VALUES (new.id, new.title, new.artist, new.album);
    END;
    """
]


async def init_db() -> None:
    """Create all tables and set up FTS5 virtual table + triggers."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    # FTS5 and triggers must be run via raw SQL
    async with async_session() as session:
        for statement in FTS5_SETUP_SQL:
            stmt = statement.strip()
            if stmt:
                await session.execute(text(stmt))
        await session.commit()
