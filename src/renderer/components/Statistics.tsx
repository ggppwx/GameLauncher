import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Gamepad2, Clock, Calendar, Trophy, Loader2 } from 'lucide-react'
import { MonitoringDashboard } from './MonitoringDashboard'
import { GamePlaytimeChart } from './GamePlaytimeChart'
import { statisticsApi, ComprehensiveStats } from '../services/statisticsApi'

export function Statistics() {
  const [stats, setStats] = useState<ComprehensiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading statistics...');
      const data = await statisticsApi.getComprehensiveStats();
      console.log('Statistics data received:', data);
      console.log('Most played games:', data?.mostPlayedGames);
      setStats(data);
    } catch (err) {
      console.error('Error loading statistics:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadStatistics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Additional safety check to ensure we have valid data
  if (!stats) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading statistics...</p>
          </div>
        </div>
      </div>
    );
  }

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
                Track your gaming habits, playtime, and achievements. View your most played games and recent sessions.
              </p>
            </div>

            {/* Stats Grid */}
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
                    <p className="text-2xl font-bold text-gray-800">{stats?.overall.total_games || 0}</p>
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
                    <p className="text-2xl font-bold text-gray-800">
                      {stats ? statisticsApi.formatPlaytime(stats.overall.total_playtime) : '0h'}
                    </p>
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
                    <p className="text-2xl font-bold text-gray-800">{stats?.completedGames || 0}</p>
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
                    <p className="text-2xl font-bold text-gray-800">
                      {stats ? statisticsApi.formatPlaytime(stats.currentMonthPlaytime) : '0h'}
                    </p>
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
                    <p className="text-lg font-bold text-gray-800">
                      {stats?.mostPlayedGame?.gameName || '-'}
                    </p>
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
                    <p className="text-2xl font-bold text-gray-800">
                      {stats ? statisticsApi.formatPlaytime(stats.overall.avg_session_time) : '0h'}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Most Played Games Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-white/20"
            >
              <div className="flex items-center space-x-3 mb-6">
                <BarChart3 className="w-8 h-8 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-800">Most Played Games (Last 7 Days)</h3>
              </div>
              <GamePlaytimeChart 
                data={stats?.mostPlayedGames || []} 
                formatPlaytime={statisticsApi.formatPlaytime}
              />
            </motion.div>

            {/* Game Monitoring Dashboard */}
            {/* <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-white/20"
            >
              <MonitoringDashboard />
            </motion.div> */}

            {/* Recent Sessions Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-white/20"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Clock className="w-8 h-8 text-green-600" />
                <h3 className="text-xl font-bold text-gray-800">Recent Gaming Sessions</h3>
              </div>
              <div className="space-y-3">
                {stats?.recentSessions && stats.recentSessions.length > 0 ? (
                  stats.recentSessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{session.gameName}</p>
                        <p className="text-sm text-gray-600">
                          {statisticsApi.formatDate(session.startTime)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-800">
                          {session.gameTime ? statisticsApi.formatPlaytime(session.gameTime) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No recent gaming sessions</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Advanced Features Coming Soon */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg p-8 text-white"
            >
              <div className="text-center">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 text-white/80" />
                <h3 className="text-2xl font-bold mb-2">Advanced Features Coming Soon</h3>
                <p className="text-green-100 mb-6">
                  Basic statistics are now live! We're working on advanced analytics including 
                  achievement tracking, detailed insights, and personalized recommendations.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Achievement Tracking</h4>
                    <p className="text-green-100">Monitor your progress across games</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Personal Insights</h4>
                    <p className="text-green-100">Get personalized gaming recommendations</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Advanced Analytics</h4>
                    <p className="text-green-100">Deep dive into your gaming patterns</p>
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
