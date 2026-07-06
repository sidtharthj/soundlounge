import { create } from "zustand";
import { Song } from "@/lib/types";
import { api } from "@/lib/api";

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  originalQueue: Song[]; // Keep track of original order for un-shuffle
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  repeatMode: "off" | "one" | "all";
  shuffle: boolean;
  
  // Actions
  playSong: (song: Song) => void;
  playList: (songs: Song[], startIndex: number) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleShuffle: () => void;
  toggleRepeatMode: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  updateProgress: (currentTime: number, duration: number) => void;
}

// Global Audio instance
const audio = new Audio();

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Sync audio player callbacks
  audio.addEventListener("timeupdate", () => {
    set({ currentTime: audio.currentTime });
  });

  audio.addEventListener("loadedmetadata", () => {
    set({ duration: audio.duration });
  });

  audio.addEventListener("ended", () => {
    const { repeatMode, playNext } = get();
    if (repeatMode === "one") {
      audio.currentTime = 0;
      audio.play().catch((e) => console.log("Playback error:", e));
    } else {
      playNext();
    }
  });

  const loadAndPlay = (song: Song) => {
    audio.src = `/api/media/audio/${song.id}`;
    audio.volume = get().volume;
    audio.play()
      .then(() => {
        set({ isPlaying: true });
        // Log to play history
        api.logPlay(song.id).catch((e) => console.error("Failed to log play history:", e));
      })
      .catch((err) => {
        console.error("Playback failed:", err);
        set({ isPlaying: false });
      });
  };

  return {
    currentSong: null,
    queue: [],
    originalQueue: [],
    currentIndex: -1,
    isPlaying: false,
    volume: 0.7,
    currentTime: 0,
    duration: 0,
    repeatMode: "off",
    shuffle: false,

    playSong: (song) => {
      const { queue } = get();
      const existingIndex = queue.findIndex((s) => s.id === song.id);
      
      let newQueue = [...queue];
      let newIndex = existingIndex;

      if (existingIndex === -1) {
        newQueue.push(song);
        newIndex = newQueue.length - 1;
      }

      set({
        currentSong: song,
        queue: newQueue,
        originalQueue: [...newQueue],
        currentIndex: newIndex,
      });

      loadAndPlay(song);
    },

    playList: (songs, startIndex) => {
      if (songs.length === 0) return;
      const song = songs[startIndex];
      
      set({
        queue: [...songs],
        originalQueue: [...songs],
        currentIndex: startIndex,
        currentSong: song,
        shuffle: false, // Turn off shuffle when a new list plays directly
      });

      loadAndPlay(song);
    },

    togglePlay: () => {
      const { isPlaying, currentSong } = get();
      if (!currentSong) return;

      if (isPlaying) {
        audio.pause();
        set({ isPlaying: false });
      } else {
        audio.play()
          .then(() => set({ isPlaying: true }))
          .catch((e) => console.log("Playback failed:", e));
      }
    },

    playNext: () => {
      const { queue, currentIndex, repeatMode } = get();
      if (queue.length === 0) return;

      let nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === "all") {
          nextIndex = 0;
        } else {
          // End of queue and no repeat
          audio.pause();
          set({ isPlaying: false, currentTime: 0 });
          return;
        }
      }

      const nextSong = queue[nextIndex];
      set({
        currentIndex: nextIndex,
        currentSong: nextSong,
      });
      loadAndPlay(nextSong);
    },

    playPrevious: () => {
      const { queue, currentIndex, currentTime } = get();
      if (queue.length === 0) return;

      // If song has played for more than 3 seconds, restart it
      if (currentTime > 3) {
        audio.currentTime = 0;
        set({ currentTime: 0 });
        return;
      }

      let prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = queue.length - 1; // loop back to end
      }

      const prevSong = queue[prevIndex];
      set({
        currentIndex: prevIndex,
        currentSong: prevSong,
      });
      loadAndPlay(prevSong);
    },

    seek: (time) => {
      if (!get().currentSong) return;
      audio.currentTime = time;
      set({ currentTime: time });
    },

    setVolume: (vol) => {
      const v = Math.max(0, Math.min(1, vol));
      audio.volume = v;
      set({ volume: v });
    },

    toggleShuffle: () => {
      const { shuffle, queue, originalQueue, currentSong } = get();
      if (queue.length === 0) return;

      if (!shuffle) {
        // Shuffle queue but keep currentSong playing at index 0
        const otherSongs = queue.filter((s) => s.id !== currentSong?.id);
        
        // Fisher-Yates shuffle
        for (let i = otherSongs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
        }

        const shuffledQueue = currentSong ? [currentSong, ...otherSongs] : otherSongs;
        set({
          shuffle: true,
          queue: shuffledQueue,
          currentIndex: 0,
        });
      } else {
        // Unshuffle: restore originalQueue and find currentSong index in it
        const originalIndex = originalQueue.findIndex((s) => s.id === currentSong?.id);
        set({
          shuffle: false,
          queue: [...originalQueue],
          currentIndex: originalIndex !== -1 ? originalIndex : 0,
        });
      }
    },

    toggleRepeatMode: () => {
      const { repeatMode } = get();
      let nextMode: "off" | "one" | "all" = "off";
      if (repeatMode === "off") nextMode = "all";
      else if (repeatMode === "all") nextMode = "one";
      set({ repeatMode: nextMode });
    },

    addToQueue: (song) => {
      const { queue, originalQueue } = get();
      // Check if already in queue
      if (queue.some((s) => s.id === song.id)) return;
      
      set({
        queue: [...queue, song],
        originalQueue: [...originalQueue, song],
      });
    },

    removeFromQueue: (index) => {
      const { queue, currentIndex } = get();
      const newQueue = queue.filter((_, i) => i !== index);
      
      let newIndex = currentIndex;
      if (index < currentIndex) {
        newIndex = currentIndex - 1;
      } else if (index === currentIndex) {
        // Removing currently playing song: stop or play next
        if (newQueue.length > 0) {
          newIndex = Math.min(index, newQueue.length - 1);
          const nextSong = newQueue[newIndex];
          set({
            queue: newQueue,
            currentIndex: newIndex,
            currentSong: nextSong,
          });
          loadAndPlay(nextSong);
          return;
        } else {
          audio.pause();
          set({
            queue: [],
            originalQueue: [],
            currentIndex: -1,
            currentSong: null,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
          });
          return;
        }
      }

      set({
        queue: newQueue,
        originalQueue: get().originalQueue.filter((s) => s.id !== queue[index].id),
        currentIndex: newIndex,
      });
    },

    clearQueue: () => {
      audio.pause();
      set({
        queue: [],
        originalQueue: [],
        currentIndex: -1,
        currentSong: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      });
    },

    updateProgress: (currentTime, duration) => {
      set({ currentTime, duration });
    },
  };
});
export { audio };

