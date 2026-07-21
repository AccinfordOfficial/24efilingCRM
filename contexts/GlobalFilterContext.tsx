import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { User, City, Branch } from '../types';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export interface DateRange {
    from: Date | undefined;
    to: Date | undefined;
}

export type DatePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'last_7_days' | 'this_month' | 'last_month' | 'this_year' | 'custom';

interface GlobalFilterContextType {
    cityId: string | 'All Cities';
    branchId: string | 'All Branches';
    adminId: string | 'All Managers';
    employeeId: string | 'All Employees';
    leadSourceId: string | 'All Sources';
    dateRange: DateRange;
    activePreset: DatePreset;
    
    setCityId: (id: string | 'All Cities') => void;
    setBranchId: (id: string | 'All Branches') => void;
    setAdminId: (id: string | 'All Managers') => void;
    setEmployeeId: (id: string | 'All Employees') => void;
    setLeadSourceId: (id: string | 'All Sources') => void;
    setDateRange: (range: DateRange) => void;
    setActivePreset: (preset: DatePreset) => void;

    // Derived options based on cascade and permissions
    availableCities: City[];
    availableBranches: Branch[];
    availableAdmins: User[];
    availableEmployees: User[];
    
    // Quick helpers
    getPresetRange: (preset: string) => DateRange;
}

const GlobalFilterContext = createContext<GlobalFilterContextType | undefined>(undefined);

export const useGlobalFilter = () => {
    const context = useContext(GlobalFilterContext);
    if (!context) {
        throw new Error("useGlobalFilter must be used within a GlobalFilterProvider");
    }
    return context;
};

interface GlobalFilterProviderProps {
    children: ReactNode;
    currentUser: User | null;
    allUsers: User[];
    allCities: City[];
    allBranches: Branch[];
}

export const GlobalFilterProvider: React.FC<GlobalFilterProviderProps> = ({ 
    children, 
    currentUser, 
    allUsers, 
    allCities, 
    allBranches 
}) => {
    const [cityId, setCityId] = useState<string | 'All Cities'>('All Cities');
    const [branchId, setBranchId] = useState<string | 'All Branches'>('All Branches');
    const [adminId, setAdminId] = useState<string | 'All Managers'>('All Managers');
    const [employeeId, setEmployeeId] = useState<string | 'All Employees'>('All Employees');
    const [leadSourceId, setLeadSourceId] = useState<string | 'All Sources'>('All Sources');
    const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
    const [activePreset, setActivePreset] = useState<DatePreset>('all');

    // 1. Calculate Available Cities
    const availableCities = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.role === 'Super Admin') return allCities;
        
        // Admin or Exec: locked to their own city
        const userBranch = allBranches.find(b => b.id === currentUser.branch_id || b.name === currentUser.branch_name);
        if (userBranch) {
            return allCities.filter(c => c.id === userBranch.city_id || c.city_name === userBranch.city_name);
        }
        return allCities; 
    }, [currentUser, allCities, allBranches]);

    // 2. Calculate Available Branches
    const availableBranches = useMemo(() => {
        if (!currentUser) return [];
        let filtered = allBranches;
        
        if (cityId !== 'All Cities') {
            filtered = filtered.filter(b => b.city_id === cityId || b.city_name === cityId);
        }
        if (currentUser.role !== 'Super Admin') {
            filtered = filtered.filter(b => b.id === currentUser.branch_id || b.name === currentUser.branch_name);
        }
        return filtered;
    }, [cityId, allBranches, currentUser]);

    // 3. Calculate Available Admins
    const availableAdmins = useMemo(() => {
        if (!currentUser) return [];
        let filtered = allUsers.filter(u => ['Admin', 'Super Admin', 'Branch Manager'].includes(u.role));
        
        if (branchId !== 'All Branches') {
            filtered = filtered.filter(u => u.branch_id === branchId || u.branch_name === branchId);
        } else if (cityId !== 'All Cities') {
            const validBranchIds = availableBranches.map(b => b.id);
            const validBranchNames = availableBranches.map(b => b.name);
            filtered = filtered.filter(u => validBranchIds.includes(u.branch_id as string) || validBranchNames.includes(u.branch_name as string));
        }
        
        if (currentUser.role !== 'Super Admin' && currentUser.role !== 'Admin' && currentUser.role !== 'Branch Manager') {
            filtered = filtered.filter(u => u.id === currentUser.reporting_to);
        }
        return filtered;
    }, [branchId, cityId, allUsers, availableBranches, currentUser]);

    // 4. Calculate Available Employees
    const availableEmployees = useMemo(() => {
        if (!currentUser) return [];
        let filtered = allUsers;
        
        if (adminId !== 'All Managers') {
            filtered = filtered.filter(u => u.reporting_to === adminId || u.id === adminId);
        } else if (branchId !== 'All Branches') {
            filtered = filtered.filter(u => u.branch_id === branchId || u.branch_name === branchId);
        } else if (cityId !== 'All Cities') {
            const validBranchIds = availableBranches.map(b => b.id);
            const validBranchNames = availableBranches.map(b => b.name);
            filtered = filtered.filter(u => validBranchIds.includes(u.branch_id as string) || validBranchNames.includes(u.branch_name as string));
        }

        if (currentUser.role === 'Sales Executive' || currentUser.role === 'Service Executive') {
            filtered = filtered.filter(u => u.id === currentUser.id);
        }
        return filtered;
    }, [adminId, branchId, cityId, allUsers, availableBranches, currentUser]);


    useMemo(() => {
        if (cityId !== 'All Cities' && !availableCities.some(c => c.id === cityId || c.city_name === cityId)) {
            setCityId('All Cities');
        }
        if (branchId !== 'All Branches' && !availableBranches.some(b => b.id === branchId || b.name === branchId)) {
            setBranchId('All Branches');
        }
        if (adminId !== 'All Managers' && !availableAdmins.some(a => a.id === adminId)) {
            setAdminId('All Managers');
        }
        if (employeeId !== 'All Employees' && !availableEmployees.some(e => e.id === employeeId)) {
            setEmployeeId('All Employees');
        }
        
        if (currentUser && (currentUser.role === 'Sales Executive' || currentUser.role === 'Service Executive')) {
            setEmployeeId(currentUser.id);
        }
    }, [availableCities, availableBranches, availableAdmins, availableEmployees, currentUser, cityId, branchId, adminId, employeeId]);

    const getPresetRange = (val: string): DateRange => {
        const today = new Date();
        switch (val) {
            case 'today': return { from: startOfDay(today), to: endOfDay(today) };
            case 'yesterday': { const y = subDays(today, 1); return { from: startOfDay(y), to: endOfDay(y) }; }
            case 'this_week': return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
            case 'last_7_days': return { from: subDays(today, 7), to: today };
            case 'this_month': return { from: startOfMonth(today), to: endOfMonth(today) };
            case 'last_month': { const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1); return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }; }
            case 'this_year': return { from: startOfYear(today), to: endOfYear(today) };
            case 'all': default: return { from: undefined, to: undefined };
        }
    };

    return (
        <GlobalFilterContext.Provider value={{
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
        }}>
            {children}
        </GlobalFilterContext.Provider>
    );
};
