import React from "react";
import { Music, Clock, HardDrive, ListMusic, Heart } from "lucide-react";
import { useLibraryStore } from "@/stores/libraryStore";
import { useUIStore } from "@/stores/uiStore";
import { api } from "@/lib/api";
import { Song } from "@/lib/types";
import { SongRow } from "@/components/library/SongRow";
import { formatFileSize, formatDuration } from "@/lib/utils";

export const Home: React.FC = () => {
  const stats = useLibraryStore((state) => state.stats);
  const playlists = useLibraryStore((state) => state.playlists);
  const fetchStats = useLibraryStore((state) => state.fetchStats);
  const fetchPlaylists = useLibraryStore((state) => state.fetchPlaylists);
  const setCurrentView = useUIStore((state) => state.setCurrentView);

  const [recentSongs, setRecentSongs] = React.useState<Song[]>([]);
  const [loadingRecent, setLoadingRecent] = React.useState(false);

  React.useEffect(() => {
    fetchStats();
    fetchPlaylists();
    
    // Fetch recently played songs
    setLoadingRecent(true);
    api.getRecentPlays(6)
      .then((songs) => setRecentSongs(songs))
      .catch((e) => console.error(e))
      .finally(() => setLoadingRecent(false));
  }, [fetchStats, fetchPlaylists]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const statItems = [
    {
      label: "Total Tracks",
      value: stats.total_songs.toString(),
      icon: Music,
      color: "text-spotify-green bg-spotify-green/10",
    },
    {
      label: "Library Size",
      value: formatFileSize(stats.total_size_bytes),
      icon: HardDrive,
      color: "text-blue-400 bg-blue-400/10",
    },
    {
      label: "Total Time",
      value: formatDuration(stats.total_duration_seconds),
      icon: Clock,
      color: "text-purple-400 bg-purple-400/10",
    },
  ];

  return (
    <div className="p-6 space-y-8 select-none">
      
      {/* Greeting Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">{getGreeting()}</h2>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statItems.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-4 p-5 bg-spotify-card border border-white/5 rounded-lg shadow hover:bg-spotify-hover/30 transition duration-200"
            >
              <div className={`p-3 rounded-full ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-spotify-text uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-white mt-1">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Playlists Grid */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white tracking-tight">Quick Access</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Liked songs quick card */}
          <div
            onClick={() => setCurrentView("liked-songs")}
            className="flex items-center gap-4 bg-spotify-card border border-white/5 hover:bg-spotify-hover/40 transition duration-200 rounded-md overflow-hidden cursor-pointer shadow group"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center text-white shrink-0 group-hover:scale-[1.02] transition">
              <Heart className="w-8 h-8 fill-current" />
            </div>
            <div className="min-w-0 pr-2">
              <p className="font-bold text-sm text-white truncate">Liked Songs</p>
              <p className="text-xs text-spotify-text mt-1">Your liked library</p>
            </div>
          </div>

          {/* User playlists */}
          {playlists.slice(0, 5).map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => setCurrentView("playlist", playlist.id)}
              className="flex items-center gap-4 bg-spotify-card border border-white/5 hover:bg-spotify-hover/40 transition duration-200 rounded-md overflow-hidden cursor-pointer shadow group"
            >
              <div className="w-20 h-20 bg-spotify-hover flex items-center justify-center text-spotify-text shrink-0 group-hover:scale-[1.02] transition">
                <ListMusic className="w-8 h-8" />
              </div>
              <div className="min-w-0 pr-2">
                <p className="font-bold text-sm text-white truncate">{playlist.name}</p>
                <p className="text-xs text-spotify-text mt-1 truncate">
                  {playlist.description || "Custom playlist"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Played tracks */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white tracking-tight">Recently Played</h3>
        {loadingRecent ? (
          <div className="py-8 text-center text-spotify-text text-sm italic">
            Loading play history...
          </div>
        ) : recentSongs.length === 0 ? (
          <div className="p-8 text-center bg-spotify-card border border-white/5 rounded-lg text-spotify-text text-sm italic">
            No tracks played yet. Start listening by downloading songs!
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 bg-spotify-card/20 p-2 rounded-lg border border-white/5">
            {recentSongs.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} showDateAdded={false} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

