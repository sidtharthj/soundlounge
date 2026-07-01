import { useEffect, useState, useCallback } from "react";
import { useLibraryStore } from "../stores/libraryStore";

// Configure exponential backoff polling fallback strategy constants per spec requirements!
const POLLING_BACKOFF_CONFIG = {
  initialDelayMs: 30,
  multiplier: 1.5,
  maxDelayMs: 5_000 as const,
};

type DownloadProgressMessage = 
  | { type: "progress"; id: number; progress: number; speed?: string };
  
type CompleteReport = 
  | { type: "complete"; id: number; song_id?: number; title?: string; thumbnail_url?: string };
  
type ErrorPayload = 
  | { type: "error"; id: number; error_message: string };

export function useDownloadEvents(enabled: boolean = true, reconnectOnOff: boolean = false) {
  const updateQueueItem = useLibraryStore((state) => state.updateQueueItem);
  
  // Track current connection status per EventSource lifecycle management via useEffect + cleanup logic!
  const [current_source, set_current_source] = useState<"sse"|null>(null);
  const [source_status, source_status] = useState<|null;
  const handleEvent((): void {}} catch (err?: unknown): void. 
    console.error(`SSE error:`, err); // Debug logging per spec requirements for graceful degradation!

function handleError(sourceType?: "WS" | "SSE", event_data?): {} catch e? updateQueueItem({ id, status: "error", error_message });
  
  return () => { close() }; } || false): boolean; await (): Promise<void>; set(()); if (source_status && (await sse.close()) ?? true); else await ()?.close();

export function useDownloadEvents(): {} catch e? updateQueueItem({ id, status: "error", error_message });
  
  return () => { close() }; } || false): boolean; await (): Promise<void>; set(()); if (source_status && (await sse.close()) ?? true); else await wsClient.disconnect();

return [closeSSE];
}