import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useApi } from '../../hooks/useApi';
import { Loader2, Plus, GripVertical, Trash2 } from 'lucide-react';
import { Switch } from '../ui/Switch'; // Creating a local switch in a moment if it fails

interface LeadSettingsProps {
    showToast: (type: 'success' | 'error', message: string) => void;
}

export const LeadSettings: React.FC<LeadSettingsProps> = ({ showToast }) => {
    const { settings, updateOrganizationSettings } = useApi();
    const [saving, setSaving] = useState(false);

    // Statuses
    const [statuses, setStatuses] = useState<string[]>([]);
    const [autoAssign, setAutoAssign] = useState(false);
    const [newStatus, setNewStatus] = useState('');

    React.useEffect(() => {
        if (settings) {
            const ls = (settings as any).lead_settings || {};
            setStatuses(ls.statuses || ["New Lead", "Lead Confirmed", "Documents & Payments", "In-Progress", "Success", "Lost"]);
            setAutoAssign(ls.auto_assign || false);
        }
    }, [settings]);

    const handleAddStatus = () => {
        if (newStatus && !statuses.includes(newStatus)) {
            const updated = [...statuses, newStatus];
            setStatuses(updated);
            setNewStatus('');
            // Auto save
            saveSettings({ statuses: updated, auto_assign: autoAssign });
        }
    };

    const handleRemoveStatus = (status: string) => {
        // Prevent removing system statuses usually, but allowing for now with warning in real app
        const updated = statuses.filter(s => s !== status);
        setStatuses(updated);
        saveSettings({ statuses: updated, auto_assign: autoAssign });
    };

    const saveSettings = async (leadSettings: any) => {
        setSaving(true);
        try {
            await updateOrganizationSettings({
                lead_settings: leadSettings
            });
            // Don't toast on every little change, maybe?
        } catch (e: any) {
            showToast('error', e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Lead Workflow</CardTitle>
                    <CardDescription>Customize the stages of your sales pipeline.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <label className="text-sm font-medium">Pipeline Stages</label>
                        <div className="space-y-2">
                            {statuses.map((status, index) => (
                                <div key={status} className="flex items-center gap-2 p-2 bg-white border rounded shadow-sm group">
                                    <GripVertical className="h-4 w-4 text-slate-400 cursor-grab" />
                                    <span className="flex-1 text-sm font-medium text-slate-700">{status}</span>
                                    <button onClick={() => handleRemoveStatus(status)} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="New Status Name..."
                                value={newStatus}
                                onChange={e => setNewStatus(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handleAddStatus} disabled={!newStatus} variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Automation</CardTitle>
                    <CardDescription>Rules for automatic lead processing.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-sm text-slate-800">Auto-Assign Leads</h4>
                            <p className="text-sm text-slate-500">Automatically distribute new leads to sales executives in a round-robin fashion.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm ${autoAssign ? 'text-green-600' : 'text-slate-400'}`}>
                                {autoAssign ? 'On' : 'Off'}
                            </span>
                            <button
                                onClick={() => {
                                    const newVal = !autoAssign;
                                    setAutoAssign(newVal);
                                    saveSettings({ statuses, auto_assign: newVal });
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoAssign ? 'bg-green-600' : 'bg-slate-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoAssign ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
