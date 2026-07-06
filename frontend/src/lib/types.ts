export interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration?: number;
  file_path: string;
  artwork_path?: string;
  youtube_id?: string;
  youtube_url?: string;
  format: string;
  bitrate?: number;
  file_size?: number;
  date_downloaded: string;
  play_count: number;
  last_played?: string;
  metadata_json?: string;
}

export interface Playlist {
  id: number;
  name: string;
  description?: string;
  artwork_path?: string;
  created_at: string;
  updated_at: string;
  song_count: number;
}

export interface PlaylistSong {
  song: Song;
  position: number;
}

export interface PlaylistDetail extends Playlist {
  songs: PlaylistSong[];
}

export interface Favorite {
  id: number;
  type: "song" | "playlist" | "artist";
  reference_id: number;
  created_at: string;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  type: string;
}

export interface DownloadQueue {
  id: number;
  youtube_id?: string;
  youtube_url: string;
  title?: string;
  thumbnail_url?: string;
  status: "pending" | "downloading" | "completed" | "failed" | "paused" | "processing" | "cancelled";
  progress: number;
  speed?: string;
  eta?: string;
  format: string;
  quality: string;
  output_template?: string;
  download_path?: string;
  options_json?: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface PlayHistoryItem {
  id: number;
  played_at: string;
  played_duration?: number;
  song: Song;
}

export interface YouTubeSearchResult {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  duration?: number;
  channel: string;
  view_count?: number;
  type: "song" | "artist" | "playlist";
}

export interface YouTubeFormat {
  format_id: string;
  ext: string;
  resolution?: string;
  filesize?: number;
  abr?: number;
  vbr?: number;
  acodec?: string;
  vcodec?: string;
  format_note?: string;
  audio_only: boolean;
}

export interface YouTubePlaylistInfo {
  id: string;
  title: string;
  url: string;
  entries: {
    id: string;
    title: string;
    url: string;
    thumbnail?: string;
    duration?: number;
    channel: string;
  }[];
  entry_count: number;
}
