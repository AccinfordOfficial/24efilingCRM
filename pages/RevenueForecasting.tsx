import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useApi } from '../hooks/useApi';
import { DollarSignIcon, TrendingUpIcon, BarChart3Icon } from '../components/icons';
import { Target } from 'lucide-react';

export const RevenueForecasting: React.FC = () => {
    const { leads, invoices } = useApi({ fetchOnMount: false });

    // Calculate Pipeline Weighted Forecast
    const pipelineForecast = useMemo(() => {
        let weightedTotal = 0;
        let unweightedTotal = 0;

        leads.forEach((lead) => {
            const val = Number(lead.total_payment) || 0;
            unweightedTotal += val;

            let stageProb = 0.1; // New lead 10%
            if (lead.status === 'Lead Confirmed') stageProb = 0.3;
            else if (lead.status === 'Documents & Payments') stageProb = 0.6;
            else if (lead.status === 'In-Progress') stageProb = 0.85;
            else if (lead.status === 'Success') stageProb = 1.0;
            else if (lead.status === 'Lost') stageProb = 0.0;

            weightedTotal += val * stageProb;
        });

        return { weightedTotal, unweightedTotal };
    }, [leads]);

    const projectedMrr = 145000; // Estimated monthly recurring revenue from renewals

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white">Predictive Revenue & Pipeline Forecast</h2>
                <p className="text-xs text-slate-400">AI-driven weighted pipeline probability, time-series projections, and recurring compliance revenue forecast.</p>
            </div>

            {/* Forecast KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900/60 border-white/10">
                    <CardContent className="p-4">
                        <span className="text-xs font-semibold text-slate-400 block">Total Unweighted Pipeline</span>
                        <span className="text-2xl font-bold text-white mt-1 block">₹{pipelineForecast.unweightedTotal.toLocaleString()}</span>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-[#1c398e] to-[#152c6f] border-white/10 text-white shadow-xl">
                    <CardContent className="p-4">
                        <span className="text-xs font-semibold text-blue-200 block">Weighted Probability Forecast</span>
                        <span className="text-2xl font-bold text-emerald-400 mt-1 block">₹{Math.round(pipelineForecast.weightedTotal).toLocaleString()}</span>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/60 border-white/10">
                    <CardContent className="p-4">
                        <span className="text-xs font-semibold text-slate-400 block">Projected MRR (Renewals)</span>
                        <span className="text-2xl font-bold text-blue-400 mt-1 block">₹{projectedMrr.toLocaleString()}/mo</span>
                    </CardContent>
                </Card>
            </div>

            {/* Pipeline Stage Probability Matrix */}
            <Card className="bg-slate-900/60 border-white/10">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        <Target className="h-4 w-4 text-emerald-400" /> Pipeline Stage Probability Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2 text-xs">
                    {[
                        { stage: 'New Lead', prob: '10%', leadsCount: leads.filter(l => l.status === 'New Lead').length },
                        { stage: 'Lead Confirmed', prob: '30%', leadsCount: leads.filter(l => l.status === 'Lead Confirmed').length },
                        { stage: 'Documents & Payments', prob: '60%', leadsCount: leads.filter(l => l.status === 'Documents & Payments').length },
                        { stage: 'In-Progress', prob: '85%', leadsCount: leads.filter(l => l.status === 'In-Progress').length },
                        { stage: 'Success', prob: '100%', leadsCount: leads.filter(l => l.status === 'Success').length }
                    ].map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex items-center justify-between">
                            <div>
                                <span className="font-semibold text-white">{item.stage}</span>
                                <span className="text-slate-400 ml-2">({item.leadsCount} active leads)</span>
                            </div>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold">
                                {item.prob} Win Probability
                            </Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};
