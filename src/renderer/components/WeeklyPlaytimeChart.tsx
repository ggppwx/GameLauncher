import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WeeklyPlaytimePoint {
  weekStart: string;
  totalPlaytime: number;
}

interface WeeklyPlaytimeChartProps {
  data?: WeeklyPlaytimePoint[];
  formatPlaytime: (seconds: number) => string;
}

export function WeeklyPlaytimeChart({ data, formatPlaytime }: WeeklyPlaytimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center h-64 bg-gray-50 rounded-lg"
      >
        <div className="text-center">
          <p className="text-gray-500 text-lg">No weekly data available</p>
          <p className="text-gray-400 text-sm">Play this week to see activity</p>
        </div>
      </motion.div>
    );
  }

  const chartData = (data || []).map((d) => ({
    label: new Date(d.weekStart + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    weekStart: d.weekStart,
    totalPlaytime: d.totalPlaytime,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(value) => formatPlaytime(value as number)}
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: any) => [formatPlaytime(Number(value)), 'Playtime']}
            labelFormatter={(label: string, payload) => {
              const p = payload && payload[0] && (payload[0] as any).payload;
              if (p?.weekStart) {
                const d = new Date(p.weekStart + 'T00:00:00Z');
                const end = new Date(d);
                end.setUTCDate(end.getUTCDate() + 6);
                return `${d.toLocaleDateString()} - ${end.toLocaleDateString()}`;
              }
              return label;
            }}
          />
          <Bar dataKey="totalPlaytime" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Playtime" />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}



