import React, { useState, useMemo, useEffect } from 'react';
import { User, UserActivity, Branch, City } from '../types';
import { Button } from '../components/ui/Button';
import { PlusCircle, Briefcase, Users } from 'lucide-react';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { Dialog } from '../components/ui/Dialog';

// Import our newly created components
import { UserStats } from '../components/users/UserStats';
import { UserFilterBar } from '../components/users/UserFilterBar';
import { UserGrid } from '../components/users/UserGrid';
import { UserTable } from '../components/users/UserTable';
import { UserTreeView } from '../components/users/UserTreeView';
import { TransferUserModal } from '../components/users/TransferUserModal';
import { UserDetailDrawer } from '../components/users/UserDetailDrawer';

interface UserManagementProps {
  users: User[];
  cities?: City[];
  branches?: Branch[];
  leads?: any[];
  onOpenUserForm: (user: User | null) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUsers: (userIds: string[]) => void;
  dateRange: { from: string; to: string };
  setDateRange: (value: React.SetStateAction<{ from: string; to: string; }>) => void;
  userActivities: UserActivity[];
  currentUserRole?: string;
  currentUser?: User;
  initialBranchFilter?: string | null;
  onFilterClear?: () => void;
  onTransferUser?: (userId: string, toCityId: string, toCityName: string, toBranchId: string, toBranchName: string) => void;
}

const DateBadge: React.FC<{ date: string }> = ({ date }) => {
  const d = new Date(date);
  let label = d.toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' });
  const now = new Date();
  if (d.toDateString() === now.toDateString()) label = 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';

  return (
    <div className="sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm z-10 py-2 border-b border-slate-200 dark:border-white/5 mb-4">
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
  );
};

const UserActivityTimeline: React.FC<{ activities: UserActivity[] }> = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-20" />
        <p>No activity recorded for this user yet.</p>
      </div>
    );
  }

  const grouped: { [key: string]: UserActivity[] } = {};
  activities.forEach(act => {
    try {
      const date = new Date(act.timestamp);
      if (isNaN(date.getTime())) return;
      const dateKey = date.toISOString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(act);
    } catch (e) {
      console.warn("Invalid activity date:", act);
    }
  });

  return (
    <div className="space-y-6">
      {Object.entries(grouped)
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([date, dailyActs]) => (
          <div key={date}>
            <DateBadge date={date} />
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200 dark:before:bg-white/5">
              {dailyActs.map((act) => (
                <div key={act.id} className="relative group">
                  <div className="absolute left-[-21px] top-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-950 ring-2 ring-slate-200 dark:ring-white/10 bg-slate-400 dark:bg-slate-600 group-hover:bg-primary group-hover:ring-primary transition-all"></div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">{act.action}</span>
                      <span className="text-xs text-slate-500 font-mono">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-100 dark:bg-white/5 p-3 rounded-md border border-slate-200 dark:border-white/5">
                      {act.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
};

const UserManagement: React.FC<UserManagementProps> = ({ 
  users, 
  cities = [], 
  branches = [], 
  leads = [],
  onOpenUserForm, 
  onUpdateUser, 
  onDeleteUsers, 
  dateRange, 
  setDateRange, 
  userActivities, 
  currentUserRole, 
  currentUser,
  initialBranchFilter, 
  onFilterClear,
  onTransferUser
}) => {
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedBranch, setSelectedBranch] = useState(initialBranchFilter || 'All Branches');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'tree'>('grid');

  // Modal / Confirm States
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [userToTransfer, setUserToTransfer] = useState<User | null>(null);

  useEffect(() => {
    if (initialBranchFilter) {
      setSelectedBranch(initialBranchFilter);
    }
  }, [initialBranchFilter]);

  // Handle derived city selection if initialBranchFilter is provided and no city is selected
  useEffect(() => {
    if (initialBranchFilter && selectedCity === 'All Cities' && branches.length > 0) {
      const branch = branches.find(b => b.name === initialBranchFilter);
      if (branch && branch.city_id) {
        const city = cities.find(c => c.id === branch.city_id);
        if (city) {
          setSelectedCity(city.city_name);
        }
      }
    }
  }, [initialBranchFilter, branches, cities, selectedCity]);

  // Filtering Logic
  const filteredUsers = useMemo(() => {
    const usersWithCity = users.map(user => {
      let resolvedCityName = user.city_name;
      if (!resolvedCityName && user.branch_name && branches.length > 0 && cities.length > 0) {
        const branch = branches.find(b => b.name === user.branch_name);
        if (branch && branch.city_id) {
          const city = cities.find(c => c.id === branch.city_id);
          if (city) {
            resolvedCityName = city.city_name;
          }
        }
      }
      return { ...user, city_name: resolvedCityName };
    });

    return usersWithCity.filter(user => {
      const matchesSearch = 
        searchQuery === '' || 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone_number && user.phone_number.includes(searchQuery));

      const matchesRole = selectedRole === 'All Roles' || user.role === selectedRole;
      
      const matchesCity = selectedCity === 'All Cities' || user.city_name === selectedCity;
      const matchesBranch = selectedBranch === 'All Branches' || user.branch_name === selectedBranch;
      
      const matchesStatus = selectedStatus === 'All Status' || 
                           (selectedStatus === 'Active' && user.is_active) ||
                           (selectedStatus === 'Inactive' && !user.is_active);

      return matchesSearch && matchesRole && matchesCity && matchesBranch && matchesStatus;
    });
  }, [users, searchQuery, selectedRole, selectedCity, selectedBranch, selectedStatus, branches, cities]);

  // Actions
  const handleAddNew = () => onOpenUserForm(null);
  const handleEdit = (user: User) => onOpenUserForm(user);
  
  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      onDeleteUsers([userToDelete.id]);
      setUserToDelete(null);
      setIsDeleteConfirmOpen(false);
    }
  };

  const handleStatusToggle = (user: User, checked: boolean) => {
    onUpdateUser({ ...user, is_active: checked });
  };

  const handleViewActivity = (user: User) => {
    setViewingUser(user);
  };

  const handleTransferClick = (user: User) => {
    setUserToTransfer(user);
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = (userId: string, toCityId: string, toCityName: string, toBranchId: string, toBranchName: string) => {
    if (onTransferUser) {
      onTransferUser(userId, toCityId, toCityName, toBranchId, toBranchName);
    }
  };

  const selectedUserActivities = useMemo(() => {
    if (!viewingUser) return [];
    return (userActivities || []).filter(a => a.user_id === viewingUser.id);
  }, [viewingUser, userActivities]);

  return (
    <div className="space-y-6 pb-8 text-foreground max-w-7xl mx-auto p-4 md:p-6">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/80 dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5 backdrop-blur-md shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            User Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage personnel, roles, and branch assignments.</p>
        </div>
        <div className="flex items-center gap-2">
          {currentUserRole === 'Super Admin' && (
            <Button
              onClick={handleAddNew}
              className="gap-2 bg-primary hover:bg-primary/95 text-primary-foreground border border-white/10 px-6 py-2 rounded-xl"
            >
              <PlusCircle className="h-5 w-5" />
              Add New User
            </Button>
          )}
        </div>
      </header>

      {/* Dynamic Statistics */}
      <UserStats 
        filteredUsers={filteredUsers}
        allUsers={users}
        branches={branches}
        cities={cities}
        selectedCity={selectedCity}
        selectedBranch={selectedBranch}
      />

      {/* Advanced Filter Bar */}
      <UserFilterBar 
        cities={cities}
        branches={branches}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        selectedBranch={selectedBranch}
        setSelectedBranch={setSelectedBranch}
        selectedRole={selectedRole}
        setSelectedRole={setSelectedRole}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Dynamic View rendering */}
      {viewMode === 'tree' ? (
        <UserTreeView 
          users={filteredUsers}
          cities={cities}
          branches={branches}
        />
      ) : viewMode === 'grid' ? (
        <UserGrid 
          users={filteredUsers}
          onEdit={handleEdit}
          onToggleStatus={handleStatusToggle}
          onViewActivity={handleViewActivity}
          onTransfer={handleTransferClick}
          currentUserRole={currentUserRole}
          currentUser={currentUser}
        />
      ) : (
        <UserTable 
          users={filteredUsers}
          onEdit={handleEdit}
          onToggleStatus={handleStatusToggle}
          onViewActivity={handleViewActivity}
          onTransfer={handleTransferClick}
          currentUserRole={currentUserRole}
          currentUser={currentUser}
        />
      )}

      {/* Visual Footer */}
      {filteredUsers.length > 0 && (
        <div className="text-center text-xs text-slate-400 mt-8">
          Showing {filteredUsers.length} of {users.length} total employees
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove User"
        description={`Are you sure you want to remove ${userToDelete?.name}? This will revoke their access immediately.`}
        confirmButtonText="Remove User"
        cancelButtonText="Cancel"
      />

      {/* User Detail Right Side Drawer */}
      <UserDetailDrawer
        user={viewingUser}
        onClose={() => setViewingUser(null)}
        userActivities={userActivities}
        leads={leads}
        onEdit={handleEdit}
        onTransfer={handleTransferClick}
        canManage={currentUserRole === 'Super Admin' || currentUserRole === 'Admin'}
      />

      {/* Transfer User Modal */}
      <TransferUserModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        user={userToTransfer}
        cities={cities}
        branches={branches}
        onTransfer={handleTransferSubmit}
      />
    </div>
  );
};

export default UserManagement;