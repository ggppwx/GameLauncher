import { motion } from 'framer-motion'
import { Button } from './ui/button'
import { Gamepad2, Plus, Search } from 'lucide-react'

interface HeaderProps {
  onScanSteam: () => void
  onAddGame: () => void
}

export function Header({ onScanSteam, onAddGame }: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white/95 backdrop-blur-md border-b border-white/20 shadow-lg"
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center space-x-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Game Launcher
            </h1>
          </motion.div>

          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center space-x-3"
          >
            <Button
              onClick={onScanSteam}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Search className="w-4 h-4 mr-2" />
              Scan Steam Games
            </Button>
            
            <Button
              onClick={onAddGame}
              variant="outline"
              className="border-2 border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Game
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}
