import { motion, AnimatePresence } from 'framer-motion'
import { GameCard } from './GameCard'
import { Game } from '../types/game'
import { Gamepad2 } from 'lucide-react'

interface GameGridProps {
  games: Game[]
  onLaunchGame: (game: Game) => void
  onRemoveGame: (gameId: string) => void
}

export function GameGrid({ games, onLaunchGame, onRemoveGame }: GameGridProps) {
  if (games.length === 0) {
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
            <Gamepad2 className="w-12 h-12 text-white/80" />
          </motion.div>
          
          <motion.h3
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white mb-2"
          >
            No Games Found
          </motion.h3>
          
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/80 max-w-md mx-auto"
          >
            Click "Scan Steam Games" to detect your Steam library or "Add Game" to add custom games to your collection.
          </motion.p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <AnimatePresence>
          {games.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              layout
            >
              <GameCard
                game={game}
                onLaunch={onLaunchGame}
                onRemove={onRemoveGame}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
