import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Lead } from '../../types';

export function useDocumentsApi(core: {
    leads: Lead[];
    fetchData: () => Promise<void>;
    logUserActivity: (action: string, details: string) => Promise<void>;
}) {
    const { leads, fetchData, logUserActivity } = core;

    const uploadDocument = useCallback(async (leadId: string, file: File, docType: string, uploaderId: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${leadId}/${docType}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
        const { error: dbError } = await (supabase.from('documents') as any).insert([{
            lead_id: leadId,
            name: file.name,
            type: docType,
            status: 'Pending',
            url: publicUrl,
        }]);
        if (dbError) throw dbError;
        await logUserActivity('Document Uploaded', `Uploaded ${docType} for lead ID: ${leadId}`);
        await fetchData();
    }, [fetchData, logUserActivity]);

    const deleteDocument = useCallback(async (leadId: string, docId: string) => {
        const docToDelete = leads.flatMap(l => l.documents || []).find(d => d.id === docId);
        if (docToDelete) {
            try {
                const urlParts = new URL(docToDelete.url);
                const filePath = urlParts.pathname.split('/documents/')[1];
                if (filePath) await supabase.storage.from('documents').remove([decodeURIComponent(filePath)]);
            } catch (e) {
                console.error("Could not parse URL to delete from storage:", docToDelete.url, e);
            }
        }
        const { error } = await supabase.from('documents').delete().eq('id', docId);
        if (error) throw error;
        await fetchData();
    }, [leads, fetchData]);

    const updateDocumentStatus = useCallback(async (leadId: string, docId: string, status: 'Approved' | 'Rejected', notes: string) => {
        const { error } = await (supabase.from('documents') as any).update({ status, verification_notes: notes }).eq('id', docId);
        if (error) throw error;
        await logUserActivity('Document Verification', `Marked document as ${status} for lead ID: ${leadId}`);
        await fetchData();
    }, [fetchData, logUserActivity]);

    return {
        uploadDocument,
        deleteDocument,
        updateDocumentStatus
    };
}
