import React, { useState, useMemo } from 'react';
import { Lead, User, UserRole, Branch } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Trophy, Search, Star, BarChart3, User as UserIcon, Building, TrendingUp, CheckCircle, Clock, ChevronRight, X, DollarSign } from 'lucide-react';
import { useGlobalFilter } from '../contexts/GlobalFilterContext';
import { getLocalDateString, getPresetRange } from '../hooks/useDashboardMetrics';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface EmployeePerformanceProps {
  leads: Lead[];
  users: User[];
  branches: Branch[];
  currentUser: User;
}

export default function EmployeePerformance({
  leads = [],
  users = [],
  branches = [],
  currentUser,
}: EmployeePerformanceProps) {
  const { dateRange, setDateRange } = useGlobalFilter();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [selectedPreset, setSelectedPreset] = useState('this_month');
  
  // Detail and comparison states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [compareList, setCompareList] = useState<User[]>([]);
  const [compareMode, setCompareMode] = useState(false);

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

  const handleSelectUser = (user: User) => {
    if (compareMode) {
      if (compareList.some(u => u.id === user.id)) {
        setCompareList(compareList.filter(u => u.id !== user.id));
      } else {
        if (compareList.length >= 3) {
          alert('You can compare a maximum of 3 representatives.');
          return;
        }
        setCompareList([...compareList, user]);
      }
    } else {
      setSelectedUser(user);
    }
  };

  const handleToggleCompareMode = () => {
    setCompareMode(!compareMode);
    setCompareList([]);
    setSelectedUser(null);
  };

  const parsedDateRange = useMemo(() => {
    return {
      from: dateRange.from ? getLocalDateString(dateRange.from) : '',
      to: dateRange.to ? getLocalDateString(dateRange.to) : ''
    };
  }, [dateRange]);

  // Filter list of employees (Sales Executives only)
  const salesExecutives = useMemo(() => {
    return users.filter(u => {
      if (u.role !== UserRole.SALES_EXECUTIVE) return false;
      if (selectedBranchId !== 'all' && u.branch_id !== selectedBranchId) return false;
      return u.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [users, selectedBranchId, searchTerm]);

  // Aggregate executive metrics in selected period
  const executivesPerformance = useMemo(() => {
    const fromDate = parsedDateRange.from ? new Date(`${parsedDateRange.from}T00:00:00`) : null;
    const toDate = parsedDateRange.to ? new Date(`${parsedDateRange.to}T23:59:59.999`) : null;

    return salesExecutives.map(exec => {
      // Leads assigned to this exec in this period
      const execLeads = leads.filter(l => {
        if (l.assigned_to?.id !== exec.id) return false;
        const d = new Date(l.created_at);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });

      const totalLeads = execLeads.length;
      const convertedLeads = execLeads.filter(l => l.status === 'Success').length;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      // Revenue generated in this period
      let revenue = 0;
      execLeads.forEach(lead => {
        (lead.payments || []).forEach(p => {
          if (!p.date) return;
          const pd = new Date(p.date);
          if (fromDate && pd < fromDate) return;
          if (toDate && pd > toDate) return;
          revenue += Number(p.amount) || Number(p.received) || 0;
        });
      });

      // Tasks completed
      let completedTasks = 0;
      let totalTasks = 0;
      execLeads.forEach(lead => {
        (lead.tasks || []).forEach(t => {
          totalTasks++;
          if (t.is_completed) completedTasks++;
        });
      });

      // Activity Score (Calls + Emails + Notes)
      let activityCount = 0;
      execLeads.forEach(lead => {
        activityCount += (lead.activities || []).length;
      });

      const avgDealSize = convertedLeads > 0 ? revenue / convertedLeads : 0;

      return {
        user: exec,
        totalLeads,
        convertedLeads,
        conversionRate,
        revenue,
        completedTasks,
        totalTasks,
        taskCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        activityScore: activityCount,
        avgDealSize
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [salesExecutives, leads, parsedDateRange]);

  // Leaders summaries
  const leaders = useMemo(() => {
    if (executivesPerformance.length === 0) return { revenue: null, conversion: null };
    const sortedByRevenue = [...executivesPerformance].sort((a, b) => b.revenue - a.revenue);
    const sortedByConversion = [...executivesPerformance].sort((a, b) => b.conversionRate - a.conversionRate);
    
    return {
      revenue: sortedByRevenue[0]?.revenue > 0 ? sortedByRevenue[0] : null,
      conversion: sortedByConversion[0]?.conversionRate > 0 ? sortedByConversion[0] : null
    };
  }, [executivesPerformance]);

  // Detail panel stats for selected user
  const selectedUserStats = useMemo(() => {
    if (!selectedUser) return null;
    return executivesPerformance.find(ep => ep.user.id === selectedUser.id) || null;
  }, [selectedUser, executivesPerformance]);

  // Multi-user comparison chart data
  const comparisonChartData = useMemo(() => {
    if (compareList.length === 0) return [];
    return compareList.map(u => {
      const perf = executivesPerformance.find(ep => ep.user.id === u.id);
      return {
        name: u.name,
        'Revenue (₹)': perf ? perf.revenue : 0,
        'Leads Assigned': perf ? perf.totalLeads : 0,
        'Deals Closed': perf ? perf.convertedLeads : 0,
        'Conv. Rate (%)': perf ? Math.round(perf.conversionRate) : 0
      };
    });
  }, [compareList, executivesPerformance]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Representative Performance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track representative conversion rates, closed deals, outstanding tasks, and sales contributions.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {['today', 'this_week', 'this_month', 'all'].map((p) => (
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

          <Button
            onClick={handleToggleCompareMode}
            variant="outline"
            className={`border-white/10 text-xs font-medium ${compareMode ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
          >
            {compareMode ? 'Exit Compare' : 'Compare Reps'}
          </Button>
        </div>
      </div>

      {/* Leaderboard Cards */}
      {!compareMode && !selectedUser && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Revenue Generator</p>
                {leaders.revenue ? (
                  <>
                    <h3 className="text-2xl font-bold mt-2 text-slate-100">{leaders.revenue.user.name}</h3>
                    <p className="text-sm text-emerald-400 font-semibold mt-1">₹ {leaders.revenue.revenue.toLocaleString('en-IN')}</p>
                  </>
                ) : (
                  <p className="text-sm mt-2 text-slate-500">No data for this period.</p>
                )}
              </div>
              <Trophy className="h-10 w-10 text-yellow-500/50" />
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Highest Conversion Rate</p>
                {leaders.conversion ? (
                  <>
                    <h3 className="text-2xl font-bold mt-2 text-slate-100">{leaders.conversion.user.name}</h3>
                    <p className="text-sm text-blue-400 font-semibold mt-1">{leaders.conversion.conversionRate.toFixed(1)}%</p>
                  </>
                ) : (
                  <p className="text-sm mt-2 text-slate-500">No data for this period.</p>
                )}
              </div>
              <Star className="h-10 w-10 text-blue-500/50" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter panel */}
      <Card className="glass-card border-white/5 bg-slate-900/20 backdrop-blur-md p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name..."
            className="pl-9 bg-slate-950 border-white/5 text-slate-100 text-sm focus:border-blue-500 focus:ring-0"
          />
        </div>

        <select
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          className="w-full sm:w-48 bg-slate-950 border border-white/5 text-slate-300 rounded-md p-2 text-xs focus:outline-none"
        >
          <option value="all">All Branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </Card>

      {/* Comparison Panel */}
      {compareMode && compareList.length > 0 && (
        <Card className="glass-card border-indigo-500/20 bg-indigo-950/10 backdrop-blur-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-200">Comparing: {compareList.map(u => u.name).join(', ')}</h3>
            <Button
              onClick={() => setCompareList([])}
              variant="ghost"
              className="text-slate-400 hover:text-white"
            >
              Reset Comparison
            </Button>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                <Legend />
                <Bar dataKey="Revenue (₹)" fill="#10b981" />
                <Bar dataKey="Deals Closed" fill="#3b82f6" />
                <Bar dataKey="Conv. Rate (%)" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Representatives List */}
        <Card className="lg:col-span-2 glass-card border-white/5 bg-slate-900/30 backdrop-blur-md overflow-hidden">
          <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-200">
              {compareMode ? 'Select Reps to Compare (Max 3)' : 'Representative Rankings'}
            </CardTitle>
            {compareMode && (
              <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full font-bold">
                {compareList.length}/3 selected
              </span>
            )}
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/20 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Representative</th>
                  <th className="py-4 px-6 text-center">Leads</th>
                  <th className="py-4 px-6 text-center">Conversions</th>
                  <th className="py-4 px-6 text-center">Conv. Rate</th>
                  <th className="py-4 px-6 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {executivesPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No representatives matching filter.
                    </td>
                  </tr>
                ) : (
                  executivesPerformance.map((item) => {
                    const isSelectedInCompare = compareList.some(u => u.id === item.user.id);
                    const isSelectedDetail = selectedUser?.id === item.user.id;

                    return (
                      <tr
                        key={item.user.id}
                        onClick={() => handleSelectUser(item.user)}
                        className={`hover:bg-white/5 transition-colors cursor-pointer ${
                          isSelectedInCompare ? 'bg-indigo-600/10 hover:bg-indigo-600/20' : ''
                        } ${isSelectedDetail ? 'bg-blue-600/10 hover:bg-blue-600/20' : ''}`}
                      >
                        <td className="py-4 px-6 font-semibold text-slate-200 flex items-center gap-3">
                          <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-400 border border-white/5">
                            {item.user.name[0]}
                          </div>
                          <div>
                            <p className="text-slate-100 font-bold">{item.user.name}</p>
                            <p className="text-slate-500 text-xs">{item.user.branch_name || 'No Branch'}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center text-slate-300">
                          {item.totalLeads}
                        </td>
                        <td className="py-4 px-6 text-center text-slate-300">
                          {item.convertedLeads}
                        </td>
                        <td className="py-4 px-6 text-center text-slate-400 font-semibold">
                          {item.conversionRate.toFixed(1)}%
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-emerald-400">
                          ₹ {item.revenue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Detailed User Card Drawer / Section */}
        <div className="space-y-6">
          {selectedUserStats ? (
            <Card className="glass-card border-blue-500/20 bg-slate-900/40 backdrop-blur-md p-6 relative">
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/5 transition-all"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3.5 pb-4 border-b border-white/5">
                <div className="h-11 w-11 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-slate-100">
                  {selectedUserStats.user.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-100">{selectedUserStats.user.name}</h3>
                  <p className="text-slate-400 text-xs">{selectedUserStats.user.email}</p>
                </div>
              </div>

              {/* Stat breakdowns */}
              <div className="grid grid-cols-2 gap-4 pt-6">
                <div className="bg-slate-950/20 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                    Conversions
                  </div>
                  <p className="text-xl font-bold mt-2 text-slate-100">{selectedUserStats.convertedLeads} / {selectedUserStats.totalLeads}</p>
                  <p className="text-slate-400 text-xs mt-1">{selectedUserStats.conversionRate.toFixed(1)}% rate</p>
                </div>

                <div className="bg-slate-950/20 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                    Revenue
                  </div>
                  <p className="text-xl font-bold mt-2 text-slate-100">₹ {selectedUserStats.revenue.toLocaleString('en-IN')}</p>
                  <p className="text-slate-400 text-xs mt-1">₹ {Math.round(selectedUserStats.avgDealSize).toLocaleString('en-IN')} avg deal</p>
                </div>

                <div className="bg-slate-950/20 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle className="h-3.5 w-3.5 text-purple-400" />
                    Tasks Status
                  </div>
                  <p className="text-xl font-bold mt-2 text-slate-100">{selectedUserStats.completedTasks} / {selectedUserStats.totalTasks}</p>
                  <p className="text-slate-400 text-xs mt-1">{selectedUserStats.taskCompletionRate.toFixed(1)}% completed</p>
                </div>

                <div className="bg-slate-950/20 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    Activities
                  </div>
                  <p className="text-xl font-bold mt-2 text-slate-100">{selectedUserStats.activityScore}</p>
                  <p className="text-slate-400 text-xs mt-1">Total touches</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="glass-card border-white/5 bg-slate-900/10 backdrop-blur-md p-6 text-center text-slate-500 flex flex-col items-center justify-center h-full min-h-[300px] gap-2.5">
              <UserIcon className="h-10 w-10 text-slate-600" />
              <div>
                <h4 className="font-semibold text-slate-300">Detailed Analytics</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
                  Select any sales representative from the ranking list to load their individual funnel statistics.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
