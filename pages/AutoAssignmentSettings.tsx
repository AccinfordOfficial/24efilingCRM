import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { FormSelect } from '../components/ui/FormSelect';
import { Switch } from '../components/ui/Switch';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { supabase } from '../lib/supabaseClient';
import { AssignmentRule } from '../lib/leadAssignment';
import { useApi } from '../hooks/useApi';
import { SERVICE_OPTIONS } from '../constants';
import { toast } from 'sonner';
import { PlusIcon, Trash2Icon } from '../components/icons';
import { Sparkles } from 'lucide-react';

const SERVICES = Object.values(SERVICE_OPTIONS).flat();

export const AutoAssignmentSettings: React.FC = () => {
    const { users, branches } = useApi({ fetchOnMount: false });
    const [rules, setRules] = useState<AssignmentRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [ruleName, setRuleName] = useState('');
    const [priority, setPriority] = useState(10);
    const [ruleType, setRuleType] = useState<AssignmentRule['rule_type']>('round_robin');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [serviceCond, setServiceCond] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchRules = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('lead_assignment_rules')
                .select('*')
                .order('priority', { ascending: false });

            if (error) throw error;
            setRules(((data || []) as unknown) as AssignmentRule[]);

        } catch (e: any) {
            console.error("Error loading rules:", e);
            toast.error("Failed to load auto-assignment rules");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const handleCreateRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ruleName.trim()) {
            toast.error("Please enter a rule name");
            return;
        }

        try {
            setIsSaving(true);
            const { error } = await (supabase.from('lead_assignment_rules') as any).insert([{
                name: ruleName.trim(),
                priority: Number(priority) || 0,
                is_active: true,
                rule_type: ruleType,
                conditions: serviceCond ? { service: serviceCond } : {},
                target_branch_id: selectedBranch || null,
                target_user_ids: selectedUserIds
            }]);

            if (error) throw error;

            toast.success("Assignment rule created!");
            setIsCreateOpen(false);
            setRuleName('');
            setSelectedUserIds([]);
            fetchRules();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to create rule");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (rule: AssignmentRule) => {
        try {
            const { error } = await (supabase.from('lead_assignment_rules') as any)
                .update({ is_active: !rule.is_active })
                .eq('id', rule.id);

            if (error) throw error;

            setRules(rules.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
            toast.success(`Rule "${rule.name}" ${!rule.is_active ? 'activated' : 'deactivated'}`);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to update status");
        }
    };

    const handleDeleteRule = async (id: string) => {
        try {
            const { error } = await supabase.from('lead_assignment_rules').delete().eq('id', id);
            if (error) throw error;

            setRules(rules.filter(r => r.id !== id));
            toast.success("Rule deleted");
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to delete rule");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white">Automated Lead Assignment Rules</h2>
                    <p className="text-xs text-slate-400">Distribute new incoming leads intelligently using Round-Robin or Load-Balancing rules.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-[#1c398e] hover:bg-[#152c6f] text-white">
                    <PlusIcon className="h-4 w-4 mr-1" /> New Rule
                </Button>
            </div>

            <Card className="bg-slate-900/60 border-white/10">
                <CardContent className="p-4">
                    {isLoading ? (
                        <div className="py-8 text-center text-slate-400 text-sm">Loading assignment rules...</div>
                    ) : rules.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <Sparkles className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                            <p className="font-semibold text-slate-300">No Auto-Assignment Rules Created</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                Create your first rule to automatically assign web leads and incoming prospects to sales executives.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {rules.map((rule) => (
                                <div key={rule.id} className="flex items-center justify-between p-4 bg-slate-950/40 border border-white/5 rounded-lg hover:border-blue-500/30 transition-all">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-white text-sm">{rule.name}</span>
                                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                {rule.rule_type.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                            <Badge variant="secondary" className="text-[10px]">
                                                Priority {rule.priority}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            {rule.conditions?.service ? `Applies to: ${rule.conditions.service}` : 'Applies to all services'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400">{rule.is_active ? 'Active' : 'Disabled'}</span>
                                            <Switch checked={rule.is_active} onCheckedChange={() => handleToggleActive(rule)} />
                                        </div>
                                        <button onClick={() => handleDeleteRule(rule.id)} className="text-slate-500 hover:text-rose-400 p-1">
                                            <Trash2Icon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Rule Modal */}
            <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Lead Assignment Rule">
                <form onSubmit={handleCreateRule} className="space-y-4">
                    <FormField
                        label="Rule Name *"
                        id="rule_name"
                        value={ruleName}
                        onChange={(e) => setRuleName(e.target.value)}
                        placeholder="e.g. GST Leads Round Robin"
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            label="Priority (Higher = Checked First)"
                            id="rule_priority"
                            type="number"
                            value={priority}
                            onChange={(e) => setPriority(Number(e.target.value))}
                        />
                        <FormSelect
                            label="Distribution Strategy"
                            id="rule_type"
                            value={ruleType}
                            onChange={(e) => setRuleType(e.target.value as any)}
                            options={[
                                { value: 'round_robin', label: 'Round Robin (Sequential)' },
                                { value: 'load_balanced', label: 'Load Balanced (Least Leads)' }
                            ]}
                        />
                    </div>

                    <FormSelect
                        label="Target Branch (Optional)"
                        id="rule_branch"
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        options={[
                            { value: '', label: 'All Branches' },
                            ...branches.map(b => ({ value: b.id, label: b.name }))
                        ]}
                    />

                    <FormSelect
                        label="Service Condition (Optional)"
                        id="rule_service"
                        value={serviceCond}
                        onChange={(e) => setServiceCond(e.target.value)}
                        options={[
                            { value: '', label: 'All Services' },
                            ...SERVICES.map(s => ({ value: s, label: s }))
                        ]}
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving} className="bg-[#1c398e] hover:bg-[#152c6f] text-white">
                            {isSaving ? 'Creating...' : 'Create Rule'}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
};
