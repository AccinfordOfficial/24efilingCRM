import React, { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { WebLead, Blog, Testimonial, User, Lead } from '../../types';


export function useWebApi(core: {
    users: User[];
    webLeads: WebLead[];
    blogs: Blog[];
    testimonials: Testimonial[];
    addLead: (lead: Omit<Lead, 'id' | 'last_contacted'>) => Promise<any>;
    fetchData: () => Promise<void>;
    logUserActivity: (action: string, details: string) => Promise<void>;
    setWebLeads: React.Dispatch<React.SetStateAction<WebLead[]>>;
    setBlogs: React.Dispatch<React.SetStateAction<Blog[]>>;
    setTestimonials: React.Dispatch<React.SetStateAction<Testimonial[]>>;
}) {
    const { users, webLeads, blogs, testimonials, addLead, fetchData, logUserActivity, setWebLeads, setBlogs, setTestimonials } = core;

    const addWebLead = useCallback(async (payload: Omit<WebLead, 'id' | 'created_at'>) => {
        const newLead: WebLead = {
            ...payload,
            id: `web-lead-${Date.now()}`,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await (supabase.from('web_leads' as any) as any).insert([newLead]);
            if (error) throw error;
        } catch (e) {
            console.warn("DB insert failed, fallback to local storage", e);
            const list = [...webLeads, newLead];
            setWebLeads(list);
            localStorage.setItem('crm_web_leads', JSON.stringify(list));
        }
        await logUserActivity('Web Lead Created', `Organic lead created: ${payload.name}`);
        await fetchData();
    }, [webLeads, logUserActivity, fetchData, setWebLeads]);

    const updateWebLeadStatus = useCallback(async (id: string, status: WebLead['status']) => {
        try {
            const { error } = await (supabase.from('web_leads' as any) as any).update({ status }).eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn("DB update failed, fallback to local storage", e);
            const list = webLeads.map(l => l.id === id ? { ...l, status } : l);
            setWebLeads(list);
            localStorage.setItem('crm_web_leads', JSON.stringify(list));
        }
        await logUserActivity('Web Lead Updated', `Updated web lead ID: ${id} to ${status}`);
        await fetchData();
    }, [webLeads, logUserActivity, fetchData, setWebLeads]);

    const assignWebLead = useCallback(async (id: string, assignedToId: string | null) => {
        try {
            const { error } = await (supabase.from('web_leads' as any) as any).update({ assigned_to: assignedToId }).eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn("DB update failed, fallback to local storage", e);
            const list = webLeads.map(l => l.id === id ? { ...l, assigned_to: assignedToId || undefined } : l);
            setWebLeads(list);
            localStorage.setItem('crm_web_leads', JSON.stringify(list));
        }
        await logUserActivity('Web Lead Assigned', `Assigned web lead ID: ${id} to ${assignedToId || 'Unassigned'}`);
        await fetchData();
    }, [webLeads, logUserActivity, fetchData, setWebLeads]);

    const updateWebLead = useCallback(async (id: string, updates: Partial<WebLead>) => {
        try {
            const { error } = await (supabase.from('web_leads' as any) as any).update(updates).eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn("DB update failed, fallback to local storage", e);
            const list = webLeads.map(l => l.id === id ? { ...l, ...updates } : l);
            setWebLeads(list);
            localStorage.setItem('crm_web_leads', JSON.stringify(list));
        }
        await logUserActivity('Web Lead Updated', `Updated web lead ID: ${id}`);
        await fetchData();
    }, [webLeads, logUserActivity, fetchData, setWebLeads]);

    const deleteMultipleWebLeads = useCallback(async (ids: string[]) => {
        try {
            const { error } = await (supabase.from('web_leads' as any) as any).delete().in('id', ids);
            if (error) throw error;
        } catch (e) {
            console.warn("DB delete failed, fallback to local storage", e);
            const list = webLeads.filter(l => !ids.includes(l.id));
            setWebLeads(list);
            localStorage.setItem('crm_web_leads', JSON.stringify(list));
        }
        await logUserActivity('Web Leads Deleted', `Deleted ${ids.length} website inquiries`);
        await fetchData();
    }, [webLeads, logUserActivity, fetchData, setWebLeads]);

    const convertWebLeadToCrmLead = useCallback(async (webLeadId: string, assignedToId: string | null) => {
        const webLead = webLeads.find(l => l.id === webLeadId);
        if (!webLead) throw new Error("Web lead not found");

        const nameParts = webLead.name.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const assignedUser = users.find(u => u.id === assignedToId) || null;

        const newLeadPayload: Omit<Lead, 'id' | 'last_contacted'> = {
            business_name: `${webLead.name}'s Web Query`,
            first_name: firstName,
            last_name: lastName,
            email: webLead.email,
            phone_number: webLead.phone,
            service_requested: webLead.service_interested || 'General Inquiry',
            status: 'New Lead',
            priority: 'Warm',
            assigned_to: assignedUser || undefined,
            source: 'Organic Website Inquiry',
            notes: webLead.message || '',
            created_at: new Date().toISOString(),
            total_payment: 0,
            advance_amount: 0,
            remaining_amount: 0,
            payments: [],
            documents: [],
            activities: [],
            tasks: [],
            service_sets: []
        };

        await addLead(newLeadPayload);

        try {
            const { error } = await (supabase.from('web_leads' as any) as any).update({
                status: 'Converted',
                assigned_to: assignedToId
            }).eq('id', webLeadId);
            if (error) throw error;
        } catch (e) {
            console.warn("DB update failed, fallback to local storage", e);
            const list = webLeads.map(l => l.id === webLeadId ? { ...l, status: 'Converted' as const, assigned_to: assignedToId || undefined } : l);
            setWebLeads(list);
            localStorage.setItem('crm_web_leads', JSON.stringify(list));
        }

        await logUserActivity('Web Lead Converted', `Converted website query for ${webLead.name} into active CRM Lead`);
        await fetchData();
    }, [webLeads, users, addLead, logUserActivity, fetchData, setWebLeads]);

    const addBlog = useCallback(async (payload: Omit<Blog, 'id' | 'created_at' | 'updated_at'>) => {
        const newBlog: Blog = {
            ...payload,
            id: `blog-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            const { error } = await (supabase.from('blogs' as any) as any).insert([newBlog]);
            if (error) throw error;
        } catch (e) {
            console.warn("DB insert failed, fallback to local storage", e);
            const list = [...blogs, newBlog];
            setBlogs(list);
            localStorage.setItem('crm_blogs', JSON.stringify(list));
        }
        await logUserActivity('Blog Created', `Created blog post: ${payload.title}`);
        await fetchData();
    }, [blogs, logUserActivity, fetchData, setBlogs]);

    const updateBlog = useCallback(async (id: string, updates: Partial<Blog>) => {
        try {
            const { error } = await (supabase.from('blogs' as any) as any).update({
                ...updates,
                updated_at: new Date().toISOString()
            }).eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn("DB update failed, fallback to local storage", e);
            const list = blogs.map(b => b.id === id ? { ...b, ...updates, updated_at: new Date().toISOString() } : b);
            setBlogs(list);
            localStorage.setItem('crm_blogs', JSON.stringify(list));
        }
        await logUserActivity('Blog Updated', `Updated blog post ID: ${id}`);
        await fetchData();
    }, [blogs, logUserActivity, fetchData, setBlogs]);

    const deleteBlog = useCallback(async (id: string) => {
        try {
            const { error } = await (supabase.from('blogs' as any) as any).delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn("DB delete failed, fallback to local storage", e);
            const list = blogs.filter(b => b.id !== id);
            setBlogs(list);
            localStorage.setItem('crm_blogs', JSON.stringify(list));
        }
        await logUserActivity('Blog Deleted', `Deleted blog post ID: ${id}`);
        await fetchData();
    }, [blogs, logUserActivity, fetchData, setBlogs]);

    const addTestimonial = useCallback(async (payload: Omit<Testimonial, 'id' | 'created_at'>) => {
        const newTestimonial: Testimonial = {
            ...payload,
            id: `testimonial-${Date.now()}`,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await (supabase.from('testimonials' as any) as any).insert([newTestimonial]);
            if (error) throw error;
        } catch (e) {
            console.warn("DB insert failed, fallback to local storage", e);
            const list = [...testimonials, newTestimonial];
            setTestimonials(list);
            localStorage.setItem('crm_testimonials', JSON.stringify(list));
        }
        await logUserActivity('Testimonial Created', `Added review from ${payload.client_name}`);
        await fetchData();
    }, [testimonials, logUserActivity, fetchData, setTestimonials]);

    const updateTestimonialStatus = useCallback(async (id: string, status: Testimonial['status']) => {
        try {
            const { error } = await (supabase.from('testimonials' as any) as any).update({ status }).eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn("DB update failed, fallback to local storage", e);
            const list = testimonials.map(t => t.id === id ? { ...t, status } : t);
            setTestimonials(list);
            localStorage.setItem('crm_testimonials', JSON.stringify(list));
        }
        await logUserActivity('Testimonial Updated', `Updated review status of ID: ${id} to ${status}`);
        await fetchData();
    }, [testimonials, logUserActivity, fetchData, setTestimonials]);

    const deleteTestimonial = useCallback(async (id: string) => {
        try {
            const { error } = await (supabase.from('testimonials' as any) as any).delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn("DB delete failed, fallback to local storage", e);
            const list = testimonials.filter(t => t.id !== id);
            setTestimonials(list);
            localStorage.setItem('crm_testimonials', JSON.stringify(list));
        }
        await logUserActivity('Testimonial Deleted', `Deleted testimonial ID: ${id}`);
        await fetchData();
    }, [testimonials, logUserActivity, fetchData, setTestimonials]);

    return {
        addWebLead,
        updateWebLeadStatus,
        assignWebLead,
        updateWebLead,
        deleteMultipleWebLeads,
        convertWebLeadToCrmLead,
        addBlog,
        updateBlog,
        deleteBlog,
        addTestimonial,
        updateTestimonialStatus,
        deleteTestimonial
    };
}
