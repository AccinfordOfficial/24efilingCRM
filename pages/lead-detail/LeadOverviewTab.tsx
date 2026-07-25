import React from 'react';
import { Lead } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { ServiceSetItem } from '../../components/ServiceSetItem';
import { Layers, DollarSign, Wallet, FileText, CheckCircle2 } from 'lucide-react';

interface LeadOverviewTabProps {
    lead: Lead;
    onAddPayment: (amount: number, method: string, serviceId: string, serviceName: string) => void;
}

export const LeadOverviewTab: React.FC<LeadOverviewTabProps> = ({ lead, onAddPayment }) => {
    // Calculate total financial metrics across all services
    const totalServicesFee = (lead.service_sets || []).reduce((acc, set) => {
        const subtotal = (set.subservices || []).reduce((sAcc, sub) => {
            const qty = sub.quantity || 1;
            const rate = sub.amount || 0;
            const tax = sub.is_tax_applicable ? (sub.tax_amount || Math.round(rate * qty * 0.18)) : 0;
            return sAcc + (rate * qty) + tax;
        }, 0);
        return acc + (set.service_fee || 0) + subtotal;
    }, 0);

    const totalDiscounts = (lead.service_sets || []).reduce((acc, set) => acc + (set.discount || 0), 0);
    const netPackageValue = lead.total_payment && lead.total_payment > 0 ? lead.total_payment : Math.max(0, totalServicesFee - totalDiscounts);
    const totalAdvanceReceived = lead.advance_amount || (lead.service_sets || []).reduce((acc, set) => acc + (set.advance_amount || 0), 0);
    const remainingDueBalance = lead.remaining_amount !== undefined ? lead.remaining_amount : Math.max(0, netPackageValue - totalAdvanceReceived);

    return (
        <div className="space-y-6">
            {/* Financial Package Summary Banner */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Total Package Value</span>
                    <span className="text-xl font-extrabold text-primary">₹{netPackageValue.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Total Advance Paid</span>
                    <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{totalAdvanceReceived.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Remaining Due</span>
                    <span className={`text-xl font-extrabold ${remainingDueBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        ₹{remainingDueBalance.toLocaleString('en-IN')}
                    </span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Service Count</span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">{(lead.service_sets || []).length || 1} Services</span>
                </div>
            </div>

            <Card className="dark:bg-slate-900/80 dark:border-white/10 shadow-sm">
                <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Contact & Business Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-6 text-sm">
                    <div>
                        <strong className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Contact Person</strong>
                        <span className="text-slate-900 dark:text-white font-medium text-base">{lead.first_name} {lead.last_name}</span>
                    </div>
                    {lead.reference_number && (
                        <div>
                            <strong className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Reference ID</strong>
                            <span className="font-mono font-bold text-primary text-base">{lead.reference_number}</span>
                        </div>
                    )}
                    <div>
                        <strong className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Email Address</strong>
                        <span className="text-slate-900 dark:text-white font-medium text-base">{lead.email}</span>
                    </div>
                    <div>
                        <strong className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Phone Number</strong>
                        <span className="text-slate-900 dark:text-white font-medium text-base">{lead.phone_number}</span>
                    </div>
                    {lead.alternate_mobile && (
                        <div>
                            <strong className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Alternate Mobile</strong>
                            <span className="flex items-center gap-1.5 text-slate-900 dark:text-white font-medium text-base">
                                {lead.alternate_mobile}
                                {lead.alternate_is_whatsapp && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-0.5 rounded-full">
                                        WhatsApp
                                    </span>
                                )}
                            </span>
                        </div>
                    )}
                    {lead.pan_number && (
                        <div>
                            <strong className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">PAN Number</strong>
                            <span className="text-slate-900 dark:text-white text-base font-mono uppercase font-bold">{lead.pan_number}</span>
                        </div>
                    )}
                    {lead.aadhar_number && (
                        <div>
                            <strong className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Aadhaar Card Number</strong>
                            <span className="text-slate-900 dark:text-white text-base font-mono font-bold">{lead.aadhar_number}</span>
                        </div>
                    )}
                    <div>
                        <strong className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Lead Source</strong>
                        <span className="text-slate-900 dark:text-white font-medium text-base">{lead.source}</span>
                    </div>
                    <div>
                        <strong className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Business Category</strong>
                        <span className="text-slate-900 dark:text-white font-medium text-base">{lead.business_category || 'General'}</span>
                    </div>
                    <div>
                        <strong className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Industry Type</strong>
                        <span className="text-slate-900 dark:text-white font-medium text-base">{lead.industry_type || 'Other'}</span>
                    </div>
                    
                    <div className="sm:col-span-2 border-t border-slate-200 dark:border-white/10 pt-6 mt-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <strong className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                                <Layers className="h-5 w-5 text-primary" />
                                Explicit Lead Services & Financial Breakdown
                            </strong>
                        </div>

                        {lead.service_sets && lead.service_sets.length > 0 ? (
                            <div className="space-y-4">
                                {lead.service_sets.map((set) => (
                                    <ServiceSetItem
                                        key={set.id}
                                        serviceSet={set}
                                        onAddPayment={(amount, method) => onAddPayment(amount, method, set.id, set.mainService)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/40">
                                <p className="text-slate-700 dark:text-slate-300 font-medium text-base">{lead.service_requested || 'GST Registration'}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Single service registered for lead profile.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

