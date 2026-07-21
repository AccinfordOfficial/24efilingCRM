import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { WhatsAppTemplate } from '../../types';

export function useWhatsAppApi(core: {
    fetchData: () => Promise<void>;
}) {
    const { fetchData } = core;

    const sendWhatsAppMessage = useCallback(async (conversationId: string, content: string, templateName?: string) => {
        try {
            const { data, error } = await (supabase.from('whatsapp_messages' as any) as any).insert([{
                conversation_id: conversationId,
                direction: 'outbound',
                content,
                message_type: templateName ? 'template' : 'text',
                template_name: templateName || null,
                status: 'sent'
            }]).select().single();
            if (error) throw error;

            await (supabase.from('whatsapp_conversations' as any) as any).update({
                last_message_at: new Date().toISOString(),
                unread_count: 0
            }).eq('id', conversationId);

            await fetchData();
            return data;
        } catch (e) {
            console.warn("WhatsApp message send failed", e);
            throw e;
        }
    }, [fetchData]);

    const addWhatsAppTemplate = useCallback(async (templateData: Omit<WhatsAppTemplate, 'id' | 'created_at'>) => {
        try {
            const { data, error } = await (supabase.from('whatsapp_templates' as any) as any).insert([templateData]).select().single();
            if (error) throw error;
            await fetchData();
            return data;
        } catch (e) {
            console.warn("WhatsApp template insertion failed", e);
            throw e;
        }
    }, [fetchData]);

    const syncWhatsAppConversations = useCallback(async () => {
        await fetchData();
    }, [fetchData]);

    return {
        sendWhatsAppMessage,
        addWhatsAppTemplate,
        syncWhatsAppConversations
    };
}
