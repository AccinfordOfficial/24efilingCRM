import React, { useState, useEffect } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { Payment } from '../types';

interface EditPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  onSave: (updatedPayment: Payment, remarks: string) => void;
  totalInvoiceValue?: number;
}

export const EditPaymentDialog: React.FC<EditPaymentDialogProps> = ({ isOpen, onClose, payment, onSave }) => {
  const [date, setDate] = useState('');
  
  // Financial Fields
  const [tax, setTax] = useState(payment.tax || 0);
  const [fee, setFee] = useState(payment.fee || 0);
  const [received, setReceived] = useState(payment.received || payment.amount || 0);
  const [salesAmount, setSalesAmount] = useState(payment.sales_amount || 0);
  
  const [method, setMethod] = useState(payment.method);
  const [transactionId, setTransactionId] = useState(payment.receipt_number);
  const [remarks, setRemarks] = useState('');

  // Auto-calculated fields (just for display/logic)
  const total = tax + fee;
  const due = total - received;

  useEffect(() => {
    if (isOpen) {
        setTax(payment.tax || 0);
        setFee(payment.fee || 0);
        setReceived(payment.received || payment.amount || 0);
        setSalesAmount(payment.sales_amount || 0);
        
        try {
            setDate(new Date(payment.date).toISOString().split('T')[0]);
        } catch(e) {
            setDate('');
        }
        setMethod(payment.method);
        setTransactionId(payment.receipt_number);
        setRemarks('');
    }
  }, [isOpen, payment]);

  const handleSave = () => {
    const updated: Payment = {
        ...payment,
        date: new Date(date).toISOString(),
        method,
        receipt_number: transactionId,
        
        // New Structure
        tax: Number(tax),
        fee: Number(fee),
        total: Number(total),
        received: Number(received),
        amount: Number(received), // Backward compat
        due: Number(due),
        sales_amount: Number(salesAmount)
    };
    onSave(updated, remarks);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Edit Payment Receipt" maxWidth="max-w-md">
        <div className="space-y-4">
            <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-200">
                <strong>Audit Warning:</strong> All edits are logged. Please provide a valid reason for modification.
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-sm font-medium text-slate-700">Tax</label>
                  <Input type="number" value={tax} onChange={e => setTax(Number(e.target.value))} />
               </div>
               <div>
                  <label className="text-sm font-medium text-slate-700">Fee</label>
                  <Input type="number" value={fee} onChange={e => setFee(Number(e.target.value))} />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200">
               <div>
                  <label className="text-xs uppercase font-bold text-slate-500">Total (Tax + Fee)</label>
                  <div className="text-lg font-bold text-slate-900">₹{total}</div>
               </div>
               <div>
                  <label className="text-xs uppercase font-bold text-slate-500">Due (Total - Paid)</label>
                  <div className={`text-lg font-bold ${due > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{due}</div>
               </div>
            </div>

            <div className="border-t border-slate-100 pt-2">
                 <label className="text-sm font-medium text-slate-700">Received Amount (₹)</label>
                 <Input type="number" value={received} onChange={e => setReceived(Number(e.target.value))} className="font-bold text-lg" />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-sm font-medium text-slate-700">Payment Date</label>
                 <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
               </div>
               <div>
                 <label className="text-sm font-medium text-slate-700">Payment Mode</label>
                 <Select value={method} onChange={e => setMethod(e.target.value as any)}>
                     <option value="Cash">Cash</option>
                     <option value="UPI">UPI</option>
                     <option value="Card">Card</option>
                     <option value="Bank Transfer">Bank Transfer</option>
                 </Select>
               </div>
            </div>

            <div>
                <label className="text-sm font-medium text-slate-700">Reference / Receipt ID</label>
                <Input value={transactionId} onChange={e => setTransactionId(e.target.value)} />
            </div>

             <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
                <label className="text-sm font-semibold text-indigo-900">Sales Amount (Credit)</label>
                <p className="text-xs text-indigo-600 mb-1">Amount counted towards sales reports.</p>
                <Input type="number" value={salesAmount} onChange={e => setSalesAmount(Number(e.target.value))} className="border-indigo-200 focus:border-indigo-500" />
            </div>

            <div>
                <label className="text-sm font-medium text-slate-700">Remarks / Audit Note (Mandatory)</label>
                <Textarea 
                    placeholder="Reason for modification..." 
                    value={remarks} 
                    onChange={e => setRemarks(e.target.value)} 
                    className="min-h-[80px]"
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} disabled={!remarks.trim()} variant="primary">Save Changes</Button>
            </div>
        </div>
    </Dialog>
  );
};
