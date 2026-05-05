'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';

interface ActivityEntry {
  day: string;
  sessions: number;
}

interface Props {
  data: ActivityEntry[];
}

export function ActivityBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -28 }}>
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: '#a3a3a3' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={false}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e5e5e5',
            boxShadow: 'none',
          }}
          formatter={(v) => [v as number, 'Sessions']}
        />
        <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.sessions > 0 ? '#171717' : '#f0f0f0'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
