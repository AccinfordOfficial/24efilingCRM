import React, { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Lead, User } from '../../types';
import { Database } from '../../types/database.types';
import { autoAssignLead } from '../../lib/leadAssignment';
import { calculateLeadScore } from '../../lib/scoring';


const UUID_KEYS = [
    'referred_by_customer_id',
    'referred_by_employee_id',
    'assigned_to',
    'assigned_by',
    'created_by',
    'branch_id',
    'business_category_id',
    'industry_type_id',
    'lead_source_id'
];

export function useLeadsApi(core: {
    profile: any;
    leads: Lead[];
    users: User[];
    businessCategories: any[];
    industryTypes: any[];
    leadSources: any[];
    setLeads?: React.Dispatch<React.SetStateAction<Lead[]>>;
    addNotification: (notificationData: any) => Promise<void>;
    addActivityToLead: (leadId: string, activityData: any, user: any) => Promise<void>;
    fetchData: () => Promise<void>;
    logUserActivity: (action: string, details: string) => Promise<void>;
}) {
    const { profile, leads, users, setLeads, businessCategories, industryTypes, leadSources, addNotification, addActivityToLead, fetchData, logUserActivity } = core;

    const leadToCustomer = useCallback((lead: Lead): any => {
        const serviceSets = lead.service_sets || [];
        const serviceAmount = serviceSets.reduce((total, set) => {
            return total + set.subservices.reduce((subTotal, sub) => subTotal + ((Number(sub.amount) || 0) * (Number(sub.quantity) || 1)), 0);
        }, 0);

        const taxAmount = serviceSets.reduce((total, set) => {
            return total + set.subservices.reduce((subTotal, sub) => subTotal + (Number(sub.tax_amount) || 0), 0);
        }, 0);

        const totalAmount = (Number(lead.total_payment) || 0);
        const paidAmount = (lead.payments || []).reduce((acc, curr) => acc + (Number(curr.received) || Number(curr.amount) || 0), 0);
        const dueAmount = totalAmount - paidAmount;

        return {
            lead_id: lead.id,
            reference_number: lead.reference_number,
            name: `${lead.first_name} ${lead.last_name}`,
            email: lead.email,
            phone: lead.phone_number,
            gender: lead.gender,
            business_category_id: (lead as any).business_category_id || null,
            industry_type_id: (lead as any).industry_type_id || null,
            lead_source_id: (lead as any).lead_source_id || null,
            referred_by_customer_id: (lead as any).referred_by_customer_id || null,
            referred_by_employee_id: (lead as any).referred_by_employee_id || null,
            service_name: lead.service_requested,
            sub_service: lead.service_sets?.[0]?.subservices?.[0]?.name || null,
            residential_address: lead.residential_address,
            personal_flat_no: lead.personal_flat_no,
            personal_street: lead.personal_street,
            personal_city: lead.personal_city,
            personal_state: lead.personal_state,
            personal_country: lead.personal_country,
            personal_zip_code: lead.personal_zip_code,
            business_name: lead.business_name,
            business_address: lead.business_address,
            business_flat_no: lead.business_flat_no,
            business_street: lead.business_street,
            business_city: lead.business_city,
            business_state: lead.business_state,
            business_country: lead.business_country,
            business_zip_code: lead.business_zip_code,
            whatsapp_number: lead.whatsapp_number,
            alternate_mobile: lead.alternate_mobile,
            alternate_is_whatsapp: lead.alternate_is_whatsapp,
            pan_number: (lead as any).pan_number || null,
            aadhar_number: (lead as any).aadhar_number || null,
            date_of_enroll: new Date().toISOString(),
            date_of_completion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            service_amount: serviceAmount,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            due_amount: dueAmount,
            created_by: typeof lead.created_by === 'object' ? (lead.created_by as any)?.id : lead.created_by,
            assigned_to: typeof lead.assigned_to === 'object' && lead.assigned_to !== null ? (lead.assigned_to as any).id : (lead.assigned_to as any) || null,
            branch_id: lead.branch_id || profile?.branch_id
        } as any;
    }, [profile]);

    const addLead = useCallback(async (leadData: Omit<Lead, 'id' | 'last_contacted'>) => {
        if (!profile) throw new Error("User not authenticated");
        if (leadData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(leadData.pan_number)) {
            throw new Error("Invalid PAN number format.");
        }
        
        const currentYear = new Date().getFullYear();
        let seqVal: number;
        try {
            const { data: seqData, error: seqErr } = await (supabase as any).rpc('generate_next_payment_sequence', { payment_year: currentYear });
            if (seqErr || !seqData) {
                console.warn("RPC generate_next_payment_sequence failed, using fallback:", seqErr);
                seqVal = leads.length + 1;
            } else {
                seqVal = seqData;
            }
        } catch (e) {
            console.warn("RPC generate_next_payment_sequence exception, using fallback:", e);
            seqVal = leads.length + 1;
        }
        const referenceNumber = `E-${String(seqVal).padStart(3, '0')}-${currentYear}`;

        const { assigned_to, documents, activities, tasks, payments, service_sets, assigner, created_at, branch_name, branch_name_label, ...rest } = leadData as any;
        const catObj = businessCategories.find(c => c.name === leadData.business_category);
        const indObj = industryTypes.find(i => i.name === leadData.industry_type);
        const srcObj = leadSources.find(s => s.source_name === leadData.source);
        const businessCategoryId = catObj ? catObj.id : '11111111-1111-1111-1111-111111111111';
        const industryTypeId = indObj ? indObj.id : '22222222-2222-2222-2222-222222222222';
        const leadSourceId = srcObj ? srcObj.id : '33333333-3333-3333-3333-333333333333';

        let finalAssignedTo = assigned_to?.id;
        if (!finalAssignedTo) {
            const autoAssignedId = await autoAssignLead({
                source: leadData.source,
                service_requested: leadData.service_requested,
                branch_id: profile.branch_id
            });
            if (autoAssignedId) {
                finalAssignedTo = autoAssignedId;
            }
        }

        const dbLeadData: any = {
            ...rest,
            reference_number: referenceNumber,
            assigned_to: finalAssignedTo,
            assigned_by: finalAssignedTo ? profile.id : null,
            created_by: profile.id,
            branch_id: profile.branch_id,
            payments: payments as any,
            service_sets: service_sets as any,
            business_category_id: businessCategoryId,
            industry_type_id: industryTypeId,
            lead_source_id: leadSourceId,
            created_at: created_at || new Date().toISOString()
        };
        delete dbLeadData.business_category;
        delete dbLeadData.industry_type;

        // Convert any empty string UUID fields to null to prevent Postgres UUID syntax errors
        for (const key of UUID_KEYS) {
            if (dbLeadData[key] === '' || (typeof dbLeadData[key] === 'string' && !dbLeadData[key].trim())) {
                dbLeadData[key] = null;
            }
        }

        let data: any = null;
        let error: any = null;
        try {
            const res = await (supabase.from('leads') as any).insert([dbLeadData]).select().single();
            data = res.data;
            error = res.error;
            if (error && (error.message.includes('reference_number') || error.message.includes('schema cache') || error.message.includes('aadhar') || error.code === '42703')) {
                console.warn("Database missing columns, retrying lead insert with safe payload.", error.message);
                const { reference_number, created_by, assigned_by, pan_number, aadhar_number, ...dbLeadDataSafe } = dbLeadData;
                const retryRes = await (supabase.from('leads') as any).insert([dbLeadDataSafe]).select().single();
                data = retryRes.data;
                error = retryRes.error;
            }
        } catch (err: any) {
            error = err;
        }
        if (error || !data) throw error || new Error("Lead creation failed");

        // Construct lead item and update React state IMMEDIATELY (Instant UI Reflection)
        const foundCat = (businessCategories || []).find((c: any) => c.id === data.business_category_id);
        const foundInd = (industryTypes || []).find((i: any) => i.id === data.industry_type_id);
        const foundSrc = (leadSources || []).find((s: any) => s.id === data.lead_source_id);

        const newLeadItem: Lead = {
            ...(data as any),
            business_category: foundCat ? foundCat.name : 'Other',
            industry_type: foundInd ? foundInd.name : 'Other',
            source: foundSrc ? foundSrc.source_name : (data.source || 'Other'),
            assigned_to: assigned_to || null,
            created_by: profile.id,
            activities: [],
            documents: [],
            tasks: [],
            score: calculateLeadScore(data as unknown as Lead)
        };

        if (setLeads) {
            setLeads(prev => [newLeadItem, ...prev]);
        }

        // Run notifications and activity logs asynchronously in background (Non-blocking)
        (async () => {
            try {
                if (assigned_to) {
                    await addNotification({
                        user_id: assigned_to.id,
                        type: 'Lead Assigned',
                        title: 'New Lead Assigned',
                        message: `You have been assigned a new lead: ${leadData.business_name || `${leadData.first_name} ${leadData.last_name}`.trim()}.`,
                        link: { page: 'Lead Detail', id: (data as any).id }
                    });
                } else {
                    const recipients = users.filter(u => {
                        const r = (u.role || '').toLowerCase().replace(/_/g, ' ');
                        return r.includes('sales') || r.includes('admin') || r.includes('manager') || r.includes('super');
                    });
                    await Promise.allSettled(recipients.map(exec => 
                        addNotification({
                            user_id: exec.id,
                            type: 'Lead Assigned',
                            title: 'New Head Office Lead - Pending Assignment',
                            message: `New lead (${leadData.business_name || `${leadData.first_name} ${leadData.last_name}`.trim()}) assigned to Head Office. Please follow up and assign to a sales executive.`,
                            link: { page: 'Lead Detail', id: (data as any).id }
                        })
                    ));
                }
                await addActivityToLead((data as any).id, {
                    type: 'Status Change',
                    content: `created the lead and assigned it to ${assigned_to?.name || 'Unassigned'}.`,
                }, profile);
                await logUserActivity('Lead Created', `Created new lead: ${leadData.business_name} (${leadData.service_requested})`);
            } catch (bgErr) {
                console.warn('[Leads API] Background notification/logging notice:', bgErr);
            }
        })();
    }, [profile, leads, users, setLeads, businessCategories, industryTypes, leadSources, addNotification, addActivityToLead, logUserActivity, fetchData]);

    const updateLead = useCallback(async (leadData: Lead, convertToCustomer: boolean = false, dateOfBirth?: string, aadharNumber?: string) => {
        if (!profile) throw new Error("User not authenticated");
        if (leadData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(leadData.pan_number)) {
            throw new Error("Invalid PAN number format.");
        }
        const originalLead = leads.find(l => l.id === leadData.id);
        const { assigned_to, documents, activities, tasks, payments, service_sets, assigner, ...rest } = leadData;
        
        const isChangingToSuccess = leadData.status === 'Success' && originalLead?.status !== 'Success';
        const nextFollowUpValue = isChangingToSuccess ? null : leadData.next_follow_up;

        const catObj = businessCategories.find(c => c.name === leadData.business_category);
        const indObj = industryTypes.find(i => i.name === leadData.industry_type);
        const srcObj = leadSources.find(s => s.source_name === leadData.source);
        const businessCategoryId = catObj ? catObj.id : (originalLead?.business_category_id || '11111111-1111-1111-1111-111111111111');
        const industryTypeId = indObj ? indObj.id : (originalLead?.industry_type_id || '22222222-2222-2222-2222-222222222222');
        const leadSourceId = srcObj ? srcObj.id : (originalLead?.lead_source_id || '33333333-3333-3333-3333-333333333333');

        const dbLeadData: any = {
            ...rest,
            assigned_to: assigned_to?.id,
            payments: payments as any,
            service_sets: service_sets as any,
            next_follow_up: nextFollowUpValue,
            assigned_by: (leadData.assigned_to?.id && (!originalLead?.assigned_to || originalLead.assigned_to.id !== leadData.assigned_to.id)) ? profile.id : undefined,
            business_category_id: businessCategoryId,
            industry_type_id: industryTypeId,
            lead_source_id: leadSourceId,
        };
        delete dbLeadData.business_category;
        delete dbLeadData.industry_type;

        // Sync financial summary from recorded payments so overview/list/tracker/performance stay consistent
        const recordedPayments = payments || [];
        if (recordedPayments.length > 0) {
            const computedAdvance = recordedPayments.reduce((acc, curr) => acc + (Number((curr as any).received) || Number((curr as any).amount) || 0), 0);
            dbLeadData.advance_amount = computedAdvance;
            dbLeadData.remaining_amount = Math.max(0, (Number(leadData.total_payment) || 0) - computedAdvance);
        }

        // Convert any empty string UUID fields to null to prevent Postgres UUID syntax errors
        for (const key of UUID_KEYS) {
            if (dbLeadData[key] === '' || (typeof dbLeadData[key] === 'string' && !dbLeadData[key].trim())) {
                dbLeadData[key] = null;
            }
        }

        let updateError: any = null;
        try {
            const res = await (supabase.from('leads') as any).update(dbLeadData).eq('id', leadData.id);
            updateError = res.error;
            if (updateError && (updateError.message.includes('reference_number') || updateError.message.includes('schema cache') || updateError.message.includes('aadhar') || updateError.code === '42703')) {
                console.warn("Database missing columns, retrying lead update with safe payload.", updateError.message);
                const { reference_number, created_by, assigned_by, pan_number, aadhar_number, ...dbLeadDataSafe } = dbLeadData as any;
                const retryRes = await (supabase.from('leads') as any).update(dbLeadDataSafe).eq('id', leadData.id);
                updateError = retryRes.error;
            }
        } catch (err: any) {
            updateError = err;
        }
        if (updateError) throw updateError;

        if (originalLead && originalLead.status !== leadData.status) {
            await addActivityToLead(leadData.id, {
                type: 'Status Change',
                content: `changed status from ${originalLead.status} to ${leadData.status}.`,
            }, profile);
        }
        if (leadData.assigned_to?.id && (!originalLead?.assigned_to || originalLead.assigned_to.id !== leadData.assigned_to.id)) {
            await addNotification({
                user_id: leadData.assigned_to.id,
                type: 'Lead Assigned',
                title: 'Lead Assigned',
                message: `You have been assigned the lead: ${leadData.business_name}.`,
                link: { page: 'Lead Detail', id: leadData.id }
            });
        }

        const shouldConvert = convertToCustomer || isChangingToSuccess;

        if (shouldConvert) {
            try {
                const { data: existingCustomer } = await supabase.from('customers').select('id').eq('lead_id', leadData.id).maybeSingle();
                
                let updatedLeadWithRef = { ...leadData };
                if (isChangingToSuccess) {
                    updatedLeadWithRef.status = 'Success';
                    updatedLeadWithRef.next_follow_up = undefined;
                }

                if (!updatedLeadWithRef.reference_number) {
                    const currentYear = new Date().getFullYear();
                    let seqVal = leads.length + 1;
                    try {
                        const { data: seqData, error: seqErr } = await (supabase as any).rpc('generate_next_payment_sequence', { payment_year: currentYear });
                        if (!seqErr && seqData) {
                            seqVal = seqData;
                        }
                    } catch (e) {
                        console.warn("RPC failed, using fallback:", e);
                    }
                    const refNum = `E-${String(seqVal).padStart(3, '0')}-${currentYear}`;
                    updatedLeadWithRef.reference_number = refNum;
                    try {
                        await (supabase.from('leads') as any).update({ reference_number: refNum }).eq('id', leadData.id);
                    } catch (e) {
                        console.warn("Could not save reference_number back to lead:", e);
                    }
                }

                const customerData = {
                    ...leadToCustomer(updatedLeadWithRef),
                    date_of_birth: dateOfBirth || null,
                    aadhar_number: aadharNumber || null
                };

                let paymentsList = updatedLeadWithRef.payments || [];
                if (paymentsList.length === 0 && updatedLeadWithRef.advance_amount && updatedLeadWithRef.advance_amount > 0) {
                    paymentsList = [{
                        id: Math.random().toString(36).substring(2, 15),
                        amount: updatedLeadWithRef.advance_amount,
                        received: updatedLeadWithRef.advance_amount,
                        date: new Date().toISOString(),
                        method: 'UPI',
                        notes: 'Auto-initialized advance payment upon success conversion',
                        receipt_number: updatedLeadWithRef.reference_number || `E-${String(leads.length + 1).padStart(3, '0')}-${new Date().getFullYear()}`
                    } as any];
                    
                    customerData.payment_details = {
                        total_payment: updatedLeadWithRef.total_payment,
                        payments: paymentsList
                    } as any;
                    customerData.paid_amount = updatedLeadWithRef.advance_amount;
                    customerData.due_amount = (updatedLeadWithRef.total_payment || 0) - updatedLeadWithRef.advance_amount;

                    try {
                        const autoAdvanceTotal = paymentsList.reduce((acc, curr) => acc + (Number((curr as any).received) || Number((curr as any).amount) || 0), 0);
                        await supabase.from('leads').update({
                            payments: paymentsList as any,
                            advance_amount: autoAdvanceTotal,
                            remaining_amount: Math.max(0, (Number(updatedLeadWithRef.total_payment) || 0) - autoAdvanceTotal)
                        }).eq('id', leadData.id);
                    } catch (e) {
                        console.warn("Could not sync initialized payments back to lead:", e);
                    }
                }

                let customerError: any = null;
                if (!existingCustomer) {
                    let { error } = await (supabase.from('customers') as any).insert([customerData]);
                    customerError = error;
                    if (customerError && (customerError.message.includes('reference_number') || customerError.message.includes('schema cache') || customerError.code === '42703')) {
                        console.warn("Database missing 'reference_number' column on customers, retrying customer insert without it.", customerError.message);
                        const { reference_number, ...customerDataWithoutRef } = customerData as any;
                        const retryRes = await (supabase.from('customers') as any).insert([customerDataWithoutRef]);
                        customerError = retryRes.error;
                    }
                } else {
                    let { error } = await supabase.from('customers').update(customerData).eq('id', existingCustomer.id);
                    customerError = error;
                    if (customerError && (customerError.message.includes('reference_number') || customerError.message.includes('schema cache') || customerError.code === '42703')) {
                        console.warn("Database missing 'reference_number' column on customers update, retrying without it.", customerError.message);
                        const { reference_number, ...customerDataWithoutRef } = customerData as any;
                        const retryRes = await supabase.from('customers').update(customerDataWithoutRef).eq('id', existingCustomer.id);
                        customerError = retryRes.error;
                    }
                }

                if (customerError) throw customerError;

                await addActivityToLead(leadData.id, {
                    type: 'Status Change',
                    content: 'completed the Success stage workflow and created the Customer profile.'
                }, profile);

                let notificationCustomerId = existingCustomer?.id;
                if (!notificationCustomerId) {
                    try {
                        const { data: createdCustomer } = await supabase.from('customers').select('id').eq('lead_id', leadData.id).maybeSingle();
                        notificationCustomerId = createdCustomer?.id;
                    } catch (e) {
                        console.warn('Could not fetch created customer ID for notification:', e);
                    }
                }

                await addNotification({
                    user_id: profile.id,
                    type: 'Status Updated',
                    title: 'Lead Converted to Customer',
                    message: `Customer profile for "${leadData.first_name} ${leadData.last_name}" has been successfully created.`,
                    link: { page: 'Customer Detail', id: notificationCustomerId || leadData.id }
                });

                await logUserActivity('Lead Converted', `Converted lead "${leadData.business_name}" to customer`);
                try {
                    await (supabase as any).from('audit_logs').insert([{
                        user_id: profile.id,
                        action: 'Lead Converted',
                        entity: 'Lead',
                        entity_id: leadData.id,
                        details: JSON.stringify({
                            business_name: leadData.business_name,
                            customer_name: `${leadData.first_name} ${leadData.last_name}`,
                            total_payment: leadData.total_payment
                        })
                    }]);
                } catch (e) {
                    console.warn("Could not insert to audit_logs:", e);
                }

            } catch (conversionError: any) {
                console.error("Critical error in customer conversion. Rolling back lead status.", conversionError);
                if (originalLead) {
                    const rollbackData = {
                        status: originalLead.status,
                        next_follow_up: originalLead.next_follow_up
                    };
                    await supabase.from('leads').update(rollbackData).eq('id', leadData.id);
                }
                throw conversionError;
            }
        }

        const isSuccess = leadData.status === 'Success';
        const totalAmount = Number(leadData.total_payment) || 0;
        const paidAmount = (leadData.payments || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const isPaid = paidAmount >= totalAmount && totalAmount > 0;

        const wasSuccess = originalLead?.status === 'Success';
        const prevTotal = Number(originalLead?.total_payment) || 0;
        const prevPaid = (originalLead?.payments || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const wasPaid = prevPaid >= prevTotal && prevTotal > 0;

        if ((isSuccess && isPaid) && (!wasSuccess || !wasPaid)) {
            const superAdmins = users.filter(u => u.role === 'Super Admin');
            console.log(`[Notification] Triggering 'Payment Completed' for ${superAdmins.length} Super Admins.`);

            for (const admin of superAdmins) {
                await addNotification({
                    user_id: admin.id,
                    type: 'Payment Completed',
                    title: 'Revenue Collected & Lead Closed',
                    message: `Lead "${leadData.business_name}" has been successfully closed and fully paid.`,
                    link: { page: 'Lead Detail', id: leadData.id }
                });
            }
        }

        await logUserActivity('Lead Updated', `Updated lead: ${leadData.business_name}. Status: ${leadData.status}`);
        if (setLeads) {
            setLeads(prev => prev.map(l => l.id === leadData.id ? { ...l, ...leadData } : l));
        }
        await fetchData();
    }, [profile, leads, setLeads, users, businessCategories, industryTypes, leadSources, addNotification, addActivityToLead, leadToCustomer, logUserActivity, fetchData]);

    const updateMultipleLeads = useCallback(async (leadIds: string[], updates: Partial<Omit<Lead, 'id'>>) => {
        const { assigned_to, ...rest } = updates;
        const dbUpdates: Partial<Database['public']['Tables']['leads']['Row']> = {
            ...rest,
            assigned_to: typeof assigned_to === 'object' && assigned_to !== null && 'id' in assigned_to ? (assigned_to as User).id : undefined,
        } as any;
        const { error } = await (supabase.from('leads') as any).update(dbUpdates).in('id', leadIds);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const deleteMultipleLeads = useCallback(async (leadIds: string[]) => {
        try {
            const { data, error } = await supabase.from('leads').delete().in('id', leadIds).select('id');
            if (error) {
                console.error('[Leads API] Delete lead error:', error);
                throw new Error(error.message || 'Permission denied or database error during deletion.');
            }
            if (!data || data.length === 0) {
                throw new Error('Permission denied: You do not have authorization to delete this lead.');
            }
            if (setLeads) {
                setLeads(prev => prev.filter(l => !leadIds.includes(l.id)));
            }
        } catch (err: any) {
            console.error('[Leads API] Failed to delete leads:', err);
            throw err;
        }
    }, [setLeads]);

    const fetchLeadsPaginated = useCallback(async (page: number, pageSize: number, filters: {
        status?: string;
        assignedTo?: string;
        branchId?: string;
    }) => {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        let query = supabase.from('leads').select('*', { count: 'exact' });
        
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
        if (filters.branchId) query = query.eq('branch_id', filters.branchId);
        
        const { data, count, error } = await query
          .order('created_at', { ascending: false })
          .range(from, to);
        
        if (error) throw error;
        return { data: (data as unknown) as Lead[], totalCount: count || 0, page, pageSize };

    }, []);

    return {
        addLead,
        updateLead,
        updateMultipleLeads,
        deleteMultipleLeads,
        fetchLeadsPaginated
    };
}
