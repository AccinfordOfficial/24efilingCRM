import React, { useState, useMemo } from 'react';
import { useGlobalFilter } from '../../contexts/GlobalFilterContext';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Select } from '../ui/Select';
import { Popover } from '../ui/Popover';
import { Calendar } from '../ui/Calendar';
import { Button } from '../ui/Button';
import { CalendarIcon, Filter, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

interface DashboardFilterBarProps {
  currentUserRole: string;
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({ currentUserRole }) => {
  const {
    cityId, setCityId,
    branchId, setBranchId,
    adminId, setAdminId,
    employeeId, setEmployeeId,
    leadSourceId, setLeadSourceId,
    dateRange, setDateRange,
    activePreset, setActivePreset,
    availableCities,
    availableBranches,
    availableAdmins,
    availableEmployees,
    getPresetRange
  } = useGlobalFilter();

  const { leadSources } = useApi({ fetchOnMount: false });
  const [isExpanded, setIsExpanded] = useState(false);

  const isAdmin = ['Super Admin', 'Admin', 'Branch Manager'].includes(currentUserRole);
  const isSalesExecutive = currentUserRole === 'Sales Executive';

  // Calculate active organization filters count (excluding date range)
  const activeOrgFiltersCount = useMemo(() => {
    let count = 0;
    if (cityId !== 'All Cities') count++;
    if (branchId !== 'All Branches') count++;
    if (adminId !== 'All Managers') count++;
    if (employeeId !== 'All Employees') count++;
    if (leadSourceId !== 'All Sources') count++;
    return count;
  }, [cityId, branchId, adminId, employeeId, leadSourceId]);

  // Check if reset button is relevant (any filter changed from default)
  const hasActiveFilters = useMemo(() => {
    return activeOrgFiltersCount > 0 || activePreset !== 'all';
  }, [activeOrgFiltersCount, activePreset]);

  const cityOptions = [
    { value: 'All Cities', label: 'All Cities' },
    ...availableCities.map(c => ({ value: c.id, label: c.city_name }))
  ];

  const branchOptions = [
    { value: 'All Branches', label: 'All Branches' },
    ...availableBranches.map(b => ({ value: b.id, label: b.name }))
  ];

  const adminOptions = [
    { value: 'All Managers', label: 'All Managers' },
    ...availableAdmins.map(u => ({ value: u.id, label: u.name }))
  ];

  const employeeOptions = [
    { value: 'All Employees', label: 'All Employees' },
    ...availableEmployees.map(u => ({ value: u.id, label: u.name }))
  ];

  const leadSourceOptions = [
    { value: 'All Sources', label: 'All Sources' },
    ...leadSources.map(s => ({ value: s.id, label: s.source_name }))
  ];

  return (
    <div className="glass-card p-3 md:p-4 rounded-2xl border border-white/5 flex flex-col w-full relative z-40">

      {/* Top Row: Date filters & More Filters toggle */}
      <div className="flex flex-wrap items-center gap-3 w-full">
        <div className="flex items-center gap-2 dark:text-slate-400 text-xs font-semibold mr-2">
          <Filter className="h-4 w-4 text-primary" />
          <span>Period</span>
        </div>

        {/* Date Preset Selector */}
        <div className="flex-1 min-w-[160px] max-w-[220px]">
          <Select 
            value={activePreset} 
            onChange={(e) => { 
              const val = e.target.value as any; 
              setActivePreset(val);
              if (val !== 'custom') {
                setDateRange(getPresetRange(val)); 
              }
            }} 
            className="w-full text-xs h-10 bg-slate-950/60 border-white/10 text-slate-200 focus:border-primary/50 focus:ring-primary/20 rounded-lg"
          >
            <option value="all" className="bg-slate-900 text-white">📅 All Time</option>
            <option value="today" className="bg-slate-900 text-white">Today</option>
            <option value="yesterday" className="bg-slate-900 text-white">Yesterday</option>
            <option value="this_week" className="bg-slate-900 text-white">This Week</option>
            <option value="last_7_days" className="bg-slate-900 text-white">Last 7 Days</option>
            <option value="this_month" className="bg-slate-900 text-white">This Month</option>
            <option value="last_month" className="bg-slate-900 text-white">Last Month</option>
            <option value="this_year" className="bg-slate-900 text-white">This Year</option>
            <option value="custom" className="bg-slate-900 text-white">Custom Range...</option>
          </Select>
        </div>
        
        {/* Custom Calendar Picker */}
        {activePreset === 'custom' && (
          <div className="flex-1 min-w-[200px] max-w-[260px]">
            <Popover 
              align="end" 
              trigger={
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left font-normal bg-slate-950/60 border-white/10 text-slate-300 hover:bg-slate-900 text-xs h-10 rounded-lg"
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
                  {dateRange.from ? (dateRange.to ? `${formatDate(dateRange.from)} – ${formatDate(dateRange.to)}` : formatDate(dateRange.from)) : 'Pick dates'}
                </Button>
              } 
              content={<Calendar dateRange={{ from: dateRange.from ? dateRange.from.toISOString().split('T')[0] : '', to: dateRange.to ? dateRange.to.toISOString().split('T')[0] : '' }} onDateChange={(range) => setDateRange({ from: range.from ? new Date(`${range.from}T00:00:00`) : undefined, to: range.to ? new Date(`${range.to}T00:00:00`) : undefined })} />} 
            />
          </div>
        )}

        {/* More Filters Toggle */}
        {!isSalesExecutive && (
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-10 text-xs font-semibold bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-900 rounded-lg flex items-center gap-1.5 px-3"
          >
            <span>More Filters</span>
            {activeOrgFiltersCount > 0 && (
              <span className="bg-primary/20 text-primary border border-primary/25 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                {activeOrgFiltersCount}
              </span>
            )}
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
          </Button>
        )}

        <div className="flex-1" />
        
        {/* Reset Filters */}
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            onClick={() => { 
              setCityId('All Cities'); 
              setBranchId('All Branches'); 
              setAdminId('All Managers'); 
              setEmployeeId('All Employees'); 
              setLeadSourceId('All Sources');
              setActivePreset('all');
              setDateRange(getPresetRange('all')); 
            }} 
            className="h-10 text-xs font-semibold dark:text-slate-400 dark:hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reset</span>
          </Button>
        )}
      </div>

      {/* Expanded Row: Organization dropdowns rendered in a responsive grid */}
      {isExpanded && !isSalesExecutive && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-white/5 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* City Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">City</span>
            <SearchableSelect 
              options={cityOptions} 
              value={cityId} 
              onChange={setCityId} 
              placeholder="Select City"
            />
          </div>

          {/* Branch Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Branch</span>
            <SearchableSelect 
              options={branchOptions} 
              value={branchId} 
              onChange={setBranchId} 
              placeholder="Select Branch"
            />
          </div>

          {/* Manager Filter */}
          {isAdmin && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Manager</span>
              <SearchableSelect 
                options={adminOptions} 
                value={adminId} 
                onChange={setAdminId} 
                placeholder="Select Manager"
              />
            </div>
          )}

          {/* Employee Filter */}
          {isAdmin && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Employee</span>
              <SearchableSelect 
                options={employeeOptions} 
                value={employeeId} 
                onChange={setEmployeeId} 
                placeholder="Select Employee"
              />
            </div>
          )}

          {/* Lead Source Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Source</span>
            <SearchableSelect 
              options={leadSourceOptions} 
              value={leadSourceId} 
              onChange={setLeadSourceId} 
              placeholder="Select Source"
            />
          </div>
        </div>
      )}
    </div>
  );
};
