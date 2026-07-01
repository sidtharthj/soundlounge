import React from "react";
import { ListMusic, ChevronDown, ChevronUp, Download, Loader2, Music, CheckSquare, Square } from "lucide-react";
import { YouTubeSearchResult, YouTubePlaylistInfo } from "../../lib/types";
import { api } from "../../lib/api";
import { formatDuration } from "../../lib/utils";
import { DownloadConfig } from "./DownloadConfig";

interface PlaylistResultCardProps {
  result: YouTubeSearchResult;
}

export const PlaylistResultCard: React.FC<PlaylistResultCardProps> = ({ result }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [playlistInfo, setPlaylistInfo] = React.useState<YouTubePlaylistInfo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  
  // Bulk download configuration modal state
  const [showConfigModal, setShowConfigModal] = React.useState(false);

  const fetchPlaylistDetails = async () => {
    if (playlistInfo) return;
    setLoading(true);
    try {
      const data = await api.getPlaylistInfo(result.url);
      setPlaylistInfo(data);
      // Select all by default
      setSelectedIds(new Set(data.entries.map((entry) => entry.id)));
    } catch (e) {
      alert("Failed to load playlist details");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (nextState) {
      fetchPlaylistDetails();
    }
  };

  const handleSelectToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllToggle = () => {
    if (!playlistInfo) return;
    if (selectedIds.size === playlistInfo.entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(playlistInfo.entries.map((entry) => entry.id)));
    }
  };

  const getSelectedSongsPayload = () => {
    if (!playlistInfo) return [];
    return playlistInfo.entries
      .filter((entry) => selectedIds.has(entry.id))
      .map((entry) => ({
        youtube_id: entry.id,
        youtube_url: entry.url,
        title: entry.title,
        thumbnail_url: entry.thumbnail,
      }));
  };

  return (
    <div className="bg-spotify-card border border-white/5 rounded-lg overflow-hidden transition-all duration-200">
      
      {/* Header Info */}
      <div className="flex items-center justify-between p-4 hover:bg-spotify-hover/40 transition cursor-pointer" onClick={handleToggleExpand}>
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 bg-spotify-hover rounded flex items-center justify-center text-spotify-green shadow-md shrink-0">
            <ListMusic className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white line-clamp-1 leading-snug">
              {result.title}
            </h3>
            <p className="text-xs text-spotify-text font-medium mt-1">
              Playlist • {result.channel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 text-spotify-text hover:text-white rounded-full hover:bg-spotify-hover transition">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Playlist Tracklist */}
      {isExpanded && (
        <div className="border-t border-white/5 bg-black/10 p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8 text-spotify-text gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-spotify-green" />
              <span>Fetching playlist entries from YouTube...</span>
            </div>
          )}

          {!loading && playlistInfo && (
            <>
              {/* Controls bar */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <button
                  onClick={handleSelectAllToggle}
                  className="text-xs font-semibold text-spotify-text hover:text-white flex items-center gap-2 transition"
                >
                  {selectedIds.size === playlistInfo.entries.length ? (
                    <CheckSquare className="w-4 h-4 text-spotify-green" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  Select All ({selectedIds.size}/{playlistInfo.entries.length})
                </button>

                <button
                  onClick={() => setShowConfigModal(true)}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-spotify-green hover:bg-spotify-green/90 disabled:bg-spotify-hover text-black text-xs font-bold rounded-full flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Selected ({selectedIds.size})
                </button>
              </div>

              {/* Tracks List */}
              <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                {playlistInfo.entries.map((entry, idx) => {
                  const isSelected = selectedIds.has(entry.id);
                  return (
                    <div
                      key={entry.id}
                      onClick={() => handleSelectToggle(entry.id)}
                      className={`flex items-center justify-between py-2.5 px-2 rounded hover:bg-spotify-hover/40 transition cursor-pointer ${
                        isSelected ? "bg-spotify-hover/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <div className="text-spotify-text">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-spotify-green" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-spotify-text w-5 text-right">
                          {idx + 1}
                        </span>
                        
                        {/* Artwork/Title */}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {entry.title}
                          </p>
                          <p className="text-[10px] text-spotify-text truncate mt-0.5">
                            {entry.channel}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-spotify-text flex items-center gap-2">
                        {entry.duration && <span>{formatDuration(entry.duration)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Bulk Download configuration dialog */}
      {showConfigModal && playlistInfo && (
        <DownloadConfig
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          youtubeUrl={result.url}
          youtubeId={result.id}
          title={result.title}
          bulkSongs={getSelectedSongsPayload()}
          playlistTitle={playlistInfo.title}
          playlistUrl={playlistInfo.url}
          onSuccess={() => {
            setIsExpanded(false);
          }}
        />
      )}
    </div>
  );
};
