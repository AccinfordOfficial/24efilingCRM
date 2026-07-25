import React, { useState, useMemo } from 'react';
import { Lead, User } from '../types';
import { useApi } from '../hooks/useApi';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { 
    UserCheck, Target, AlertCircle, CheckCircle2, 
    ArrowRight, Building2, Search, Filter, Phone, Mail, Calendar, ShieldCheck
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useNavigate } from 'react-router-dom';

interface LeadAssignmentsProps {
    leads: Lead[];
    users: User[];
    onUpdateLead: (lead: Lead) => Promise<void>;
}

export const LeadAssignments: React.FC<LeadAssignmentsProps> = ({
    leads,
    users,
    onUpdateLead
}) => {
    const toast = useToast();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [targetExecId, setTargetExecId] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);

    // Get active sales executives
    const salesExecutives = useMemo(() => {
        return users.filter(u => {
            const roleNorm = (u.role || '').toLowerCase().replace(/_/g, ' ');
            return (roleNorm.includes('sales') || roleNorm.includes('executive') || roleNorm.includes('admin') || roleNorm.includes('manager')) && u.is_active;
        });
    }, [users]);

    // Head Office unassigned/pending pool leads
    const headOfficeLeads = useMemo(() => {
        return leads.filter(l => {
            const isUnassigned = !l.assigned_to;
            const isTaggedHO = l.notes && l.notes.includes('[Assigned to Head Office]');
            const isHeadOfficeBranch = !l.branch_id || l.branch_name === 'Head Office';
            return isUnassigned || isTaggedHO || isHeadOfficeBranch;
        });
    }, [leads]);

    const filteredLeads = useMemo(() => {
        return headOfficeLeads.filter(l => {
            const query = searchQuery.toLowerCase();
            const name = `${l.first_name} ${l.last_name} ${l.business_name || ''}`.toLowerCase();
            const phone = l.phone_number || '';
            const service = (l.service_requested || '').toLowerCase();
            return name.includes(query) || phone.includes(query) || service.includes(query);
        });
    }, [headOfficeLeads, searchQuery]);

    const toggleSelectAll = () => {
        if (selectedLeadIds.length === filteredLeads.length) {
            setSelectedLeadIds([]);
        } else {
            setSelectedLeadIds(filteredLeads.map(l => l.id));
        }
    };

    const toggleSelectLead = (id: string) => {
        setSelectedLeadIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleAssignLeads = async () => {
        if (selectedLeadIds.length === 0) {
            toast.addToast('Please select at least one lead to assign.', 'error');
            return;
        }
        if (!targetExecId) {
            toast.addToast('Please select a sales executive from the dropdown.', 'error');
            return;
        }

        const targetExec = salesExecutives.find(u => u.id === targetExecId);
        if (!targetExec) {
            toast.addToast('Invalid sales executive selected.', 'error');
            return;
        }

        setIsAssigning(true);
        try {
            for (const leadId of selectedLeadIds) {
                const originalLead = leads.find(l => l.id === leadId);
                if (originalLead) {
                    const cleanNotes = (originalLead.notes || '').replace('[Assigned to Head Office]', '').trim();
                    const updatedLead: Lead = {
                        ...originalLead,
                        assigned_to: targetExec,
                        notes: cleanNotes
                    };
                    await onUpdateLead(updatedLead);
                }
            }
            toast.addToast(`Successfully assigned ${selectedLeadIds.length} lead(s) to ${targetExec.name}!`, 'success');
            setSelectedLeadIds([]);
            setTargetExecId('');
        } catch (err: any) {
            toast.addToast(`Assignment failed: ${err.message}`, 'error');
        } finally {
            setIsAssigning(false);
        }
    };

    const highPriorityCount = headOfficeLeads.filter(l => l.priority === 'High' || l.priority === 'Urgent').length;

    return (
        <div className="space-y-6 pb-8 text-foreground max-w-7xl mx-auto p-4 md:p-6">
            {/* Header Banner */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/80 dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/5 backdrop-blur-md shadow-sm">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <UserCheck className="h-8 w-8 text-primary" />
                        Head Office Lead Assignments
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Review incoming Head Office leads and route them to sales executives.</p>
                </div>
            </header>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="dark:bg-slate-900/80 dark:border-white/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                            <Target className="h-6 w-6" />
                        </div>
                        <div>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{headOfficeLeads.length}</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Head Office Pending Leads</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="dark:bg-slate-900/80 dark:border-white/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{highPriorityCount}</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">High / Urgent Priority</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="dark:bg-slate-900/80 dark:border-white/10">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{salesExecutives.length}</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Sales Executives</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Assignment Action Bar */}
            <div className="p-4 rounded-xl bg-slate-900/80 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <input 
                        type="checkbox"
                        checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 dark:border-white/20 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedLeadIds.length > 0 ? `${selectedLeadIds.length} Selected` : 'Select All Leads'}
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <Select 
                        value={targetExecId} 
                        onChange={(e) => setTargetExecId(e.target.value)}
                        className="w-full sm:w-64 bg-background dark:bg-slate-900 text-foreground dark:text-white border-input dark:border-white/10"
                    >
                        <option value="" className="bg-slate-950 text-white">-- Select Sales Executive --</option>
                        {salesExecutives.map(exec => (
                            <option key={exec.id} value={exec.id} className="bg-slate-950 text-white">
                                {exec.name} ({exec.role})
                            </option>
                        ))}
                    </Select>

                    <Button 
                        onClick={handleAssignLeads} 
                        disabled={selectedLeadIds.length === 0 || !targetExecId || isAssigning}
                        className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/95 text-white px-6 py-2 rounded-xl shrink-0"
                    >
                        <UserCheck className="h-4 w-4" />
                        {isAssigning ? 'Assigning...' : `Assign ${selectedLeadIds.length} Lead(s)`}
                    </Button>
                </div>
            </div>

            {/* Search Filter */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input 
                    type="text"
                    placeholder="Search by client name, business name, or service..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                />
            </div>

            {/* Leads List */}
            {filteredLeads.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLeads.map(lead => {
                        const isSelected = selectedLeadIds.includes(lead.id);
                        return (
                            <div 
                                key={lead.id}
                                onClick={() => toggleSelectLead(lead.id)}
                                className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                    isSelected 
                                        ? 'bg-primary/10 border-primary shadow-md' 
                                        : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-white/5 hover:border-primary/30'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <input 
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelectLead(lead.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-4 w-4 rounded border-slate-300 dark:border-white/20 text-primary focus:ring-primary"
                                        />
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                            lead.priority === 'High' || lead.priority === 'Urgent' 
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                        }`}>
                                            {lead.priority || 'Medium'} Priority
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                                        {lead.business_name || `${lead.first_name} ${lead.last_name}`}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium flex items-center gap-1.5">
                                        <Building2 className="h-3.5 w-3.5" />
                                        {lead.service_requested || 'General Filing Service'}
                                    </p>

                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <span>{lead.phone_number || 'No phone'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0 text-xs truncate" />
                                            <span className="truncate">{lead.email || 'No email'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(lead.created_at || Date.now()).toLocaleDateString('en-GB')}
                                    </span>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/leads/${lead.id}`);
                                        }}
                                        className="text-xs gap-1 border-slate-200 dark:border-white/10 dark:text-white"
                                    >
                                        View <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <Card className="dark:bg-slate-900/60 dark:border-white/10 text-center py-16">
                    <CardContent className="space-y-3">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto opacity-80" />
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">All Head Office Leads Assigned!</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
                            There are currently no pending Head Office leads waiting for routing. All incoming leads have been assigned.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default LeadAssignments;
