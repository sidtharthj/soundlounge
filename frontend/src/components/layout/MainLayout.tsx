import React from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { NowPlaying } from "./NowPlaying";
import { useWebSocket } from "@/hooks/useWebSocket";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // Connect and manage real-time WebSocket connection
  useWebSocket();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-spotify-black text-white">
      {/* Top Section: Sidebar + Content */}
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-spotify-dark">
          <TopBar />
          
          {/* Scrollable View panel */}
          <div className="flex-1 overflow-y-auto relative spotify-gradient">
            {children}
          </div>
        </div>
      </div>
      
      {/* Bottom Audio Player Bar */}
      <NowPlaying />
    </div>
  );
};

