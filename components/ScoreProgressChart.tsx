'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface ScoreDataPoint {
  date: string;
  score: number;
  topic: string;
}

interface ScoreProgressChartProps {
  data: ScoreDataPoint[];
}

export function ScoreProgressChart({ data }: ScoreProgressChartProps) {
  if (data.length < 2) return null;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#a3a3a3' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#a3a3a3' }}
          axisLine={false}
          tickLine={false}
          ticks={[0, 25, 50, 75, 100]}
        />
        <ReferenceLine y={80} stroke="#16a34a" strokeDasharray="4 2" strokeWidth={1} label={{ value: 'Mastery', position: 'right', fontSize: 9, fill: '#16a34a' }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e5e5', boxShadow: 'none' }}
        formatter={(v, _, props) => [`${String(v)}/100`, (props.payload as ScoreDataPoint | undefined)?.topic ?? 'Score']}
          labelFormatter={() => ''}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#171717"
          strokeWidth={2}
          dot={{ r: 3, fill: '#171717', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#171717', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
