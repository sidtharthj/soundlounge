import React from "react";
import { Play, Pause, Heart, MoreHorizontal, Trash2, ListPlus, FolderPlus } from "lucide-react";
import { Song } from "@/lib/types";
import { usePlayer } from "@/hooks/usePlayer";
import { useLibraryStore } from "@/stores/libraryStore";

import { ArtworkImage } from "../common/ArtworkImage";

import { api } from "@/lib/api";

interface SongRowProps {
  song: Song;
  index: number;
  showDateAdded?: boolean;
  onRemoveFromPlaylist?: (songId: number) => void; // Optional callback for playlists view
}

export const SongRow: React.FC<SongRowProps> = ({
  song,
  index,
  showDateAdded = true,
  onRemoveFromPlaylist,
}) => {
  const player = usePlayer();
  const likedSongs = useLibraryStore((state) => state.likedSongs);
  const toggleLike = useLibraryStore((state) => state.toggleLike);
  const deleteSong = useLibraryStore((state) => state.deleteSong);
  
  const playlists = useLibraryStore((state) => state.playlists);
  

  const [isHovered, setIsHovered] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isCurrent = player.currentSong?.id === song.id;
  const isPlaying = isCurrent && player.isPlaying;
  const isLiked = likedSongs.some((s) => s.id === song.id);

  const handleRowDoubleClick = () => {
    player.playSong(song);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      player.togglePlay();
    } else {
      player.playSong(song);
    }
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(song);
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    player.addToQueue(song);
    setShowMenu(false);
    alert(`Added "${song.title}" to queue.`);
  };

  const handleAddToPlaylist = async (playlistId: number) => {
    try {
      await api.addSongToPlaylist(playlistId, song.id);
      alert(`Added "${song.title}" to playlist.`);
      setShowMenu(false);
    } catch (e: any) {
      alert("Failed to add to playlist: " + e.message);
    }
  };

  const handleDeleteSong = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to permanently delete "${song.title}" from your library and disk?`)) {
      try {
        await deleteSong(song.id);
        setShowMenu(false);
      } catch (err: any) {
        alert("Failed to delete song: " + err.message);
      }
    }
  };

  const handleRemoveFromPlaylistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveFromPlaylist) {
      onRemoveFromPlaylist(song.id);
      setShowMenu(false);
    }
  };

  // Format downloaded date
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleRowDoubleClick}
      className={`grid grid-cols-[40px_minmax(150px,2fr)_minmax(100px,1fr)_120px_100px_60px] items-center gap-4 px-4 py-2 text-sm text-spotify-text rounded-md hover:bg-spotify-hover/40 transition duration-150 group cursor-pointer ${
        isCurrent ? "bg-spotify-hover/20 text-white" : ""
      }`}
    >
      {/* Index / Play Button */}
      <div className="flex items-center justify-center font-medium">
        {isHovered ? (
          <button onClick={handlePlayClick} className="text-white hover:scale-105 active:scale-95 transition">
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-[1px]" />}
          </button>
        ) : (
          <span className={`text-xs ${isCurrent ? "text-spotify-green font-semibold" : ""}`}>
            {index + 1}
          </span>
        )}
      </div>

      {/* Title & Artist & Artwork */}
      <div className="flex items-center gap-3 min-w-0">
        <ArtworkImage
          artworkPath={song.artwork_path}
          songId={song.id}
          title={song.title}
          className="w-10 h-10 rounded object-cover border border-white/5 shrink-0"
        />
        <div className="min-w-0">
          <div className={`font-semibold truncate leading-normal ${isCurrent ? "text-spotify-green" : "text-white"}`}>
            {song.title}
          </div>
          <div className="text-xs truncate font-medium mt-0.5">{song.artist}</div>
        </div>
      </div>

      {/* Album */}
      <div className="truncate font-semibold text-xs opacity-90">{song.album}</div>

      {/* Date Added */}
      <div>{showDateAdded && song.date_downloaded ? formatDate(song.date_downloaded) : "--"}</div>

      {/* Play Count */}
      <div className="text-xs font-semibold">{song.play_count} plays</div>

      {/* Liked state & Options menu */}
      <div className="flex items-center justify-end gap-3 relative" ref={menuRef}>
        {(isHovered || isLiked) && (
          <button
            onClick={handleToggleLike}
            className="text-spotify-text hover:text-white transition"
            title={isLiked ? "Unlike" : "Like"}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-spotify-green text-spotify-green" : ""}`} />
          </button>
        )}

        {isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="text-spotify-text hover:text-white p-1 rounded-full hover:bg-spotify-hover transition"
            title="More Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}

        {/* Options Context Menu Popup */}
        {showMenu && (
          <div className="absolute right-0 bottom-8 z-30 w-52 bg-spotify-card border border-white/10 rounded-md shadow-2xl p-1 flex flex-col select-none">
            <button
              onClick={handleAddToQueue}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white hover:bg-spotify-hover rounded text-left transition"
            >
              <ListPlus className="w-3.5 h-3.5" />
              Add to Queue
            </button>

            {/* Add to Playlist Submenu */}
            <div className="relative group/sub">
              <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-white hover:bg-spotify-hover rounded text-left transition cursor-default">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-3.5 h-3.5" />
                  Add to Playlist
                </div>
                <span className="text-[10px] opacity-60">▶</span>
              </div>
              
              {/* Playlists lists */}
              <div className="hidden group-hover/sub:flex flex-col absolute right-full bottom-0 w-44 bg-spotify-card border border-white/10 rounded-md shadow-2xl p-1 max-h-48 overflow-y-auto">
                {playlists.length === 0 ? (
                  <span className="px-3 py-2 text-[10px] text-spotify-text italic">No playlists</span>
                ) : (
                  playlists.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAddToPlaylist(p.id)}
                      className="px-3 py-2 text-[11px] font-semibold text-white hover:bg-spotify-hover rounded text-left transition truncate"
                    >
                      {p.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Playlist specific remove action */}
            {onRemoveFromPlaylist && (
              <button
                onClick={handleRemoveFromPlaylistClick}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white hover:bg-spotify-hover rounded text-left transition border-t border-white/5"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                Remove from Playlist
              </button>
            )}

            {/* Global Delete action */}
            <button
              onClick={handleDeleteSong}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-spotify-hover rounded text-left transition border-t border-white/5"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              Delete from Library
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

