import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { User, Lead, Activity, Document, Customer, Notification, UserActivity, Task, OrganizationSettings, Service, SubService, Offer, WebLead, Blog, Testimonial, Payment, City, TransferLog, Invoice, CompanyPolicy, Reminder, Announcement } from '../types';
import { Database, Json } from '../lib/supabaseClient';
import { calculateLeadScore } from '../lib/scoring';

const defaultWebLeadsSeed: WebLead[] = [
  {
    id: '8e71c000-0000-0000-0000-000000000001',
    name: 'Sandeep',
    email: 'arcpalliishobha13@gmail.com',
    phone: '+91 9876543210',
    service_interested: 'registrations - udyam-registration',
    message: 'Inquiry submitted for registrations - udyam-registration.',
    status: 'Pending',
    created_at: '2026-05-31T09:00:00.000Z'
  },
  {
    id: 'add23000-0000-0000-0000-000000000002',
    name: 'Santhosh',
    email: 'nanisri.3179@gmail.com',
    phone: '+91 8765432109',
    service_interested: 'startup',
    message: 'Inquiry submitted for startup.',
    status: 'Pending',
    created_at: '2026-05-30T09:00:00.000Z'
  },
  {
    id: '7038c000-0000-0000-0000-000000000003',
    name: 'Rohith',
    email: 'rohithmeshram4@gmail.com',
    phone: '+91 7654321098',
    service_interested: 'startup - private-limited',
    message: 'Inquiry submitted for startup - private-limited.',
    status: 'Pending',
    created_at: '2026-05-28T09:00:00.000Z'
  },
  {
    id: 'd5461000-0000-0000-0000-000000000004',
    name: 'asilu rebba',
    email: 'becozr@gmail.com',
    phone: '+91 6543210987',
    service_interested: 'gst - gst-return-filing',
    message: 'Inquiry submitted for gst - gst-return-filing.',
    status: 'Pending',
    created_at: '2026-05-19T09:00:00.000Z'
  },
  {
    id: 'ad0b4000-0000-0000-0000-000000000005',
    name: 'asilu rebba',
    email: 'becozr@gmail.com',
    phone: '+91 5432109876',
    service_interested: 'gst',
    message: 'Inquiry submitted for gst.',
    status: 'Pending',
    created_at: '2026-05-19T09:00:00.000Z'
  },
  {
    id: 'b8029000-0000-0000-0000-000000000006',
    name: 'Pacha Ravikumar',
    email: 'ravi.nbk@gmail.com',
    phone: '+91 4321098765',
    service_interested: 'registrations - fssai registration',
    message: 'Inquiry submitted for registrations - fssai registration.',
    status: 'Pending',
    created_at: '2026-04-28T09:00:00.000Z'
  }
];

const defaultBlogsSeed: Blog[] = [
  {
    id: 'blog-1',
    title: 'Mastering GST Registrations in 2026: A Step-by-Step Guide',
    slug: 'mastering-gst-registrations-2026',
    content: 'GST registration is a crucial compliance requirement for businesses whose turnover exceeds the prescribed threshold limits. In this article, we explain the step-by-step registration process, document requirements, and common pitfalls to avoid when filing your application in the current fiscal year. Ensure you prepare all proofs of address and identity before beginning.',
    author: 'Sekhar Anthati',
    category: 'GST Registrations',
    status: 'Published',
    read_time: 6,
    image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'blog-2',
    title: 'How to Setup a Private Limited Company: DSC, DIN, and Beyond',
    slug: 'setup-private-limited-company',
    content: 'Setting up a Private Limited Company in India offers limited liability protection and access to institutional funding. However, navigate the regulatory process smoothly by understanding Digital Signature Certificates (DSC), Director Identification Numbers (DIN), and MoA/AoA guidelines. Our startup specialists break down the incorporation timeline.',
    author: 'Raman Kumar',
    category: 'Startup Registrations',
    status: 'Published',
    read_time: 8,
    image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'blog-3',
    title: 'Income Tax Filing Guidelines for Proprietary Businesses',
    slug: 'income-tax-filing-proprietary',
    content: 'Filing income tax returns as a sole proprietor requires careful computation of business profits and personal deductions. We analyze the differences between ITR-3 and ITR-4 forms under the old and new tax structures to help you choose the best route for your business compliance.',
    author: 'Divya Nair',
    category: 'Tax Filings',
    status: 'Draft',
    read_time: 5,
    image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500',
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const defaultTestimonialsSeed: Testimonial[] = [
  {
    id: 'testimonial-1',
    client_name: 'Aditya Verma',
    company: 'Acrobyte Technologies',
    rating: 5,
    review_text: '24eFiling CRM has completely transformed our business compliance tracking. We incorporated our company and got our GST registration in record time. Extremely professional team!',
    status: 'Approved',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'testimonial-2',
    client_name: 'Meera Sen',
    company: 'Sen & Sons Handloom',
    rating: 5,
    review_text: 'Excellent service for MSME filings. The executives were polite, followed up regularly, and handled all query responses smoothly. Highly recommended!',
    status: 'Approved',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'testimonial-3',
    client_name: 'Vikram Singh',
    company: 'Apex Logistics',
    rating: 4,
    review_text: 'Highly satisfied with their income tax filing team. They explained the tax planning deductions clearly and helped us save substantial tax legitimately.',
    status: 'Approved',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  }
];
const defaultServicesSeed: Service[] = [
  {
    id: 's1',
    name: 'STARTUP',
    is_active: true,
    created_at: new Date().toISOString(),
    sub_services: [
      { id: 'ss1_1', service_id: 's1', name: 'Partnership Firm', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss1_2', service_id: 's1', name: 'Proprietorship Firm', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss1_3', service_id: 's1', name: 'Public Limited Company', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss1_4', service_id: 's1', name: 'Private Limited Company', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss1_5', service_id: 's1', name: 'OPC, One Person Company', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss1_6', service_id: 's1', name: 'LLP, Limited Liability Partnership', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() }
    ]
  },
  {
    id: 's2',
    name: 'Licenses & Registrations',
    is_active: true,
    created_at: new Date().toISOString(),
    sub_services: [
      { id: 'ss2_1', service_id: 's2', name: 'Startup India', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss2_2', service_id: 's2', name: 'Trade License', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss2_3', service_id: 's2', name: 'FSSAI License', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss2_4', service_id: 's2', name: 'PF Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss2_5', service_id: 's2', name: 'ESI Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss2_6', service_id: 's2', name: 'Professional Tax Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() }
    ]
  },
  {
    id: 's3',
    name: 'IP & TRADEMARK',
    is_active: true,
    created_at: new Date().toISOString(),
    sub_services: [
      { id: 'ss3_1', service_id: 's3', name: 'Trademark Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss3_2', service_id: 's3', name: 'Trademark Objection', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss3_3', service_id: 's3', name: 'Copyright Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss3_4', service_id: 's3', name: 'Patent Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() }
    ]
  },
  {
    id: 's4',
    name: 'GST Registrations',
    is_active: true,
    created_at: new Date().toISOString(),
    sub_services: [
      { id: 'ss4_1', service_id: 's4', name: 'GST Registration', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss4_2', service_id: 's4', name: 'GST Return Filing', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss4_3', service_id: 's4', name: 'GST LUT Form', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss4_4', service_id: 's4', name: 'GST Revocation', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() }
    ]
  },
  {
    id: 's5',
    name: 'Income Registrations',
    is_active: true,
    created_at: new Date().toISOString(),
    sub_services: [
      { id: 'ss5_1', service_id: 's5', name: 'Income Tax E-Filing', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss5_2', service_id: 's5', name: 'ITR-1 Return Filing', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() },
      { id: 'ss5_3', service_id: 's5', name: 'ITR-4 Return Filing', price: 0, required_documents: [], is_active: true, created_at: new Date().toISOString() }
    ]
  }
];

export const useApi = (options: { fetchOnMount?: boolean } = { fetchOnMount: true }) => {
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

            // PHASE 2: Fetch leads with FK joins — use explicit constraint names for reliability.
            // Falls back to a plain select if schema cache doesn't know the FK yet.
            // FIX: Run FIX_SCHEMA_CACHE_RELOAD.sql in Supabase to permanently resolve this.
            let leadsData: any[] | null = null;
            let leadsError: any = null;
            const leadsWithJoin = await supabase.from('leads')
                .select('*, assigner:profiles!leads_assigned_by_fkey(name, avatar_url), activities:activities!lead_id(id), documents:documents!lead_id(id), tasks:tasks!lead_id(id, is_completed, content, due_date, priority, created_by:tasks_created_by_fkey(name))')
                .order('created_at', { ascending: false })
                .limit(500);

            if (leadsWithJoin.error && leadsWithJoin.error.message.includes('schema cache')) {
                // Graceful fallback: fetch leads without profile join
                console.warn('Schema cache miss on leads→profiles join. Falling back to plain leads fetch. Run FIX_SCHEMA_CACHE_RELOAD.sql in Supabase to fix permanently.', leadsWithJoin.error.message);
                const fallback = await supabase.from('leads').select('*, activities:activities!lead_id(id), documents:documents!lead_id(id), tasks:tasks!lead_id(id, is_completed, content, due_date, priority)').order('created_at', { ascending: false }).limit(500);
                leadsData = fallback.data;
                leadsError = fallback.error;
            } else {
                leadsData = leadsWithJoin.data;
                leadsError = leadsWithJoin.error;
            }
            if (leadsError) throw new Error(`Leads: ${leadsError.message}`);

            // PHASE 3: Fetch customers with FK joins — same graceful fallback pattern.
            let customersData: any[] | null = null;
            const customersWithJoin = await supabase.from('customers')
                .select('*, created_by:profiles!customers_created_by_fkey(*), assigned_to:profiles!customers_assigned_to_fkey(*), leads:leads!lead_id(id)')
                .limit(500);

            if (customersWithJoin.error && customersWithJoin.error.message.includes('schema cache')) {
                console.warn('Schema cache miss on customers→profiles join. Falling back. Run FIX_SCHEMA_CACHE_RELOAD.sql in Supabase to fix permanently.', customersWithJoin.error.message);
                const fallback = await supabase.from('customers').select('*').limit(500);
                customersData = fallback.data;
            } else if (customersWithJoin.error) {
                throw new Error(`Customers: ${customersWithJoin.error.message}`);
            } else {
                customersData = customersWithJoin.data;
            }
            if (branchesError) console.error("Branches fetch failed (run SETUP_BRANCHES_MODULE.sql if missing)", branchesError);
            if (citiesError) console.error("Cities fetch failed (run SETUP_CITIES_MODULE.sql if missing)", citiesError);
            if (servicesError) console.error("Services fetch failed", servicesError);
            if (offersError) console.error("Offers fetch failed (run SETUP_OFFERS.sql if table is missing)", offersError);
            if (categoriesError) console.error("Business Categories fetch failed", categoriesError);
            if (industriesError) console.error("Industry Types fetch failed", industriesError);
            if (leadSourcesError) console.error("Lead Sources fetch failed", leadSourcesError);

            if (categoriesData) setBusinessCategories(categoriesData);
            if (industriesData) setIndustryTypes(industriesData);
            if (leadSourcesData) setLeadSources(leadSourcesData);
            if (invoicesData) setInvoices(invoicesData as any[]);
            if (policiesData) setCompanyPolicies(policiesData as any[]);
            if (remindersData) setReminders(remindersData as any[]);
            if (announcementsData) setAnnouncements(announcementsData as any[]);

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

            const safeUsers = (usersData || []).map(user => ({
                ...(user as any as User),
                skills: Array.isArray((user as any).skills) ? (user as any).skills : [],
            }));
            setUsers(safeUsers as User[]);

            // CONSTRUCT LEADS WITH LIGHTWEIGHT DETAILS
            const leadsWithDetails = (leadsData || []).map(lead => {
                // Fix: Cast lead to any because inferred type from DB has string ID for assigned_to, 
                // but types.ts Lead defines it as User object.
                const rawLead = lead as any;
                const assignedUser = safeUsers.find(u => u.id === rawLead.assigned_to) || null;
                
                // These relations come from the join query as properties
                // We cast them to simpler arrays for scoring. 
                // Note: The content/url fields will be undefined, which is fine for the list view.
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
                    // Store the partial data. LeadDetail will determine if it needs to fetch more.
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
                        lead_source: srcObj ? srcObj.source_name : (c.lead_source || 'Other'),
                        uploaded_documents,
                    };
                });
                setCustomers(processedCustomers as Customer[]);
            } else {
                setCustomers([]);
            }
            setNotifications(notificationsData as Notification[] || []);
            setUserActivities(userActivitiesData as UserActivity[] || []);
            if (branchesData) setBranches(branchesData as any[]);
            if (citiesData) setCities(citiesData as any[]);
            if (offersData) setOffers(offersData as Offer[]);
            setWebLeads(webLeadsList);
            setBlogs(blogsList);
            setTestimonials(testimonialsList);
            // Handle Settings
            let finalSettings: OrganizationSettings | null = null;
            if (!settingsData && profile?.role === 'Super Admin') {
                finalSettings = null;
            } else {
                finalSettings = settingsData as any;
            }
            setSettings(finalSettings);

            // Fetch Transfer Logs & Audit Logs conditionally (if Super Admin or Admin)
            if (profile?.role === 'Super Admin' || profile?.role === 'Admin' || profile?.role === 'Branch Manager') {
                try {
                    const { data: transferLogsData, error: transferLogsError } = await supabase
                        .from('user_transfer_logs' as any)
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (transferLogsError) throw transferLogsError;

                    if (transferLogsData) {
                        const resolvedLogs = transferLogsData.map((log: any) => {
                            const employee = safeUsers?.find((u: any) => u.id === log.employee_id);
                            const transferredBy = safeUsers?.find((u: any) => u.id === log.transferred_by);
                            const fromCity = citiesData?.find((c: any) => c.id === log.from_city_id);
                            const fromBranch = branchesData?.find((b: any) => b.id === log.from_branch_id);
                            const toCity = citiesData?.find((c: any) => c.id === log.to_city_id);
                            const toBranch = branchesData?.find((b: any) => b.id === log.to_branch_id);

                            return {
                                ...log,
                                employee_name: employee ? employee.name : 'Unknown Employee',
                                transferred_by_name: transferredBy ? transferredBy.name : 'Unknown User',
                                from_city_name: fromCity ? fromCity.city_name : 'N/A',
                                from_branch_name: fromBranch ? fromBranch.name : 'N/A',
                                to_city_name: toCity ? toCity.city_name : 'N/A',
                                to_branch_name: toBranch ? toBranch.name : 'N/A'
                            } as TransferLog;
                        });
                        setTransferLogs(resolvedLogs);
                    }
                } catch (e) {
                    console.warn("Failed to fetch transfer logs:", e);
                }

                if (profile?.role === 'Super Admin') {
                    try {
                        const { data: auditLogsData, error: auditLogsError } = await supabase
                            .from('audit_logs' as any)
                            .select('*')
                            .order('created_at', { ascending: false })
                            .limit(200);

                        if (auditLogsError) throw auditLogsError;

                        if (auditLogsData) {
                            const resolvedAudits = auditLogsData.map((log: any) => {
                                const user = safeUsers?.find((u: any) => u.id === log.user_id);
                                return {
                                    ...log,
                                    user_name: user ? user.name : 'System/Unknown'
                                };
                            });
                            setAuditLogs(resolvedAudits);
                        }
                    } catch (e) {
                        console.warn("Failed to fetch audit logs:", e);
                    }
                }
            }

            // Process Services
            let processedServices = (servicesData || []).map((service: any) => ({
                ...service,
                sub_services: (subServicesData || []).filter((sub: any) => sub.service_id === service.id)
            }));
            if (processedServices.length === 0) {
                console.warn("Services empty or fetch failed, using fallback defaultServicesSeed.");
                processedServices = defaultServicesSeed;
            }
            setServices(processedServices);

            // Update Cache
            try {
                const cacheData = JSON.stringify({
                    users: safeUsers,
                    leads: leadsWithDetails,
                    customers: processedCustomers,
                    notifications: notificationsData || [],
                    userActivities: userActivitiesData || [],
                    settings: finalSettings,
                    services: processedServices,
                    branches: branchesData || [],
                    cities: citiesData || [],
                    offers: offersData || [],
                    webLeads: webLeadsList,
                    blogs: blogsList,
                    testimonials: testimonialsList,
                    invoices: invoices || [],
                    companyPolicies: companyPolicies || [],
                    reminders: reminders || [],
                    announcements: announcements || []
                });

                if (cacheData.length < 4500000) {
                    localStorage.setItem('crm_api_cache', cacheData);
                } else {
                    console.log('API data too large for valid cache, skipping cache save.');
                    localStorage.removeItem('crm_api_cache');
                }
            } catch (e) {
                // ignore
            }

            hasLoaded.current = true;

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [profile?.role, options.fetchOnMount]);

    // NEW: On-demand fetch for full lead details
    const fetchLeadDetails = useCallback(async (leadId: string) => {
        const [
            { data: activities },
            { data: documents },
            { data: tasks }
        ] = await Promise.all([
            supabase.from('activities').select('*, user:profiles(*)').eq('lead_id', leadId).order('created_at', { ascending: false }),
            supabase.from('documents').select('*').eq('lead_id', leadId),
            supabase.from('tasks').select('*, created_by:profiles(*)').eq('lead_id', leadId)
        ]);

        return {
            activities: (activities as unknown as Activity[]) || [],
            documents: (documents as Document[]) || [],
            tasks: (tasks as unknown as Task[]) || []
        };
    }, []);

    useEffect(() => {
        if (profile && options.fetchOnMount) {
            fetchData();
        } else if (!options.fetchOnMount && hasLoaded.current) {
            // If we already loaded data somewhere else, we might want to ensure we have it? 
            // But for now, if fetchOnMount is false, we assume the user doesn't want to load.
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
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
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

    const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'created_at' | 'is_read'>) => {
        const payload = {
            ...notificationData,
            is_read: false,
            link: notificationData.link as Json
        };
        const { error } = await (supabase.from('notifications') as any).insert([payload]);
        if (error) throw error;
    }, []);

    const leadToCustomer = useCallback((lead: Lead): Database['public']['Tables']['customers']['Insert'] => {
        // Calculate financial details
        const serviceSets = lead.service_sets || [];
        const serviceAmount = serviceSets.reduce((total, set) => {
            return total + set.subservices.reduce((subTotal, sub) => subTotal + ((Number(sub.amount) || 0) * (Number(sub.quantity) || 1)), 0);
        }, 0);

        const taxAmount = serviceSets.reduce((total, set) => {
            return total + set.subservices.reduce((subTotal, sub) => subTotal + (Number(sub.tax_amount) || 0), 0);
        }, 0);

        const totalAmount = (Number(lead.total_payment) || 0); // Use the stored total payment which we know includes tax
        // OR calculate: const totalAmount = serviceAmount + taxAmount;

        const paidAmount = (lead.payments || []).reduce((acc, curr) => acc + (Number(curr.received) || Number(curr.amount) || 0), 0);
        const dueAmount = totalAmount - paidAmount;

        return {
            lead_id: lead.id,
            reference_number: lead.reference_number,
            name: `${lead.first_name} ${lead.last_name}`,
            email: lead.email,
            phone: lead.phone_number,
            gender: lead.gender,
            business_category_id: (lead as any).business_category_id || null,
            industry_type_id: (lead as any).industry_type_id || null,
            lead_source_id: (lead as any).lead_source_id || null,
            referred_by_customer_id: (lead as any).referred_by_customer_id || null,
            referred_by_employee_id: (lead as any).referred_by_employee_id || null,
            service_name: lead.service_requested,
            business_name: lead.business_name,
            sub_service: lead.service_sets?.map(s => s.mainService).join(', ') ?? null,
            lead_source: lead.source,
            created_by: profile?.id,
            date_of_enroll: lead.created_at,
            date_of_completion: new Date().toISOString(),
            residential_address: lead.residential_address,
            business_address: lead.business_address,
            personal_flat_no: lead.personal_flat_no || null,
            personal_street: lead.personal_street || null,
            personal_city: lead.personal_city || null,
            personal_state: lead.personal_state || null,
            personal_country: lead.personal_country || null,
            personal_zip_code: lead.personal_zip_code || null,
            business_flat_no: lead.business_flat_no || null,
            business_street: lead.business_street || null,
            business_city: lead.business_city || null,
            business_state: lead.business_state || null,
            business_country: lead.business_country || null,
            business_zip_code: lead.business_zip_code || null,
            assigned_to: lead.assigned_to?.id,
            avatar_url: lead.avatar_url,
            payment_details: {
                total_payment: lead.total_payment,
                payments: lead.payments,
            },
            service_sets: lead.service_sets as Json,
            // New Fields
            pan_number: lead.pan_number,
            aadhar_number: null, // Lead doesn't have explicit Aadhar number field to map
            alternate_mobile: lead.alternate_mobile || null,
            alternate_is_whatsapp: lead.alternate_is_whatsapp ?? null,
            service_amount: serviceAmount,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            due_amount: dueAmount,
            status: lead.status,
            feedback: null,
            branch_id: lead.branch_id || profile?.branch_id
        } as any;
    }, [profile]);

    const addActivityToLead = useCallback(async (leadId: string, activityData: Omit<Activity, 'id' | 'created_at' | 'user'>, user: User) => {
        try {
            const { error } = await (supabase.from('activities') as any).insert([{
                lead_id: leadId,
                user_id: user.id,
                ...activityData,
            }]);
            if (error) {
                console.warn("Failed to add activity due to database policies:", error.message);
                // We do NOT throw here so that the main user flows (e.g. creating/updating leads)
                // do not crash because of a secondary activity log failure.
            }
        } catch (err: any) {
            console.warn("Unexpected error adding activity:", err?.message || err);
        }
    }, []);

    const addLead = useCallback(async (leadData: Omit<Lead, 'id' | 'last_contacted'>) => {
        if (!profile) throw new Error("User not authenticated");
        if (leadData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(leadData.pan_number)) {
            throw new Error("Invalid PAN number format.");
        }
        // Generate Reference Number
        const currentYear = new Date().getFullYear();
        let seqVal: number;
        try {
            const { data: seqData, error: seqErr } = await (supabase as any).rpc('generate_next_payment_sequence', { payment_year: currentYear });
            if (seqErr || !seqData) {
                console.warn("RPC generate_next_payment_sequence failed, using fallback:", seqErr);
                seqVal = leads.length + 1;
            } else {
                seqVal = seqData;
            }
        } catch (e) {
            console.warn("RPC generate_next_payment_sequence exception, using fallback:", e);
            seqVal = leads.length + 1;
        }
        const referenceNumber = `E-${String(seqVal).padStart(3, '0')}-${currentYear}`;

        const { assigned_to, documents, activities, tasks, payments, service_sets, assigner, created_at, ...rest } = leadData as any;
        const catObj = businessCategories.find(c => c.name === leadData.business_category);
        const indObj = industryTypes.find(i => i.name === leadData.industry_type);
        const srcObj = leadSources.find(s => s.source_name === leadData.source);
        const businessCategoryId = catObj ? catObj.id : '11111111-1111-1111-1111-111111111111';
        const industryTypeId = indObj ? indObj.id : '22222222-2222-2222-2222-222222222222';
        const leadSourceId = srcObj ? srcObj.id : '33333333-3333-3333-3333-333333333333';

        const dbLeadData: any = {
            ...rest,
            reference_number: referenceNumber,
            assigned_to: assigned_to?.id,
            assigned_by: assigned_to ? profile.id : null,
            created_by: profile.id, // Explicitly set creator for RLS
            branch_id: profile.branch_id, // Default to creator's branch
            payments: payments as Json,
            service_sets: service_sets as Json,
            business_category_id: businessCategoryId,
            industry_type_id: industryTypeId,
            lead_source_id: leadSourceId,
            created_at: created_at || new Date().toISOString() // Use provided date or now
        };
        delete dbLeadData.business_category;
        delete dbLeadData.industry_type;
        let data: any = null;
        let error: any = null;
        try {
            const res = await (supabase.from('leads') as any).insert([dbLeadData]).select().single();
            data = res.data;
            error = res.error;
            if (error && (error.message.includes('reference_number') || error.message.includes('schema cache') || error.code === '42703')) {
                console.warn("Database missing columns, retrying lead insert with safe payload.", error.message);
                // Aggressively strip columns that might have been added recently or cause 42703
                const { reference_number, created_by, assigned_by, pan_number, ...dbLeadDataSafe } = dbLeadData;
                const retryRes = await (supabase.from('leads') as any).insert([dbLeadDataSafe]).select().single();
                data = retryRes.data;
                error = retryRes.error;
            }
        } catch (err: any) {
            error = err;
        }
        if (error || !data) throw error || new Error("Lead creation failed");

        if (assigned_to) {
            await addNotification({
                user_id: assigned_to.id,
                type: 'Lead Assigned',
                title: 'New Lead Assigned',
                message: `You have been assigned a new lead: ${leadData.business_name}.`,
                link: { page: 'Lead Detail', id: (data as any).id }
            });
        }
        await addActivityToLead((data as any).id, {
            type: 'Status Change',
            content: `created the lead and assigned it to ${assigned_to?.name || 'Unassigned'}.`,
        }, profile);
        await logUserActivity('Lead Created', `Created new lead: ${leadData.business_name} (${leadData.service_requested})`);
        await fetchData();
    }, [profile, addNotification, addActivityToLead, fetchData, logUserActivity]);

    const updateLead = useCallback(async (leadData: Lead, convertToCustomer: boolean = false, dateOfBirth?: string, aadharNumber?: string) => {
        if (!profile) throw new Error("User not authenticated");
        if (leadData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(leadData.pan_number)) {
            throw new Error("Invalid PAN number format.");
        }
        const originalLead = leads.find(l => l.id === leadData.id);
        const { assigned_to, documents, activities, tasks, payments, service_sets, assigner, ...rest } = leadData;
        
        // If status becomes Success, clear next_follow_up
        const isChangingToSuccess = leadData.status === 'Success' && originalLead?.status !== 'Success';
        const nextFollowUpValue = isChangingToSuccess ? null : leadData.next_follow_up;

        const catObj = businessCategories.find(c => c.name === leadData.business_category);
        const indObj = industryTypes.find(i => i.name === leadData.industry_type);
        const srcObj = leadSources.find(s => s.source_name === leadData.source);
        const businessCategoryId = catObj ? catObj.id : (originalLead?.business_category_id || '11111111-1111-1111-1111-111111111111');
        const industryTypeId = indObj ? indObj.id : (originalLead?.industry_type_id || '22222222-2222-2222-2222-222222222222');
        const leadSourceId = srcObj ? srcObj.id : (originalLead?.lead_source_id || '33333333-3333-3333-3333-333333333333');

        // Fix: Cast to any or extend type because 'assigned_by' column is missing from generated Supabase types
        const dbLeadData: any = {
            ...rest,
            assigned_to: assigned_to?.id,
            payments: payments as Json,
            service_sets: service_sets as Json,
            next_follow_up: nextFollowUpValue,
            assigned_by: (leadData.assigned_to?.id && (!originalLead?.assigned_to || originalLead.assigned_to.id !== leadData.assigned_to.id)) ? profile.id : undefined,
            business_category_id: businessCategoryId,
            industry_type_id: industryTypeId,
            lead_source_id: leadSourceId,
        };
        delete dbLeadData.business_category;
        delete dbLeadData.industry_type;

        let updateError: any = null;
        try {
            const res = await (supabase.from('leads') as any).update(dbLeadData).eq('id', leadData.id);
            updateError = res.error;
            if (updateError && (updateError.message.includes('reference_number') || updateError.message.includes('schema cache') || updateError.code === '42703')) {
                console.warn("Database missing columns, retrying lead update with safe payload.", updateError.message);
                const { reference_number, created_by, assigned_by, pan_number, ...dbLeadDataSafe } = dbLeadData as any;
                const retryRes = await (supabase.from('leads') as any).update(dbLeadDataSafe).eq('id', leadData.id);
                updateError = retryRes.error;
            }
        } catch (err: any) {
            updateError = err;
        }
        if (updateError) throw updateError;

        if (originalLead && originalLead.status !== leadData.status) {
            await addActivityToLead(leadData.id, {
                type: 'Status Change',
                content: `changed status from ${originalLead.status} to ${leadData.status}.`,
            }, profile);
        }
        if (leadData.assigned_to?.id && (!originalLead?.assigned_to || originalLead.assigned_to.id !== leadData.assigned_to.id)) {
            await addNotification({
                user_id: leadData.assigned_to.id,
                type: 'Lead Assigned',
                title: 'Lead Assigned',
                message: `You have been assigned the lead: ${leadData.business_name}.`,
                link: { page: 'Lead Detail', id: leadData.id }
            });
        }

        // Auto-convert to customer if status is 'Success' (or if explicitly requested)
        const shouldConvert = convertToCustomer || isChangingToSuccess;

        if (shouldConvert) {
            try {
                const { data: existingCustomer } = await supabase.from('customers').select('id').eq('lead_id', leadData.id).maybeSingle();
                
                let updatedLeadWithRef = { ...leadData };
                if (isChangingToSuccess) {
                    updatedLeadWithRef.status = 'Success';
                    updatedLeadWithRef.next_follow_up = undefined;
                }

                if (!updatedLeadWithRef.reference_number) {
                    const currentYear = new Date().getFullYear();
                    let seqVal = leads.length + 1;
                    try {
                        const { data: seqData, error: seqErr } = await (supabase as any).rpc('generate_next_payment_sequence', { payment_year: currentYear });
                        if (!seqErr && seqData) {
                            seqVal = seqData;
                        }
                    } catch (e) {
                        console.warn("RPC failed, using fallback:", e);
                    }
                    const refNum = `E-${String(seqVal).padStart(3, '0')}-${currentYear}`;
                    updatedLeadWithRef.reference_number = refNum;
                    // Also save it back to the lead in database so they stay in sync
                    try {
                        await (supabase.from('leads') as any).update({ reference_number: refNum }).eq('id', leadData.id);
                    } catch (e) {
                        console.warn("Could not save reference_number back to lead:", e);
                    }
                }

                const customerData = {
                    ...leadToCustomer(updatedLeadWithRef),
                    date_of_birth: dateOfBirth || null,
                    aadhar_number: aadharNumber || null
                };

                // Initialize payments array if lead has payments, or construct from advance_amount
                let paymentsList = updatedLeadWithRef.payments || [];
                if (paymentsList.length === 0 && updatedLeadWithRef.advance_amount && updatedLeadWithRef.advance_amount > 0) {
                    paymentsList = [{
                        id: Math.random().toString(36).substring(2, 15),
                        amount: updatedLeadWithRef.advance_amount,
                        received: updatedLeadWithRef.advance_amount,
                        date: new Date().toISOString(),
                        method: 'UPI',
                        notes: 'Auto-initialized advance payment upon success conversion',
                        // Use the lead's standardized E-XXX-YYYY reference number as receipt ID
                        receipt_number: updatedLeadWithRef.reference_number || `E-${String(leads.length + 1).padStart(3, '0')}-${new Date().getFullYear()}`
                    } as Payment];
                    
                    customerData.payment_details = {
                        total_payment: updatedLeadWithRef.total_payment,
                        payments: paymentsList
                    };
                    customerData.paid_amount = updatedLeadWithRef.advance_amount;
                    customerData.due_amount = (updatedLeadWithRef.total_payment || 0) - updatedLeadWithRef.advance_amount;

                    // Sync payments list back to lead in database
                    try {
                        await supabase.from('leads').update({ payments: paymentsList as any }).eq('id', leadData.id);
                    } catch (e) {
                        console.warn("Could not sync initialized payments back to lead:", e);
                    }
                }

                let customerError: any = null;
                if (!existingCustomer) {
                    let { error } = await (supabase.from('customers') as any).insert([customerData]);
                    customerError = error;
                    if (customerError && (customerError.message.includes('reference_number') || customerError.message.includes('schema cache') || customerError.code === '42703')) {
                        console.warn("Database missing 'reference_number' column on customers, retrying customer insert without it.", customerError.message);
                        const { reference_number, ...customerDataWithoutRef } = customerData as any;
                        const retryRes = await (supabase.from('customers') as any).insert([customerDataWithoutRef]);
                        customerError = retryRes.error;
                    }
                } else {
                    let { error } = await supabase.from('customers').update(customerData).eq('id', existingCustomer.id);
                    customerError = error;
                    if (customerError && (customerError.message.includes('reference_number') || customerError.message.includes('schema cache') || customerError.code === '42703')) {
                        console.warn("Database missing 'reference_number' column on customers update, retrying without it.", customerError.message);
                        const { reference_number, ...customerDataWithoutRef } = customerData as any;
                        const retryRes = await supabase.from('customers').update(customerDataWithoutRef).eq('id', existingCustomer.id);
                        customerError = retryRes.error;
                    }
                }

                if (customerError) throw customerError;

                // Log lead activities record
                await addActivityToLead(leadData.id, {
                    type: 'Status Change',
                    content: 'completed the Success stage workflow and created the Customer profile.'
                }, profile);

                // Get the actual customer ID for the notification link
                let notificationCustomerId = existingCustomer?.id;
                if (!notificationCustomerId) {
                    try {
                        const { data: createdCustomer } = await supabase.from('customers').select('id').eq('lead_id', leadData.id).maybeSingle();
                        notificationCustomerId = createdCustomer?.id;
                    } catch (e) {
                        console.warn('Could not fetch created customer ID for notification:', e);
                    }
                }

                // Send notification to user
                await addNotification({
                    user_id: profile.id,
                    type: 'Status Updated',
                    title: 'Lead Converted to Customer',
                    message: `Customer profile for "${leadData.first_name} ${leadData.last_name}" has been successfully created.`,
                    link: { page: 'Customer Detail', id: notificationCustomerId || leadData.id }
                });

                // Write audit logs
                await logUserActivity('Lead Converted', `Converted lead "${leadData.business_name}" to customer`);
                try {
                    await (supabase as any).from('audit_logs').insert([{
                        user_id: profile.id,
                        action: 'Lead Converted',
                        entity: 'Lead',
                        entity_id: leadData.id,
                        details: JSON.stringify({
                            business_name: leadData.business_name,
                            customer_name: `${leadData.first_name} ${leadData.last_name}`,
                            total_payment: leadData.total_payment
                        })
                    }]);
                } catch (e) {
                    console.warn("Could not insert to audit_logs:", e);
                }

            } catch (conversionError: any) {
                console.error("Critical error in customer conversion. Rolling back lead status.", conversionError);
                // TRANSACTION ROLLBACK: Revert the status change on the lead in the database
                if (originalLead) {
                    const rollbackData = {
                        status: originalLead.status,
                        next_follow_up: originalLead.next_follow_up
                    };
                    await supabase.from('leads').update(rollbackData).eq('id', leadData.id);
                }
                throw conversionError;
            }
        }

        // --- NOTIFICATION LOGIC FOR SUPER ADMINS ---
        const isSuccess = leadData.status === 'Success';
        const totalAmount = Number(leadData.total_payment) || 0;
        const paidAmount = (leadData.payments || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const isPaid = paidAmount >= totalAmount && totalAmount > 0;

        const wasSuccess = originalLead?.status === 'Success';
        const prevTotal = Number(originalLead?.total_payment) || 0;
        const prevPaid = (originalLead?.payments || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const wasPaid = prevPaid >= prevTotal && prevTotal > 0;

        // Trigger if: (Now Success AND Paid) AND (Previously NOT Success OR NOT Paid)
        if ((isSuccess && isPaid) && (!wasSuccess || !wasPaid)) {
            const superAdmins = users.filter(u => u.role === 'Super Admin');
            // Log for debugging
            console.log(`[Notification] Triggering 'Payment Completed' for ${superAdmins.length} Super Admins.`);

            for (const admin of superAdmins) {
                await addNotification({
                    user_id: admin.id,
                    type: 'Payment Completed',
                    title: 'Revenue Collected & Lead Closed',
                    message: `Lead "${leadData.business_name}" has been successfully closed and fully paid.`,
                    link: { page: 'Lead Detail', id: leadData.id }
                });
            }
        }
        // -------------------------------------------

        await logUserActivity('Lead Updated', `Updated lead: ${leadData.business_name}. Status: ${leadData.status}`);
        await fetchData();
    }, [profile, leads, users, addActivityToLead, leadToCustomer, fetchData, logUserActivity, addNotification]);

    // Import Customers Bulk
    const addCustomer = useCallback(async (customerData: Partial<Customer>) => {
        if (!profile) throw new Error("User not authenticated");

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Session expired. Please reload.");

        // Generate Reference Number
        const currentYear = new Date().getFullYear();
        let seqVal: number;
        try {
            const { data: seqData, error: seqErr } = await (supabase as any).rpc('generate_next_payment_sequence', { payment_year: currentYear });
            if (seqErr || !seqData) {
                console.warn("RPC failed, using fallback:", seqErr);
                seqVal = customers.length + 1;
            } else {
                seqVal = seqData;
            }
        } catch (e) {
            console.warn("RPC exception, using fallback:", e);
            seqVal = customers.length + 1;
        }
        const referenceNumber = `E-${String(seqVal).padStart(3, '0')}-${currentYear}`;

        const catObj = businessCategories.find(c => c.name === customerData.business_category);
        const indObj = industryTypes.find(i => i.name === customerData.industry_type);
        const srcObj = leadSources.find(s => s.source_name === customerData.lead_source);
        const businessCategoryId = catObj ? catObj.id : '11111111-1111-1111-1111-111111111111';
        const industryTypeId = indObj ? indObj.id : '22222222-2222-2222-2222-222222222222';
        const leadSourceId = srcObj ? srcObj.id : '33333333-3333-3333-3333-333333333333';

        const payload: any = {
            ...customerData,
            reference_number: referenceNumber,
            assigned_to: (customerData.assigned_to as any)?.id || customerData.assigned_to || null,
            created_by: profile.id, // Set creator
            branch_id: profile.branch_id, // Default to creator's branch
            business_category_id: businessCategoryId,
            industry_type_id: industryTypeId,
            lead_source_id: leadSourceId,
            created_at: customerData.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            lead_id: null, // Manual creation has no lead
        };
        delete payload.business_category;
        delete payload.industry_type;

        let { error } = await (supabase.from('customers') as any).insert([payload]);
        if (error && (error.message.includes('reference_number') || error.message.includes('schema cache') || error.code === '42703')) {
            console.warn("Database missing 'reference_number' column, retrying customer insert without it.", error.message);
            const { reference_number, ...payloadWithoutRef } = payload;
            const retryRes = await (supabase.from('customers') as any).insert([payloadWithoutRef]);
            error = retryRes.error;
        }
        if (error) throw error;

        await logUserActivity('Customer Created', `Created customer: ${customerData.name}`);
        await fetchData();
    }, [profile, fetchData, logUserActivity]);

    // Import Customers Bulk
    const importCustomers = useCallback(async (customersData: any[]) => {
        if (!profile) throw new Error("User not authenticated");

        // Ensure session is active before starting heavy operation
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Session expired. Please reload.");

        const BATCH_SIZE = 50;
        const chunks = [];
        for (let i = 0; i < customersData.length; i += BATCH_SIZE) {
            chunks.push(customersData.slice(i, i + BATCH_SIZE));
        }

        let processed = 0;
        const currentYear = new Date().getFullYear();
        for (const chunk of chunks) {
            const preparedData = [];
            for (const c of chunk) {
                // Generate atomic reference number for each customer in batch
                let seqVal = customers.length + processed + 1;
                try {
                    const { data: seqData, error: seqErr } = await (supabase as any).rpc('generate_next_payment_sequence', { payment_year: currentYear });
                    if (!seqErr && seqData) {
                        seqVal = seqData;
                    }
                } catch (e) {
                    console.warn("RPC failed during import fallback:", e);
                }
                const referenceNumber = `E-${String(seqVal).padStart(3, '0')}-${currentYear}`;

                preparedData.push({
                    ...c,
                    reference_number: referenceNumber,
                    created_by: profile.id, // Set importer as creator if not specified
                    created_at: new Date().toISOString(), // Set current time if missing
                    updated_at: new Date().toISOString()
                });
            }

            let { error } = await (supabase.from('customers') as any).insert(preparedData);
            if (error && (error.message.includes('reference_number') || error.message.includes('schema cache') || error.code === '42703')) {
                console.warn("Database missing 'reference_number' column, retrying customer bulk insert without it.", error.message);
                const preparedDataWithoutRef = preparedData.map(({ reference_number, ...rest }) => rest);
                const retryRes = await (supabase.from('customers') as any).insert(preparedDataWithoutRef);
                error = retryRes.error;
            }
            if (error) throw error;
            processed += chunk.length;
        }

        await logUserActivity('Data Import', `Imported ${processed} customer records.`);
        await fetchData();
    }, [profile, fetchData, logUserActivity]);

    const updateUser = useCallback(async (userData: User) => {
        if (!profile) throw new Error("User not authenticated");
        
        const targetId = userData.id;
        const oldUser = users.find(u => u.id === targetId);
        if (!oldUser) throw new Error("User not found");

        const isSelf = targetId === profile.id;
        const currentRole = profile.role;
        const isCurrentAdmin = currentRole === 'Admin' || currentRole === 'Branch Manager';

        // 1. Role Change Check
        const roleChanged = userData.role !== oldUser.role;
        if (roleChanged) {
            if (currentRole !== 'Super Admin') {
                throw new Error("Permission denied: Only Super Admins can assign/change roles.");
            }
            if (isSelf) {
                throw new Error("You cannot change your own role.");
            }
        }

        // 2. City / Branch Change (Transfer) Check
        const branchChanged = userData.branch_id !== oldUser.branch_id;
        const cityChanged = userData.city_id !== oldUser.city_id;
        if (branchChanged || cityChanged) {
            if (isSelf) {
                throw new Error("You cannot transfer yourself to another branch/city.");
            }

            if (currentRole === 'Super Admin') {
                if (oldUser.role === 'Super Admin') {
                    throw new Error("Super Admin cannot transfer other Super Admins.");
                }
            } else if (isCurrentAdmin) {
                if (oldUser.role !== 'Sales Executive') {
                    throw new Error("Permission denied: Branch Managers can only transfer Sales Executives.");
                }
                if (oldUser.branch_id !== profile.branch_id && oldUser.branch_name !== profile.branch_name) {
                    throw new Error("Permission denied: You can only transfer Sales Executives assigned to your own branch.");
                }
            } else {
                throw new Error("Permission denied: You do not have permission to transfer employees.");
            }
        }

        // 3. General Edit Access Check (for non-self)
        if (!isSelf) {
            if (currentRole === 'Super Admin') {
                if (oldUser.role === 'Super Admin') {
                    throw new Error("Permission denied: Super Admin cannot edit other Super Admins.");
                }
            } else if (isCurrentAdmin) {
                if (oldUser.role !== 'Sales Executive') {
                    throw new Error("Permission denied: You can only manage Sales Executives.");
                }
                if (oldUser.branch_id !== profile.branch_id && oldUser.branch_name !== profile.branch_name) {
                    throw new Error("Permission denied: You can only manage users assigned to your own branch.");
                }
            } else {
                throw new Error("Permission denied: You do not have permission to edit other users.");
            }
        }

        // Enforce DB updates
        const { id, created_at, last_updated, ...updates } = userData as any;
        const { data, error } = await (supabase.from('profiles') as any).update(updates).eq('id', id).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Update failed. Permission denied or user not found.");

        // Log Transfer if city/branch changed
        if (branchChanged || cityChanged) {
            const fromCityId = oldUser.city_id;
            const fromBranchId = oldUser.branch_id;
            const toCityId = userData.city_id || oldUser.city_id;
            const toBranchId = userData.branch_id || oldUser.branch_id;
            const toCityName = userData.city_name || oldUser.city_name;
            const toBranchName = userData.branch_name || oldUser.branch_name;
            const transferType = (toCityId !== fromCityId) ? 'City Transfer' : 'Branch Transfer';

            try {
                // Update leads/customers
                await (supabase.from('leads') as any).update({
                    branch_id: toBranchId,
                    city_name: toCityName
                }).eq('assigned_to', id);

                await (supabase.from('customers') as any).update({
                    branch_id: toBranchId,
                    city_name: toCityName
                }).eq('assigned_to', id);

                // Insert transfer log
                const logEntry = {
                    employee_id: id,
                    from_city_id: fromCityId,
                    from_branch_id: fromBranchId,
                    to_city_id: toCityId,
                    to_branch_id: toBranchId,
                    transferred_by: profile.id,
                    transfer_type: transferType
                };
                await ((supabase as any).from('user_transfer_logs')).insert([logEntry]);

                // Audit Log
                await logAuditAction('User Transferred', 'User', id, {
                    employee_name: oldUser.name,
                    from_city: oldUser.city_name,
                    from_branch: oldUser.branch_name,
                    to_city: toCityName,
                    to_branch: toBranchName,
                    transfer_type: transferType
                });
            } catch (e) {
                console.error("Failed to process transfer updates/logs:", e);
            }

            await logUserActivity('User Transferred', `Transferred user: ${oldUser.name} to ${toBranchName}`);
        } else {
            await logUserActivity('User Updated', `Updated profile for user: ${userData.name}`);
        }

        // Log Role Change if role changed
        if (roleChanged) {
            await logAuditAction('Role Changed', 'User', id, {
                employee_name: oldUser.name,
                old_role: oldUser.role,
                new_role: userData.role
            });
            await logUserActivity('Role Changed', `Changed role for ${oldUser.name} from ${oldUser.role} to ${userData.role}`);
        }

        await fetchData();
    }, [profile, users, fetchData, logUserActivity, logAuditAction]);

    const transferUser = useCallback(async (userId: string, toCityId: string, toCityName: string, toBranchId: string, toBranchName: string) => {
        if (!profile) throw new Error("User not authenticated");
        
        // Find the user to be transferred
        const userToTransfer = users.find(u => u.id === userId);
        if (!userToTransfer) throw new Error("User not found");

        const isSelf = userId === profile.id;
        const currentRole = profile.role;
        const isCurrentAdmin = currentRole === 'Admin' || currentRole === 'Branch Manager';

        if (isSelf) {
            throw new Error("You cannot transfer yourself to another branch/city.");
        }

        if (currentRole === 'Super Admin') {
            if (userToTransfer.role === 'Super Admin') {
                throw new Error("Super Admin cannot transfer other Super Admins.");
            }
        } else if (isCurrentAdmin) {
            if (userToTransfer.role !== 'Sales Executive') {
                throw new Error("Permission denied: Branch Managers can only transfer Sales Executives.");
            }
            if (userToTransfer.branch_id !== profile.branch_id && userToTransfer.branch_name !== profile.branch_name) {
                throw new Error("Permission denied: You can only transfer Sales Executives assigned to your own branch.");
            }
        } else {
            throw new Error("Permission denied: You do not have permission to transfer employees.");
        }

        const fromCityId = userToTransfer.city_id;
        const fromBranchId = userToTransfer.branch_id;
        const transferType = (toCityId !== fromCityId) ? 'City Transfer' : 'Branch Transfer';

        // 1. Update User Profile
        const updates = {
            city_id: toCityId,
            city_name: toCityName,
            branch_id: toBranchId,
            branch_name: toBranchName
        };

        const { data, error } = await (supabase.from('profiles') as any).update(updates).eq('id', userId).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Update failed. Permission denied or user not found.");

        // 1.5 Update Leads and Customers associated with this user
        try {
            await (supabase.from('leads') as any).update({
                branch_id: toBranchId,
                city_name: toCityName
            }).eq('assigned_to', userId);

            await (supabase.from('customers') as any).update({
                branch_id: toBranchId,
                city_name: toCityName
            }).eq('assigned_to', userId);
        } catch (e) {
            console.error("Failed to update related leads/customers:", e);
        }

        // 2. Log Transfer
        const logEntry = {
            employee_id: userId,
            from_city_id: fromCityId,
            from_branch_id: fromBranchId,
            to_city_id: toCityId,
            to_branch_id: toBranchId,
            transferred_by: profile.id,
            transfer_type: transferType
        };

        try {
            await ((supabase as any).from('user_transfer_logs')).insert([logEntry]);
            await logAuditAction('User Transferred', 'User', userId, {
                employee_name: userToTransfer.name,
                from_city: userToTransfer.city_name,
                from_branch: userToTransfer.branch_name,
                to_city: toCityName,
                to_branch: toBranchName,
                transfer_type: transferType
            });
        } catch (e) {
            console.error("Failed to log transfer:", e);
        }

        await logUserActivity('User Transferred', `Transferred user: ${userToTransfer.name} to ${toBranchName}`);
        await fetchData();
    }, [profile, users, fetchData, logUserActivity, logAuditAction]);

    const updateMultipleLeads = useCallback(async (leadIds: string[], updates: Partial<Omit<Lead, 'id'>>) => {
        const { assigned_to, ...rest } = updates;
        const dbUpdates: Partial<Database['public']['Tables']['leads']['Row']> = {
            ...rest,
            assigned_to: typeof assigned_to === 'object' && assigned_to !== null && 'id' in assigned_to ? (assigned_to as User).id : undefined,
        };
        const { error } = await (supabase.from('leads') as any).update(dbUpdates).in('id', leadIds);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const deleteMultipleLeads = useCallback(async (leadIds: string[]) => {
        const { error } = await supabase.from('leads').delete().in('id', leadIds);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const deleteMultipleUsers = useCallback(async (userIds: string[]) => {
        if (!profile || (profile.role !== 'Super Admin' && profile.role !== 'Admin')) {
            throw new Error("Only Super Admins and Admins can delete users.");
        }

        try {
            const { data, error } = await supabase.functions.invoke('delete-user', {
                body: { userIds }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

        } catch (invokeError: any) {
            console.warn("Standard function invoke failed, attempting local fallback...", invokeError);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("No active session");

                const response = await fetch('http://localhost:54321/functions/v1/delete-user', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userIds })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Local function error: ${errorText}`);
                }

                const result = await response.json();
                if (result.error) throw new Error(result.error);

            } catch (fallbackError: any) {
                console.error("Local fallback also failed:", fallbackError);
                console.warn("Attempting direct database deletion...");
                const { error: dbError } = await supabase.from('profiles').delete().in('id', userIds);

                if (dbError) {
                    console.error("Direct deletion failed:", dbError);
                    throw new Error(`Failed to delete users via Function or Direct DB. Please ensuring the 'delete-user' Function is deployed OR run the provided SQL script to enable direct delete permissions. \nEdge Error: ${invokeError.message} \nDB Error: ${dbError.message}`);
                }
                console.log("Direct DB deletion successful.");
            }
        }
        await fetchData();
    }, [profile, fetchData]);

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

    const markNotificationsAsRead = useCallback(async (userId: string) => {
        const { error } = await (supabase.from('notifications') as any).update({ is_read: true }).eq('user_id', userId);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const addTaskToLead = useCallback(async (leadId: string | null, taskData: Omit<Task, 'id' | 'created_at' | 'is_completed' | 'completed_at'>) => {
        if (!profile) throw new Error("User not authenticated");
        const { error } = await (supabase.from('tasks' as any) as any).insert([{
            lead_id: leadId || null,
            content: taskData.content,
            due_date: taskData.due_date,
            created_by: profile.id,
            branch_id: taskData.branch_id || profile.branch_id || null,
            is_completed: false,
            priority: taskData.priority,
            depends_on_task_id: (taskData as any).depends_on_task_id,
            assigned_to: taskData.assigned_to?.id || (taskData.assigned_to as any) || null,
            status: taskData.status || 'todo',
            category: taskData.category || 'client_task',
            estimated_hours: taskData.estimated_hours || null,
            actual_hours: taskData.actual_hours || null
        }]);
        if (error) throw error;

        if (leadId) {
            try {
                const formattedDate = taskData.due_date 
                    ? new Date(taskData.due_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'No date specified';
                await addActivityToLead(leadId, {
                    type: 'Note',
                    content: `Scheduled a task: "${taskData.content}" due on ${formattedDate}.`
                }, profile);
            } catch (e) {
                console.error("Failed to log task activity", e);
            }
        }

        await fetchData();
    }, [profile, addActivityToLead, fetchData]);

    const updateTaskOnLead = useCallback(async (leadId: string | null, updatedTask: Task) => {
        if (!profile) throw new Error("User not authenticated");
        const { id, content, due_date, is_completed, completed_at, priority } = updatedTask;
        const dbUpdates = { 
            content, 
            due_date, 
            is_completed, 
            completed_at, 
            priority,
            assigned_to: updatedTask.assigned_to?.id || (updatedTask.assigned_to as any) || null,
            status: updatedTask.status || 'todo',
            category: updatedTask.category || 'client_task',
            estimated_hours: updatedTask.estimated_hours || null,
            actual_hours: updatedTask.actual_hours || null,
            branch_id: updatedTask.branch_id || null
        };
        const { error } = await (supabase.from('tasks' as any) as any).update(dbUpdates).eq('id', id);
        if (error) throw error;

        if (is_completed && leadId) {
            try {
                await addActivityToLead(leadId, {
                    type: 'Note',
                    content: `Completed the task: "${content}".`
                }, profile);
            } catch (e) {
                console.error("Failed to log task completion activity", e);
            }
        }

        await fetchData();
    }, [profile, addActivityToLead, fetchData]);

    const deleteTaskFromLead = useCallback(async (leadId: string | null, taskId: string) => {
        const { error } = await (supabase.from('tasks' as any) as any).delete().eq('id', taskId);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const deleteCustomer = useCallback(async (customerId: string) => {
        const { data, error } = await supabase.from('customers').delete().eq('id', customerId).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Unable to delete. Permission denied or record not found.");

        await logUserActivity('Customer Deleted', `Deleted customer ID: ${customerId}`);
        await fetchData();
    }, [fetchData, logUserActivity]);

    const deleteCustomers = useCallback(async (customerIds: string[]) => {
        const { data, error } = await supabase.from('customers').delete().in('id', customerIds).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Unable to delete. Permission denied or records not found.");

        await logUserActivity('Bulk Delete', `Deleted ${data.length} customers`);
        await fetchData();
    }, [fetchData, logUserActivity]);

    const updateCustomer = useCallback(async (customerId: string, updates: Partial<Customer>) => {
        const { assigned_to, leads, uploaded_documents, ...rest } = updates as any;
        
        const catObj = businessCategories.find(c => c.name === updates.business_category);
        const indObj = industryTypes.find(i => i.name === updates.industry_type);
        const srcObj = leadSources.find(s => s.source_name === updates.lead_source);
        const businessCategoryId = catObj ? catObj.id : (updates.business_category === undefined ? undefined : '11111111-1111-1111-1111-111111111111');
        const industryTypeId = indObj ? indObj.id : (updates.industry_type === undefined ? undefined : '22222222-2222-2222-2222-222222222222');
        const leadSourceId = srcObj ? srcObj.id : (updates.lead_source === undefined ? undefined : '33333333-3333-3333-3333-333333333333');

        const dbUpdates: any = {
            ...rest,
            assigned_to: assigned_to?.id || assigned_to || null,
            ...(businessCategoryId !== undefined && { business_category_id: businessCategoryId }),
            ...(industryTypeId !== undefined && { industry_type_id: industryTypeId }),
            ...(leadSourceId !== undefined && { lead_source_id: leadSourceId }),
        };
        delete dbUpdates.business_category;
        delete dbUpdates.industry_type;
        let { error } = await supabase.from('customers').update(dbUpdates).eq('id', customerId);
        if (error && (error.message.includes('reference_number') || error.message.includes('schema cache') || error.code === '42703')) {
            console.warn("Database missing 'reference_number' column, retrying customer update without it.", error.message);
            const { reference_number, ...dbUpdatesWithoutRef } = dbUpdates as any;
            const retryRes = await supabase.from('customers').update(dbUpdatesWithoutRef).eq('id', customerId);
            error = retryRes.error;
        }
        if (error) throw error;
        await logUserActivity('Customer Updated', `Updated customer ID: ${customerId}`);
        await fetchData();
    }, [fetchData, logUserActivity, businessCategories, industryTypes]);

    const updateOrganizationSettings = useCallback(async (newSettings: Partial<OrganizationSettings>) => {
        if (!settings?.id) {
            const { error } = await (supabase.from('organization_settings' as any) as any).insert([newSettings]);
            if (error) throw error;
        } else {
            const { error } = await (supabase.from('organization_settings' as any) as any).update(newSettings).eq('id', settings.id);
            if (error) throw error;
        }
        await logUserActivity('Settings Updated', 'Updated organization settings.');
        await fetchData();
    }, [settings, fetchData, logUserActivity]);



    // Service Management Functions
    const addService = useCallback(async (name: string) => {
        const { error } = await (supabase.from('services' as any) as any).insert([{ 
            name,
            branch_id: profile?.branch_id || null 
        }]);
        if (error) throw error;
        await fetchData();
    }, [profile, fetchData]);

    const updateService = useCallback(async (id: string, updates: Partial<Service>) => {
        const { error } = await (supabase.from('services' as any) as any).update(updates).eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const deleteService = useCallback(async (id: string) => {
        const { error } = await (supabase.from('services' as any) as any).delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const addSubService = useCallback(async (serviceId: string, subService: Omit<SubService, 'id' | 'created_at' | 'service_id'>) => {
        const { error } = await (supabase.from('sub_services' as any) as any).insert([{
            service_id: serviceId,
            branch_id: profile?.branch_id || null,
            ...subService
        }]);
        if (error) throw error;
        await fetchData();
    }, [profile, fetchData]);

    const updateSubService = useCallback(async (id: string, updates: Partial<SubService>) => {
        const { error } = await (supabase.from('sub_services' as any) as any).update(updates).eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const deleteSubService = useCallback(async (id: string) => {
        const { error } = await (supabase.from('sub_services' as any) as any).delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    const addOffer = useCallback(async (offerData: Omit<Offer, 'id' | 'created_at' | 'usage_count'>) => {
        if (!profile) throw new Error("User not authenticated");
        const payload = {
            ...offerData,
            created_by: profile.id,
            branch_id: profile.branch_id || null,
            usage_count: 0
        };
        const { error } = await (supabase.from('offers' as any) as any).insert([payload]);
        if (error) throw error;
        await logUserActivity('Offer Created', `Created promo offer: ${offerData.name}`);
        await fetchData();
    }, [profile, logUserActivity, fetchData]);

    const updateOffer = useCallback(async (id: string, updates: Partial<Offer>) => {
        const { error } = await (supabase.from('offers' as any) as any).update(updates).eq('id', id);
        if (error) throw error;
        await logUserActivity('Offer Updated', `Updated promo offer ID: ${id}`);
        await fetchData();
    }, [logUserActivity, fetchData]);

    const deleteOffer = useCallback(async (id: string) => {
        const { error } = await (supabase.from('offers' as any) as any).delete().eq('id', id);
        if (error) throw error;
        await logUserActivity('Offer Deleted', `Deleted promo offer ID: ${id}`);
        await fetchData();
    }, [logUserActivity, fetchData]);

    const incrementOfferUsage = useCallback(async (code: string) => {
        // Fetch current offer
        const { data: offerData, error: fetchErr } = await (supabase.from('offers' as any) as any).select('id, usage_count').eq('promo_code', code).maybeSingle();
        if (fetchErr || !offerData) return;

        const { error } = await (supabase.from('offers' as any) as any).update({
            usage_count: (offerData.usage_count || 0) + 1
        }).eq('id', offerData.id);

        if (error) console.error("Failed to increment offer usage count:", error);
        await fetchData();
    }, [fetchData]);

    // Web Leads Management Functions
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
    }, [webLeads, logUserActivity, fetchData]);

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
    }, [webLeads, logUserActivity, fetchData]);

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
    }, [webLeads, logUserActivity, fetchData]);

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
    }, [webLeads, logUserActivity, fetchData]);

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
    }, [webLeads, logUserActivity, fetchData]);

    const convertWebLeadToCrmLead = useCallback(async (webLeadId: string, assignedToId: string | null) => {
        const webLead = webLeads.find(l => l.id === webLeadId);
        if (!webLead) throw new Error("Web lead not found");

        const nameParts = webLead.name.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const assignedUser = users.find(u => u.id === assignedToId) || null;

        // Construct standard Lead payload
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

        // 1. Create standard CRM Lead
        await addLead(newLeadPayload);

        // 2. Update organic Web Lead to Converted status and record assignee
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
    }, [webLeads, users, addLead, logUserActivity, fetchData]);

    // Blogs Content Management Functions
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
    }, [blogs, logUserActivity, fetchData]);

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
    }, [blogs, logUserActivity, fetchData]);

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
    }, [blogs, logUserActivity, fetchData]);

    // Testimonials Management Functions
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
    }, [testimonials, logUserActivity, fetchData]);

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
    }, [testimonials, logUserActivity, fetchData]);

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
    }, [testimonials, logUserActivity, fetchData]);

    const uploadBranchLogo = useCallback(async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `branches/logo_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
        return publicUrl;
    }, []);

    const addCity = useCallback(async (cityName: string) => {
        try {
            const cityCode = cityName.substring(0, 3).toUpperCase() + '-' + Math.floor(Math.random() * 10000);
            const payload = {
                city_name: cityName,
                city_code: cityCode,
                status: true
            };
            const { data, error } = await (supabase.from('cities') as any).insert([payload]).select().single();
            if (error) throw error;
            await fetchData();
            return data;
        } catch (e) {
            console.warn("DB insert failed for city", e);
            throw e;
        }
    }, [fetchData]);

    const updateCity = useCallback(async (id: string, updates: Partial<City>) => {
        try {
            const payload = {
                ...updates,
                updated_at: new Date().toISOString()
            };
            const { error } = await (supabase.from('cities') as any).update(payload).eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn("DB update failed for city", e);
            throw e;
        }
        await logUserActivity('City Updated', `Updated city ID: ${id}`);
        await fetchData();
    }, [logUserActivity, fetchData]);

    const deleteCity = useCallback(async (id: string) => {
        try {
            const { error } = await (supabase.from('cities') as any).delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn("DB delete failed for city", e);
            throw e;
        }
        await logUserActivity('City Deleted', `Deleted city ID: ${id}`);
        await fetchData();
    }, [logUserActivity, fetchData]);


    const addBranch = useCallback(async (branch: Omit<any, 'id' | 'created_at' | 'updated_at'>) => {
        const managerId = branch.manager_id || null;
        const payload = {
            ...branch,
            manager_id: managerId
        };
        try {
            const { data: insertedBranch, error } = await (supabase.from('branches') as any)
                .insert([payload])
                .select()
                .single();
            if (error) throw error;

            // If a manager was assigned, update their profile.branch_id
            if (managerId && insertedBranch?.id) {
                await (supabase.from('profiles') as any)
                    .update({ branch_id: insertedBranch.id })
                    .eq('id', managerId);
            }
        } catch (e) {
            console.warn("DB insert failed", e);
            throw e;
        }
        await logUserActivity('Branch Created', `Added new branch: ${(branch as any).name}`);
        await fetchData();
    }, [logUserActivity, fetchData]);

    const updateBranch = useCallback(async (id: string, updates: Partial<any>) => {
        try {
            const newManagerId = 'manager_id' in updates ? (updates.manager_id || null) : undefined;
            const payload = {
                ...updates,
                manager_id: newManagerId,
                updated_at: new Date().toISOString()
            };
            const { error } = await (supabase.from('branches') as any).update(payload).eq('id', id);
            if (error) throw error;

            // Sync profiles.branch_id when manager changes
            if ('manager_id' in updates) {
                // Find the old manager for this branch to clear their branch_id
                const oldBranch = branches.find((b: any) => b.id === id);
                const oldManagerId = oldBranch?.manager_id;

                // If there was a previous manager and it's different, clear their branch_id
                if (oldManagerId && oldManagerId !== newManagerId) {
                    await (supabase.from('profiles') as any)
                        .update({ branch_id: null })
                        .eq('id', oldManagerId);
                }

                // If a new manager is assigned, update their branch_id
                if (newManagerId) {
                    await (supabase.from('profiles') as any)
                        .update({ branch_id: id })
                        .eq('id', newManagerId);
                }
            }
        } catch (e) {
            console.warn("DB update failed", e);
            throw e;
        }
        await logUserActivity('Branch Updated', `Updated branch ID: ${id}`);
        await fetchData();
    }, [logUserActivity, fetchData, branches]);

    const deleteBranch = useCallback(async (id: string) => {
        try {
            // Before deleting, clear manager's branch_id reference
            const branchToRemove = branches.find((b: any) => b.id === id);
            if (branchToRemove?.manager_id) {
                await (supabase.from('profiles') as any)
                    .update({ branch_id: null })
                    .eq('id', branchToRemove.manager_id);
            }
            const { error } = await (supabase.from('branches') as any).delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn("DB delete failed", e);
            throw e;
        }
        await logUserActivity('Branch Deleted', `Deleted branch ID: ${id}`);
        await fetchData();
    }, [logUserActivity, fetchData, branches]);

    return {
        leads,
        users,
        customers,
        notifications,
        offers,
        userActivities,
        settings,
        services,
        branches,
        webLeads,
        blogs,
        testimonials,
        cities,
        transferLogs,
        auditLogs,
        businessCategories,
        industryTypes,
        leadSources,
        setLeadSources,

        loading,
        error,
        fetchData,
        addNotification,
        addLead,
        updateLead,
        updateUser,
        transferUser,
        addActivityToLead,
        updateMultipleLeads,
        deleteMultipleLeads,
        deleteMultipleUsers,
        uploadDocument,
        deleteDocument,
        updateDocumentStatus,
        markNotificationsAsRead,
        addTaskToLead,
        updateTaskOnLead,
        deleteTaskFromLead,
        updateOrganizationSettings,
        addService,
        updateService,
        deleteService,
        addSubService,
        updateSubService,
        deleteSubService,

        addOffer,
        updateOffer,
        deleteOffer,
        incrementOfferUsage,

        addCustomer,
        updateCustomer,
        deleteCustomer,
        deleteCustomers,
        importCustomers,
        refreshData: fetchData,
        fetchLeadDetails,

        addWebLead,
        updateWebLeadStatus,
        assignWebLead,
        convertWebLeadToCrmLead,
        updateWebLead,
        deleteMultipleWebLeads,
        addBlog,
        updateBlog,
        deleteBlog,
        addTestimonial,
        updateTestimonialStatus,
        deleteTestimonial,

        uploadBranchLogo,
        addBranch,
        addCity,
        updateCity,
        deleteCity,
        updateBranch,
        deleteBranch,

        // Invoice CRUD
        invoices,
        addInvoice: useCallback(async (invoiceData: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'invoice_number'>) => {
            try {
                const { data, error } = await (supabase.from('invoices' as any) as any).insert([invoiceData]).select().single();
                if (error) throw error;
                await logUserActivity('Invoice Created', `Created invoice: ${data.invoice_number} for total ₹${data.total_amount}`);
                await fetchData();
                return data;
            } catch (e) {
                console.warn("DB insert failed for invoice", e);
                throw e;
            }
        }, [logUserActivity, fetchData]),
        updateInvoice: useCallback(async (id: string, invoiceData: Partial<Invoice>) => {
            try {
                const { error } = await (supabase.from('invoices' as any) as any).update(invoiceData).eq('id', id);
                if (error) throw error;
                await logUserActivity('Invoice Updated', `Updated invoice ID: ${id}`);
                await fetchData();
            } catch (e) {
                console.warn("DB update failed for invoice", e);
                throw e;
            }
        }, [logUserActivity, fetchData]),
        deleteInvoice: useCallback(async (id: string) => {
            try {
                const { error } = await (supabase.from('invoices' as any) as any).delete().eq('id', id);
                if (error) throw error;
                await logUserActivity('Invoice Deleted', `Deleted invoice ID: ${id}`);
                await fetchData();
            } catch (e) {
                console.warn("DB delete failed for invoice", e);
                throw e;
            }
        }, [logUserActivity, fetchData]),

        // Policy CRUD
        companyPolicies,
        addPolicy: useCallback(async (policyData: Omit<CompanyPolicy, 'id' | 'created_at' | 'updated_at'>) => {
            try {
                const { data, error } = await (supabase.from('company_policies' as any) as any).insert([policyData]).select().single();
                if (error) throw error;
                await logUserActivity('Policy Created', `Created company policy: ${data.name}`);
                await fetchData();
                return data;
            } catch (e) {
                console.warn("DB insert failed for policy", e);
                throw e;
            }
        }, [logUserActivity, fetchData]),
        updatePolicy: useCallback(async (id: string, policyData: Partial<CompanyPolicy>) => {
            try {
                const { error } = await (supabase.from('company_policies' as any) as any).update(policyData).eq('id', id);
                if (error) throw error;
                await logUserActivity('Policy Updated', `Updated policy ID: ${id}`);
                await fetchData();
            } catch (e) {
                console.warn("DB update failed for policy", e);
                throw e;
            }
        }, [logUserActivity, fetchData]),
        deletePolicy: useCallback(async (id: string) => {
            try {
                const { error } = await (supabase.from('company_policies' as any) as any).delete().eq('id', id);
                if (error) throw error;
                await logUserActivity('Policy Deleted', `Deleted policy ID: ${id}`);
                await fetchData();
            } catch (e) {
                console.warn("DB delete failed for policy", e);
                throw e;
            }
        }, [logUserActivity, fetchData]),

        // Invoice payments
        addInvoicePayment: useCallback(async (invoiceId: string, paymentId: string, amount: number) => {
            try {
                const { data, error } = await (supabase.from('invoice_payments' as any) as any).insert([{ invoice_id: invoiceId, payment_id: paymentId, amount }]).select().single();
                if (error) throw error;
                await fetchData();
                return data;
            } catch (e) {
                console.warn("DB insert failed for invoice payment", e);
                throw e;
            }
        }, [fetchData]),

        // Reminders CRUD
        reminders,
        addReminder: useCallback(async (reminderData: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>) => {
            try {
                const { data, error } = await (supabase.from('reminders' as any) as any).insert([reminderData]).select().single();
                if (error) throw error;
                await logUserActivity('Reminder Created', `Created reminder: ${data.title}`);
                await fetchData();
                return data;
            } catch (e) {
                console.warn("DB insert failed for reminder", e);
                throw e;
            }
        }, [logUserActivity, fetchData]),
        updateReminder: useCallback(async (id: string, reminderData: Partial<Reminder>) => {
            try {
                const { error } = await (supabase.from('reminders' as any) as any).update(reminderData).eq('id', id);
                if (error) throw error;
                await logUserActivity('Reminder Updated', `Updated reminder ID: ${id}`);
                await fetchData();
            } catch (e) {
                console.warn("DB update failed for reminder", e);
                throw e;
            }
        }, [logUserActivity, fetchData]),
        deleteReminder: useCallback(async (id: string) => {
            try {
                const { error } = await (supabase.from('reminders' as any) as any).delete().eq('id', id);
                if (error) throw error;
                await logUserActivity('Reminder Deleted', `Deleted reminder ID: ${id}`);
                await fetchData();
            } catch (e) {
                console.warn("DB delete failed for reminder", e);
                throw e;
            }
        }, [logUserActivity, fetchData]),

        // Announcements CRUD
        announcements,
        addAnnouncement: useCallback(async (announcementData: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>) => {
            try {
                const { data, error } = await (supabase.from('announcements' as any) as any).insert([announcementData]).select().single();
                if (error) throw error;
                await logUserActivity('Announcement Created', `Created announcement: ${data.title}`);
                await fetchData();
                return data;
            } catch (e) {
                console.warn("DB insert failed for announcement", e);
                throw e;
            }
        }, [logUserActivity, fetchData]),
        deleteAnnouncement: useCallback(async (id: string) => {
            try {
                const { error } = await (supabase.from('announcements' as any) as any).delete().eq('id', id);
                if (error) throw error;
                await logUserActivity('Announcement Deleted', `Deleted announcement ID: ${id}`);
                await fetchData();
            } catch (e) {
                console.warn("DB delete failed for announcement", e);
                throw e;
            }
        }, [logUserActivity, fetchData]),
        markAnnouncementAsRead: useCallback(async (id: string) => {
            if (!profile) return;
            try {
                const { error } = await (supabase.from('announcement_reads' as any) as any).insert([{ announcement_id: id, user_id: profile.id }]);
                if (error && error.code !== '23505') throw error;
                await fetchData();
            } catch (e) {
                console.warn("DB insert failed for announcement read", e);
            }
        }, [profile, fetchData])
    };
};
