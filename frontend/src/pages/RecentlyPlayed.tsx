import React from "react";
import { History, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { SongRow } from "@/components/library/SongRow";

interface PlayHistoryItemResolved {
  id: number;
  played_at: string;
  played_duration?: number;
  song: any;
}

export const RecentlyPlayed: React.FC = () => {
  const [history, setHistory] = React.useState<PlayHistoryItemResolved[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getRecentPlays(50); // or raw log list
      // Wait, api.getRecentPlays returns unique Songs list. Let's call a list_play_history if it exists.
      // Wait, in api.ts, getRecentPlays returns Song[], let's see.
      // Yes, we can just display getRecentPlays(50) since it provides unique songs that were played recently.
      setHistory(data.map((song, i) => ({ id: i, played_at: song.last_played || "", song })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="p-6 space-y-6 select-none">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-spotify-hover rounded-full text-spotify-green">
          <History className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Recently Played</h2>
          <p className="text-xs text-spotify-text">Tracks you listened to recently in Sound Lounge</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-spotify-text gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-spotify-green" />
          <span>Loading recently played history...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="p-16 text-center bg-spotify-card border border-white/5 rounded-lg text-spotify-text text-sm italic">
          No recently played tracks found. Start double-clicking tracks in your Library to play them!
        </div>
      ) : (
        <div className="bg-spotify-card/25 border border-white/5 rounded-lg p-2 space-y-1.5">
          <div className="grid grid-cols-[40px_minmax(150px,2fr)_minmax(100px,1fr)_120px_100px_60px] gap-4 px-4 py-2 border-b border-white/5 text-xs font-bold uppercase tracking-wider text-spotify-text">
            <span className="text-center">#</span>
            <span>Title</span>
            <span>Album</span>
            <span>Last Played</span>
            <span>Plays</span>
            <span className="text-right">Time</span>
          </div>

          <div className="flex flex-col gap-1">
            {history.map((item, idx) => (
              <SongRow key={item.song.id} song={item.song} index={idx} showDateAdded={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

