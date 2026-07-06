# -*- mode: python ; coding: utf-8 -*-
"""
SoundLounge.spec — PyInstaller build specification for Sound Lounge.

Run with:
    pyinstaller SoundLounge.spec
"""

import sys
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(SPECPATH)
BACKEND_DIR  = PROJECT_ROOT / "backend"
STATIC_DIR   = BACKEND_DIR  / "static"       # Vite build output
FFMPEG_DIR   = PROJECT_ROOT / "dist_tools" / "ffmpeg"

# ── Hidden imports ────────────────────────────────────────────────────────────
HIDDEN_IMPORTS = [
    # uvicorn internals
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.loops.asyncio",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.http.httptools_impl",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.protocols.websockets.websockets_impl",
    "uvicorn.protocols.websockets.wsproto_impl",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    # FastAPI / Starlette
    "fastapi",
    "starlette",
    "starlette.responses",
    "starlette.staticfiles",
    "starlette.middleware.cors",
    # SQLModel / SQLAlchemy async
    "sqlmodel",
    "sqlalchemy",
    "sqlalchemy.ext.asyncio",
    "aiosqlite",
    # yt-dlp
    "yt_dlp",
    "yt_dlp.extractor",
    "yt_dlp.postprocessor",
    # mutagen
    "mutagen",
    "mutagen.mp3",
    "mutagen.mp4",
    "mutagen.flac",
    "mutagen.id3",
    # app modules
    "app",
    "app.config",
    "app.database",
    "app.main",
    "app.models",
    "app.models.song",
    "app.models.playlist",
    "app.models.favorite",
    "app.models.queue",
    "app.models.history",
    "app.models.settings",
    "app.routers",
    "app.routers.search",
    "app.routers.download",
    "app.routers.songs",
    "app.routers.playlists",
    "app.routers.favorites",
    "app.routers.history",
    "app.routers.settings",
    "app.routers.media",
    "app.services",
    "app.services.ytdlp_service",
    "app.services.download_manager",
    "app.services.library_service",
    "app.services.thumbnail_service",
    "app.websocket",
    "app.websocket.manager",
    # misc
    "aiofiles",
    "multipart",
    "pydantic",
    "pydantic_settings",
    "websockets",
    "email_validator",
    "anyio",
    "h11",
]

# ── Data files ────────────────────────────────────────────────────────────────
datas = []

# Bundle backend/app Python package
datas.append((str(BACKEND_DIR / "app"), "app"))

# Bundle pre-built React frontend (served as static files by FastAPI)
if STATIC_DIR.exists():
    datas.append((str(STATIC_DIR), "static"))
else:
    print(
        "\n[WARN] backend/static/ not found — run 'npm run build' in frontend/ first!\n"
    )

# Bundle FFmpeg executables into an 'ffmpeg/' subfolder inside the bundle
if (FFMPEG_DIR / "ffmpeg.exe").exists():
    datas.append((str(FFMPEG_DIR / "ffmpeg.exe"),  "ffmpeg"))
    print(f"[INFO] Bundling ffmpeg.exe from {FFMPEG_DIR}")
else:
    print(f"\n[WARN] ffmpeg.exe not found in {FFMPEG_DIR} — bundle will lack FFmpeg!\n")

if (FFMPEG_DIR / "ffprobe.exe").exists():
    datas.append((str(FFMPEG_DIR / "ffprobe.exe"), "ffmpeg"))
    print(f"[INFO] Bundling ffprobe.exe from {FFMPEG_DIR}")

# ── Analysis ──────────────────────────────────────────────────────────────────
a = Analysis(
    [str(PROJECT_ROOT / "soundlounge.py")],
    pathex=[str(PROJECT_ROOT), str(BACKEND_DIR)],
    binaries=[],
    datas=datas,
    hiddenimports=HIDDEN_IMPORTS,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "numpy", "PIL", "scipy"],
    noarchive=False,
    optimize=0,
)

# ── PYZ archive ───────────────────────────────────────────────────────────────
pyz = PYZ(a.pure)

# ── EXE ──────────────────────────────────────────────────────────────────────
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="SoundLounge",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,           # No console window — runs silently in background
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    # icon="dist_tools/icon.ico",  # Uncomment if you add an icon
)

# ── COLLECT (one-folder mode for fast startup) ────────────────────────────────
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="SoundLounge",
)
