import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { OrganizationSettings, CompanyPolicy, Reminder } from '../../types';

type SettingsPatch = Partial<OrganizationSettings> & {
    company_meta?: unknown;
    regional_settings?: unknown;
    lead_settings?: unknown;
    notification_rules?: unknown;
};

export function useSettingsApi(core: {
    settings: OrganizationSettings | null;
    fetchData: () => Promise<void>;
    logUserActivity: (action: string, details: string) => Promise<void>;
}) {
    const { settings, fetchData, logUserActivity } = core;

    const updateOrganizationSettings = useCallback(async (newSettings: SettingsPatch) => {
        if (!settings?.id) {
            const { error } = await (supabase.from('organization_settings' as any) as any).insert([newSettings]);
            if (error) throw error;
        } else {
            const { error } = await (supabase.from('organization_settings' as any) as any).update(newSettings).eq('id', settings.id);
            if (error) throw error;
        }
        await logUserActivity('Settings Updated', 'Updated organization settings.');
        await fetchData();
    }, [settings, fetchData, logUserActivity]);

    const addPolicy = useCallback(async (policyData: Omit<CompanyPolicy, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const { data, error } = await (supabase.from('company_policies' as any) as any).insert([policyData]).select().single();
            if (error) throw error;
            await logUserActivity('Policy Created', `Created company policy: ${data.name}`);
            await fetchData();
            return data;
        } catch (e) {
            console.warn("DB insert failed for policy", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const updatePolicy = useCallback(async (id: string, policyData: Partial<CompanyPolicy>) => {
        try {
            const { error } = await (supabase.from('company_policies' as any) as any).update(policyData).eq('id', id);
            if (error) throw error;
            await logUserActivity('Policy Updated', `Updated policy ID: ${id}`);
            await fetchData();
        } catch (e) {
            console.warn("DB update failed for policy", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const deletePolicy = useCallback(async (id: string) => {
        try {
            const { error } = await (supabase.from('company_policies' as any) as any).delete().eq('id', id);
            if (error) throw error;
            await logUserActivity('Policy Deleted', `Deleted policy ID: ${id}`);
            await fetchData();
        } catch (e) {
            console.warn("DB delete failed for policy", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const addReminder = useCallback(async (reminderData: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const { data, error } = await (supabase.from('reminders' as any) as any).insert([reminderData]).select().single();
            if (error) throw error;
            await logUserActivity('Reminder Created', `Created reminder: ${data.title}`);
            await fetchData();
            return data;
        } catch (e) {
            console.warn("DB insert failed for reminder", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const updateReminder = useCallback(async (id: string, reminderData: Partial<Reminder>) => {
        try {
            const { error } = await (supabase.from('reminders' as any) as any).update(reminderData).eq('id', id);
            if (error) throw error;
            await logUserActivity('Reminder Updated', `Updated reminder ID: ${id}`);
            await fetchData();
        } catch (e) {
            console.warn("DB update failed for reminder", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const deleteReminder = useCallback(async (id: string) => {
        try {
            const { error } = await (supabase.from('reminders' as any) as any).delete().eq('id', id);
            if (error) throw error;
            await logUserActivity('Reminder Deleted', `Deleted reminder ID: ${id}`);
            await fetchData();
        } catch (e) {
            console.warn("DB delete failed for reminder", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    return {
        updateOrganizationSettings,
        addPolicy,
        updatePolicy,
        deletePolicy,
        addReminder,
        updateReminder,
        deleteReminder
    };
}
