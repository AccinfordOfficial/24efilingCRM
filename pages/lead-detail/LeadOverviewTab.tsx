import React from 'react';
import { Lead } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { ServiceSetItem } from '../../components/ServiceSetItem';

interface LeadOverviewTabProps {
    lead: Lead;
    onAddPayment: (amount: number, method: string, serviceId: string, serviceName: string) => void;
}

export const LeadOverviewTab: React.FC<LeadOverviewTabProps> = ({ lead, onAddPayment }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Contact & Business Details</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-6 text-sm">
                <div>
                    <strong className="font-semibold text-slate-500 block mb-1">Contact Person</strong>
                    <span className="text-slate-800 text-base">{lead.first_name} {lead.last_name}</span>
                </div>
                {lead.reference_number && (
                    <div>
                        <strong className="font-semibold text-slate-500 block mb-1">Reference ID</strong>
                        <span className="font-mono font-bold text-[#1c398e] text-base">{lead.reference_number}</span>
                    </div>
                )}
                <div>
                    <strong className="font-semibold text-slate-500 block mb-1">Email</strong>
                    <span className="text-slate-800 text-base">{lead.email}</span>
                </div>
                <div>
                    <strong className="font-semibold text-slate-500 block mb-1">Phone</strong>
                    <span className="text-slate-800 text-base">{lead.phone_number}</span>
                </div>
                {lead.alternate_mobile && (
                    <div>
                        <strong className="font-semibold text-slate-500 block mb-1">Alternate Mobile</strong>
                        <span className="flex items-center gap-1.5 text-slate-800 text-base">
                            {lead.alternate_mobile}
                            {lead.alternate_is_whatsapp && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">
                                    WhatsApp
                                </span>
                            )}
                        </span>
                    </div>
                )}
                {lead.pan_number && (
                    <div>
                        <strong className="font-semibold text-slate-500 block mb-1">PAN Number</strong>
                        <span className="text-slate-800 text-base font-mono uppercase">{lead.pan_number}</span>
                    </div>
                )}
                <div>
                    <strong className="font-semibold text-slate-500 block mb-1">Source</strong>
                    <span className="text-slate-800 text-base">{lead.source}</span>
                </div>
                <div>
                    <strong className="font-semibold text-slate-500 block mb-1">Business Category</strong>
                    <span className="text-slate-800 text-base">{lead.business_category || 'Other'}</span>
                </div>
                <div>
                    <strong className="font-semibold text-slate-500 block mb-1">Industry Type</strong>
                    <span className="text-slate-800 text-base">{lead.industry_type || 'Other'}</span>
                </div>
                
                <div className="sm:col-span-2 border-t pt-6 mt-2">
                    <strong className="font-semibold text-slate-600 block mb-4 text-base">Services Requested</strong>
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
                        <p className="text-slate-500 text-base">{lead.service_requested}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
