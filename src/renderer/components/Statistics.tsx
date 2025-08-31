import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Gamepad2, Clock, Calendar, Trophy, Loader2, X } from 'lucide-react'
// import { MonitoringDashboard } from './MonitoringDashboard'
import { GamePlaytimeChart } from './GamePlaytimeChart'
import { statisticsApi, ComprehensiveStats } from '../services/statisticsApi'

function CalendarPlaytimeView() {
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [data, setData] = useState<{ days: { date: string; total: number; games: { gameId: string; gameName: string; seconds: number }[] }[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (year: number, month: number) => {
    setLoading(true);
    try {
      const res = await statisticsApi.getMonthPlaytimeBreakdown(year, month);
      setData({ days: res.days });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(current.year, current.month);
  }, [current.year, current.month]);

  const goPrev = () => {
    const d = new Date(current.year, current.month - 2, 1);
    setCurrent({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  const goNext = () => {
    const d = new Date(current.year, current.month, 1);
    setCurrent({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  const firstDay = new Date(current.year, current.month - 1, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(current.year, current.month, 0).getDate();

  const grid: { date: string | null; games: { gameId: string; gameName: string; seconds: number }[]; total: number }[] = [];
  for (let i = 0; i < startWeekday; i++) grid.push({ date: null, games: [], total: 0 });
  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(current.month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const key = `${current.year}-${mm}-${dd}`;
    const entry = data?.days.find(d => d.date === key);
    grid.push({ date: key, games: entry?.games || [], total: entry?.total || 0 });
  }

  // simple color palette
  const colors = [
    '#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6','#f59e0b','#10b981','#3b82f6','#ef4444'
  ];

  const formatMinutes = (sec: number) => Math.round(sec / 60);

  // Build legend and consistent color mapping across month
  const legend = useMemo(() => {
    const totals = new Map<string, { name: string; seconds: number }>();
    data?.days.forEach((d) => {
      d.games.forEach((g) => {
        const prev = totals.get(g.gameId);
        if (prev) prev.seconds += g.seconds || 0;
        else totals.set(g.gameId, { name: g.gameName, seconds: g.seconds || 0 });
      });
    });
    const entries = Array.from(totals.entries()).sort((a, b) => b[1].seconds - a[1].seconds);
    const colorIndexByGameId = new Map<string, number>();
    entries.forEach(([gameId], idx) => colorIndexByGameId.set(gameId, idx % colors.length));
    return { entries, colorIndexByGameId };
  }, [data]);

  // Determine max total seconds in the month for absolute scaling of bars
  const maxTotalSeconds = useMemo(() => {
    const totals = data?.days.map(d => d.total || 0) || [0];
    return totals.reduce((m, v) => Math.max(m, v), 0);
  }, [data]);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-800">Monthly Playtime Calendar</h3>
        </div>
        <div className="space-x-2">
          <button onClick={goPrev} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">Prev</button>
          <span className="mx-2 text-sm text-gray-700">
            {firstDay.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={goNext} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">Next</button>
        </div>
      </div>
      {/* Legend */}
      {legend.entries && legend.entries.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {legend.entries.slice(0, colors.length).map(([gameId, info]) => {
            const idx = legend.colorIndexByGameId.get(gameId) ?? 0;
            return (
              <div key={gameId} className="flex items-center text-xs text-gray-700">
                <span className="w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: colors[idx] }} />
                <span className="mr-1">{info.name}</span>
                <span className="text-gray-500">({formatMinutes(info.seconds)}m)</span>
              </div>
            );
          })}
        </div>
      )}
      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-xs font-semibold text-gray-500 text-center">{d}</div>
          ))}
          {grid.map((cell, idx) => (
            <div key={idx} className="h-24 bg-white rounded border border-gray-100 p-1 flex flex-col">
              {cell.date && (
                <div className="text-[10px] text-gray-500 mb-1">{parseInt(cell.date.slice(-2))}</div>
              )}
              <div className="flex-1 flex items-end space-x-0.5 overflow-hidden">
                {cell.games.slice(0, 5).map((g, i) => {
                  const maxBase = maxTotalSeconds || 1;
                  // Round display height to 30-minute increments (visual only)
                  const roundedForDisplaySec = g.seconds > 0 ? Math.ceil(g.seconds / 1800) * 1800 : 0;
                  const height = Math.max(2, Math.round((roundedForDisplaySec / maxBase) * 60));
                  const colorIdx = legend.colorIndexByGameId.get(g.gameId) ?? (i % colors.length);
                  return <div key={g.gameId + i} style={{ height: height, backgroundColor: colors[colorIdx] }} className="w-2 rounded-t" title={`${g.gameName}: ${formatMinutes(g.seconds)}m`} />
                })}
              </div>
              <div className="text-[10px] text-gray-600 mt-1">{formatMinutes(cell.total)}m</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

  const handleDeleteSession = async (id: string | number) => {
    try {
      await statisticsApi.deleteSession(id);
      await loadStatistics();
    } catch (e) {
      console.error('Failed to delete session:', e);
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

            {/* Calendar View */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className=""
            >
              <CalendarPlaytimeView />
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
                      <div className="flex items-center space-x-3">
                        <p className="font-medium text-gray-800">
                          {session.gameTime ? statisticsApi.formatPlaytime(session.gameTime) : 'N/A'}
                        </p>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors"
                          aria-label="Delete session"
                          title="Delete session"
                        >
                          <X className="w-4 h-4" />
                        </button>
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
