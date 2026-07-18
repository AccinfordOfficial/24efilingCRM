import React, { useMemo, useState } from 'react';
import { Lead, User, Payment, Customer } from '../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Popover } from '../components/ui/Popover';
import { Calendar } from '../components/ui/Calendar';
import { Select } from '../components/ui/Select';
import { useApi } from '../hooks/useApi';
import { useGlobalFilter } from '../contexts/GlobalFilterContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import {
    Calendar as CalendarIcon,
    Filter,
    BarChart3,
    PieChart as PieChartIcon,
    Users,
    TrendingUp,
    IndianRupee,
    Target,
    Activity,
    ArrowRightLeft,
    Award,
    Download,
    CheckCircle2,
    Clock,
    Briefcase,
    TrendingDown,
    Zap,
    UserCheck,
    Building2,
    ShieldAlert,
    MapPin
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { startOfWeek, startOfMonth, startOfYear, subDays, format } from 'date-fns';

import { cn, formatCurrency, formatDate } from '../lib/utils';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white p-3 border border-slate-800 shadow-xl rounded-lg text-sm z-50">
                <p className="font-semibold mb-2 border-b border-slate-800 pb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill || entry.stroke }} />
                            <span className="text-slate-400 capitalize">{entry.name}:</span>
                        </div>
                        <span className="font-semibold">
                            {entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('amount') 
                                ? formatCurrency(entry.value) 
                                : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// --- SUB-COMPONENTS ---

const FilterBar = ({ children, title }: { children: React.ReactNode, title?: string }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        {title && (
            <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm uppercase tracking-wide min-w-[120px]">
                <Filter className="h-4 w-4 text-slate-400" />
                <span>{title}</span>
            </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:flex w-full gap-3">
            {children}
        </div>
    </div>
);

const MetricCard: React.FC<{ title: string, value: string | number, subValue?: string, icon: React.ElementType, colorClass: string }> = ({ title, value, subValue, icon: Icon, colorClass }) => (
    <Card className="shadow-sm hover:shadow-md hover:-translate-y-1 border border-slate-200 transition-all duration-300 rounded-xl bg-white group">
        <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
                <div className={cn("p-2 rounded-lg transition-colors bg-slate-50 group-hover:bg-slate-100", colorClass.replace('text-', 'text-'))}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            <div>
                <h3 className="text-2xl font-bold text-slate-900 leading-tight">{value}</h3>
                {subValue && <p className="text-xs font-medium text-slate-400 mt-1">{subValue}</p>}
            </div>
        </CardContent>
    </Card>
);

const DatePresets = ({ onSelect }: { onSelect: (range: { from: string, to: string }) => void }) => {
    const presets = [
        { label: 'Today', getValue: () => ({ from: format(new Date(), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
        { label: 'Yesterday', getValue: () => ({ from: format(subDays(new Date(), 1), 'yyyy-MM-dd'), to: format(subDays(new Date(), 1), 'yyyy-MM-dd') }) },
        { label: 'This Week', getValue: () => ({ from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
        { label: 'This Month', getValue: () => ({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
        { label: 'This Year', getValue: () => ({ from: format(startOfYear(new Date()), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
    ];

    return (
        <div className="flex flex-wrap gap-2">
            {presets.map(preset => (
                <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                    onClick={() => onSelect(preset.getValue())}
                >
                    {preset.label}
                </Button>
            ))}
        </div>
    );
};

// --- MAIN COMPONENT ---

const AdvancedAdminReports: React.FC<{ users: User[], allLeads: Lead[], customers: Customer[], role: string, dateRange: { from: string, to: string }, setDateRange: any, currentUser: User }> = ({ users, allLeads, customers, role, dateRange, setDateRange, currentUser }) => {
    const { leadSources } = useApi({ fetchOnMount: false });

    // 1. Tab and View States
    const [activeTab, setActiveTab] = useState<'kpis' | 'leaderboard' | 'comparative' | 'attribution' | 'sources' | 'activity' | 'referrals'>('kpis');
    const [selectedLeaderboardExecId, setSelectedLeaderboardExecId] = useState<string>('All');
    const [filterMode, setFilterMode] = useState<'lead_date' | 'payment_date'>('lead_date');
    const [leaderboardMode, setLeaderboardMode] = useState<'Revenue' | 'Sales'>('Revenue');

    // 2. Comparative Tab States
    const [compType, setCompType] = useState<'exec' | 'branch'>('exec');
    const [compA, setCompA] = useState('All');
    const [compB, setCompB] = useState('All');

    // 3. Deep Dive Filter States
    const isSalesExec = role === 'Sales Executive';
    const isSuperAdmin = role === 'Super Admin';
    const { branchId, employeeId, availableCities, availableBranches } = useGlobalFilter();

    const [filters, setFilters] = useState({
        leadSource: 'All',
        leadStatus: 'All',
        paymentMode: 'All'
    });

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // 4. CORE FILTERING LOGIC
    const { filteredLeads, filteredPayments } = useMemo(() => {
        const { from, to } = dateRange;
        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;
        if (fromDate) fromDate.setHours(0, 0, 0, 0);
        if (toDate) toDate.setHours(23, 59, 59, 999);

        // Apply static filters (Branch, Executive, Source, etc)
        const deepFilteredLeads = allLeads.filter(lead => {
            // Role Scoping: Sales Executives only see their assigned leads
            if (isSalesExec && lead.assigned_to?.id !== currentUser.id) return false;

            // Branch
            const leadBranch = lead.branch_id || lead.branch_name;
            const assignedUser = users.find(u => u.id === lead.assigned_to?.id);
            if (branchId !== 'All Branches' && (leadBranch || assignedUser?.branch_name) !== branchId) return false;
            
            // Executive
            if (employeeId !== 'All Employees') {
                if (lead.assigned_to?.id !== employeeId && lead.created_by !== employeeId) return false;
            }

            // Source
            if (filters.leadSource !== 'All' && lead.source !== filters.leadSource) return false;
            
            // Status
            if (filters.leadStatus !== 'All' && lead.status !== filters.leadStatus) return false;

            return true;
        });

        let resultLeads: Lead[] = [];
        let resultPayments: (Payment & { leadId: string })[] = [];

        if (filterMode === 'lead_date') {
            resultLeads = deepFilteredLeads.filter(lead => {
                const d = new Date(lead.created_at);
                if (fromDate && d < fromDate) return false;
                if (toDate && d > toDate) return false;
                return true;
            });
            resultPayments = resultLeads.flatMap(l => 
                (l.payments || []).filter(p => {
                    if (!p.date) return false;
                    const pd = new Date(p.date);
                    if (fromDate && pd < fromDate) return false;
                    if (toDate && pd > toDate) return false;
                    return true;
                }).map(p => ({ ...p, leadId: l.id }))
            );
        } else {
            const allPossiblePayments = deepFilteredLeads.flatMap(l => (l.payments || []).map(p => ({ ...p, leadId: l.id })));
            resultPayments = allPossiblePayments.filter(p => {
                const pd = new Date(p.date);
                if (fromDate && pd < fromDate) return false;
                if (toDate && pd > toDate) return false;
                if (filters.paymentMode !== 'All' && p.method !== filters.paymentMode) return false;
                return true;
            });
            const distinctLeadIds = new Set(resultPayments.map(p => p.leadId));
            resultLeads = deepFilteredLeads.filter(l => distinctLeadIds.has(l.id));
        }

        return { filteredLeads: resultLeads, filteredPayments: resultPayments };
    }, [allLeads, dateRange, filterMode, filters, users, isSalesExec, currentUser.id, branchId, employeeId]);

    // 5. METRICS CALCULATION (Global summary card stats)
    const metrics = useMemo(() => {
        const totalLeads = filteredLeads.length;
        const wonLeads = filteredLeads.filter(l => l.status === 'Success');
        const conversionRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : '0.0';
        const pendingPipeline = filteredLeads.filter(l => ['New Lead', 'Lead Confirmed'].includes(l.status)).length;
        const inProgressPipeline = filteredLeads.filter(l => ['Documents & Payments', 'In-Progress'].includes(l.status)).length;
        const totalRevenue = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        return { totalLeads, conversionRate, pendingPipeline, inProgressPipeline, totalRevenue, wonCount: wonLeads.length };
    }, [filteredLeads, filteredPayments]);

    // 6. EMPLOYEE WISE ANALYTICS
    const employeeMetrics = useMemo(() => {
        if (employeeId === 'All Employees') return null;
        const empId = employeeId;
        const empLeads = allLeads.filter(l => l.assigned_to?.id === empId);
        const empLeadsInRange = filteredLeads.filter(l => l.assigned_to?.id === empId);
        const empPayments = filteredPayments.filter(p => empLeads.some(l => l.id === p.leadId));

        const totalAssigned = empLeadsInRange.length;
        const contacted = empLeadsInRange.filter(l => (l.activities?.length || 0) > 0).length;
        const converted = empLeadsInRange.filter(l => l.status === 'Success').length;
        const convRate = totalAssigned > 0 ? ((converted / totalAssigned) * 100).toFixed(1) : '0.0';
        const revenue = empPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        let followupsDone = 0;
        empLeadsInRange.forEach(l => {
            followupsDone += (l.activities?.length || 0);
        });

        const pendingFollowups = empLeads.filter(l => l.next_follow_up && l.status !== 'Success' && l.status !== 'Lost').length;

        let tasksDone = 0;
        let tasksPending = 0;
        empLeadsInRange.forEach(l => {
            (l.tasks || []).forEach(t => {
                if (t.is_completed) tasksDone++;
                else tasksPending++;
            });
        });

        const sources = leadSources.length > 0 
            ? leadSources.map(ls => ls.source_name)
            : ['Advertisement', 'Cold Calling', 'Employer Referral', 'Customer Referral', 'Facebook & Meta', 'WhatsApp Campaign', 'Mobile App', 'Website', 'Other'];

        const sourceBreakdown = sources.map(src => {
            const srcLeads = empLeadsInRange.filter(l => l.source === src);
            const won = srcLeads.filter(l => l.status === 'Success').length;
            const conversion = srcLeads.length > 0 ? (won / srcLeads.length) * 100 : 0;
            const revenue = filteredPayments.filter(p => empLeadsInRange.some(l => l.source === src && l.id === p.leadId)).reduce((sum, p) => sum + (p.amount || 0), 0);
            return { source: src, leads: srcLeads.length, won, conversion, revenue };
        }).filter(item => item.leads > 0).sort((a, b) => b.leads - a.leads);

        return {
            totalAssigned,
            contacted,
            converted,
            convRate,
            revenue,
            followupsDone,
            pendingFollowups,
            tasksDone,
            tasksPending,

            sourceBreakdown
        };
    }, [employeeId, filteredLeads, filteredPayments, allLeads, leadSources]);

    // 6.5 SUPER ADMIN CITY & BRANCH SUMMARY
    const superAdminPerformanceSummary = useMemo(() => {
        if (!isSuperAdmin || branchId !== 'All Branches') return null;

        const branchStats = availableBranches.map(b => {
            const bLeads = filteredLeads.filter(l => l.branch_id === b.id || l.branch_name === b.name);
            const clients = bLeads.filter(l => l.status === 'Success');
            const rev = filteredPayments.filter(p => bLeads.some(l => l.id === p.leadId)).reduce((sum, p) => sum + (p.amount || 0), 0);
            return { id: b.id, name: b.name, cityId: b.city_id, cityName: b.city_name, leads: bLeads.length, clients: clients.length, revenue: rev };
        });

        const cityStats = availableCities.map(c => {
            const cBranches = branchStats.filter(b => b.cityId === c.id || b.cityName === c.city_name);
            const clients = cBranches.reduce((sum, b) => sum + b.clients, 0);
            const rev = cBranches.reduce((sum, b) => sum + b.revenue, 0);
            return { id: c.id, name: c.city_name, clients, revenue: rev };
        }).sort((a, b) => b.revenue - a.revenue);

        const employeeStats = users.filter(u => u.role === 'Sales Executive').map(e => {
            const myLeads = filteredLeads.filter(l => l.assigned_to?.id === e.id);
            const clients = myLeads.filter(l => l.status === 'Success');
            const rev = filteredPayments.filter(p => myLeads.some(l => l.id === p.leadId)).reduce((sum, p) => sum + (p.amount || 0), 0);
            return { id: e.id, name: e.name, leads: myLeads.length, clients: clients.length, revenue: rev };
        }).sort((a, b) => b.revenue - a.revenue);

        return { cityStats, branchStats: branchStats.sort((a, b) => b.revenue - a.revenue), employeeStats };
    }, [isSuperAdmin, branchId, availableBranches, availableCities, filteredLeads, filteredPayments, users]);

    // 7. BRANCH WISE ANALYTICS
    const branchMetrics = useMemo(() => {
        if (branchId === 'All Branches') return null;
        const bName = branchId;
        const branchUsers = users.filter(u => u.branch_name === bName || u.branch_id === bName);
        const branchUserIds = new Set(branchUsers.map(u => u.id));

        const branchLeads = allLeads.filter(l => {
            const leadBranch = l.branch_id || l.branch_name;
            return leadBranch === bName || (l.assigned_to && branchUserIds.has(l.assigned_to.id));
        });
        const branchLeadsInRange = filteredLeads.filter(l => {
            const leadBranch = l.branch_id || l.branch_name;
            return leadBranch === bName || (l.assigned_to && branchUserIds.has(l.assigned_to.id));
        });

        const branchPayments = filteredPayments.filter(p => branchLeads.some(l => l.id === p.leadId));

        const totalLeads = branchLeadsInRange.length;
        const wonLeads = branchLeadsInRange.filter(l => l.status === 'Success');
        const conversionRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : '0.0';
        const totalRevenue = branchPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const customersCount = wonLeads.length;

        const activeEmployees = branchUsers.filter(u => u.is_online).length;

        const empConversions: Record<string, { name: string; count: number }> = {};
        branchLeadsInRange.forEach(l => {
            if (l.status === 'Success' && l.assigned_to) {
                const id = l.assigned_to.id;
                if (!empConversions[id]) empConversions[id] = { name: l.assigned_to.name, count: 0 };
                empConversions[id].count++;
            }
        });
        let topEmployee = 'None';
        let maxConversions = 0;
        Object.values(empConversions).forEach(e => {
            if (e.count > maxConversions) {
                topEmployee = e.name;
                maxConversions = e.count;
            }
        });

        const pendingFollowups = branchLeads.filter(l => l.next_follow_up && l.status !== 'Success' && l.status !== 'Lost').length;

        return {
            totalLeads,
            customersCount,
            totalRevenue,
            conversionRate,
            activeEmployees,
            topEmployee: maxConversions > 0 ? `${topEmployee} (${maxConversions} won)` : 'None',
            pendingFollowups,
            collections: totalRevenue
        };
    }, [filters.branch, filteredLeads, filteredPayments, allLeads, users]);

    // 8. LEADERBOARD DATA
    const leaderboard = useMemo(() => {
        const execs = users.filter(u => u.role === 'Sales Executive');
        return execs.map(user => {
            const myLeads = filteredLeads.filter(l => l.assigned_to?.id === user.id);
            const myPayments = filteredPayments.filter(p => myLeads.some(l => l.id === p.leadId));

            const leadsAssigned = myLeads.length;
            const leadsWon = myLeads.filter(l => l.status === 'Success').length;
            const revenue = myPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const conversion = leadsAssigned > 0 ? (leadsWon / leadsAssigned) * 100 : 0;

            // Composite performance score calculation
            const revScore = Math.min((revenue / 150000) * 100, 100);
            const convScore = Math.min(conversion * 2, 100);
            const score = Math.round((revScore * 0.6) + (convScore * 0.4));

            return { user, leadsAssigned, leadsWon, revenue, conversion, score };
        }).sort((a, b) => b.score - a.score);
    }, [users, filteredLeads, filteredPayments]);

    // 9. COMPARATIVE RESULTS
    const comparisonResults = useMemo(() => {
        if (compType === 'exec') {
            const getExecStats = (id: string) => {
                if (id === 'All') return null;
                const leadsList = filteredLeads.filter(l => l.assigned_to?.id === id);
                const won = leadsList.filter(l => l.status === 'Success').length;
                const rev = filteredPayments.filter(p => filteredLeads.some(l => l.assigned_to?.id === id && l.id === p.leadId)).reduce((sum, p) => sum + (p.amount || 0), 0);
                const conv = leadsList.length > 0 ? (won / leadsList.length) * 100 : 0;
                return { name: users.find(u => u.id === id)?.name || 'Unknown', leads: leadsList.length, won, rev, conv };
            };
            return {
                a: getExecStats(compA),
                b: getExecStats(compB)
            };
        } else {
            const getBranchStats = (bName: string) => {
                if (bName === 'All') return null;
                const branchUsers = users.filter(u => u.branch_name === bName);
                const branchUserIds = new Set(branchUsers.map(u => u.id));
                const leadsList = filteredLeads.filter(l => {
                    const leadBranch = l.branch_id || l.branch_name;
                    return leadBranch === bName || (l.assigned_to && branchUserIds.has(l.assigned_to.id));
                });
                const won = leadsList.filter(l => l.status === 'Success').length;
                const rev = filteredPayments.filter(p => leadsList.some(l => l.id === p.leadId)).reduce((sum, p) => sum + (p.amount || 0), 0);
                const conv = leadsList.length > 0 ? (won / leadsList.length) * 100 : 0;
                return { name: bName, leads: leadsList.length, won, rev, conv };
            };
            return {
                a: getBranchStats(compA),
                b: getBranchStats(compB)
            };
        }
    }, [compType, compA, compB, filteredLeads, filteredPayments, users]);

    // 10. REVENUE ATTRIBUTION
    const revenueAttribution = useMemo(() => {
        // By Employee
        const empMap: Record<string, number> = {};
        filteredPayments.forEach(p => {
            const lead = allLeads.find(l => l.id === p.leadId);
            const name = lead?.assigned_to?.name || 'Unassigned';
            empMap[name] = (empMap[name] || 0) + (p.amount || 0);
        });
        const byEmployee = Object.entries(empMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

        // By Branch
        const branchMap: Record<string, number> = {};
        filteredPayments.forEach(p => {
            const lead = allLeads.find(l => l.id === p.leadId);
            const bName = lead?.branch_name || 'Central';
            branchMap[bName] = (branchMap[bName] || 0) + (p.amount || 0);
        });
        const byBranch = Object.entries(branchMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        // By Service
        const svcMap: Record<string, number> = {};
        filteredPayments.forEach(p => {
            const lead = allLeads.find(l => l.id === p.leadId);
            const service = lead?.service_requested || 'Other';
            svcMap[service] = (svcMap[service] || 0) + (p.amount || 0);
        });
        const byService = Object.entries(svcMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

        return { byEmployee, byBranch, byService };
    }, [filteredPayments, allLeads]);

    // 11. LEAD SOURCE PERFORMANCE
    const sourceMetrics = useMemo(() => {
        const sources = leadSources.length > 0 
            ? leadSources.map(ls => ls.source_name)
            : ['Advertisement', 'Cold Calling', 'Employer Referral', 'Customer Referral', 'Facebook & Meta', 'WhatsApp Campaign', 'Mobile App', 'Website', 'Other'];
        return sources.map(src => {
            const srcLeads = filteredLeads.filter(l => l.source === src);
            const won = srcLeads.filter(l => l.status === 'Success').length;
            const conversion = srcLeads.length > 0 ? (won / srcLeads.length) * 100 : 0;
            const revenue = filteredPayments.filter(p => filteredLeads.some(l => l.source === src && l.id === p.leadId)).reduce((sum, p) => sum + (p.amount || 0), 0);
            return { source: src, leads: srcLeads.length, won, conversion, revenue };
        }).sort((a, b) => b.revenue - a.revenue);
    }, [filteredLeads, filteredPayments, leadSources]);

    // 11b. BRANCH & CITY LEAD SOURCE BREAKDOWNS
    const { branchSourceBreakdown, citySourceBreakdown } = useMemo(() => {
        const branchesList = Array.from(new Set(users.map(u => u.branch_name).filter(Boolean)));
        const citiesList = Array.from(new Set(filteredLeads.map(l => l.city_name).filter(Boolean)));
        
        const branchBreakdown: Record<string, Record<string, { leads: number; revenue: number }>> = {};
        const cityBreakdown: Record<string, Record<string, { leads: number; revenue: number }>> = {};

        // Initialize
        branchesList.forEach(b => {
            branchBreakdown[b as string] = {};
        });
        citiesList.forEach(c => {
            cityBreakdown[c as string] = {};
        });

        // Populate
        filteredLeads.forEach(l => {
            const bName = l.branch_name || users.find(u => u.id === l.assigned_to?.id)?.branch_name || 'Central';
            const cName = l.city_name || 'Other';
            const src = l.source || 'Other';
            
            if (!branchBreakdown[bName]) {
                branchBreakdown[bName] = {};
            }
            if (!branchBreakdown[bName][src]) {
                branchBreakdown[bName][src] = { leads: 0, revenue: 0 };
            }
            branchBreakdown[bName][src].leads++;

            if (!cityBreakdown[cName]) {
                cityBreakdown[cName] = {};
            }
            if (!cityBreakdown[cName][src]) {
                cityBreakdown[cName][src] = { leads: 0, revenue: 0 };
            }
            cityBreakdown[cName][src].leads++;
        });

        filteredPayments.forEach(p => {
            const lead = allLeads.find(l => l.id === p.leadId);
            if (lead) {
                const bName = lead.branch_name || users.find(u => u.id === lead.assigned_to?.id)?.branch_name || 'Central';
                const cName = lead.city_name || 'Other';
                const src = lead.source || 'Other';
                const amt = p.amount || 0;

                if (!branchBreakdown[bName]) {
                    branchBreakdown[bName] = {};
                }
                if (!branchBreakdown[bName][src]) {
                    branchBreakdown[bName][src] = { leads: 0, revenue: 0 };
                }
                branchBreakdown[bName][src].revenue += amt;

                if (!cityBreakdown[cName]) {
                    cityBreakdown[cName] = {};
                }
                if (!cityBreakdown[cName][src]) {
                    cityBreakdown[cName][src] = { leads: 0, revenue: 0 };
                }
                cityBreakdown[cName][src].revenue += amt;
            }
        });

        // Flatten to array
        const branchArr: { branch: string; source: string; leads: number; revenue: number }[] = [];
        Object.entries(branchBreakdown).forEach(([bName, sourcesMap]) => {
            Object.entries(sourcesMap).forEach(([src, data]) => {
                branchArr.push({ branch: bName, source: src, leads: data.leads, revenue: data.revenue });
            });
        });

        const cityArr: { city: string; source: string; leads: number; revenue: number }[] = [];
        Object.entries(cityBreakdown).forEach(([cName, sourcesMap]) => {
            Object.entries(sourcesMap).forEach(([src, data]) => {
                cityArr.push({ city: cName, source: src, leads: data.leads, revenue: data.revenue });
            });
        });

        return { 
            branchSourceBreakdown: branchArr.sort((a, b) => b.leads - a.leads), 
            citySourceBreakdown: cityArr.sort((a, b) => b.leads - a.leads) 
        };
    }, [filteredLeads, filteredPayments, users, allLeads]);

    // 11c. LEADERBOARD DETAILED EXECUTIVE METRICS
    const leaderboardEmployeeMetrics = useMemo(() => {
        if (selectedLeaderboardExecId === 'All') return null;
        const empId = selectedLeaderboardExecId;
        const empLeads = allLeads.filter(l => l.assigned_to?.id === empId);
        const empLeadsInRange = filteredLeads.filter(l => l.assigned_to?.id === empId);
        const empPayments = filteredPayments.filter(p => empLeads.some(l => l.id === p.leadId));

        const totalAssigned = empLeadsInRange.length;
        const contacted = empLeadsInRange.filter(l => (l.activities?.length || 0) > 0).length;
        const converted = empLeadsInRange.filter(l => l.status === 'Success').length;
        const convRate = totalAssigned > 0 ? ((converted / totalAssigned) * 100).toFixed(1) : '0.0';
        const revenue = empPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        let followupsDone = 0;
        empLeadsInRange.forEach(l => {
            followupsDone += (l.activities?.length || 0);
        });

        const pendingFollowups = empLeads.filter(l => l.next_follow_up && l.status !== 'Success' && l.status !== 'Lost').length;

        let tasksDone = 0;
        let tasksPending = 0;
        empLeadsInRange.forEach(l => {
            (l.tasks || []).forEach(t => {
                if (t.is_completed) tasksDone++;
                else tasksPending++;
            });
        });

        const sources = leadSources.length > 0 
            ? leadSources.map(ls => ls.source_name)
            : ['Advertisement', 'Cold Calling', 'Employer Referral', 'Customer Referral', 'Facebook & Meta', 'WhatsApp Campaign', 'Mobile App', 'Website', 'Other'];

        const sourceBreakdown = sources.map(src => {
            const srcLeads = empLeadsInRange.filter(l => l.source === src);
            const won = srcLeads.filter(l => l.status === 'Success').length;
            const conversion = srcLeads.length > 0 ? (won / srcLeads.length) * 100 : 0;
            const revenue = filteredPayments.filter(p => empLeadsInRange.some(l => l.source === src && l.id === p.leadId)).reduce((sum, p) => sum + (p.amount || 0), 0);
            return { source: src, leads: srcLeads.length, won, conversion, revenue };
        }).filter(item => item.leads > 0).sort((a, b) => b.leads - a.leads);

        return {
            totalAssigned,
            contacted,
            converted,
            convRate,
            revenue,
            followupsDone,
            pendingFollowups,
            tasksDone,
            tasksPending,

            sourceBreakdown
        };
    }, [selectedLeaderboardExecId, filteredLeads, filteredPayments, allLeads, leadSources]);

    // 11d. REFERRAL ANALYTICS
    const referralAnalytics = useMemo(() => {
        // Customer Referrals: leads/customers with referred_by_customer_id
        const customerReferrals = filteredLeads.filter(l => l.referred_by_customer_id).map(l => {
            const referrer = customers.find(c => c.id === l.referred_by_customer_id);
            const referrerName = referrer ? referrer.name : 'Unknown Customer';
            const leadName = `${l.first_name} ${l.last_name}`;
            const revenue = filteredPayments.filter(p => p.leadId === l.id).reduce((sum, p) => sum + (p.amount || 0), 0);
            return {
                referrerId: l.referred_by_customer_id,
                referrerName,
                referredName: leadName,
                status: l.status,
                revenue
            };
        });

        // Employer Referrals: leads/customers with referred_by_employee_id
        const employerReferrals = filteredLeads.filter(l => l.referred_by_employee_id).map(l => {
            const referrer = users.find(u => u.id === l.referred_by_employee_id);
            const referrerName = referrer ? referrer.name : 'Unknown Employee';
            const leadName = `${l.first_name} ${l.last_name}`;
            const revenue = filteredPayments.filter(p => p.leadId === l.id).reduce((sum, p) => sum + (p.amount || 0), 0);
            return {
                referrerId: l.referred_by_employee_id,
                referrerName,
                referredName: leadName,
                status: l.status,
                revenue
            };
        });

        // Summaries
        const totalCustomerReferrals = customerReferrals.length;
        const totalCustomerRevenue = customerReferrals.reduce((sum, r) => sum + r.revenue, 0);
        const totalEmployerReferrals = employerReferrals.length;
        const totalEmployerRevenue = employerReferrals.reduce((sum, r) => sum + r.revenue, 0);

        return {
            customerReferrals,
            employerReferrals,
            totalCustomerReferrals,
            totalCustomerRevenue,
            totalEmployerReferrals,
            totalEmployerRevenue
        };
    }, [filteredLeads, filteredPayments, customers, users]);

    // 12. OPERATIONAL ACTIVITY SCORECARD
    const activityScorecard = useMemo(() => {
        const execs = users.filter(u => u.role === 'Sales Executive');
        return execs.map(user => {
            const userLeads = filteredLeads.filter(l => l.assigned_to?.id === user.id);
            let followupsLogged = 0;
            userLeads.forEach(l => {
                followupsLogged += (l.activities?.length || 0);
            });

            let tasksTotal = 0;
            let tasksDone = 0;
            userLeads.forEach(l => {
                (l.tasks || []).forEach(t => {
                    tasksTotal++;
                    if (t.is_completed) tasksDone++;
                });
            });
            const taskRate = tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0;
            const productivityScore = Math.round(Math.min((tasksDone * 10) + (followupsLogged * 4) + (taskRate * 0.4), 100));

            return {
                name: user.name,
                assigned: userLeads.length,
                followupsLogged,
                taskRate: taskRate.toFixed(1) + '%',
                productivityScore,
                status: user.is_online ? 'Online' : 'Offline'
            };
        }).sort((a, b) => b.productivityScore - a.productivityScore);
    }, [users, filteredLeads]);

    // 13. REPORT EXPORTS (Excel Blob, CSV, PDF Layout)
    const handleExport = (format: 'excel' | 'csv' | 'pdf') => {
        let title = 'CRM Report';
        let headers: string[] = [];
        let body: any[][] = [];
        let dataToExport: any[] = [];

        if (activeTab === 'leaderboard') {
            title = 'Team Leaderboard Report';
            headers = ['Rank', 'Executive Name', 'Leads Assigned', 'Leads Won', 'Revenue (₹)', 'Conversion Rate', 'Score'];
            body = leaderboard.map((item, idx) => [
                idx + 1,
                item.user.name,
                item.leadsAssigned,
                item.leadsWon,
                item.revenue,
                `${item.conversion.toFixed(1)}%`,
                item.score
            ]);
            dataToExport = leaderboard.map((item, idx) => ({
                'Rank': idx + 1,
                'Executive Name': item.user.name,
                'Leads Assigned': item.leadsAssigned,
                'Leads Won': item.leadsWon,
                'Revenue (₹)': item.revenue,
                'Conversion Rate': `${item.conversion.toFixed(1)}%`,
                'Performance Score': item.score
            }));
        } else if (activeTab === 'sources') {
            title = 'Lead Sources Report';
            headers = ['Source', 'Leads', 'Won', 'Conversion Rate', 'Revenue (₹)'];
            body = sourceMetrics.map(item => [
                item.source,
                item.leads,
                item.won,
                `${item.conversion.toFixed(1)}%`,
                item.revenue
            ]);
            dataToExport = sourceMetrics.map(item => ({
                'Source': item.source,
                'Leads': item.leads,
                'Won': item.won,
                'Conversion Rate': `${item.conversion.toFixed(1)}%`,
                'Revenue (₹)': item.revenue
            }));
        } else if (activeTab === 'referrals') {
            title = 'Referral Analytics Report';
            headers = ['Referral Type', 'Referring Person', 'Referred Lead', 'Status', 'Revenue (₹)'];
            
            const custExport = referralAnalytics.customerReferrals.map(item => [
                'Customer Referral',
                item.referrerName,
                item.referredName,
                item.status,
                item.revenue
            ]);
            const empExport = referralAnalytics.employerReferrals.map(item => [
                'Employer Referral',
                item.referrerName,
                item.referredName,
                item.status,
                item.revenue
            ]);
            body = [...custExport, ...empExport];
            
            const custData = referralAnalytics.customerReferrals.map(item => ({
                'Referral Type': 'Customer Referral',
                'Referring Person': item.referrerName,
                'Referred Lead': item.referredName,
                'Status': item.status,
                'Revenue (₹)': item.revenue
            }));
            const empData = referralAnalytics.employerReferrals.map(item => ({
                'Referral Type': 'Employer Referral',
                'Referring Person': item.referrerName,
                'Referred Lead': item.referredName,
                'Status': item.status,
                'Revenue (₹)': item.revenue
            }));
            dataToExport = [...custData, ...empData];
        } else if (activeTab === 'activity') {
            title = 'Executive Activity Scorecard';
            headers = ['Executive Name', 'Leads Assigned', 'Follow-Ups Logged', 'Task Completion Rate', 'Productivity Score', 'Status'];
            body = activityScorecard.map(item => [
                item.name,
                item.assigned,
                item.followupsLogged,
                item.taskRate,
                item.productivityScore,
                item.status
            ]);
            dataToExport = activityScorecard.map(item => ({
                'Executive Name': item.name,
                'Leads Assigned': item.assigned,
                'Follow-Ups Logged': item.followupsLogged,
                'Task Completion Rate': item.taskRate,
                'Productivity Score': item.productivityScore,
                'Status': item.status
            }));
        } else {
            title = 'CRM Leads Performance Summary';
            headers = ['S. No', 'Business Name', 'Status', 'Requested Service', 'Revenue (₹)'];
            body = filteredLeads.map((item, idx) => [
                idx + 1,
                item.business_name || `${item.first_name} ${item.last_name}`,
                item.status,
                item.service_requested || '-',
                item.total_payment || 0
            ]);
            dataToExport = filteredLeads.map((item, idx) => ({
                'S. No': idx + 1,
                'Client Name': `${item.first_name} ${item.last_name}`,
                'Business Name': item.business_name || '-',
                'Status': item.status,
                'Requested Service': item.service_requested || '-',
                'Revenue (₹)': item.total_payment || 0
            }));
        }

        const triggerDownload = (url: string, filename: string) => {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
            }, 200);
        };

        if (format === 'excel') {
            try {
                const ws = XLSX.utils.json_to_sheet(dataToExport);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Report Data');
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                triggerDownload(url, `${title.toLowerCase().replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
            } catch (err) {
                console.error('Excel export failed:', err);
            }
        } else if (format === 'csv') {
            try {
                const ws = XLSX.utils.json_to_sheet(dataToExport);
                const csv = XLSX.utils.sheet_to_csv(ws);
                const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                triggerDownload(url, `${title.toLowerCase().replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
            } catch (err) {
                console.error('CSV export failed:', err);
            }
        } else if (format === 'pdf') {
            try {
                const doc = new jsPDF('p', 'mm', 'a4');
                doc.setFontSize(14);
                doc.setTextColor(28, 57, 142);
                doc.text(title, 14, 15);
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 21);

                autoTable(doc, {
                    startY: 25,
                    head: [headers],
                    body: body,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [28, 57, 142] }
                });

                doc.save(`${title.toLowerCase().replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
            } catch (err) {
                console.error('PDF export failed:', err);
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Controls */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                
                {/* Filter Mode Toggle */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setFilterMode('lead_date')}
                        className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all", filterMode === 'lead_date' ? "bg-white text-blue-700 shadow-sm border" : "text-slate-500 hover:text-slate-700")}
                    >
                        By Lead Date
                    </button>
                    <button 
                        onClick={() => setFilterMode('payment_date')}
                        className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all", filterMode === 'payment_date' ? "bg-white text-emerald-700 shadow-sm border" : "text-slate-500 hover:text-slate-700")}
                    >
                        By Payment Date
                    </button>
                </div>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="flex border-b border-slate-200 pb-px gap-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('kpis')}
                    className={cn(
                        "pb-3 px-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap",
                        activeTab === 'kpis' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                    )}
                >
                    KPI Summary
                </button>
                {!isSalesExec && (
                    <>
                        <button
                            onClick={() => setActiveTab('leaderboard')}
                            className={cn(
                                "pb-3 px-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap",
                                activeTab === 'leaderboard' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                            )}
                        >
                            Employee Leaderboard
                        </button>
                        <button
                            onClick={() => setActiveTab('comparative')}
                            className={cn(
                                "pb-3 px-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap",
                                activeTab === 'comparative' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                            )}
                        >
                            Comparative Analysis
                        </button>
                    </>
                )}
                <button
                    onClick={() => setActiveTab('attribution')}
                    className={cn(
                        "pb-3 px-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap",
                        activeTab === 'attribution' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                    )}
                >
                    Revenue Attribution
                </button>
                <button
                    onClick={() => setActiveTab('sources')}
                    className={cn(
                        "pb-3 px-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap",
                        activeTab === 'sources' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                    )}
                >
                    Lead Sources
                </button>
                <button
                    onClick={() => setActiveTab('referrals')}
                    className={cn(
                        "pb-3 px-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap",
                        activeTab === 'referrals' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                    )}
                >
                    Referral Analytics
                </button>
                <button
                    onClick={() => setActiveTab('activity')}
                    className={cn(
                        "pb-3 px-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap",
                        activeTab === 'activity' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                    )}
                >
                    Executive Activity
                </button>

                <div className="ml-auto flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="h-8 text-[11px] bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm font-semibold">
                        Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="h-8 text-[11px] bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm font-semibold">
                        CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="h-8 text-[11px] bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm font-semibold">
                        PDF
                    </Button>
                </div>
            </div>

            {/* Tab 1: KPI Summary */}
            {activeTab === 'kpis' && (
                <div className="space-y-6">
                    {/* SUPER ADMIN OVERVIEW (Visible only when 'All Branches' is selected) */}
                    {superAdminPerformanceSummary && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 mb-4">
                                    <MapPin className="h-4 w-4 text-slate-400" /> City Performance Summary
                                </h3>
                                <div className="space-y-3">
                                    {superAdminPerformanceSummary.cityStats.map(city => (
                                        <div key={city.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors">
                                            <div>
                                                <div className="font-semibold text-slate-800">{city.name}</div>
                                                <div className="text-xs text-slate-500">{city.clients} Total Clients</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-emerald-600">{formatCurrency(city.revenue)}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {superAdminPerformanceSummary.cityStats.length === 0 && <div className="text-sm text-slate-500">No cities found.</div>}
                                </div>
                            </div>
                            
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 mb-4">
                                    <Building2 className="h-4 w-4 text-slate-400" /> Branch Performance Summary
                                </h3>
                                <div className="space-y-3">
                                    {superAdminPerformanceSummary.branchStats.map(branch => (
                                        <div key={branch.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors">
                                            <div>
                                                <div className="font-semibold text-slate-800">{branch.name}</div>
                                                <div className="text-xs text-slate-500">{branch.leads} Leads | {branch.clients} Clients</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-indigo-600">{formatCurrency(branch.revenue)}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {superAdminPerformanceSummary.branchStats.length === 0 && <div className="text-sm text-slate-500">No branches found.</div>}
                                </div>
                            </div>
                            
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 mb-4">
                                    <Users className="h-4 w-4 text-slate-400" /> Salesperson Leads & Revenue
                                </h3>
                                <div className="space-y-3">
                                    {superAdminPerformanceSummary.employeeStats.map(emp => (
                                        <div key={emp.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors">
                                            <div>
                                                <div className="font-semibold text-slate-800">{emp.name}</div>
                                                <div className="text-xs text-slate-500">{emp.leads} Leads | {emp.clients} Clients</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-violet-600">{formatCurrency(emp.revenue)}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {superAdminPerformanceSummary.employeeStats.length === 0 && <div className="text-sm text-slate-500">No salespersons found.</div>}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* General metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <MetricCard 
                            title={filterMode === 'lead_date' ? "Total Leads Created" : "Active Paying Leads"} 
                            value={metrics.totalLeads} 
                            icon={Users} 
                            colorClass="text-blue-600" 
                        />
                        <MetricCard 
                            title="Total Revenue" 
                            value={formatCurrency(metrics.totalRevenue)} 
                            subValue="Actual Received"
                            icon={IndianRupee} 
                            colorClass="text-emerald-600" 
                        />
                        <MetricCard 
                            title="Conversion Rate" 
                            value={`${metrics.conversionRate}%`} 
                            subValue={`${metrics.wonCount} won leads`} 
                            icon={Target} 
                            colorClass="text-purple-600" 
                        />
                        <MetricCard 
                            title="Pending Pipeline" 
                            value={metrics.pendingPipeline} 
                            icon={Activity} 
                            colorClass="text-indigo-600" 
                        />
                        <MetricCard 
                            title="In Progress Pipeline" 
                            value={metrics.inProgressPipeline} 
                            icon={Activity} 
                            colorClass="text-indigo-600" 
                        />
                    </div>

                    {/* Filter controls */}
                    <FilterBar title="KPI Filtering">
                        <Select value={filters.leadSource} onChange={(e) => handleFilterChange('leadSource', e.target.value)} className="bg-white text-xs h-9">
                            <option value="All">All Sources</option>
                            {(leadSources.length > 0 
                                ? leadSources.map(ls => ls.source_name)
                                : ['Advertisement', 'Cold Calling', 'Employer Referral', 'Customer Referral', 'Facebook & Meta', 'WhatsApp Campaign', 'Mobile App', 'Website', 'Other']
                            ).map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <Select value={filters.paymentMode} onChange={(e) => handleFilterChange('paymentMode', e.target.value)} className="bg-white text-xs h-9">
                            <option value="All">All Payment Modes</option>
                            {['UPI', 'Cash', 'Card', 'Bank Transfer'].map(m => <option key={m} value={m}>{m}</option>)}
                        </Select>
                    </FilterBar>

                    {/* Employee-wise metrics (when selected) */}
                    {filters.salesExecutive !== 'All' && employeeMetrics && (
                        <div className="space-y-3 bg-blue-50/30 p-5 rounded-2xl border border-blue-100">
                            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide flex items-center gap-2">
                                <UserCheck className="h-4 w-4" />
                                Employee-Wise Analytics ({users.find(u => u.id === filters.salesExecutive)?.name})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Leads</span>
                                    <h4 className="text-2xl font-bold mt-1 text-slate-800">{employeeMetrics.totalAssigned}</h4>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Conversion Rate</span>
                                    <h4 className="text-2xl font-bold mt-1 text-slate-800">{employeeMetrics.convRate}%</h4>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Revenue Generated</span>
                                    <h4 className="text-2xl font-bold mt-1 text-emerald-600">{formatCurrency(employeeMetrics.revenue)}</h4>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Tasks Completed</span>
                                    <h4 className="text-2xl font-bold mt-1 text-slate-800">{employeeMetrics.tasksDone} <span className="text-xs text-slate-400">({employeeMetrics.tasksPending} pend)</span></h4>
                                </div>
                            </div>
                            
                            {/* Lead Source Breakdown Grid */}
                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 overflow-x-auto bg-white p-4 rounded-xl border border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Lead Source Breakdown</h4>
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 text-slate-505 uppercase font-semibold">
                                            <tr>
                                                <th className="px-4 py-2 rounded-l-md">Source</th>
                                                <th className="px-4 py-2 text-center">Leads</th>
                                                <th className="px-4 py-2 text-center">Converted</th>
                                                <th className="px-4 py-2 text-center">Conv. Rate</th>
                                                <th className="px-4 py-2 text-right rounded-r-md">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {employeeMetrics.sourceBreakdown && employeeMetrics.sourceBreakdown.length > 0 ? (
                                                employeeMetrics.sourceBreakdown.map(item => (
                                                    <tr key={item.source} className="hover:bg-slate-50">
                                                        <td className="px-4 py-2.5 font-semibold text-slate-800">{item.source}</td>
                                                        <td className="px-4 py-2.5 text-center text-slate-600">{item.leads}</td>
                                                        <td className="px-4 py-2.5 text-center text-green-600 font-medium">{item.won}</td>
                                                        <td className="px-4 py-2.5 text-center">
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded-full font-bold text-[10px]",
                                                                item.conversion > 30 ? "bg-green-50 text-green-700 border border-green-100" :
                                                                item.conversion > 15 ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                                                "bg-red-50 text-red-700 border border-red-100"
                                                            )}>
                                                                {item.conversion.toFixed(1)}%
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{formatCurrency(item.revenue)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">No leads recorded for this employee.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Performance Insight</h4>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            This executive has achieved an overall conversion rate of <strong>{employeeMetrics.convRate}%</strong>, 
                                            generating <strong>{formatCurrency(employeeMetrics.revenue)}</strong> in revenue. 
                                            They have completed <strong>{employeeMetrics.tasksDone} tasks</strong> and logged <strong>{employeeMetrics.followupsDone} follow-ups</strong>.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-medium">Efficiency:</span>
                                        <span className="font-extrabold text-blue-700 uppercase">Active Agent</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Branch-wise metrics (when selected) */}
                    {filters.branch !== 'All' && branchMetrics && (
                        <div className="space-y-3 bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100">
                            <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Branch-Wise Analytics ({filters.branch})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Branch Leads</span>
                                    <h4 className="text-2xl font-bold mt-1 text-slate-800">{branchMetrics.totalLeads}</h4>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Branch Revenue</span>
                                    <h4 className="text-2xl font-bold mt-1 text-emerald-600">{formatCurrency(branchMetrics.totalRevenue)}</h4>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Conversion Rate</span>
                                    <h4 className="text-2xl font-bold mt-1 text-slate-800">{branchMetrics.conversionRate}%</h4>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Top Performing Employee</span>
                                    <h4 className="text-lg font-bold mt-1.5 text-slate-800 line-clamp-1">{branchMetrics.topEmployee}</h4>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Pending Follow-Ups</span>
                                    <h4 className="text-2xl font-bold mt-1 text-amber-600">{branchMetrics.pendingFollowups}</h4>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
               {/* Tab 2: Employee Leaderboard */}
            {activeTab === 'leaderboard' && !isSalesExec && (
                <div className="space-y-6">
                    <Card className="shadow-lg border-none overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-yellow-500"/> Team Leaderboard</CardTitle>
                                <CardDescription>Performance metrics ranking overall executive achievements.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-505 text-xs uppercase font-semibold border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Rank</th>
                                        <th className="px-6 py-4 text-left">Executive</th>
                                        <th className="px-6 py-4 text-center">Leads Assigned</th>
                                        <th className="px-6 py-4 text-center">Converted</th>
                                        <th className="px-6 py-4 text-right">Revenue (₹)</th>
                                        <th className="px-6 py-4 text-right">Conversion Rate</th>
                                        <th className="px-6 py-4 text-right">Performance Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {leaderboard.map((stat, i) => (
                                        <tr key={stat.user.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-400 w-16">{i + 1}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-900">{stat.user.name}</td>
                                            <td className="px-6 py-4 text-center font-medium text-slate-600">{stat.leadsAssigned}</td>
                                            <td className="px-6 py-4 text-center font-medium text-green-600">{stat.leadsWon}</td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(stat.revenue)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", stat.conversion > 30 ? "bg-green-100 text-green-700" : stat.conversion > 15 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                                                    {stat.conversion.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-extrabold text-indigo-600">{stat.score}/100</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    {/* Interactive Detailed Executive Performance */}
                    <Card className="shadow-lg border-none p-6 bg-slate-50/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <UserCheck className="h-5 w-5 text-blue-500" />
                                    Executive Performance Profile Deep-Dive
                                </h3>
                                <p className="text-xs text-slate-500">Select an executive to inspect their lead source attribution and operational metrics.</p>
                            </div>
                            <Select 
                                value={selectedLeaderboardExecId} 
                                onChange={(e) => setSelectedLeaderboardExecId(e.target.value)} 
                                className="bg-white text-xs h-9 w-[220px]"
                            >
                                <option value="All">Select Executive...</option>
                                {users.filter(u => u.role === 'Sales Executive').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </Select>
                        </div>

                        {selectedLeaderboardExecId !== 'All' && leaderboardEmployeeMetrics ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Leads</span>
                                        <h4 className="text-2xl font-bold mt-1 text-slate-800">{leaderboardEmployeeMetrics.totalAssigned}</h4>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Conversion Rate</span>
                                        <h4 className="text-2xl font-bold mt-1 text-slate-800">{leaderboardEmployeeMetrics.convRate}%</h4>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Revenue Generated</span>
                                        <h4 className="text-2xl font-bold mt-1 text-emerald-600">{formatCurrency(leaderboardEmployeeMetrics.revenue)}</h4>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Tasks Completed</span>
                                        <h4 className="text-2xl font-bold mt-1 text-slate-800">{leaderboardEmployeeMetrics.tasksDone} <span className="text-xs text-slate-400">({leaderboardEmployeeMetrics.tasksPending} pend)</span></h4>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 overflow-x-auto bg-white p-4 rounded-xl border border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Lead Source Breakdown</h4>
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-50 text-slate-505 uppercase font-semibold">
                                                <tr>
                                                    <th className="px-4 py-2 rounded-l-md">Source</th>
                                                    <th className="px-4 py-2 text-center">Leads</th>
                                                    <th className="px-4 py-2 text-center">Converted</th>
                                                    <th className="px-4 py-2 text-center">Conv. Rate</th>
                                                    <th className="px-4 py-2 text-right rounded-r-md">Revenue</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {leaderboardEmployeeMetrics.sourceBreakdown.length > 0 ? (
                                                    leaderboardEmployeeMetrics.sourceBreakdown.map(item => (
                                                        <tr key={item.source} className="hover:bg-slate-50">
                                                            <td className="px-4 py-2.5 font-semibold text-slate-800">{item.source}</td>
                                                            <td className="px-4 py-2.5 text-center text-slate-650">{item.leads}</td>
                                                            <td className="px-4 py-2.5 text-center text-green-600 font-medium">{item.won}</td>
                                                            <td className="px-4 py-2.5 text-center">
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded-full font-bold text-[10px]",
                                                                    item.conversion > 30 ? "bg-green-50 text-green-700 border border-green-100" :
                                                                    item.conversion > 15 ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                                                    "bg-red-50 text-red-700 border border-red-100"
                                                                )}>
                                                                    {item.conversion.toFixed(1)}%
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{formatCurrency(item.revenue)}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-6 text-center text-slate-400">No leads recorded for this employee in the selected range.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Performance Insight</h4>
                                            <p className="text-xs text-slate-650 leading-relaxed">
                                                This executive has achieved a conversion rate of <strong>{leaderboardEmployeeMetrics.convRate}%</strong>, 
                                                generating <strong>{formatCurrency(leaderboardEmployeeMetrics.revenue)}</strong> in revenue during the active period.
                                                They have completed <strong>{leaderboardEmployeeMetrics.tasksDone} tasks</strong>.
                                            </p>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                            <span className="text-slate-400 font-medium">Employee Status:</span>
                                            <span className={cn(
                                                "font-extrabold",
                                                parseFloat(leaderboardEmployeeMetrics.convRate) > 25 ? "text-green-700" : "text-amber-700"
                                            )}>
                                                {parseFloat(leaderboardEmployeeMetrics.convRate) > 25 ? "Top Achiever" : "Developing Lead"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 text-xs border border-dashed rounded-xl">
                                Choose an executive from the dropdown above to view detailed performance metrics.
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Tab 3: Comparative Analysis */}
            {activeTab === 'comparative' && !isSalesExec && (
                <div className="space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-blue-500" /> Comparison Selector</CardTitle>
                            <CardDescription>Select executive or branch dimension to compare performance side-by-side.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="flex bg-slate-100 p-1 rounded-lg border">
                                <button onClick={() => { setCompType('exec'); setCompA('All'); setCompB('All'); }} className={cn("px-4 py-1.5 text-xs font-semibold rounded-md transition-all", compType === 'exec' ? "bg-white text-blue-700 shadow-sm border" : "text-slate-555 hover:text-slate-700")}>Executive vs Executive</button>
                                <button onClick={() => { setCompType('branch'); setCompA('All'); setCompB('All'); }} className={cn("px-4 py-1.5 text-xs font-semibold rounded-md transition-all", compType === 'branch' ? "bg-white text-blue-700 shadow-sm border" : "text-slate-555 hover:text-slate-700")}>Branch vs Branch</button>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Select value={compA} onChange={(e) => setCompA(e.target.value)} className="bg-white text-xs h-9">
                                    <option value="All">Select Option A...</option>
                                    {compType === 'exec' ? (
                                        users.filter(u => u.role === 'Sales Executive').map(u => <option key={u.id} value={u.id}>{u.name}</option>)
                                    ) : (
                                        Array.from(new Set(users.map(u => u.branch_name).filter(Boolean))).map(b => <option key={b} value={b as string}>{b}</option>)
                                    )}
                                </Select>

                                <span className="font-bold text-slate-400">VS</span>

                                <Select value={compB} onChange={(e) => setCompB(e.target.value)} className="bg-white text-xs h-9">
                                    <option value="All">Select Option B...</option>
                                    {compType === 'exec' ? (
                                        users.filter(u => u.role === 'Sales Executive').map(u => <option key={u.id} value={u.id}>{u.name}</option>)
                                    ) : (
                                        Array.from(new Set(users.map(u => u.branch_name).filter(Boolean))).map(b => <option key={b} value={b as string}>{b}</option>)
                                    )}
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {comparisonResults.a && comparisonResults.b ? (
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Card Option A */}
                            <Card className="border-blue-200 border bg-gradient-to-br from-blue-50/30 to-white shadow-sm p-6 space-y-4">
                                <h3 className="text-xl font-bold text-blue-900 border-b pb-2">{comparisonResults.a.name}</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Leads Handled</span>
                                        <span className="font-bold text-slate-800">{comparisonResults.a.leads}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Conversions</span>
                                        <span className="font-bold text-slate-800">{comparisonResults.a.won}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Conversion Rate</span>
                                        <span className="font-bold text-blue-700">{comparisonResults.a.conv.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-505">Revenue Contribution</span>
                                        <span className="font-bold text-emerald-600">{formatCurrency(comparisonResults.a.rev)}</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Card Option B */}
                            <Card className="border-indigo-200 border bg-gradient-to-br from-indigo-50/30 to-white shadow-sm p-6 space-y-4">
                                <h3 className="text-xl font-bold text-indigo-900 border-b pb-2">{comparisonResults.b.name}</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-505">Leads Handled</span>
                                        <span className="font-bold text-slate-800">{comparisonResults.b.leads}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-505">Conversions</span>
                                        <span className="font-bold text-slate-800">{comparisonResults.b.won}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-505">Conversion Rate</span>
                                        <span className="font-bold text-indigo-700">{comparisonResults.b.conv.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-550">Revenue Contribution</span>
                                        <span className="font-bold text-emerald-600">{formatCurrency(comparisonResults.b.rev)}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                            <ArrowRightLeft className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-500 text-xs">Please select two options to compare metrics side-by-side.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 4: Revenue Attribution */}
            {activeTab === 'attribution' && (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Attribution by Employee */}
                    <Card className="shadow-md border-none p-5">
                        <CardHeader className="p-0 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-1.5"><Users className="h-4 w-4 text-blue-500" /> Revenue by Executive</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueAttribution.byEmployee}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tickFormatter={(v) => `₹${v/1000}k`} tick={{ fontSize: 10 }} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Attribution by Branch */}
                    <Card className="shadow-md border-none p-5">
                        <CardHeader className="p-0 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-1.5"><Building2 className="h-4 w-4 text-emerald-500" /> Revenue by Branch</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueAttribution.byBranch}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tickFormatter={(v) => `₹${v/1000}k`} tick={{ fontSize: 10 }} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Attribution by Service */}
                    <Card className="shadow-md border-none p-5">
                        <CardHeader className="p-0 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-indigo-500" /> Revenue by Service</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueAttribution.byService}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tickFormatter={(v) => `₹${v/1000}k`} tick={{ fontSize: 10 }} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tab 5: Lead Sources */}
            {activeTab === 'sources' && (
                <div className="space-y-6">
                    <Card className="shadow-lg border-none overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-purple-500"/> Acquisition Channel Conversion Rates</CardTitle>
                            <CardDescription>Analyze which traffic channels convert best and drive the most revenue.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-505 text-xs uppercase font-semibold border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Source Channel</th>
                                        <th className="px-6 py-4 text-center">Leads Generated</th>
                                        <th className="px-6 py-4 text-center">Conversions</th>
                                        <th className="px-6 py-4 text-right">Conversion Rate</th>
                                        <th className="px-6 py-4 text-right">Attributed Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {sourceMetrics.map(item => (
                                        <tr key={item.source} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-semibold text-slate-900">{item.source}</td>
                                            <td className="px-6 py-4 text-center font-medium text-slate-600">{item.leads}</td>
                                            <td className="px-6 py-4 text-center font-medium text-green-600">{item.won}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", item.conversion > 25 ? "bg-green-100 text-green-700" : item.conversion > 12 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                                                    {item.conversion.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-extrabold text-emerald-600">{formatCurrency(item.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    {/* Branch and City Breakdowns */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        {/* Branch-wise Breakdown */}
                        <Card className="shadow-lg border-none overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold flex items-center gap-1.5"><Building2 className="h-4 w-4 text-emerald-500" /> Branch-wise Lead Source Distribution</CardTitle>
                                <CardDescription>Lead counts and revenue splits by branch and source.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 overflow-auto max-h-[300px]">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 text-slate-505 uppercase font-semibold border-b">
                                        <tr>
                                            <th className="px-4 py-2.5">Branch</th>
                                            <th className="px-4 py-2.5">Source</th>
                                            <th className="px-4 py-2.5 text-center">Leads</th>
                                            <th className="px-4 py-2.5 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {branchSourceBreakdown.length > 0 ? (
                                            branchSourceBreakdown.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2.5 font-semibold text-slate-900">{item.branch}</td>
                                                    <td className="px-4 py-2.5 text-slate-700">{item.source}</td>
                                                    <td className="px-4 py-2.5 text-center font-medium">{item.leads}</td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{formatCurrency(item.revenue)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No branch source splits available.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        {/* City-wise Breakdown */}
                        <Card className="shadow-lg border-none overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold flex items-center gap-1.5"><MapPin className="h-4 w-4 text-blue-500" /> City-wise Lead Source Distribution</CardTitle>
                                <CardDescription>Lead counts and revenue splits by city and source.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 overflow-auto max-h-[300px]">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 text-slate-505 uppercase font-semibold border-b">
                                        <tr>
                                            <th className="px-4 py-2.5">City</th>
                                            <th className="px-4 py-2.5">Source</th>
                                            <th className="px-4 py-2.5 text-center">Leads</th>
                                            <th className="px-4 py-2.5 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {citySourceBreakdown.length > 0 ? (
                                            citySourceBreakdown.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2.5 font-semibold text-slate-900">{item.city}</td>
                                                    <td className="px-4 py-2.5 text-slate-700">{item.source}</td>
                                                    <td className="px-4 py-2.5 text-center font-medium">{item.leads}</td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{formatCurrency(item.revenue)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No city source splits available.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Tab 6: Executive Activity */}
            {activeTab === 'activity' && (
                <Card className="shadow-lg border-none overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                        <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-indigo-500"/> Executive Activity Scorecard</CardTitle>
                        <CardDescription>Track daily assignments, follow-ups conducted, and task completion speed.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-505 text-xs uppercase font-semibold border-b">
                                <tr>
                                    <th className="px-6 py-4 text-left">Executive Name</th>
                                    <th className="px-6 py-4 text-center">Active Leads Scoped</th>
                                    <th className="px-6 py-4 text-center">Follow-ups Logged</th>
                                    <th className="px-6 py-4 text-center">Task Completion Rate</th>
                                    <th className="px-6 py-4 text-right">Productivity Score</th>
                                    <th className="px-6 py-4 text-right">Network Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {activityScorecard.map(item => (
                                    <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                                        <td className="px-6 py-4 text-center font-medium text-slate-650">{item.assigned}</td>
                                        <td className="px-6 py-4 text-center font-medium text-slate-650">{item.followupsLogged}</td>
                                        <td className="px-6 py-4 text-center font-semibold text-indigo-700">{item.taskRate}</td>
                                        <td className="px-6 py-4 text-right font-extrabold text-indigo-600">{item.productivityScore}/100</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border",
                                                item.status === 'Online' 
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                                    : "bg-slate-50 text-slate-400 border-slate-100"
                                            )}>
                                                <span className={cn("h-1.5 w-1.5 rounded-full", item.status === 'Online' ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            {/* Tab 7: Referral Analytics */}
            {activeTab === 'referrals' && (
                <div className="space-y-6">
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <MetricCard 
                            title="Customer Referrals" 
                            value={referralAnalytics.totalCustomerReferrals} 
                            icon={Users} 
                            colorClass="text-blue-600" 
                        />
                        <MetricCard 
                            title="Customer Referral Revenue" 
                            value={formatCurrency(referralAnalytics.totalCustomerRevenue)} 
                            icon={IndianRupee} 
                            colorClass="text-emerald-600" 
                        />
                        <MetricCard 
                            title="Employer Referrals" 
                            value={referralAnalytics.totalEmployerReferrals} 
                            icon={UserCheck} 
                            colorClass="text-indigo-600" 
                        />
                        <MetricCard 
                            title="Employer Referral Revenue" 
                            value={formatCurrency(referralAnalytics.totalEmployerRevenue)} 
                            icon={IndianRupee} 
                            colorClass="text-purple-600" 
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Customer Referrals Table */}
                        <Card className="shadow-lg border-none overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b border-slate-100">
                                <CardTitle className="text-base font-bold flex items-center gap-1.5"><Users className="h-4 w-4 text-blue-500" /> Customer Referral Details</CardTitle>
                                <CardDescription>Leads referred by existing customers.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 overflow-auto max-h-[400px]">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 text-slate-505 uppercase font-semibold border-b">
                                        <tr>
                                            <th className="px-4 py-3">Referring Customer</th>
                                            <th className="px-4 py-3">Referred Lead</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                            <th className="px-4 py-3 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {referralAnalytics.customerReferrals.length > 0 ? (
                                            referralAnalytics.customerReferrals.map((r, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-semibold text-slate-900">{r.referrerName}</td>
                                                    <td className="px-4 py-3 text-slate-700">{r.referredName}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                            r.status === 'Success' ? "bg-green-100 text-green-700" :
                                                            r.status === 'Lost' ? "bg-red-100 text-red-700" :
                                                            "bg-blue-100 text-blue-700"
                                                        )}>
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-extrabold text-emerald-600">{formatCurrency(r.revenue)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No customer referrals found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        {/* Employer Referrals Table */}
                        <Card className="shadow-lg border-none overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b border-slate-100">
                                <CardTitle className="text-base font-bold flex items-center gap-1.5"><UserCheck className="h-4 w-4 text-indigo-500" /> Employer Referral Details</CardTitle>
                                <CardDescription>Leads referred by team employees.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 overflow-auto max-h-[400px]">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 text-slate-505 uppercase font-semibold border-b">
                                        <tr>
                                            <th className="px-4 py-3">Referring Employee</th>
                                            <th className="px-4 py-3">Referred Lead</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                            <th className="px-4 py-3 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {referralAnalytics.employerReferrals.length > 0 ? (
                                            referralAnalytics.employerReferrals.map((r, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-semibold text-slate-900">{r.referrerName}</td>
                                                    <td className="px-4 py-3 text-slate-700">{r.referredName}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                            r.status === 'Success' ? "bg-green-100 text-green-700" :
                                                            r.status === 'Lost' ? "bg-red-100 text-red-700" :
                                                            "bg-blue-100 text-blue-700"
                                                        )}>
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-extrabold text-emerald-600">{formatCurrency(r.revenue)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No employer referrals found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};

const Reports: React.FC<{ userRole: User['role'], leads?: Lead[], users?: User[], allLeads?: Lead[], customers?: Customer[], dateRange: { from: string; to: string }, setDateRange: any, currentUser: User }> = (props) => {
    return (
        <div className="w-full h-full flex flex-col gap-8 p-1">
             <div className="flex flex-col xl:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Reports & Analytics</h2>
                    <p className="text-slate-550 mt-1 text-lg">Detailed insights into business performance and team productivity.</p>
                </div>
            </div>

            <div className="flex-1 w-full">
                {['Super Admin', 'Admin'].includes(props.userRole) ? (
                    <AdvancedAdminReports users={props.users || []} allLeads={props.allLeads || []} customers={props.customers || []} role={props.userRole} dateRange={props.dateRange} setDateRange={props.setDateRange} currentUser={props.currentUser} />
                ) : (
                    <AdvancedAdminReports users={props.users || []} allLeads={props.leads || []} customers={props.customers || []} role={props.userRole} dateRange={props.dateRange} setDateRange={props.setDateRange} currentUser={props.currentUser} />
                )}
            </div>
        </div>
    );
};

export default Reports;
