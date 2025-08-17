import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Gamepad2, Clock, Calendar, Trophy } from 'lucide-react'

export function Statistics() {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Welcome Message */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-4">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">Statistics Dashboard</h2>
              </div>
              <p className="text-gray-600">
                Track your gaming habits, playtime, and achievements. This feature is coming soon!
              </p>
            </div>

            {/* Placeholder Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Games */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Gamepad2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Games</p>
                    <p className="text-2xl font-bold text-gray-800">0</p>
                  </div>
                </div>
              </motion.div>

              {/* Total Playtime */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Playtime</p>
                    <p className="text-2xl font-bold text-gray-800">0h</p>
                  </div>
                </div>
              </motion.div>

              {/* Games Completed */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-gray-800">0</p>
                  </div>
                </div>
              </motion.div>

              {/* This Month */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-bold text-gray-800">0h</p>
                  </div>
                </div>
              </motion.div>

              {/* Most Played */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Most Played</p>
                    <p className="text-lg font-bold text-gray-800">-</p>
                  </div>
                </div>
              </motion.div>

              {/* Average Session */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <Clock className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Session</p>
                    <p className="text-2xl font-bold text-gray-800">0h</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Coming Soon Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 text-white"
            >
              <div className="text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-white/80" />
                <h3 className="text-2xl font-bold mb-2">Advanced Statistics Coming Soon</h3>
                <p className="text-blue-100 mb-6">
                  We're working on comprehensive gaming analytics including detailed playtime tracking, 
                  achievement progress, and personalized insights.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Playtime Analytics</h4>
                    <p className="text-blue-100">Track your gaming sessions and patterns</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Achievement Tracking</h4>
                    <p className="text-blue-100">Monitor your progress across games</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Personal Insights</h4>
                    <p className="text-blue-100">Get personalized gaming recommendations</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
