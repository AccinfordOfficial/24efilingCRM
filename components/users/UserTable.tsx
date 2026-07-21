import React from 'react';
import { User } from '../../types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import { getRoleColor } from '../../constants';
import { MoreVertical, Edit2, Eye, Shield, Key, ArrowRightLeft } from 'lucide-react';
import { Switch } from '../ui/Switch';
import { Popover } from '../ui/Popover';

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onToggleStatus: (user: User, status: boolean) => void;
  onViewActivity: (user: User) => void;
  onTransfer: (user: User) => void;
  currentUserRole?: string;
  currentUser?: User;
}

export const UserTable: React.FC<UserTableProps> = ({ users, onEdit, onToggleStatus, onViewActivity, onTransfer, currentUserRole, currentUser }) => {
  if (users.length === 0) {
    return (
      <div className="glass-card border border-white/5 p-12 text-center">
        <p className="text-slate-400 font-medium">No users found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="glass-card border border-white/5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-white/5 border-b border-white/5 text-xs uppercase font-semibold text-slate-400">
            <tr>
              <th className="px-6 py-4 whitespace-nowrap">Employee</th>
              <th className="px-6 py-4 whitespace-nowrap">Designation</th>
              <th className="px-6 py-4 whitespace-nowrap">Contact Info</th>
              <th className="px-6 py-4 whitespace-nowrap">Location</th>
              <th className="px-6 py-4 whitespace-nowrap">Status</th>
              <th className="px-6 py-4 whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => {
              const roleColor = getRoleColor(user.role);
              const canManage = (() => {
                if (!currentUser) return false;
                if (user.id === currentUser.id) return false;
                if (currentUserRole === 'Super Admin') return user.role !== 'Super Admin';
                if (currentUserRole === 'Admin' || currentUserRole === 'Branch Manager') {
                  return user.role === 'Sales Executive' && 
                         (user.branch_id === currentUser.branch_id || user.branch_name === currentUser.branch_name);
                }
                return false;
              })();

              return (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-white/10">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                        <AvatarFallback className="bg-slate-800 text-primary font-semibold">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-white">{user.name}</div>
                        <div className="text-xs text-slate-500">ID: {user.id.substring(0, 8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${roleColor}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-200">{user.email}</div>
                    <div className="text-xs text-slate-500">{user.phone_number || 'No phone'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-200">{user.city_name || 'N/A'}</div>
                    <div className="text-xs text-slate-400">{user.branch_name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.is_active}
                        onChange={(checked) => onToggleStatus(user, checked)}
                        disabled={!canManage}
                        className="data-[state=checked]:bg-primary scale-75 origin-left"
                      />
                      <span className={`text-xs font-semibold ${user.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Popover 
                      trigger={<button className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors border border-white/5"><MoreVertical className="h-4 w-4" /></button>}
                      content={
                        <div className="flex flex-col py-1 min-w-[140px] bg-slate-950 border border-white/10 rounded-lg shadow-xl text-white">
                          <button onClick={() => onViewActivity(user)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 transition-colors w-full text-left">
                            <Eye className="h-4 w-4 text-slate-400" /> View Profile
                          </button>
                          {canManage && (
                            <>
                              <button onClick={() => onEdit(user)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 transition-colors w-full text-left">
                                <Edit2 className="h-4 w-4 text-slate-400" /> Edit User
                              </button>
                              {currentUserRole === 'Super Admin' && (
                                <button onClick={() => onEdit(user)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 transition-colors w-full text-left">
                                  <Shield className="h-4 w-4 text-slate-400" /> Assign Role
                                </button>
                              )}
                              <button onClick={() => onTransfer(user)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 transition-colors w-full text-left">
                                <ArrowRightLeft className="h-4 w-4 text-slate-400" /> Transfer
                              </button>
                              <button onClick={() => onEdit(user)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 transition-colors w-full text-left">
                                  <Key className="h-4 w-4 text-slate-400" /> Reset Password
                              </button>
                            </>
                          )}
                        </div>
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
