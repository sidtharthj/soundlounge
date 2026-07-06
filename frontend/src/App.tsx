import React from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { useUIStore } from "./stores/uiStore";

// Pages
import { Home } from "./pages/Home";
import { Search } from "./pages/Search";
import { Library } from "./pages/Library";
import { LikedSongs } from "./pages/LikedSongs";
import { PlaylistDetail } from "./pages/PlaylistDetail";
import { RecentlyPlayed } from "./pages/RecentlyPlayed";
import { Downloads } from "./pages/Downloads";
import { Settings } from "./pages/Settings";

export const App: React.FC = () => {
  const currentView = useUIStore((state) => state.currentView);

  const renderActivePage = () => {
    switch (currentView) {
      case "home":
        return <Home />;
      case "search":
        return <Search />;
      case "library":
        return <Library />;
      case "liked-songs":
        return <LikedSongs />;
      case "playlist":
        return <PlaylistDetail />;
      case "recently-played":
        return <RecentlyPlayed />;
      case "downloads":
        return <Downloads />;
      case "settings":
        return <Settings />;
      default:
        return <Home />;
    }
  };

  return <MainLayout>{renderActivePage()}</MainLayout>;
};

export default App;
