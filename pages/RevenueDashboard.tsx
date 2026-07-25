import React, { useState, useMemo } from 'react';
import { Lead, User, Customer, Branch, City } from '../types';
import { DollarSign, Building, TrendingUp, Calendar, AlertCircle, FileDown, ArrowUpDown, ChevronDown, ChevronRight, User as UserIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useGlobalFilter } from '../contexts/GlobalFilterContext';
import { getLocalDateString, getPresetRange } from '../hooks/useDashboardMetrics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RevenueDashboardProps {
  leads: Lead[];
  users: User[];
  customers: Customer[];
  branches: Branch[];
  currentUser: User;
}

export default function RevenueDashboard({
  leads = [],
  users = [],
  customers = [],
  branches = [],
  currentUser,
}: RevenueDashboardProps) {
  const { dateRange, setDateRange } = useGlobalFilter();

  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
  const [selectedPreset, setSelectedPreset] = useState('this_month');

  // Sync date preset selector
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

  const toggleBranch = (branchId: string) => {
    setExpandedBranches(prev => ({
      ...prev,
      [branchId]: !prev[branchId]
    }));
  };

  // 1. Date boundaries
  const parsedDateRange = useMemo(() => {
    return {
      from: dateRange.from ? getLocalDateString(dateRange.from) : '',
      to: dateRange.to ? getLocalDateString(dateRange.to) : ''
    };
  }, [dateRange]);

  // 2. Fetch payments from leads matching date filters
  const periodPayments = useMemo(() => {
    const fromDate = parsedDateRange.from ? new Date(`${parsedDateRange.from}T00:00:00`) : null;
    const toDate = parsedDateRange.to ? new Date(`${parsedDateRange.to}T23:59:59.999`) : null;

    const allPayments: Array<{
      lead: Lead;
      amount: number;
      date: Date;
      method: string;
      service: string;
      executiveId?: string;
      branchId?: string;
    }> = [];

    leads.forEach(lead => {
      (lead.payments || []).forEach(p => {
        if (!p.date) return;
        const pd = new Date(p.date);
        
        // Date match
        if (fromDate && pd < fromDate) return;
        if (toDate && pd > toDate) return;

        allPayments.push({
          lead,
          amount: Number(p.amount) || Number(p.received) || 0,
          date: pd,
          method: p.method || 'Other',
          service: p.service_name || lead.service_requested || 'Other Services',
          executiveId: lead.assigned_to?.id || lead.created_by,
          branchId: lead.branch_id || lead.assigned_to?.branch_id
        });
      });
    });

    return allPayments;
  }, [leads, parsedDateRange]);

  // 3. Overall KPI Metrics
  const totalRevenue = useMemo(() => periodPayments.reduce((sum, p) => sum + p.amount, 0), [periodPayments]);
  
  const outstandingDues = useMemo(() => {
    // Outstanding remains a current snapshot of remaining lead balances
    return leads.reduce((sum, l) => sum + (l.remaining_amount || 0), 0);
  }, [leads]);

  const branchWiseCalculated = useMemo(() => {
    return branches.map(branch => {
      const branchPayments = periodPayments.filter(p => p.branchId === branch.id || p.lead.branch_name === branch.name);
      const branchRev = branchPayments.reduce((sum, p) => sum + p.amount, 0);
      
      // Get employees in this branch
      const branchEmployees = users.filter(u => u.branch_id === branch.id || u.branch_name === branch.name);
      
      // Calculate executive breakdown
      const execBreakdown = branchEmployees.map(emp => {
        const empPayments = branchPayments.filter(p => p.executiveId === emp.id);
        const empRev = empPayments.reduce((sum, p) => sum + p.amount, 0);
        return {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          revenue: empRev
        };
      }).sort((a, b) => b.revenue - a.revenue);

      const manager = users.find(u => u.id === branch.manager_id);

      return {
        ...branch,
        managerName: manager ? manager.name : 'No Manager',
        employeeCount: branchEmployees.length,
        revenue: branchRev,
        executives: execBreakdown
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [branches, periodPayments, users]);

  const avgRevenuePerBranch = useMemo(() => {
    if (branches.length === 0) return 0;
    return totalRevenue / branches.length;
  }, [totalRevenue, branches]);

  // 4. Charts Data
  // Trend area chart (Grouped by Date)
  const revenueTrendData = useMemo(() => {
    const dateMap: Record<string, number> = {};
    
    periodPayments.forEach(p => {
      const dayStr = p.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      dateMap[dayStr] = (dateMap[dayStr] || 0) + p.amount;
    });

    return Object.entries(dateMap).map(([date, revenue]) => ({
      date,
      revenue
    })).slice(-15); // Show last 15 active days
  }, [periodPayments]);

  // Service distribution chart (Donut)
  const serviceDistributionData = useMemo(() => {
    const serviceMap: Record<string, number> = {};
    periodPayments.forEach(p => {
      const cleanService = p.service.split('-')[0].trim();
      serviceMap[cleanService] = (serviceMap[cleanService] || 0) + p.amount;
    });

    const colors = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#a855f7'];

    return Object.entries(serviceMap).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [periodPayments]);

  // Payment method stacked bar
  const paymentMethodData = useMemo(() => {
    const methods = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'];
    const methodMap: Record<string, number> = {};
    
    periodPayments.forEach(p => {
      const key = p.method;
      methodMap[key] = (methodMap[key] || 0) + p.amount;
    });

    return Object.entries(methodMap).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);
  }, [periodPayments]);

  // Excel & PDF Exports
  const handleExportExcel = () => {
    const rows = branchWiseCalculated.flatMap(b => [
      { Type: 'Branch', Name: b.name, Manager: b.managerName, City: b.city_name || '-', Employees: b.employeeCount, Revenue: b.revenue },
      ...b.executives.map(e => ({
        Type: '  └─ Employee', Name: `  ${e.name}`, Manager: '-', City: '-', Employees: '-', Revenue: e.revenue
      }))
    ]);

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Revenue Analytics');
    XLSX.writeFile(wb, `revenue_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('24eFiling CRM — Revenue Analytics Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${parsedDateRange.from || 'All'} to ${parsedDateRange.to || 'All'}`, 14, 22);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 27);

    const tableRows: any[] = [];
    branchWiseCalculated.forEach(b => {
      tableRows.push([b.name, b.managerName, b.city_name || '-', b.employeeCount, `INR ${b.revenue.toLocaleString('en-IN')}`]);
      b.executives.forEach(e => {
        tableRows.push([`  └─ ${e.name}`, `(${e.role})`, '-', '-', `INR ${e.revenue.toLocaleString('en-IN')}`]);
      });
    });

    autoTable(doc, {
      startY: 33,
      head: [['Branch / Employee', 'Manager / Role', 'City', 'Employees Count', 'Period Revenue']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8 }
    });

    doc.save(`revenue_analytics_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Revenue Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Analyze income generated across operating branches, employees, and services.
          </p>
        </div>

        {/* Time period selector */}
        <div className="flex flex-wrap items-center gap-2">
          {['today', 'this_week', 'this_month', 'this_quarter', 'all'].map((p) => (
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
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="border-white/10 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
            >
              Excel
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="outline"
              size="sm"
              className="border-white/10 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
            >
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-3xl font-bold mt-2 text-slate-100">
                ₹ {totalRevenue.toLocaleString('en-IN')}
              </h3>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500/40" />
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding Balances</p>
              <h3 className="text-3xl font-bold mt-2 text-indigo-400">
                ₹ {outstandingDues.toLocaleString('en-IN')}
              </h3>
            </div>
            <AlertCircle className="h-8 w-8 text-indigo-500/40" />
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch Average</p>
              <h3 className="text-3xl font-bold mt-2 text-slate-100">
                ₹ {avgRevenuePerBranch.toLocaleString('en-IN')}
              </h3>
            </div>
            <Building className="h-8 w-8 text-slate-500/40" />
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Payments Count</p>
              <h3 className="text-3xl font-bold mt-2 text-emerald-400">
                {periodPayments.length} Transactions
              </h3>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-500/40" />
          </CardContent>
        </Card>
      </div>

      {/* Visual Chart Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <Card className="lg:col-span-2 glass-card border-white/5 bg-slate-900/30 backdrop-blur-md">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Revenue Over Time
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-80 w-full">
              {revenueTrendData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  No transaction logs for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={revenueTrendData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                      formatter={(value: any) => [`₹ ${value.toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Service Donut Chart */}
        <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Top Services by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-80 w-full flex flex-col justify-between">
              {serviceDistributionData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  No service logs.
                </div>
              ) : (
                <>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <PieChart>
                        <Pie
                          data={serviceDistributionData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {serviceDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                          formatter={(value: any) => [`₹ ${value.toLocaleString('en-IN')}`, 'Revenue']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 px-2">
                    {serviceDistributionData.map((entry, index) => (
                      <div key={index} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-slate-300 truncate max-w-40 font-semibold">{entry.name}</span>
                        </div>
                        <span className="text-slate-100 font-bold">₹ {entry.value.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch and Employee breakdowns */}
      <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md overflow-hidden">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-lg font-bold text-slate-200">
            Branch & Employee Breakdown
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/20 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6 w-10"></th>
                <th className="py-4 px-6">Branch / Representative</th>
                <th className="py-4 px-6">Manager / Role</th>
                <th className="py-4 px-6">City Name</th>
                <th className="py-4 px-6">Representatives count</th>
                <th className="py-4 px-6 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {branchWiseCalculated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No branch data available.
                  </td>
                </tr>
              ) : (
                branchWiseCalculated.flatMap((branch) => {
                  const isExpanded = !!expandedBranches[branch.id];
                  
                  // Render branch row followed conditionally by employee rows
                  const rows = [
                    <tr
                      key={`branch-${branch.id}`}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => toggleBranch(branch.id)}
                    >
                      <td className="py-4 px-6 text-slate-400">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-200">
                        {branch.name}
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        {branch.managerName}
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {branch.city_name || '-'}
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {branch.employeeCount} reps
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-blue-400">
                        ₹ {branch.revenue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ];

                  if (isExpanded) {
                    branch.executives.forEach(exec => {
                      rows.push(
                        <tr key={`exec-${branch.id}-${exec.id}`} className="bg-slate-950/20 text-xs">
                          <td className="py-3 px-6"></td>
                          <td className="py-3 px-6 text-slate-300 pl-10 flex items-center gap-2">
                            <UserIcon className="h-3 w-3 text-slate-500" />
                            {exec.name}
                          </td>
                          <td className="py-3 px-6 text-slate-500 italic">
                            {exec.role}
                          </td>
                          <td className="py-3 px-6 text-slate-500">-</td>
                          <td className="py-3 px-6 text-slate-500">-</td>
                          <td className="py-3 px-6 text-right font-semibold text-slate-300">
                            ₹ {exec.revenue.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    });
                  }

                  return rows;
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
