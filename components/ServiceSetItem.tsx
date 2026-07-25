import React, { useState } from 'react';
import { ServiceSet } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { ChevronDown } from './icons';
import { Badge } from './ui/Badge';
import { Layers, Tag } from 'lucide-react';

interface ServiceSetItemProps {
    serviceSet: ServiceSet;
    onAddPayment: (amount: number, method: string) => void;
}

export const ServiceSetItem: React.FC<ServiceSetItemProps> = ({ serviceSet, onAddPayment }) => {
    const [isExpanded, setIsExpanded] = useState(true); // Default open for visibility
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer'>('UPI');

    const handleAdd = () => {
        const val = parseFloat(amount);
        if (val > 0) {
            onAddPayment(val, method);
            setAmount('');
        } else {
            alert('Enter valid amount');
        }
    };

    // Calculate subservice totals
    const subservicesSubtotal = (serviceSet.subservices || []).reduce((acc, sub) => {
        const itemRate = sub.amount || 0;
        const itemQty = sub.quantity || 1;
        const itemTax = sub.is_tax_applicable ? (sub.tax_amount || Math.round(itemRate * itemQty * 0.18)) : 0;
        return acc + (itemRate * itemQty) + itemTax;
    }, 0);

    const totalFee = (serviceSet.service_fee || 0) + subservicesSubtotal;
    const discountVal = serviceSet.discount || 0;
    const netPayable = Math.max(0, totalFee - discountVal);
    const advancePaid = serviceSet.advance_amount || 0;
    const dueBalance = Math.max(0, netPayable - advancePaid);

    return (
        <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-900/80 border-slate-200 dark:border-white/10 shadow-sm transition-all">
            <button
                type="button"
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer border-b border-slate-200 dark:border-white/10"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1c398e]/10 dark:bg-blue-500/20 text-[#1c398e] dark:text-blue-400 rounded-lg">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Main Category:</span>
                            <span className="font-extrabold text-slate-900 dark:text-white text-base">{serviceSet.mainService}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {(serviceSet.subservices || []).length} Sub-services included
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">Total Payable</span>
                        <span className="text-sm font-bold text-[#1c398e] dark:text-blue-400">₹{netPayable.toLocaleString('en-IN')}</span>
                    </div>
                    <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                    </div>
                </div>
            </button>

            {isExpanded && (
                <div className="p-5 space-y-5">
                    {/* Sub-services list with explicit pricing */}
                    <div>
                        <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5 text-[#1c398e] dark:text-blue-400" />
                            Sub-Services & Fee Details
                        </h5>

                        {(serviceSet.subservices || []).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {serviceSet.subservices.map((sub, idx) => {
                                    const subtotal = ((sub.amount || 0) * (sub.quantity || 1));
                                    const tax = sub.is_tax_applicable ? (sub.tax_amount || Math.round(subtotal * 0.18)) : 0;
                                    return (
                                        <div key={idx} className="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-white/10 space-y-1">
                                            <div className="flex justify-between items-start gap-2">
                                                <span className="font-bold text-slate-900 dark:text-white text-sm">{sub.name}</span>
                                                <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-[#1c398e] dark:text-blue-300">
                                                    Qty: {sub.quantity || 1}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-white/5">
                                                <span>Base Rate: ₹{(sub.amount || 0).toLocaleString('en-IN')}</span>
                                                {tax > 0 && <span>GST (18%): ₹{tax.toLocaleString('en-IN')}</span>}
                                                <strong className="text-slate-900 dark:text-white">Total: ₹{(subtotal + tax).toLocaleString('en-IN')}</strong>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic">No specific sub-services itemized under {serviceSet.mainService}.</p>
                        )}
                    </div>

                    {/* Financial Calculations Summary Box */}
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Total Fee</span>
                            <span className="text-base font-bold text-slate-900 dark:text-white">₹{totalFee.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Discount</span>
                            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">-₹{discountVal.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Advance Paid</span>
                            <span className="text-base font-bold text-[#1c398e] dark:text-blue-400">₹{advancePaid.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Balance Due</span>
                            <span className={`text-base font-bold ${dueBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                ₹{dueBalance.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>

                    {/* Update Payment Input Box */}
                    <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Record Additional Advance / Fee Payment</h5>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                                type="number"
                                placeholder="Payment Amount (₹)"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-white/10 dark:text-white"
                            />
                            <Select
                                value={method}
                                onChange={e => setMethod(e.target.value as any)}
                                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-white/10 dark:text-white sm:w-44"
                            >
                                <option value="UPI">UPI</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Card">Card</option>
                                <option value="Cash">Cash</option>
                            </Select>
                            <Button size="sm" onClick={handleAdd} className="bg-[#1c398e] dark:bg-blue-600 text-white shrink-0">
                                Record Payment
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
