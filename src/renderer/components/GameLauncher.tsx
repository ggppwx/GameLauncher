import { useMemo, useState } from 'react'
import { GameGrid } from './GameGrid'
import { Sidebar } from './Sidebar'
import { AddGameDialog } from './AddGameDialog'
import { ConfigDialog } from './ConfigDialog'
import { LoadingOverlay } from './LoadingOverlay'
import { Game } from '../types/game'
import { useGames } from '../hooks/useGames'
import { useTags } from '../hooks/useTags'
import { Settings, Loader2 } from 'lucide-react'

export function GameLauncher() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'lastPlay' | 'timePlayed'>('lastPlay')
  
  // Use custom hooks for state management
  const {
    games,
    filteredGames,
    loading,
    scanning,
    scanProgress,
    searchTerm,
    filterType,
    selectedTags,
    installedOnly,
    setSearchTerm,
    setFilterType,
    setSelectedTags,
    setInstalledOnly,
    scanSteamGames,
    importSteamGames,
    launchGame,
    removeGame,
    refreshGames,
  } = useGames()

  const { tags } = useTags()

  const handleAddCustomGame = async (gameData: { name: string; path: string; executable?: string }) => {
    try {
      const newGame: Game = {
        id: `custom-${Date.now()}`,
        name: gameData.name,
        path: gameData.path,
        type: 'custom',
        executable: gameData.executable
      }
      
      // Add game to database and refresh
      await refreshGames()
      setDialogOpen(false)
    } catch (error) {
      console.error('Error adding game:', error)
    }
  }

  const handleTagsUpdated = () => {
    refreshGames() // Reload games to get updated tag information
  }

  const sortedGames = useMemo(() => {
    const arr = [...filteredGames]
    if (sortBy === 'name') {
      arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } else if (sortBy === 'lastPlay') {
      arr.sort((a, b) => (b.timeLastPlay || 0) - (a.timeLastPlay || 0))
    } else if (sortBy === 'timePlayed') {
      arr.sort((a, b) => (b.playtime || 0) - (a.playtime || 0))
    }
    return arr
  }, [filteredGames, sortBy])

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Library Header with Actions */}
      <div className="bg-white/90 backdrop-blur-md border-b border-white/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-800">
              My games ({filteredGames.length})
              {filteredGames.length !== games.length && (
                <span className="text-sm text-gray-500 ml-2">
                  of {games.length} total
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <select
              className="dropdown-steam"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'lastPlay' | 'timePlayed')}
              title="Sort games"
            >
              <option value="name">Name</option>
              <option value="lastPlay">Last Play</option>
              <option value="timePlayed">Time Played</option>
            </select>
            {/* <button
              onClick={scanSteamGames}
              className="btn-steam px-4 py-2 text-sm"
            >
              Scan Steam
            </button> */}
            <button
              onClick={importSteamGames}
              className="btn-steam px-4 py-2 text-sm"
            >
              Import Steam
            </button>
            <button
              onClick={() => setDialogOpen(true)}
              className="btn-steam px-4 py-2 text-sm"
            >
              Add Game
            </button>
            <button
              onClick={() => setConfigDialogOpen(true)}
              className="btn-steam px-3 py-2 text-sm"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {scanProgress && (
              <div className="ml-2 flex items-center text-xs text-gray-600 bg-white/70 backdrop-blur px-2 py-1 rounded">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                <span>
                  Importing {scanProgress.current}/{scanProgress.total} ({scanProgress.gamesFound} added)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Steam-like Sidebar */}
        <div className="sidebar-steam flex-shrink-0">
          <Sidebar 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterType={filterType}
            onFilterChange={setFilterType}
            installedOnly={installedOnly}
            onInstalledOnlyChange={setInstalledOnly}
            selectedTags={selectedTags}
            onTagFilterChange={setSelectedTags}
            games={games}
          />
        </div>

        {/* Scrollable Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <GameGrid 
              games={sortedGames}
              sortBy={sortBy}
              onLaunchGame={launchGame}
              onRemoveGame={removeGame}
              onTagsUpdated={handleTagsUpdated}
            />
          </div>
        </div>
      </div>

      <AddGameDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAddGame={(name, path) => handleAddCustomGame({ name, path })}
      />

      <ConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
      />

      <LoadingOverlay 
        show={scanning}
        message={
          scanProgress 
            ? `Scanning ${scanProgress.library}... ${scanProgress.current}/${scanProgress.total} games processed (${scanProgress.gamesFound} found)`
            : "Scanning for games..."
        }
      />
    </div>
  )
}
