import React, { useMemo } from 'react';
import { City, Branch, UserRole } from '../../types';
import { Search, MapPin, Building, Shield, LayoutGrid, List, Network } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { USER_ROLES_WITH_DESCRIPTIONS } from '../../constants';

interface UserFilterBarProps {
  cities: City[];
  branches: Branch[];
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  selectedRole: string;
  setSelectedRole: (role: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: 'grid' | 'table' | 'tree';
  setViewMode: (mode: 'grid' | 'table' | 'tree') => void;
}

export const UserFilterBar: React.FC<UserFilterBarProps> = ({
  cities,
  branches,
  selectedCity,
  setSelectedCity,
  selectedBranch,
  setSelectedBranch,
  selectedRole,
  setSelectedRole,
  selectedStatus,
  setSelectedStatus,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode
}) => {

  const cityOptions = useMemo(() => {
    return ['All Cities', ...cities.map(c => c.city_name)];
  }, [cities]);

  const branchOptions = useMemo(() => {
    if (selectedCity === 'All Cities') {
      return ['All Branches', ...branches.map(b => b.name)];
    }
    const cityId = cities.find(c => c.city_name === selectedCity)?.id;
    const filteredBranches = branches.filter(b => b.city_id === cityId).map(b => b.name);
    return ['All Branches', ...filteredBranches];
  }, [selectedCity, branches, cities]);

  // When city changes, reset branch if it's no longer valid in the new city
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCity = e.target.value;
    setSelectedCity(newCity);
    setSelectedBranch('All Branches'); // Reset branch on city change
  };

  return (
    <div className="glass-card p-4 rounded-xl border border-white/5 mb-6 flex flex-col gap-4">
      {/* Top Row: Search & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            className="w-full pl-10 pr-4 py-2.5 border border-white/10 rounded-lg bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex bg-slate-900 p-1 rounded-lg border border-white/5 shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md flex items-center justify-center transition-all ${
              viewMode === 'grid' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-md flex items-center justify-center transition-all ${
              viewMode === 'table' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Table View"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`p-2 rounded-md flex items-center justify-center transition-all ${
              viewMode === 'tree' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Organization Tree View"
          >
            <Network className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom Row: Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* City Filter */}
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <select
            className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none text-sm text-slate-200"
            value={selectedCity}
            onChange={handleCityChange}
          >
            {cityOptions.map((city, idx) => (
              <option key={idx} value={city} className="bg-slate-950 text-white">{city}</option>
            ))}
          </select>
        </div>

        {/* Branch Filter */}
        <div className="relative">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <select
            className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none text-sm text-slate-200"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            {branchOptions.map((branch, idx) => (
              <option key={idx} value={branch} className="bg-slate-950 text-white">{branch}</option>
            ))}
          </select>
        </div>

        {/* Role Filter */}
        <div className="relative">
          <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <select
            className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none text-sm text-slate-200"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="All Roles" className="bg-slate-950 text-white">All Roles</option>
            {USER_ROLES_WITH_DESCRIPTIONS.map((roleObj, idx) => (
              <option key={idx} value={roleObj.role} className="bg-slate-950 text-white">{roleObj.role}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-emerald-500 pointer-events-none" />
          <select
            className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none text-sm text-slate-200"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All Status" className="bg-slate-950 text-white">All Status</option>
            <option value="Active" className="bg-slate-950 text-white">Active</option>
            <option value="Inactive" className="bg-slate-950 text-white">Inactive</option>
          </select>
        </div>
      </div>
    </div>
  );
};
