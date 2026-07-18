import React, { useMemo, useState } from 'react';
import { Lead, UserActivity, User, LeadStatus, Customer, UserRole, Service, Testimonial, Task, Branch, City } from '../types';
import { useGlobalFilter } from '../contexts/GlobalFilterContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Popover } from '../components/ui/Popover';
import { Calendar } from '../components/ui/Calendar';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Select } from '../components/ui/Select';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import {
    Calendar as CalendarIcon,
    TrendingUp,
    Users,
    DollarSign,
    Activity,
    CreditCard,
    Phone,
    Search,
    ArrowUpRight,
    ArrowRight,
    Briefcase,
    PlusCircle,
    Gift,
    MessageCircle,
    CheckCircle2,
    Clock,
    Building,
    IndianRupee,
    UserPlus,
    RefreshCw,
    Star,
    XCircle,
    Play,
    Heart,
    Filter,
    ChevronDown,
    ChevronUp,
    FileSpreadsheet,
    FileText,
    Download,
    AlertTriangle,
    Flame,
    Bell,
    BarChart2,
    LayoutDashboard,
    Zap,
    TrendingDown,
    ArrowDownRight
} from 'lucide-react';
import { BUSINESS_CATEGORIES, INDUSTRY_TYPES } from '../constants';
import { cn, formatCurrency, formatDate, timeAgo } from '../lib/utils';

// --- UTILS ---

const getLocalDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getPresetRange = (preset: string) => {
    const today = new Date();
    switch (preset) {
        case 'today': { const dateStr = getLocalDateString(today); return { from: dateStr, to: dateStr }; }
        case 'yesterday': { const yesterday = new Date(); yesterday.setDate(today.getDate() - 1); const dateStr = getLocalDateString(yesterday); return { from: dateStr, to: dateStr }; }
        case 'last_7_days': { const fromDate = new Date(); fromDate.setDate(today.getDate() - 6); return { from: getLocalDateString(fromDate), to: getLocalDateString(today) }; }
        case 'last_15_days': { const fromDate = new Date(); fromDate.setDate(today.getDate() - 14); return { from: getLocalDateString(fromDate), to: getLocalDateString(today) }; }
        case 'last_30_days': { const fromDate = new Date(); fromDate.setDate(today.getDate() - 29); return { from: getLocalDateString(fromDate), to: getLocalDateString(today) }; }
        case 'this_week': { const day = today.getDay(); const diff = today.getDate() - day + (day === 0 ? -6 : 1); const fromDate = new Date(today.setDate(diff)); return { from: getLocalDateString(fromDate), to: getLocalDateString(new Date()) }; }
        case 'last_week': { const temp = new Date(); const day = temp.getDay(); const diff = temp.getDate() - day + (day === 0 ? -6 : 1); const mondayThisWeek = new Date(temp.setDate(diff)); const fromDate = new Date(mondayThisWeek); fromDate.setDate(mondayThisWeek.getDate() - 7); const toDate = new Date(mondayThisWeek); toDate.setDate(mondayThisWeek.getDate() - 1); return { from: getLocalDateString(fromDate), to: getLocalDateString(toDate) }; }
        case 'this_month': { const fromDate = new Date(today.getFullYear(), today.getMonth(), 1); return { from: getLocalDateString(fromDate), to: getLocalDateString(today) }; }
        case 'last_month': { const fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); const toDate = new Date(today.getFullYear(), today.getMonth(), 0); return { from: getLocalDateString(fromDate), to: getLocalDateString(toDate) }; }
        case 'this_quarter': { const quarter = Math.floor(today.getMonth() / 3); const fromDate = new Date(today.getFullYear(), quarter * 3, 1); return { from: getLocalDateString(fromDate), to: getLocalDateString(today) }; }
        case 'last_quarter': { const currentQuarter = Math.floor(today.getMonth() / 3); const targetQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1; const targetYear = currentQuarter === 0 ? today.getFullYear() - 1 : today.getFullYear(); const fromDate = new Date(targetYear, targetQuarter * 3, 1); const toDate = new Date(targetYear, (targetQuarter + 1) * 3, 0); return { from: getLocalDateString(fromDate), to: getLocalDateString(toDate) }; }
        case 'this_year': { const fromDate = new Date(today.getFullYear(), 0, 1); return { from: getLocalDateString(fromDate), to: getLocalDateString(today) }; }
        case 'last_year': { const fromDate = new Date(today.getFullYear() - 1, 0, 1); const toDate = new Date(today.getFullYear() - 1, 11, 31); return { from: getLocalDateString(fromDate), to: getLocalDateString(toDate) }; }
        case 'all':
        default: return { from: '', to: '' };
    }
};
// --- GREET BY TIME ---
const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg text-sm z-50">
                <p className="font-semibold text-slate-800 mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                        <span className="text-slate-500 capitalize">{entry.name}:</span>
                        <span className="font-medium text-slate-900">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// ── COLORFUL KPI GRID ─────────────────────────────────────────────────────────
interface ColorfulKpiCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.FC<{ className?: string }>;
    gradient: string;
    onClick?: () => void;
    large?: boolean;
}

const ColorfulKpiCard: React.FC<ColorfulKpiCardProps> = ({ title, value, subtitle, icon: Icon, gradient, onClick, large }) => (
    <button
        onClick={onClick}
        disabled={!onClick}
        className={cn(
            "relative overflow-hidden rounded-xl bg-white border border-slate-200 p-5 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group",
            !onClick && "cursor-default hover:shadow-sm hover:translate-y-0"
        )}
    >
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
                    {subtitle && <p className="text-xs font-medium text-slate-400">{subtitle}</p>}
                </div>
                {Icon && (
                    <div className={cn("p-2.5 rounded-lg flex-shrink-0 transition-colors", gradient.replace('bg-gradient-to-br', 'bg-gradient-to-br').replace('from-', 'from-').replace('to-', 'to-').includes('emerald') ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : gradient.includes('blue') ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' : gradient.includes('rose') || gradient.includes('red') || gradient.includes('pink') ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' : gradient.includes('amber') || gradient.includes('orange') ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' : gradient.includes('violet') || gradient.includes('purple') ? 'bg-violet-50 text-violet-600 group-hover:bg-violet-100' : 'bg-slate-50 text-slate-600 group-hover:bg-slate-100')}>
                        <Icon className="h-5 w-5" />
                    </div>
                )}
            </div>
            <div>
                <p className={cn("font-bold text-slate-900 leading-tight", large ? "text-3xl" : "text-2xl")}>{value}</p>
            </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundImage: `var(--tw-gradient-stops)` }} />
    </button>
);

// ── PIPELINE FUNNEL STRIP ────────────────────────────────────────────────────
interface PipelineFunnelProps {
    pending: number;
    inProgress: number;
    won: number;
    lost: number;
    total: number;
    onNavigate: (page: string) => void;
}

const PipelineFunnel: React.FC<PipelineFunnelProps> = ({ pending, inProgress, won, lost, total, onNavigate }) => {
    const stages = [
        { label: 'Pending', value: pending, color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700', icon: Clock, page: 'Lead Workflow' },
        { label: 'In Progress', value: inProgress, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700', icon: Play, page: 'Lead Workflow' },
        { label: 'Converted', value: won, color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2, page: 'Customers' },
        { label: 'Lost', value: lost, color: 'bg-slate-400', light: 'bg-slate-100 text-slate-700', icon: XCircle, page: 'All Leads' },
    ];
    return (
        <Card className="shadow-sm border border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-slate-400" /> Pipeline Overview
                    </CardTitle>
                    <span className="text-xs font-semibold text-slate-500">{total} Total Leads</span>
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
                                    'flex items-center justify-between p-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group',
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-lg", s.light)}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide group-hover:text-blue-600 transition-colors">{s.label}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{pct}% of pipeline</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-extrabold text-slate-900">{s.value}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

// ── TODAY'S AGENDA CARD ───────────────────────────────────────────────────────
interface AgendaData {
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

interface TodayAgendaCardProps {
    agendaData: AgendaData;
    birthdayCustomers: Customer[];
    isWishSent: (c: Customer) => boolean;
    onSendWish: (c: Customer) => void;
    onViewLead?: (id: string) => void;
    onViewCustomer: (id: string) => void;
    onNavigate: (page: string) => void;
}

const TodayAgendaCard: React.FC<TodayAgendaCardProps> = ({
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
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        {overdueCount > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />}
                        <span className={cn('relative inline-flex rounded-full h-2 w-2', overdueCount > 0 ? 'bg-red-500' : 'bg-emerald-400')} />
                    </span>
                    Today's Agenda
                </h2>
                <div className="flex gap-1.5">
                    {overdueCount > 0 && (
                        <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                            {overdueCount} overdue
                        </span>
                    )}
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                        {todayCount} today
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 max-h-[420px]">
                {/* Birthdays */}
                {birthdayCustomers.length > 0 && (
                    <div className="mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500 mb-1.5 px-0.5">🎂 Birthdays Today</p>
                        {birthdayCustomers.map(c => {
                            const wished = isWishSent(c);
                            return (
                                <div key={c.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-violet-50 border border-violet-100 mb-1.5">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-violet-900 truncate">{c.name}</p>
                                        <p className="text-[10px] text-violet-500 truncate">{c.phone}</p>
                                    </div>
                                    <button
                                        onClick={() => wished ? onViewCustomer(c.id) : onSendWish(c)}
                                        className={cn(
                                            'flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors',
                                            wished
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-white text-violet-700 border-violet-300 hover:bg-violet-100'
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
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1.5 px-0.5 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Overdue ({overdueItems.length})
                        </p>
                        {overdueItems.slice(0, 5).map(item => (
                            <button
                                key={item.id}
                                onClick={() => onViewLead && onViewLead(item.leadId)}
                                className="w-full text-left flex items-start gap-2.5 py-2 px-3 rounded-lg bg-red-50/70 border border-red-100 hover:bg-red-50 transition-colors mb-1.5 group"
                            >
                                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-red-700">{item.title}</p>
                                    <p className="text-[10px] text-red-500 font-medium truncate">{item.subtitle}</p>
                                    <p className="text-[9px] text-red-400 mt-0.5">
                                        Due {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </p>
                                </div>
                                <ArrowRight className="h-3 w-3 text-red-300 flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Today's items */}
                {todayItems.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1.5 px-0.5 flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" /> Today ({todayItems.length})
                        </p>
                        {todayItems.slice(0, 8).map((item, i) => {
                            const kindColor = item.kind === 'meeting'
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-500'
                                : item.kind === 'task'
                                ? 'bg-blue-50 border-blue-100 text-blue-500'
                                : 'bg-amber-50 border-amber-100 text-amber-600';
                            const dot = item.kind === 'meeting' ? 'bg-indigo-400' : item.kind === 'task' ? 'bg-blue-400' : 'bg-amber-400';
                            return (
                                <button
                                    key={`${item.id}-${i}`}
                                    onClick={() => onViewLead && onViewLead(item.leadId)}
                                    className={cn('w-full text-left flex items-start gap-2.5 py-2 px-3 rounded-lg border hover:opacity-90 transition-all mb-1.5 group', kindColor)}
                                >
                                    <span className={cn('mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0', dot)} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
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
                        <p className="text-sm font-bold text-slate-700">All caught up!</p>
                        <p className="text-xs text-slate-400 mt-1">No tasks or follow-ups for today.</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-4 py-2.5 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onNavigate('Follow-ups')} className="flex-1 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 h-7">
                    View Schedule
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('Activity Feed')} className="flex-1 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 h-7">
                    Activity Feed
                </Button>
            </div>
        </div>
    );
};

// ── QUICK ACTIONS PANEL ───────────────────────────────────────────────────────
interface QuickAction { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string; onClick: () => void; }

const QuickActionsPanel: React.FC<{ actions: QuickAction[] }> = ({ actions }) => (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
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
                            'flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border hover:shadow-md transition-all duration-200 group text-center',
                            a.bg
                        )}
                    >
                        <div className={cn('p-2 rounded-lg', a.color)}>
                            <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{a.label}</span>
                    </button>
                );
            })}
        </div>
    </div>
);

// ── AI INSIGHTS PANEL (collapsible) ──────────────────────────────────────────
interface AiInsight { type: 'success' | 'warning' | 'danger' | 'info'; category: string; title: string; description: string; }

const AiInsightsPanel: React.FC<{ insights: AiInsight[] }> = ({ insights }) => {
    const [open, setOpen] = useState(false);
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardOverviewProps {
    leads: Lead[];
    users: User[];
    customers: Customer[];
    branches: Branch[];
    cities?: City[];
    userActivities: UserActivity[];
    currentUser: User;
    dateRange: { from: string; to: string };
    setDateRange: (range: { from: string; to: string }) => void;
    onViewCustomer: (customerId: string) => void;
    onViewLead?: (leadId: string) => void;
    onNavigate: (page: string) => void;
    services: Service[];
    onAddActivityToLead?: (leadId: string, activityData: any) => Promise<void>;
    refreshData?: () => Promise<void>;
    testimonials: Testimonial[];
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    leads, users, customers, branches, cities = [], userActivities, currentUser, dateRange: propDateRange, setDateRange: propSetDateRange,
    onViewCustomer, onViewLead,
    onNavigate, services, onAddActivityToLead, refreshData, testimonials
}) => {
    const {
        cityId: cityFilter,
        branchId: branchFilter,
        adminId: managerFilter,
        employeeId: employeeFilter,
        dateRange: globalDateRange,
    } = useGlobalFilter();

    const dateRange = useMemo(() => {
        return {
            from: globalDateRange.from ? getLocalDateString(globalDateRange.from) : '',
            to: globalDateRange.to ? getLocalDateString(globalDateRange.to) : ''
        };
    }, [globalDateRange]);

    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const [serviceFilter, setServiceFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [industryFilter, setIndustryFilter] = useState('All');
    const [activeDashboardTab, setActiveDashboardTab] = useState('Overview');
    
    const [activeChartTab, setActiveChartTab] = useState<'leads' | 'revenue' | 'services'>('leads');
    const [comparisonMode, setComparisonMode] = useState<'none' | 'previous_period' | 'last_month' | 'last_year'>('none');
    const [exportOpen, setExportOpen] = useState(false);

    // ── ROLE FLAGS ──────────────────────────────────────────────────────────
    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
    const isAdminRole = currentUser.role === UserRole.ADMIN;
    const isSalesExec = currentUser.role === UserRole.SALES_EXECUTIVE;
    const isAdmin = isSuperAdmin || isAdminRole;

    // ── FILTER OPTIONS ──────────────────────────────────────────────────────
    const serviceOptions = useMemo(() => {
        const allSubServices = (services || []).flatMap(s => s.sub_services || []).map(sub => sub.name);
        const uniqueSubServices = Array.from(new Set(allSubServices));
        return [{ value: 'All', label: 'All Services' }, ...uniqueSubServices.map(s => ({ value: s, label: s }))];
    }, [services]);

    const cityOptions = useMemo(() => {
        const uniqueCities = Array.from(new Set([
            ...(branches || []).map(b => b.city_name),
            ...(leads || []).map(l => l.city_name),
            ...(users || []).map(u => u.city_name)
        ].filter(Boolean) as string[]));
        return [{ value: 'All Cities', label: 'All Cities' }, ...uniqueCities.map(c => ({ value: c, label: c }))];
    }, [branches, leads, users]);

    const branchOptions = useMemo(() => {
        let validBranches = branches || [];
        if (cityFilter !== 'All Cities') validBranches = validBranches.filter(b => b.city_name === cityFilter);
        return [{ value: 'All Branches', label: 'All Branches' }, ...validBranches.map(b => ({ value: b.id, label: b.name }))];
    }, [branches, cityFilter]);

    const managerOptions = useMemo(() => {
        const managers = (users || []).filter(u => u.role === UserRole.BRANCH_MANAGER || u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN);
        return [{ value: 'All Managers', label: 'All Managers' }, ...managers.map(u => ({ value: u.id, label: u.name }))];
    }, [users]);

    const employeeOptions = useMemo(() => {
        let emps = users || [];
        if (branchFilter !== 'All Branches') emps = emps.filter(u => u.branch_id === branchFilter);
        else if (cityFilter !== 'All Cities') emps = emps.filter(u => u.city_name === cityFilter);
        return [{ value: 'All Employees', label: 'All Employees' }, ...emps.map(u => ({ value: u.id, label: u.name }))];
    }, [users, branchFilter, cityFilter]);

    // ── PRESET DETECTION ───────────────────────────────────────────────────
    const activePreset = useMemo(() => {
        const { from, to } = dateRange;
        if (!from && !to) return 'all';
        const presets = ['today','yesterday','last_7_days','last_15_days','last_30_days','this_week','last_week','this_month','last_month','this_quarter','last_quarter','this_year','last_year'];
        for (const p of presets) {
            const range = getPresetRange(p);
            if (range.from === from && range.to === to) return p;
        }
        return 'custom';
    }, [dateRange]);

    const checkLeadFilters = (lead: Lead) => {
        const serviceMatch = serviceFilter === 'All' || (lead.service_requested && lead.service_requested.includes(serviceFilter));
        const empMatch = employeeFilter === 'All Employees' ? true : lead.assigned_to?.id === employeeFilter;
        let branchMatch = true;
        if (branchFilter !== 'All Branches') {
            branchMatch = (lead as any).branch_id === branchFilter || (lead as any).branch_name === branchFilter || (lead.assigned_to && ((lead.assigned_to as any).branch_id === branchFilter || (lead.assigned_to as any).branch_name === branchFilter)) || false;
        }
        let cityMatch = true;
        if (cityFilter !== 'All Cities') {
            cityMatch = (lead as any).city_id === cityFilter || (lead as any).city_name === cityFilter || (lead.assigned_to && ((lead.assigned_to as any).city_id === cityFilter || (lead.assigned_to as any).city_name === cityFilter)) || false;
        }
        let managerMatch = true;
        if (managerFilter !== 'All Managers') {
            const managerUser = users.find(u => u.id === managerFilter);
            if (managerUser && managerUser.branch_id) {
                managerMatch = lead.branch_id === managerUser.branch_id || (lead.assigned_to && lead.assigned_to.branch_id === managerUser.branch_id) || false;
            }
        }
        const categoryMatch = categoryFilter === 'All' || lead.business_category === categoryFilter;
        const industryMatch = industryFilter === 'All' || lead.industry_type === industryFilter;
        return serviceMatch && empMatch && branchMatch && cityMatch && managerMatch && categoryMatch && industryMatch;
    };

    // ── FILTERED LEADS ─────────────────────────────────────────────────────
    const filteredLeads = useMemo(() => {
        const { from, to } = dateRange;
        const fromDate = from ? new Date(`${from}T00:00:00`) : null;
        const toDate = to ? new Date(`${to}T23:59:59.999`) : null;
        return leads.filter(lead => {
            const createdAt = new Date(lead.created_at);
            const dateMatch = (!fromDate || createdAt >= fromDate) && (!toDate || createdAt <= toDate);
            return checkLeadFilters(lead) && dateMatch;
        });
    }, [leads, serviceFilter, categoryFilter, industryFilter, employeeFilter, branchFilter, cityFilter, managerFilter, dateRange, users]);

    const filteredActivities = useMemo(() => {
        let acts = userActivities || [];
        const { from, to } = dateRange;
        if (from || to) {
            const fromDate = from ? new Date(`${from}T00:00:00`) : null;
            const toDate = to ? new Date(`${to}T23:59:59.999`) : null;
            acts = acts.filter(a => {
                const d = new Date(a.timestamp);
                if (fromDate && d < fromDate) return false;
                if (toDate && d > toDate) return false;
                return true;
            });
        }
        if (employeeFilter !== 'All Employees') return acts.filter(a => a.user_id === employeeFilter);
        return acts;
    }, [userActivities, employeeFilter, dateRange]);

    // ── SCOPED LEADS (SE) ──────────────────────────────────────────────────
    const myLeads = useMemo(() => {
        if (!isSalesExec) return leads;
        return leads.filter(l => l.assigned_to?.id === currentUser.id);
    }, [leads, isSalesExec, currentUser.id]);

    const myCustomers = useMemo(() => customers.filter(c => c.assigned_to?.id === currentUser.id), [customers, currentUser.id]);

    // ── COMPARISON ─────────────────────────────────────────────────────────
    const getComparisonRange = (from: string, to: string, mode: 'none' | 'previous_period' | 'last_month' | 'last_year') => {
        if (mode === 'none' || !from || !to) return { from: '', to: '' };
        const fromDate = new Date(`${from}T00:00:00`);
        const toDate = new Date(`${to}T23:59:59.999`);
        switch (mode) {
            case 'previous_period': { const diffTime = toDate.getTime() - fromDate.getTime(); const compToDate = new Date(fromDate.getTime() - 1); const compFromDate = new Date(compToDate.getTime() - diffTime); return { from: getLocalDateString(compFromDate), to: getLocalDateString(compToDate) }; }
            case 'last_month': { const cf = new Date(fromDate); cf.setMonth(cf.getMonth() - 1); const ct = new Date(toDate); ct.setMonth(ct.getMonth() - 1); return { from: getLocalDateString(cf), to: getLocalDateString(ct) }; }
            case 'last_year': { const cf = new Date(fromDate); cf.setFullYear(cf.getFullYear() - 1); const ct = new Date(toDate); ct.setFullYear(ct.getFullYear() - 1); return { from: getLocalDateString(cf), to: getLocalDateString(ct) }; }
            default: return { from: '', to: '' };
        }
    };

    const comparisonRange = useMemo(() => getComparisonRange(dateRange.from, dateRange.to, comparisonMode), [dateRange, comparisonMode]);

    const calculatePeriodMetrics = (targetLeads: Lead[], targetCustomers: Customer[], fromStr: string, toStr: string) => {
        const fromDate = fromStr ? new Date(`${fromStr}T00:00:00`) : null;
        const toDate = toStr ? new Date(`${toStr}T23:59:59.999`) : null;
        const filtered = targetLeads.filter(lead => {
            const createdAt = new Date(lead.created_at);
            const dateMatch = (!fromDate || createdAt >= fromDate) && (!toDate || createdAt <= toDate);
            return checkLeadFilters(lead) && dateMatch;
        });
        const totalLeadsCount = filtered.length;
        const convertedCount = filtered.filter(l => l.status === LeadStatus.SUCCESS).length;
        const convRate = totalLeadsCount > 0 ? (convertedCount / totalLeadsCount) * 100 : 0;
        const revenue = targetLeads.reduce((sum, lead) => {
            if (!checkLeadFilters(lead)) return sum;
            const payments = lead.payments || [];
            return sum + payments.reduce((pSum, p) => {
                if (!p.date) return pSum;
                const pd = new Date(p.date);
                if (fromDate && pd < fromDate) return pSum;
                if (toDate && pd > toDate) return pSum;
                return pSum + (p.amount || 0);
            }, 0);
        }, 0);
        const enrolledCustomers = targetCustomers.filter(c => {
            const lead = targetLeads.find(l => l.id === c.lead_id);
            if (lead && !checkLeadFilters(lead)) return false;
            if (!c.created_at) return false;
            const cd = new Date(c.created_at);
            if (fromDate && cd < fromDate) return false;
            if (toDate && cd > toDate) return false;
            return true;
        }).length;
        const outstanding = filtered.reduce((sum, l) => sum + (l.remaining_amount || 0), 0);
        let tasksDone = 0;
        filtered.forEach(l => { if (l.tasks) l.tasks.forEach(t => { if (t.is_completed && t.completed_at) { const cd = new Date(t.completed_at); if ((!fromDate || cd >= fromDate) && (!toDate || cd <= toDate)) tasksDone++; } }); });
        return { leads: totalLeadsCount, converted: convertedCount, rate: convRate, revenue, customers: enrolledCustomers, outstanding, tasksCompleted: tasksDone };
    };

    const currentMetrics = useMemo(() => calculatePeriodMetrics(leads, customers, dateRange.from, dateRange.to), [leads, customers, dateRange, serviceFilter, categoryFilter, industryFilter, employeeFilter, branchFilter, cityFilter, managerFilter, users]);
    const comparisonMetrics = useMemo(() => {
        if (comparisonMode === 'none' || !comparisonRange.from || !comparisonRange.to) return null;
        return calculatePeriodMetrics(leads, customers, comparisonRange.from, comparisonRange.to);
    }, [leads, customers, comparisonRange, comparisonMode, serviceFilter, categoryFilter, industryFilter, employeeFilter, branchFilter, cityFilter, managerFilter, users]);
    const seCurrentMetrics = useMemo(() => calculatePeriodMetrics(myLeads, myCustomers, dateRange.from, dateRange.to), [myLeads, myCustomers, dateRange, serviceFilter, categoryFilter, industryFilter, employeeFilter, branchFilter, cityFilter, managerFilter, users]);

    const getGrowthPercent = (curr: number, comp: number) => {
        if (comp === 0) return curr > 0 ? '+100%' : '0%';
        const diff = ((curr - comp) / comp) * 100;
        return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };

    const growthMetrics = useMemo(() => {
        if (!comparisonMetrics) return null;
        return {
            leads: getGrowthPercent(currentMetrics.leads, comparisonMetrics.leads),
            converted: getGrowthPercent(currentMetrics.converted, comparisonMetrics.converted),
            rate: getGrowthPercent(currentMetrics.rate, comparisonMetrics.rate),
            revenue: getGrowthPercent(currentMetrics.revenue, comparisonMetrics.revenue),
        };
    }, [currentMetrics, comparisonMetrics]);

    // ── KEY DERIVED METRICS ────────────────────────────────────────────────
    const activeUsersCount = useMemo(() => {
        const threshold = 5 * 60 * 1000;
        return users.filter(u => u.is_online && u.last_seen && (new Date().getTime() - new Date(u.last_seen).getTime()) < threshold).length;
    }, [users]);

    const pendingLeadsCount = useMemo(() => leads.filter(l => l.status === LeadStatus.NEW_LEAD || l.status === LeadStatus.LEAD_CONFIRMED).length, [leads]);
    const inProgressLeadsCount = useMemo(() => leads.filter(l => l.status === LeadStatus.IN_PROGRESS || l.status === LeadStatus.DOCS_AND_PAYMENTS).length, [leads]);
    const lostLeadsCount = useMemo(() => leads.filter(l => l.status === LeadStatus.LOST).length, [leads]);
    const convertedLeadsCount = useMemo(() => leads.filter(l => l.status === LeadStatus.SUCCESS).length, [leads]);
    const pendingPaymentsVal = useMemo(() => leads.reduce((sum, l) => sum + (l.remaining_amount || 0), 0), [leads]);

    const todayRevenueVal = useMemo(() => {
        const todayStr = getLocalDateString(new Date());
        return leads.reduce((sum, lead) => {
            const todayPayments = lead.payments?.filter(p => p.date && p.date.startsWith(todayStr)) || [];
            return sum + todayPayments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
        }, 0);
    }, [leads]);

    const thisMonthRevenueVal = useMemo(() => {
        const now = new Date();
        const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return leads.reduce((sum, lead) => {
            const monthPayments = lead.payments?.filter(p => p.date && p.date.startsWith(monthPrefix)) || [];
            return sum + monthPayments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
        }, 0);
    }, [leads]);

    const totalServicesCount = useMemo(() => services.reduce((acc, s) => acc + (s.sub_services?.length || 0), 0), [services]);
    const totalBranchesCount = useMemo(() => Array.from(new Set(users.map(u => u.branch_name).filter(Boolean))).length, [users]);

    const myRevenue = useMemo(() => myLeads.reduce((sum, lead) => sum + (lead.payments?.reduce((pSum, p) => pSum + (p.amount || 0), 0) || 0), 0), [myLeads]);
    const myPendingPayments = useMemo(() => myLeads.reduce((sum, l) => sum + (l.remaining_amount || 0), 0), [myLeads]);

    // ── BIRTHDAY LOGIC ─────────────────────────────────────────────────────
    const birthdayCustomers = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        return (customers || []).filter(c => {
            if (!c.date_of_birth) return false;
            const parts = c.date_of_birth.split('-');
            if (parts.length < 3) return false;
            return parseInt(parts[1], 10) === currentMonth && parseInt(parts[2], 10) === currentDay;
        });
    }, [customers]);

    const isWishSent = (customer: Customer) => {
        const lead = leads.find(l => l.id === customer.lead_id);
        if (!lead || !lead.activities || !Array.isArray(lead.activities)) return false;
        const currentYear = new Date().getFullYear();
        return lead.activities.some(act => act?.content?.includes(`Sent WhatsApp birthday wish for year ${currentYear}`) ?? false);
    };

    const handleSendWhatsAppWish = async (customer: Customer) => {
        const currentYear = new Date().getFullYear();
        const message = `*Happy Birthday!* 🎂\n\nDear ${customer.name},\n\nWish you a very Happy Birthday from all of us at 24eFiling! May this year bring you endless happiness, success, and prosperity.\n\nBest regards,\n*24eFiling*`;
        let formattedPhone = customer.phone.replace(/[^0-9]/g, '');
        if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        if (customer.lead_id && onAddActivityToLead) {
            try {
                await onAddActivityToLead(customer.lead_id, { type: 'Call', content: `[Birthday Wish] Sent WhatsApp birthday wish for year ${currentYear}` });
                if (refreshData) await refreshData();
            } catch (e) { console.error('Failed to log birthday activity', e); }
        }
        window.open(url, '_blank');
    };

    // ── AGENDA DATA ────────────────────────────────────────────────────────
    const agendaData = useMemo(() => {
        const nowMidnight = new Date(); nowMidnight.setHours(0, 0, 0, 0);
        const followUpsToday: Lead[] = [], followUpsOverdue: Lead[] = [], followUpsUpcoming: Lead[] = [];
        leads.forEach(l => {
            if (l.next_follow_up && l.status !== 'Success' && l.status !== 'Lost') {
                const fd = new Date(l.next_follow_up); fd.setHours(0, 0, 0, 0);
                if (fd < nowMidnight) followUpsOverdue.push(l);
                else if (fd.getTime() === nowMidnight.getTime()) followUpsToday.push(l);
                else followUpsUpcoming.push(l);
            }
        });
        const todayTasks: Array<Task & { leadId: string; leadName: string }> = [];
        const todayMeetings: Array<Task & { leadId: string; leadName: string }> = [];
        const overdueTasks: Array<Task & { leadId: string; leadName: string }> = [];
        const upcomingTasks: Array<Task & { leadId: string; leadName: string }> = [];
        let totalPendingTasksCount = 0;
        leads.forEach(lead => {
            if (lead.tasks && lead.tasks.length > 0) {
                lead.tasks.forEach(task => {
                    if (!task.is_completed) {
                        totalPendingTasksCount++;
                        if (task.due_date) {
                            const dueDate = new Date(task.due_date); dueDate.setHours(0, 0, 0, 0);
                            const ext = { ...task, leadId: lead.id, leadName: lead.business_name || `${lead.first_name} ${lead.last_name}` };
                            const isMeeting = /meet|meeting|appointment|discuss|discussion|call|client/i.test(task.content);
                            if (dueDate < nowMidnight) overdueTasks.push(ext);
                            else if (dueDate.getTime() === nowMidnight.getTime()) { if (isMeeting) todayMeetings.push(ext); else todayTasks.push(ext); }
                            else upcomingTasks.push(ext);
                        }
                    }
                });
            }
        });
        const sortFn = (a: any, b: any) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
        return {
            todayFollowUps: followUpsToday, overdueFollowUps: followUpsOverdue, upcomingFollowUps: followUpsUpcoming,
            todayTasks: todayTasks.sort(sortFn), todayMeetings: todayMeetings.sort(sortFn),
            overdueTasks: overdueTasks.sort(sortFn), upcomingTasks: upcomingTasks.sort(sortFn),
            totalPendingTasksCount,
            todayFollowUpsCount: followUpsToday.length + todayTasks.length + todayMeetings.length,
            overdueFollowUpsCount: followUpsOverdue.length + overdueTasks.length,
            upcomingFollowUpsCount: followUpsUpcoming.length + upcomingTasks.length,
            hotLeads: leads.filter(l => l.priority === 'Hot' && l.status !== 'Success' && l.status !== 'Lost')
        };
    }, [leads]);

    // ── AI INSIGHTS ────────────────────────────────────────────────────────
    const aiInsights = useMemo(() => {
        const insights: AiInsight[] = [];
        if (comparisonMetrics) {
            const revDiff = currentMetrics.revenue - comparisonMetrics.revenue;
            const displayPercent = comparisonMetrics.revenue > 0 ? ((revDiff / comparisonMetrics.revenue) * 100).toFixed(1) : '0';
            if (revDiff > 0) insights.push({ type: 'success', category: 'Revenue', title: 'Strong Revenue Growth', description: `Revenue increased by ${displayPercent}% vs previous period. Keep capitalizing on high-value services.` });
            else if (revDiff < 0) insights.push({ type: 'warning', category: 'Revenue', title: 'Revenue Drop Detected', description: `Revenue fell by ${Math.abs(parseFloat(displayPercent))}%. Consider targeting overdue invoices or running a service campaign.` });
        }
        const rate = currentMetrics.rate;
        if (rate > 25) insights.push({ type: 'success', category: 'Conversion', title: 'Exceptional Conversion Performance', description: `Your team converted ${rate.toFixed(1)}% of leads. Focus on feeding more high-quality leads into the pipeline.` });
        else if (rate < 15 && currentMetrics.leads > 5) insights.push({ type: 'warning', category: 'Conversion', title: 'Conversion Rate Below Target', description: `Current conversion is at ${rate.toFixed(1)}%. Re-evaluate lead qualification or provide coaching to executives.` });
        const overdue = agendaData.overdueFollowUpsCount;
        if (overdue > 5) insights.push({ type: 'danger', category: 'Operations', title: 'High Overdue Follow-Ups Backlog', description: `There are ${overdue} overdue follow-ups. Unattended leads decrease in conversion likelihood by 60% after 24 hours.` });
        else if (overdue === 0 && agendaData.todayFollowUpsCount > 0) insights.push({ type: 'success', category: 'Operations', title: 'Operational Discipline is High', description: 'Zero overdue follow-ups! Excellent work maintaining prompt communication with prospective clients.' });
        if (agendaData.hotLeads.length > 0) insights.push({ type: 'info', category: 'Pipeline', title: 'High Priority Opportunities', description: `You have ${agendaData.hotLeads.length} hot leads in the pipeline. Prioritize contacting these today to boost this month's revenue.` });
        if (insights.length === 0) insights.push({ type: 'info', category: 'System', title: 'Data Collection Active', description: 'No anomalies or critical alerts detected. The business pipeline is currently stable.' });
        return insights;
    }, [currentMetrics, comparisonMetrics, agendaData]);

    // ── CHART DATA ─────────────────────────────────────────────────────────
    const trendData = useMemo(() => {
        const { from, to } = dateRange;
        let startDate: Date, endDate: Date;
        if (from && to) { startDate = new Date(`${from}T00:00:00`); endDate = new Date(`${to}T23:59:59.999`); }
        else {
            if (leads.length > 0) {
                const dates = leads.map(l => new Date(l.created_at).getTime());
                startDate = new Date(Math.min(...dates)); startDate.setHours(0, 0, 0, 0);
                endDate = new Date(Math.max(...dates)); endDate.setHours(23, 59, 59, 999);
                if (endDate.getTime() - startDate.getTime() < 30 * 24 * 60 * 60 * 1000) {
                    startDate = new Date(); startDate.setDate(startDate.getDate() - 29); startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(); endDate.setHours(23, 59, 59, 999);
                }
            } else {
                startDate = new Date(); startDate.setDate(startDate.getDate() - 6); startDate.setHours(0, 0, 0, 0);
                endDate = new Date(); endDate.setHours(23, 59, 59, 999);
            }
        }
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
            const intervals = [
                { start: 0, end: 3, label: '12–3 AM' }, { start: 3, end: 6, label: '3–6 AM' },
                { start: 6, end: 9, label: '6–9 AM' }, { start: 9, end: 12, label: '9–12 PM' },
                { start: 12, end: 15, label: '12–3 PM' }, { start: 15, end: 18, label: '3–6 PM' },
                { start: 18, end: 21, label: '6–9 PM' }, { start: 21, end: 24, label: '9–12 AM' }
            ];
            const targetDateStr = getLocalDateString(startDate);
            return intervals.map(interval => {
                const inInterval = filteredLeads.filter(l => { const d = new Date(l.created_at); return getLocalDateString(d) === targetDateStr && d.getHours() >= interval.start && d.getHours() < interval.end; });
                let revenue = 0;
                leads.forEach(l => (l.payments || []).forEach(p => { if (!p.date) return; const pd = new Date(p.date); if (getLocalDateString(pd) === targetDateStr && pd.getHours() >= interval.start && pd.getHours() < interval.end) revenue += (p.amount || 0); }));
                return { date: interval.label, leads: inInterval.length, converted: inInterval.filter(l => l.status === LeadStatus.SUCCESS).length, revenue };
            });
        }
        if (diffDays <= 31) {
            const dataPoints = []; const temp = new Date(startDate);
            while (temp <= endDate) {
                const dateStr = getLocalDateString(temp);
                const onDay = filteredLeads.filter(l => l.created_at.startsWith(dateStr));
                let dayRevenue = 0;
                leads.forEach(l => (l.payments || []).forEach(p => { if (p.date && p.date.startsWith(dateStr)) dayRevenue += (p.amount || 0); }));
                dataPoints.push({ date: temp.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), leads: onDay.length, converted: onDay.filter(l => l.status === LeadStatus.SUCCESS).length, revenue: dayRevenue });
                temp.setDate(temp.getDate() + 1);
            }
            return dataPoints;
        }
        const dataPoints: Record<string, { date: string; leads: number; converted: number; revenue: number; orderVal: number }> = {};
        const temp = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (temp <= endDate) {
            const key = `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}`;
            dataPoints[key] = { date: temp.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), leads: 0, converted: 0, revenue: 0, orderVal: temp.getFullYear() * 12 + temp.getMonth() };
            temp.setMonth(temp.getMonth() + 1);
        }
        filteredLeads.forEach(lead => { const d = new Date(lead.created_at); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; if (dataPoints[key]) { dataPoints[key].leads += 1; if (lead.status === LeadStatus.SUCCESS) dataPoints[key].converted += 1; } });
        leads.forEach(lead => (lead.payments || []).forEach(p => { if (p.date) { const pd = new Date(p.date); const key = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}`; if (dataPoints[key]) dataPoints[key].revenue += (p.amount || 0); } }));
        return Object.values(dataPoints).sort((a, b) => a.orderVal - b.orderVal);
    }, [leads, filteredLeads, dateRange]);

    const sourceData = useMemo(() => {
        const sources = filteredLeads.reduce((acc, lead) => { const src = lead.source || 'Unknown'; acc[src] = (acc[src] || 0) + 1; return acc; }, {} as Record<string, number>);
        return Object.entries(sources).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [filteredLeads]);

    const statusData = useMemo(() => {
        const counts = filteredLeads.reduce((acc, lead) => { acc[lead.status] = (acc[lead.status] || 0) + 1; return acc; }, {} as Record<string, number>);
        const colors: Record<string, string> = { [LeadStatus.NEW_LEAD]: '#3b82f6', [LeadStatus.LEAD_CONFIRMED]: '#6366f1', [LeadStatus.DOCS_AND_PAYMENTS]: '#8b5cf6', [LeadStatus.IN_PROGRESS]: '#f59e0b', [LeadStatus.SUCCESS]: '#22c55e', [LeadStatus.LOST]: '#ef4444' };
        return Object.keys(counts).map(status => ({ name: status, value: counts[status], color: colors[status] || '#cbd5e1' })).filter(d => d.value > 0);
    }, [filteredLeads]);

    const recentActivities = filteredActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6);

    const branchPerformanceData = useMemo(() => {
        if (!isSuperAdmin) return [];
        return branches.map(branch => {
            const bLeads = filteredLeads.filter(l => l.branch_id === branch.id || l.branch_name === branch.name);
            const bSales = bLeads.filter(l => l.status === LeadStatus.SUCCESS);
            const totalRev = bLeads.reduce((sum, lead) => sum + (lead.payments || []).reduce((pSum, p) => pSum + (p.amount || 0), 0), 0);
            return {
                id: branch.id,
                name: branch.name,
                city: branch.city_name,
                leads: bLeads.length,
                sales: bSales.length,
                revenue: totalRev
            };
        }).sort((a, b) => b.revenue - a.revenue);
    }, [isSuperAdmin, branches, filteredLeads]);

    // ── EXPORT ─────────────────────────────────────────────────────────────
    const handleExport = (format: 'excel' | 'csv' | 'pdf') => {
        setExportOpen(false);
        const dataToExport = filteredLeads.map((lead, index) => ({
            'S. No': index + 1, 'Name': `${lead.first_name} ${lead.last_name}`, 'Business Name': lead.business_name || '-',
            'Business Category': lead.business_category || 'Other', 'Industry Type': lead.industry_type || 'Other',
            'Email': lead.email || '-', 'Phone': lead.phone_number || '-', 'Lead Source': lead.source || '-', 'Service Requested': lead.service_requested || '-',
            'Status': lead.status, 'Priority': lead.priority, 'Assigned To': lead.assigned_to?.name || 'Unassigned',
            'Total Payment (₹)': lead.total_payment || 0, 'Remaining Amount (₹)': lead.remaining_amount || 0,
            'Created Date': new Date(lead.created_at).toLocaleDateString('en-IN')
        }));
        const triggerDownload = (url: string, filename: string) => { const link = document.createElement('a'); link.href = url; link.download = filename; link.style.display = 'none'; document.body.appendChild(link); link.click(); setTimeout(() => document.body.removeChild(link), 200); };
        if (format === 'excel') { try { const ws = XLSX.utils.json_to_sheet(dataToExport); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Dashboard Leads'); const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }); const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); triggerDownload(URL.createObjectURL(blob), `dashboard_leads_export_${new Date().toISOString().slice(0, 10)}.xlsx`); } catch (err) { console.error(err); } }
        else if (format === 'csv') { try { const ws = XLSX.utils.json_to_sheet(dataToExport); const csv = XLSX.utils.sheet_to_csv(ws); const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' }); triggerDownload(URL.createObjectURL(blob), `dashboard_leads_export_${new Date().toISOString().slice(0, 10)}.csv`); } catch (err) { console.error(err); } }
        else if (format === 'pdf') { try { const doc = new jsPDF('l', 'mm', 'a4'); doc.setFontSize(14); doc.setTextColor(28, 57, 142); doc.text('24eFiling — Dashboard Leads Export', 14, 14); doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.text(`Generated: ${new Date().toLocaleString('en-IN')}  |  Total Records: ${filteredLeads.length}`, 14, 20); autoTable(doc, { startY: 25, head: [['S.No', 'Name', 'Business Name', 'Category', 'Industry', 'Source', 'Phone', 'Service', 'Status', 'Assigned To', 'Total ₹', 'Remaining ₹', 'Created']], body: filteredLeads.map((l, i) => [i + 1, `${l.first_name} ${l.last_name}`, l.business_name || '-', l.business_category || 'Other', l.industry_type || 'Other', l.source || '-', l.phone_number || '-', l.service_requested || '-', l.status, l.assigned_to?.name || 'Unassigned', `₹${(l.total_payment || 0).toLocaleString('en-IN')}`, `₹${(l.remaining_amount || 0).toLocaleString('en-IN')}`, new Date(l.created_at).toLocaleDateString('en-IN')]), styles: { fontSize: 7 }, headStyles: { fillColor: [28, 57, 142] } }); doc.save(`dashboard_leads_export_${new Date().toISOString().slice(0, 10)}.pdf`); } catch (err) { console.error(err); } }
    };

    // ── SEARCH VIEW ────────────────────────────────────────────────────────
    const searchResults = useMemo(() => {
        if (!localSearchTerm) return { customers: [], leads: [] };
        const customerPool = isSalesExec ? customers.filter(c => c.assigned_to?.id === currentUser.id) : customers;
        const leadPool = isSalesExec ? leads.filter(l => l.assigned_to?.id === currentUser.id) : leads;
        const q = localSearchTerm.toLowerCase();
        const cleanQuery = q.replace(/[^0-9]/g, '');

        const matchedCustomers = customerPool.filter(c => {
            const cleanPhone = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
            return (
                (c.reference_number && c.reference_number.toLowerCase().includes(q)) ||
                (c.name && c.name.toLowerCase().includes(q)) ||
                (c.business_name && c.business_name.toLowerCase().includes(q)) ||
                (c.business_category && c.business_category.toLowerCase().includes(q)) ||
                (c.industry_type && c.industry_type.toLowerCase().includes(q)) ||
                (c.lead_source && c.lead_source.toLowerCase().includes(q)) ||
                (c.email && c.email.toLowerCase().includes(q)) ||
                (c.phone && c.phone.toLowerCase().includes(q)) ||
                (cleanQuery !== '' && cleanPhone.includes(cleanQuery)) ||
                (c.pan_number && c.pan_number.toLowerCase().includes(q)) ||
                (c.payment_details?.payments?.some(p => p.receipt_number && p.receipt_number.toLowerCase().includes(q)) || false)
            );
        });
        
        const matchedLeads = leadPool.filter(l => {
            const cleanPhone = l.phone_number ? l.phone_number.replace(/[^0-9]/g, '') : '';
            return (
                (l.id && l.id.toLowerCase().includes(q)) ||
                (l.first_name && l.first_name.toLowerCase().includes(q)) ||
                (l.last_name && l.last_name.toLowerCase().includes(q)) ||
                (l.business_name && l.business_name.toLowerCase().includes(q)) ||
                (l.business_category && l.business_category.toLowerCase().includes(q)) ||
                (l.industry_type && l.industry_type.toLowerCase().includes(q)) ||
                (l.source && l.source.toLowerCase().includes(q)) ||
                (l.email && l.email.toLowerCase().includes(q)) ||
                (l.phone_number && l.phone_number.toLowerCase().includes(q)) ||
                (cleanQuery !== '' && cleanPhone.includes(cleanQuery)) ||
                (l.branch_name && l.branch_name.toLowerCase().includes(q)) ||
                (l.city_name && l.city_name.toLowerCase().includes(q)) ||
                (l.assigned_to?.name && l.assigned_to.name.toLowerCase().includes(q)) ||
                (l.payments?.some(p => p.receipt_number && p.receipt_number.toLowerCase().includes(q)) || false)
            );
        });
        
        return { customers: matchedCustomers, leads: matchedLeads };
    }, [localSearchTerm, customers, leads, currentUser]);

    if (localSearchTerm) {
        const totalMatches = searchResults.customers.length + searchResults.leads.length;
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Search Results</h1>
                        <p className="text-slate-500 mt-1">Found {totalMatches} matches for "{localSearchTerm}"</p>
                    </div>
                    <Button variant="ghost" onClick={() => setLocalSearchTerm('')} className="bg-slate-100 hover:bg-slate-200 text-slate-700">
                        <ArrowUpRight className="h-4 w-4 mr-2 rotate-180" /> Back to Dashboard
                    </Button>
                </header>
                
                {searchResults.customers.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">Customers ({searchResults.customers.length})</h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {searchResults.customers.map(c => (
                                <Card key={c.id} className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => onViewCustomer(c.id)}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex justify-between">{c.name}<span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{c.service_name}</span></CardTitle>
                                        <CardDescription>{c.business_name}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-slate-600 space-y-1">
                                            <p className="flex items-center gap-2"><CreditCard className="h-3 w-3" /> {c.email}</p>
                                            <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {c.phone}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
                
                {searchResults.leads.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">Leads ({searchResults.leads.length})</h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {searchResults.leads.map(l => (
                                <Card key={l.id} className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => onViewLead && onViewLead(l.id)}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex justify-between">{l.first_name} {l.last_name}<span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{l.status}</span></CardTitle>
                                        <CardDescription>{l.business_name}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-slate-600 space-y-1">
                                            <p className="flex items-center gap-2"><CreditCard className="h-3 w-3" /> {l.email}</p>
                                            <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {l.phone_number}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {totalMatches === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No customers or leads found matching your criteria.</p>
                    </div>
                )}
            </div>
        );
    }

    // Quick Actions
    const quickActions: QuickAction[] = [
        { label: 'New Lead', icon: PlusCircle, color: 'bg-blue-600', bg: 'bg-blue-50 border-blue-200 hover:bg-blue-100', onClick: () => onNavigate('Create New Lead') },
        ...(isSuperAdmin ? [{ label: 'Payments', icon: IndianRupee, color: 'bg-emerald-600', bg: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100', onClick: () => onNavigate('Payments') }] : []),
        ...(!isSalesExec ? [{ label: 'Reports', icon: BarChart2, color: 'bg-violet-600', bg: 'bg-violet-50 border-violet-200 hover:bg-violet-100', onClick: () => onNavigate('Reports & Analytics') }] : []),
        { label: 'Customers', icon: Users, color: 'bg-amber-600', bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100', onClick: () => onNavigate('Customers') },
    ];

    // Branch metrics for Branch Manager / Admin
    const branchSECount = useMemo(() => users.filter(u => (u.branch_id === currentUser.branch_id || u.branch_name === currentUser.branch_name) && u.role === 'Sales Executive').length, [users, currentUser]);
    const branchLeadsCount = useMemo(() => leads.filter(l => l.branch_id === currentUser.branch_id || l.branch_name === currentUser.branch_name).length, [leads, currentUser]);
    const branchCustomersCount = useMemo(() => customers.filter(c => c.branch_id === currentUser.branch_id || c.branch_name === currentUser.branch_name).length, [customers, currentUser]);
    const branchConvRate = useMemo(() => {
        const branchLeads = leads.filter(l => l.branch_id === currentUser.branch_id || l.branch_name === currentUser.branch_name);
        const branchConverted = branchLeads.filter(l => l.status === LeadStatus.SUCCESS).length;
        return branchLeads.length > 0 ? (branchConverted / branchLeads.length) * 100 : 0;
    }, [leads, currentUser]);
    const branchPerformance = useMemo(() => branchConvRate > 25 ? 'Excellent' : branchConvRate > 15 ? 'Good' : 'Average', [branchConvRate]);

    // Sales Executive metrics
    const seFollowUpsCount = useMemo(() => leads.filter(l => l.assigned_to?.id === currentUser.id && l.next_follow_up && l.status !== 'Success' && l.status !== 'Lost').length, [leads, currentUser]);
    const seConvRate = useMemo(() => {
        const seLeads = leads.filter(l => l.assigned_to?.id === currentUser.id);
        const seConverted = seLeads.filter(l => l.status === LeadStatus.SUCCESS).length;
        return seLeads.length > 0 ? (seConverted / seLeads.length) * 100 : 0;
    }, [leads, currentUser]);

    // Super Admin metrics
    const superAdminAdminsCount = useMemo(() => users.filter(u => u.role === 'Admin' || u.role === 'Branch Manager').length, [users]);
    const superAdminSecsCount = useMemo(() => users.filter(u => u.role === 'Sales Executive').length, [users]);
    const superAdminPaymentsCount = useMemo(() => leads.reduce((sum, l) => sum + (l.payments?.length || 0), 0), [leads]);

    // ── RENDER ─────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ── HEADER ──────────────────────────────────────────────────────── */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-slate-500 font-medium">
                        {getGreeting()}, {currentUser.name.split(' ')[0]}! 👋
                    </p>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                        Command Centre
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        {agendaData.overdueFollowUpsCount > 0 && (
                            <span className="ml-2 text-red-500 font-semibold animate-pulse">
                                · {agendaData.overdueFollowUpsCount} overdue
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        type="text"
                        placeholder="Search customers, leads..."
                        value={localSearchTerm}
                        onChange={(e) => setLocalSearchTerm(e.target.value)}
                        className="h-9 w-64 text-xs px-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                    />

                    {/* Add Lead */}
                    <Button onClick={() => onNavigate('Create New Lead')} className="bg-[#1c398e] hover:bg-[#16307a] text-white gap-1.5 shadow-sm h-9 text-xs font-bold">
                        <PlusCircle className="h-3.5 w-3.5" /> Add Lead
                    </Button>

                    {/* Export dropdown */}
                    <div className="relative">
                        <Button
                            variant="outline"
                            onClick={() => setExportOpen(v => !v)}
                            className="gap-1.5 h-9 text-xs font-semibold border-slate-200 bg-white shadow-sm"
                        >
                            <Download className="h-3.5 w-3.5" /> Export
                            {exportOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                        </Button>
                        {exportOpen && (
                            <div className="absolute right-0 top-11 z-50 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button onClick={() => handleExport('excel')} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Excel (.xlsx)
                                </button>
                                <button onClick={() => handleExport('csv')} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                                    <FileText className="h-3.5 w-3.5 text-blue-600" /> CSV (.csv)
                                </button>
                                <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                                    <FileText className="h-3.5 w-3.5 text-red-500" /> PDF (.pdf)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Local filters bar removed to synchronize fully with the top GlobalFilterBar */}

            {/* ── COLORFUL KPI GRID ────────────────────────────────────────────── */}
            <div className="space-y-4">
                {isSuperAdmin && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <ColorfulKpiCard large title="Total Cities" value={cities.length} subtitle="Active Locations" gradient="bg-gradient-to-br from-indigo-500 to-blue-600" icon={Building} />
                            <ColorfulKpiCard large title="Total Branches" value={branches.length} subtitle="All Branches" gradient="bg-gradient-to-br from-emerald-500 to-teal-600" icon={Building} onClick={() => onNavigate('Branch Management')} />
                            <ColorfulKpiCard large title="Total Admins" value={superAdminAdminsCount} subtitle="Branch Managers" gradient="bg-gradient-to-br from-violet-500 to-purple-600" icon={Users} onClick={() => onNavigate('User Management')} />
                            <ColorfulKpiCard large title="Sales Executives" value={superAdminSecsCount} subtitle="Active SEs" gradient="bg-gradient-to-br from-amber-500 to-orange-600" icon={Users} onClick={() => onNavigate('User Management')} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <ColorfulKpiCard large title="Total Leads" value={leads.length} subtitle="Lifetime Leads" gradient="bg-gradient-to-br from-pink-500 to-rose-600" icon={Briefcase} onClick={() => onNavigate('All Leads')} />
                            <ColorfulKpiCard large title="Total Customers" value={customers.length} subtitle="Lifetime Customers" gradient="bg-gradient-to-br from-fuchsia-500 to-pink-600" icon={Users} onClick={() => onNavigate('Customers')} />
                            <ColorfulKpiCard large title="Total Revenue" value={formatCurrency(currentMetrics.revenue)} subtitle="Filtered Period" gradient="bg-gradient-to-br from-rose-500 to-red-600" icon={IndianRupee} onClick={() => onNavigate('Payments')} />
                            <ColorfulKpiCard large title="Completed Payments" value={superAdminPaymentsCount} subtitle="Total Transactions" gradient="bg-gradient-to-br from-sky-500 to-blue-600" icon={CreditCard} onClick={() => onNavigate('Payments')} />
                        </div>
                        
                        {/* ── BRANCH PERFORMANCE TABLE (SUPER ADMIN) ──────────────────────── */}
                        <Card className="shadow-sm border border-slate-200 mt-4">
                            <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50">
                                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <Building className="h-4 w-4 text-slate-500" />
                                    Branch Performance Overview (Selected Period)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-white border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase">
                                            <tr>
                                                <th className="px-4 py-3">Branch</th>
                                                <th className="px-4 py-3">City</th>
                                                <th className="px-4 py-3 text-right">Leads</th>
                                                <th className="px-4 py-3 text-right">Sales</th>
                                                <th className="px-4 py-3 text-right">Revenue (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {branchPerformanceData.map((b) => (
                                                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-slate-800">{b.name}</td>
                                                    <td className="px-4 py-3 text-slate-600">{b.city}</td>
                                                    <td className="px-4 py-3 text-right text-slate-600">{b.leads}</td>
                                                    <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{b.sales}</td>
                                                    <td className="px-4 py-3 text-right text-indigo-600 font-bold">{formatCurrency(b.revenue)}</td>
                                                </tr>
                                            ))}
                                            {branchPerformanceData.length === 0 && (
                                                <tr><td colSpan={5} className="px-4 py-4 text-center text-slate-500">No branches found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {(currentUser.role === 'Admin' || currentUser.role === 'Branch Manager') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <ColorfulKpiCard large title="Branch Sales Execs" value={branchSECount} subtitle="Active SEs" gradient="bg-gradient-to-br from-indigo-500 to-blue-600" icon={Users} onClick={() => onNavigate('User Management')} />
                        <ColorfulKpiCard large title="Branch Leads" value={branchLeadsCount} subtitle="Total Leads" gradient="bg-gradient-to-br from-emerald-500 to-teal-600" icon={Briefcase} onClick={() => onNavigate('All Leads')} />
                        <ColorfulKpiCard large title="Branch Customers" value={branchCustomersCount} subtitle="Lifetime" gradient="bg-gradient-to-br from-amber-500 to-orange-600" icon={Users} onClick={() => onNavigate('Customers')} />
                        <ColorfulKpiCard large title="Conversion Rate" value={`${branchConvRate.toFixed(1)}%`} subtitle="Leads to Success" gradient="bg-gradient-to-br from-violet-500 to-purple-600" icon={TrendingUp} />
                        <ColorfulKpiCard large title="Branch Performance" value={branchPerformance} subtitle="Based on Conversion" gradient="bg-gradient-to-br from-pink-500 to-rose-600" icon={Activity} />
                    </div>
                )}

                {isSalesExec && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ColorfulKpiCard large title="My Leads" value={myLeads.length} subtitle="Assigned Leads" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" icon={Briefcase} onClick={() => onNavigate('All Leads')} />
                        <ColorfulKpiCard large title="My Customers" value={myCustomers.length} subtitle="Converted Leads" gradient="bg-gradient-to-br from-emerald-500 to-teal-600" icon={Users} onClick={() => onNavigate('Customers')} />
                        <ColorfulKpiCard large title="My Follow-ups" value={seFollowUpsCount} subtitle="Pending Follow-ups" gradient="bg-gradient-to-br from-amber-500 to-orange-600" icon={Clock} onClick={() => onNavigate('Follow-ups')} />
                        <ColorfulKpiCard large title="My Performance" value={`${seConvRate.toFixed(1)}%`} subtitle="My Conversion Rate" gradient="bg-gradient-to-br from-violet-500 to-purple-600" icon={TrendingUp} />
                    </div>
                )}
            </div>

            {/* ── TWO-COLUMN COMMAND CENTRE BODY ───────────────────────────────── */}
            <div className="grid gap-5 lg:grid-cols-5">

                {/* LEFT PANEL (col-span-3) */}
                <div className="lg:col-span-3 space-y-5">

                    {/* ── CHART CARD ──────────────────────────────────────────────── */}
                    <Card className="shadow-sm border border-slate-200">
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3">
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-800">Business Analytics</CardTitle>
                                <CardDescription className="text-xs">
                                    {activeChartTab === 'leads' && 'New leads vs conversions over time'}
                                    {activeChartTab === 'revenue' && 'Total payments revenue trend'}
                                    {activeChartTab === 'services' && 'Leads by acquisition source'}
                                </CardDescription>
                            </div>
                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                {(['leads', 'revenue', 'services'] as const)
                                    .filter(tab => isSuperAdmin || tab !== 'revenue')
                                    .map(tab => (
                                        <button key={tab} onClick={() => setActiveChartTab(tab)} className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 capitalize', activeChartTab === tab ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900')}>
                                            {tab === 'services' ? 'Sources' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                        </button>
                                    ))}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0" style={{ height: '240px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {activeChartTab === 'leads' ? (
                                    <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                                            <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={8} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="leads" name="New Leads" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
                                        <Area type="monotone" dataKey="converted" name="Converted" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorConv)" />
                                    </AreaChart>
                                ) : activeChartTab === 'revenue' ? (
                                    <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={8} />
                                        <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                                    </AreaChart>
                                ) : (
                                    <BarChart data={sourceData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Bar dataKey="value" name="Leads" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                            {sourceData.map((_, idx) => <Cell key={`cell-${idx}`} fill={['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#10b981'][idx % 5]} />)}
                                        </Bar>
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>


                    {/* ── RECENT ACTIVITY FEED ─────────────────────────────────────── */}
                    <Card className="shadow-sm border border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-800">Recent Activity</CardTitle>
                                <CardDescription className="text-xs">Latest updates from your team</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-blue-600 h-7" onClick={() => onNavigate('Activity Feed')}>View All</Button>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="relative pl-5 border-l-2 border-slate-100 space-y-5 py-1">
                                {recentActivities.length > 0 ? recentActivities.map((activity) => {
                                    const user = users.find(u => u.id === activity.user_id);
                                    return (
                                        <div key={activity.id} className="relative group">
                                            <div className="absolute -left-[25px] bg-white border-2 border-slate-200 w-3.5 h-3.5 rounded-full group-hover:border-blue-500 group-hover:bg-blue-50 transition-colors" />
                                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                                                <p className="text-xs font-medium text-slate-800">
                                                    <span className="text-blue-600 font-semibold">{user?.name}</span>{' '}{activity.action.toLowerCase().replace('user ', '')}
                                                    {activity.details && <span className="text-slate-500 font-normal"> — {activity.details}</span>}
                                                </p>
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap">{timeAgo(activity.timestamp)}</span>
                                            </div>
                                        </div>
                                    );
                                }) : <p className="text-xs text-slate-400 italic">No recent activity for current filter.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT PANEL (col-span-2) */}
                <div className="lg:col-span-2 space-y-4">

                    {/* ── TODAY'S AGENDA ───────────────────────────────────────────── */}
                    <TodayAgendaCard
                        agendaData={agendaData}
                        birthdayCustomers={birthdayCustomers}
                        isWishSent={isWishSent}
                        onSendWish={handleSendWhatsAppWish}
                        onViewLead={onViewLead}
                        onViewCustomer={onViewCustomer}
                        onNavigate={onNavigate}
                    />

                    {/* ── QUICK ACTIONS ────────────────────────────────────────────── */}
                    <QuickActionsPanel actions={quickActions} />

                    {/* ── PIPELINE STATUS DONUT (compact) ──────────────────────────── */}
                    <Card className="shadow-sm border border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pipeline Status</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0" style={{ height: '200px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusData} cx="40%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                                        {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />)}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ paddingLeft: '10px', fontSize: '10px' }} iconType="circle" iconSize={8} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* ── AI INSIGHTS (collapsible) ────────────────────────────────── */}
                    <AiInsightsPanel insights={aiInsights} />


                </div>
            </div>

        </div>
    );
};

export default DashboardOverview;