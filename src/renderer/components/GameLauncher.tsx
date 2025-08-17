import { useState } from 'react'
import { GameGrid } from './GameGrid'
import { Sidebar } from './Sidebar'
import { AddGameDialog } from './AddGameDialog'
import { ConfigDialog } from './ConfigDialog'
import { LoadingOverlay } from './LoadingOverlay'
import { Game } from '../types/game'
import { useGames } from '../hooks/useGames'
import { useTags } from '../hooks/useTags'
import { Settings } from 'lucide-react'

export function GameLauncher() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  
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
    setSearchTerm,
    setFilterType,
    setSelectedTags,
    scanSteamGames,
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
            <select className="dropdown-steam">
              <option>SORT BY Release Date</option>
              <option>Name</option>
              <option>Playtime</option>
            </select>
            <button
              onClick={scanSteamGames}
              className="btn-steam px-4 py-2 text-sm"
            >
              Scan Steam
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
            selectedTags={selectedTags}
            onTagFilterChange={setSelectedTags}
            games={games}
          />
        </div>

        {/* Scrollable Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <GameGrid 
              games={filteredGames}
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
