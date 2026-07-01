"""Search router — YouTube searching and format extraction."""

from fastapi import APIRouter, HTTPException, Query
from typing import Any

from app.services.ytdlp_service import YTDLPService

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search_youtube(
    q: str = Query(..., description="The search query"),
    type: str = Query("song", description="Search type: song, artist, or playlist"),
    limit: int = Query(3, description="Limit of search results (default 3 for top matches)"),
) -> dict[str, Any]:
    """Search YouTube for videos, channels (artists), or playlists."""
    if type not in ("song", "artist", "playlist"):
        raise HTTPException(status_code=400, detail="Invalid search type. Must be song, artist, or playlist.")
    
    try:
        results = await YTDLPService.search(q, search_type=type, limit=limit)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"YouTube search failed: {str(e)}")


@router.get("/formats/{youtube_id}")
async def get_video_formats(youtube_id: str) -> dict[str, Any]:
    """Get all available download formats for a given YouTube video ID."""
    try:
        formats = await YTDLPService.get_formats(youtube_id)
        return {"formats": formats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch formats: {str(e)}")


@router.get("/playlist-info")
async def get_playlist_info(
    url: str = Query(..., description="The YouTube playlist URL")
) -> dict[str, Any]:
    """Extract metadata and entries for a pasted playlist URL."""
    try:
        playlist_data = await YTDLPService.extract_playlist(url)
        return playlist_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract playlist: {str(e)}")


@router.get("/video-info")
async def get_video_info(
    url: str = Query(..., description="The YouTube video URL")
) -> dict[str, Any]:
    """Extract metadata for a pasted video URL."""
    try:
        info = await YTDLPService.extract_info(url)
        if not info:
            raise HTTPException(status_code=404, detail="No video info found")
        return {
            "id": info.get("id"),
            "title": info.get("title"),
            "url": info.get("webpage_url") or url,
            "thumbnail": info.get("thumbnail"),
            "duration": info.get("duration"),
            "channel": info.get("channel") or info.get("uploader"),
            "view_count": info.get("view_count"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract video info: {str(e)}")
