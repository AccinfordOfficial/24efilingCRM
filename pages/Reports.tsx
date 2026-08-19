import React, { useMemo, useState } from 'react';
import { Lead, User, Customer, UserRole, Payment } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, TrendingUp, Users, Calendar, AlertCircle, FileDown, CheckCircle, Clock, Award, ShieldAlert } from 'lucide-react';
import { useGlobalFilter } from '../contexts/GlobalFilterContext';
import { getLocalDateString, getPresetRange } from '../hooks/useDashboardMetrics';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  leads: Lead[];
  users: User[];
  currentUser: User;
  dateRange: { from: Date | null; to: Date | null };
  services: any[];
}

export default function Reports({
  leads = [],
  users = [],
  currentUser,
  dateRange,
  services = []
}: ReportsProps) {
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  const [activeTab, setActiveTab] = useState<'sales' | 'revenue' | 'work' | 'employee' | 'customer'>('sales');
  const [selectedPreset, setSelectedPreset] = useState('this_month');

  const { setDateRange } = useGlobalFilter();

  const parsedDateRange = useMemo(() => {
    return {
      from: dateRange.from ? getLocalDateString(dateRange.from) : '',
      to: dateRange.to ? getLocalDateString(dateRange.to) : ''
    };
  }, [dateRange]);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === 'all') {
      setDateRange({ from: null, to: null });
      return;
    }
    const range = getPresetRange(preset);
    setDateRange({
      from: range.from ? new Date(`${range.from}T00:00:00`) : null,
      to: range.to ? new Date(`${range.to}T23:59:59.999`) : null
    });
  };

  // ── CORE DATA FILTERING ──
  const periodLeads = useMemo(() => {
    const fromDate = parsedDateRange.from ? new Date(`${parsedDateRange.from}T00:00:00`) : null;
    const toDate = parsedDateRange.to ? new Date(`${parsedDateRange.to}T23:59:59.999`) : null;

    return leads.filter(lead => {
      // Scoping
      if (!isSuperAdmin) {
        const userBranch = currentUser.branch_id || currentUser.branch_name;
        if (lead.branch_id && lead.branch_id !== userBranch) return false;
      }

      const d = new Date(lead.created_at);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [leads, parsedDateRange, currentUser, isSuperAdmin]);

  // 1. Sales Report Memoized Data
  const salesReportData = useMemo(() => {
    const total = periodLeads.length;
    const qualified = periodLeads.filter(l => l.status === 'Lead Confirmed').length;
    const inProgress = periodLeads.filter(l => l.status === 'In-Progress' || l.status === 'Documents & Payments').length;
    const won = periodLeads.filter(l => l.status === 'Success').length;
    const lost = periodLeads.filter(l => l.status === 'Lost').length;
    
    const funnel = [
      { name: 'Total Leads', value: total, fill: '#3b82f6' },
      { name: 'Qualified', value: qualified + inProgress + won, fill: '#6366f1' },
      { name: 'In Progress', value: inProgress + won, fill: '#8b5cf6' },
      { name: 'Closed Won', value: won, fill: '#10b981' }
    ];

    const sourcesMap: Record<string, number> = {};
    periodLeads.forEach(l => {
      const source = l.source || 'Other';
      sourcesMap[source] = (sourcesMap[source] || 0) + 1;
    });

    const sources = Object.entries(sourcesMap).map(([name, value]) => ({ name, value }));

    return { total, won, lost, conversionRate: total > 0 ? (won / total) * 100 : 0, funnel, sources };
  }, [periodLeads]);

  // 2. Revenue Report Memoized Data
  const revenueReportData = useMemo(() => {
    const fromDate = parsedDateRange.from ? new Date(`${parsedDateRange.from}T00:00:00`) : null;
    const toDate = parsedDateRange.to ? new Date(`${parsedDateRange.to}T23:59:59.999`) : null;

    let revenue = 0;
    const branchMap: Record<string, number> = {};
    const methodMap: Record<string, number> = {};

    leads.forEach(lead => {
      // Scoping
      if (!isSuperAdmin) {
        const userBranch = currentUser.branch_id || currentUser.branch_name;
        if (lead.branch_id && lead.branch_id !== userBranch) return;
      }

      (lead.payments || []).forEach(p => {
        if (!p.date) return;
        const pd = new Date(p.date);
        if (fromDate && pd < fromDate) return;
        if (toDate && pd > toDate) return;

        const amt = Number(p.amount) || Number(p.received) || 0;
        revenue += amt;

        const branch = lead.branch_name || 'Main Branch';
        branchMap[branch] = (branchMap[branch] || 0) + amt;

        const method = p.method || 'Other';
        methodMap[method] = (methodMap[method] || 0) + amt;
      });
    });

    const branchesData = Object.entries(branchMap).map(([name, value]) => ({ name, value }));
    const methodsData = Object.entries(methodMap).map(([name, value]) => ({ name, value }));

    return { revenue, branches: branchesData, methods: methodsData };
  }, [leads, parsedDateRange, currentUser, isSuperAdmin]);

  // 3. Work Report Memoized Data
  const workReportData = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;
    let overdueTasks = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    periodLeads.forEach(lead => {
      (lead.tasks || []).forEach(t => {
        totalTasks++;
        if (t.is_completed) {
          completedTasks++;
        } else {
          pendingTasks++;
          if (t.due_date && new Date(t.due_date) < today) {
            overdueTasks++;
          }
        }
      });
    });

    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return { totalTasks, completedTasks, pendingTasks, overdueTasks, taskCompletionRate };
  }, [periodLeads]);

  // 4. Employee Report Memoized Data
  const employeeReportData = useMemo(() => {
    const fromDate = parsedDateRange.from ? new Date(`${parsedDateRange.from}T00:00:00`) : null;
    const toDate = parsedDateRange.to ? new Date(`${parsedDateRange.to}T23:59:59.999`) : null;

    const executives = users.filter(u => u.role === UserRole.SALES_EXECUTIVE);
    const performance = executives.map(exec => {
      const execLeads = leads.filter(l => l.assigned_to?.id === exec.id);
      
      let revenue = 0;
      execLeads.forEach(l => {
        (l.payments || []).forEach(p => {
          if (!p.date) return;
          const pd = new Date(p.date);
          if (fromDate && pd < fromDate) return;
          if (toDate && pd > toDate) return;
          revenue += Number(p.amount) || 0;
        });
      });

      const total = execLeads.length;
      const won = execLeads.filter(l => l.status === 'Success').length;
      const rate = total > 0 ? (won / total) * 100 : 0;

      return {
        name: exec.name,
        branch: exec.branch_name || 'General',
        leads: total,
        sales: won,
        conversionRate: rate,
        revenue
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return { performance };
  }, [users, leads, parsedDateRange]);

  // 5. Customer Report Memoized Data
  const customerReportData = useMemo(() => {
    const customersList: any[] = [];
    const popularityMap: Record<string, number> = {};

    periodLeads.forEach(l => {
      if (l.status === 'Success') {
        customersList.push({
          name: `${l.first_name} ${l.last_name}`,
          business: l.business_name || '-',
          service: l.service_requested,
          revenue: l.total_payment || 0,
          date: new Date(l.created_at).toLocaleDateString('en-IN')
        });

        const serviceKey = l.service_requested.split('-')[0].trim();
        popularityMap[serviceKey] = (popularityMap[serviceKey] || 0) + 1;
      }
    });

    const popularities = Object.entries(popularityMap).map(([name, value]) => ({ name, value }));

    return { customersList, popularities };
  }, [periodLeads]);

  // ── EXPORT ENGINE ──
  const handleExportExcel = () => {
    let exportRows: any[] = [];
    const filename = `report_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`;

    if (activeTab === 'sales') {
      exportRows = periodLeads.map(l => ({
        Name: `${l.first_name} ${l.last_name}`, Business: l.business_name || '-', Phone: l.phone_number, Source: l.source, Status: l.status, Date: new Date(l.created_at).toLocaleDateString('en-IN')
      }));
    } else if (activeTab === 'revenue') {
      const fromDate = parsedDateRange.from ? new Date(`${parsedDateRange.from}T00:00:00`) : null;
      const toDate = parsedDateRange.to ? new Date(`${parsedDateRange.to}T23:59:59.999`) : null;
      leads.forEach(l => {
        (l.payments || []).forEach(p => {
          if (!p.date) return;
          const pd = new Date(p.date);
          if (fromDate && pd < fromDate) return;
          if (toDate && pd > toDate) return;
          exportRows.push({
            Lead: `${l.first_name} ${l.last_name}`, Branch: l.branch_name || 'Main', Service: p.service_name || l.service_requested, Method: p.method, Amount: p.amount || p.received || 0, Date: pd.toLocaleDateString('en-IN')
          });
        });
      });
    } else if (activeTab === 'work') {
      periodLeads.forEach(l => {
        (l.tasks || []).forEach(t => {
          exportRows.push({
            Lead: `${l.first_name} ${l.last_name}`, Task: t.content, Priority: t.priority, Status: t.is_completed ? 'Completed' : 'Pending', DueDate: t.due_date || '-'
          });
        });
      });
    } else if (activeTab === 'employee') {
      exportRows = employeeReportData.performance.map(p => ({
        Name: p.name, Branch: p.branch, Leads: p.leads, Sales: p.sales, 'Conversion Rate (%)': p.conversionRate.toFixed(1), 'Revenue Generated (₹)': p.revenue
      }));
    } else if (activeTab === 'customer') {
      exportRows = customerReportData.customersList.map(c => ({
        Name: c.name, Business: c.business, Service: c.service, Revenue: c.revenue, 'Enroll Date': c.date
      }));
    }

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reports Export');
    XLSX.writeFile(wb, filename);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`24eFiling CRM — ${activeTab.toUpperCase()} Report`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Date Range: ${parsedDateRange.from || 'All'} to ${parsedDateRange.to || 'All'}`, 14, 22);

    let head: string[][] = [];
    let body: any[][] = [];

    if (activeTab === 'sales') {
      head = [['Name', 'Business', 'Phone', 'Source', 'Status', 'Date']];
      body = periodLeads.map(l => [`${l.first_name} ${l.last_name}`, l.business_name || '-', l.phone_number, l.source, l.status, new Date(l.created_at).toLocaleDateString('en-IN')]);
    } else if (activeTab === 'revenue') {
      const fromDate = parsedDateRange.from ? new Date(`${parsedDateRange.from}T00:00:00`) : null;
      const toDate = parsedDateRange.to ? new Date(`${parsedDateRange.to}T23:59:59.999`) : null;
      head = [['Lead Name', 'Branch', 'Service', 'Method', 'Amount', 'Date']];
      leads.forEach(l => {
        (l.payments || []).forEach(p => {
          if (!p.date) return;
          const pd = new Date(p.date);
          if (fromDate && pd < fromDate) return;
          if (toDate && pd > toDate) return;
          body.push([`${l.first_name} ${l.last_name}`, l.branch_name || 'Main', p.service_name || l.service_requested, p.method, `INR ${Number(p.amount).toLocaleString('en-IN')}`, pd.toLocaleDateString('en-IN')]);
        });
      });
    } else if (activeTab === 'work') {
      head = [['Lead Name', 'Task Detail', 'Priority', 'Status', 'Due Date']];
      periodLeads.forEach(l => {
        (l.tasks || []).forEach(t => {
          body.push([`${l.first_name} ${l.last_name}`, t.content, t.priority, t.is_completed ? 'Completed' : 'Pending', t.due_date || '-']);
        });
      });
    } else if (activeTab === 'employee') {
      head = [['Name', 'Branch', 'Leads Assigned', 'Closed Deals', 'Conversion %', 'Revenue Generated']];
      body = employeeReportData.performance.map(p => [p.name, p.branch, p.leads, p.sales, `${p.conversionRate.toFixed(1)}%`, `INR ${p.revenue.toLocaleString('en-IN')}`]);
    } else if (activeTab === 'customer') {
      head = [['Customer Name', 'Business', 'Service Set', 'Total Billing', 'Enroll Date']];
      body = customerReportData.customersList.map(c => [c.name, c.business, c.service, `INR ${c.revenue.toLocaleString('en-IN')}`, c.date]);
    }

    autoTable(doc, {
      startY: 28,
      head,
      body,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8 }
    });

    doc.save(`report_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Reports & Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Access, view, and export detailed logs for conversions, billing, tasks, and sales.
          </p>
        </div>

        {/* Date presets and export triggers */}
        <div className="flex flex-wrap items-center gap-3">
          {['this_week', 'this_month', 'all'].map((p) => (
            <button
              key={p}
              onClick={() => handlePresetChange(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all border ${
                selectedPreset === p
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.replace('_', ' ')}
            </button>
          ))}
          <div className="flex gap-2">
            <Button onClick={handleExportExcel} variant="outline" size="sm" className="border-white/10 text-xs text-slate-300 hover:bg-white/5 hover:text-white">
              Export Excel
            </Button>
            <Button onClick={handleExportPDF} variant="outline" size="sm" className="border-white/10 text-xs text-slate-300 hover:bg-white/5 hover:text-white">
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-white/5 gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'sales', label: 'Sales Reports', icon: BarChart3 },
          { id: 'revenue', label: 'Revenue Reports', icon: TrendingUp },
          { id: 'work', label: 'Work Reports', icon: CheckCircle },
          { id: 'employee', label: 'Employee Reports', icon: Award },
          { id: 'customer', label: 'Customer Reports', icon: Users }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="grid grid-cols-1 gap-6">
        {/* 1. SALES REPORT TAB */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass-card border-white/5 bg-slate-900/40 p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Leads Logged</p>
                  <h3 className="text-3xl font-bold mt-2 text-slate-100">{salesReportData.total}</h3>
                </div>
              </Card>
              <Card className="glass-card border-white/5 bg-slate-900/40 p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deals Closed</p>
                  <h3 className="text-3xl font-bold mt-2 text-emerald-400">{salesReportData.won}</h3>
                </div>
              </Card>
              <Card className="glass-card border-white/5 bg-slate-900/40 p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Funnel Conversion Rate</p>
                  <h3 className="text-3xl font-bold mt-2 text-blue-400">{salesReportData.conversionRate.toFixed(1)}%</h3>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card border-white/5 bg-slate-900/30 p-6">
                <CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Pipeline Funnel Stage</CardTitle>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesReportData.funnel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#64748b" fontSize={11} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="value" fill="#3b82f6">
                        {salesReportData.funnel.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="glass-card border-white/5 bg-slate-900/30 p-6">
                <CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Lead Source Attribution</CardTitle>
                <div className="h-64 w-full">
                  {salesReportData.sources.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">No lead data.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesReportData.sources}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                        <Bar dataKey="value" fill="#a855f7" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* 2. REVENUE REPORT TAB */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <Card className="glass-card border-white/5 bg-slate-900/40 p-6 max-w-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Billings Generated</p>
              <h3 className="text-3xl font-bold mt-2 text-emerald-400">₹ {revenueReportData.revenue.toLocaleString('en-IN')}</h3>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card border-white/5 bg-slate-900/30 p-6">
                <CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Branch Contribution</CardTitle>
                <div className="h-64 w-full">
                  {revenueReportData.branches.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">No transactions in selected period.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueReportData.branches}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} formatter={(v) => `₹ ${v}`} />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              <Card className="glass-card border-white/5 bg-slate-900/30 p-6">
                <CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Payment Methods breakdown</CardTitle>
                <div className="h-64 w-full">
                  {revenueReportData.methods.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">No billing.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={revenueReportData.methods} innerRadius={60} outerRadius={80} dataKey="value" label>
                          {revenueReportData.methods.map((entry, idx) => (
                            <Cell key={idx} fill={['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7'][idx % 5]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} formatter={(v) => `₹ ${v}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* 3. WORK REPORT TAB */}
        {activeTab === 'work' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-card border-white/5 bg-slate-900/40 p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tasks Assigned</p>
                <h3 className="text-3xl font-bold mt-2 text-slate-100">{workReportData.totalTasks}</h3>
              </Card>
              <Card className="glass-card border-white/5 bg-slate-900/40 p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Tasks</p>
                <h3 className="text-3xl font-bold mt-2 text-emerald-400">{workReportData.completedTasks}</h3>
              </Card>
              <Card className="glass-card border-white/5 bg-slate-900/40 p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Task Completion Rate</p>
                <h3 className="text-3xl font-bold mt-2 text-blue-400">{workReportData.taskCompletionRate.toFixed(1)}%</h3>
              </Card>
              <Card className="glass-card border-white/5 bg-slate-900/40 p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Tasks Alert</p>
                <h3 className="text-3xl font-bold mt-2 text-rose-400">{workReportData.overdueTasks}</h3>
              </Card>
            </div>
          </div>
        )}

        {/* 4. EMPLOYEE REPORT TAB */}
        {activeTab === 'employee' && (
          <Card className="glass-card border-white/5 bg-slate-900/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-950/20 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Executive Name</th>
                    <th className="py-4 px-6">Branch</th>
                    <th className="py-4 px-6 text-center">Leads Assigned</th>
                    <th className="py-4 px-6 text-center">Conversions</th>
                    <th className="py-4 px-6 text-center">Conversion Rate</th>
                    <th className="py-4 px-6 text-right">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {employeeReportData.performance.map((p, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-200">{p.name}</td>
                      <td className="py-4 px-6 text-slate-400">{p.branch}</td>
                      <td className="py-4 px-6 text-center text-slate-300">{p.leads}</td>
                      <td className="py-4 px-6 text-center text-slate-300">{p.sales}</td>
                      <td className="py-4 px-6 text-center text-slate-400 font-semibold">{p.conversionRate.toFixed(1)}%</td>
                      <td className="py-4 px-6 text-right font-bold text-emerald-400">₹ {p.revenue.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* 5. CUSTOMER REPORT TAB */}
        {activeTab === 'customer' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Service popularities donut chart */}
              <Card className="glass-card border-white/5 bg-slate-900/30 p-6 flex flex-col justify-between">
                <CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Service Package Popularity</CardTitle>
                <div className="h-64 w-full">
                  {customerReportData.popularities.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">No converted customers.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={customerReportData.popularities} innerRadius={60} outerRadius={80} dataKey="value" label>
                          {customerReportData.popularities.map((entry, idx) => (
                            <Cell key={idx} fill={['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899'][idx % 5]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              {/* Customers list table */}
              <Card className="lg:col-span-2 glass-card border-white/5 bg-slate-900/30 overflow-hidden">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-wider">Converted Customer Log</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-slate-950/20 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="py-3 px-6">Name</th>
                        <th className="py-3 px-6">Business</th>
                        <th className="py-3 px-6">Service</th>
                        <th className="py-3 px-6 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                      {customerReportData.customersList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-500">No records found.</td>
                        </tr>
                      ) : (
                        customerReportData.customersList.map((c, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-6 font-semibold text-slate-200">{c.name}</td>
                            <td className="py-3 px-6">{c.business}</td>
                            <td className="py-3 px-6 truncate max-w-40">{c.service}</td>
                            <td className="py-3 px-6 text-right font-bold text-emerald-400">₹ {c.revenue.toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
