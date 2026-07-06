import React from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
} from "lucide-react";
import { usePlayer } from "@/hooks/usePlayer";
import { useLibraryStore } from "@/stores/libraryStore";
import { ArtworkImage } from "../common/ArtworkImage";
import { formatDuration } from "@/lib/utils";

export const NowPlaying: React.FC = () => {
  const player = usePlayer();
  const likedSongs = useLibraryStore((state) => state.likedSongs);
  const toggleLike = useLibraryStore((state) => state.toggleLike);
  const fetchLikedSongs = useLibraryStore((state) => state.fetchLikedSongs);

  const [prevVolume, setPrevVolume] = React.useState(0.7);

  React.useEffect(() => {
    fetchLikedSongs();
  }, [fetchLikedSongs]);

  if (!player.currentSong) {
    return (
      <div className="h-[90px] bg-spotify-dark border-t border-white/5 flex items-center justify-center text-spotify-text text-sm select-none shrink-0">
        No song playing. Search and download tracks to start listening!
      </div>
    );
  }

  const isLiked = likedSongs.some((s) => s.id === player.currentSong?.id);

  const handlePlayPause = () => {
    player.togglePlay();
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    player.seek(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    player.setVolume(val);
  };

  const handleMuteToggle = () => {
    if (player.volume > 0) {
      setPrevVolume(player.volume);
      player.setVolume(0);
    } else {
      player.setVolume(prevVolume);
    }
  };

  return (
    <div className="h-[90px] bg-spotify-dark border-t border-white/5 px-4 flex items-center justify-between select-none shrink-0">
      
      {/* LEFT: Currently Playing Song Details */}
      <div className="w-[30%] flex items-center gap-3">
        <ArtworkImage
          artworkPath={player.currentSong.artwork_path}
          songId={player.currentSong.id}
          title={player.currentSong.title}
          className="w-14 h-14 rounded-md object-cover border border-white/5 shadow-md shrink-0"
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate hover:underline cursor-pointer">
            {player.currentSong.title}
          </div>
          <div className="text-xs text-spotify-text truncate hover:underline cursor-pointer">
            {player.currentSong.artist}
          </div>
        </div>
        <button
          onClick={() => player.currentSong && toggleLike(player.currentSong)}
          className="text-spotify-text hover:text-white p-1 ml-2 transition"
          title={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
        >
          <Heart
            className={`w-5 h-5 transition duration-150 ${
              isLiked ? "fill-spotify-green text-spotify-green" : "text-spotify-text hover:text-white"
            }`}
          />
        </button>
      </div>

      {/* CENTER: Playback Controls & Progress Bar */}
      <div className="w-[40%] flex flex-col items-center gap-2">
        {/* Control Buttons */}
        <div className="flex items-center gap-5">
          <button
            onClick={player.toggleShuffle}
            className={`transition ${
              player.shuffle
                ? "text-spotify-green hover:text-spotify-green/80"
                : "text-spotify-text hover:text-white"
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          
          <button
            onClick={player.playPrevious}
            className="text-spotify-text hover:text-white transition"
            title="Previous"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          
          <button
            onClick={handlePlayPause}
            className="w-8 h-8 rounded-full bg-white hover:scale-105 active:scale-95 flex items-center justify-center text-black transition duration-200"
            title={player.isPlaying ? "Pause" : "Play"}
          >
            {player.isPlaying ? (
              <Pause className="w-4 h-4 fill-black text-black" />
            ) : (
              <Play className="w-4 h-4 fill-black text-black translate-x-[1px]" />
            )}
          </button>
          
          <button
            onClick={player.playNext}
            className="text-spotify-text hover:text-white transition"
            title="Next"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
          
          <button
            onClick={player.toggleRepeatMode}
            className={`transition ${
              player.repeatMode !== "off"
                ? "text-spotify-green hover:text-spotify-green/80"
                : "text-spotify-text hover:text-white"
            }`}
            title={`Repeat: ${player.repeatMode}`}
          >
            {player.repeatMode === "one" ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Progress Bar Slider */}
        <div className="w-full flex items-center gap-2">
          <span className="text-[10px] text-spotify-text w-8 text-right">
            {formatDuration(player.currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={player.duration || 100}
            value={player.currentTime || 0}
            onChange={handleSeekChange}
            className="flex-1 h-1 bg-[#3e3e3e] hover:bg-spotify-green accent-spotify-green rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[10px] text-spotify-text w-8">
            {formatDuration(player.duration)}
          </span>
        </div>
      </div>

      {/* RIGHT: Volume Slider */}
      <div className="w-[30%] flex items-center justify-end gap-3 pr-2">
        <button
          onClick={handleMuteToggle}
          className="text-spotify-text hover:text-white transition"
          title={player.volume > 0 ? "Mute" : "Unmute"}
        >
          {player.volume > 0 ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5 text-red-500" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={player.volume}
          onChange={handleVolumeChange}
          className="w-24 h-1 bg-[#3e3e3e] hover:bg-spotify-green accent-spotify-green rounded-lg appearance-none cursor-pointer"
        />
      </div>

    </div>
  );
};

