import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';
import { FormField } from './ui/FormField';
import { FormSelect } from './ui/FormSelect';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';

import { SERVICE_OPTIONS } from '../constants';
import { toast } from 'sonner';
import { PlusIcon } from './icons';
import { Sparkles } from 'lucide-react';

const SERVICES_WITH_CATEGORIES = Object.entries(SERVICE_OPTIONS).flatMap(([category, subList]) =>
    subList.map(sub => ({
        value: `${category} → ${sub}`,
        label: `${category} → ${sub}`
    }))
);

interface QuickAddLeadProps {
    isOpen: boolean;
    onClose: () => void;
}

export const QuickAddLead: React.FC<QuickAddLeadProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { addLead } = useApi({ fetchOnMount: false });
    const { profile } = useAuth();

    const [firstName, setFirstName] = useState('');
    const [phone, setPhone] = useState('');
    const [service, setService] = useState(SERVICES_WITH_CATEGORIES[0]?.value || 'GST Services → GST Registration');
    const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
    const [isSubmitting, setIsSubmitting] = useState(false);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName.trim()) {
            toast.error('Please enter first name');
            return;
        }
        if (!phone.trim()) {
            toast.error('Please enter phone number');
            return;
        }

        try {
            setIsSubmitting(true);
            await addLead({
                first_name: firstName.trim(),
                last_name: '',
                phone_number: phone.trim(),
                service_requested: service,
                priority: priority,
                status: 'New Lead',
                assigned_to: profile?.id ? { id: profile.id, name: profile.name, role: profile.role } as any : undefined,
                branch_id: profile?.branch_id || undefined,
                source: 'Direct Quick Add',
                business_category: 'General',
                industry_type: 'Other',
                notes: 'Created via Quick-Add Modal'
            } as any);

            toast.success('Lead created successfully!');
            onClose();
            setFirstName('');
            setPhone('');
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to create quick lead');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddMoreDetails = () => {
        onClose();
        navigate('/leads/new');
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Quick Add Lead">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span>Create a lead instantly in 5 seconds. You can fill detailed requirements later.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        label="First Name *"
                        id="quick_first_name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. Rahul"
                        required
                    />

                    <FormField
                        label="Phone Number *"
                        id="quick_phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormSelect
                        label="Service Requested (Category → Sub-Service)"
                        id="quick_service"
                        value={service}
                        onChange={(e) => setService(e.target.value)}
                        options={SERVICES_WITH_CATEGORIES}
                    />


                    <FormSelect
                        label="Priority"
                        id="quick_priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        options={[
                            { value: 'High', label: 'High' },
                            { value: 'Medium', label: 'Medium' },
                            { value: 'Low', label: 'Low' }
                        ]}
                    />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleAddMoreDetails}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                        Add Full Details →
                    </Button>

                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:opacity-90 font-bold">
                            {isSubmitting ? 'Saving...' : 'Save Lead'}
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    );
};
