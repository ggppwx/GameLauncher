import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameLauncher } from './renderer/components/GameLauncher'
import { Statistics } from './renderer/components/Statistics'
import { TabNavigation } from './renderer/components/TabNavigation'
import { Toaster } from './renderer/components/ui/toaster'
import { useToast } from './renderer/components/ui/use-toast'

function App() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'library' | 'statistics'>('library')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen"
      >
        {/* Tab Navigation */}
        <TabNavigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'library' ? (
            <motion.div
              key="library"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <GameLauncher />
            </motion.div>
          ) : (
            <motion.div
              key="statistics"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Statistics />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <Toaster />
    </div>
  )
}

export default App
