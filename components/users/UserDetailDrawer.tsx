import React, { useState } from 'react';
import { User, UserActivity, Lead } from '../../types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import { getRoleColor } from '../../constants';
import { 
    X, Mail, Phone, MapPin, Building2, Calendar, Shield, 
    ArrowRightLeft, Edit2, Activity, UserCheck, Briefcase, CheckCircle2, Clock
} from 'lucide-react';
import { Button } from '../ui/Button';

interface UserDetailDrawerProps {
    user: User | null;
    onClose: () => void;
    userActivities: UserActivity[];
    leads?: Lead[];
    onEdit?: (user: User) => void;
    onTransfer?: (user: User) => void;
    canManage?: boolean;
}

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
    user,
    onClose,
    userActivities,
    leads = [],
    onEdit,
    onTransfer,
    canManage = false
}) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'activities' | 'leads'>('profile');

    if (!user) return null;

    const roleColor = getRoleColor(user.role);

    // Calculate lead performance metrics for this user
    const userLeads = leads.filter(l => l.assigned_to?.id === user.id || l.created_by === user.id);
    const convertedLeads = userLeads.filter(l => l.status === 'Success');
    const activeLeads = userLeads.filter(l => !['Success', 'Lost'].includes(l.status));
    const conversionRate = userLeads.length > 0 ? Math.round((convertedLeads.length / userLeads.length) * 100) : 0;

    const userSpecificActivities = userActivities.filter(a => a.user_id === user.id);

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200 flex justify-end">
            <div 
                className="w-full max-w-lg bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-white/10 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                            <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                            <AvatarFallback className="bg-slate-800 text-primary font-semibold">
                                {user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{user.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${roleColor}`}>
                                    {user.role}
                                </span>
                                <span className={`text-[10px] font-semibold flex items-center gap-1 ${user.is_active ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                    {user.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-slate-900/30 px-6 gap-6 text-sm font-medium">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`py-3 border-b-2 transition-colors ${activeTab === 'profile' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                    >
                        Overview & Details
                    </button>
                    <button
                        onClick={() => setActiveTab('leads')}
                        className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'leads' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                    >
                        Performance <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">{userLeads.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('activities')}
                        className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'activities' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                    >
                        Activity Log <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{userSpecificActivities.length}</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            {/* Contact Details Card */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-3">
                                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Contact & Personnel Info</h3>
                                
                                <div className="space-y-2.5 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-slate-400" /> Email
                                        </span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{user.email}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-slate-400" /> Phone
                                        </span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{user.phone_number || 'N/A'}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-slate-400" /> Operational City
                                        </span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{user.city_name || 'Head Office'}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-slate-400" /> Assigned Branch
                                        </span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{user.branch_name || 'Head Office Branch'}</span>
                                    </div>

                                    {user.created_at && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-400" /> Joined Date
                                            </span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Performance Summary Pill */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                                    <span className="text-2xl font-black text-blue-500 block">{userLeads.length}</span>
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Leads</span>
                                </div>
                                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                    <span className="text-2xl font-black text-emerald-500 block">{convertedLeads.length}</span>
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Converted</span>
                                </div>
                                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                                    <span className="text-2xl font-black text-purple-400 block">{conversionRate}%</span>
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Win Rate</span>
                                </div>
                            </div>

                            {/* Actions Bar */}
                            {canManage && (
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-3">
                                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Management Actions</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {onEdit && (
                                            <Button 
                                                onClick={() => { onEdit(user); onClose(); }} 
                                                variant="outline" 
                                                className="gap-2 justify-center border-slate-200 dark:border-white/10 dark:text-white"
                                            >
                                                <Edit2 className="h-4 w-4" /> Edit Profile
                                            </Button>
                                        )}
                                        {onTransfer && (
                                            <Button 
                                                onClick={() => { onTransfer(user); onClose(); }} 
                                                className="gap-2 justify-center bg-primary text-white"
                                            >
                                                <ArrowRightLeft className="h-4 w-4" /> Transfer Branch
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'leads' && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assigned Leads Overview</h3>
                            {userLeads.length > 0 ? (
                                <div className="space-y-3">
                                    {userLeads.slice(0, 10).map(lead => (
                                        <div key={lead.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                                    {lead.business_name || `${lead.first_name} ${lead.last_name}`}
                                                </h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{lead.service_requested || 'No service specified'}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lead.status === 'Success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {lead.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <Briefcase className="h-10 w-10 mx-auto opacity-20 mb-2" />
                                    <p className="text-sm">No leads currently assigned to this user.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'activities' && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recent Activity Stream</h3>
                            {userSpecificActivities.length > 0 ? (
                                <div className="space-y-3">
                                    {userSpecificActivities.map(act => (
                                        <div key={act.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-slate-900 dark:text-white">{act.action}</span>
                                                <span className="text-slate-400 font-mono">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-300">{act.details}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <Activity className="h-10 w-10 mx-auto opacity-20 mb-2" />
                                    <p className="text-sm">No recent activity recorded for this user.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
