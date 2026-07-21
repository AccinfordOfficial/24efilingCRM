import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Offer } from '../../types';

export function useOffersApi(core: {
    profile: any;
    fetchData: () => Promise<void>;
    logUserActivity: (action: string, details: string) => Promise<void>;
}) {
    const { profile, fetchData, logUserActivity } = core;

    const addOffer = useCallback(async (offerData: Omit<Offer, 'id' | 'created_at' | 'usage_count'>) => {
        if (!profile) throw new Error("User not authenticated");
        const payload = {
            ...offerData,
            created_by: profile.id,
            branch_id: profile.branch_id || null,
            usage_count: 0
        };
        const { error } = await (supabase.from('offers' as any) as any).insert([payload]);
        if (error) throw error;
        await logUserActivity('Offer Created', `Created promo offer: ${offerData.name}`);
        await fetchData();
    }, [profile, logUserActivity, fetchData]);

    const updateOffer = useCallback(async (id: string, updates: Partial<Offer>) => {
        const { error } = await (supabase.from('offers' as any) as any).update(updates).eq('id', id);
        if (error) throw error;
        await logUserActivity('Offer Updated', `Updated promo offer ID: ${id}`);
        await fetchData();
    }, [logUserActivity, fetchData]);

    const deleteOffer = useCallback(async (id: string) => {
        const { error } = await (supabase.from('offers' as any) as any).delete().eq('id', id);
        if (error) throw error;
        await logUserActivity('Offer Deleted', `Deleted promo offer ID: ${id}`);
        await fetchData();
    }, [logUserActivity, fetchData]);

    const incrementOfferUsage = useCallback(async (code: string) => {
        const { data: offerData, error: fetchErr } = await (supabase.from('offers' as any) as any).select('id, usage_count').eq('promo_code', code).maybeSingle();
        if (fetchErr || !offerData) return;

        const { error } = await (supabase.from('offers' as any) as any).update({
            usage_count: (offerData.usage_count || 0) + 1
        }).eq('id', offerData.id);

        if (error) console.error("Failed to increment offer usage count:", error);
        await fetchData();
    }, [fetchData]);

    return {
        addOffer,
        updateOffer,
        deleteOffer,
        incrementOfferUsage
    };
}
