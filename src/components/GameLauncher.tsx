import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameGrid } from './GameGrid'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AddGameDialog } from './AddGameDialog'
import { LoadingOverlay } from './LoadingOverlay'
import { useToast } from './ui/use-toast'
import { Game } from '../types/game'

export function GameLauncher() {
  const [games, setGames] = useState<Game[]>([])
  const [filteredGames, setFilteredGames] = useState<Game[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [isAddGameOpen, setIsAddGameOpen] = useState(false)
  const { toast } = useToast()

  // Load games from localStorage on mount and add mock games
  useEffect(() => {
    const savedGames = localStorage.getItem('customGames')
    let customGames: Game[] = []
    
    if (savedGames) {
      try {
        customGames = JSON.parse(savedGames)
      } catch (error) {
        console.error('Error loading saved games:', error)
      }
    }

    // Add mock games for demonstration
    const mockGames: Game[] = [
      {
        id: 'steam-730',
        name: 'Counter-Strike 2',
        path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive',
        type: 'steam',
        executable: 'cs2.exe'
      },
      {
        id: 'steam-570',
        name: 'Dota 2',
        path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\dota 2 beta',
        type: 'steam',
        executable: 'dota2.exe'
      },
      {
        id: 'steam-1172470',
        name: 'Apex Legends',
        path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Apex Legends',
        type: 'steam',
        executable: 'r5apex.exe'
      },
      {
        id: 'custom-1',
        name: 'Minecraft',
        path: 'C:\\Games\\Minecraft',
        type: 'custom',
        executable: 'minecraft.exe'
      },
      {
        id: 'custom-2',
        name: 'League of Legends',
        path: 'C:\\Riot Games\\League of Legends',
        type: 'custom',
        executable: 'LeagueClient.exe'
      },
      {
        id: 'steam-271590',
        name: 'Grand Theft Auto V',
        path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Grand Theft Auto V',
        type: 'steam',
        executable: 'GTA5.exe'
      }
    ]

    setGames([...mockGames, ...customGames])
  }, [])

  // Filter games when search term or filter type changes
  useEffect(() => {
    const filtered = games.filter(game => {
      const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === 'all' || game.type === filterType
      return matchesSearch && matchesType
    })
    setFilteredGames(filtered)
  }, [games, searchTerm, filterType])

  // Save custom games to localStorage when games change
  useEffect(() => {
    const customGames = games.filter(game => game.type === 'custom')
    localStorage.setItem('customGames', JSON.stringify(customGames))
  }, [games])

  const scanSteamGames = async () => {
    setIsLoading(true)
    try {
      // This would call the Electron main process
      const steamGames = await window.electronAPI.detectSteamGames()
      setGames(prev => [...prev, ...steamGames])
      
      if (steamGames.length > 0) {
        toast({
          title: "Success!",
          description: `Found ${steamGames.length} Steam games!`,
        })
      } else {
        toast({
          title: "No games found",
          description: "No Steam games found. Make sure Steam is installed.",
        })
      }
    } catch (error) {
      console.error('Error scanning Steam games:', error)
      toast({
        title: "Error",
        description: "Failed to scan Steam games",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const launchGame = async (game: Game) => {
    try {
      const result = await window.electronAPI.launchGame(game.executable || game.path)
      if (result.success) {
        toast({
          title: "Launching game",
          description: `Starting ${game.name}...`,
        })
      } else {
        toast({
          title: "Error",
          description: `Failed to launch ${game.name}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error launching game:', error)
      toast({
        title: "Error",
        description: `Error launching ${game.name}`,
        variant: "destructive",
      })
    }
  }

  const removeGame = (gameId: string) => {
    setGames(prev => prev.filter(game => game.id !== gameId))
    toast({
      title: "Game removed",
      description: "Game removed from library",
    })
  }

  const addCustomGame = (name: string, path: string) => {
    const newGame: Game = {
      id: `custom-${Date.now()}`,
      name,
      path,
      type: 'custom',
      executable: null,
    }
    setGames(prev => [...prev, newGame])
    setIsAddGameOpen(false)
    toast({
      title: "Game added",
      description: `Added ${name} to your library`,
    })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onScanSteam={scanSteamGames} onAddGame={() => setIsAddGameOpen(true)} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterType={filterType}
          onFilterChange={setFilterType}
        />
        
        <GameGrid
          games={filteredGames}
          onLaunchGame={launchGame}
          onRemoveGame={removeGame}
        />
      </div>

      <AddGameDialog
        open={isAddGameOpen}
        onOpenChange={setIsAddGameOpen}
        onAddGame={addCustomGame}
      />

      <LoadingOverlay show={isLoading} />
    </div>
  )
}
