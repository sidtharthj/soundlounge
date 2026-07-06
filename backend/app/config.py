"""Application configuration and path setup — supports both dev and PyInstaller frozen modes."""

import os
import sys
from pathlib import Path
from pydantic_settings import BaseSettings


def _get_base_dir() -> Path:
    """Return the base directory that works for both normal Python and PyInstaller bundles.

    In PyInstaller 6 one-folder mode, sys._MEIPASS points to the _internal/
    directory which contains all bundled data (static/, app/, ffmpeg/, etc.).
    """
    if getattr(sys, "frozen", False):
        # _MEIPASS is the _internal/ folder (PyInstaller 6 one-folder mode)
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))  # type: ignore[attr-defined]
    # Normal Python execution: project root is two levels above this file
    return Path(__file__).resolve().parent.parent


def _get_data_dir() -> Path:
    """Return a persistent data directory next to the executable (or project root in dev)."""
    if getattr(sys, "frozen", False):
        # Store user data next to the .exe so it persists across runs
        exe_dir = Path(sys.executable).parent
        return exe_dir / "SoundLounge_Data"
    return Path(__file__).resolve().parent.parent / "data"


def _get_ffmpeg_path() -> str:
    """Auto-detect ffmpeg in bundled or system paths.

    PyInstaller 6 one-folder: ffmpeg lives in sys._MEIPASS/ffmpeg/ffmpeg.exe
    """
    if getattr(sys, "frozen", False):
        meipass = getattr(sys, "_MEIPASS", None)
        exe_dir = Path(sys.executable).parent
        candidates = []
        if meipass:
            candidates.append(Path(meipass) / "ffmpeg" / "ffmpeg.exe")   # _internal/ffmpeg/
        candidates.extend([
            exe_dir / "ffmpeg" / "ffmpeg.exe",   # next to .exe (legacy layout)
            exe_dir / "ffmpeg.exe",               # directly next to .exe
        ])
        for c in candidates:
            if c.exists():
                return str(c)
    # Dev / system path — let yt-dlp find it automatically
    return ""


class Settings(BaseSettings):
    """Application settings loaded from environment or defaults."""

    APP_NAME: str = "Sound Lounge"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Resolved at startup
    BASE_DIR: Path = _get_base_dir()
    DATA_DIR: Path = _get_data_dir()
    DOWNLOADS_DIR: Path = _get_data_dir() / "downloads"
    THUMBNAILS_DIR: Path = _get_data_dir() / "thumbnails"
    STATIC_DIR: Path = _get_base_dir() / "static"

    # FFmpeg (auto-detected; can be overridden by settings in DB)
    FFMPEG_PATH: str = _get_ffmpeg_path()

    # Database
    DATABASE_URL: str = ""

    # Download settings
    MAX_CONCURRENT_DOWNLOADS: int = 2
    DEFAULT_AUDIO_FORMAT: str = "mp3"
    DEFAULT_AUDIO_QUALITY: str = "192"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8765

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8765",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8765",
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
