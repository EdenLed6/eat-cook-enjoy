'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';

export function WeightChart({
  data,
  goalKg,
}: {
  data: { date: string; weight: number; ma?: number }[];
  goalKg?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={['dataMin - 1', 'dataMax + 1']} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
        />
        {goalKg ? <ReferenceLine y={goalKg} stroke="#10b981" strokeDasharray="4 4" label="יעד" /> : null}
        <Line type="monotone" dataKey="weight" stroke="#e8826b" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="ma" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="3 3" />
      </LineChart>
    </ResponsiveContainer>
  );
}
