import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { GameCard } from './GameCard'
import { Button } from './ui/button'
import { Shuffle, Sparkles } from 'lucide-react'
import { useGames } from '../hooks/useGames'

export function Recommendation() {
  const { games, launchGame, removeGame, refreshGames } = useGames()
  const [seed, setSeed] = useState(0)

  // Get 3 random games using a deterministic shuffle based on seed
  const randomGames = useMemo(() => {
    if (games.length === 0) return []
    
    // Filter to only installed games (games with process or path)
    const installedGames = games.filter(g => Boolean(g.process || g.path))
    
    if (installedGames.length === 0) return []
    
    // Create a copy of installed games array
    const shuffled = [...installedGames]
    
    // Simple seeded random function (Linear Congruential Generator)
    let random = seed
    const seededRandom = () => {
      random = (random * 9301 + 49297) % 233280
      return random / 233280
    }
    
    // Fisher-Yates shuffle with seeded random
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    // Return first 3 games
    return shuffled.slice(0, 3)
  }, [games, seed])

  const handleSkip = () => {
    setSeed(prev => prev + 1)
  }

  const handleTagsUpdated = () => {
    refreshGames()
  }

  // Check if there are any installed games
  const installedGamesCount = games.filter(g => Boolean(g.process || g.path)).length

  if (games.length === 0 || installedGamesCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex items-center justify-center p-8"
      >
        <div className="text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Sparkles className="w-12 h-12 text-white/80" />
          </motion.div>
          
          <motion.h3
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white mb-2"
          >
            {games.length === 0 ? "No Games Available" : "No Installed Games"}
          </motion.h3>
          
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/80 max-w-md mx-auto"
          >
            {games.length === 0 
              ? "Add some games to your library first to get recommendations!" 
              : "No installed games found. Install some games to see recommendations!"}
          </motion.p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-yellow-400" />
              Recommended for You
            </h2>
            <p className="text-white/70 text-sm">
              Discover games from your library you might want to play next
            </p>
          </div>
          
          <Button
            onClick={handleSkip}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all"
            size="lg"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            Skip
          </Button>
        </div>
      </motion.div>

      {/* Game Cards Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(220px,1fr))] max-w-[800px]"
      >
        {randomGames.map((game, index) => (
          <motion.div
            key={`${game.id}-${seed}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <GameCard
              game={game}
              onLaunch={launchGame}
              onRemove={removeGame}
              onTagsUpdated={handleTagsUpdated}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Info Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-8 text-center"
      >
        <p className="text-white/50 text-sm">
          Click "Skip" to see different recommendations from your library
        </p>
      </motion.div>
    </div>
  )
}
