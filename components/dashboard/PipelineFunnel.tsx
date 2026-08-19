import React from 'react';
import { Clock, Play, CheckCircle2, XCircle, BarChart2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';

export interface PipelineFunnelProps {
  pending: number;
  inProgress: number;
  won: number;
  lost: number;
  total: number;
  onNavigate: (page: string) => void;
}

export const PipelineFunnel: React.FC<PipelineFunnelProps> = ({ pending, inProgress, won, lost, total, onNavigate }) => {
  const stages = [
      { label: 'Pending', value: pending, color: 'bg-amber-500', light: 'bg-amber-500/10 text-amber-400', icon: Clock, page: 'Lead Workflow' },
      { label: 'In Progress', value: inProgress, color: 'bg-blue-500', light: 'bg-blue-500/10 text-blue-400', icon: Play, page: 'Lead Workflow' },
      { label: 'Converted', value: won, color: 'bg-emerald-500', light: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle2, page: 'Customers' },
      { label: 'Lost', value: lost, color: 'bg-slate-500', light: 'bg-slate-500/10 text-slate-400', icon: XCircle, page: 'All Leads' },
  ];
  return (
      <Card className="glass-card border-white/5">
          <CardHeader className="pb-3 border-b border-white/5 bg-white/5">
              <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold dark:text-white flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 dark:text-slate-400" /> Pipeline Overview
                  </CardTitle>
                  <span className="text-xs font-semibold dark:text-slate-400">{total} Total Leads</span>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <div className="flex flex-col">
                  {stages.map((s, i) => {
                      const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                      const Icon = s.icon;
                      return (
                          <button
                              key={i}
                              onClick={() => onNavigate(s.page)}
                              className={cn(
                                  'flex items-center justify-between p-3.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group',
                              )}
                          >
                              <div className="flex items-center gap-3">
                                  <div className={cn("p-2 rounded-lg border border-white/5", s.light)}>
                                      <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="text-left">
                                      <p className="text-xs font-bold dark:text-white uppercase tracking-wide group-hover:text-primary transition-colors">{s.label}</p>
                                      <p className="text-[10px] dark:text-slate-400 font-medium">{pct}% of pipeline</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <span className="text-xl font-extrabold dark:text-white">{s.value}</span>
                              </div>
                          </button>
                      );
                  })}
              </div>
          </CardContent>
      </Card>
  );
};
