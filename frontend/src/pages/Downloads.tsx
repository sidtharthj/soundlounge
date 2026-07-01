import React from "react";
import { Download, Loader2, Pause, Play, Trash2, CheckCircle2, AlertTriangle, RefreshCw, XCircle } from "lucide-react";
import { useLibraryStore } from "../../stores/libraryStore";
import { api } from "../../lib/api";
import { DownloadQueue } from "../../lib/types";

export const Downloads: React.FC = () => {
  const downloadQueue = useLibraryStore((state) => state.downloadQueue);
  const fetchQueue = useLibraryStore((state) => state.fetchQueue);
  const isLoading = useLibraryStore((state) => state.isLoadingQueue);
  
  const removeQueueItem = useLibraryStore((state) => state.removeQueueItem);

  React.useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handlePause = async (id: number) => {
    try {
      await api.pauseDownload(id);
    } catch (e) {
      alert("Failed to pause download");
    }
  };

  const handleResume = async (id: number) => {
    try {
      await api.resumeDownload(id);
    } catch (e) {
      alert("Failed to resume download");
    }
  };

  const handleCancel = async (id: number) => {
    if (confirm("Are you sure you want to cancel/remove this download task?")) {
      try {
        await api.cancelDownload(id);
        removeQueueItem(id);
      } catch (e) {
        alert("Failed to cancel download");
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">Pending</span>;
      case "downloading":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" /> Downloading</span>;
      case "processing":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" /> Processing</span>;
      case "completed":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-spotify-green/10 text-spotify-green border border-spotify-green/20 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Completed</span>;
      case "failed":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> Failed</span>;
      case "paused":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">Paused</span>;
      case "cancelled":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/20 text-gray-500 border border-white/5">Cancelled</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 select-none">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-spotify-hover rounded-full text-spotify-green">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Download Queue</h2>
            <p className="text-xs text-spotify-text">Manage and monitor active/completed media downloads</p>
          </div>
        </div>

        <button
          onClick={() => fetchQueue()}
          className="p-2 border border-white/10 text-spotify-text hover:text-white rounded-full hover:bg-spotify-hover transition"
          title="Refresh Queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading && downloadQueue.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-spotify-text gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-spotify-green" />
          <span>Loading download queue...</span>
        </div>
      ) : downloadQueue.length === 0 ? (
        <div className="p-16 text-center bg-spotify-card border border-white/5 rounded-lg text-spotify-text text-sm italic">
          No download tasks found. Go to the Search page to find and download music!
        </div>
      ) : (
        <div className="bg-spotify-card/25 border border-white/5 rounded-lg overflow-hidden">
          {/* Table Headers */}
          <div className="grid grid-cols-[1.5fr_100px_1.5fr_100px_100px_80px] gap-4 px-4 py-3 border-b border-white/5 text-xs font-bold uppercase tracking-wider text-spotify-text">
            <span>Title / URL</span>
            <span>Status</span>
            <span>Progress</span>
            <span>Speed</span>
            <span>ETA</span>
            <span className="text-right">Action</span>
          </div>

          {/* List items */}
          <div className="divide-y divide-white/5">
            {downloadQueue.map((item) => {
              const isProcessing = item.status === "processing";
              const isDownloading = item.status === "downloading";
              const isPaused = item.status === "paused";
              const isFailed = item.status === "failed";
              const isCompleted = item.status === "completed";
              const isCancelled = item.status === "cancelled";
              const isPending = item.status === "pending";

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[1.5fr_100px_1.5fr_100px_100px_80px] gap-4 px-4 py-4 items-center hover:bg-spotify-hover/10 transition"
                >
                  {/* Title / Info */}
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-semibold text-white truncate" title={item.title || item.youtube_url}>
                      {item.title || "Fetching details..."}
                    </p>
                    <p className="text-[10px] text-spotify-text truncate mt-1">
                      {item.format.toUpperCase()} • {item.quality === "best" ? "Best Quality" : `${item.quality}kbps`} • <a href={item.youtube_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.youtube_url}</a>
                    </p>
                    {isFailed && item.error_message && (
                      <p className="text-[10px] text-red-400 mt-1 line-clamp-1 italic" title={item.error_message}>
                        Error: {item.error_message}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div>{getStatusBadge(item.status)}</div>

                  {/* Progress Meter */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#3e3e3e] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFailed
                            ? "bg-red-500"
                            : isCompleted
                            ? "bg-spotify-green"
                            : isProcessing
                            ? "bg-purple-500 animate-pulse"
                            : "bg-spotify-green"
                        }`}
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-semibold text-white w-8 text-right">
                      {Math.round(item.progress)}%
                    </span>
                  </div>

                  {/* Speed */}
                  <div className="text-xs font-medium text-spotify-text">
                    {isDownloading && item.speed ? item.speed : "--"}
                  </div>

                  {/* ETA */}
                  <div className="text-xs font-medium text-spotify-text">
                    {isDownloading && item.eta ? item.eta : "--"}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    {/* Pause/Resume buttons */}
                    {isDownloading && (
                      <button
                        onClick={() => handlePause(item.id)}
                        className="p-1 text-spotify-text hover:text-white hover:bg-spotify-hover rounded transition"
                        title="Pause Download"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    
                    {isPaused && (
                      <button
                        onClick={() => handleResume(item.id)}
                        className="p-1 text-spotify-text hover:text-white hover:bg-spotify-hover rounded transition"
                        title="Resume Download"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    )}

                    {/* Cancel/Delete */}
                    {!isCompleted && !isCancelled && !isFailed && (
                      <button
                        onClick={() => handleCancel(item.id)}
                        className="p-1 text-spotify-text hover:text-red-400 hover:bg-spotify-hover rounded transition"
                        title="Cancel Task"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete finished/cancelled logs */}
                    {(isCompleted || isCancelled || isFailed) && (
                      <button
                        onClick={() => handleCancel(item.id)}
                        className="p-1 text-spotify-text hover:text-red-400 hover:bg-spotify-hover rounded transition"
                        title="Remove Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
