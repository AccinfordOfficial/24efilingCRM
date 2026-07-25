import React, { useState, useEffect } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { User, Service } from '../types';
import { SearchableSelect } from './ui/SearchableSelect';
import { useApi } from '../hooks/useApi';

import { BUSINESS_CATEGORIES, INDUSTRY_TYPES } from '../constants';

interface CustomerFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    users: User[];
    services?: Service[];
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ isOpen, onClose, onSave, users, services }) => {
    const { leadSources, customers: allCustomers, users: allUsers } = useApi();
    const [formData, setFormData] = useState({
        business_name: '',
        business_category: '',
        industry_type: '',
        name: '',
        phone: '',
        pan_number: '',
        email: '',
        service_name: '',
        sub_service: '',
        assigned_to: '',
        status: 'Success',
        lead_source: 'Other',
        referred_by_customer_id: '',
        referred_by_employee_id: '',
        date_of_enroll: new Date().toISOString().split('T')[0],
        date_of_completion: '',
        date_of_birth: '',

        aadhar_number: '',
        service_amount: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        paid_amount: 0,
        due_amount: 0,
        business_address: '',
    });

    const [loading, setLoading] = useState(false);
    const [businessErrors, setBusinessErrors] = useState({
        business_name: '',
        business_category: '',
        industry_type: '',
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                business_name: '',
                business_category: '',
                industry_type: '',
                name: '',
                phone: '',
                pan_number: '',
                email: '',
                service_name: '',
                sub_service: '',
                assigned_to: '',
                status: 'Success',
                lead_source: 'Other',
                referred_by_customer_id: '',
                referred_by_employee_id: '',
                date_of_enroll: new Date().toISOString().split('T')[0],
                date_of_completion: '',
                date_of_birth: '',

                aadhar_number: '',
                service_amount: 0,
                tax_amount: 0,
                discount_amount: 0,
                total_amount: 0,
                paid_amount: 0,
                due_amount: 0,
                business_address: '',
            });
            setBusinessErrors({ business_name: '', business_category: '', industry_type: '' });
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate Business Information
        const newBusinessErrors = {
            business_name: !formData.business_name?.trim() ? 'Business Name is mandatory' : '',
            business_category: !formData.business_category?.trim() ? 'Business Category is mandatory' : '',
            industry_type: !formData.industry_type?.trim() ? 'Industry Type is mandatory' : '',
        };

        if (newBusinessErrors.business_name || newBusinessErrors.business_category || newBusinessErrors.industry_type) {
            setBusinessErrors(newBusinessErrors);
            alert('Please fill all mandatory Business Details.');
            return;
        } else {
            setBusinessErrors({ business_name: '', business_category: '', industry_type: '' });
        }

        setLoading(true);

        const assignedUser = users.find(u => u.id === formData.assigned_to);

        const payload = {
            ...formData,
            assigned_to: assignedUser ? assignedUser.id : null,
            // Calculate totals if needed or trust input
            total_amount: Number(formData.service_amount) + Number(formData.tax_amount) - Number(formData.discount_amount),
        };

        try {
            await onSave(payload);
            onClose();
        } catch (err: any) {
            console.error(err);
            alert(`Failed to save customer: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Calculate dynamic total for display
    const calculatedTotal = Number(formData.service_amount) + Number(formData.tax_amount) - Number(formData.discount_amount);

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Add New Customer" maxWidth="4xl">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-1">Basic Info</h3>
                    <div className="grid grid-cols-1 gap-2">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Business Name *</label>
                            <Input 
                                name="business_name" 
                                value={formData.business_name} 
                                onChange={handleChange} 
                                className={businessErrors.business_name ? 'border-red-500' : ''} 
                                placeholder="Business Name" 
                            />
                            {businessErrors.business_name && <span className="text-[10px] text-red-500">{businessErrors.business_name}</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Business Category *</label>
                                <SearchableSelect 
                                    options={BUSINESS_CATEGORIES} 
                                    value={formData.business_category} 
                                    onChange={(val) => {
                                        setFormData(prev => ({ ...prev, business_category: val }));
                                        if (val) setBusinessErrors(prev => ({ ...prev, business_category: '' }));
                                    }}
                                    placeholder="Select Category..." 
                                    error={!!businessErrors.business_category}
                                />
                                {businessErrors.business_category && <span className="text-[10px] text-red-500">{businessErrors.business_category}</span>}
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Industry Type *</label>
                                <SearchableSelect 
                                    options={INDUSTRY_TYPES} 
                                    value={formData.industry_type} 
                                    onChange={(val) => {
                                        setFormData(prev => ({ ...prev, industry_type: val }));
                                        if (val) setBusinessErrors(prev => ({ ...prev, industry_type: '' }));
                                    }}
                                    placeholder="Select Industry..." 
                                    error={!!businessErrors.industry_type}
                                />
                                {businessErrors.industry_type && <span className="text-[10px] text-red-500">{businessErrors.industry_type}</span>}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Client Name *</label>
                        <Input name="name" value={formData.name} onChange={handleChange} required placeholder="Client Full Name" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone *</label>
                            <Input name="phone" value={formData.phone} onChange={handleChange} required placeholder="Phone Number" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">PAN Number</label>
                            <Input name="pan_number" value={formData.pan_number} onChange={handleChange} placeholder="PAN Number" />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                        <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email Address" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-1">Service & Status</h3>
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Service Name *</label>
                        <Input name="service_name" value={formData.service_name} onChange={handleChange} required placeholder="Service Name (e.g. GST Registration)" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sub Service</label>
                        <Input name="sub_service" value={formData.sub_service} onChange={handleChange} placeholder="Sub Service" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                            <Select name="status" value={formData.status} onChange={handleChange} className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                                <option value="Success" className="bg-slate-950 text-white">Success</option>
                                <option value="Pending" className="bg-slate-950 text-white">Pending</option>
                                <option value="In-Progress" className="bg-slate-950 text-white">In-Progress</option>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assign To</label>
                            <Select name="assigned_to" value={formData.assigned_to} onChange={handleChange} className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                                <option value="" className="bg-slate-950 text-white">Select User</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id} className="bg-slate-950 text-white">{u.name}</option>
                                ))}
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Lead Source</label>
                            <Select name="lead_source" value={formData.lead_source} onChange={handleChange} className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                                <option value="" className="bg-slate-950 text-white">Select Lead Source</option>
                                {leadSources.map(s => <option key={s.id} value={s.source_name} className="bg-slate-950 text-white">{s.source_name}</option>)}
                            </Select>
                        </div>
                        {formData.lead_source === 'Customer Referral' && (
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Referring Customer</label>
                                <Select 
                                    name="referred_by_customer_id" 
                                    value={formData.referred_by_customer_id || ''} 
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
                        {formData.lead_source === 'Employer Referral' && (
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Referring Employee</label>
                                <Select 
                                    name="referred_by_employee_id" 
                                    value={formData.referred_by_employee_id || ''} 
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
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-1">Financials</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Service Amount</label>
                            <Input name="service_amount" type="number" value={formData.service_amount} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tax Amount</label>
                            <Input name="tax_amount" type="number" value={formData.tax_amount} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Discount</label>
                            <Input name="discount_amount" type="number" value={formData.discount_amount} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Total</label>
                            <Input name="total_amount" type="number" value={calculatedTotal} readOnly className="bg-slate-100 dark:bg-slate-900 dark:border-white/10 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Paid</label>
                            <Input name="paid_amount" type="number" value={formData.paid_amount} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Due</label>
                            <Input name="due_amount" type="number" value={formData.due_amount} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-1">Dates & Details</h3>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date of Enroll</label>
                            <Input name="date_of_enroll" type="date" value={formData.date_of_enroll} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Completed On</label>
                            <Input name="date_of_completion" type="date" value={formData.date_of_completion} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Aadhar Number</label>
                            <Input name="aadhar_number" value={formData.aadhar_number} onChange={handleChange} placeholder="Aadhar" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date of Birth</label>
                            <Input name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Business Address</label>
                        <Input name="business_address" value={formData.business_address} onChange={handleChange} placeholder="Address" />
                    </div>
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 mt-4 border-t border-slate-200 dark:border-white/10 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Saving...' : 'Add Customer'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};
