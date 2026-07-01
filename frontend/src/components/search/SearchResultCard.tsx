import React from "react";
import { Download, Youtube, Clock, Eye } from "lucide-react";
import { YouTubeSearchResult } from "../../lib/types";
import { formatDuration, formatViewCount } from "../../lib/utils";

interface SearchResultCardProps {
  result: YouTubeSearchResult;
  onDownloadClick: (result: YouTubeSearchResult) => void;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({
  result,
  onDownloadClick,
}) => {
  return (
    <div className="flex gap-4 p-4 bg-spotify-card border border-white/5 rounded-lg hover:bg-spotify-hover transition duration-200 group">
      
      {/* Thumbnail */}
      <div className="relative w-40 h-24 shrink-0 rounded overflow-hidden shadow-lg bg-black">
        {result.thumbnail ? (
          <img
            src={result.thumbnail}
            alt={result.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-spotify-hover text-white/40">
            <Youtube className="w-10 h-10" />
          </div>
        )}
        
        {/* Duration badge */}
        {result.duration !== undefined && (
          <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatDuration(result.duration)}
          </div>
        )}
      </div>

      {/* Info details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h3
            className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-spotify-green transition cursor-pointer"
            title={result.title}
          >
            {result.title}
          </h3>
          <p className="text-xs text-spotify-text font-medium mt-1 truncate">
            {result.channel}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2">
          {/* Views count */}
          <span className="text-[11px] text-spotify-text flex items-center gap-1.5 font-semibold">
            {result.view_count !== undefined && (
              <>
                <Eye className="w-3.5 h-3.5" />
                {formatViewCount(result.view_count)}
              </>
            )}
          </span>

          {/* Download button */}
          <button
            onClick={() => onDownloadClick(result)}
            className="px-3.5 py-1.5 bg-white hover:bg-spotify-green hover:text-black hover:scale-105 text-black text-xs font-bold rounded-full flex items-center gap-1.5 shadow transition duration-200"
          >
            <Download className="w-3.5 h-3.5" />
            Configure & Download
          </button>
        </div>
      </div>

    </div>
  );
};
