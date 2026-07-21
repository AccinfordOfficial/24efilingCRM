import React from 'react';

interface DashboardTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export const DashboardTooltip: React.FC<DashboardTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm p-3 border border-white/10 shadow-2xl rounded-xl text-sm z-50">
        <p className="font-semibold text-white mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <span className="text-slate-400 capitalize">{entry.name}:</span>
            <span className="font-medium text-slate-200">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};
