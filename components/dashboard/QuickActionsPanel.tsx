import React from 'react';
import { cn } from '../../lib/utils';
import { Zap } from 'lucide-react';

export interface QuickAction {
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bg: string;
  onClick: () => void;
}

export const QuickActionsPanel: React.FC<{ actions: QuickAction[] }> = ({ actions }) => (
  <div className="glass-card border border-white/5 rounded-2xl shadow-sm p-4">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-yellow-500" /> Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-2">
          {actions.map((a, i) => {
              const Icon = a.icon;
              return (
                  <button
                      key={i}
                      onClick={a.onClick}
                      className={cn(
                          'flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/60 hover:border-white/10 hover:shadow-md transition-all duration-200 group text-center',
                      )}
                  >
                      <div className={cn('p-2 rounded-lg bg-white/5 text-primary-foreground border border-white/10')}>
                          <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-xs font-semibold text-slate-200">{a.label}</span>
                  </button>
              );
          })}
      </div>
  </div>
);
