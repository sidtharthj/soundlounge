"""Application configuration and path setup."""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment or defaults."""

    APP_NAME: str = "Sound Lounge"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Directories (relative to project root by default)
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    DOWNLOADS_DIR: Path = DATA_DIR / "downloads"
    THUMBNAILS_DIR: Path = DATA_DIR / "thumbnails"
    STATIC_DIR: Path = BASE_DIR / "static"

    # Database
    DATABASE_URL: str = ""

    # Download settings
    MAX_CONCURRENT_DOWNLOADS: int = 2
    DEFAULT_AUDIO_FORMAT: str = "mp3"
    DEFAULT_AUDIO_QUALITY: str = "192"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ]

    class Config:
        env_prefix = "SOUNDLOUNGE_"
        env_file = ".env"
        extra = "ignore"

    def model_post_init(self, __context: object) -> None:
        """Create required directories and set computed fields."""
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
        self.THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
        if not self.DATABASE_URL:
            self.DATABASE_URL = f"sqlite+aiosqlite:///{self.DATA_DIR / 'soundlounge.db'}"


settings = Settings()
