import { create } from "zustand";

type ViewType = "home" | "search" | "library" | "playlist" | "downloads" | "settings" | "liked-songs" | "recently-played";

interface UIState {
  sidebarCollapsed: boolean;
  currentView: ViewType;
  selectedPlaylistId: number | null;
  
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentView: (view: ViewType, playlistId?: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  currentView: "home",
  selectedPlaylistId: null,

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCurrentView: (view, playlistId = null) => set({ currentView: view, selectedPlaylistId: playlistId }),
}));
