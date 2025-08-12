import { motion } from 'framer-motion'
import { Card, CardContent, CardFooter } from './ui/card'
import { Button } from './ui/button'
import { Game } from '../types/game'
import { Gamepad2, Play, Monitor } from 'lucide-react'

interface GameCardProps {
  game: Game
  onLaunch: (game: Game) => void
  onRemove: (gameId: string) => void
}

export function GameCard({ game, onLaunch, onRemove }: GameCardProps) {
  const isSteam = game.type === 'steam'

  return (
    <motion.div
      whileHover={{ 
        y: -8,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="bg-white/95 backdrop-blur-md border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group w-full max-w-sm h-64">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <motion.div
              whileHover={{ rotate: 5 }}
              className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
            >
              {isSteam ? (
                <Monitor className="w-6 h-6 text-white" />
              ) : (
                <Gamepad2 className="w-6 h-6 text-white" />
              )}
            </motion.div>
            
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                isSteam 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {game.type}
            </motion.span>
          </div>

          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base font-bold text-gray-800 mb-2 line-clamp-2"
          >
            {game.name}
          </motion.h3>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xs text-gray-600 mb-3 line-clamp-2"
          >
            {game.path}
          </motion.p>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <Button
            onClick={() => onLaunch(game)}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Play className="w-4 h-4 mr-2" />
            Play
          </Button>
        </CardFooter>

        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          initial={false}
        />
      </Card>
    </motion.div>
  )
}
