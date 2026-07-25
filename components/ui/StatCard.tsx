import React from 'react';
import { GlassCard } from './GlassCard';
import { AnimatedCounter } from './AnimatedCounter';
import { cn, formatCurrency } from '../../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: number | string;
  type?: 'currency' | 'number' | 'percentage';
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  icon?: React.ElementType;
  sparklineData?: number[];
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  type = 'number',
  trend,
  icon: Icon,
  sparklineData,
  className,
  onClick,
}) => {
  const formatter = (val: number) => {
    if (type === 'currency') return formatCurrency(val);
    if (type === 'percentage') return `${val.toFixed(1)}%`;
    return Math.round(val).toLocaleString();
  };

  const chartData = sparklineData?.map((val, idx) => ({ id: idx, value: val }));

  return (
    <GlassCard 
      onClick={onClick}
      className={cn(
        "relative overflow-hidden flex flex-col justify-between min-h-[140px]", 
        onClick && "cursor-pointer hover:border-primary/20",
        className
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate max-w-[120px] sm:max-w-none" title={title}>{title}</p>
          <h3 className="text-2xl font-bold tracking-tight text-white mt-2">
            {typeof value === 'number' ? (
              <span>{formatter(value)}</span>
            ) : (
              <span>{value}</span>
            )}
          </h3>
        </div>
        {Icon && (
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="flex justify-between items-end mt-4">
        {trend && (
          <div className="flex flex-col gap-1">
            <div className={cn(
              "flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full w-fit",
              trend.isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            )}>
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{trend.value}%</span>
            </div>
            <span className="text-[10px] text-slate-400">{trend.label}</span>
          </div>
        )}
        
        {chartData && chartData.length > 0 && (
          <div className="h-10 w-28 opacity-70">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={trend?.isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={trend?.isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={trend?.isPositive ? "#10b981" : "#ef4444"}
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill={`url(#grad-${title.replace(/\s+/g, '')})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
