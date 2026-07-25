import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { TargetIcon } from '../../components/icons';
import { LEAD_PRIORITIES } from '../../constants';
import { User, LeadSource, Customer } from '../../types';

interface ReferralSectionProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    assignedToId: string;
    setAssignedToId: (val: string) => void;
    salesExecutives: User[];
    leadSources: LeadSource[];
    allCustomers: Customer[];
    allUsers: User[];
}

export const ReferralSection: React.FC<ReferralSectionProps> = ({
    formData,
    handleChange,
    assignedToId,
    setAssignedToId,
    salesExecutives,
    leadSources,
    allCustomers,
    allUsers
}) => {
    return (
        <Card className="dark:bg-slate-900/80 dark:border-white/10 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-amber-500/20 text-yellow-600 dark:text-amber-400">
                    <TargetIcon className="h-6 w-6" />
                </div>
                <div>
                    <CardTitle className="dark:text-white">Lead Details & Assignment</CardTitle>
                    <CardDescription className="dark:text-slate-400">Additional information for tracking and management.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="assignTo" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assign To</label>

                    <Select id="assignTo" name="assignTo" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                        <option value="HEAD_OFFICE" className="bg-slate-950 text-white">🏢 Head Office (Default - Pending Routing)</option>
                        <option value="" className="bg-slate-950 text-white">— Unassigned —</option>
                        {salesExecutives.map(user => <option key={user.id} value={user.id} className="bg-slate-950 text-white">{user.name}</option>)}
                    </Select>
                </div>
                <div>
                    <label htmlFor="created_at" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Received Date</label>
                    <Input 
                        id="created_at" 
                        name="created_at" 
                        type="date" 
                        value={formData.created_at} 
                        onChange={handleChange} 
                        max={new Date().toISOString().split('T')[0]} 
                    />
                </div>
                <div>
                    <label htmlFor="source" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lead Source</label>
                    <Select id="source" name="source" value={formData.source} onChange={handleChange} className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                        <option value="" className="bg-slate-950 text-white">Select Lead Source</option>
                        {leadSources.map(s => <option key={s.id} value={s.source_name} className="bg-slate-950 text-white">{s.source_name}</option>)}
                    </Select>
                </div>
                {formData.source === 'Customer Referral' && (
                    <div>
                        <label htmlFor="referred_by_customer_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Referring Customer</label>
                        <Select 
                            id="referred_by_customer_id" 
                            name="referred_by_customer_id" 
                            value={formData.referred_by_customer_id} 
                            onChange={handleChange}
                            className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10"
                        >
                            <option value="" className="bg-slate-950 text-white">Select Referring Customer</option>
                            {allCustomers.map(c => (
                                <option key={c.id} value={c.id} className="bg-slate-950 text-white">{c.name} ({c.phone})</option>
                            ))}
                        </Select>
                    </div>
                )}
                {formData.source === 'Employer Referral' && (
                    <div>
                        <label htmlFor="referred_by_employee_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Referring Employee</label>
                        <Select 
                            id="referred_by_employee_id" 
                            name="referred_by_employee_id" 
                            value={formData.referred_by_employee_id} 
                            onChange={handleChange}
                            className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10"
                        >
                            <option value="" className="bg-slate-950 text-white">Select Referring Employee</option>
                            {allUsers.map(u => (
                                <option key={u.id} value={u.id} className="bg-slate-950 text-white">{u.name} ({u.role})</option>
                            ))}
                        </Select>
                    </div>
                )}
                <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                    <Select id="priority" name="priority" value={formData.priority as unknown as string} onChange={handleChange} className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                        {LEAD_PRIORITIES.map(p => <option key={p} value={p} className="bg-slate-950 text-white">{p}</option>)}
                    </Select>
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                    <textarea 
                        id="notes" 
                        name="notes" 
                        value={formData.notes} 
                        onChange={handleChange} 
                        rows={4} 
                        className="flex w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" 
                        placeholder="Add any relevant notes here..." 
                    />
                </div>
            </CardContent>
        </Card>
    );
};
