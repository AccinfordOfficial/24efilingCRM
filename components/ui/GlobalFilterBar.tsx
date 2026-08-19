import React from 'react';
import { useGlobalFilter } from '../../contexts/GlobalFilterContext';
import { SearchableSelect } from './SearchableSelect';
import { Select } from './Select';
import { Popover } from './Popover';
import { Calendar } from './Calendar';
import { Button } from './Button';
import { CalendarIcon } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

export interface GlobalFilterBarProps {
    extraFilters?: React.ReactNode;
    currentUserRole: string; 
}

const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({ extraFilters, currentUserRole }) => {
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

    const isAdmin = ['Super Admin', 'Admin', 'Branch Manager'].includes(currentUserRole);
    const isSalesExecutive = currentUserRole === 'Sales Executive';

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
        <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-wrap items-center gap-3 relative z-40">

            {/* Core Organization Filters */}
            {!isSalesExecutive && (
                <>
                    <div className="flex-1 min-w-[140px]">
                        <SearchableSelect options={cityOptions} value={cityId} onChange={setCityId} />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <SearchableSelect options={branchOptions} value={branchId} onChange={setBranchId} />
                    </div>
                </>
            )}
            
            {isAdmin && (
                <div className="flex-1 min-w-[140px]">
                    <SearchableSelect options={adminOptions} value={adminId} onChange={setAdminId} />
                </div>
            )}
            {isAdmin && (
                <div className="flex-1 min-w-[140px]">
                    <SearchableSelect options={employeeOptions} value={employeeId} onChange={setEmployeeId} />
                </div>
            )}

            {!isSalesExecutive && (
                <div className="flex-1 min-w-[140px]">
                    <SearchableSelect options={leadSourceOptions} value={leadSourceId} onChange={setLeadSourceId} />
                </div>
            )}

            {/* Extra Slots for Page-Specific Filters (e.g. Lead Status, Payment Mode) */}
            {extraFilters}

            {/* Date Range Filters */}
            <div className="flex-1 min-w-[160px]">
                <Select 
                    value={activePreset} 
                    onChange={(e) => { 
                        const val = e.target.value as any; 
                        setActivePreset(val);
                        if (val !== 'custom') {
                            setDateRange(getPresetRange(val)); 
                        }
                    }} 
                    className="w-full text-xs h-9 bg-white border-slate-200"
                >
                    <option value="all">📅 All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this_week">This Week</option>
                    <option value="last_7_days">Last 7 Days</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="this_year">This Year</option>
                    <option value="custom">Custom Range...</option>
                </Select>
            </div>
            
            {activePreset === 'custom' && (
                <div className="flex-1 min-w-[200px]">
                    <Popover align="end" trigger={
                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-white border-slate-200 hover:bg-slate-50 text-xs h-9">
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-500" />
                            {dateRange.from ? (dateRange.to ? `${formatDate(dateRange.from)} – ${formatDate(dateRange.to)}` : formatDate(dateRange.from)) : 'Pick dates'}
                        </Button>
                    } content={<Calendar dateRange={{ from: dateRange.from ? dateRange.from.toISOString().split('T')[0] : '', to: dateRange.to ? dateRange.to.toISOString().split('T')[0] : '' }} onDateChange={(range) => setDateRange({ from: range.from ? new Date(`${range.from}T00:00:00`) : undefined, to: range.to ? new Date(`${range.to}T00:00:00`) : undefined })} />} />
                </div>
            )}
            
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
                className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
                Reset
            </Button>
        </div>
    );
};
