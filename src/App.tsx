import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameLauncher } from './components/GameLauncher'
import { Toaster } from './components/ui/toaster'
import { useToast } from './components/ui/use-toast'

function App() {
  const { toast } = useToast()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen"
      >
        <GameLauncher />
      </motion.div>
      <Toaster />
    </div>
  )
}

export default App
