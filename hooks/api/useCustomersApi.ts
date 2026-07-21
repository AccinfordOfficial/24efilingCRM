import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Customer } from '../../types';

export function useCustomersApi(core: {
    profile: any;
    customers: Customer[];
    fetchData: () => Promise<void>;
    logUserActivity: (action: string, details: string) => Promise<void>;
    businessCategories: any[];
    industryTypes: any[];
    leadSources: any[];
}) {
    const { profile, customers, fetchData, logUserActivity, businessCategories, industryTypes, leadSources } = core;

    const addCustomer = useCallback(async (customerData: Partial<Customer>) => {
        if (!profile) throw new Error("User not authenticated");

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Session expired. Please reload.");

        // Generate Reference Number
        const currentYear = new Date().getFullYear();
        let seqVal: number;
        try {
            const { data: seqData, error: seqErr } = await (supabase as any).rpc('generate_next_payment_sequence', { payment_year: currentYear });
            if (seqErr || !seqData) {
                console.warn("RPC failed, using fallback:", seqErr);
                seqVal = customers.length + 1;
            } else {
                seqVal = seqData;
            }
        } catch (e) {
            console.warn("RPC exception, using fallback:", e);
            seqVal = customers.length + 1;
        }
        const referenceNumber = `E-${String(seqVal).padStart(3, '0')}-${currentYear}`;

        const catObj = businessCategories.find(c => c.name === customerData.business_category);
        const indObj = industryTypes.find(i => i.name === customerData.industry_type);
        const srcObj = leadSources.find(s => s.source_name === customerData.lead_source);
        const businessCategoryId = catObj ? catObj.id : '11111111-1111-1111-1111-111111111111';
        const industryTypeId = indObj ? indObj.id : '22222222-2222-2222-2222-222222222222';
        const leadSourceId = srcObj ? srcObj.id : '33333333-3333-3333-3333-333333333333';

        const payload: any = {
            ...customerData,
            reference_number: referenceNumber,
            assigned_to: (customerData.assigned_to as any)?.id || customerData.assigned_to || null,
            created_by: profile.id, // Set creator
            branch_id: profile.branch_id, // Default to creator's branch
            business_category_id: businessCategoryId,
            industry_type_id: industryTypeId,
            lead_source_id: leadSourceId,
            created_at: customerData.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            lead_id: null, // Manual creation has no lead
        };
        delete payload.business_category;
        delete payload.industry_type;

        let { error } = await (supabase.from('customers') as any).insert([payload]);
        if (error && (error.message.includes('reference_number') || error.message.includes('schema cache') || error.code === '42703')) {
            console.warn("Database missing 'reference_number' column, retrying customer insert without it.", error.message);
            const { reference_number, ...payloadWithoutRef } = payload;
            const retryRes = await (supabase.from('customers') as any).insert([payloadWithoutRef]);
            error = retryRes.error;
        }
        if (error) throw error;

        await logUserActivity('Customer Created', `Created customer: ${customerData.name}`);
        await fetchData();
    }, [profile, customers, fetchData, logUserActivity, businessCategories, industryTypes, leadSources]);

    const importCustomers = useCallback(async (customersData: any[]) => {
        if (!profile) throw new Error("User not authenticated");

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Session expired. Please reload.");

        const BATCH_SIZE = 50;
        const chunks = [];
        for (let i = 0; i < customersData.length; i += BATCH_SIZE) {
            chunks.push(customersData.slice(i, i + BATCH_SIZE));
        }

        let processed = 0;
        const currentYear = new Date().getFullYear();
        for (const chunk of chunks) {
            const preparedData = [];
            for (const c of chunk) {
                let seqVal = customers.length + processed + 1;
                try {
                    const { data: seqData, error: seqErr } = await (supabase as any).rpc('generate_next_payment_sequence', { payment_year: currentYear });
                    if (!seqErr && seqData) {
                        seqVal = seqData;
                    }
                } catch (e) {
                    console.warn("RPC failed during import fallback:", e);
                }
                const referenceNumber = `E-${String(seqVal).padStart(3, '0')}-${currentYear}`;

                preparedData.push({
                    ...c,
                    reference_number: referenceNumber,
                    created_by: profile.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }

            let { error } = await (supabase.from('customers') as any).insert(preparedData);
            if (error && (error.message.includes('reference_number') || error.message.includes('schema cache') || error.code === '42703')) {
                console.warn("Database missing 'reference_number' column, retrying customer bulk insert without it.", error.message);
                const preparedDataWithoutRef = preparedData.map(({ reference_number, ...rest }) => rest);
                const retryRes = await (supabase.from('customers') as any).insert(preparedDataWithoutRef);
                error = retryRes.error;
            }
            if (error) throw error;
            processed += chunk.length;
        }

        await logUserActivity('Data Import', `Imported ${processed} customer records.`);
        await fetchData();
    }, [profile, customers, fetchData, logUserActivity]);

    const deleteCustomer = useCallback(async (customerId: string) => {
        const { data, error } = await supabase.from('customers').delete().eq('id', customerId).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Unable to delete. Permission denied or record not found.");

        await logUserActivity('Customer Deleted', `Deleted customer ID: ${customerId}`);
        await fetchData();
    }, [fetchData, logUserActivity]);

    const deleteCustomers = useCallback(async (customerIds: string[]) => {
        const { data, error } = await supabase.from('customers').delete().in('id', customerIds).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Unable to delete. Permission denied or records not found.");

        await logUserActivity('Bulk Delete', `Deleted ${data.length} customers`);
        await fetchData();
    }, [fetchData, logUserActivity]);

    const updateCustomer = useCallback(async (customerId: string, updates: Partial<Customer>) => {
        const { assigned_to, leads, uploaded_documents, ...rest } = updates as any;
        
        const catObj = businessCategories.find(c => c.name === updates.business_category);
        const indObj = industryTypes.find(i => i.name === updates.industry_type);
        const srcObj = leadSources.find(s => s.source_name === updates.lead_source);
        const businessCategoryId = catObj ? catObj.id : (updates.business_category === undefined ? undefined : '11111111-1111-1111-1111-111111111111');
        const industryTypeId = indObj ? indObj.id : (updates.industry_type === undefined ? undefined : '22222222-2222-2222-2222-222222222222');
        const leadSourceId = srcObj ? srcObj.id : (updates.lead_source === undefined ? undefined : '33333333-3333-3333-3333-333333333333');

        const dbUpdates: any = {
            ...rest,
            assigned_to: assigned_to?.id || assigned_to || null,
            ...(businessCategoryId !== undefined && { business_category_id: businessCategoryId }),
            ...(industryTypeId !== undefined && { industry_type_id: industryTypeId }),
            ...(leadSourceId !== undefined && { lead_source_id: leadSourceId }),
        };
        delete dbUpdates.business_category;
        delete dbUpdates.industry_type;
        let { error } = await supabase.from('customers').update(dbUpdates).eq('id', customerId);
        if (error && (error.message.includes('reference_number') || error.message.includes('schema cache') || error.code === '42703')) {
            console.warn("Database missing 'reference_number' column, retrying customer update without it.", error.message);
            const { reference_number, ...dbUpdatesWithoutRef } = dbUpdates as any;
            const retryRes = await supabase.from('customers').update(dbUpdatesWithoutRef).eq('id', customerId);
            error = retryRes.error;
        }
        if (error) throw error;
        await logUserActivity('Customer Updated', `Updated customer ID: ${customerId}`);
        await fetchData();
    }, [fetchData, logUserActivity, businessCategories, industryTypes, leadSources]);

    return {
        addCustomer,
        importCustomers,
        deleteCustomer,
        deleteCustomers,
        updateCustomer
    };
}
