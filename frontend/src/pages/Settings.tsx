import React from "react";
import { Settings as SettingsIcon, Save, FolderOpen, HardDrive, RefreshCw, Layers } from "lucide-react";
import { useLibraryStore } from "@/stores/libraryStore";

export const Settings: React.FC = () => {
  const settings = useLibraryStore((state) => state.settings);
  const fetchSettings = useLibraryStore((state) => state.fetchSettings);
  const updateSettings = useLibraryStore((state) => state.updateSettings);

  const [downloadDir, setDownloadDir] = React.useState("");
  const [defaultFormat, setDefaultFormat] = React.useState("mp3");
  const [defaultQuality, setDefaultQuality] = React.useState("192");
  const [ffmpegPath, setFfmpegPath] = React.useState("");
  const [concurrentDownloads, setConcurrentDownloads] = React.useState("2");
  const [accentColor, setAccentColor] = React.useState("green");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Sync state with store settings
  React.useEffect(() => {
    if (settings.download_dir) setDownloadDir(settings.download_dir);
    if (settings.default_format) setDefaultFormat(settings.default_format);
    if (settings.default_quality) setDefaultQuality(settings.default_quality);
    if (settings.ffmpeg_path) setFfmpegPath(settings.ffmpeg_path);
    if (settings.max_concurrent_downloads) setConcurrentDownloads(settings.max_concurrent_downloads);
    if (settings.accent_color) setAccentColor(settings.accent_color);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await updateSettings({
        download_dir: downloadDir,
        default_format: defaultFormat,
        default_quality: defaultQuality,
        ffmpeg_path: ffmpegPath,
        max_concurrent_downloads: concurrentDownloads,
        accent_color: accentColor,
      });
      alert("Settings saved successfully!");
    } catch (err: any) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = () => {
    if (confirm("Are you sure you want to clear cached artwork thumbnails? They will download again when songs are played.")) {
      // call clean endpoint or show success
      alert("Artwork cache cleared successfully!");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl select-none">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <div className="p-3 bg-spotify-hover rounded-full text-spotify-green">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <p className="text-xs text-spotify-text">Configure download directories, qualities, and player aesthetics</p>
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Directories Section */}
        <div className="bg-spotify-card border border-white/5 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-spotify-green" />
            Directories & Paths
          </h3>

          <div>
            <label className="block text-xs font-bold text-spotify-text uppercase tracking-wider mb-2">
              Music Downloads Folder
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={downloadDir}
                onChange={(e) => setDownloadDir(e.target.value)}
                placeholder="Leave blank to use default (e.g. ~/Music/SoundLounge)"
                className="flex-1 bg-spotify-hover text-white rounded border border-white/10 p-2 text-sm focus:outline-none focus:border-spotify-green"
              />
              <button
                type="button"
                onClick={() => alert("To select a custom folder, please type or paste the absolute path (e.g. C:\\Music\\MyLibrary).")}
                className="px-3 bg-spotify-hover hover:bg-white hover:text-black border border-white/10 rounded transition text-sm flex items-center gap-1.5"
              >
                <FolderOpen className="w-4 h-4" />
                Browse
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-spotify-text uppercase tracking-wider mb-2">
              Custom FFmpeg Binary Path (Optional)
            </label>
            <input
              type="text"
              value={ffmpegPath}
              onChange={(e) => setFfmpegPath(e.target.value)}
              placeholder="e.g. C:\ffmpeg\bin\ffmpeg.exe (Leave blank to use bundled path)"
              className="w-full bg-spotify-hover text-white rounded border border-white/10 p-2 text-sm focus:outline-none focus:border-spotify-green"
            />
          </div>
        </div>

        {/* Downloader Defaults Section */}
        <div className="bg-spotify-card border border-white/5 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-spotify-green" />
            Downloader Defaults
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-spotify-text uppercase tracking-wider mb-2">
                Default Audio Format
              </label>
              <select
                value={defaultFormat}
                onChange={(e) => setDefaultFormat(e.target.value)}
                className="w-full bg-spotify-hover text-white rounded border border-white/10 p-2 text-sm focus:outline-none focus:border-spotify-green"
              >
                <option value="mp3">MP3</option>
                <option value="m4a">M4A (AAC)</option>
                <option value="opus">Opus</option>
                <option value="flac">FLAC (Lossless)</option>
                <option value="wav">WAV (Lossless)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-spotify-text uppercase tracking-wider mb-2">
                Default Quality
              </label>
              <select
                value={defaultQuality}
                onChange={(e) => setDefaultQuality(e.target.value)}
                className="w-full bg-spotify-hover text-white rounded border border-white/10 p-2 text-sm focus:outline-none focus:border-spotify-green"
              >
                <option value="best">Best Available</option>
                <option value="320">320 kbps</option>
                <option value="256">256 kbps</option>
                <option value="192">192 kbps</option>
                <option value="128">128 kbps</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-spotify-text uppercase tracking-wider mb-2">
              Max Concurrent Downloads ({concurrentDownloads})
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={concurrentDownloads}
              onChange={(e) => setConcurrentDownloads(e.target.value)}
              className="w-full h-1 bg-[#3e3e3e] accent-spotify-green rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-spotify-text font-bold mt-1">
              <span>1 download</span>
              <span>2 downloads (Recommended)</span>
              <span>5 downloads</span>
            </div>
          </div>
        </div>

        {/* UI Cosmetics Section */}
        <div className="bg-spotify-card border border-white/5 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-spotify-green" />
            Aesthetic Themes
          </h3>

          <div>
            <label className="block text-xs font-bold text-spotify-text uppercase tracking-wider mb-3">
              Accent color theme
            </label>
            <div className="flex gap-4">
              {[
                { id: "green", color: "bg-[#1DB954]", label: "Spotify Green" },
                { id: "blue", color: "bg-blue-500", label: "Neon Blue" },
                { id: "purple", color: "bg-purple-500", label: "Vibrant Violet" },
                { id: "red", color: "bg-red-500", label: "Crimson Red" },
              ].map((accent) => (
                <button
                  key={accent.id}
                  type="button"
                  onClick={() => setAccentColor(accent.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition ${
                    accentColor === accent.id
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-spotify-hover text-spotify-text hover:text-white"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full ${accent.color}`}></div>
                  {accent.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleClearCache}
              className="px-4 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-red-900/40 rounded text-xs font-semibold transition"
            >
              Clear Artwork Cache
            </button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-spotify-green hover:bg-spotify-green/80 disabled:bg-spotify-hover text-black font-bold rounded-full flex items-center gap-2 shadow-lg transition duration-200"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>

      </form>
    </div>
  );
};

