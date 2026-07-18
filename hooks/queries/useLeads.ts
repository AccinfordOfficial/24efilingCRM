import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Lead } from '../../types';

export const useLeads = () => {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      let { data, error } = await supabase
        .from('leads')
        .select('*, assigner:profiles!leads_assigned_by_fkey(name, avatar_url), activities:activities!lead_id(id), documents:documents!lead_id(id), tasks:tasks!lead_id(id, is_completed, content, due_date, priority, created_by:tasks_created_by_fkey(name))')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error && error.message.includes('schema cache')) {
        console.warn('Schema cache miss on leads→profiles join. Falling back to plain leads fetch.', error.message);
        const fallback = await supabase
          .from('leads')
          .select('*, activities:activities!lead_id(id), documents:documents!lead_id(id), tasks:tasks!lead_id(id, is_completed, content, due_date, priority)')
          .order('created_at', { ascending: false })
          .limit(500);
        
        data = fallback.data as any;
        error = fallback.error;
      }

      if (error) throw new Error(error.message);
      return (data as unknown) as Lead[];
    },
  });
};

export const useLead = (leadId: string) => {
  return useQuery({
    queryKey: ['leads', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      let { data, error } = await supabase
        .from('leads')
        .select('*, assigner:profiles!leads_assigned_by_fkey(name, avatar_url), activities:activities!lead_id(id, content, created_by, created_at, created_by_name:profiles!activities_created_by_fkey(name, avatar_url)), documents:documents!lead_id(id, file_name, file_url, created_at, document_type, is_verified), tasks:tasks!lead_id(id, is_completed, content, due_date, priority, created_by:tasks_created_by_fkey(name, avatar_url))')
        .eq('id', leadId)
        .single();
        
      if (error && error.message.includes('schema cache')) {
         const fallback = await supabase
          .from('leads')
          .select('*, activities:activities!lead_id(*), documents:documents!lead_id(*), tasks:tasks!lead_id(*)')
          .eq('id', leadId)
          .single();
          data = fallback.data as any;
          error = fallback.error;
      }

      if (error) throw new Error(error.message);
      return (data as unknown) as Lead;
    },
    enabled: !!leadId,
  });
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newLead: Partial<Lead>) => {
      const { data, error } = await supabase.from('leads').insert([newLead as any]).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};

export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Lead> }) => {
      const { data, error } = await supabase.from('leads').update(updates as any).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads', data.id] });
    },
  });
};
