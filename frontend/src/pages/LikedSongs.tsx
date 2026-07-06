import React from "react";
import { Heart, Play } from "lucide-react";
import { useLibraryStore } from "@/stores/libraryStore";
import { usePlayer } from "@/hooks/usePlayer";
import { SongRow } from "@/components/library/SongRow";

export const LikedSongs: React.FC = () => {
  const likedSongs = useLibraryStore((state) => state.likedSongs);
  const fetchLikedSongs = useLibraryStore((state) => state.fetchLikedSongs);
  const isLoading = useLibraryStore((state) => state.isLoadingLiked);
  
  const player = usePlayer();

  React.useEffect(() => {
    fetchLikedSongs();
  }, [fetchLikedSongs]);

  const handlePlayAll = () => {
    if (likedSongs.length > 0) {
      player.playList(likedSongs, 0);
    }
  };

  return (
    <div className="select-none flex flex-col h-full">
      {/* Top Giant Banner */}
      <div className="p-6 bg-gradient-to-b from-indigo-900 to-indigo-950/20 flex flex-col sm:flex-row items-end gap-6 border-b border-white/5">
        <div className="w-36 h-36 bg-gradient-to-br from-indigo-600 to-purple-500 rounded-lg flex items-center justify-center text-white shadow-2xl shrink-0">
          <Heart className="w-16 h-16 fill-current" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-spotify-text">Playlist</span>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight">Liked Songs</h2>
          <div className="flex items-center gap-1.5 text-sm text-white/80 font-medium">
            <span className="font-bold text-white">Your Username</span>
            <span>•</span>
            <span>{likedSongs.length} songs</span>
          </div>
        </div>
      </div>

      {/* Main List Area */}
      <div className="p-6 flex-1">
        {likedSongs.length > 0 && (
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handlePlayAll}
              className="w-12 h-12 bg-spotify-green hover:scale-105 active:scale-95 text-black rounded-full flex items-center justify-center shadow-lg transition duration-200"
              title="Play all liked songs"
            >
              <Play className="w-5 h-5 fill-black text-black translate-x-[1px]" />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-spotify-text italic">Loading your liked songs...</div>
        ) : likedSongs.length === 0 ? (
          <div className="p-16 text-center bg-spotify-card border border-white/5 rounded-lg text-spotify-text text-sm italic">
            You haven't liked any songs yet. Go to your Library or Search and click the Heart icon on any song!
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
              <span className="text-right">Time</span>
            </div>

            <div className="flex flex-col gap-1">
              {likedSongs.map((song, i) => (
                <SongRow key={song.id} song={song} index={i} showDateAdded={true} />
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

