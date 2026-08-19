import React from 'react';
import { User } from '../../types';

interface DashboardGreetingProps {
  currentUser: User;
  overdueCount: number;
  todayAgendaCount: number;
  activeUsersCount: number;
  onNavigate: (page: string) => void;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const DashboardGreeting: React.FC<DashboardGreetingProps> = ({
  currentUser,
  overdueCount,
  todayAgendaCount,
  activeUsersCount,
}) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="glass-card rounded-2xl border border-white/5 p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="relative z-10">
        <h1 className="text-2xl font-extrabold text-white mb-1">
          {getGreeting()}, {currentUser.name?.split(' ')[0]}!
        </h1>
        <p className="text-sm font-medium text-slate-400">{currentDate}</p>
      </div>

      <div className="relative z-10 flex flex-wrap items-center gap-3">
        {/* Active Users Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-bold">{activeUsersCount} Active</span>
        </div>

        {/* Overdue Badge */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span className="text-xs font-bold">{overdueCount} Overdue</span>
          </div>
        )}

        {/* Today's Agenda Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-xs font-bold">{todayAgendaCount} Today's Agenda</span>
        </div>
      </div>

      {/* Subtle Gradient Accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/80 via-indigo-500/80 to-blue-500/80" />
    </div>
  );
};
