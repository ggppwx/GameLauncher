import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MostPlayedGame } from '../services/statisticsApi';

interface GamePlaytimeChartProps {
  data?: MostPlayedGame[];
  formatPlaytime: (seconds: number) => string;
}

export function GamePlaytimeChart({ data, formatPlaytime }: GamePlaytimeChartProps) {
  console.log('GamePlaytimeChart received data:', data);
  console.log('Data type:', typeof data);
  console.log('Data is array:', Array.isArray(data));
  if (data && Array.isArray(data)) {
    console.log('First game item:', data[0]);
  }
  // Transform data for the chart
  let chartData: Array<{
    name: string;
    playtime: number;
    sessions: number;
    fullName: string;
  }> = [];
  try {
    chartData = (data || []).map(game => ({
      name: (game.gameName || 'Unknown Game').length > 15 ? (game.gameName || 'Unknown Game').substring(0, 15) + '...' : (game.gameName || 'Unknown Game'),
      playtime: game.totalPlaytime || 0,
      sessions: game.sessionCount || 0,
      fullName: game.gameName || 'Unknown Game'
    }));
  } catch (error) {
    console.error('Error transforming chart data:', error);
    console.error('Data that caused error:', data);
    chartData = [];
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.fullName}</p>
          <p className="text-sm text-gray-600">
            Playtime: <span className="font-medium">{formatPlaytime(data.playtime)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Sessions: <span className="font-medium">{data.sessions}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center h-64 bg-gray-50 rounded-lg"
      >
        <div className="text-center">
          <p className="text-gray-500 text-lg">No gaming data available</p>
          <p className="text-gray-400 text-sm">Start playing games to see your statistics</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            type="number"
            tickFormatter={(value) => formatPlaytime(value)}
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            type="category"
            dataKey="fullName"
            width={160}
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="playtime"
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
            name="Playtime"
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
