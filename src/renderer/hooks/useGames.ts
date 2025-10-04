import { useState, useEffect, useCallback } from 'react';
import { Game } from '../types/game';
import { gameApi, ScanProgress } from '../services/gameApi';
import { apiClient } from '../services/api';
import { useToast } from '../components/ui/use-toast';
import { filterGamesBySearch, filterGamesByType, filterGamesByTags } from '../utils/filterUtils';

export interface UseGamesReturn {
  games: Game[];
  filteredGames: Game[];
  loading: boolean;
  scanning: boolean;
  importing: boolean;
  scanProgress: ScanProgress | null;
  searchTerm: string;
  filterType: string;
  selectedTags: string[];
  installedOnly: boolean;
  setSearchTerm: (term: string) => void;
  setFilterType: (type: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setInstalledOnly: (value: boolean) => void;
  loadGames: () => Promise<void>;
  // scanSteamGames: () => Promise<void>;
  importSteamGames: () => Promise<void>;
  launchGame: (game: Game) => Promise<void>;
  removeGame: (gameId: string) => Promise<void>;
  refreshGames: () => Promise<void>;
}

export function useGames(): UseGamesReturn {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [installedOnly, setInstalledOnly] = useState<boolean>(false);
  
  const { toast } = useToast();

  // Load games from database
  const loadGames = useCallback(async () => {
    try {
      setLoading(true);
      const gamesData = await gameApi.getGames();
      setGames(gamesData);
    } catch (error) {
      console.error('Error loading games:', error);
      toast({
        title: "Error",
        description: "Failed to load games",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Scan Steam games
  // const scanSteamGames = useCallback(async () => {
  //   try {
  //     setScanning(true);
  //     setScanProgress(null);
      
  //     // Set up progress listener
  //     gameApi.onScanProgress((progress) => {
  //       setScanProgress(progress);
  //     });

  //     const newGames = await gameApi.detectSteamGames();
      
  //     // Reload games after scan
  //     await loadGames();
      
  //     toast({
  //       title: "Scan Complete",
  //       description: `Found ${newGames.length} games`,
  //     });
      
  //   } catch (error) {
  //     console.error('Error scanning Steam games:', error);
  //     toast({
  //       title: "Scan Failed",
  //       description: error instanceof Error ? error.message : "Failed to scan Steam games",
  //       variant: "destructive"
  //     });
  //   } finally {
  //     setScanning(false);
  //     setScanProgress(null);
  //     gameApi.removeScanProgressListener();
  //   }
  // }, [loadGames, toast]);

  // Import Steam games (from account) - non-blocking
  const importSteamGames = useCallback(async () => {
    try {
      setImporting(true);
      // Do not set scanning overlay; remain interactive.
      setScanProgress(null);
      const loadingToast = toast({
        title: "Importing Steam Library",
        description: "Starting import...",
        // Keep the toast visible during long-running import
        // Radix Toast auto-closes by default; extend duration generously
        duration: 1000000,
      });
      let lastRefresh = 0;
      gameApi.onScanProgress(async (progress: ScanProgress) => {
        setScanProgress(progress);
        const now = Date.now();
        if (now - lastRefresh > 1000) { // throttle refresh to ~1s
          lastRefresh = now;
          try { await loadGames(); } catch (_) {}
        }
        try {
          loadingToast.update({
            id: loadingToast.id,
            title: "Importing Steam Library",
            description: `Processed ${progress.current}/${progress.total} • ${progress.gamesFound} added`,
            duration: 1000000,
          } as any);
        } catch (_) {}
      });
      const newGames = await gameApi.importSteamGames();
      await loadGames();
      try {
        loadingToast.update({
          id: loadingToast.id,
          title: "Import Complete",
          description: `Imported ${newGames.length} games from Steam account`,
          duration: 8000,
        } as any);
      } catch (_) {}
    } catch (error) {
      console.error('Error importing Steam games:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import Steam games",
        variant: "destructive"
      });
    } finally {
      setScanProgress(null);
      gameApi.removeScanProgressListener();
      setImporting(false);
    }
  }, [loadGames, toast]);

  // Launch a game
  const launchGame = useCallback(async (game: Game) => {
    try {
      if (game.type === 'steam') {
        const steamUrl = `steam://rungameid/${game.appid}`;
        await gameApi.launchGame({ gameId: game.id, gamePath: steamUrl });
      } else {
        await gameApi.launchGame({ gameId: game.id, gamePath: game.path });
      }
      
      toast({
        title: "Game Launched",
        description: `Starting ${game.name}...`,
      });
    } catch (error) {
      console.error('Error launching game:', error);
      toast({
        title: "Launch Failed",
        description: `Failed to launch ${game.name}`,
        variant: "destructive"
      });
    }
  }, [toast]);

  // Remove a game
  const removeGame = useCallback(async (gameId: string) => {
    try {
      // Call API to remove from database
      await gameApi.removeGame(gameId);
      
      // Remove from local state
      setGames(prev => prev.filter(game => game.id !== gameId));
      
      toast({
        title: "Game Removed",
        description: "Game has been removed from your library",
      });
    } catch (error) {
      console.error('Error removing game:', error);
      toast({
        title: "Remove Failed",
        description: "Failed to remove game",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Refresh games
  const refreshGames = useCallback(async () => {
    await loadGames();
  }, [loadGames]);

  // Filter games based on search, type, and tags using utility functions
  useEffect(() => {
    let filtered = games;

    // Apply filters in sequence using utility functions
    filtered = filterGamesBySearch(filtered, searchTerm);
    filtered = filterGamesByType(filtered, filterType);
    filtered = filterGamesByTags(filtered, selectedTags);
    if (installedOnly) {
      filtered = filtered.filter(g => Boolean(g.process || g.path));
    }

    setFilteredGames(filtered);
  }, [games, searchTerm, filterType, selectedTags, installedOnly]);

  // Load games on mount
  useEffect(() => {
    loadGames();
    // Listen to background updates (e.g., session ended -> Steam refresh)
    const handler = async (_event?: any, _data?: any) => {
      try { await loadGames(); } catch (_) {}
    };
    try { (apiClient as any).onGamesUpdated(handler); } catch (_) {}
    return () => {
      try { (apiClient as any).removeGamesUpdatedListener(); } catch (_) {}
    };
  }, [loadGames]);

  return {
    games,
    filteredGames,
    loading,
    scanning,
    importing,
    scanProgress,
    searchTerm,
    filterType,
    selectedTags,
    installedOnly,
    setSearchTerm,
    setFilterType,
    setSelectedTags,
    setInstalledOnly,
    loadGames,
    // scanSteamGames,
    importSteamGames,
    launchGame,
    removeGame,
    refreshGames,
  };
}
