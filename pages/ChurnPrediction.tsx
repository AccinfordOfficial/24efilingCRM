import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useApi } from '../hooks/useApi';
import { predictCustomerChurn } from '../lib/churnPredictor';
import { toast } from 'sonner';
import { AlertCircleIcon, ShieldCheckIcon, PlusIcon } from '../components/icons';
import { ShieldAlert } from 'lucide-react';

export const ChurnPrediction: React.FC = () => {
    const { customers } = useApi({ fetchOnMount: false });

    const analyzedCustomers = customers.map((c, idx) => ({
        customer: c,
        churn: predictCustomerChurn(c, (idx + 1) * 20)
    }));

    const highRiskAccounts = analyzedCustomers.filter(item => item.churn.riskLevel === 'High');

    const handleSendRetentionOffer = (customerName: string) => {
        toast.success(`Automated 15% renewal discount offer sent to ${customerName}`);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white">Customer Churn Prediction & Retention</h2>
                <p className="text-xs text-slate-400">Early warning system identifying accounts likely to skip annual GST or corporate compliance renewals.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900/60 border-white/10">
                    <CardContent className="p-4">
                        <span className="text-xs font-semibold text-slate-400 block">Total Active Accounts Analyzed</span>
                        <span className="text-2xl font-bold text-white mt-1 block">{customers.length}</span>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/60 border-white/10">
                    <CardContent className="p-4">
                        <span className="text-xs font-semibold text-slate-400 block">High Churn Risk Accounts</span>
                        <span className="text-2xl font-bold text-rose-400 mt-1 block">{highRiskAccounts.length}</span>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/60 border-white/10">
                    <CardContent className="p-4">
                        <span className="text-xs font-semibold text-slate-400 block">Retention Automation</span>
                        <span className="text-2xl font-bold text-emerald-400 mt-1 block">Active</span>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-slate-900/60 border-white/10">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-rose-400" /> At-Risk Accounts Needing Action
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2 text-xs">
                    {analyzedCustomers.length > 0 ? (
                        analyzedCustomers.map(({ customer, churn }) => (
                            <div key={customer.id} className="p-4 bg-slate-950/40 border border-white/5 rounded-lg flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white text-sm">{customer.name}</span>
                                        <Badge variant="outline" className={
                                            churn.riskLevel === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        }>
                                            {churn.riskLevel} Risk ({churn.score}%)
                                        </Badge>
                                    </div>
                                    <p className="text-slate-400">{churn.reasons.join(' • ')}</p>
                                </div>

                                <Button size="sm" onClick={() => handleSendRetentionOffer(customer.name)} className="bg-[#1c398e] hover:bg-[#152c6f] text-white">
                                    Send Retention Offer
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-slate-500 py-6 text-center">No customer data loaded.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
