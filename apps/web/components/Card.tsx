import { ReactNode } from 'react';
import clsx from 'clsx';

export function Card({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div className={clsx('bg-white rounded-2xl shadow-sm p-5', className)}>
      {title ? <h2 className="text-base font-semibold mb-3 text-gray-700">{title}</h2> : null}
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-gray-800">
        {value}
        {unit ? <span className="text-base font-normal text-gray-500"> {unit}</span> : null}
      </div>
      {hint ? <div className="text-xs text-gray-400 mt-1">{hint}</div> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  color = 'brand-500',
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={clsx('h-2 transition-all', `bg-${color}`)} style={{ width: `${pct}%` }} />
    </div>
  );
}
