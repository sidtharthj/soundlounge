"""Main application entry point for Sound Lounge backend."""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.services.download_manager import download_manager
from app.websocket.manager import ws_manager
from app.routers import (
    search,
    download,
    songs,
    playlists,
    favorites,
    history,
    settings as settings_router,
    media,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    await init_db()

    logger.info("Resuming pending downloads...")
    await download_manager.resume_pending_on_startup()

    yield
    # Shutdown
    logger.info("Shutting down Sound Lounge backend...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    # Disable automatic docs in prod (can be re-enabled in debug mode)
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url=None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API routers mounted at /api ---
api_app = FastAPI(title="Sound Lounge API")
api_app.include_router(search.router)
api_app.include_router(download.router)
api_app.include_router(songs.router)
api_app.include_router(playlists.router)
api_app.include_router(favorites.router)
api_app.include_router(history.router)
api_app.include_router(settings_router.router)
api_app.include_router(media.router)

app.mount("/api", api_app)


# --- WebSocket ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)


# --- Static frontend ---
_static_dir = settings.STATIC_DIR
os.makedirs(_static_dir, exist_ok=True)

_assets_dir = _static_dir / "assets"
if _assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")


def _index_response() -> HTMLResponse:
    index_file = _static_dir / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text(encoding="utf-8"), status_code=200)
    return HTMLResponse(
        content="""<!DOCTYPE html>
<html>
  <head><title>Sound Lounge</title></head>
  <body style="background:#0a0a0a;color:#fff;font-family:sans-serif;
               display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
    <div style="text-align:center;">
      <h1 style="color:#1DB954;font-size:2.5rem;margin-bottom:1rem;">🎵 Sound Lounge</h1>
      <p style="opacity:0.7;">Backend API is running.</p>
      <p style="opacity:0.5;font-size:0.8rem;">
        Frontend assets not found — run <code>npm run build</code> in the <code>frontend/</code> folder.
      </p>
    </div>
  </body>
</html>""",
        status_code=200,
    )


@app.get("/")
async def serve_root():
    return _index_response()


# SPA catch-all: any non-API, non-WS path → index.html for React Router
@app.exception_handler(404)
async def spa_fallback(request: Request, exc: Exception):
    path = request.url.path
    if path.startswith("/api") or path.startswith("/ws"):
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
    return _index_response()
