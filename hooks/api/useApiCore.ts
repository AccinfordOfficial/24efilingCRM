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

    const CACHE_KEY = profile?.id ? `crm_api_cache_v2_${profile.id}` : 'crm_api_cache_v2_anon';

    const fetchData = useCallback(async () => {
        // SWR (Stale-While-Revalidate) Logic
        if (!hasLoaded.current) {
            const cached = localStorage.getItem(CACHE_KEY);
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
                    setBusinessCategories(d.businessCategories || []);
                    setIndustryTypes(d.industryTypes || []);
                    setLeadSources(d.leadSources || []);
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
            // ALL TABLES FETCHED CONCURRENTLY IN A SINGLE PARALLEL BATCH FOR INSTANT LOAD (<300ms)
            const [
                usersRes,
                leadsRes,
                customersRes,
                notificationsRes,
                userActivitiesRes,
                settingsRes,
                branchesRes,
                citiesRes,
                servicesRes,
                subServicesRes,
                offersRes,
                categoriesRes,
                industriesRes,
                leadSourcesRes,
                invoicesRes,
                policiesRes,
                remindersRes,
                announcementsRes,
                ticketsRes,
                kbRes,
                feedbackRes,
                workOrdersRes,
                waConvsRes,
                waMsgsRes,
                waTplsRes,
                webLeadsRes,
                blogsRes,
                testimonialsRes
            ] = await Promise.allSettled([
                supabase.from('profiles').select('*'),
                supabase.from('leads').select('*').order('created_at', { ascending: false }),
                supabase.from('customers').select('*').order('created_at', { ascending: false }),
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
                (supabase.from('lead_sources' as any) as any).select('*').order('source_name', { ascending: true }),
                (supabase.from('invoices' as any) as any).select('*').order('created_at', { ascending: false }),
                (supabase.from('company_policies' as any) as any).select('*').order('created_at', { ascending: false }),
                (supabase.from('reminders' as any) as any).select('*').order('due_date', { ascending: true }),
                (supabase.from('announcements' as any) as any).select('*').order('created_at', { ascending: false }),
                (supabase.from('support_tickets' as any) as any).select('*').order('created_at', { ascending: false }),
                (supabase.from('knowledge_base' as any) as any).select('*').order('created_at', { ascending: false }),
                (supabase.from('employee_feedback' as any) as any).select('*').order('created_at', { ascending: false }),
                (supabase.from('work_orders' as any) as any).select('*').order('created_at', { ascending: false }),
                (supabase.from('whatsapp_conversations' as any) as any).select('*').order('last_message_at', { ascending: false }),
                (supabase.from('whatsapp_messages' as any) as any).select('*').order('created_at', { ascending: true }),
                (supabase.from('whatsapp_templates' as any) as any).select('*').order('created_at', { ascending: false }),
                (supabase.from('web_leads' as any) as any).select('*').order('created_at', { ascending: false }),
                (supabase.from('blogs' as any) as any).select('*').order('created_at', { ascending: false }),
                (supabase.from('testimonials' as any) as any).select('*').order('created_at', { ascending: false }),
            ]);

            const getVal = (res: PromiseSettledResult<any>) => res.status === 'fulfilled' && !res.value?.error ? res.value.data : null;

            const usersData = getVal(usersRes);
            const leadsData = getVal(leadsRes);
            const customersData = getVal(customersRes);
            const notificationsData = getVal(notificationsRes);
            const userActivitiesData = getVal(userActivitiesRes);
            const settingsData = getVal(settingsRes);
            const branchesData = getVal(branchesRes);
            const citiesData = getVal(citiesRes);
            const servicesData = getVal(servicesRes);
            const subServicesData = getVal(subServicesRes);
            const offersData = getVal(offersRes);
            const categoriesData = getVal(categoriesRes);
            const industriesData = getVal(industriesRes);
            const leadSourcesData = getVal(leadSourcesRes);
            const invoicesData = getVal(invoicesRes);
            const policiesData = getVal(policiesRes);
            const remindersData = getVal(remindersRes);
            const announcementsData = getVal(announcementsRes);
            const ticketsData = getVal(ticketsRes);
            const kbArticlesData = getVal(kbRes);
            const feedbackData = getVal(feedbackRes);
            const workOrdersData = getVal(workOrdersRes);
            const whatsappConversationsData = getVal(waConvsRes);
            const whatsappMessagesData = getVal(waMsgsRes);
            const whatsappTemplatesData = getVal(waTplsRes);

            let webLeadsList: WebLead[] = getVal(webLeadsRes) || [];
            if (webLeadsList.length === 0) {
                const cached = localStorage.getItem('crm_web_leads');
                webLeadsList = cached ? JSON.parse(cached) : defaultWebLeadsSeed;
            }
            setWebLeads(webLeadsList);

            let blogsList: Blog[] = getVal(blogsRes) || [];
            if (blogsList.length === 0) {
                const cached = localStorage.getItem('crm_blogs');
                blogsList = cached ? JSON.parse(cached) : defaultBlogsSeed;
            }
            setBlogs(blogsList);

            let testimonialsList: Testimonial[] = getVal(testimonialsRes) || [];
            if (testimonialsList.length === 0) {
                const cached = localStorage.getItem('crm_testimonials');
                testimonialsList = cached ? JSON.parse(cached) : defaultTestimonialsSeed;
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
                    const assignedUser = safeUsers.find(u => u.id === c.assigned_to) || null;
                    const createdUser = safeUsers.find(u => u.id === c.created_by) || null;
                    return {
                        ...rest,
                        business_category: catObj ? catObj.name : 'Other',
                        industry_type: indObj ? indObj.name : 'Other',
                        source: srcObj ? srcObj.source_name : (c.lead_source || 'Other'),
                        assigned_to: assignedUser,
                        created_by: createdUser,
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
            
            if (categoriesData) setBusinessCategories(categoriesData);
            if (industriesData) setIndustryTypes(industriesData);
            if (leadSourcesData) setLeadSources(leadSourcesData);


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
                businessCategories: categoriesData || [],
                industryTypes: industriesData || [],
                leadSources: leadSourcesData || [],
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
                localStorage.setItem(CACHE_KEY, serialized);
            } else {
                console.warn("API Cache payload exceeds 4.5MB quota limit, skipping LocalStorage cache write.");
            }

            try {
                localStorage.removeItem('crm_api_cache');
            } catch (e) {
                console.warn("Failed to remove legacy API cache:", e);
            }

            hasLoaded.current = true;
        } catch (err: any) {
            console.error("API Parallel loader error:", err);
            setError(err.message || 'Unknown network error.');
        } finally {
            setLoading(false);
        }
    }, [profile?.id, options.fetchOnMount, CACHE_KEY]);

    useEffect(() => {
        hasLoaded.current = false;
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

