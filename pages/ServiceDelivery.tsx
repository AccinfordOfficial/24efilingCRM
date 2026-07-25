import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FormSelect } from '../components/ui/FormSelect';
import { Dialog } from '../components/ui/Dialog';
import { supabase } from '../lib/supabaseClient';
import { useApi } from '../hooks/useApi';
import { toast } from 'sonner';
import { ClockIcon, PlusIcon, FileTextIcon } from '../components/icons';
import { CheckCircle2 } from 'lucide-react';

interface ServiceDeliveryRecord {
    id: string;
    customer_id: string;
    service_name: string;
    status: 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    current_step: number;
    steps_progress: Array<{ name: string; is_completed: boolean }>;
    created_at: string;
}

const DEFAULT_TEMPLATES: Record<string, string[]> = {
    'GST Registration': ['Collect PAN & Aadhar', 'Prepare Application Form', 'Submit on GST Portal', 'ARN Received', 'GSTIN Issued'],
    'Company Registration': ['Name Approval RUN', 'DSC Generation', 'Drafting MOA/AOA', 'SPICe+ Filing', 'CIN Allotted'],
    'Trademark Filing': ['Trademark Search', 'Document Authorization', 'Filing Form TM-A', 'Application No Issued'],
    'Income Tax Return': ['Collect Form 16 / Bank Statements', 'Computation of Income', 'Filing ITR Portal', 'Verification E-sign']
};

export const ServiceDelivery: React.FC = () => {
    const { customers } = useApi({ fetchOnMount: false });
    const [deliveries, setDeliveries] = useState<ServiceDeliveryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [serviceName, setServiceName] = useState('GST Registration');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchDeliveries = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.from('service_deliveries').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setDeliveries(((data || []) as unknown) as ServiceDeliveryRecord[]);

        } catch (e) {
            console.error("Error loading service deliveries:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const handleCreateDelivery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerId) {
            toast.error("Please select a customer");
            return;
        }

        const steps = (DEFAULT_TEMPLATES[serviceName] || DEFAULT_TEMPLATES['GST Registration']).map(name => ({
            name,
            is_completed: false
        }));

        try {
            setIsSubmitting(true);
            const { error } = await (supabase.from('service_deliveries') as any).insert([{
                customer_id: selectedCustomerId,
                service_name: serviceName,
                status: 'in_progress',
                current_step: 0,
                steps_progress: steps
            }]);

            if (error) throw error;
            toast.success("Service delivery tracker launched!");
            setIsCreateOpen(false);
            fetchDeliveries();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to create tracker");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStep = async (delivery: ServiceDeliveryRecord, stepIdx: number) => {
        const updatedSteps = [...delivery.steps_progress];
        updatedSteps[stepIdx].is_completed = !updatedSteps[stepIdx].is_completed;
        const allCompleted = updatedSteps.every(s => s.is_completed);

        try {
            const { error } = await (supabase.from('service_deliveries') as any)
                .update({
                    steps_progress: updatedSteps,
                    status: allCompleted ? 'completed' : 'in_progress'
                })
                .eq('id', delivery.id);

            if (error) throw error;
            setDeliveries(deliveries.map(d => d.id === delivery.id ? { ...d, steps_progress: updatedSteps, status: allCompleted ? 'completed' : 'in_progress' } : d));
            toast.success("Step updated");
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to update step");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Service Delivery Pipeline</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Track multi-step fulfillment for client GST, Company Incorporation, and Tax filings.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90">
                    <PlusIcon className="h-4 w-4 mr-1" /> Start Delivery Pipeline
                </Button>
            </div>

            {deliveries.length === 0 && !isLoading ? (
                <Card className="bg-white dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-white/10 p-8 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-3 bg-blue-500/10 text-primary rounded-full">
                            <ClockIcon className="h-8 w-8" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">No Active Service Delivery Trackers</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                            Track client fulfillment stages, SLA timers, and portal filings for GST, Company Registration, and ITRs.
                        </p>
                        <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90 text-xs mt-2">
                            <PlusIcon className="h-4 w-4 mr-1" /> Launch First Delivery Pipeline
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deliveries.map((delivery) => {
                        const customer = customers.find(c => c.id === delivery.customer_id);
                        const completedCount = delivery.steps_progress?.filter(s => s.is_completed).length || 0;
                        const totalSteps = delivery.steps_progress?.length || 1;
                        const progressPercent = Math.round((completedCount / totalSteps) * 100);

                        return (
                            <Card key={delivery.id} className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">{customer?.name || 'Customer'}</CardTitle>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{delivery.service_name}</p>
                                        </div>
                                        <Badge 
                                            variant="outline"
                                            className={
                                                delivery.status === 'completed' 
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                                    : 'bg-blue-500/10 text-primary border-blue-500/20'
                                            }
                                        >
                                            {delivery.status.replace('_', ' ').toUpperCase()}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-2">
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                            <span>Fulfillment Progress</span>
                                            <span className="text-slate-900 dark:text-white font-medium">{completedCount}/{totalSteps} Steps ({progressPercent}%)</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                        {delivery.steps_progress?.map((step, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs p-1.5 bg-slate-50 dark:bg-slate-950/40 rounded border border-slate-200 dark:border-white/5">
                                                <span className={step.is_completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}>
                                                    {idx + 1}. {step.name}
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    checked={step.is_completed}
                                                    onChange={() => handleToggleStep(delivery, idx)}
                                                    className="h-4 w-4 accent-emerald-500 cursor-pointer"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Service Delivery Tracker">
                <form onSubmit={handleCreateDelivery} className="space-y-4">
                    <FormSelect
                        label="Select Client *"
                        id="delivery_customer"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        options={[
                            { value: '', label: 'Select client...' },
                            ...customers.map(c => ({ value: c.id, label: `${c.name} (${c.business_name || 'Individual'})` }))
                        ]}
                    />

                    <FormSelect
                        label="Service Delivery Template *"
                        id="delivery_template"
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        options={Object.keys(DEFAULT_TEMPLATES).map(s => ({ value: s, label: s }))}
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:opacity-90">
                            {isSubmitting ? 'Starting...' : 'Start Pipeline'}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
};
