import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FormField } from '../components/ui/FormField';
import { FormSelect } from '../components/ui/FormSelect';
import { Dialog } from '../components/ui/Dialog';
import { supabase } from '../lib/supabaseClient';
import { useApi } from '../hooks/useApi';
import { toast } from 'sonner';
import { PlusIcon, CalendarIcon } from '../components/icons';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

interface RecurringServiceRecord {
    id: string;
    customer_id: string;
    service_name: string;
    frequency: string;
    next_due_date: string;
    amount: number;
    status: 'active' | 'paused' | 'cancelled';
    created_at: string;
}

export const RenewalsPipeline: React.FC = () => {
    const { customers } = useApi({ fetchOnMount: false });
    const [recurringServices, setRecurringServices] = useState<RecurringServiceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [serviceName, setServiceName] = useState('Monthly GST Return (GSTR-3B)');
    const [frequency, setFrequency] = useState('monthly');
    const [nextDueDate, setNextDueDate] = useState('');
    const [amount, setAmount] = useState(2500);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchRecurring = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.from('recurring_services').select('*').order('next_due_date', { ascending: true });
            if (error) throw error;
            setRecurringServices((data || []) as RecurringServiceRecord[]);
        } catch (e) {
            console.error("Error loading recurring services:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecurring();
        // Set default due date to 30 days from now
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 30);
        setNextDueDate(defaultDue.toISOString().split('T')[0]);
    }, []);

    const handleCreateRecurring = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerId) {
            toast.error("Please select a customer");
            return;
        }

        try {
            setIsSubmitting(true);
            const { error } = await (supabase.from('recurring_services') as any).insert([{
                customer_id: selectedCustomerId,
                service_name: serviceName,
                frequency: frequency,
                next_due_date: nextDueDate,
                amount: Number(amount) || 0,
                status: 'active'
            }]);

            if (error) throw error;
            toast.success("Recurring service scheduled!");
            setIsCreateOpen(false);
            fetchRecurring();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to schedule recurring service");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white">Recurring Services & Renewals</h2>
                    <p className="text-xs text-slate-400">Manage ongoing monthly GST compliance, annual returns, and trademark renewal dates.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-[#1c398e] hover:bg-[#152c6f] text-white">
                    <PlusIcon className="h-4 w-4 mr-1" /> Add Renewal Contract
                </Button>
            </div>

            {/* Renewals Table Card */}
            <Card className="bg-slate-900/60 border-white/10">
                <CardContent className="p-4">
                    {isLoading ? (
                        <div className="py-8 text-center text-slate-400 text-sm">Loading renewal pipelines...</div>
                    ) : recurringServices.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <RefreshCw className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                            <p className="font-semibold text-slate-300">No Active Renewal Contracts</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                Schedule recurring monthly GST or annual compliance contracts to generate automated renewal reminders.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recurringServices.map((rec) => {
                                const customer = customers.find(c => c.id === rec.customer_id);
                                const isOverdue = new Date(rec.next_due_date) < new Date();

                                return (
                                    <div key={rec.id} className="flex items-center justify-between p-4 bg-slate-950/40 border border-white/5 rounded-lg hover:border-blue-500/30 transition-all">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-white text-sm">{customer?.name || 'Client'}</span>
                                                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                    {rec.frequency.toUpperCase()}
                                                </Badge>
                                                {isOverdue && (
                                                    <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/20">
                                                        OVERDUE
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                {rec.service_name} • Due Date: <span className="text-slate-200">{rec.next_due_date}</span>
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className="text-sm font-bold text-emerald-400 block">₹{rec.amount.toLocaleString()}</span>
                                                <span className="text-[10px] text-slate-500">Contract Value</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Modal */}
            <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Schedule Recurring Contract">
                <form onSubmit={handleCreateRecurring} className="space-y-4">
                    <FormSelect
                        label="Select Client *"
                        id="rec_customer"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        options={[
                            { value: '', label: 'Select client...' },
                            ...customers.map(c => ({ value: c.id, label: `${c.name} (${c.business_name || 'Individual'})` }))
                        ]}
                    />

                    <FormField
                        label="Service Name *"
                        id="rec_service"
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormSelect
                            label="Frequency"
                            id="rec_freq"
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                            options={[
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'quarterly', label: 'Quarterly' },
                                { value: 'yearly', label: 'Yearly (Annual)' }
                            ]}
                        />

                        <FormField
                            label="Next Due Date *"
                            id="rec_due_date"
                            type="date"
                            value={nextDueDate}
                            onChange={(e) => setNextDueDate(e.target.value)}
                            required
                        />
                    </div>

                    <FormField
                        label="Renewal Amount (₹) *"
                        id="rec_amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        required
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-[#1c398e] hover:bg-[#152c6f] text-white">
                            {isSubmitting ? 'Scheduling...' : 'Schedule Contract'}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
};
