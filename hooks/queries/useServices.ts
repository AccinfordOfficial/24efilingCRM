import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Service, Offer } from '../../types';

export const useServices = () => {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services' as any).select('*').order('name', { ascending: true });
      if (error) {
        console.warn("Services fetch failed", error);
        return [];
      }
      return data as Service[];
    },
  });
};

export const useSubServices = () => {
  return useQuery({
    queryKey: ['sub_services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sub_services' as any).select('*').order('name', { ascending: true });
      if (error) {
        console.warn("SubServices fetch failed", error);
        return [];
      }
      return data;
    },
  });
};

export const useOffers = () => {
  return useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('offers' as any).select('*').order('created_at', { ascending: false });
      if (error) {
        console.warn("Offers fetch failed", error);
        return [];
      }
      return data as Offer[];
    },
  });
};
