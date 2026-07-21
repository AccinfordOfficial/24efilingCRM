import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Activity, User } from '../../types';

export function useActivitiesApi() {
    const addActivityToLead = useCallback(async (leadId: string, activityData: Omit<Activity, 'id' | 'created_at' | 'user'>, user: User) => {
        try {
            const { error } = await (supabase.from('activities') as any).insert([{
                lead_id: leadId,
                user_id: user.id,
                ...activityData,
            }]);
            if (error) {
                console.warn("Failed to add activity due to database policies:", error.message);
            }
        } catch (err: any) {
            console.warn("Unexpected error adding activity:", err?.message || err);
        }
    }, []);

    return {
        addActivityToLead
    };
}
