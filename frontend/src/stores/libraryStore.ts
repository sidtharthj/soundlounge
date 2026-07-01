import { create } from "zustand";
import { Song, Playlist, DownloadQueue } from "../lib/types";
import { api } from "../lib/api";

interface LibraryState {
  songs: Song[];
  totalSongs: number;
  playlists: Playlist[];
  likedSongs: Song[];
  downloadQueue: DownloadQueue[];
  settings: Record<string, string>;
  stats: {
    total_songs: number;
    total_size_bytes: number;
    total_duration_seconds: number;
  };
  isLoadingSongs: boolean;
  isLoadingPlaylists: boolean;
  isLoadingLiked: boolean;
  isLoadingQueue: boolean;

  // Actions
  fetchSongs: (params?: { limit?: number; offset?: number; sort_by?: string; sort_order?: string }) => Promise<void>;
  fetchPlaylists: () => Promise<void>;
  fetchLikedSongs: () => Promise<void>;
  fetchQueue: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (payload: Record<string, string>) => Promise<void>;
  
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  deletePlaylist: (id: number) => Promise<void>;
  toggleLike: (song: Song) => Promise<void>;
  deleteSong: (id: number) => Promise<void>;
  
  // Real-time queue updates from WebSocket
  updateQueueItem: (data: Partial<DownloadQueue> & { id: number }) => void;
  addQueueItem: (item: DownloadQueue) => void;
  removeQueueItem: (id: number) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  songs: [],
  totalSongs: 0,
  playlists: [],
  likedSongs: [],
  downloadQueue: [],
  settings: {},
  stats: {
    total_songs: 0,
    total_size_bytes: 0,
    total_duration_seconds: 0,
  },
  isLoadingSongs: false,
  isLoadingPlaylists: false,
  isLoadingLiked: false,
  isLoadingQueue: false,

  fetchSongs: async (params) => {
    set({ isLoadingSongs: true });
    try {
      const data = await api.getSongs(params);
      set({ songs: data.songs, totalSongs: data.total });
    } catch (e) {
      console.error("Failed to fetch songs:", e);
    } finally {
      set({ isLoadingSongs: false });
    }
  },

  fetchPlaylists: async () => {
    set({ isLoadingPlaylists: true });
    try {
      const playlists = await api.getPlaylists();
      set({ playlists });
    } catch (e) {
      console.error("Failed to fetch playlists:", e);
    } finally {
      set({ isLoadingPlaylists: false });
    }
  },

  fetchLikedSongs: async () => {
    set({ isLoadingLiked: true });
    try {
      const likedSongs = await api.getLikedSongs();
      set({ likedSongs });
    } catch (e) {
      console.error("Failed to fetch liked songs:", e);
    } finally {
      set({ isLoadingLiked: false });
    }
  },

  fetchQueue: async () => {
    set({ isLoadingQueue: true });
    try {
      const queue = await api.getQueue();
      set({ downloadQueue: queue });
    } catch (e) {
      console.error("Failed to fetch download queue:", e);
    } finally {
      set({ isLoadingQueue: false });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await api.getStats();
      set({ stats });
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  },

  fetchSettings: async () => {
    try {
      const settings = await api.getSettings();
      set({ settings });
    } catch (e) {
      console.error("Failed to fetch settings:", e);
    }
  },

  updateSettings: async (payload) => {
    try {
      await api.updateSettings(payload);
      set({ settings: { ...get().settings, ...payload } });
    } catch (e) {
      console.error("Failed to update settings:", e);
      throw e;
    }
  },

  createPlaylist: async (name, description) => {
    try {
      const playlist = await api.createPlaylist({ name, description });
      set({ playlists: [playlist, ...get().playlists] });
      return playlist;
    } catch (e) {
      console.error("Failed to create playlist:", e);
      throw e;
    }
  },

  deletePlaylist: async (id) => {
    try {
      await api.deletePlaylist(id);
      set({ playlists: get().playlists.filter((p) => p.id !== id) });
    } catch (e) {
      console.error("Failed to delete playlist:", e);
      throw e;
    }
  },

  toggleLike: async (song) => {
    const { likedSongs } = get();
    const isLiked = likedSongs.some((s) => s.id === song.id);
    
    try {
      if (isLiked) {
        await api.removeFavorite("song", song.id);
        set({ likedSongs: likedSongs.filter((s) => s.id !== song.id) });
      } else {
        await api.addFavorite("song", song.id);
        set({ likedSongs: [song, ...likedSongs] });
      }
    } catch (e) {
      console.error("Failed to toggle like:", e);
    }
  },

  deleteSong: async (id) => {
    try {
      await api.deleteSong(id);
      set({
        songs: get().songs.filter((s) => s.id !== id),
        likedSongs: get().likedSongs.filter((s) => s.id !== id),
        totalSongs: Math.max(0, get().totalSongs - 1),
      });
      // Also refresh stats
      get().fetchStats();
    } catch (e) {
      console.error("Failed to delete song:", e);
      throw e;
    }
  },

  updateQueueItem: (data) => {
    const queue = get().downloadQueue;
    const exists = queue.some((item) => item.id === data.id);
    if (!exists) return;

    set({
      downloadQueue: queue.map((item) => {
        if (item.id === data.id) {
          return { ...item, ...data };
        }
        return item;
      }),
    });
  },

  addQueueItem: (item) => {
    const queue = get().downloadQueue;
    if (queue.some((i) => i.id === item.id)) return;
    set({ downloadQueue: [item, ...queue] });
  },

  removeQueueItem: (id) => {
    set({ downloadQueue: get().downloadQueue.filter((item) => item.id !== id) });
  },
}));
