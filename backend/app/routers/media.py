"""Media router — serve audio streams and thumbnail cache."""

import os
import mimetypes
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.song import Song

router = APIRouter(prefix="/media", tags=["media"])


def range_requests_response(request: Request, file_path: str, content_type: str) -> StreamingResponse:
    """Helper to serve files with HTTP Range support for seeking/scrubbing."""
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")
    
    if not range_header:
        # Serve the entire file normally
        def iter_full_file():
            with open(file_path, mode="rb") as f:
                while chunk := f.read(1024 * 1024):  # 1MB chunk
                    yield chunk
        return StreamingResponse(
            iter_full_file(),
            headers={"Accept-Ranges": "bytes", "Content-Length": str(file_size)},
            media_type=content_type
        )
        
    # Range: bytes=start-end
    try:
        range_val = range_header.replace("bytes=", "").strip()
        parts = range_val.split("-")
        start = int(parts[0])
        end = int(parts[1]) if parts[1] else file_size - 1
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid range header structure."
        )
        
    if start >= file_size or end >= file_size or start > end:
        raise HTTPException(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail=f"Requested range {start}-{end} out of bounds for size {file_size}"
        )
        
    length = end - start + 1
    chunk_size = 512 * 1024  # 512KB chunks
    
    def iter_bytes():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                to_read = min(chunk_size, remaining)
                chunk = f.read(to_read)
                if not chunk:
                    break
                yield chunk
                remaining -= len(chunk)
                
    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(length),
    }
    return StreamingResponse(
        iter_bytes(),
        status_code=status.HTTP_206_PARTIAL_CONTENT,
        headers=headers,
        media_type=content_type
    )


@router.get("/audio/{song_id}")
async def stream_audio(
    song_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    """Stream audio with support for seeking (HTTP 206 Range requests)."""
    song = await session.get(Song, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
        
    file_path = song.file_path
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found on disk")
        
    content_type, _ = mimetypes.guess_type(file_path)
    if not content_type:
        content_type = "audio/mpeg"  # default fallback
        
    return range_requests_response(request, file_path, content_type)


@router.get("/thumbnail/{song_id}")
async def get_thumbnail(
    song_id: int,
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Serve cached artwork thumbnail for a song."""
    song = await session.get(Song, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
        
    artwork_path = song.artwork_path
    if not artwork_path or not os.path.exists(artwork_path):
        raise HTTPException(status_code=404, detail="Thumbnail file not found")
        
    return FileResponse(artwork_path)
