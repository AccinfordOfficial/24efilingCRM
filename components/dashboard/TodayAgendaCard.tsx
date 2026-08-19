import React from 'react';
import { cn } from '../../lib/utils';
import { Lead, Task, Customer } from '../../types';
import { AlertTriangle, ArrowRight, CalendarIcon } from 'lucide-react';
import { Button } from '../ui/Button';

export interface AgendaData {
  todayFollowUps: Lead[];
  overdueFollowUps: Lead[];
  upcomingFollowUps: Lead[];
  todayTasks: Array<Task & { leadId: string; leadName: string }>;
  todayMeetings: Array<Task & { leadId: string; leadName: string }>;
  overdueTasks: Array<Task & { leadId: string; leadName: string }>;
  upcomingTasks: Array<Task & { leadId: string; leadName: string }>;
  totalPendingTasksCount: number;
  todayFollowUpsCount: number;
  overdueFollowUpsCount: number;
  upcomingFollowUpsCount: number;
  hotLeads: Lead[];
}

export interface TodayAgendaCardProps {
  agendaData: AgendaData;
  birthdayCustomers: Customer[];
  isWishSent: (c: Customer) => boolean;
  onSendWish: (c: Customer) => void;
  onViewLead?: (id: string) => void;
  onViewCustomer: (id: string) => void;
  onNavigate: (page: string) => void;
}

export const TodayAgendaCard: React.FC<TodayAgendaCardProps> = ({
  agendaData, birthdayCustomers, isWishSent, onSendWish, onViewLead, onViewCustomer, onNavigate
}) => {
  const overdueCount = agendaData.overdueFollowUps.length + agendaData.overdueTasks.length;
  const todayCount = agendaData.todayFollowUps.length + agendaData.todayTasks.length + agendaData.todayMeetings.length;

  // Build unified agenda items sorted by priority: overdue → today → birthdays
  const overdueItems = [
      ...agendaData.overdueFollowUps.map(l => ({
          id: l.id, leadId: l.id,
          title: l.business_name || `${l.first_name} ${l.last_name}`,
          subtitle: `Follow-up • ${l.service_requested || ''}`,
          date: l.next_follow_up!, priority: l.priority, kind: 'overdue' as const
      })),
      ...agendaData.overdueTasks.map(t => ({
          id: t.id, leadId: t.leadId,
          title: t.content, subtitle: `Task • ${t.leadName}`,
          date: t.due_date!, priority: t.priority, kind: 'overdue' as const
      }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const todayItems = [
      ...agendaData.todayFollowUps.map(l => ({
          id: l.id, leadId: l.id,
          title: l.business_name || `${l.first_name} ${l.last_name}`,
          subtitle: `Follow-up • ${l.service_requested || ''}`,
          time: l.next_follow_up, priority: l.priority, kind: 'followup' as const
      })),
      ...agendaData.todayTasks.map(t => ({
          id: t.id, leadId: t.leadId,
          title: t.content, subtitle: `Task • ${t.leadName}`,
          time: t.due_date, priority: t.priority, kind: 'task' as const
      })),
      ...agendaData.todayMeetings.map(t => ({
          id: t.id, leadId: t.leadId,
          title: t.content, subtitle: `Meeting • ${t.leadName}`,
          time: t.due_date, priority: t.priority, kind: 'meeting' as const
      })),
  ];

  const isEmpty = overdueItems.length === 0 && todayItems.length === 0 && birthdayCustomers.length === 0;

  return (
      <div className="glass-card rounded-2xl flex flex-col h-full border border-white/5">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 bg-white/5 rounded-t-2xl">
              <h2 className="text-sm font-bold dark:text-white flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                      {overdueCount > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />}
                      <span className={cn('relative inline-flex rounded-full h-2 w-2', overdueCount > 0 ? 'bg-red-500' : 'bg-emerald-400')} />
                  </span>
                  Today's Agenda
              </h2>
              <div className="flex gap-1.5">
                  {overdueCount > 0 && (
                      <span className="text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full">
                          {overdueCount} overdue
                      </span>
                  )}
                  <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                      {todayCount} today
                  </span>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 max-h-[420px]">
              {/* Birthdays */}
              {birthdayCustomers.length > 0 && (
                  <div className="mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-1.5 px-0.5">🎂 Birthdays Today</p>
                      {birthdayCustomers.map(c => {
                          const wished = isWishSent(c);
                          return (
                              <div key={c.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-violet-500/5 border border-violet-500/10 mb-1.5 animate-fade-in">
                                  <div className="min-w-0">
                                      <p className="text-xs font-bold text-violet-200 truncate">{c.name}</p>
                                      <p className="text-[10px] text-violet-400 truncate">{c.phone}</p>
                                  </div>
                                  <button
                                      onClick={() => wished ? onViewCustomer(c.id) : onSendWish(c)}
                                      className={cn(
                                          'flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors',
                                          wished
                                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                              : 'bg-slate-900 text-violet-300 border-violet-500/30 hover:bg-violet-500/20'
                                      )}
                                  >
                                      {wished ? '✓ Wished' : '💬 Send Wish'}
                                  </button>
                              </div>
                          );
                      })}
                  </div>
              )}

              {/* Overdue */}
              {overdueItems.length > 0 && (
                  <div className="mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1.5 px-0.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Overdue ({overdueItems.length})
                      </p>
                      {overdueItems.slice(0, 5).map(item => (
                          <button
                              key={item.id}
                              onClick={() => onViewLead && onViewLead(item.leadId)}
                              className="w-full text-left flex items-start gap-2.5 py-2 px-3 rounded-lg bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-colors mb-1.5 group"
                          >
                              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0 animate-pulse" />
                              <div className="min-w-0 flex-1">
                                   <p className="text-xs font-semibold dark:text-white truncate group-hover:text-rose-400">{item.title}</p>
                                  <p className="text-[10px] text-rose-400 font-medium truncate">{item.subtitle}</p>
                                  <p className="text-[9px] text-rose-500/70 mt-0.5">
                                      Due {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </p>
                              </div>
                              <ArrowRight className="h-3 w-3 text-rose-400/50 flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                      ))}
                  </div>
              )}

              {/* Today's items */}
              {todayItems.length > 0 && (
                  <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1.5 px-0.5 flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" /> Today ({todayItems.length})
                      </p>
                      {todayItems.slice(0, 8).map((item, i) => {
                          const kindColor = item.kind === 'meeting'
                              ? 'bg-indigo-500/5 border-indigo-500/10 text-indigo-300'
                              : item.kind === 'task'
                              ? 'bg-blue-500/5 border-blue-500/10 text-blue-300'
                              : 'bg-amber-500/5 border-amber-500/10 text-amber-300';
                          const dot = item.kind === 'meeting' ? 'bg-indigo-400' : item.kind === 'task' ? 'bg-blue-400' : 'bg-amber-400';
                          return (
                              <button
                                  key={`${item.id}-${i}`}
                                  onClick={() => onViewLead && onViewLead(item.leadId)}
                                  className={cn('w-full text-left flex items-start gap-2.5 py-2 px-3 rounded-lg border hover:bg-white/5 transition-all mb-1.5 group', kindColor)}
                              >
                                  <span className={cn('mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0', dot)} />
                                  <div className="min-w-0 flex-1">
                                       <p className="text-xs font-semibold dark:text-white truncate">{item.title}</p>
                                      <p className="text-[10px] font-medium truncate opacity-70">{item.subtitle}</p>
                                      {item.time && (
                                          <p className="text-[9px] opacity-60 mt-0.5">
                                              {new Date(item.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                      )}
                                  </div>
                                  <ArrowRight className="h-3 w-3 opacity-30 flex-shrink-0 mt-1 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" />
                              </button>
                          );
                      })}
                  </div>
              )}

              {isEmpty && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                      <span className="text-3xl mb-2">🎉</span>
                      <p className="text-sm font-bold dark:text-white">All caught up!</p>
                      <p className="text-xs dark:text-slate-400 mt-1">No tasks or follow-ups for today.</p>
                  </div>
              )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/5 px-4 py-2.5 flex gap-2 rounded-b-2xl bg-white/5">
              <Button variant="ghost" size="sm" onClick={() => onNavigate('Follow-ups')} className="flex-1 text-xs dark:text-slate-300 dark:hover:text-white hover:bg-white/5 h-7">
                  View Schedule
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('Activity Feed')} className="flex-1 text-xs dark:text-slate-300 dark:hover:text-white hover:bg-white/5 h-7">
                  Activity Feed
              </Button>
          </div>
      </div>
  );
};
