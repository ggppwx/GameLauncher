import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Clock, Gamepad2, Loader2 } from 'lucide-react'
import { gameApi } from '../services/gameApi'
import { Game } from '../types/game'
import MDEditor from '@uiw/react-md-editor'

interface GameNotesData extends Game {
  formattedLastPlay: string
  formattedPlaytime: string
}

export function Notes() {
  const [gamesWithNotes, setGamesWithNotes] = useState<GameNotesData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGamesWithNotes()
  }, [])

  const loadGamesWithNotes = async () => {
    setLoading(true)
    try {
      // Get all games
      const games = await gameApi.getGames()
      
      // Filter games that have notes
      const gamesWithNotesOnly = games.filter(game => game.notes && game.notes.trim() !== '')

      // Sort by last played (most recent first)
      gamesWithNotesOnly.sort((a, b) => (b.timeLastPlay || 0) - (a.timeLastPlay || 0))

      // Format the data for display
      const formattedData: GameNotesData[] = gamesWithNotesOnly.map(game => ({
        ...game,
        formattedLastPlay: formatLastPlayed(game.timeLastPlay || 0),
        formattedPlaytime: formatPlaytime(game.playtime || 0)
      }))

      setGamesWithNotes(formattedData)
    } catch (error) {
      console.error('Failed to load games with notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatLastPlayed = (timestamp: number): string => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  const formatPlaytime = (seconds: number): string => {
    if (!seconds) return '0 hours'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours === 0 && minutes === 0) return '< 1 minute'
    if (hours === 0) return `${minutes} min`
    if (minutes === 0) return `${hours} hr`
    return `${hours} hr ${minutes} min`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading notes...</p>
        </div>
      </div>
    )
  }

  if (gamesWithNotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Notes Yet</h2>
          <p className="text-gray-600">
            Start adding notes to your games by opening the game details dialog.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-5xl mx-auto space-y-6"
          >
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-md p-6 border border-white/20">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Game Notes</h1>
                  <p className="text-gray-600 mt-1">
                    {gamesWithNotes.length} {gamesWithNotes.length === 1 ? 'game' : 'games'} with notes
                  </p>
                </div>
              </div>
            </div>

            {/* Game Notes List */}
            <div className="space-y-4">
              {gamesWithNotes.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white/90 backdrop-blur-md rounded-lg shadow-md border border-white/20 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Game Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {game.coverImage && (
                          <img
                            src={`local-file://${(game.coverImage || '').replace(/\\/g, '/')}`}
                            alt={game.name}
                            className="w-12 h-12 rounded object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        )}
                        <div>
                          <h2 className="text-xl font-semibold text-white">{game.name}</h2>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1 text-blue-100">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm">{game.formattedLastPlay}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-blue-100">
                              <Gamepad2 className="w-4 h-4" />
                              <span className="text-sm">{game.formattedPlaytime}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes Content */}
                  <div className="p-6">
                    <div data-color-mode="light">
                      <MDEditor.Markdown 
                        source={game.notes || ''} 
                        style={{ whiteSpace: 'pre-wrap', backgroundColor: 'transparent' }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

