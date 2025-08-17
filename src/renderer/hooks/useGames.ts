import { useState, useEffect, useCallback } from 'react';
import { Game } from '../types/game';
import { gameApi, ScanProgress } from '../services/gameApi';
import { useToast } from '../components/ui/use-toast';
import { filterGamesBySearch, filterGamesByType, filterGamesByTags } from '../utils/filterUtils';

export interface UseGamesReturn {
  games: Game[];
  filteredGames: Game[];
  loading: boolean;
  scanning: boolean;
  scanProgress: ScanProgress | null;
  searchTerm: string;
  filterType: string;
  selectedTags: string[];
  setSearchTerm: (term: string) => void;
  setFilterType: (type: string) => void;
  setSelectedTags: (tags: string[]) => void;
  loadGames: () => Promise<void>;
  scanSteamGames: () => Promise<void>;
  launchGame: (game: Game) => Promise<void>;
  removeGame: (gameId: string) => Promise<void>;
  refreshGames: () => Promise<void>;
}

export function useGames(): UseGamesReturn {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
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
  const scanSteamGames = useCallback(async () => {
    try {
      setScanning(true);
      setScanProgress(null);
      
      // Set up progress listener
      gameApi.onScanProgress((progress) => {
        setScanProgress(progress);
      });

      const newGames = await gameApi.detectSteamGames();
      
      // Reload games after scan
      await loadGames();
      
      toast({
        title: "Scan Complete",
        description: `Found ${newGames.length} games`,
      });
      
    } catch (error) {
      console.error('Error scanning Steam games:', error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Failed to scan Steam games",
        variant: "destructive"
      });
    } finally {
      setScanning(false);
      setScanProgress(null);
      gameApi.removeScanProgressListener();
    }
  }, [loadGames, toast]);

  // Launch a game
  const launchGame = useCallback(async (game: Game) => {
    try {
      if (game.type === 'steam') {
        const steamUrl = `steam://rungameid/${game.appid}`;
        await gameApi.launchGame(steamUrl);
      } else {
        await gameApi.launchGame(game.path);
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
      // For now, we'll just remove from local state
      // In the future, this could call an API to remove from database
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

    setFilteredGames(filtered);
  }, [games, searchTerm, filterType, selectedTags]);

  // Load games on mount
  useEffect(() => {
    loadGames();
  }, [loadGames]);

  return {
    games,
    filteredGames,
    loading,
    scanning,
    scanProgress,
    searchTerm,
    filterType,
    selectedTags,
    setSearchTerm,
    setFilterType,
    setSelectedTags,
    loadGames,
    scanSteamGames,
    launchGame,
    removeGame,
    refreshGames,
  };
}
