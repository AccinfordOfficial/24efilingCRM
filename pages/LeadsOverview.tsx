import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lead, User, Service, Offer } from '../types';
import { LeadTable } from '../components/LeadTable';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Popover } from '../components/ui/Popover';
import { Calendar } from '../components/ui/Calendar';
import { CalendarIcon, BriefcaseIcon, CheckCircleIcon, ClockIcon, PlusCircleIcon, AlertTriangleIcon, TargetIcon } from '../components/icons';
import { LEAD_STATUSES, LEAD_PRIORITIES } from '../constants';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { getScoreCategory } from '../lib/scoring';

interface LeadsOverviewProps {
    leads: Lead[];
    users: User[];
    services: Service[];
    offers?: Offer[];
    onAddLead?: () => void;
    onUpdateLead: (lead: Lead) => void;
    onViewLead: (leadId: string) => void;
    onUpdateMultipleLeads: (leadIds: string[], updates: Partial<Omit<Lead, 'id'>>) => void;
    onDeleteMultipleLeads: (leadIds: string[]) => void;
    title?: string;
    dateRange: { from: string; to: string };
    setDateRange: (value: React.SetStateAction<{ from: string; to: string; }>) => void;
    currentUser: User;
}

const MetricCard: React.FC<{ title: string, value: number, icon: React.ElementType, color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="glass-card border border-slate-200 dark:border-white/5 p-4 rounded-xl shadow-md flex flex-col justify-between h-28 relative overflow-hidden bg-white dark:bg-slate-900/60">
        {/* Subtle accent glow background */}
        <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full filter blur-2xl opacity-20 ${color}`} />
        <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </div>
        </div>
        <div className="flex items-baseline mt-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{value}</span>
        </div>
    </div>
);

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};


const LeadsOverview: React.FC<LeadsOverviewProps> = ({
    leads,
    users,
    services,
    offers = [],
    onAddLead,
    onUpdateLead,
    onViewLead,
    onUpdateMultipleLeads,
    onDeleteMultipleLeads,
    title = 'Leads Overview',
    dateRange,
    setDateRange,
    currentUser,
}) => {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [serviceFilter, setServiceFilter] = useState('All');
    const [assigneeFilter, setAssigneeFilter] = useState('All');
    const [scoreFilter, setScoreFilter] = useState('All');
    const [createdByFilter, setCreatedByFilter] = useState('All');

    const descriptionMap: Record<string, string> = {
        'Leads Overview': 'View and filter all leads across the entire system.',
        'Lead Management': 'Assign, track, and update all team leads.',
        'All Leads': 'View and manage all leads across the system with executive filtering.',
        'My Leads': 'View and manage leads created by you.'
    };

    const assignableUsers = useMemo(() => users.filter(u => u.role === 'Sales Executive' || u.role === 'Admin'), [users]);

    const statusOptions = useMemo(() => [
        { value: 'All', label: 'All Statuses' },
        ...LEAD_STATUSES.map(status => ({ value: status, label: status }))
    ], []);

    const priorityOptions = useMemo(() => [
        { value: 'All', label: 'All Priorities' },
        ...LEAD_PRIORITIES.map(priority => ({ value: priority, label: priority }))
    ], []);

    const serviceOptions = useMemo(() => {
        const allSubServices = (services || []).flatMap(s => s.sub_services || []).filter(sub => sub.is_active).map(sub => sub.name);
        const uniqueSubServices = Array.from(new Set(allSubServices));

        return [
            { value: 'All', label: 'All Services' },
            ...uniqueSubServices.map(service => ({ value: service, label: service }))
        ];
    }, [services]);

    const assigneeOptions = useMemo(() => [
        { value: 'All', label: 'All Users' },
        { value: 'Unassigned', label: 'Unassigned' },
        ...assignableUsers.map(user => ({ value: user.id, label: user.name }))
    ], [assignableUsers]);

    const scoreOptions = useMemo(() => [
        { value: 'All', label: 'All Scores' },
        { value: 'Hot', label: 'Hot (>70)' },
        { value: 'Warm', label: 'Warm (41-70)' },
        { value: 'Cold', label: 'Cold (<=40)' },
    ], []);

    const createdByOptions = useMemo(() => [
        { value: 'All', label: 'All Creators' },
        ...users.filter(u => u.role === 'Sales Executive' || u.role === 'Admin' || u.role === 'Super Admin').map(user => ({ value: user.id, label: user.name }))
    ], [users]);

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const statusMatch = statusFilter === 'All' || lead.status === statusFilter;
            const priorityMatch = priorityFilter === 'All' || lead.priority === priorityFilter;
            const serviceMatch = serviceFilter === 'All' || (lead.service_requested && lead.service_requested.includes(serviceFilter));
            const assigneeMatch = assigneeFilter === 'All'
                ? true
                : assigneeFilter === 'Unassigned'
                    ? !lead.assigned_to
                    : lead.assigned_to?.id === assigneeFilter;
            const scoreMatch = scoreFilter === 'All' || getScoreCategory(lead.score || 0).category === scoreFilter;
            const createdByMatch = createdByFilter === 'All' || lead.created_by === createdByFilter;
            return statusMatch && priorityMatch && serviceMatch && assigneeMatch && scoreMatch && createdByMatch;
        });
    }, [leads, statusFilter, priorityFilter, serviceFilter, assigneeFilter, scoreFilter, createdByFilter]);

    const leadCounts = filteredLeads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
    }, {} as Record<Lead['status'], number>);

    const averageLeadScore = filteredLeads.length > 0 ? Math.round(filteredLeads.reduce((sum, l) => sum + (l.score || 0), 0) / filteredLeads.length) : 0;
    const totalPipelineValue = filteredLeads.reduce((sum, lead) => sum + (lead.total_payment || 0), 0);
    const convertedValue = filteredLeads.filter(l => l.status === 'Success').reduce((sum, l) => sum + (l.total_payment || 0), 0);
    const conversionRate = totalPipelineValue > 0 ? (convertedValue / totalPipelineValue) * 100 : 0;
    const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
    const canAddLead = ['Super Admin', 'Admin', 'Sales Executive'].includes(currentUser.role);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{descriptionMap[title]}</p>
            </header>

            <div className="glass-card border border-slate-200 dark:border-white/5 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between w-full bg-white dark:bg-slate-900/60 relative z-30">
                <div className="flex flex-wrap items-end gap-3 w-full">
                    <div className="w-full sm:w-auto">
                        <label htmlFor="date-range-filter" className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Date Range</label>
                        <Popover
                            align="start"
                            trigger={
                                <Button id="date-range-filter" variant="outline" className="w-full sm:w-auto justify-start text-left font-normal gap-2 bg-background dark:bg-slate-900/50 border-slate-200 dark:border-white/5 text-foreground dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/80 h-9">
                                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                                    <span className="hidden sm:inline">
                                        {dateRange.from && dateRange.to ? (
                                            `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
                                        ) : dateRange.from ? (
                                            `${formatDate(dateRange.from)} - ...`
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </span>
                                    <span className="sm:hidden">
                                        Dates
                                    </span>
                                </Button>
                            }
                            content={<Calendar dateRange={dateRange} onDateChange={setDateRange} />}
                        />
                    </div>
                    <div>
                        <label htmlFor="status-filter" className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Status</label>
                        <SearchableSelect
                            options={statusOptions}
                            value={statusFilter}
                            onChange={setStatusFilter}
                        />
                    </div>
                    <div>
                        <label htmlFor="priority-filter" className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Priority</label>
                        <SearchableSelect
                            options={priorityOptions}
                            value={priorityFilter}
                            onChange={setPriorityFilter}
                        />
                    </div>
                    <div>
                        <label htmlFor="score-filter" className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Score</label>
                        <SearchableSelect
                            options={scoreOptions}
                            value={scoreFilter}
                            onChange={setScoreFilter}
                        />
                    </div>
                    <div>
                        <label htmlFor="service-filter" className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Service</label>
                        <SearchableSelect
                            options={serviceOptions}
                            value={serviceFilter}
                            onChange={setServiceFilter}
                        />
                    </div>
                    <div>
                        <label htmlFor="assignee-filter" className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Assignee</label>
                        <SearchableSelect
                            options={assigneeOptions}
                            value={assigneeFilter}
                            onChange={setAssigneeFilter}
                        />
                    </div>
                    {/* Show "Created By" filter only for "All Leads" page and for Admin/Super Admin */}
                    {title === 'All Leads' && ['Super Admin', 'Admin'].includes(currentUser.role) && (
                        <div>
                            <label htmlFor="created-by-filter" className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Created By</label>
                            <SearchableSelect
                                options={createdByOptions}
                                value={createdByFilter}
                                onChange={setCreatedByFilter}
                            />
                        </div>
                    )}
                    {(dateRange.from || dateRange.to) &&
                        <Button variant="ghost" size="sm" onClick={() => setDateRange({ from: '', to: '' })} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            Clear
                        </Button>
                    }
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 relative z-10">
                <MetricCard title="Total Leads" value={filteredLeads.length} icon={BriefcaseIcon} color="bg-slate-700" />
                <MetricCard title="New" value={leadCounts['New Lead'] || 0} icon={PlusCircleIcon} color="bg-blue-500" />
                <MetricCard title="In Progress" value={leadCounts['In-Progress'] || 0} icon={ClockIcon} color="bg-yellow-500" />
                <MetricCard title="Avg. Score" value={averageLeadScore} icon={TargetIcon} color="bg-indigo-500" />
                <MetricCard title="Successful" value={leadCounts['Success'] || 0} icon={CheckCircleIcon} color="bg-green-500" />
                <MetricCard title="Lost" value={leadCounts.Lost || 0} icon={AlertTriangleIcon} color="bg-red-500" />
            </div>

            <LeadTable
                leads={filteredLeads}
                users={users}
                services={services}
                offers={offers}
                onAddLead={onAddLead || (() => navigate('/leads/new'))}
                onUpdateLead={onUpdateLead}
                onViewLead={onViewLead}
                onUpdateMultipleLeads={onUpdateMultipleLeads}
                onDeleteMultipleLeads={onDeleteMultipleLeads}
                title="Leads"
                description={`Showing ${filteredLeads.length} of ${leads.length} leads`}
                showFilters={false}
                showAddButton={canAddLead}
                currentUser={currentUser}
            />

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Value Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Total Pipeline Value:</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totalPipelineValue)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Converted Value:</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(convertedValue)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Conversion Rate:</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{conversionRate.toString()}%</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default LeadsOverview;