import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Eye, EyeOff, LayoutGrid, Check, Settings } from 'lucide-react';

export interface WidgetLayout {
  kpiStrip: boolean;
  analyticsChart: boolean;
  todayAgenda: boolean;
  branchPerformance: boolean;
  activityFeed: boolean;
  reminders: boolean;
  aiInsights: boolean;
}

const defaultLayout: WidgetLayout = {
  kpiStrip: true,
  analyticsChart: true,
  todayAgenda: true,
  branchPerformance: true,
  activityFeed: true,
  reminders: true,
  aiInsights: true
};

interface WidgetGridProps {
  userId: string;
  onLayoutChange: (layout: WidgetLayout) => void;
  isSuperAdmin: boolean;
}

export default function WidgetGrid({
  userId,
  onLayoutChange,
  isSuperAdmin
}: WidgetGridProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [layout, setLayout] = useState<WidgetLayout>(defaultLayout);

  // Load layout from localStorage
  useEffect(() => {
    const cached = localStorage.getItem(`dashboard_widget_layout_${userId}`);
    if (cached) {
      try {
        setLayout({ ...defaultLayout, ...JSON.parse(cached) });
      } catch (e) {
        console.warn('Failed to parse cached widget layout', e);
      }
    }
  }, [userId]);

  // Propagate updates
  useEffect(() => {
    onLayoutChange(layout);
  }, [layout, onLayoutChange]);

  const toggleWidget = (key: keyof WidgetLayout) => {
    const next = { ...layout, [key]: !layout[key] };
    setLayout(next);
    localStorage.setItem(`dashboard_widget_layout_${userId}`, JSON.stringify(next));
  };

  const resetLayout = () => {
    setLayout(defaultLayout);
    localStorage.setItem(`dashboard_widget_layout_${userId}`, JSON.stringify(defaultLayout));
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-900/40 border border-white/5 px-3 py-1.5 rounded-lg"
      >
        <LayoutGrid className="h-4 w-4 text-blue-400" />
        Customize Layout
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-950/95 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-xl z-50 text-slate-200 space-y-3.5">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
              <Settings className="h-3.5 w-3.5" /> Dashboard Widgets
            </h4>
            <button onClick={resetLayout} className="text-[10px] text-blue-400 font-bold hover:underline bg-transparent border-none cursor-pointer">
              Reset
            </button>
          </div>

          <div className="space-y-2">
            {[
              { key: 'kpiStrip', label: 'KPI Statistics Banner' },
              { key: 'analyticsChart', label: 'Business Chart' },
              { key: 'todayAgenda', label: 'Today\'s Agenda' },
              ...(isSuperAdmin ? [{ key: 'branchPerformance', label: 'Branch Analytics Table' }] : []),
              { key: 'activityFeed', label: 'Activity Logs Stream' },
              { key: 'reminders', label: 'Reminders Timeline' },
              { key: 'aiInsights', label: 'AI Predictive Insights' }
            ].map((widget) => {
              const visible = layout[widget.key as keyof WidgetLayout];
              return (
                <div
                  key={widget.key}
                  onClick={() => toggleWidget(widget.key as keyof WidgetLayout)}
                  className="flex justify-between items-center p-2 rounded bg-slate-900/30 border border-white/5 hover:bg-slate-900/50 cursor-pointer transition-all text-xs"
                >
                  <span className={visible ? 'text-slate-200' : 'text-slate-500 line-through'}>{widget.label}</span>
                  {visible ? (
                    <Eye className="h-4 w-4 text-blue-400" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-slate-600" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/5 pt-2 text-[10px] text-slate-500 text-center font-medium">
            Changes auto-saved locally.
          </div>
        </div>
      )}
    </div>
  );
}
