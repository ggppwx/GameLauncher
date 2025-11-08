import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GameCard } from './GameCard'
import { Button } from './ui/button'
import { Shuffle, Sparkles, Brain } from 'lucide-react'
import { useGames } from '../hooks/useGames'
import { recommendationApi, RecommendationWithScore } from '../services/recommendationApi'
import { Game } from '../types/game'

export function Recommendation() {
  const { launchGame: originalLaunchGame, removeGame, refreshGames } = useGames()
  const [recommendations, setRecommendations] = useState<RecommendationWithScore[]>([])
  const [loading, setLoading] = useState(true)
  const [installedGamesCount, setInstalledGamesCount] = useState(0)

  // Load smart recommendations
  const loadRecommendations = async () => {
    setLoading(true)
    try {
      const recs = await recommendationApi.getSmartRecommendations(5)
      console.log('Received recommendations:', recs)
      setRecommendations(recs)
    } catch (error) {
      console.error('Error loading recommendations:', error)
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadRecommendations()
    
    // Get installed games count
    window.electronAPI.getGames().then(games => {
      const installedCount = games.filter(g => Boolean(g.process || g.path)).length
      setInstalledGamesCount(installedCount)
    })
  }, [])

  const handleSkip = () => {
    loadRecommendations()
  }

  // Wrap launch game to record recommendation feedback
  const launchGame = async (game: Game) => {
    // Record the launch
    await recommendationApi.recordLaunch(game.id)
    // Launch the game
    await originalLaunchGame(game)
  }

  const handleTagsUpdated = () => {
    refreshGames()
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex items-center justify-center p-8"
      >
        <div className="text-center">
          <Brain className="w-12 h-12 text-white/80 animate-pulse mx-auto mb-4" />
          <p className="text-white/70">Analyzing your gaming patterns...</p>
        </div>
      </motion.div>
    )
  }

  if (installedGamesCount === 0 || recommendations.length === 0) {
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
            {installedGamesCount === 0 ? "No Installed Games" : "No Recommendations Available"}
          </motion.h3>
          
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/80 max-w-md mx-auto"
          >
            {installedGamesCount === 0 
              ? "Install some games to see smart recommendations!" 
              : "Play some games to build your recommendation profile!"}
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
              <Brain className="w-8 h-8 text-purple-400" />
              Smart Recommendations
            </h2>
            <p className="text-white/70 text-sm">
              AI-powered suggestions based on your gaming habits and preferences
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
        className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(220px,1fr))] max-w-[1400px]"
      >
        {recommendations.map((rec, index) => (
          <motion.div
            key={`${rec.game.id}-${Date.now()}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <GameCard
              game={rec.game}
              onLaunch={launchGame}
              onRemove={removeGame}
              onTagsUpdated={handleTagsUpdated}
              hybridScore={rec.hybridScore}
              expectedReward={rec.expectedReward}
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
          Click "Skip" to refresh recommendations • Recommendations improve as you play more games
        </p>
      </motion.div>
    </div>
  )
}
