import React from "react";
import {
  Home,
  Search,
  Library,
  Heart,
  Download,
  Settings,
  History,
  Plus,
  Music,
} from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { useLibraryStore } from "../../stores/libraryStore";

export const Sidebar: React.FC = () => {
  const currentView = useUIStore((state) => state.currentView);
  const selectedPlaylistId = useUIStore((state) => state.selectedPlaylistId);
  const setCurrentView = useUIStore((state) => state.setCurrentView);
  
  const playlists = useLibraryStore((state) => state.playlists);
  const fetchPlaylists = useLibraryStore((state) => state.fetchPlaylists);
  const createPlaylist = useLibraryStore((state) => state.createPlaylist);

  React.useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const handleCreatePlaylist = async () => {
    const name = prompt("Enter playlist name:");
    if (!name || !name.trim()) return;
    try {
      const p = await createPlaylist(name.trim(), "My custom playlist");
      setCurrentView("playlist", p.id);
    } catch (e) {
      alert("Failed to create playlist");
    }
  };

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "search", label: "Search", icon: Search },
    { id: "library", label: "Library", icon: Library },
    { id: "liked-songs", label: "Liked Songs", icon: Heart, activeColor: "text-spotify-green" },
    { id: "recently-played", label: "Recently Played", icon: History },
    { id: "downloads", label: "Downloads", icon: Download },
  ] as const;

  return (
    <div className="w-[260px] bg-black flex flex-col h-full select-none border-r border-white/5 p-4 gap-6">
      {/* Brand logo */}
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center text-black font-bold text-xl">
          SL
        </div>
        <span className="font-extrabold text-xl tracking-tight text-white">
          Sound Lounge
        </span>
      </div>

      {/* Main navigation */}
      <div className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-semibold transition duration-200 w-full text-left ${
                isActive
                  ? "bg-spotify-hover text-white"
                  : "text-spotify-text hover:text-white hover:bg-spotify-hover/50"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive
                    ? item.activeColor || "text-white"
                    : "text-spotify-text group-hover:text-white"
                }`}
              />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Playlists section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-bold text-spotify-text tracking-wider uppercase">
            Playlists
          </span>
          <button
            onClick={handleCreatePlaylist}
            className="text-spotify-text hover:text-white p-1 rounded-full hover:bg-spotify-hover transition"
            title="Create Playlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Playlists scroll area */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1">
          {playlists.length === 0 ? (
            <div className="text-xs text-spotify-text/60 px-3 py-2 italic">
              No playlists created.
            </div>
          ) : (
            playlists.map((playlist) => {
              const isPlaylistActive =
                currentView === "playlist" && selectedPlaylistId === playlist.id;
              return (
                <button
                  key={playlist.id}
                  onClick={() => setCurrentView("playlist", playlist.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition w-full text-left ${
                    isPlaylistActive
                      ? "bg-spotify-hover text-white"
                      : "text-spotify-text hover:text-white hover:bg-spotify-hover/30"
                  }`}
                >
                  <Music className="w-4 h-4 shrink-0 text-spotify-text" />
                  <span className="truncate">{playlist.name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Settings */}
      <button
        onClick={() => setCurrentView("settings")}
        className={`flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-semibold transition w-full text-left ${
          currentView === "settings"
            ? "bg-spotify-hover text-white"
            : "text-spotify-text hover:text-white hover:bg-spotify-hover/50"
        }`}
      >
        <Settings className="w-5 h-5" />
        Settings
      </button>
    </div>
  );
};
