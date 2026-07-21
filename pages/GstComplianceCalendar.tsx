import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FormField } from '../components/ui/FormField';
import { useApi } from '../hooks/useApi';
import { getUpcomingGstDeadlines, calculateGstLateFee } from '../lib/gstCalendar';
import { toast } from 'sonner';
import { CalendarIcon, ClockIcon, DollarSignIcon } from '../components/icons';
import { CalendarCheck } from 'lucide-react';

export const GstComplianceCalendar: React.FC = () => {
    const { customers } = useApi({ fetchOnMount: false });

    const [daysOverdue, setDaysOverdue] = useState(10);
    const [isNil, setIsNil] = useState(false);

    const now = new Date();
    const deadlines = getUpcomingGstDeadlines(now.getFullYear(), now.getMonth() + 1);
    const calculatedFee = calculateGstLateFee(daysOverdue, isNil);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white">GST Statutory Compliance Calendar</h2>
                <p className="text-xs text-slate-400">Automated Indian GST return deadline schedule & statutory late fee penalty calculator.</p>
            </div>

            {/* Upcoming Statutory Deadlines */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {deadlines.map((item, idx) => (
                    <Card key={idx} className="bg-slate-900/60 border-white/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                                <span>{item.returnType}</span>
                                <Badge variant="outline" className="bg-[#1c398e]/20 text-blue-400 border-[#1c398e]/40 font-mono">
                                    Due: {item.dueDate}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2 text-xs text-slate-400">
                            {item.description}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Late Fee Calculator Widget */}
            <Card className="bg-slate-900/60 border-white/10">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        <CalendarCheck className="h-4 w-4 text-emerald-400" /> GST Statutory Late Fee Penalty Estimator
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            label="Days Overdue Past Statutory Deadline"
                            id="days_overdue"
                            type="number"
                            value={daysOverdue}
                            onChange={(e) => setDaysOverdue(Number(e.target.value))}
                        />
                        <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isNil}
                                    onChange={(e) => setIsNil(e.target.checked)}
                                    className="rounded border-slate-700 text-primary"
                                />
                                <span>Is this a Nil Return? (₹20/day vs ₹50/day)</span>
                            </label>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-950/60 border border-white/5 rounded-lg flex items-center justify-between">
                        <div>
                            <span className="text-slate-400 block">Estimated Penalty Fee</span>
                            <span className="text-2xl font-bold text-rose-400">₹{calculatedFee.toLocaleString()}</span>
                        </div>
                        <Button size="sm" onClick={() => toast.success(`Late fee calculation of ₹${calculatedFee} shared with client`)} className="bg-[#1c398e] text-white">
                            Notify Client Penalty
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
