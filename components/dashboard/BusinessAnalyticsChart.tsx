import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { DashboardTooltip } from './DashboardTooltip';
import { cn } from '../../lib/utils';

interface BusinessAnalyticsChartProps {
  trendData: Array<{ date: string; leads: number; converted: number; revenue: number }>;
  sourceData: Array<{ name: string; value: number }>;
  isSuperAdmin: boolean;
  activeTab: 'leads' | 'revenue' | 'services';
  onTabChange: (tab: 'leads' | 'revenue' | 'services') => void;
}

export const BusinessAnalyticsChart: React.FC<BusinessAnalyticsChartProps> = ({
  trendData,
  sourceData,
  isSuperAdmin,
  activeTab,
  onTabChange,
}) => {
  return (
    <Card className="glass-card border border-white/5">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-sm font-bold text-white">Business Analytics</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            {activeTab === 'leads' && 'New leads vs conversions over time'}
            {activeTab === 'revenue' && 'Total payments revenue trend'}
            {activeTab === 'services' && 'Leads by acquisition source'}
          </CardDescription>
        </div>
        <div className="flex bg-slate-800/60 p-0.5 rounded-lg border border-white/5">
          {(['leads', 'revenue', 'services'] as const)
            .filter((tab) => isSuperAdmin || tab !== 'revenue')
            .map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 capitalize',
                  activeTab === tab
                    ? 'bg-white/10 text-white shadow-sm border border-white/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                {tab === 'services' ? 'Sources' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0" style={{ height: '240px' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          {activeTab === 'leads' ? (
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <RechartsTooltip content={<DashboardTooltip />} />
              <Area type="monotone" dataKey="leads" name="New Leads" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
              <Area type="monotone" dataKey="converted" name="Converted" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorConv)" />
            </AreaChart>
          ) : activeTab === 'revenue' ? (
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#64748b' }} />
              <RechartsTooltip content={<DashboardTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          ) : (
            <BarChart data={sourceData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <RechartsTooltip content={<DashboardTooltip />} />
              <Bar dataKey="value" name="Leads" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {sourceData.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#10b981'][idx % 5]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
