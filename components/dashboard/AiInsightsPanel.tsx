import React, { useState } from 'react';
import { Activity, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AiInsight {
  type: 'success' | 'warning' | 'danger' | 'info';
  category: string;
  title: string;
  description: string;
}

export const AiInsightsPanel: React.FC<{ insights: AiInsight[] }> = ({ insights }) => {
  const [open, setOpen] = useState(true);
  return (
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl shadow-md overflow-hidden border border-slate-800">
          <button
              onClick={() => setOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors"
          >
              <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                      <Activity className="h-4 w-4 text-indigo-400 animate-pulse" />
                  </div>
                  <div className="text-left">
                      <p className="text-sm font-bold text-white">AI Business Diagnostics</p>
                      <p className="text-[10px] text-slate-400">{insights.length} insight{insights.length !== 1 ? 's' : ''} available</p>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                      Cognitive v1.2
                  </span>
                  {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </div>
          </button>

          {open && (
              <div className="px-4 pb-4 space-y-2 border-t border-slate-800/60 pt-3">
                  {insights.map((ins, idx) => {
                      const badgeColor = ins.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : ins.type === 'warning' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          : ins.type === 'danger' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                          : 'bg-blue-500/10 text-blue-300 border-blue-500/20';
                      const dot = ins.type === 'success' ? 'bg-emerald-400' : ins.type === 'warning' ? 'bg-amber-400' : ins.type === 'danger' ? 'bg-rose-400' : 'bg-blue-400';
                      return (
                          <div key={idx} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                  <span className={cn('text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border', badgeColor)}>{ins.category}</span>
                              </div>
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                  <span className={cn('inline-block w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
                                  {ins.title}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed pl-3">{ins.description}</p>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>
  );
};
