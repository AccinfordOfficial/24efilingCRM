import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { FormSelect } from '../components/ui/FormSelect';
import { Dialog } from '../components/ui/Dialog';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';

import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { TrendingUpIcon, UsersIcon, PlusIcon, AwardIcon } from '../components/icons';
import { CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Badge } from '../components/ui/Badge';

interface TargetRecord {
    id: string;
    user_id: string;
    period_type: string;
    period_start: string;
    period_end: string;
    target_revenue: number;
    target_leads: number;
    target_conversions: number;
    commission_rate: number;
}

export const TargetsDashboard: React.FC = () => {
    const { profile } = useAuth();
    const { users, leads, customers } = useApi({ fetchOnMount: false });

    const [targets, setTargets] = useState<TargetRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [selectedUserId, setSelectedUserId] = useState('');
    const [targetRevenue, setTargetRevenue] = useState(500000);
    const [targetLeads, setTargetLeads] = useState(25);
    const [targetConversions, setTargetConversions] = useState(10);
    const [commissionRate, setCommissionRate] = useState(5);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchTargets = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.from('sales_targets').select('*');
            if (error) throw error;
            setTargets(((data || []) as unknown) as TargetRecord[]);

        } catch (e: any) {
            console.error("Error loading targets:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTargets();
    }, []);

    const handleCreateTarget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) {
            toast.error("Please select an executive");
            return;
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        try {
            setIsSubmitting(true);
            const { error } = await (supabase.from('sales_targets') as any).insert([{
                user_id: selectedUserId,
                period_type: 'monthly',
                period_start: startOfMonth,
                period_end: endOfMonth,
                target_revenue: Number(targetRevenue),
                target_leads: Number(targetLeads),
                target_conversions: Number(targetConversions),
                commission_rate: Number(commissionRate),
                created_by: profile?.id
            }]);

            if (error) throw error;
            toast.success("Target assigned successfully!");
            setIsModalOpen(false);
            fetchTargets();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to set target");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isManagerOrAdmin = ['Super Admin', 'Admin', 'Branch Manager'].includes(profile?.role || '');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sales Targets & Achievement</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Track monthly sales quotas, run rates, and commission calculations.</p>
                </div>
                {isManagerOrAdmin && (
                    <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90">
                        <PlusIcon className="h-4 w-4 mr-1" /> Set Monthly Target
                    </Button>
                )}
            </div>

            {/* Target Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {users.filter(u => u.role === 'Sales Executive' || u.id === profile?.id).map((user) => {
                    const userTarget = targets.find(t => t.user_id === user.id);
                    const userLeads = leads.filter(l => l.assigned_to?.id === user.id);
                    const userCustomers = customers.filter(c => c.assigned_to?.id === user.id);

                    // Compute total revenue generated by user
                    const achievedRevenue = userLeads.reduce((sum, l) => sum + (Number(l.total_payment) || 0), 0);
                    const revenueTarget = userTarget?.target_revenue || 300000;
                    const percentAchieved = Math.min(Math.round((achievedRevenue / revenueTarget) * 100), 100);
                    const estimatedCommission = (achievedRevenue * (userTarget?.commission_rate || 5)) / 100;

                    return (
                        <Card key={user.id} className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10 overflow-hidden relative">
                            <div 
                                className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                                style={{ width: `${percentAchieved}%` }}
                            />
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white">{user.name}</CardTitle>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.role} • {user.branch_name || 'Branch'}</p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                        {percentAchieved}% Target
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                                            <span>Revenue Progress</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">₹{(achievedRevenue / 1000).toFixed(1)}k / ₹{(revenueTarget / 1000).toFixed(1)}k</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                                                style={{ width: `${percentAchieved}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-20 h-16 relative flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { value: percentAchieved, color: '#3b82f6' },
                                                        { value: Math.max(0, 100 - percentAchieved), color: '#cbd5e1' }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={18}
                                                    outerRadius={26}
                                                    startAngle={180}
                                                    endAngle={0}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    <Cell fill="#3b82f6" />
                                                    <Cell fill="#cbd5e1" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <span className="absolute bottom-1 text-[10px] font-bold text-slate-900 dark:text-white">{percentAchieved}%</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                                    <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded">
                                        <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Conversions</span>
                                        <span className="font-bold text-slate-900 dark:text-white text-sm">{userCustomers.length} / {userTarget?.target_conversions || 10}</span>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded">
                                        <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Commission ({userTarget?.commission_rate || 5}%)</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹{estimatedCommission.toLocaleString()}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Set Target Modal */}
            <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign Sales Target">
                <form onSubmit={handleCreateTarget} className="space-y-4">
                    <FormSelect
                        label="Select Executive *"
                        id="target_user"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        options={[
                            { value: '', label: 'Select user...' },
                            ...users.map(u => ({ value: u.id, label: `${u.name} (${u.role})` }))
                        ]}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            label="Target Revenue (₹) *"
                            id="target_rev"
                            type="number"
                            value={targetRevenue}
                            onChange={(e) => setTargetRevenue(Number(e.target.value))}
                            required
                        />
                        <FormField
                            label="Target Conversions *"
                            id="target_conv"
                            type="number"
                            value={targetConversions}
                            onChange={(e) => setTargetConversions(Number(e.target.value))}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            label="Target Leads Allocated"
                            id="target_leads_num"
                            type="number"
                            value={targetLeads}
                            onChange={(e) => setTargetLeads(Number(e.target.value))}
                        />
                        <FormField
                            label="Commission Rate (%)"
                            id="target_comm_rate"
                            type="number"
                            value={commissionRate}
                            onChange={(e) => setCommissionRate(Number(e.target.value))}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:opacity-90">
                            {isSubmitting ? 'Saving...' : 'Set Target'}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
};
