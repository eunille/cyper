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

interface TopicEntry {
  topic: string;
  count: number;
}

interface Props {
  data: TopicEntry[];
}

export function TopicDistributionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-neutral-400">No sessions yet.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#a3a3a3' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="topic"
          tick={{ fontSize: 11, fill: '#737373' }}
          axisLine={false}
          tickLine={false}
          width={95}
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
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? '#171717' : '#d4d4d4'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
