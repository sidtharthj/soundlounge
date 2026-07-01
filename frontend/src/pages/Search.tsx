import React from "react";
import { Search as SearchIcon, Link2, Loader2, Youtube, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";
import { YouTubeSearchResult } from "../../lib/types";
import { SearchResultCard } from "../../components/search/SearchResultCard";
import { PlaylistResultCard } from "../../components/search/PlaylistResultCard";
import { DownloadConfig } from "../../components/search/DownloadConfig";

export const Search: React.FC = () => {
  const [query, setQuery] = React.useState("");
  const [searchType, setSearchType] = React.useState<"song" | "artist" | "playlist">("song");
  const [results, setResults] = React.useState<YouTubeSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = React.useState("");

  // Manual URL State
  const [urlInput, setUrlInput] = React.useState("");
  const [parsingUrl, setParsingUrl] = React.useState(false);

  // Single video download config modal state
  const [selectedVideo, setSelectedVideo] = React.useState<YouTubeSearchResult | null>(null);
  
  // Bulk playlist download config modal state
  const [bulkSongs, setBulkSongs] = React.useState<any[] | null>(null);
  const [bulkPlaylistTitle, setBulkPlaylistTitle] = React.useState("");
  const [bulkPlaylistUrl, setBulkPlaylistUrl] = React.useState("");
  const [showBulkModal, setShowBulkModal] = React.useState(false);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setSearching(true);
    setError("");
    setResults([]);
    
    try {
      const data = await api.search(query.trim(), searchType, 3);
      setResults(data.results);
      if (data.results.length === 0) {
        setError("No results found. Try a different query.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to search YouTube");
    } finally {
      setSearching(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setParsingUrl(true);
    setError("");
    
    const url = urlInput.trim();

    try {
      if (url.includes("list=")) {
        // It's a playlist URL
        const data = await api.getPlaylistInfo(url);
        if (data.entries && data.entries.length > 0) {
          setBulkPlaylistTitle(data.title);
          setBulkPlaylistUrl(url);
          setBulkSongs(
            data.entries.map((entry) => ({
              youtube_id: entry.id,
              youtube_url: entry.url,
              title: entry.title,
              thumbnail_url: entry.thumbnail,
            }))
          );
          setShowBulkModal(true);
          setUrlInput("");
        } else {
          setError("No videos found in this playlist.");
        }
      } else {
        // It's a single video URL
        const data = await api.getVideoInfo(url);
        setSelectedVideo(data);
        setUrlInput("");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse YouTube URL. Make sure it is valid.");
    } finally {
      setParsingUrl(false);
    }
  };

  return (
    <div className="p-6 space-y-8 select-none">
      
      {/* Search Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Side: Standard Search */}
        <div className="bg-spotify-card border border-white/5 p-5 rounded-lg space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Search YouTube</h3>
          
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-spotify-text" />
              <input
                type="text"
                placeholder="Search songs, artists, or playlists..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-spotify-hover text-white pl-10 pr-4 py-2 text-sm rounded border border-white/10 focus:outline-none focus:border-spotify-green transition"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-spotify-green hover:bg-spotify-green/80 disabled:bg-spotify-hover text-black text-sm font-bold rounded transition"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {/* Search Type pills */}
          <div className="flex gap-2">
            {(["song", "artist", "playlist"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSearchType(type)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition border ${
                  searchType === type
                    ? "bg-white text-black border-white"
                    : "bg-transparent text-spotify-text border-white/10 hover:text-white"
                }`}
              >
                {type === "song" ? "songs" : type === "artist" ? "artists" : "playlists"}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Direct URL download */}
        <div className="bg-spotify-card border border-white/5 p-5 rounded-lg space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Paste Link</h3>
          
          <form onSubmit={handleUrlSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-2.5 w-4 h-4 text-spotify-text" />
              <input
                type="text"
                placeholder="Paste video or playlist YouTube URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full bg-spotify-hover text-white pl-10 pr-4 py-2 text-sm rounded border border-white/10 focus:outline-none focus:border-spotify-green transition"
              />
            </div>
            <button
              type="submit"
              disabled={parsingUrl}
              className="px-4 py-2 bg-white hover:bg-spotify-green hover:text-black disabled:bg-spotify-hover text-black text-sm font-bold rounded transition"
            >
              {parsingUrl ? "Loading..." : "Parse Link"}
            </button>
          </form>
          
          <p className="text-[10px] text-spotify-text italic leading-normal">
            Supports YouTube video links (e.g. watch?v=...) and playlist links (e.g. list=...).
          </p>
        </div>
      </div>

      {/* Loader / Error */}
      {searching && (
        <div className="flex items-center justify-center py-12 text-spotify-text gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-spotify-green" />
          <span className="font-medium text-sm">Searching YouTube...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-950/20 border border-red-900/50 rounded-lg text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Display */}
      {!searching && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-white tracking-tight">Top Results</h4>
            <span className="text-xs font-semibold text-spotify-text uppercase tracking-wider">
              Showing top 3 matches
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {results.map((result) => {
              if (result.type === "playlist") {
                return <PlaylistResultCard key={result.id} result={result} />;
              }
              return (
                <SearchResultCard
                  key={result.id}
                  result={result}
                  onDownloadClick={(res) => setSelectedVideo(res)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Single Video Download Config Modal */}
      {selectedVideo && (
        <DownloadConfig
          isOpen={selectedVideo !== null}
          onClose={() => setSelectedVideo(null)}
          youtubeUrl={selectedVideo.url}
          youtubeId={selectedVideo.id}
          title={selectedVideo.title}
          thumbnailUrl={selectedVideo.thumbnail}
          onSuccess={() => {
            alert(`"${selectedVideo.title}" has been enqueued for download!`);
          }}
        />
      )}

      {/* Bulk Playlist Download Config Modal */}
      {showBulkModal && bulkSongs && (
        <DownloadConfig
          isOpen={showBulkModal}
          onClose={() => {
            setShowBulkModal(false);
            setBulkSongs(null);
          }}
          youtubeUrl={bulkPlaylistUrl}
          playlistTitle={bulkPlaylistTitle}
          playlistUrl={bulkPlaylistUrl}
          bulkSongs={bulkSongs}
          onSuccess={() => {
            setShowBulkModal(false);
            setBulkSongs(null);
          }}
        />
      )}

    </div>
  );
};
