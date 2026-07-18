import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserActivity, User, UserRole } from '../types';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Popover } from '../components/ui/Popover';
import { Calendar } from '../components/ui/Calendar';
import {
    Search as SearchIcon,
    Filter as FilterIcon,
    LogIn as LogInIcon,
    Briefcase as BriefcaseIcon,
    FileText as FileTextIcon,
    Edit as EditIcon,
    User as UserIcon,
    PlusCircle,
    Trash2,
    CheckCircle2,
    FileCheck,
    Calendar as CalendarIcon,
    Shield,
    X,
    Clock,
    Activity
} from 'lucide-react';
import { format, isToday, isYesterday, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { usePagination } from '../hooks/usePagination';

interface ActivityFeedProps {
    userActivities: UserActivity[];
    users: User[];
}

// Helper to categorize actions into "Modules"
const getModuleFromAction = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('login') || act.includes('logout')) return 'Authentication';
    if (act.includes('lead')) return 'Lead Management';
    if (act.includes('customer')) return 'Customer Management';
    if (act.includes('document')) return 'Document Management';
    if (act.includes('settings') || act.includes('user')) return 'System Settings';
    if (act.includes('task')) return 'Task Management';
    return 'Other';
};

// Helper: Group activities by date
const groupActivitiesByDate = (activities: UserActivity[]): Record<string, UserActivity[]> => {
    const groups: { [key: string]: UserActivity[] } = {};
    activities.forEach(activity => {
        const date = new Date(activity.timestamp);
        let key = format(date, 'yyyy-MM-dd');
        if (isToday(date)) key = 'Today';
        else if (isYesterday(date)) key = 'Yesterday';
        else key = format(date, 'MMMM d, yyyy');

        if (!groups[key]) groups[key] = [];
        groups[key].push(activity);
    });
    return groups;
};

const ActivityIcon: React.FC<{ action: string }> = ({ action }) => {
    let Icon = Activity;
    let colorClass = "bg-slate-100 text-slate-600 border-slate-200";

    const normalizedAction = action.toLowerCase();

    if (normalizedAction.includes('login')) {
        Icon = LogInIcon;
        colorClass = "bg-green-100 text-green-700 border-green-200";
    } else if (normalizedAction.includes('lead created') || normalizedAction.includes('new lead')) {
        Icon = PlusCircle;
        colorClass = "bg-blue-100 text-blue-700 border-blue-200";
    } else if (normalizedAction.includes('status')) {
        Icon = BriefcaseIcon;
        colorClass = "bg-amber-100 text-amber-700 border-amber-200";
    } else if (normalizedAction.includes('document')) {
        Icon = FileTextIcon;
        colorClass = "bg-purple-100 text-purple-700 border-purple-200";
    } else if (normalizedAction.includes('verification') || normalizedAction.includes('approved')) {
        Icon = FileCheck;
        colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
    } else if (normalizedAction.includes('delete')) {
        Icon = Trash2;
        colorClass = "bg-red-100 text-red-700 border-red-200";
    } else if (normalizedAction.includes('update')) {
        Icon = EditIcon;
        colorClass = "bg-orange-100 text-orange-700 border-orange-200";
    }

    return (
        <div className={`flex items-center justify-center w-9 h-9 rounded-full border shadow-sm ${colorClass} shrink-0`}>
            <Icon className="h-4 w-4" />
        </div>
    );
};

const ActivityFeed: React.FC<ActivityFeedProps> = ({ userActivities, users }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [userFilter, setUserFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [moduleFilter, setModuleFilter] = useState('all');
    const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

    // Derive available modules
    const modules = useMemo(() => {
        const unique = new Set(userActivities.map(a => getModuleFromAction(a.action)));
        return Array.from(unique).sort();
    }, [userActivities]);

    const filteredActivities = useMemo(() => {
        return userActivities
            .filter(activity => {
                const user = users.find(u => u.id === activity.user_id);
                const module = getModuleFromAction(activity.action);

                // Search Filter
                const searchMatch = searchQuery === '' ||
                    activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    activity.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (user && user.name.toLowerCase().includes(searchQuery.toLowerCase()));

                // User Filter
                const userMatch = userFilter === 'all' || activity.user_id === userFilter;

                // Role Filter
                const roleMatch = roleFilter === 'all' || (user && user.role === roleFilter);

                // Module Filter
                const moduleMatch = moduleFilter === 'all' || module === moduleFilter;

                // Date Filter
                let dateMatch = true;
                if (dateRange.from && dateRange.to) {
                    const activityDate = new Date(activity.timestamp);
                    const start = startOfDay(parseISO(dateRange.from));
                    const end = endOfDay(parseISO(dateRange.to));
                    dateMatch = isWithinInterval(activityDate, { start, end });
                } else if (dateRange.from) {
                    const activityDate = new Date(activity.timestamp);
                    const start = startOfDay(parseISO(dateRange.from));
                    const end = endOfDay(parseISO(dateRange.from)); // Single day selection
                    dateMatch = isWithinInterval(activityDate, { start, end });
                }

                return searchMatch && userMatch && roleMatch && moduleMatch && dateMatch;
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [userActivities, users, searchQuery, userFilter, roleFilter, moduleFilter, dateRange]);

    const { currentData: paginatedActivities, next, prev, jump, currentPage, maxPage } = usePagination(filteredActivities, 50);

    const groupedActivities = useMemo(() => groupActivitiesByDate(paginatedActivities), [paginatedActivities]);

    // Available users based on role filter (optional UX enhancement)
    const filteredUserOptions = useMemo(() => {
        if (roleFilter === 'all') return users;
        return users.filter(u => u.role === roleFilter);
    }, [users, roleFilter]);

    const clearFilters = () => {
        setSearchQuery('');
        setUserFilter('all');
        setRoleFilter('all');
        setModuleFilter('all');
        setDateRange({ from: '', to: '' });
    };

    return (
        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Activity className="h-6 w-6 text-[#1c398e]" />
                        Activity Timeline
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Monitoring system-wide actions, updates, and user performance.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                        {filteredActivities.length} Activities Found
                    </span>
                    {(searchQuery || userFilter !== 'all' || roleFilter !== 'all' || moduleFilter !== 'all' || dateRange.from) && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:bg-red-50 hover:text-red-600 gap-1 h-8">
                            <X className="h-3 w-3" /> Clear Filters
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-4 z-20 space-y-4 md:space-y-0">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* Search */}
                    <div className="relative col-span-1 md:col-span-3">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="search"
                            placeholder="Search actions, details..."
                            className="pl-9 h-10 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Date Range */}
                    <div className="col-span-1 md:col-span-2">
                        <Popover
                            align="start"
                            trigger={
                                <Button variant="outline" className={`w-full justify-start text-left font-normal h-10 ${dateRange.from ? 'text-slate-900 border-slate-300 bg-slate-50' : 'text-slate-500'}`}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.from ? (
                                        dateRange.to ? `${format(parseISO(dateRange.from), 'MMM d')} - ${format(parseISO(dateRange.to), 'MMM d')}` : format(parseISO(dateRange.from), 'MMM d, yyyy')
                                    ) : (
                                        <span>Date Range</span>
                                    )}
                                </Button>
                            }
                            content={
                                <Calendar dateRange={dateRange} onDateChange={setDateRange} />
                            }
                        />
                    </div>

                    {/* Role Filter */}
                    <div className="col-span-1 md:col-span-2">
                        <Select
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setUserFilter('all'); }}
                            className="h-10 w-full"
                        >
                            <option value="all">All Roles</option>
                            {Object.values(UserRole).filter(role => typeof role === 'string').map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </Select>
                    </div>

                    {/* User Filter */}
                    <div className="col-span-1 md:col-span-2">
                        <Select
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            className="h-10 w-full"
                            disabled={users.length === 0}
                        >
                            <option value="all">All Users</option>
                            {filteredUserOptions.map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </Select>
                    </div>

                    {/* Module Filter */}
                    <div className="col-span-1 md:col-span-3">
                        <Select
                            value={moduleFilter}
                            onChange={(e) => setModuleFilter(e.target.value)}
                            className="h-10 w-full"
                        >
                            <option value="all">All Modules</option>
                            {modules.map(module => <option key={module} value={module}>{module}</option>)}
                        </Select>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="space-y-8 max-w-5xl mx-auto">
                {Object.keys(groupedActivities).length > 0 ? (
                    Object.entries(groupedActivities).map(([date, activitiesVal]) => {
                        const activities = activitiesVal as UserActivity[];
                        return (
                            <div key={date} className="relative pl-8 md:pl-0">
                            {/* Date Header mobile/desktop hybrid */}
                            <div className="sticky top-20 z-10 mb-6 -ml-8 md:ml-0 md:text-center pointer-events-none">
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-slate-800 text-white shadow-md">
                                    <CalendarIcon className="w-3 h-3" />
                                    {date}
                                </span>
                            </div>

                            {/* Vertical Line */}
                            <div className="absolute left-[3px] md:left-1/2 md:-ml-px top-10 h-full w-0.5 bg-slate-200 block"></div>

                            <div className="space-y-8">
                                {activities.map((activity, index) => {
                                    const user = users.find(u => u.id === activity.user_id);
                                    const time = format(new Date(activity.timestamp), 'h:mm a');
                                    const module = getModuleFromAction(activity.action);

                                    // Alternating layout for desktop (Left/Right)
                                    // Index % 2 === 0 ? Left : Right. 
                                    // On mobile, always right of the line (or stacked).
                                    // Actually, simpler single column is often better for scanability, but let's try a cleaner single column with left alignment for now as requested "page alignment".
                                    // A centered timeline can be hard to read. Let's do a left-aligned timeline for better readability.

                                    return (
                                        <div key={activity.id} className="relative pl-8 md:pl-10 py-1">
                                            {/* Dot on line */}
                                            <div className="absolute left-[-5px] top-6 w-3 h-3 bg-white border-2 border-[#1c398e] rounded-full z-10 md:left-[calc(50%-6px)] md:hidden"></div>

                                            {/* We will stick to a clean single column layout, filtering out the "timeline in middle" complexity for better data density. 
                                               Actually, let's keep the user's existing vertical line style but polished.
                                            */}

                                            <div className="flex flex-row gap-4 items-start group">
                                                {/* Icon Column */}
                                                <div className="flex flex-col items-center gap-2">
                                                    <ActivityIcon action={activity.action} />
                                                    {index !== activities.length - 1 && (
                                                        <div className="w-0.5 flex-1 bg-slate-200 mt-2 h-full min-h-[2rem]"></div>
                                                    )}
                                                </div>

                                                {/* Content Card */}
                                                <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all p-0 overflow-hidden">
                                                    <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {user?.avatar_url ? (
                                                                <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-full object-cover ring-2 ring-white" />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 ring-2 ring-white">
                                                                    {user?.name?.charAt(0) || '?'}
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold text-slate-900 leading-none">{user?.name}</span>
                                                                <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">{user?.role}</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">
                                                            <Clock className="w-3 h-3" /> {time}
                                                        </span>
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${module === 'Lead Management' ? 'bg-blue-500' :
                                                                    module === 'Authentication' ? 'bg-slate-500' :
                                                                        module === 'System Settings' ? 'bg-orange-500' :
                                                                            'bg-slate-400'
                                                                }`}>
                                                                {module}
                                                            </span>
                                                            <h3 className="text-sm font-semibold text-slate-900 flex-1">{activity.action}</h3>
                                                        </div>
                                                        <p className="text-sm text-slate-600 leading-relaxed">
                                                            {activity.details}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ); })
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                        <div className="bg-slate-50 p-4 rounded-full mb-4">
                            <SearchIcon className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No activities found</h3>
                        <p className="text-slate-500 mt-1 max-w-sm text-center">
                            We couldn't find any activities matching your current filters. Try adjusting dates or selection.
                        </p>
                        <Button variant="outline" onClick={clearFilters} className="mt-6">
                            Clear All Filters
                        </Button>
                    </div>
                )}

                {maxPage > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-8">
                        <div className="text-xs text-slate-500">
                            Showing <strong>{(currentPage - 1) * 50 + 1}</strong> to <strong>{Math.min(currentPage * 50, filteredActivities.length)}</strong> of <strong>{filteredActivities.length}</strong> activities
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={prev} disabled={currentPage === 1}>
                                Previous
                            </Button>
                            <div className="text-sm font-medium text-slate-600 px-2">
                                Page {currentPage} of {maxPage}
                            </div>
                            <Button variant="outline" size="sm" onClick={next} disabled={currentPage === maxPage}>
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityFeed;
