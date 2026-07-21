import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Invoice } from '../../types';

export function useInvoicesApi(core: {
    fetchData: () => Promise<void>;
    logUserActivity: (action: string, details: string) => Promise<void>;
}) {
    const { fetchData, logUserActivity } = core;

    const addInvoice = useCallback(async (invoiceData: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'invoice_number'>) => {
        try {
            const { data, error } = await (supabase.from('invoices' as any) as any).insert([invoiceData]).select().single();
            if (error) throw error;
            await logUserActivity('Invoice Created', `Created invoice: ${data.invoice_number} for total ₹${data.total_amount}`);
            await fetchData();
            return data;
        } catch (e) {
            console.warn("DB insert failed for invoice", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const updateInvoice = useCallback(async (id: string, invoiceData: Partial<Invoice>) => {
        try {
            const { error } = await (supabase.from('invoices' as any) as any).update(invoiceData).eq('id', id);
            if (error) throw error;
            await logUserActivity('Invoice Updated', `Updated invoice ID: ${id}`);
            await fetchData();
        } catch (e) {
            console.warn("DB update failed for invoice", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const deleteInvoice = useCallback(async (id: string) => {
        try {
            const { error } = await (supabase.from('invoices' as any) as any).delete().eq('id', id);
            if (error) throw error;
            await logUserActivity('Invoice Deleted', `Deleted invoice ID: ${id}`);
            await fetchData();
        } catch (e) {
            console.warn("DB delete failed for invoice", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const addInvoicePayment = useCallback(async (invoiceId: string, paymentId: string, amount: number) => {
        try {
            const { data, error } = await (supabase.from('invoice_payments' as any) as any).insert([{ invoice_id: invoiceId, payment_id: paymentId, amount }]).select().single();
            if (error) throw error;
            await fetchData();
            return data;
        } catch (e) {
            console.warn("DB insert failed for invoice payment", e);
            throw e;
        }
    }, [fetchData]);

    return {
        addInvoice,
        updateInvoice,
        deleteInvoice,
        addInvoicePayment
    };
}
