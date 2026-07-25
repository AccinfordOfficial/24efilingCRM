import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { City } from '../../types';

export function useBranchesApi(core: {
    branches: any[];
    cities?: City[];
    fetchData: () => Promise<void>;
    logUserActivity: (action: string, details: string) => Promise<void>;
}) {
    const { branches, cities = [], fetchData, logUserActivity } = core;

    const uploadBranchLogo = useCallback(async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `branches/logo_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
        return publicUrl;
    }, []);

    const addCity = useCallback(async (cityName: string, stateName?: string, status: boolean = true) => {
        const trimmed = cityName.trim();
        const existing = (cities || []).find(c => (c.city_name || '').trim().toLowerCase() === trimmed.toLowerCase());
        if (existing) {
            throw new Error(`A city named "${trimmed}" already exists.`);
        }
        try {
            const cityCode = trimmed.substring(0, 3).toUpperCase() + '-' + Math.floor(Math.random() * 10000);
            const payload = {
                city_name: trimmed,
                city_code: cityCode,
                state: stateName || null,
                status
            };
            const { data, error } = await (supabase.from('cities') as any).insert([payload]).select().single();
            if (error) throw error;
            await logUserActivity('City Created', `Created city: ${trimmed}`);
            await fetchData();
            return data;
        } catch (e) {
            console.warn("DB insert failed for city", e);
            throw e;
        }
    }, [cities, fetchData, logUserActivity]);

    const updateCity = useCallback(async (id: string, updates: Partial<City>) => {
        try {
            const payload = {
                ...updates,
                updated_at: new Date().toISOString()
            };
            const { error } = await (supabase.from('cities') as any).update(payload).eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn("DB update failed for city", e);
            throw e;
        }
        await logUserActivity('City Updated', `Updated city ID: ${id}`);
        await fetchData();
    }, [logUserActivity, fetchData]);

    const deleteCity = useCallback(async (id: string) => {
        const targetCity = (cities || []).find(c => c.id === id);
        try {
            if (targetCity) {
                const { error } = await (supabase.from('cities') as any).delete().ilike('city_name', targetCity.city_name.trim());
                if (error) throw error;
            } else {
                const { error } = await (supabase.from('cities') as any).delete().eq('id', id);
                if (error) throw error;
            }
        } catch (e) {
            console.warn("DB delete failed for city", e);
            throw e;
        }
        await logUserActivity('City Deleted', `Deleted city ID: ${id}`);
        await fetchData();
    }, [cities, logUserActivity, fetchData]);

    const addBranch = useCallback(async (branch: Omit<any, 'id' | 'created_at' | 'updated_at'>) => {
        const managerId = branch.manager_id || null;
        const payload = {
            ...branch,
            manager_id: managerId
        };
        try {
            const { data: insertedBranch, error } = await (supabase.from('branches') as any)
                .insert([payload])
                .select()
                .single();
            if (error) throw error;

            if (managerId && insertedBranch?.id) {
                await (supabase.from('profiles') as any)
                    .update({ branch_id: insertedBranch.id })
                    .eq('id', managerId);
            }
        } catch (e) {
            console.warn("DB insert failed", e);
            throw e;
        }
        await logUserActivity('Branch Created', `Added new branch: ${(branch as any).name}`);
        await fetchData();
    }, [logUserActivity, fetchData]);

    const updateBranch = useCallback(async (id: string, updates: Partial<any>) => {
        try {
            const newManagerId = 'manager_id' in updates ? (updates.manager_id || null) : undefined;
            const payload = {
                ...updates,
                manager_id: newManagerId,
                updated_at: new Date().toISOString()
            };
            const { error } = await (supabase.from('branches') as any).update(payload).eq('id', id);
            if (error) throw error;

            if ('manager_id' in updates) {
                const oldBranch = branches.find((b: any) => b.id === id);
                const oldManagerId = oldBranch?.manager_id;

                if (oldManagerId && oldManagerId !== newManagerId) {
                    await (supabase.from('profiles') as any)
                        .update({ branch_id: null })
                        .eq('id', oldManagerId);
                }

                if (newManagerId) {
                    await (supabase.from('profiles') as any)
                        .update({ branch_id: id })
                        .eq('id', newManagerId);
                }
            }
        } catch (e) {
            console.warn("DB update failed", e);
            throw e;
        }
        await logUserActivity('Branch Updated', `Updated branch ID: ${id}`);
        await fetchData();
    }, [logUserActivity, fetchData, branches]);

    const deleteBranch = useCallback(async (id: string) => {
        try {
            const branchToRemove = branches.find((b: any) => b.id === id);
            if (branchToRemove?.manager_id) {
                await (supabase.from('profiles') as any)
                    .update({ branch_id: null })
                    .eq('id', branchToRemove.manager_id);
            }
            const { error } = await (supabase.from('branches') as any).delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn("DB delete failed", e);
            throw e;
        }
        await logUserActivity('Branch Deleted', `Deleted branch ID: ${id}`);
        await fetchData();
    }, [logUserActivity, fetchData, branches]);

    return {
        uploadBranchLogo,
        addCity,
        updateCity,
        deleteCity,
        addBranch,
        updateBranch,
        deleteBranch
    };
}
