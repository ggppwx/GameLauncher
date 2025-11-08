import { motion } from 'framer-motion'
import { Gamepad2, BarChart3, Sparkles, FileText } from 'lucide-react'

interface TabNavigationProps {
  activeTab: 'library' | 'recommendation' | 'statistics' | 'notes'
  onTabChange: (tab: 'library' | 'recommendation' | 'statistics' | 'notes') => void
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
      <div className="flex items-center px-4">
        {/* App Logo/Title */}
        <div className="flex items-center space-x-3 py-3 pr-6 border-r border-gray-700">
          <Gamepad2 className="w-6 h-6 text-blue-400" />
          <span className="font-semibold text-lg">Game Launcher</span>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 ml-6">
          <motion.button
            onClick={() => onTabChange('library')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'library'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Library</span>
          </motion.button>

          <motion.button
            onClick={() => onTabChange('recommendation')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'recommendation'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Sparkles className="w-4 h-4" />
            <span>Recommendation</span>
          </motion.button>

          <motion.button
            onClick={() => onTabChange('statistics')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'statistics'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Statistics</span>
          </motion.button>

          <motion.button
            onClick={() => onTabChange('notes')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'notes'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileText className="w-4 h-4" />
            <span>Notes</span>
          </motion.button>
        </div>

        {/* Spacer to push content to the right */}
        <div className="flex-1" />

        {/* Optional: Add more header elements here */}
        <div className="flex items-center space-x-4">
          {/* You can add user profile, settings, etc. here */}
        </div>
      </div>
    </div>
  )
}
