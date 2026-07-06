import React from "react";
import { Music } from "lucide-react";

interface ArtworkImageProps {
  artworkPath?: string;
  songId?: number;
  title?: string;
  className?: string;
}

export const ArtworkImage: React.FC<ArtworkImageProps> = ({
  artworkPath,
  songId,
  title,
  className = "w-12 h-12 rounded-md object-cover shadow-md",
}) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [songId, artworkPath]);

  if (!artworkPath || hasError || !songId) {
    return (
      <div
        className={`${className} bg-spotify-hover flex items-center justify-center text-spotify-text border border-white/5`}
        title={title || "No artwork"}
      >
        <Music className="w-1/2 h-1/2 opacity-60" />
      </div>
    );
  }

  return (
    <img
      src={`/api/media/thumbnail/${songId}`}
      alt={title || "Artwork"}
      className={className}
      onError={() => setHasError(true)}
    />
  );
};
