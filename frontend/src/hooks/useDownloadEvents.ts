/**
 * useDownloadEvents — subscribes to WebSocket download progress events.
 *
 * This is a convenience hook used by components that want to
 * reactively observe download queue updates without managing the
 * WebSocket connection directly. The actual WS connection is managed
 * globally by useWebSocket (called once in MainLayout).
 */
import { useLibraryStore } from "@/stores/libraryStore";
import { wsClient } from "@/lib/websocket";
import { useEffect } from "react";

export function useDownloadEvents() {
  const updateQueueItem = useLibraryStore((state) => state.updateQueueItem);
  const fetchSongs = useLibraryStore((state) => state.fetchSongs);
  const fetchStats = useLibraryStore((state) => state.fetchStats);

  useEffect(() => {
    const unsubProgress = wsClient.subscribe("download_progress", (data) => {
      updateQueueItem(data);
    });

    const unsubComplete = wsClient.subscribe("download_complete", (data) => {
      updateQueueItem({
        id: data.id,
        status: "completed",
        progress: 100,
        speed: undefined,
        eta: undefined,
      });
      fetchSongs();
      fetchStats();
    });

    const unsubError = wsClient.subscribe("download_error", (data) => {
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
