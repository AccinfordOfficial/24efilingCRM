import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { User, City } from '../../types';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw new Error(error.message);
      return data as User[];
    },
  });
};

export const useBranches = () => {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches' as any).select('*').order('name', { ascending: true });
      if (error) {
         console.warn("Branches fetch failed", error);
         return [];
      }
      return data;
    },
  });
};

export const useCities = () => {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cities' as any).select('*').order('city_name', { ascending: true });
      if (error) {
         console.warn("Cities fetch failed", error);
         return [];
      }
      return data as City[];
    },
  });
};
