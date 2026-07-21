import { useMemo, useState } from 'react';
import { Lead, User, Customer, Branch, City, UserActivity, Service, Task, UserRole, LeadStatus } from '../types';
import { useGlobalFilter } from '../contexts/GlobalFilterContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── EXPORTED UTILITY FUNCTIONS ──────────────────────────────────────────────

export const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getPresetRange = (preset: string) => {
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

export const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// ─── EXPORTED TYPES ──────────────────────────────────────────────────────────

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

export interface AiInsight {
  type: 'success' | 'warning' | 'danger' | 'info';
  category: string;
  title: string;
  description: string;
}

export interface PeriodMetrics {
  leads: number;
  converted: number;
  rate: number;
  revenue: number;
  customers: number;
  outstanding: number;
  tasksCompleted: number;
}

export interface TrendData {
  value: number;
  isPositive: boolean;
  label: string;
}

export interface DashboardMetricsInput {
  leads: Lead[];
  users: User[];
  customers: Customer[];
  branches: Branch[];
  cities: City[];
  userActivities: UserActivity[];
  currentUser: User;
  services: Service[];
}

// ─── MAIN HOOK ───────────────────────────────────────────────────────────────

export function useDashboardMetrics(props: DashboardMetricsInput) {
  const { leads, users, customers, branches, cities, userActivities, currentUser, services } = props;

  const {
    cityId: cityFilter,
    branchId: branchFilter,
    adminId: managerFilter,
    employeeId: employeeFilter,
    dateRange: globalDateRange,
  } = useGlobalFilter();

  const dateRange = useMemo(() => ({
    from: globalDateRange.from ? getLocalDateString(globalDateRange.from) : '',
    to: globalDateRange.to ? getLocalDateString(globalDateRange.to) : ''
  }), [globalDateRange]);

  // ── LOCAL UI STATE ──
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [industryFilter, setIndustryFilter] = useState('All');
  const [activeChartTab, setActiveChartTab] = useState<'leads' | 'revenue' | 'services'>('leads');
  const [comparisonMode, setComparisonMode] = useState<'none' | 'previous_period' | 'last_month' | 'last_year'>('none');
  const [exportOpen, setExportOpen] = useState(false);

  // ── ROLE FLAGS ──
  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
  const isAdminRole = currentUser.role === UserRole.ADMIN;
  const isSalesExec = currentUser.role === UserRole.SALES_EXECUTIVE;
  const isAdmin = isSuperAdmin || isAdminRole;

  // ── PRESET DETECTION ──
  const activePreset = useMemo(() => {
    const { from, to } = dateRange;
    if (!from && !to) return 'all';
    const presets = ['today', 'yesterday', 'last_7_days', 'last_15_days', 'last_30_days', 'this_week', 'last_week', 'this_month', 'last_month', 'this_quarter', 'last_quarter', 'this_year', 'last_year'];
    for (const p of presets) {
      const range = getPresetRange(p);
      if (range.from === from && range.to === to) return p;
    }
    return 'custom';
  }, [dateRange]);

  // ── FILTER LOGIC ──
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

  // ── FILTERED LEADS ──
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

  // ── SCOPED LEADS (SE) ──
  const myLeads = useMemo(() => {
    if (!isSalesExec) return leads;
    return leads.filter(l => l.assigned_to?.id === currentUser.id);
  }, [leads, isSalesExec, currentUser.id]);

  const myCustomers = useMemo(() => customers.filter(c => c.assigned_to?.id === currentUser.id), [customers, currentUser.id]);

  // ── COMPARISON ──
  const getComparisonRange = (from: string, to: string, mode: typeof comparisonMode) => {
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

  const calculatePeriodMetrics = (targetLeads: Lead[], targetCustomers: Customer[], fromStr: string, toStr: string): PeriodMetrics => {
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

  const parsedTrends = useMemo(() => {
    if (!comparisonMetrics) return null;
    const getTrendData = (curr: number, comp: number, label: string): TrendData => {
      if (comp === 0) return { value: 0, isPositive: true, label };
      const diff = ((curr - comp) / comp) * 100;
      return { value: Math.abs(Math.round(diff * 10) / 10), isPositive: diff >= 0, label };
    };
    return {
      leads: getTrendData(currentMetrics.leads, comparisonMetrics.leads, 'vs prev period'),
      converted: getTrendData(currentMetrics.converted, comparisonMetrics.converted, 'vs prev period'),
      rate: getTrendData(currentMetrics.rate, comparisonMetrics.rate, 'vs prev period'),
      revenue: getTrendData(currentMetrics.revenue, comparisonMetrics.revenue, 'vs prev period'),
    };
  }, [currentMetrics, comparisonMetrics]);

  // ── KEY DERIVED METRICS ──
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

  // ── BRANCH METRICS (Admin / BM) ──
  const branchSECount = useMemo(() => users.filter(u => (u.branch_id === currentUser.branch_id || u.branch_name === currentUser.branch_name) && u.role === 'Sales Executive').length, [users, currentUser]);
  const branchLeadsCount = useMemo(() => leads.filter(l => l.branch_id === currentUser.branch_id || l.branch_name === currentUser.branch_name).length, [leads, currentUser]);
  const branchCustomersCount = useMemo(() => customers.filter(c => c.branch_id === currentUser.branch_id || c.branch_name === currentUser.branch_name).length, [customers, currentUser]);
  const branchConvRate = useMemo(() => {
    const branchLeads = leads.filter(l => l.branch_id === currentUser.branch_id || l.branch_name === currentUser.branch_name);
    const branchConverted = branchLeads.filter(l => l.status === LeadStatus.SUCCESS).length;
    return branchLeads.length > 0 ? (branchConverted / branchLeads.length) * 100 : 0;
  }, [leads, currentUser]);
  const branchPerformance = useMemo(() => branchConvRate > 25 ? 'Excellent' : branchConvRate > 15 ? 'Good' : 'Average', [branchConvRate]);

  // ── SE METRICS ──
  const seFollowUpsCount = useMemo(() => leads.filter(l => l.assigned_to?.id === currentUser.id && l.next_follow_up && l.status !== 'Success' && l.status !== 'Lost').length, [leads, currentUser]);
  const seConvRate = useMemo(() => {
    const seLeads = leads.filter(l => l.assigned_to?.id === currentUser.id);
    const seConverted = seLeads.filter(l => l.status === LeadStatus.SUCCESS).length;
    return seLeads.length > 0 ? (seConverted / seLeads.length) * 100 : 0;
  }, [leads, currentUser]);

  // ── SUPER ADMIN METRICS ──
  const superAdminAdminsCount = useMemo(() => users.filter(u => u.role === 'Admin' || u.role === 'Branch Manager').length, [users]);
  const superAdminSecsCount = useMemo(() => users.filter(u => u.role === 'Sales Executive').length, [users]);
  const superAdminPaymentsCount = useMemo(() => leads.reduce((sum, l) => sum + (l.payments?.length || 0), 0), [leads]);

  // ── BIRTHDAY LOGIC ──
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

  // ── AGENDA DATA ──
  const agendaData: AgendaData = useMemo(() => {
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

  // ── AI INSIGHTS ──
  const aiInsights: AiInsight[] = useMemo(() => {
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

  // ── CHART DATA ──
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
      const dataPoints: any[] = []; const temp = new Date(startDate);
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

  const recentActivities = useMemo(() =>
    filteredActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6),
  [filteredActivities]);

  const branchPerformanceData = useMemo(() => {
    if (!isSuperAdmin) return [];
    return branches.map(branch => {
      const bLeads = filteredLeads.filter(l => l.branch_id === branch.id || l.branch_name === branch.name);
      const bSales = bLeads.filter(l => l.status === LeadStatus.SUCCESS);
      const totalRev = bLeads.reduce((sum, lead) => sum + (lead.payments || []).reduce((pSum, p) => pSum + (p.amount || 0), 0), 0);
      return { id: branch.id, name: branch.name, city: branch.city_name, leads: bLeads.length, sales: bSales.length, revenue: totalRev };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [isSuperAdmin, branches, filteredLeads]);

  // ── SEARCH ──
  const searchResults = useMemo(() => {
    if (!localSearchTerm) return { customers: [] as Customer[], leads: [] as Lead[] };
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

  // ── EXPORT ──
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

  return {
    // Role flags
    isSuperAdmin, isAdmin, isAdminRole, isSalesExec,
    // Filtered data
    filteredLeads, filteredActivities, myLeads, myCustomers,
    // Metrics
    currentMetrics, comparisonMetrics, seCurrentMetrics,
    parsedTrends, growthMetrics,
    // Derived counts
    activeUsersCount, pendingLeadsCount, inProgressLeadsCount, lostLeadsCount, convertedLeadsCount,
    pendingPaymentsVal, todayRevenueVal, thisMonthRevenueVal, totalServicesCount, totalBranchesCount,
    myRevenue, myPendingPayments,
    // Branch metrics
    branchSECount, branchLeadsCount, branchCustomersCount, branchConvRate, branchPerformance,
    // SE metrics
    seFollowUpsCount, seConvRate,
    // Super admin metrics
    superAdminAdminsCount, superAdminSecsCount, superAdminPaymentsCount,
    // Birthday
    birthdayCustomers, isWishSent,
    // Agenda
    agendaData,
    // AI Insights
    aiInsights,
    // Chart data
    trendData, sourceData, statusData, branchPerformanceData,
    // Activities
    recentActivities,
    // Search
    searchResults, localSearchTerm, setLocalSearchTerm,
    // UI state
    activeChartTab, setActiveChartTab,
    comparisonMode, setComparisonMode,
    exportOpen, setExportOpen,
    serviceFilter, setServiceFilter,
    categoryFilter, setCategoryFilter,
    industryFilter, setIndustryFilter,
    // Date
    dateRange, activePreset,
    // Export
    handleExport,
  };
}
