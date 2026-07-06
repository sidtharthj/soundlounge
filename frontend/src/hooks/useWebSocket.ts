import { useEffect } from "react";
import { wsClient } from "@/lib/websocket";
import { useLibraryStore } from "@/stores/libraryStore";

export function useWebSocket() {
  const updateQueueItem = useLibraryStore((state) => state.updateQueueItem);
  const fetchSongs = useLibraryStore((state) => state.fetchSongs);
  const fetchStats = useLibraryStore((state) => state.fetchStats);

  useEffect(() => {
    // Connect WebSocket
    wsClient.connect();

    // Subscribe to events
    const unsubProgress = wsClient.subscribe("download_progress", (data) => {
      updateQueueItem(data);
    });

    const unsubComplete = wsClient.subscribe("download_complete", (data) => {
      // data: { id: queue_id, song_id: song_id, title: title }
      updateQueueItem({
        id: data.id,
        status: "completed",
        progress: 100,
        speed: undefined,
        eta: undefined,
      });
      // Refresh local library to show new song
      fetchSongs();
      fetchStats();
    });

    const unsubError = wsClient.subscribe("download_error", (data) => {
      // data: { id: queue_id, error: error_msg }
      updateQueueItem({
        id: data.id,
        status: "failed",
        error_message: data.error,
        speed: undefined,
        eta: undefined,
      });
    });

    return () => {
      unsubProgress();
      unsubComplete();
      unsubError();
    };
  }, [updateQueueItem, fetchSongs, fetchStats]);
}

