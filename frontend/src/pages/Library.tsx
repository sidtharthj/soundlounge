import React from "react";
import { Search, Loader2, Music, SortAsc, SortDesc, ChevronRight } from "lucide-react";
import { useLibraryStore } from "../../stores/libraryStore";
import { usePlayer } from "../../hooks/usePlayer";
import { SongRow } from "../../components/library/SongRow";
import { Song } from "../../lib/types";
import { api } from "../../lib/api";
import { ArtworkImage } from "../../components/common/ArtworkImage";

export const Library: React.FC = () => {
  const songs = useLibraryStore((state) => state.songs);
  const fetchSongs = useLibraryStore((state) => state.fetchSongs);
  const isLoading = useLibraryStore((state) => state.isLoadingSongs);
  
  const player = usePlayer();

  const [activeTab, setActiveTab] = React.useState<"songs" | "albums" | "artists">("songs");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState("date_downloaded");
  const [sortOrder, setSortOrder] = React.useState("desc");
  const [searchResults, setSearchResults] = React.useState<Song[] | null>(null);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    fetchSongs({ sort_by: sortBy, sort_order: sortOrder });
  }, [fetchSongs, sortBy, sortOrder]);

  // Handle local library search
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await api.searchSongs(searchQuery);
        setSearchResults(results);
      } catch (e) {
        console.error("Search failed:", e);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const displayedSongs = searchResults !== null ? searchResults : songs;

  // Group songs by album
  const getAlbums = () => {
    const albumMap: Record<string, { title: string; artist: string; songs: Song[]; art?: string; id?: number }> = {};
    displayedSongs.forEach((song) => {
      const albumKey = `${song.album} - ${song.artist}`.toLowerCase();
      if (!albumMap[albumKey]) {
        albumMap[albumKey] = {
          title: song.album || "Unknown Album",
          artist: song.artist || "Unknown Artist",
          songs: [],
          art: song.artwork_path,
          id: song.id,
        };
      }
      albumMap[albumKey].songs.push(song);
    });
    return Object.values(albumMap);
  };

  // Group songs by artist
  const getArtists = () => {
    const artistMap: Record<string, { name: string; songs: Song[] }> = {};
    displayedSongs.forEach((song) => {
      const artistKey = (song.artist || "Unknown Artist").trim().toLowerCase();
      if (!artistMap[artistKey]) {
        artistMap[artistKey] = {
          name: song.artist || "Unknown Artist",
          songs: [],
        };
      }
      artistMap[artistKey].songs.push(song);
    });
    return Object.values(artistMap);
  };

  const handlePlayAlbum = (albumSongs: Song[]) => {
    if (albumSongs.length > 0) {
      player.playList(albumSongs, 0);
    }
  };

  const handlePlayArtist = (artistSongs: Song[]) => {
    if (artistSongs.length > 0) {
      player.playList(artistSongs, 0);
    }
  };

  const handleSortOrderToggle = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  };

  return (
    <div className="p-6 space-y-6 select-none">
      
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Pills Tabs */}
        <div className="flex gap-2">
          {(["songs", "albums", "artists"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition border ${
                activeTab === tab
                  ? "bg-white text-black border-white"
                  : "bg-transparent text-spotify-text border-white/10 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Input & Sort Options */}
        <div className="flex gap-3 w-full sm:w-auto items-center justify-end">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-spotify-text" />
            <input
              type="text"
              placeholder="Search in library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-spotify-card text-white pl-10 pr-4 py-2 text-xs rounded border border-white/5 focus:outline-none focus:border-spotify-green transition"
            />
          </div>

          {/* Sort dropdown */}
          {activeTab === "songs" && (
            <div className="flex gap-1 items-center shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-spotify-card text-white border border-white/5 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-spotify-green"
              >
                <option value="date_downloaded">Date Added</option>
                <option value="title">Title</option>
                <option value="artist">Artist</option>
                <option value="album">Album</option>
                <option value="play_count">Plays</option>
                <option value="duration">Duration</option>
              </select>
              
              <button
                onClick={handleSortOrderToggle}
                className="p-1.5 bg-spotify-card border border-white/5 text-spotify-text hover:text-white rounded transition"
                title={sortOrder === "desc" ? "Sort Ascending" : "Sort Descending"}
              >
                {sortOrder === "desc" ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content display based on Active Tab */}
      {isLoading || searching ? (
        <div className="flex items-center justify-center py-20 text-spotify-text gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-spotify-green" />
          <span>Searching local library...</span>
        </div>
      ) : displayedSongs.length === 0 ? (
        <div className="p-16 text-center bg-spotify-card border border-white/5 rounded-lg text-spotify-text text-sm italic">
          Your library is empty. Search for YouTube tracks or paste URLs to start downloading music!
        </div>
      ) : activeTab === "songs" ? (
        /* SONGS VIEW */
        <div className="bg-spotify-card/25 border border-white/5 rounded-lg p-2 space-y-1.5">
          {/* Table Headers */}
          <div className="grid grid-cols-[40px_minmax(150px,2fr)_minmax(100px,1fr)_120px_100px_60px] gap-4 px-4 py-2 border-b border-white/5 text-xs font-bold uppercase tracking-wider text-spotify-text">
            <span className="text-center">#</span>
            <span>Title</span>
            <span>Album</span>
            <span>Date Added</span>
            <span>Plays</span>
            <span className="text-right">Time</span>
          </div>

          <div className="flex flex-col gap-1">
            {displayedSongs.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} />
            ))}
          </div>
        </div>
      ) : activeTab === "albums" ? (
        /* ALBUMS VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {getAlbums().map((album, i) => (
            <div
              key={i}
              onDoubleClick={() => handlePlayAlbum(album.songs)}
              className="bg-spotify-card border border-white/5 hover:bg-spotify-hover/40 transition duration-200 p-4 rounded-lg flex flex-col group cursor-pointer"
            >
              <ArtworkImage
                artworkPath={album.art}
                songId={album.id}
                title={album.title}
                className="w-full aspect-square object-cover rounded-md shadow-lg border border-white/5 mb-3 group-hover:scale-[1.02] transition"
              />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{album.title}</h4>
                <p className="text-xs text-spotify-text truncate mt-1">{album.artist}</p>
                <p className="text-[10px] text-spotify-text/80 mt-1 font-semibold">
                  {album.songs.length} tracks
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ARTISTS VIEW */
        <div className="bg-spotify-card/25 border border-white/5 rounded-lg divide-y divide-white/5">
          {getArtists().map((artist, i) => (
            <div
              key={i}
              onDoubleClick={() => handlePlayArtist(artist.songs)}
              className="flex items-center justify-between p-4 hover:bg-spotify-hover/40 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-spotify-hover flex items-center justify-center text-spotify-green font-bold">
                  {artist.name[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{artist.name}</h4>
                  <p className="text-xs text-spotify-text">{artist.songs.length} tracks in library</p>
                </div>
              </div>

              <button
                onClick={() => handlePlayArtist(artist.songs)}
                className="text-xs font-bold text-spotify-green hover:underline flex items-center gap-0.5"
              >
                Play Tracks
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
