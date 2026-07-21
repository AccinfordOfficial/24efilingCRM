import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { WorkOrder, WorkOrderNote } from '../../types';

export function useWorkOrdersApi(core: {
    fetchData: () => Promise<void>;
    logUserActivity: (action: string, details: string) => Promise<void>;
}) {
    const { fetchData, logUserActivity } = core;

    const addWorkOrder = useCallback(async (workOrderData: Omit<WorkOrder, 'id' | 'created_at' | 'updated_at' | 'reference_number'>) => {
        try {
            const { data, error } = await (supabase.from('work_orders' as any) as any).insert([workOrderData]).select().single();
            if (error) throw error;
            await logUserActivity('Work Order Created', `Created work order: ${data.reference_number || data.id}`);
            await fetchData();
            return data;
        } catch (e) {
            console.warn("DB insert failed for work order", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const updateWorkOrder = useCallback(async (id: string, workOrderData: Partial<WorkOrder>) => {
        try {
            const { error } = await (supabase.from('work_orders' as any) as any).update(workOrderData).eq('id', id);
            if (error) throw error;
            await logUserActivity('Work Order Updated', `Updated work order ID: ${id}`);
            await fetchData();
        } catch (e) {
            console.warn("DB update failed for work order", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const addWorkOrderNote = useCallback(async (noteData: Omit<WorkOrderNote, 'id' | 'created_at'>) => {
        try {
            const { data, error } = await (supabase.from('work_order_notes' as any) as any).insert([noteData]).select().single();
            if (error) throw error;
            await fetchData();
            return data;
        } catch (e) {
            console.warn("DB insert failed for work order note", e);
            throw e;
        }
    }, [fetchData]);

    return {
        addWorkOrder,
        updateWorkOrder,
        addWorkOrderNote
    };
}
