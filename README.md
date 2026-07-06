# Sound Lounge 🎵

Sound Lounge is a modern, fast, and feature-rich desktop application designed for searching, downloading, and playing music. Built with a sleek React frontend and a powerful FastAPI backend, Sound Lounge provides a seamless Spotify-like experience while allowing you to build and manage your own local, DRM-free music library.

## ✨ Features

- **Seamless Search & Download**: Instantly search for any track or playlist from YouTube and download it in the highest quality directly to your local library.
- **Local Music Library**: Automatically organizes your downloaded tracks by artist, album, and track name.
- **Lightning Fast Playback**: Gapless playback with a custom audio engine, including seeking, volume control, shuffle, and repeat modes.
- **Playlists & Favorites**: Create custom playlists, heart your favorite songs, and easily manage your listening history.
- **Concurrent Downloads**: Built-in download manager that handles multiple parallel downloads, shows real-time progress, speed, and ETA via WebSockets.
- **Metadata Management**: Automatically embeds high-quality cover art, artist names, and album metadata into your audio files.
- **Fully Offline Capable**: Once downloaded, your music is yours to listen to anywhere, without an internet connection.

## 🚀 How to Use

### Searching & Downloading
1. Navigate to the **Search** tab on the sidebar.
2. Enter a song name, artist, or paste a direct YouTube URL.
3. Click the download icon on any search result to queue it up.
4. You can monitor progress in the **Downloads** tab.

### Managing Your Library
1. Head to the **Library** tab to view your downloaded tracks, grouped by Songs, Albums, or Artists.
2. Click the **Play** button on any row to start listening.
3. Use the **three dots (...)** menu on any track to add it to the queue or a playlist.

### Creating Playlists
1. In the sidebar, click the **+** icon next to "Playlists".
2. Give your playlist a name.
3. You can add songs to it directly from the Library or Search pages.

### Settings
- Use the **Settings** tab to change your default download directory, audio format (MP3, FLAC, M4A, Opus, WAV), audio quality, and app accent colors.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Zustand (State Management), Lucide Icons.
- **Backend**: Python (FastAPI), SQLite + SQLModel (with FTS5 Full Text Search), Uvicorn.
- **Engines**: `yt-dlp` for media extraction, `FFmpeg` for audio conversion, `mutagen` for ID3 tagging.
- **Packaging**: PyInstaller (for single-file `.exe` delivery) and Inno Setup (for `.msi`/`.exe` installer).

## 🏗 Build from Source (For Developers)

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- FFmpeg (must be available in PATH)

### 1. Setup Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run build
```

### 3. Run the App Locally
```bash
python soundlounge.py
```
*The app will start the FastAPI server on port 8765 and automatically open a browser window.*

## 📥 Installation

For the easiest experience, you do not need to build from source. 

1. Go to the **Releases** page of this repository.
2. Download the latest **`SoundLounge-Setup.exe`** file.
3. Run the installer and follow the setup wizard.
4. Launch Sound Lounge from your desktop or start menu and enjoy!
