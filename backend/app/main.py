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
    # Startup actions
    logger.info("Initializing database...")
    await init_db()
    
    logger.info("Resuming pending downloads...")
    await download_manager.resume_pending_on_startup()
    
    yield
    # Shutdown actions
    logger.info("Shutting down Sound Lounge backend...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api
api_router = FastAPI()
api_router.include_router(search.router)
api_router.include_router(download.router)
api_router.include_router(songs.router)
api_router.include_router(playlists.router)
api_router.include_router(favorites.router)
api_router.include_router(history.router)
api_router.include_router(settings_router.router)
api_router.include_router(media.router)

app.mount("/api", api_router)


# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Maintain connection and read messages if any
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)


# Serve Static Files for React Frontend
# Create static directory if not exists
os.makedirs(settings.STATIC_DIR, exist_ok=True)

if os.path.exists(settings.STATIC_DIR):
    app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")


# Fallback to index.html for SPA client-side routing (React Router)
@app.exception_handler(404)
async def spa_fallback(request: Request, exc: Exception):
    # Do not fallback for API requests or WebSocket
    if request.url.path.startswith("/api") or request.url.path.startswith("/ws"):
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
        
    index_file = settings.STATIC_DIR / "index.html"
    if index_file.exists():
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
            
    return HTMLResponse(
        content="""
        <html>
            <head><title>Sound Lounge</title></head>
            <body style="background-color: #0a0a0a; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                    <h1 style="color: #1DB954;">Sound Lounge</h1>
                    <p>API is running, but frontend build assets are missing.</p>
                </div>
            </body>
        </html>
        """,
        status_code=200
    )
