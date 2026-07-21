import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FormField } from '../components/ui/FormField';
import { FormSelect } from '../components/ui/FormSelect';
import { Switch } from '../components/ui/Switch';
import { Dialog } from '../components/ui/Dialog';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { PlusIcon, Trash2Icon, MessageSquareIcon } from '../components/icons';
import { Zap } from 'lucide-react';

interface AutomationRuleRecord {
    id: string;
    name: string;
    description: string;
    trigger_event: string;
    is_active: boolean;
    run_count: number;
    created_at: string;
}

export const AutomationRules: React.FC = () => {
    const [rules, setRules] = useState<AutomationRuleRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const [name, setName] = useState('');
    const [triggerEvent, setTriggerEvent] = useState('lead_created');
    const [actionType, setActionType] = useState('send_whatsapp');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchRules = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.from('automation_rules').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setRules((data || []) as AutomationRuleRecord[]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const handleCreateRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Please enter automation name");
            return;
        }

        try {
            setIsSubmitting(true);
            const { error } = await (supabase.from('automation_rules') as any).insert([{
                name: name.trim(),
                description: `Auto ${actionType} on ${triggerEvent}`,
                trigger_event: triggerEvent,
                actions: [{ type: actionType }],
                is_active: true,
                run_count: 0
            }]);

            if (error) throw error;
            toast.success("Automation rule activated!");
            setIsCreateOpen(false);
            setName('');
            fetchRules();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to create rule");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (rule: AutomationRuleRecord) => {
        try {
            const { error } = await (supabase.from('automation_rules') as any)
                .update({ is_active: !rule.is_active })
                .eq('id', rule.id);

            if (error) throw error;
            setRules(rules.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
            toast.success("Automation status updated");
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to update status");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white">Workflow Automation Engine</h2>
                    <p className="text-xs text-slate-400">Build event-driven triggers for WhatsApp greetings, automated task assignments, and SMS alerts.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-[#1c398e] hover:bg-[#152c6f] text-white">
                    <PlusIcon className="h-4 w-4 mr-1" /> New Automation Rule
                </Button>
            </div>

            {/* Automation Rules List */}
            <Card className="bg-slate-900/60 border-white/10">
                <CardContent className="p-4">
                    {isLoading ? (
                        <div className="py-8 text-center text-slate-400 text-sm">Loading automation triggers...</div>
                    ) : rules.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <Zap className="h-8 w-8 mx-auto mb-2 text-[#1c398e]" />
                            <p className="font-semibold text-slate-300">No Automation Triggers Active</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                Create event-driven rules to send automated WhatsApp welcome messages whenever new leads arrive.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {rules.map((rule) => (
                                <div key={rule.id} className="flex items-center justify-between p-4 bg-slate-950/40 border border-white/5 rounded-lg">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Zap className="h-4 w-4 text-amber-400" />
                                            <span className="font-semibold text-white text-sm">{rule.name}</span>
                                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                {rule.trigger_event.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-400">{rule.description} • Executed {rule.run_count} times</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Switch checked={rule.is_active} onCheckedChange={() => handleToggleActive(rule)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Rule Modal */}
            <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Automation Workflow">
                <form onSubmit={handleCreateRule} className="space-y-4">
                    <FormField
                        label="Automation Title *"
                        id="auto_title"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Instant WhatsApp Greeting on New Web Lead"
                        required
                    />

                    <FormSelect
                        label="Trigger Event (WHEN THIS HAPPENS) *"
                        id="auto_trigger"
                        value={triggerEvent}
                        onChange={(e) => setTriggerEvent(e.target.value)}
                        options={[
                            { value: 'lead_created', label: 'New Lead Created' },
                            { value: 'payment_received', label: 'Payment Received' },
                            { value: 'service_completed', label: 'Service Delivery Completed' }
                        ]}
                    />

                    <FormSelect
                        label="Automated Action (THEN DO THIS) *"
                        id="auto_action"
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value)}
                        options={[
                            { value: 'send_whatsapp', label: 'Send Automated WhatsApp Message' },
                            { value: 'send_email', label: 'Send Automated Email Template' },
                            { value: 'create_task', label: 'Create Follow-up Task for Executive' }
                        ]}
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-[#1c398e] hover:bg-[#152c6f] text-white">
                            {isSubmitting ? 'Activating...' : 'Activate Automation'}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
};
