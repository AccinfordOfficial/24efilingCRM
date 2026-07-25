import React, { useMemo } from 'react';
import { Lead, Task } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { ClockIcon, CalendarIcon, CheckCircleIcon } from '../components/icons';
import { Button } from '../components/ui/Button';
import { Popover } from '../components/ui/Popover';
import { Calendar } from '../components/ui/Calendar';

interface FollowUpsProps {
    leads: Lead[];
    users?: any[];
    currentUser?: any;
    dateRange?: { from?: string; to?: string };
    setDateRange?: (value: React.SetStateAction<{ from: string; to: string; }>) => void;
    onViewLead?: (leadId: string) => void;
    onUpdateLead?: (lead: Lead) => Promise<void>;
    onAddActivity?: (leadId: string, activity: any) => Promise<void>;
}

interface FollowUpItem {
    id: string;
    type: 'General Follow-up' | 'Task';
    title: string;
    subtitle: string;
    date: Date;
    priority: string;
    priorityColor: string;
    leadId: string;
}

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
        case 'High':
        case 'Hot':
            return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
        case 'Medium':
        case 'Warm':
            return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        case 'Low':
        case 'Cold':
            return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        default:
            return 'text-slate-400 bg-slate-800 border-white/10';
    }
};

const FollowUps: React.FC<FollowUpsProps & { onUpdateTask?: (leadId: string, task: Task) => void; onUpdateLead?: (lead: Lead) => void; }> = ({ 
    leads = [], 
    dateRange, 
    setDateRange, 
    onViewLead, 
    onUpdateTask, 
    onUpdateLead 
}) => {

    const handleComplete = (item: FollowUpItem) => {
        const lead = leads.find(l => l.id === item.leadId);
        if (!lead) return;

        if (item.type === 'Task' && onUpdateTask) {
            const taskId = item.id.replace('task-', '');
            const task = lead.tasks?.find(t => t.id === taskId);
            if (task) {
                onUpdateTask(lead.id, { ...task, is_completed: true, completed_at: new Date().toISOString() });
            }
        } else if (onUpdateLead) {
            onUpdateLead({ ...lead, next_follow_up: undefined });
        }
    };

    // Aggregate all follow-up items
    const allItems = useMemo(() => {
        const items: FollowUpItem[] = [];
        (leads || []).forEach(lead => {
            // 1. General Lead Follow-up
            if (lead.next_follow_up && lead.status !== 'Success' && lead.status !== 'Lost') {
                items.push({
                    id: `lead-fu-${lead.id}`,
                    type: 'General Follow-up',
                    title: lead.business_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Untitled Lead',
                    subtitle: 'General Lead Follow-up',
                    date: new Date(lead.next_follow_up),
                    priority: lead.priority || 'Medium',
                    priorityColor: getPriorityBadgeStyle(lead.priority || 'Medium'),
                    leadId: lead.id
                });
            }

            // 2. Individual Tasks
            if (lead.tasks && lead.tasks.length > 0) {
                lead.tasks.forEach(task => {
                    if (task.due_date && !task.is_completed) {
                        items.push({
                            id: `task-${task.id}`,
                            type: 'Task',
                            title: task.content,
                            subtitle: `${lead.business_name || 'Lead'} • Assigned by ${task.created_by?.name || 'System'}`,
                            date: new Date(task.due_date),
                            priority: task.priority || 'Medium',
                            priorityColor: getPriorityBadgeStyle(task.priority || 'Medium'),
                            leadId: lead.id
                        });
                    }
                });
            }
        });

        return items.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [leads]);

    const { overdue, today, upcoming } = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const overdue: FollowUpItem[] = [];
        const todayItems: FollowUpItem[] = [];
        const upcoming: FollowUpItem[] = [];

        allItems.forEach(item => {
            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);

            if (itemDate < now) {
                overdue.push(item);
            } else if (itemDate.getTime() === now.getTime()) {
                todayItems.push(item);
            } else {
                upcoming.push(item);
            }
        });

        return { overdue, today: todayItems, upcoming };
    }, [allItems]);

    // Apply main date filter if selected
    const filterByRange = (items: FollowUpItem[]) => {
        if (!dateRange || !dateRange.from) return items;
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        toDate.setHours(23, 59, 59, 999);

        return items.filter(item => {
            const d = new Date(item.date);
            return d >= fromDate && d <= toDate;
        });
    };

    const filteredOverdue = filterByRange(overdue);
    const filteredToday = filterByRange(today);
    const filteredUpcoming = filterByRange(upcoming);

    const FollowUpList: React.FC<{ 
        title: string; 
        items: FollowUpItem[]; 
        badgeBg: string; 
        badgeText: string;
        headerBorder: string;
        emptyMessage: string;
    }> = ({ title, items, badgeBg, badgeText, headerBorder, emptyMessage }) => (
        <div className="flex flex-col h-full bg-slate-900/40 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
            <div className={`flex items-center justify-between pb-3 mb-3 border-b ${headerBorder}`}>
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${badgeBg}`}>
                        <ClockIcon className={`h-4 w-4 ${badgeText}`} />
                    </div>
                    <h2 className="text-base font-bold text-white tracking-wide">{title}</h2>
                </div>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${badgeBg} ${badgeText}`}>
                    {items.length}
                </span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {items.length > 0 ? items.map(item => (
                    <Card 
                        key={item.id} 
                        className="bg-slate-900/80 border border-white/10 hover:border-blue-500/50 hover:shadow-xl transition-all duration-200 cursor-pointer group rounded-xl overflow-hidden" 
                        onClick={() => onViewLead && onViewLead(item.leadId)}
                    >
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <h4 className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors text-sm leading-snug">{item.title}</h4>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">{item.subtitle}</p>
                                </div>
                                <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${item.priorityColor}`}>
                                    {item.priority}
                                </span>
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
                                    item.type === 'Task' 
                                        ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
                                        : 'text-slate-300 bg-slate-800/60 border-white/10'
                                }`}>
                                    {item.type === 'Task' ? <CheckCircleIcon className="h-3.5 w-3.5" /> : <CalendarIcon className="h-3.5 w-3.5" />}
                                    {item.type}
                                </span>
                                <div className="flex items-center gap-2">
                                     <span className="text-[11px] font-medium text-slate-400">
                                        Due: {item.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                        {item.date.getHours() !== 0 || item.date.getMinutes() !== 0 ? ` at ${item.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                    </span>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-7 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleComplete(item);
                                        }}
                                    >
                                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                                        Complete
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )) : (
                    <div className="flex flex-col items-center justify-center p-8 bg-slate-950/40 rounded-xl border border-dashed border-white/10 text-center h-36">
                        <p className="text-xs text-slate-400 font-medium">{emptyMessage}</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Follow-ups & Reminders</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage your upcoming follow-ups and lead tasks in one place.</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                    <Popover
                        align="end"
                        trigger={
                            <Button variant="outline" className="w-auto sm:w-[280px] justify-start text-left font-semibold gap-2 bg-slate-900/80 border-white/10 text-slate-200 shadow-md hover:bg-slate-800">
                                <CalendarIcon className="h-4 w-4 text-blue-400" />
                                <span className="hidden sm:inline">
                                    {dateRange && dateRange.from ? (
                                        dateRange.to ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}` : `${formatDate(dateRange.from)}`
                                    ) : (
                                        <span className="text-slate-400">Filter by Date</span>
                                    )}
                                </span>
                                <span className="sm:hidden">Dates</span>
                            </Button>
                        }
                        content={<Calendar dateRange={dateRange || { from: '', to: '' }} onDateChange={setDateRange} />}
                    />
                    {dateRange && (dateRange.from || dateRange.to) && setDateRange && (
                        <Button variant="ghost" size="sm" onClick={() => setDateRange({ from: '', to: '' })} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                            Clear
                        </Button>
                    )}
                </div>
            </header>

            {/* Context Alert Banner */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 flex items-center gap-3 text-xs font-medium text-blue-300 shrink-0">
                <div className="bg-blue-500/20 p-1.5 rounded-lg shrink-0 text-blue-400">
                    <CalendarIcon className="h-4 w-4" />
                </div>
                <p>
                    Showing <strong className="text-white">General Follow-ups</strong> (set in Lead Edit) and <strong className="text-white">Tasks</strong> (created in Lead Detail).
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 flex-1 min-h-0">
                <FollowUpList 
                    title="Overdue" 
                    items={filteredOverdue} 
                    badgeBg="bg-rose-500/10 border-rose-500/20"
                    badgeText="text-rose-400"
                    headerBorder="border-rose-500/20"
                    emptyMessage="No overdue items! Great job." 
                />
                <FollowUpList 
                    title="Today" 
                    items={filteredToday} 
                    badgeBg="bg-amber-500/10 border-amber-500/20"
                    badgeText="text-amber-400"
                    headerBorder="border-amber-500/20"
                    emptyMessage="Nothing scheduled for today." 
                />
                <FollowUpList 
                    title="Upcoming" 
                    items={filteredUpcoming} 
                    badgeBg="bg-blue-500/10 border-blue-500/20"
                    badgeText="text-blue-400"
                    headerBorder="border-blue-500/20"
                    emptyMessage="No upcoming items scheduled." 
                />
            </div>
        </div>
    );
};

export default FollowUps;
