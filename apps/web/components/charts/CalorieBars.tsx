'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';

export function CalorieBars({
  data,
  target,
}: {
  data: { date: string; consumed: number; burned: number }[];
  target?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        {target ? <ReferenceLine y={target} stroke="#94a3b8" strokeDasharray="4 4" label="יעד" /> : null}
        <Bar dataKey="consumed" fill="#e8826b" name="נצרך" radius={[6, 6, 0, 0]} />
        <Bar dataKey="burned" fill="#10b981" name="נשרף" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
