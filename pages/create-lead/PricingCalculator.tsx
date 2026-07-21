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
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircleIcon className="h-6 w-6" />
                </div>
                <div>
                    <CardTitle>Payment & Invoice</CardTitle>
                    <CardDescription>Manage advance payments and generate invoice.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Service to Update Advance</label>
                        <Select 
                            value={selectedServiceIdForPayment} 
                            onChange={(e) => handlePaymentServiceSelectionChange(e.target.value)}
                            className="mb-4"
                        >
                            {serviceSets.map((set, idx) => (
                                <option key={set.id} value={set.id}>
                                    {set.mainService || `Service #${idx + 1}`}
                                </option>
                            ))}
                        </Select>

                        <div className="grid grid-cols-2 gap-4 mb-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Mode</label>
                                <Select
                                    value={tempPaymentMode}
                                    onChange={(e) => setTempPaymentMode(e.target.value)}
                                    className="h-12 text-base"
                                >
                                    <option value="UPI">UPI</option>
                                    <option value="Net Banking">Net Banking</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Credit Card">Credit Card</option>
                                    <option value="Debit Card">Debit Card</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Other">Other</option>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Advance Amount</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-2.5 text-slate-500 font-bold">₹</span>
                                        <Input 
                                            type="number" 
                                            value={tempAdvanceAmount} 
                                            onChange={(e) => setTempAdvanceAmount(e.target.value)} 
                                            className="pl-8 text-lg font-bold text-[#1c398e] h-12" 
                                            placeholder="0" 
                                        />
                                    </div>
                                    <Button 
                                        type="button" 
                                        onClick={handleUpdateAdvanceAmount}
                                        className="h-12 px-6 bg-[#1c398e] hover:bg-[#152c6e]"
                                    >
                                        Update
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Total Advance Paid: <span className="font-bold text-green-600">₹{totalAdvance.toLocaleString('en-IN')}</span>
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Total Amount:</span>
                            <span className="font-bold">₹{grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600">
                            <span className="font-medium">Advance Paid:</span>
                            <span className="font-bold">- ₹{totalAdvance.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-base border-t pt-2 mt-2 text-[#1c398e]">
                            <span className="font-bold">Remaining Balance:</span>
                            <span className="font-bold">₹{remainingAmount.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
                
                <div className="border-t pt-8">
                    <h4 className="font-medium text-slate-700 mb-4 flex items-center gap-2">
                        Invoice Preview <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Draft</Badge>
                    </h4>
                    <div className="max-w-3xl mx-auto border rounded-xl shadow-sm bg-slate-50/30 p-1">
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
