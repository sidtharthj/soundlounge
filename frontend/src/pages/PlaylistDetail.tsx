import React from "react";
import { Music, Play, Trash2, Edit2, Download, ArrowUp, ArrowDown } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { usePlayer } from "@/hooks/usePlayer";
import { SongRow } from "@/components/library/SongRow";
import { api } from "@/lib/api";
import { PlaylistDetail as PlaylistDetailType } from "@/lib/types";

export const PlaylistDetail: React.FC = () => {
  const playlistId = useUIStore((state) => state.selectedPlaylistId);
  const setCurrentView = useUIStore((state) => state.setCurrentView);
  const deletePlaylist = useLibraryStore((state) => state.deletePlaylist);
  
  const player = usePlayer();

  const [details, setDetails] = React.useState<PlaylistDetailType | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [isReorderMode, setIsReorderMode] = React.useState(false);

  const fetchDetails = React.useCallback(async () => {
    if (!playlistId) return;
    setLoading(true);
    try {
      const data = await api.getPlaylistDetails(playlistId);
      setDetails(data);
    } catch (e) {
      console.error(e);
      alert("Failed to load playlist details.");
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  React.useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (!playlistId) return null;

  const handlePlayAll = () => {
    if (details && details.songs.length > 0) {
      const songs = details.songs.map((ps) => ps.song);
      player.playList(songs, 0);
    }
  };

  const handleRenamePlaylist = async () => {
    if (!details) return;
    const newName = prompt("Enter new name:", details.name);
    if (!newName || !newName.trim()) return;
    
    try {
      await api.updatePlaylist(details.id, { name: newName.trim() });
      fetchDetails();
    } catch (e) {
      alert("Failed to rename playlist");
    }
  };

  const handleDeletePlaylist = async () => {
    if (!details) return;
    if (confirm(`Are you sure you want to permanently delete playlist "${details.name}"?`)) {
      try {
        await deletePlaylist(details.id);
        setCurrentView("home");
      } catch (e) {
        alert("Failed to delete playlist");
      }
    }
  };

  const handleRemoveSong = async (songId: number) => {
    if (!details) return;
    try {
      await api.removeSongFromPlaylist(details.id, songId);
      // Reload details
      fetchDetails();
    } catch (e) {
      alert("Failed to remove song");
    }
  };

  // Reorder Logic (Move item up / down in state array and commit)
  const moveSong = async (index: number, direction: "up" | "down") => {
    if (!details) return;
    const songsList = [...details.songs];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= songsList.length) return;
    
    // Swap
    const temp = songsList[index];
    songsList[index] = songsList[targetIndex];
    songsList[targetIndex] = temp;

    // Update local state immediately for visual response
    setDetails({
      ...details,
      songs: songsList.map((ps, idx) => ({ ...ps, position: idx })),
    });

    try {
      const songIds = songsList.map((ps) => ps.song.id);
      await api.reorderPlaylistSongs(details.id, songIds);
    } catch (e) {
      console.error(e);
      alert("Failed to save new order in database.");
      fetchDetails(); // revert
    }
  };

  // Export playlist as JSON file download
  const handleExportPlaylist = async () => {
    if (!details) return;
    try {
      const data = await api.exportPlaylist(details.id);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${details.name.toLowerCase().replace(/\s+/g, "_")}_playlist.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      alert("Failed to export playlist");
    }
  };

  return (
    <div className="select-none flex flex-col h-full">
      {loading && !details ? (
        <div className="flex items-center justify-center py-20 text-spotify-text italic">
          Loading playlist details...
        </div>
      ) : !details ? (
        <div className="p-8 text-center text-spotify-text">Playlist not found.</div>
      ) : (
        <>
          {/* Header Banner */}
          <div className="p-6 bg-gradient-to-b from-spotify-hover to-spotify-dark flex flex-col sm:flex-row items-end gap-6 border-b border-white/5">
            <div className="w-36 h-36 bg-spotify-hover rounded-lg flex items-center justify-center text-spotify-text shadow-2xl shrink-0 border border-white/5">
              <Music className="w-16 h-16" />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-spotify-text">Playlist</span>
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight truncate leading-tight">
                {details.name}
              </h2>
              <p className="text-xs text-spotify-text font-medium truncate">
                {details.description || "No description provided."}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-white/80 font-medium">
                <span className="font-bold text-white">Sound Lounge</span>
                <span>•</span>
                <span>{details.songs.length} songs</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="p-6 flex-1 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {details.songs.length > 0 && (
                  <button
                    onClick={handlePlayAll}
                    className="w-12 h-12 bg-spotify-green hover:scale-105 active:scale-95 text-black rounded-full flex items-center justify-center shadow-lg transition duration-200"
                    title="Play all tracks"
                  >
                    <Play className="w-5 h-5 fill-black text-black translate-x-[1px]" />
                  </button>
                )}

                <button
                  onClick={handleRenamePlaylist}
                  className="px-4 py-2 border border-white/10 rounded-full text-xs font-bold text-white hover:border-white transition flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Rename
                </button>

                <button
                  onClick={handleExportPlaylist}
                  className="px-4 py-2 border border-white/10 rounded-full text-xs font-bold text-white hover:border-white transition flex items-center gap-1.5"
                  title="Export playlist as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export JSON
                </button>
                
                <button
                  onClick={handleDeletePlaylist}
                  className="p-2 border border-white/10 hover:border-red-500 rounded-full text-spotify-text hover:text-red-500 transition"
                  title="Delete Playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {details.songs.length > 1 && (
                <button
                  onClick={() => setIsReorderMode(!isReorderMode)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                    isReorderMode
                      ? "bg-spotify-green text-black hover:bg-spotify-green/80"
                      : "border border-white/10 text-white hover:border-white"
                  }`}
                >
                  {isReorderMode ? "Done Reordering" : "Reorder tracks"}
                </button>
              )}
            </div>

            {/* Songs List */}
            {details.songs.length === 0 ? (
              <div className="p-16 text-center bg-spotify-card border border-white/5 rounded-lg text-spotify-text text-sm italic">
                This playlist has no songs yet. Go to your Library, click the three dots on any song, and add it here!
              </div>
            ) : (
              <div className="bg-spotify-card/25 border border-white/5 rounded-lg p-2 space-y-1.5">
                {/* Table Headers */}
                <div className="grid grid-cols-[40px_minmax(150px,2fr)_minmax(100px,1fr)_120px_100px_60px] gap-4 px-4 py-2 border-b border-white/5 text-xs font-bold uppercase tracking-wider text-spotify-text">
                  <span className="text-center">#</span>
                  <span>Title</span>
                  <span>Album</span>
                  <span>Date Added</span>
                  <span>Plays</span>
                  <span className="text-right">Action</span>
                </div>

                <div className="flex flex-col gap-1">
                  {details.songs.map((ps, idx) => (
                    <div key={ps.song.id} className="relative flex items-center w-full">
                      {isReorderMode && (
                        <div className="absolute -left-12 flex flex-col items-center gap-1 z-10 bg-spotify-card border border-white/10 p-1 rounded-md shadow-md">
                          <button
                            onClick={() => moveSong(idx, "up")}
                            disabled={idx === 0}
                            className="p-1 text-spotify-text hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveSong(idx, "down")}
                            disabled={idx === details.songs.length - 1}
                            className="p-1 text-spotify-text hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      
                      <div className="w-full">
                        <SongRow
                          song={ps.song}
                          index={idx}
                          showDateAdded={true}
                          onRemoveFromPlaylist={handleRemoveSong}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

