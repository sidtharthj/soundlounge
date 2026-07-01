# Sound Lounge — Implementation Plan (Final)

> Local-first desktop music manager. Standalone .exe distribution — zero dependencies for recipients.

## Final Decisions
- **Name**: Sound Lounge
- **Distribution**: Standalone `.exe` via PyInstaller (no Docker)
- **Search**: Searchable by songs, artists, OR playlists (user selects type)
- **Manual URL**: Paste any YouTube video/playlist URL directly
- **Playlist download**: Full playlist download with song selection
- **Default directory**: `~/Music/SoundLounge/`
- **Concurrent downloads**: 2
- **Port**: 8765

## Architecture
- React + TypeScript + Tailwind + shadcn/ui (frontend, built, served by FastAPI)
- Python FastAPI (backend)
- SQLite + FTS5 (database)
- yt-dlp (search + download)
- FFmpeg (audio processing, bundled)
- PyInstaller (packaging to standalone .exe)
- WebSocket (real-time download progress)

## Search Types
| Type | yt-dlp Query | Results |
|------|-------------|---------|
| Songs | `ytsearch3:query` | Top 3 videos |
| Artists | `ytsearch3:query artist` | Top 3 channels/videos |
| Playlists | `ytsearch_playlist3:query` | Top 3 playlists with song lists |

## Build Phases
1. Project scaffolding + backend foundation
2. YouTube search (songs/artists/playlists) + manual URL
3. Download system with full yt-dlp options
4. Local library with FTS5
5. Audio playback
6. Playlists & favorites
7. Home, history, queue UI
8. Settings
9. PyInstaller packaging
10. Testing & polish