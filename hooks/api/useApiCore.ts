import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

import { User, Lead, Customer, Notification, UserActivity, OrganizationSettings, Service, Offer, WebLead, Blog, Testimonial, City, TransferLog, Invoice, CompanyPolicy, Reminder, Announcement, SupportTicket, KnowledgeBaseArticle, EmployeeFeedback, WorkOrder, WhatsAppConversation, WhatsAppMessage, WhatsAppTemplate } from '../../types';
import { calculateLeadScore } from '../../lib/scoring';
import { defaultWebLeadsSeed, defaultBlogsSeed, defaultTestimonialsSeed } from './seeds';

export function useApiCore(options: { fetchOnMount?: boolean } = { fetchOnMount: true }) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(options.fetchOnMount);
    const [error, setError] = useState<string | null>(null);

    const [users, setUsers] = useState<User[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [branches, setBranches] = useState<any[]>([]); // Branch type
    const [cities, setCities] = useState<City[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
    const [settings, setSettings] = useState<OrganizationSettings | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [webLeads, setWebLeads] = useState<WebLead[]>([]);
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [transferLogs, setTransferLogs] = useState<TransferLog[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [businessCategories, setBusinessCategories] = useState<any[]>([]);
    const [industryTypes, setIndustryTypes] = useState<any[]>([]);
    const [leadSources, setLeadSources] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [companyPolicies, setCompanyPolicies] = useState<CompanyPolicy[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [kbArticles, setKbArticles] = useState<KnowledgeBaseArticle[]>([]);
    const [feedback, setFeedback] = useState<EmployeeFeedback[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [whatsappConversations, setWhatsappConversations] = useState<WhatsAppConversation[]>([]);
    const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessage[]>([]);
    const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);

    const hasLoaded = useRef(false);

    const fetchData = useCallback(async () => {
        // SWR (Stale-While-Revalidate) Logic
        if (!hasLoaded.current) {
            const cached = localStorage.getItem('crm_api_cache');
            if (cached) {
                try {
                    const d = JSON.parse(cached);
                    setUsers(d.users || []);
                    setLeads(d.leads || []);
                    setCustomers(d.customers || []);
                    setNotifications(d.notifications || []);
                    setUserActivities(d.userActivities || []);
                    setSettings(d.settings || null);
                    setServices(d.services || []);
                    setBranches(d.branches || []);
                    setCities(d.cities || []);
                    setOffers(d.offers || []);
                    setWebLeads(d.webLeads || []);
                    setBlogs(d.blogs || []);
                    setTestimonials(d.testimonials || []);
                    setInvoices(d.invoices || []);
                    setCompanyPolicies(d.companyPolicies || []);
                    setReminders(d.reminders || []);
                    setAnnouncements(d.announcements || []);
                    setTickets(d.tickets || []);
                    setKbArticles(d.kbArticles || []);
                    setFeedback(d.feedback || []);
                    setWorkOrders(d.workOrders || []);
                    setWhatsappConversations(d.whatsappConversations || []);
                    setWhatsappMessages(d.whatsappMessages || []);
                    setWhatsappTemplates(d.whatsappTemplates || []);
                    // If we have cache, show it immediately!
                    setLoading(false);
                } catch (e) {
                    console.warn("Failed to parse API cache", e);
                    setLoading(true);
                }
            } else if (options.fetchOnMount) {
                setLoading(true);
            }
        }

        setError(null);
        try {
            // PHASE 1: Fetch independent tables in parallel (no joins that rely on FK cache)
            const [
                { data: usersData, error: usersError },
                { data: notificationsData, error: notificationsError },
                { data: userActivitiesData, error: userActivitiesError },
                { data: settingsData, error: settingsError },
                { data: branchesData, error: branchesError },
                { data: citiesData, error: citiesError },
                { data: servicesData, error: servicesError },
                { data: subServicesData, error: subServicesError },
                { data: offersData, error: offersError },
                { data: categoriesData, error: categoriesError },
                { data: industriesData, error: industriesError },
                { data: leadSourcesData, error: leadSourcesError }
            ] = await Promise.all([
                supabase.from('profiles').select('*'),
                supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100),
                supabase.from('user_activities').select('*').order('timestamp', { ascending: false }).limit(100),
                (supabase.from('organization_settings' as any) as any).select('*').maybeSingle(),
                (supabase.from('branches' as any) as any).select('*').order('name', { ascending: true }),
                (supabase.from('cities' as any) as any).select('*').order('city_name', { ascending: true }),
                (supabase.from('services' as any) as any).select('*').order('name', { ascending: true }),
                (supabase.from('sub_services' as any) as any).select('*').order('name', { ascending: true }),
                (supabase.from('offers' as any) as any).select('*').order('created_at', { ascending: false }),
                (supabase.from('business_categories' as any) as any).select('*').order('name', { ascending: true }),
                (supabase.from('industry_types' as any) as any).select('*').order('name', { ascending: true }),
                (supabase.from('lead_sources' as any) as any).select('*').order('source_name', { ascending: true })
            ]);

            if (usersError) throw new Error(`Users: ${usersError.message}`);
            if (notificationsError) throw new Error(`Notifications: ${notificationsError.message}`);
            if (userActivitiesError) throw new Error(`Activities: ${userActivitiesError.message}`);

            let invoicesData: any[] | null = null;
            let policiesData: any[] | null = null;
            try {
                const res = await (supabase.from('invoices' as any) as any).select('*').order('created_at', { ascending: false });
                if (res.error) throw res.error;
                invoicesData = res.data;
            } catch (e) {
                console.warn("Invoices fetch failed (run SETUP_INVOICES_TABLE.sql if missing):", e);
            }

            try {
                const res = await (supabase.from('company_policies' as any) as any).select('*').order('created_at', { ascending: false });
                if (res.error) throw res.error;
                policiesData = res.data;
            } catch (e) {
                console.warn("Policies fetch failed (run SETUP_INVOICES_TABLE.sql if missing):", e);
            }

            let remindersData: any[] | null = null;
            let announcementsData: any[] | null = null;
            try {
                const res = await (supabase.from('reminders' as any) as any).select('*').order('due_date', { ascending: true });
                if (res.error) throw res.error;
                remindersData = res.data;
            } catch (e) {
                console.warn("Reminders fetch failed (run SETUP_REMINDERS_TABLE.sql if missing):", e);
            }

            try {
                const res = await (supabase.from('announcements' as any) as any).select('*').order('created_at', { ascending: false });
                if (res.error) throw res.error;
                
                let announcementsList = res.data || [];
                if (announcementsList.length > 0 && profile?.id) {
                    const readsRes = await (supabase.from('announcement_reads' as any) as any).select('announcement_id').eq('user_id', profile.id);
                    if (!readsRes.error && readsRes.data) {
                        const readIds = new Set(readsRes.data.map((r: any) => r.announcement_id));
                        announcementsList = announcementsList.map((ann: any) => ({
                            ...ann,
                            is_read: readIds.has(ann.id)
                        }));
                    }
                }
                announcementsData = announcementsList;
            } catch (e) {
                console.warn("Announcements fetch failed (run SETUP_ANNOUNCEMENTS_TABLE.sql if missing):", e);
            }

            let ticketsData: any[] | null = null;
            let kbArticlesData: any[] | null = null;
            let feedbackData: any[] | null = null;
            let workOrdersData: any[] | null = null;

            try {
                const res = await (supabase.from('support_tickets' as any) as any).select('*').order('created_at', { ascending: false });
                if (res.error) throw res.error;
                ticketsData = res.data;
            } catch (e) {
                console.warn("Support tickets fetch failed (run SETUP_SUPPORT_TICKETS_TABLE.sql if missing):", e);
            }

            try {
                const res = await (supabase.from('knowledge_base' as any) as any).select('*').order('created_at', { ascending: false });
                if (res.error) throw res.error;
                kbArticlesData = res.data;
            } catch (e) {
                console.warn("KB articles fetch failed:", e);
            }

            try {
                const res = await (supabase.from('employee_feedback' as any) as any).select('*').order('created_at', { ascending: false });
                if (res.error) throw res.error;
                feedbackData = res.data;
            } catch (e) {
                console.warn("Employee feedback fetch failed (run SETUP_FEEDBACK_TABLE.sql if missing):", e);
            }

            try {
                const res = await (supabase.from('work_orders' as any) as any).select('*').order('created_at', { ascending: false });
                if (res.error) throw res.error;
                workOrdersData = res.data;
            } catch (e) {
                console.warn("Work orders fetch failed (run SETUP_WORK_ORDERS_TABLE.sql if missing):", e);
            }

            let whatsappConversationsData: any[] | null = null;
            let whatsappMessagesData: any[] | null = null;
            let whatsappTemplatesData: any[] | null = null;

            try {
                const res = await (supabase.from('whatsapp_conversations' as any) as any).select('*').order('last_message_at', { ascending: false });
                if (res.error) throw res.error;
                whatsappConversationsData = res.data;
            } catch (e) {
                console.warn("whatsappConversations fetch failed (run SETUP_WHATSAPP_INTEGRATION.sql if missing):", e);
            }

            try {
                const res = await (supabase.from('whatsapp_messages' as any) as any).select('*').order('created_at', { ascending: true });
                if (res.error) throw res.error;
                whatsappMessagesData = res.data;
            } catch (e) {
                console.warn("whatsappMessages fetch failed:", e);
            }

            try {
                const res = await (supabase.from('whatsapp_templates' as any) as any).select('*').order('created_at', { ascending: false });
                if (res.error) throw res.error;
                whatsappTemplatesData = res.data;
            } catch (e) {
                console.warn("whatsappTemplates fetch failed:", e);
            }

            // PHASE 2: Fetch leads with FK joins
            let leadsData: any[] | null = null;
            const leadsWithJoin = await supabase.from('leads')
                .select('*, assigner:profiles!leads_assigned_by_fkey(name, avatar_url), activities:activities!lead_id(id), documents:documents!lead_id(id), tasks:tasks!lead_id(id, is_completed, content, due_date, priority, created_by:tasks_created_by_fkey(name))')
                .order('created_at', { ascending: false })
                .limit(500);

            if (leadsWithJoin.error) {
                console.warn('FK join failed on leads query, falling back to plain leads select:', leadsWithJoin.error.message);
                const fallback = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(500);
                leadsData = fallback.data || [];
            } else {
                leadsData = leadsWithJoin.data || [];
            }

            // PHASE 3: Fetch customers with FK joins
            let customersData: any[] | null = null;
            const customersWithJoin = await supabase.from('customers')
                .select('*, created_by:profiles!customers_created_by_fkey(*), assigned_to:profiles!customers_assigned_to_fkey(*), leads:leads!lead_id(id)')
                .limit(500);

            if (customersWithJoin.error) {
                console.warn('FK join failed on customers query, falling back to plain customers select:', customersWithJoin.error.message);
                const fallback = await supabase.from('customers').select('*').limit(500);
                customersData = fallback.data || [];
            } else {
                customersData = customersWithJoin.data || [];
            }

            if (categoriesData) setBusinessCategories(categoriesData);
            if (industriesData) setIndustryTypes(industriesData);
            if (leadSourcesData) setLeadSources(leadSourcesData);
            if (invoicesData) setInvoices(invoicesData as any[]);
            if (policiesData) setCompanyPolicies(policiesData as any[]);
            if (remindersData) setReminders(remindersData as any[]);
            if (announcementsData) setAnnouncements(announcementsData as any[]);
            if (ticketsData) setTickets(ticketsData as any[]);
            if (kbArticlesData) setKbArticles(kbArticlesData as any[]);
            if (feedbackData) setFeedback(feedbackData as any[]);
            if (workOrdersData) setWorkOrders(workOrdersData as any[]);
            if (whatsappConversationsData) setWhatsappConversations(whatsappConversationsData as any[]);
            if (whatsappMessagesData) setWhatsappMessages(whatsappMessagesData as any[]);
            if (whatsappTemplatesData) setWhatsappTemplates(whatsappTemplatesData as any[]);

            // Fetch Web Leads with LocalStorage fallback and seeds
            let webLeadsList: WebLead[] = [];
            try {
                const { data, error } = await (supabase.from('web_leads' as any) as any).select('*').order('created_at', { ascending: false });
                if (error) throw error;
                webLeadsList = (data as any[]) as WebLead[] || [];
            } catch (e) {
                console.warn("Web leads fetch failed, using local cache", e);
                const cached = localStorage.getItem('crm_web_leads');
                if (cached) {
                    webLeadsList = JSON.parse(cached);
                } else {
                    webLeadsList = defaultWebLeadsSeed;
                    localStorage.setItem('crm_web_leads', JSON.stringify(webLeadsList));
                }
            }
            setWebLeads(webLeadsList);

            // Fetch Blogs with LocalStorage fallback and seeds
            let blogsList: Blog[] = [];
            try {
                const { data, error } = await (supabase.from('blogs' as any) as any).select('*').order('created_at', { ascending: false });
                if (error) throw error;
                blogsList = (data as any[]) as Blog[] || [];
            } catch (e) {
                console.warn("Blogs fetch failed, using local cache", e);
                const cached = localStorage.getItem('crm_blogs');
                if (cached) {
                    blogsList = JSON.parse(cached);
                } else {
                    blogsList = defaultBlogsSeed;
                    localStorage.setItem('crm_blogs', JSON.stringify(blogsList));
                }
            }
            setBlogs(blogsList);

            // Fetch Testimonials with LocalStorage fallback and seeds
            let testimonialsList: Testimonial[] = [];
            try {
                const { data, error } = await (supabase.from('testimonials' as any) as any).select('*').order('created_at', { ascending: false });
                if (error) throw error;
                testimonialsList = (data as any[]) as Testimonial[] || [];
            } catch (e) {
                console.warn("Testimonials fetch failed, using local cache", e);
                const cached = localStorage.getItem('crm_testimonials');
                if (cached) {
                    testimonialsList = JSON.parse(cached);
                } else {
                    testimonialsList = defaultTestimonialsSeed;
                    localStorage.setItem('crm_testimonials', JSON.stringify(testimonialsList));
                }
            }
            setTestimonials(testimonialsList);

            const safeUsers = (usersData || []).map(user => ({
                ...(user as any as User),
                skills: Array.isArray((user as any).skills) ? (user as any).skills : [],
            }));
            setUsers(safeUsers as User[]);

            // CONSTRUCT LEADS WITH LIGHTWEIGHT DETAILS
            const leadsWithDetails = (leadsData || []).map(lead => {
                const rawLead = lead as any;
                const assignedUser = safeUsers.find(u => u.id === rawLead.assigned_to) || null;
                const activityCount = (rawLead.activities as any[]) || [];
                const documentCount = (rawLead.documents as any[]) || [];
                const tasksList = (rawLead.tasks as any[]) || [];

                const catObj = (categoriesData || []).find((c: any) => c.id === rawLead.business_category_id);
                const indObj = (industriesData || []).find((i: any) => i.id === rawLead.industry_type_id);
                const srcObj = (leadSourcesData || []).find((s: any) => s.id === rawLead.lead_source_id);
                
                const constructedLead = {
                    ...rawLead,
                    business_category: catObj ? catObj.name : 'Other',
                    industry_type: indObj ? indObj.name : 'Other',
                    source: srcObj ? srcObj.source_name : (rawLead.source || 'Other'),
                    assigned_to: assignedUser,
                    activities: activityCount,
                    documents: documentCount,
                    tasks: tasksList,
                };
                return {
                    ...constructedLead,
                    score: calculateLeadScore(constructedLead as unknown as Lead),
                };
            });

            setLeads(leadsWithDetails as unknown as Lead[]);

            let processedCustomers: Customer[] = [];
            if (customersData) {
                processedCustomers = customersData.map((c: any) => {
                    const { leads: relatedLeadData, ...rest } = c;
                    const uploaded_documents = (relatedLeadData && Array.isArray(relatedLeadData.documents)) ? relatedLeadData.documents : [];
                    const catObj = (categoriesData || []).find((cat: any) => cat.id === c.business_category_id);
                    const indObj = (industriesData || []).find((ind: any) => ind.id === c.industry_type_id);
                    const srcObj = (leadSourcesData || []).find((s: any) => s.id === c.lead_source_id);
                    return {
                        ...rest,
                        business_category: catObj ? catObj.name : 'Other',
                        industry_type: indObj ? indObj.name : 'Other',
                        source: srcObj ? srcObj.source_name : (c.lead_source || 'Other'),
                        documents: uploaded_documents
                    };
                });
            }
            setCustomers(processedCustomers);

            if (settingsData) setSettings(settingsData as OrganizationSettings);

            // Construct Services Catalog from sub-services
            if (servicesData) {
                const catalog = (servicesData as any[]).map((srv: any) => {
                    const subs = (subServicesData || []).filter((sub: any) => sub.service_id === srv.id);
                    return {
                        ...srv,
                        sub_services: subs
                    };
                });
                setServices(catalog);
            }
            if (citiesData) {
                const uniqueCities: City[] = [];
                const seen = new Set<string>();
                for (const c of (citiesData as City[])) {
                    const key = (c.city_name || '').trim().toLowerCase();
                    if (key && !seen.has(key)) {
                        seen.add(key);
                        uniqueCities.push(c);
                    }
                }
                setCities(uniqueCities);
            }
            if (offersData) setOffers(offersData as Offer[]);
            if (notificationsData) setNotifications(notificationsData as Notification[]);
            if (userActivitiesData) setUserActivities(userActivitiesData as UserActivity[]);

            // CACHE PERSISTENCE
            const cachePayload = {
                users: safeUsers,
                leads: leadsWithDetails,
                customers: processedCustomers,
                notifications: notificationsData || [],
                userActivities: userActivitiesData || [],
                settings: settingsData,
                services: servicesData ? (servicesData as any[]).map(s => ({
                    ...s,
                    sub_services: (subServicesData || []).filter((sub: any) => sub.service_id === s.id)
                })) : [],
                branches: branchesData || [],
                cities: citiesData || [],
                offers: offersData || [],
                webLeads: webLeadsList,
                blogs: blogsList,
                testimonials: testimonialsList,
                invoices: invoicesData || [],
                companyPolicies: policiesData || [],
                reminders: remindersData || [],
                announcements: announcementsData || [],
                tickets: ticketsData || [],
                kbArticles: kbArticlesData || [],
                feedback: feedbackData || [],
                workOrders: workOrdersData || [],
                whatsappConversations: whatsappConversationsData || [],
                whatsappMessages: whatsappMessagesData || [],
                whatsappTemplates: whatsappTemplatesData || []
            };

            const serialized = JSON.stringify(cachePayload);
            if (serialized.length < 4.5 * 1024 * 1024) {
                localStorage.setItem('crm_api_cache', serialized);
            } else {
                console.warn("API Cache payload exceeds 4.5MB quota limit, skipping LocalStorage cache write.");
            }

            hasLoaded.current = true;
        } catch (err: any) {
            console.error("API Parallel loader error:", err);
            setError(err.message || 'Unknown network error.');
        } finally {
            setLoading(false);
        }
    }, [profile?.id, options.fetchOnMount]);

    useEffect(() => {
        if (options.fetchOnMount && profile?.id) {
            fetchData();
        } else if (!profile) {
            setUsers([]);
            setLeads([]);
            setCustomers([]);
            setNotifications([]);
            setUserActivities([]);
            setSettings(null);
            setServices([]);
        }
    }, [fetchData, profile?.id, options.fetchOnMount]);

    useEffect(() => {
        const changes = supabase.channel('table-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(changes);
        };
    }, [fetchData]);

    const logUserActivity = useCallback(async (action: string, details: string) => {
        if (!profile) return;
        const { error } = await (supabase.from('user_activities') as any).insert([{
            user_id: profile.id,
            action,
            details,
        }]);
        if (error) console.error("Failed to log activity:", error);
    }, [profile]);

    const logAuditAction = useCallback(async (action: string, entity: string, entityId: string, details: any) => {
        if (!profile) return;
        try {
            await ((supabase as any).from('audit_logs')).insert([{
                user_id: profile.id,
                action,
                entity,
                entity_id: entityId,
                details
            }]);
        } catch (e) {
            console.error("Failed to log audit action:", e);
        }
    }, [profile]);

    return {
        profile,
        loading,
        setLoading,
        error,
        setError,
        users,
        setUsers,
        leads,
        setLeads,
        customers,
        setCustomers,
        branches,
        setBranches,
        cities,
        setCities,
        notifications,
        setNotifications,
        userActivities,
        setUserActivities,
        settings,
        setSettings,
        services,
        setServices,
        offers,
        setOffers,
        webLeads,
        setWebLeads,
        blogs,
        setBlogs,
        testimonials,
        setTestimonials,
        transferLogs,
        setTransferLogs,
        auditLogs,
        setAuditLogs,
        businessCategories,
        setBusinessCategories,
        industryTypes,
        setIndustryTypes,
        leadSources,
        setLeadSources,
        invoices,
        setInvoices,
        companyPolicies,
        setCompanyPolicies,
        reminders,
        setReminders,
        announcements,
        setAnnouncements,
        tickets,
        setTickets,
        kbArticles,
        setKbArticles,
        feedback,
        setFeedback,
        workOrders,
        setWorkOrders,
        whatsappConversations,
        setWhatsappConversations,
        whatsappMessages,
        setWhatsappMessages,
        whatsappTemplates,
        setWhatsappTemplates,
        documents: leads.flatMap(l => (l.documents || []).map(d => ({ ...d, lead_id: l.id }))),
        tasks: leads.flatMap(l => (l.tasks || []).map(t => ({ ...t, lead_id: l.id }))),
        fetchData,
        refreshData: fetchData,
        logUserActivity,
        logAuditAction
    };
}

