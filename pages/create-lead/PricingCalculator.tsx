import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CheckCircleIcon } from '../../components/icons';
import { InvoicePreview } from '../../components/InvoicePreview';
import { ServiceSet } from '../../types';

interface PricingCalculatorProps {
    serviceSets: ServiceSet[];
    selectedServiceIdForPayment: string;
    handlePaymentServiceSelectionChange: (setId: string) => void;
    tempPaymentMode: string;
    setTempPaymentMode: (val: string) => void;
    tempAdvanceAmount: number | string;
    setTempAdvanceAmount: (val: string) => void;
    handleUpdateAdvanceAmount: () => void;
    totalAdvance: number;
    grandTotal: number;
    remainingAmount: number;
    refNumber: string;
    formData: any;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
    serviceSets,
    selectedServiceIdForPayment,
    handlePaymentServiceSelectionChange,
    tempPaymentMode,
    setTempPaymentMode,
    tempAdvanceAmount,
    setTempAdvanceAmount,
    handleUpdateAdvanceAmount,
    totalAdvance,
    grandTotal,
    remainingAmount,
    refNumber,
    formData
}) => {
    return (
        <Card className="dark:bg-slate-900/80 dark:border-white/10 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <CheckCircleIcon className="h-6 w-6" />
                </div>
                <div>
                    <CardTitle className="dark:text-white">Payment & Invoice</CardTitle>
                    <CardDescription className="dark:text-slate-400">Manage advance payments and generate invoice.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Service to Update Advance</label>

                        <Select 
                            value={selectedServiceIdForPayment} 
                            onChange={(e) => handlePaymentServiceSelectionChange(e.target.value)}
                            className="mb-4 bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10"
                        >
                            {serviceSets.map((set, idx) => (
                                <option key={set.id} value={set.id} className="bg-slate-950 text-white">
                                    {set.mainService || `Service #${idx + 1}`}
                                </option>
                            ))}
                        </Select>

                        <div className="grid grid-cols-2 gap-4 mb-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Payment Mode</label>
                                <Select
                                    value={tempPaymentMode}
                                    onChange={(e) => setTempPaymentMode(e.target.value)}
                                    className="h-12 text-base bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10"
                                >
                                    <option value="UPI" className="bg-slate-950 text-white">UPI</option>
                                    <option value="Net Banking" className="bg-slate-950 text-white">Net Banking</option>
                                    <option value="Cash" className="bg-slate-950 text-white">Cash</option>
                                    <option value="Credit Card" className="bg-slate-950 text-white">Credit Card</option>
                                    <option value="Debit Card" className="bg-slate-950 text-white">Debit Card</option>
                                    <option value="Cheque" className="bg-slate-950 text-white">Cheque</option>
                                    <option value="Other" className="bg-slate-950 text-white">Other</option>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Advance Amount</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-2.5 text-slate-500 dark:text-slate-400 font-bold">₹</span>
                                        <Input 
                                            type="number" 
                                            value={tempAdvanceAmount} 
                                            onChange={(e) => setTempAdvanceAmount(e.target.value)} 
                                            className="pl-8 text-lg font-bold text-primary h-12 bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10" 
                                            placeholder="0" 
                                        />
                                    </div>
                                    <Button 
                                        type="button" 
                                        onClick={handleUpdateAdvanceAmount}
                                        className="h-12 px-6 bg-primary text-primary-foreground hover:opacity-90 font-bold"
                                    >
                                        Update
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            Total Advance Paid: <span className="font-bold text-green-600 dark:text-green-400">₹{totalAdvance.toLocaleString('en-IN')}</span>
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-white/10 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Total Amount:</span>
                            <span className="font-bold text-slate-900 dark:text-white">₹{grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                            <span className="font-medium">Advance Paid:</span>
                            <span className="font-bold">- ₹{totalAdvance.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-base border-t border-slate-200 dark:border-white/10 pt-2 mt-2 text-primary">
                            <span className="font-bold">Remaining Balance:</span>
                            <span className="font-bold">₹{remainingAmount.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
                
                <div className="border-t border-slate-200 dark:border-white/10 pt-8">
                    <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                        Invoice Preview <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">Draft</Badge>
                    </h4>
                    <div className="max-w-3xl mx-auto border border-slate-200 dark:border-white/10 rounded-xl shadow-sm bg-slate-50/30 dark:bg-slate-950/20 p-1">
                        <InvoicePreview 
                            customerName={`${formData.first_name} ${formData.last_name}`}
                            businessName={formData.business_name}
                            email={formData.email}
                            phone={formData.phone_number}
                            address={formData.business_address || formData.residential_address}
                            description={formData.notes}
                            serviceSets={serviceSets} 
                            advanceAmount={totalAdvance} 
                            grandTotal={grandTotal} 
                            referenceNumber={refNumber}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
