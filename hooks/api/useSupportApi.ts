import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { SupportTicket, TicketComment, KnowledgeBaseArticle, EmployeeFeedback } from '../../types';

export function useSupportApi(core: {
    fetchData: () => Promise<void>;
    logUserActivity: (action: string, details: string) => Promise<void>;
}) {
    const { fetchData, logUserActivity } = core;

    const addSupportTicket = useCallback(async (ticketData: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const { data, error } = await (supabase.from('support_tickets' as any) as any).insert([ticketData]).select().single();
            if (error) throw error;
            await logUserActivity('Support Ticket Created', `Created support ticket: ${data.title}`);
            await fetchData();
            return data;
        } catch (e) {
            console.warn("DB insert failed for support ticket", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const updateSupportTicket = useCallback(async (id: string, ticketData: Partial<SupportTicket>) => {
        try {
            const { error } = await (supabase.from('support_tickets' as any) as any).update(ticketData).eq('id', id);
            if (error) throw error;
            await logUserActivity('Support Ticket Updated', `Updated ticket ID: ${id}`);
            await fetchData();
        } catch (e) {
            console.warn("DB update failed for support ticket", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const addTicketComment = useCallback(async (commentData: Omit<TicketComment, 'id' | 'created_at'>) => {
        try {
            const { data, error } = await (supabase.from('ticket_comments' as any) as any).insert([commentData]).select().single();
            if (error) throw error;
            await fetchData();
            return data;
        } catch (e) {
            console.warn("DB insert failed for ticket comment", e);
            throw e;
        }
    }, [fetchData]);

    const addKbArticle = useCallback(async (articleData: Omit<KnowledgeBaseArticle, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const { data, error } = await (supabase.from('knowledge_base' as any) as any).insert([articleData]).select().single();
            if (error) throw error;
            await logUserActivity('KB Article Created', `Created FAQ article: ${data.title}`);
            await fetchData();
            return data;
        } catch (e) {
            console.warn("DB insert failed for KB article", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const addEmployeeFeedback = useCallback(async (feedbackData: Omit<EmployeeFeedback, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const { data, error } = await (supabase.from('employee_feedback' as any) as any).insert([feedbackData]).select().single();
            if (error) throw error;
            await logUserActivity('Feedback Submitted', `Submitted feedback for employee ID: ${data.employee_id}`);
            await fetchData();
            return data;
        } catch (e) {
            console.warn("DB insert failed for feedback", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    const updateFeedbackStatus = useCallback(async (id: string, status: 'draft' | 'submitted' | 'acknowledged') => {
        try {
            const { error } = await (supabase.from('employee_feedback' as any) as any).update({ status }).eq('id', id);
            if (error) throw error;
            await logUserActivity('Feedback Status Updated', `Updated feedback ID: ${id} status to ${status}`);
            await fetchData();
        } catch (e) {
            console.warn("DB update failed for feedback status", e);
            throw e;
        }
    }, [logUserActivity, fetchData]);

    return {
        addSupportTicket,
        updateSupportTicket,
        addTicketComment,
        addKbArticle,
        addEmployeeFeedback,
        updateFeedbackStatus
    };
}
