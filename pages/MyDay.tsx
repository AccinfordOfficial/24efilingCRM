import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { CalendarIcon, ClockIcon, PhoneIcon, MessageSquareIcon, AlertCircleIcon } from '../components/icons';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export const MyDay: React.FC = () => {
    const { profile } = useAuth();
    const { leads, tasks, customers } = useApi({ fetchOnMount: false });

    // Filter leads & tasks assigned to current user
    const myLeads = useMemo(() => {
        return leads.filter(l => l.assigned_to?.id === profile?.id || l.created_by === profile?.id);
    }, [leads, profile]);

    const myTasks = useMemo(() => {
        return tasks.filter(t => t.assigned_to === profile?.id);
    }, [tasks, profile]);

    // High priority follow-ups
    const followUpsToday = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return myLeads.filter(l => l.next_follow_up?.startsWith(today));
    }, [myLeads]);

    const overdueFollowUps = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return myLeads.filter(l => l.next_follow_up && l.next_follow_up < today && l.status !== 'Converted' && l.status !== 'Closed Lost');
    }, [myLeads]);

    const handleLogQuickCall = (leadName: string) => {
        toast.success(`Call logged for ${leadName}`);
    };

    return (
        <div className="space-y-6">
            {/* Header banner */}
            <div className="p-6 bg-gradient-to-r from-[#1c398e] to-[#152c6f] rounded-xl border border-white/10 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-300" />
                        <h2 className="text-xl font-bold">Good Morning, {profile?.name || 'Executive'}!</h2>
                    </div>
                    <p className="text-xs text-blue-100 mt-1">Here is your daily action plan for {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}.</p>
                </div>
                <div className="flex gap-3 text-center">
                    <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                        <span className="text-xs text-blue-200 block">Follow-ups Today</span>
                        <span className="text-lg font-bold text-white">{followUpsToday.length}</span>
                    </div>
                    <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                        <span className="text-xs text-blue-200 block">Overdue Action</span>
                        <span className="text-lg font-bold text-rose-300">{overdueFollowUps.length}</span>
                    </div>
                </div>
            </div>

            {/* Main Action Grids */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overdue & Today's Follow-ups */}
                <Card className="bg-slate-900/60 border-white/10">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                <ClockIcon className="h-4 w-4 text-blue-400" /> Today's Priority Follow-ups
                            </CardTitle>
                            <Badge variant="secondary">{followUpsToday.length + overdueFollowUps.length} Pending</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2">
                        {overdueFollowUps.map(lead => (
                            <div key={lead.id} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white text-sm">{lead.first_name} {lead.last_name}</span>
                                        <Badge variant="outline" className="text-[10px] bg-rose-500/20 text-rose-300 border-rose-500/30">OVERDUE</Badge>
                                    </div>
                                    <p className="text-xs text-slate-400">{lead.phone_number} • {lead.service_requested}</p>
                                </div>
                                <Button size="sm" onClick={() => handleLogQuickCall(lead.first_name)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs">
                                    <PhoneIcon className="h-3.5 w-3.5 mr-1" /> Call Now
                                </Button>
                            </div>
                        ))}

                        {followUpsToday.map(lead => (
                            <div key={lead.id} className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="font-semibold text-white text-sm">{lead.first_name} {lead.last_name}</span>
                                    <p className="text-xs text-slate-400">{lead.phone_number} • {lead.service_requested}</p>
                                </div>
                                <Button size="sm" onClick={() => handleLogQuickCall(lead.first_name)} className="bg-[#1c398e] hover:bg-[#152c6f] text-white text-xs">
                                    <PhoneIcon className="h-3.5 w-3.5 mr-1" /> Log Call
                                </Button>
                            </div>
                        ))}

                        {overdueFollowUps.length === 0 && followUpsToday.length === 0 && (
                            <div className="py-8 text-center text-slate-500 text-sm">
                                <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
                                <span>No pending follow-ups for today! Great job!</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* My Tasks */}
                <Card className="bg-slate-900/60 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Pending Work Tasks
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2">
                        {myTasks.length > 0 ? (
                            myTasks.map(task => (
                                <div key={task.id} className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-white">{task.title}</p>
                                        <p className="text-xs text-slate-400">Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Today'}</p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                                        {task.priority || 'Medium'}
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-slate-500 text-sm">
                                <span>All tasks completed.</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
