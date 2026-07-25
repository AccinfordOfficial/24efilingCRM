import React, { useMemo } from 'react';
import { User, City, Branch } from '../../types';
import { Users, UserCheck, Building2, Map, ShieldCheck, UserPlus } from 'lucide-react';
import { isThisMonth } from 'date-fns';
import { StatCard } from '../ui/StatCard';

interface UserStatsProps {
  filteredUsers: User[];
  allUsers: User[];
  branches: Branch[];
  cities: City[];
  selectedCity: string;
  selectedBranch: string;
}

export const UserStats: React.FC<UserStatsProps> = ({ 
  filteredUsers, 
  allUsers, 
  branches, 
  cities, 
  selectedCity, 
  selectedBranch 
}) => {
  const stats = useMemo(() => {
    // We base some stats on the filtered subset and some globally depending on context.
    const totalFiltered = filteredUsers.length;
    const activeUsers = filteredUsers.filter(u => u.is_active).length;
    
    let relevantBranches = branches;
    if (selectedCity !== 'All Cities') {
      const cityId = cities.find(c => c.city_name === selectedCity)?.id;
      relevantBranches = branches.filter(b => b.city_id === cityId);
    }
    const branchCount = selectedBranch !== 'All Branches' ? 1 : relevantBranches.length;
    const cityCount = selectedCity !== 'All Cities' ? 1 : cities.length;
    const branchManagers = filteredUsers.filter(u => u.role === 'Branch Manager' || u.role === 'Admin' || u.role === 'Super Admin').length;

    const newThisMonth = filteredUsers.filter(u => {
      if (!u.created_at) return false;
      return isThisMonth(new Date(u.created_at));
    }).length;

    return {
      total: totalFiltered,
      active: activeUsers,
      branches: branchCount,
      cities: cityCount,
      managers: branchManagers,
      newThisMonth
    };
  }, [filteredUsers, allUsers, branches, cities, selectedCity, selectedBranch]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
      <StatCard title="Total Users" value={stats.total} icon={Users} />
      <StatCard title="Active Users" value={stats.active} icon={UserCheck} />
      <StatCard title="Total Branches" value={stats.branches} icon={Building2} />
      <StatCard title="Total Cities" value={stats.cities} icon={Map} />
      <StatCard title="Managers & Admins" value={stats.managers} icon={ShieldCheck} />
      <StatCard title="New This Month" value={stats.newThisMonth} icon={UserPlus} />
    </div>
  );
};
