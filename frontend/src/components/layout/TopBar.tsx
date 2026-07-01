import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

export const TopBar: React.FC = () => {
  const currentView = useUIStore((state) => state.currentView);

  const getViewTitle = () => {
    switch (currentView) {
      case "home":
        return "Good day";
      case "search":
        return "Search YouTube";
      case "library":
        return "Your Library";
      case "liked-songs":
        return "Liked Songs";
      case "recently-played":
        return "Recently Played";
      case "downloads":
        return "Download Queue";
      case "settings":
        return "Settings";
      case "playlist":
        return "Playlist";
      default:
        return "Sound Lounge";
    }
  };

  return (
    <div className="h-16 px-6 bg-spotify-dark flex items-center justify-between border-b border-white/5 select-none shrink-0">
      <div className="flex items-center gap-4">
        {/* Navigation Arrows */}
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-spotify-text hover:text-white cursor-not-allowed transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-spotify-text hover:text-white cursor-not-allowed transition">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <h1 className="text-xl font-bold text-white tracking-tight ml-2">
          {getViewTitle()}
        </h1>
      </div>
    </div>
  );
};
