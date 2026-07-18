import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { WebLead, Blog, Testimonial } from '../../types';

export const useWebLeads = () => {
  return useQuery({
    queryKey: ['webLeads'],
    queryFn: async () => {
      const { data, error } = await supabase.from('web_leads' as any).select('*').order('created_at', { ascending: false });
      if (error) {
        console.warn("Web Leads fetch failed", error);
        return [];
      }
      return data as WebLead[];
    },
  });
};

export const useBlogs = () => {
  return useQuery({
    queryKey: ['blogs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blogs' as any).select('*').order('created_at', { ascending: false });
      if (error) {
        console.warn("Blogs fetch failed", error);
        return [];
      }
      return data as Blog[];
    },
  });
};

export const useTestimonials = () => {
  return useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('testimonials' as any).select('*').order('created_at', { ascending: false });
      if (error) {
        console.warn("Testimonials fetch failed", error);
        return [];
      }
      return data as Testimonial[];
    },
  });
};
