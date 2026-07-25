import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FormField } from '../components/ui/FormField';
import { FormSelect } from '../components/ui/FormSelect';
import { Dialog } from '../components/ui/Dialog';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

import { useApi } from '../hooks/useApi';
import { toast } from 'sonner';
import { DollarSignIcon, PlusIcon, TrendingUpIcon, FileTextIcon, Trash2Icon } from '../components/icons';

interface ExpenseRecord {
    id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
    created_at: string;
}

export const ExpenseManager: React.FC = () => {
    const { profile } = useAuth();
    const { leads } = useApi({ fetchOnMount: false });

    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const [category, setCategory] = useState('software');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(1500);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchExpenses = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
            if (error) throw error;
            setExpenses((data || []) as ExpenseRecord[]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim() || !amount) {
            toast.error("Please enter description and amount");
            return;
        }

        try {
            setIsSubmitting(true);
            const { error } = await (supabase.from('expenses') as any).insert([{
                category: category,
                description: description.trim(),
                amount: Number(amount) || 0,
                date: date,
                branch_id: profile?.branch_id,
                submitted_by: profile?.id,
                status: 'approved'
            }]);

            if (error) throw error;
            toast.success("Expense recorded!");
            setIsCreateOpen(false);
            setDescription('');
            fetchExpenses();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to record expense");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate P&L metrics
    const totalRevenue = leads.reduce((sum, l) => sum + (Number(l.total_payment) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Expense Tracking & Profit/Loss</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Log software licenses, government portal fees, and office operational overheads.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90">
                    <PlusIcon className="h-4 w-4 mr-1" /> Record Expense
                </Button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
                    <CardContent className="p-4">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Total Revenue Collected</span>
                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">₹{totalRevenue.toLocaleString()}</span>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
                    <CardContent className="p-4">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Total Operational Expenses</span>
                        <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">₹{totalExpenses.toLocaleString()}</span>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
                    <CardContent className="p-4">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Net Profit / Margin</span>
                        <span className={`text-2xl font-bold mt-1 block ${netProfit >= 0 ? 'text-primary dark:text-blue-400' : 'text-rose-600 dark:text-rose-500'}`}>
                            ₹{netProfit.toLocaleString()}
                        </span>
                    </CardContent>
                </Card>
            </div>

            {/* Expenses List */}
            <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Operating Expense Ledger</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                    {expenses.length > 0 ? (
                        expenses.map((exp) => (
                            <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-lg">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-900 dark:text-white text-sm">{exp.description}</span>
                                        <Badge variant="outline" className="text-[10px] uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                                            {exp.category}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Date: {exp.date}</p>
                                </div>
                                <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">₹{exp.amount.toLocaleString()}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">No expenses recorded yet.</p>
                    )}
                </CardContent>
            </Card>

            {/* Create Modal */}
            <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Record Operational Expense">
                <form onSubmit={handleCreateExpense} className="space-y-4">
                    <FormSelect
                        label="Expense Category *"
                        id="exp_cat"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        options={[
                            { value: 'software', label: 'Software & Cloud Tools' },
                            { value: 'govt_fees', label: 'Government Portal Fees & Challans' },
                            { value: 'rent', label: 'Office Rent & Utilities' },
                            { value: 'salary', label: 'Salaries & Stipends' },
                            { value: 'marketing', label: 'Marketing & Ads' },
                            { value: 'misc', label: 'Miscellaneous' }
                        ]}
                    />

                    <FormField
                        label="Description *"
                        id="exp_desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. GST portal digital signature fee"
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            label="Amount (₹) *"
                            id="exp_amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            required
                        />
                        <FormField
                            label="Expense Date *"
                            id="exp_date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:opacity-90">
                            {isSubmitting ? 'Saving...' : 'Record Expense'}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
};
