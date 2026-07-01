import {
  Song,
  Playlist,
  PlaylistDetail,
  Favorite,
  DownloadQueue,
  PlayHistoryItem,
  YouTubeSearchResult,
  YouTubeFormat,
  YouTubePlaylistInfo,
} from "./types";

const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Search
  search: (q: string, type: string = "song", limit: number = 3) =>
    request<{ results: YouTubeSearchResult[] }>(`/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`),
  
  getFormats: (youtubeId: string) =>
    request<{ formats: YouTubeFormat[] }>(`/search/formats/${youtubeId}`),
    
  getVideoInfo: (url: string) =>
    request<YouTubeSearchResult>(`/search/video-info?url=${encodeURIComponent(url)}`),
    
  getPlaylistInfo: (url: string) =>
    request<YouTubePlaylistInfo>(`/search/playlist-info?url=${encodeURIComponent(url)}`),

  // Downloads
  download: (payload: {
    youtube_url: string;
    youtube_id?: string;
    title?: string;
    thumbnail_url?: string;
    format: string;
    quality: string;
    output_template?: string;
    options_json?: string;
  }) => request<DownloadQueue>("/download", {
    method: "POST",
    body: JSON.stringify(payload),
  }),

  downloadPlaylist: (payload: {
    playlist_title: string;
    playlist_url: string;
    songs: {
      youtube_id: string;
      youtube_url: string;
      title: string;
      thumbnail_url?: string;
      format: string;
      quality: string;
      output_template?: string;
      options_json?: string;
    }[];
  }) => request<DownloadQueue[]>("/download/playlist", {
    method: "POST",
    body: JSON.stringify(payload),
  }),

  getQueue: () =>
    request<DownloadQueue[]>("/download/queue"),

  pauseDownload: (id: number) =>
    request<{ success: boolean }>(`/download/queue/${id}/pause`, { method: "POST" }),

  resumeDownload: (id: number) =>
    request<{ success: boolean }>(`/download/queue/${id}/resume`, { method: "POST" }),

  cancelDownload: (id: number) =>
    request<{ success: boolean }>(`/download/queue/${id}`, { method: "DELETE" }),

  // Library / Songs
  getSongs: (params?: { limit?: number; offset?: number; sort_by?: string; sort_order?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ songs: Song[]; total: number; limit: number; offset: number }>(`/songs?${query}`);
  },

  searchSongs: (q: string, limit: number = 50) =>
    request<Song[]>(`/songs/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  getSongDetails: (id: number) =>
    request<Song>(`/songs/${id}`),

  updateSong: (id: number, payload: Partial<Song>) =>
    request<Song>(`/songs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteSong: (id: number) =>
    request<{ success: boolean }>(`/songs/${id}`, { method: "DELETE" }),

  getStats: () =>
    request<{ total_songs: number; total_size_bytes: number; total_duration_seconds: number }>("/songs/stats"),

  // Playlists
  getPlaylists: () =>
    request<Playlist[]>("/playlists"),

  createPlaylist: (payload: { name: string; description?: string }) =>
    request<Playlist>("/playlists", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getPlaylistDetails: (id: number) =>
    request<PlaylistDetail>(`/playlists/${id}`),

  updatePlaylist: (id: number, payload: { name?: string; description?: string; artwork_path?: string }) =>
    request<Playlist>(`/playlists/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deletePlaylist: (id: number) =>
    request<{ success: boolean }>(`/playlists/${id}`, { method: "DELETE" }),

  addSongToPlaylist: (playlistId: number, songId: number) =>
    request<{ success: boolean; position: number }>(`/playlists/${playlistId}/songs?song_id=${songId}`, {
      method: "POST",
    }),

  removeSongFromPlaylist: (playlistId: number, songId: number) =>
    request<{ success: boolean }>(`/playlists/${playlistId}/songs/${songId}`, {
      method: "DELETE",
    }),

  reorderPlaylistSongs: (playlistId: number, songIds: number[]) =>
    request<{ success: boolean }>(`/playlists/${playlistId}/songs/reorder`, {
      method: "PUT",
      body: JSON.stringify({ song_ids: songIds }),
    }),

  exportPlaylist: (id: number) =>
    request<{ name: string; description?: string; songs: string[] }>(`/playlists/${id}/export`),

  importPlaylist: (payload: { name: string; description?: string; songs: string[] }) =>
    request<Playlist>("/playlists/import", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Favorites
  getFavorites: () =>
    request<Favorite[]>("/favorites"),

  getLikedSongs: () =>
    request<Song[]>("/favorites/songs"),

  getFavoritePlaylists: () =>
    request<Playlist[]>("/favorites/playlists"),

  addFavorite: (type: "song" | "playlist" | "artist", referenceId: number) =>
    request<Favorite>("/favorites", {
      method: "POST",
      body: JSON.stringify({ type, reference_id: referenceId }),
    }),

  removeFavorite: (type: "song" | "playlist" | "artist", referenceId: number) =>
    request<{ success: boolean }>(`/favorites/toggle/${type}/${referenceId}`, {
      method: "DELETE",
    }),

  checkFavorite: (type: "song" | "playlist" | "artist", referenceId: number) =>
    request<{ is_favorite: boolean }>(`/favorites/check/${type}/${referenceId}`),

  // History
  logPlay: (songId: number, playedDuration?: number) =>
    request<PlayHistoryItem>("/history", {
      method: "POST",
      body: JSON.stringify({ song_id: songId, played_duration: playedDuration }),
    }),

  getRecentPlays: (limit: number = 10) =>
    request<Song[]>(`/history/recent?limit=${limit}`),

  // Settings
  getSettings: () =>
    request<Record<string, string>>("/settings"),

  updateSettings: (payload: Record<string, string>) =>
    request<{ success: boolean }>("/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
