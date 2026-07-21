import React from 'react';
import { Lead, Payment } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FileTextIcon } from '../../components/icons';

interface LeadPaymentsTabProps {
    lead: Lead;
    advance_paid: number;
    newPaymentAmount: string;
    setNewPaymentAmount: (val: string) => void;
    newPaymentMethod: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer';
    setNewPaymentMethod: (val: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer') => void;
    newPaymentServiceId: string;
    setNewPaymentServiceId: (val: string) => void;
    handleAddPayment: () => void;
    handleOpenReceipt: () => void;
    setEditingPayment: (payment: Payment) => void;
}

export const LeadPaymentsTab: React.FC<LeadPaymentsTabProps> = ({
    lead,
    advance_paid,
    newPaymentAmount,
    setNewPaymentAmount,
    newPaymentMethod,
    setNewPaymentMethod,
    newPaymentServiceId,
    setNewPaymentServiceId,
    handleAddPayment,
    handleOpenReceipt,
    setEditingPayment
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-blue-50 text-[#1c398e]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </div>
                        Payment Progress & History
                    </div>
                    <Button size="sm" variant="ghost" onClick={handleOpenReceipt} title="View Receipt">
                        <FileTextIcon className="h-4 w-4 text-blue-600" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>Payment Status</span>
                        <span>{Math.min(Math.round((advance_paid / (lead.total_payment || 1)) * 100), 100)}% Paid</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner relative">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-[#1c398e] transition-all duration-700 ease-out shadow-sm relative"
                            style={{ width: `${Math.min(((advance_paid / (lead.total_payment || 1)) * 100), 100)}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></div>
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-xs text-slate-500 block mb-1">Total Amount</span>
                        <span className="font-bold text-slate-800 text-base">₹{(lead.total_payment || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <span className="text-xs text-green-600 block mb-1">Advance Paid</span>
                        <span className="font-bold text-green-700 text-base">₹{advance_paid.toLocaleString('en-IN')}</span>
                    </div>
                </div>
                
                <div className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                    <span className="text-sm font-medium text-slate-600">Remaining Due</span>
                    <span className="text-lg font-bold text-[#1c398e]">₹{((lead.total_payment || 0) - advance_paid).toLocaleString('en-IN')}</span>
                </div>

                {/* Add Payment Form */}
                <div className="p-4 bg-slate-50 rounded-lg border space-y-4">
                    <h4 className="text-sm font-bold text-slate-700">Record New Payment</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Service Set</label>
                            <Select 
                                value={newPaymentServiceId} 
                                onChange={(e) => setNewPaymentServiceId(e.target.value)}
                            >
                                <option value="">Select Service Set</option>
                                {lead.service_sets?.map((set, idx) => (
                                    <option key={set.id} value={set.id}>
                                        {set.mainService || `Service #${idx + 1}`}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Method</label>
                            <Select
                                value={newPaymentMethod}
                                onChange={(e) => setNewPaymentMethod(e.target.value as any)}
                            >
                                <option value="UPI">UPI</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cash">Cash</option>
                                <option value="Card">Card</option>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Amount</label>
                            <div className="flex gap-2">
                                <Input 
                                    type="number" 
                                    value={newPaymentAmount} 
                                    onChange={(e) => setNewPaymentAmount(e.target.value)} 
                                    placeholder="0"
                                />
                                <Button onClick={handleAddPayment}>Record</Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment History List */}
                <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Payment History</h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                        {(lead.payments && lead.payments.length > 0) ? lead.payments.map((payment) => (
                            <div key={payment.id} className="relative group p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 transition-all">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        {new Date(payment.date).toLocaleDateString()}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400">{payment.receipt_number}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-sm mb-2">
                                    <div className="text-slate-500 text-xs">Bill Total:</div>
                                    <div className="text-right font-medium text-slate-800">₹{(payment.total || 0).toLocaleString('en-IN')}</div>
                                    
                                    <div className="text-slate-500 text-xs">Received:</div>
                                    <div className="text-right font-bold text-green-600">₹{(payment.received || payment.amount || 0).toLocaleString('en-IN')}</div>
                                    
                                    <div className="text-slate-500 text-xs">Due:</div>
                                    <div className={`text-right font-bold ${(payment.due || 0) > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                        ₹{(payment.due || 0).toLocaleString('en-IN')}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-1">
                                    <div className="flex flex-col">
                                         <span className="text-[9px] text-indigo-400 uppercase font-bold">Sales Credit</span>
                                         <span className="text-xs font-bold text-indigo-700">₹{(payment.sales_amount || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-400 block">{payment.method}</span>
                                    </div>
                                </div>

                                <div className="absolute top-2 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        className="h-7 text-xs shadow-sm bg-white hover:bg-blue-50"
                                        onClick={() => setEditingPayment(payment)}
                                    >
                                        View / Edit
                                     </Button>
                                </div>
                            </div>
                        )) : (
                            <p className="text-xs text-slate-400 italic text-center py-2">No payments recorded yet.</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
