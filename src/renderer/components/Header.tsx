import { motion } from 'framer-motion'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Gamepad2, Plus, Search, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useToast } from './ui/use-toast'

interface HeaderProps {
  onScanSteam: () => void
  onAddGame: () => void
}

export function Header({ onScanSteam, onAddGame }: HeaderProps) {
  const [steamPathInput, setSteamPathInput] = useState('')
  const [config, setConfig] = useState<any>(null)
  const { toast } = useToast()

  // Load config on mount
  useEffect(() => {
    loadConfig()
  }, [])

  // When config loads, set the input field if steamPath exists
  useEffect(() => {
    if (config && config.steamPath) {
      setSteamPathInput(config.steamPath)
    }
  }, [config])

  const loadConfig = async () => {
    try {
      const cfg = await window.electronAPI.getConfig()
      setConfig(cfg)
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  const saveSteamPath = async () => {
    try {
      const newConfig = { ...config, steamPath: steamPathInput }
      await window.electronAPI.setConfig(newConfig)
      setConfig(newConfig)
      toast({
        title: 'Steam path saved',
        description: steamPathInput,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save Steam path',
        variant: 'destructive',
      })
    }
  }

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

        {/* Steam Path Configuration */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 flex items-center space-x-2"
        >
          <Settings className="w-4 h-4 text-gray-600" />
          <Input
            type="text"
            placeholder="Enter Steam library path (e.g. C:\Program Files (x86)\Steam)"
            value={steamPathInput}
            onChange={(e) => setSteamPathInput(e.target.value)}
            className="flex-1 bg-white/50 border-white/20 focus:border-blue-500 focus:ring-blue-500"
          />
          <Button
            onClick={saveSteamPath}
            variant="outline"
            className="border-2 border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200"
          >
            Save Steam Path
          </Button>
        </motion.div>
      </div>
    </motion.header>
  )
}
