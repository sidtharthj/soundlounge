import React from "react";
import { X, Download } from "lucide-react";
import { api } from "@/lib/api";
import { useLibraryStore } from "@/stores/libraryStore";

interface DownloadConfigProps {
  isOpen: boolean;
  onClose: () => void;
  youtubeUrl: string;
  youtubeId?: string;
  title?: string;
  thumbnailUrl?: string;
  onSuccess?: () => void;
  bulkSongs?: { youtube_id: string; youtube_url: string; title: string; thumbnail_url?: string }[];
  playlistTitle?: string;
  playlistUrl?: string;
}

export const DownloadConfig: React.FC<DownloadConfigProps> = ({
  isOpen,
  onClose,
  youtubeUrl,
  youtubeId,
  title,
  thumbnailUrl,
  onSuccess,
  bulkSongs,
  playlistTitle,
  playlistUrl,
}) => {
  const settings = useLibraryStore((state) => state.settings);
  const fetchSettings = useLibraryStore((state) => state.fetchSettings);
  const addQueueItem = useLibraryStore((state) => state.addQueueItem);

  const [format, setFormat] = React.useState("mp3");
  const [quality, setQuality] = React.useState("192");
  const [embedMetadata, setEmbedMetadata] = React.useState(true);
  const [embedThumbnail, setEmbedThumbnail] = React.useState(true);
  const [embedChapters, setEmbedChapters] = React.useState(true);
  const [writeDescription, setWriteDescription] = React.useState(false);
  const [writeInfoJson, setWriteInfoJson] = React.useState(false);
  const [outputTemplate, setOutputTemplate] = React.useState("%(title)s");
  const [customTemplate, setCustomTemplate] = React.useState("");
  const [normalizeAudio, setNormalizeAudio] = React.useState(false);
  const [removeTempFiles, setRemoveTempFiles] = React.useState(true);
  const [isDownloading, setIsDownloading] = React.useState(false);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Load defaults from global settings
  React.useEffect(() => {
    if (settings.default_format) setFormat(settings.default_format);
    if (settings.default_quality) setQuality(settings.default_quality);
    if (settings.default_output_template) setOutputTemplate(settings.default_output_template);
  }, [settings]);

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    setIsDownloading(true);
    const finalTemplate = outputTemplate === "custom" ? customTemplate : outputTemplate;
    
    // Extra options json for post processing
    const options: any = {
      writedescription: writeDescription,
      writeinfojson: writeInfoJson,
      embedchapters: embedChapters,
    };
    
    if (removeTempFiles) {
      options.keepvideo = false;
    }
    
    if (normalizeAudio) {
      // Add standard postprocessor command or settings
    }

    try {
      if (bulkSongs && bulkSongs.length > 0) {
        // Bulk download playlist
        const items = await api.downloadPlaylist({
          playlist_title: playlistTitle || "Playlist",
          playlist_url: playlistUrl || "",
          songs: bulkSongs.map((song) => ({
            youtube_id: song.youtube_id,
            youtube_url: song.youtube_url,
            title: song.title,
            thumbnail_url: song.thumbnail_url,
            format: format,
            quality: quality,
            output_template: finalTemplate + ".%(ext)s",
            options_json: JSON.stringify(options),
          })),
        });
        
        items.forEach((item) => addQueueItem(item));
        alert(`Successfully enqueued ${items.length} songs for download!`);
      } else {
        // Single download
        const item = await api.download({
          youtube_url: youtubeUrl,
          youtube_id: youtubeId,
          title: title,
          thumbnail_url: thumbnailUrl,
          format: format,
          quality: quality,
          output_template: finalTemplate + ".%(ext)s",
          options_json: JSON.stringify(options),
        });

        addQueueItem(item);
      }

      setIsDownloading(false);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to start download");
      setIsDownloading(false);
    }
  };

  const templates = [
    { value: "%(title)s", label: "Video Title (e.g. SongTitle.mp3)" },
    { value: "%(artist)s - %(title)s", label: "Artist - Title (e.g. Artist - SongTitle.mp3)" },
    { value: "%(playlist_index)s - %(title)s", label: "Index - Title (e.g. 01 - SongTitle.mp3)" },
    { value: "%(uploader)s - %(title)s", label: "Channel - Title" },
    { value: "custom", label: "Custom template..." },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-spotify-card border border-white/10 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-spotify-green" />
            Download Options
          </h2>
          <button
            onClick={onClose}
            className="text-spotify-text hover:text-white transition p-1 hover:bg-spotify-hover rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Audio Format */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-spotify-text uppercase tracking-wider mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-spotify-hover text-white rounded border border-white/10 p-2 text-sm focus:outline-none focus:border-spotify-green"
              >
                <option value="mp3">MP3 (Audio)</option>
                <option value="m4a">M4A (Audio)</option>
                <option value="opus">Opus (Audio)</option>
                <option value="flac">FLAC (Lossless)</option>
                <option value="wav">WAV (Lossless)</option>
                <option value="mp4">MP4 (Video)</option>
                <option value="mkv">MKV (Video)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-spotify-text uppercase tracking-wider mb-2">
                Quality / Bitrate
              </label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full bg-spotify-hover text-white rounded border border-white/10 p-2 text-sm focus:outline-none focus:border-spotify-green"
              >
                <option value="best">Best Available</option>
                <option value="320">320 kbps (Very High)</option>
                <option value="256">256 kbps (High)</option>
                <option value="192">192 kbps (Medium)</option>
                <option value="128">128 kbps (Low)</option>
              </select>
            </div>
          </div>

          {/* Output Naming */}
          <div>
            <label className="block text-xs font-bold text-spotify-text uppercase tracking-wider mb-2">
              File Naming Pattern
            </label>
            <select
              value={outputTemplate}
              onChange={(e) => setOutputTemplate(e.target.value)}
              className="w-full bg-spotify-hover text-white rounded border border-white/10 p-2 text-sm focus:outline-none focus:border-spotify-green mb-2"
            >
              {templates.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {outputTemplate === "custom" && (
              <input
                type="text"
                value={customTemplate}
                onChange={(e) => setCustomTemplate(e.target.value)}
                placeholder="e.g. %(artist)s - %(album)s - %(title)s"
                className="w-full bg-spotify-hover text-white rounded border border-white/10 p-2 text-sm focus:outline-none focus:border-spotify-green"
              />
            )}
          </div>

          {/* Toggles: Metadata */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-spotify-text uppercase tracking-wider border-b border-white/5 pb-1">
              Metadata & Artwork
            </h3>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Embed Metadata Tags</span>
              <input
                type="checkbox"
                checked={embedMetadata}
                onChange={(e) => setEmbedMetadata(e.target.checked)}
                className="w-4 h-4 accent-spotify-green cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Embed Thumbnail Image</span>
              <input
                type="checkbox"
                checked={embedThumbnail}
                onChange={(e) => setEmbedThumbnail(e.target.checked)}
                className="w-4 h-4 accent-spotify-green cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Embed Video Chapters</span>
              <input
                type="checkbox"
                checked={embedChapters}
                onChange={(e) => setEmbedChapters(e.target.checked)}
                className="w-4 h-4 accent-spotify-green cursor-pointer"
              />
            </div>
          </div>

          {/* Toggles: Files & Processing */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-spotify-text uppercase tracking-wider border-b border-white/5 pb-1">
              Post-processing
            </h3>

            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Normalize Audio Volume</span>
              <input
                type="checkbox"
                checked={normalizeAudio}
                onChange={(e) => setNormalizeAudio(e.target.checked)}
                className="w-4 h-4 accent-spotify-green cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Remove Temporary Files</span>
              <input
                type="checkbox"
                checked={removeTempFiles}
                onChange={(e) => setRemoveTempFiles(e.target.checked)}
                className="w-4 h-4 accent-spotify-green cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Write Description file (.description)</span>
              <input
                type="checkbox"
                checked={writeDescription}
                onChange={(e) => setWriteDescription(e.target.checked)}
                className="w-4 h-4 accent-spotify-green cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Write Metadata Info file (.json)</span>
              <input
                type="checkbox"
                checked={writeInfoJson}
                onChange={(e) => setWriteInfoJson(e.target.checked)}
                className="w-4 h-4 accent-spotify-green cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-spotify-text hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleStartDownload}
            disabled={isDownloading}
            className="px-6 py-2 text-sm font-bold bg-spotify-green hover:bg-spotify-green/80 disabled:bg-spotify-hover text-black rounded-full flex items-center gap-2 transition"
          >
            {isDownloading ? "Starting..." : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
};

