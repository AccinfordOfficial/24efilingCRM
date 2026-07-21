import React from 'react';
import { User } from '../../types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import { Mail, Phone, MapPin, Building2, MoreVertical, Edit2, Shield, Eye, Key, ArrowRightLeft } from 'lucide-react';
import { Switch } from '../ui/Switch';
import { Popover } from '../ui/Popover';
import { getRoleColor } from '../../constants';
import { formatDate } from '../../lib/utils'; // Assuming this exists or we can write a local one

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onToggleStatus: (user: User, status: boolean) => void;
  onViewActivity: (user: User) => void;
  onTransfer: (user: User) => void;
  currentUserRole?: string;
  currentUser?: User;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onToggleStatus, onViewActivity, onTransfer, currentUserRole, currentUser }) => {
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
    <div className="glass-card border border-white/5 hover:border-primary/20 transition-all duration-300 flex flex-col group overflow-hidden">
      {/* Top Banner (Color bar based on role) */}
      <div className={`h-2 w-full ${roleColor.replace('text-', 'bg-').replace('bg-opacity-10', '')}`} style={{ backgroundColor: user.role === 'Super Admin' ? '#8b5cf6' : user.role === 'Admin' ? '#f59e0b' : '#3b82f6' }} />
      
      {/* Header Profile Section */}
      <div className="p-5 flex flex-col items-center relative border-b border-white/5">
        
        {/* Actions Menu */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
        </div>

        {/* Avatar */}
        <Avatar className="h-20 w-20 border-4 border-slate-900 shadow-sm mb-3">
          <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
          <AvatarFallback className="bg-slate-800 text-primary text-2xl font-semibold">
            {user.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Name & Role */}
        <h3 className="text-lg font-bold text-white leading-tight text-center">{user.name}</h3>
        <span className={`mt-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${roleColor}`}>
          {user.role}
        </span>
      </div>

      {/* Details Section */}
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex items-center gap-3 text-slate-300">
          <Mail className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-sm truncate" title={user.email}>{user.email}</span>
        </div>
        
        <div className="flex items-center gap-3 text-slate-300">
          <Phone className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-sm truncate">{user.phone_number || 'N/A'}</span>
        </div>

        <div className="flex items-center gap-3 text-slate-300">
          <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-sm truncate">{user.city_name || 'N/A'}</span>
        </div>

        <div className="flex items-center gap-3 text-slate-300">
          <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-sm truncate">{user.branch_name || 'N/A'}</span>
        </div>
      </div>

      {/* Footer / Status */}
      <div className="px-5 py-3.5 bg-white/5 border-t border-white/5 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${user.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          <span className={`text-xs font-semibold ${user.is_active ? 'text-emerald-400' : 'text-slate-400'}`}>
            {user.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <Switch
          checked={user.is_active}
          onChange={(checked) => onToggleStatus(user, checked)}
          disabled={!canManage}
          className="data-[state=checked]:bg-primary scale-90"
        />
      </div>
    </div>
  );
};
