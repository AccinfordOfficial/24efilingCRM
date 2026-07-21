import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Service, SubService } from '../../types';

export function useServicesApi(core: {
    profile: any;
    fetchData: () => Promise<void>;
}) {
    const { profile, fetchData } = core;

    const addService = useCallback(async (name: string) => {
        const { error } = await (supabase.from('services' as any) as any).insert([{ 
            name,
            branch_id: profile?.branch_id || null 
        }]);
        if (error) throw error;
        await fetchData();
    }, [profile, fetchData]);

    const updateService = useCallback(async (id: string, updates: Partial<Service>) => {
        const { error } = await (supabase.from('services' as any) as any).update(updates).eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const deleteService = useCallback(async (id: string) => {
        const { error } = await (supabase.from('services' as any) as any).delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const addSubService = useCallback(async (serviceId: string, subService: Omit<SubService, 'id' | 'created_at' | 'service_id'>) => {
        const { error } = await (supabase.from('sub_services' as any) as any).insert([{
            service_id: serviceId,
            branch_id: profile?.branch_id || null,
            ...subService
        }]);
        if (error) throw error;
        await fetchData();
    }, [profile, fetchData]);

    const updateSubService = useCallback(async (id: string, updates: Partial<SubService>) => {
        const { error } = await (supabase.from('sub_services' as any) as any).update(updates).eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const deleteSubService = useCallback(async (id: string) => {
        const { error } = await (supabase.from('sub_services' as any) as any).delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    return {
        addService,
        updateService,
        deleteService,
        addSubService,
        updateSubService,
        deleteSubService
    };
}
