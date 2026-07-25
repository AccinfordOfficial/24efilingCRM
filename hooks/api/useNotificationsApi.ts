import React, { useCallback, Dispatch, SetStateAction } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Notification, Announcement } from '../../types';

export function useNotificationsApi(core: {
    profile: any;
    setNotifications?: Dispatch<SetStateAction<Notification[]>>;
    fetchData: () => Promise<void>;
    logUserActivity: (action: string, details: string) => Promise<void>;
}) {
    const { profile, setNotifications, fetchData, logUserActivity } = core;

    const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'created_at' | 'is_read'>) => {
        const payload: any = {
            ...notificationData,
            is_read: false,
            link: notificationData.link as any,
            created_at: new Date().toISOString()
        };

        if (setNotifications) {
            const tempId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            setNotifications(prev => [{ ...payload, id: tempId }, ...prev]);
        }

        try {
            const { error } = await (supabase.from('notifications') as any).insert([payload]);
            if (error) console.warn("Could not insert notification into DB:", error.message);
        } catch (e) {
            console.warn("Exception inserting notification into DB:", e);
        }
        await fetchData();
    }, [setNotifications, fetchData]);

    const markNotificationsAsRead = useCallback(async (userId: string) => {
        const { error } = await (supabase.from('notifications') as any).update({ is_read: true }).eq('user_id', userId);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const addAnnouncement = useCallback(async (announcementData: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const { data, error } = await (supabase.from('announcements' as any) as any).insert([announcementData]).select().single();
            if (error) throw error;
            await logUserActivity('Announcement Created', `Created announcement: ${data.title}`);
            await fetchData();
            return data;
        } catch (e) {
            console.warn("DB insert failed for announcement", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const deleteAnnouncement = useCallback(async (id: string) => {
        try {
            const { error } = await (supabase.from('announcements' as any) as any).delete().eq('id', id);
            if (error) throw error;
            await logUserActivity('Announcement Deleted', `Deleted announcement ID: ${id}`);
            await fetchData();
        } catch (e) {
            console.warn("DB delete failed for announcement", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const markAnnouncementAsRead = useCallback(async (id: string) => {
        if (!profile) return;
        try {
            const { error } = await (supabase.from('announcement_reads' as any) as any).insert([{ announcement_id: id, user_id: profile.id }]);
            if (error && error.code !== '23505') throw error;
            await fetchData();
        } catch (e) {
            console.warn("DB insert failed for announcement read", e);
        }
    }, [profile, fetchData]);

    return {
        addNotification,
        markNotificationsAsRead,
        addAnnouncement,
        deleteAnnouncement,
        markAnnouncementAsRead
    };
}
