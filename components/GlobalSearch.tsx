import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DialogRoot, DialogContent, DialogTitle } from './ui/Dialog';
import { SearchIcon, UserIcon, BriefcaseIcon, FileTextIcon } from './icons';
import { History, ArrowRight, Compass } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

type SearchResultItem =
    | { type: 'lead'; id: string; title: string; subtitle: string; url: string; score?: number }
    | { type: 'customer'; id: string; title: string; subtitle: string; url: string; score?: number }
    | { type: 'user'; id: string; title: string; subtitle: string; url: string; score?: number }
    | { type: 'invoice'; id: string; title: string; subtitle: string; url: string; score?: number }
    | { type: 'action'; id: string; title: string; subtitle: string; url: string; actionType: string; score?: number }
    | { type: 'history'; id: string; title: string; subtitle: string; url: string; query: string; score?: number }
    | { type: 'page'; id: string; title: string; subtitle: string; url: string; score?: number };

interface AppPage {
    id: string;
    title: string;
    subtitle: string;
    url: string;
    aliases?: string[];
    allowedRoles?: UserRole[];
}

const APP_PAGES: AppPage[] = [
    // Targets & Performance (Prioritized for target queries)
    { id: 'page-targets', title: 'Sales Targets & Commissions', subtitle: 'Target achievements, quotas, and sales performance tracking', url: '/targets', allowedRoles: ['Super Admin', 'Admin', 'Branch Manager', 'Sales Executive'], aliases: ['target', 'targets', 'sales target', 'sales targets', 'commission', 'commissions', 'quota', 'achievements'] },
    { id: 'page-performance', title: 'My Performance & Targets', subtitle: 'Personal sales metrics, conversion rates, and target progress', url: '/performance', aliases: ['performance', 'my performance', 'my target', 'my targets', 'kpi'] },

    // Core Navigation
    { id: 'page-dashboard', title: 'Dashboard Overview', subtitle: 'Main metrics, KPIs, and activities', url: '/' },
    { id: 'page-my-day', title: 'My Day Command Center', subtitle: 'Daily agenda, follow-ups, and tasks', url: '/my-day', aliases: ['day', 'agenda', 'today'] },
    
    // Lead Management
    { id: 'page-leads', title: 'All Leads Directory', subtitle: 'View and filter all system leads', url: '/leads', allowedRoles: ['Super Admin', 'Admin', 'Branch Manager'], aliases: ['lead', 'leads', 'inquiry', 'inquiries'] },
    { id: 'page-my-leads', title: 'My Leads', subtitle: 'View and manage leads assigned to you', url: '/my-leads', allowedRoles: ['Sales Executive', 'Admin', 'Super Admin'], aliases: ['lead', 'my lead', 'assigned leads'] },
    { id: 'page-create-lead', title: 'Create New Lead', subtitle: 'Register a new lead with service packages', url: '/leads/new', aliases: ['add lead', 'new lead', 'create lead'] },
    { id: 'page-lead-workflow', title: 'Lead Workflow Board', subtitle: 'Kanban sales pipeline routing', url: '/lead-workflow', allowedRoles: ['Admin', 'Branch Manager'], aliases: ['kanban', 'pipeline', 'workflow'] },
    
    // Customers & Services
    { id: 'page-customers', title: 'Customers Ledger', subtitle: 'View active clients and accounts', url: '/customers', aliases: ['customer', 'customers', 'client', 'clients'] },
    { id: 'page-services', title: 'Services Catalog', subtitle: 'Explore services, pricing, and document requirements', url: '/services', aliases: ['service', 'services', 'catalog', 'pricing'] },
    
    // Reminders, Follow-ups, Documents
    { id: 'page-reminders', title: 'Reminders & Tasks', subtitle: 'Manage scheduled reminders, tasks, and alerts', url: '/reminders', aliases: ['reminder', 'reminders', 'remainder', 'remainders', 'task', 'tasks', 'todo', 'schedule'] },
    { id: 'page-follow-ups', title: 'Follow-ups & Tasks', subtitle: 'Manage upcoming lead follow-ups and due dates', url: '/follow-ups', aliases: ['followup', 'followups', 'follow-up', 'follow up', 'overdue', 'remainder', 'remainders'] },
    { id: 'page-client-documents', title: 'Client Documents', subtitle: 'Centralized document vault and file manager', url: '/client-documents', aliases: ['document', 'documents', 'doc', 'docs', 'file', 'files', 'pdf', 'upload'] },
    
    // Operations & Communication
    { id: 'page-invoices', title: 'Invoices & Billing', subtitle: 'Manage proforma invoices, payments, and GST billing', url: '/invoices', aliases: ['invoice', 'invoices', 'bill', 'billing', 'payment', 'proforma'] },
    { id: 'page-work-status', title: 'Work Status Kanban', subtitle: 'Track task execution & operational stages', url: '/work-status', aliases: ['status', 'progress', 'execution'] },
    { id: 'page-work-orders', title: 'Work Orders', subtitle: 'Dispatch and monitor active client jobs', url: '/work-orders', aliases: ['order', 'orders', 'job', 'jobs'] },
    { id: 'page-announcements', title: 'Announcements Board', subtitle: 'Company news and broadcast notices', url: '/announcements', aliases: ['announcement', 'notice', 'news'] },
    { id: 'page-support', title: 'Support Center', subtitle: 'Raise and track internal helpdesk tickets', url: '/support', aliases: ['help', 'ticket', 'support', 'issue'] },
    { id: 'page-feedback', title: 'Employee Feedback', subtitle: 'Submit employee reviews and suggestions', url: '/feedback', aliases: ['review', 'feedback', 'suggestion'] },
    { id: 'page-team-chat', title: 'Internal Team Chat', subtitle: 'Real-time internal chat channels', url: '/team-chat', aliases: ['chat', 'team chat', 'messaging'] },
    { id: 'page-notifications', title: 'Notifications Center', subtitle: 'View system alerts and assignment updates', url: '/notifications', aliases: ['notification', 'notifications', 'alert', 'alerts'] },
    { id: 'page-settings', title: 'Settings & Profile', subtitle: 'Manage your account profile, security, and preferences', url: '/settings', aliases: ['setting', 'settings', 'profile', 'password', 'security', 'theme'] },
    
    // Analytics & Management
    { id: 'page-auto-assignment', title: 'Auto Assignment Rules', subtitle: 'Setup automated lead routing', url: '/auto-assignment', allowedRoles: ['Super Admin', 'Admin'], aliases: ['assignment', 'routing', 'auto assign'] },
    { id: 'page-revenue', title: 'Revenue Dashboard', subtitle: 'Financial metrics and branch P&L breakdown', url: '/revenue', allowedRoles: ['Super Admin', 'Admin'], aliases: ['revenue', 'financials', 'sales report'] },
    { id: 'page-forecast', title: 'Revenue & Pipeline Forecast', subtitle: 'ML predictive forecast analysis', url: '/forecast', allowedRoles: ['Super Admin'], aliases: ['forecast', 'predictive'] },
    { id: 'page-churn', title: 'Churn Risk Prediction', subtitle: 'Analyze client retention and risk factors', url: '/churn', allowedRoles: ['Super Admin'], aliases: ['churn', 'retention'] },
    { id: 'page-reports', title: 'Reports & Business Intelligence', subtitle: 'Export operational reports and CSVs', url: '/reports', allowedRoles: ['Super Admin', 'Admin'], aliases: ['report', 'export', 'bi'] },
    { id: 'page-templates', title: 'Document Templates', subtitle: 'Dynamic agreement and NOC letter builder', url: '/templates', allowedRoles: ['Super Admin', 'Admin'], aliases: ['template', 'letter', 'noc'] },
    { id: 'page-expenses', title: 'Expense & Profitability Manager', subtitle: 'Track branch operational costs', url: '/expenses', allowedRoles: ['Super Admin', 'Admin'], aliases: ['expense', 'cost', 'pnl'] },
    { id: 'page-gst-calendar', title: 'GST Compliance Calendar', subtitle: 'Statutory filing due dates & late fees', url: '/gst-calendar', aliases: ['gst', 'calendar', 'tax', 'due date'] },
    { id: 'page-service-delivery', title: 'Service Delivery Tracker', subtitle: 'Kanban step tracking for client files', url: '/service-delivery', aliases: ['delivery', 'tracking'] },
    { id: 'page-renewals', title: 'Renewals & Recurring Services', subtitle: 'Manage recurring client contracts', url: '/renewals', aliases: ['renewal', 'recurring'] },
    { id: 'page-attendance', title: 'Attendance & Leave', subtitle: 'Check in/out and manage leave requests', url: '/attendance', aliases: ['attendance', 'leave', 'checkin'] },
    { id: 'page-offers', title: 'Offers & Promo Codes', subtitle: 'Manage discounts and coupons', url: '/offers', allowedRoles: ['Super Admin', 'Admin'], aliases: ['offer', 'discount', 'coupon'] },
    { id: 'page-payments', title: 'Payments Tracker', subtitle: 'Track transaction history', url: '/payments', aliases: ['payment', 'transactions'] },
    
    // Super Admin System Pages
    { id: 'page-web', title: 'Website Content Hub', subtitle: 'Blogs, testimonials, and web leads', url: '/web', allowedRoles: ['Super Admin'], aliases: ['website', 'blogs', 'web'] },
    { id: 'page-whatsapp', title: 'WhatsApp Communications', subtitle: 'WhatsApp chats and template broadcast', url: '/whatsapp', allowedRoles: ['Super Admin', 'Admin'], aliases: ['whatsapp', 'wa', 'message'] },
    { id: 'page-automation', title: 'Workflow Automations', subtitle: 'Visual rule engine', url: '/automation', allowedRoles: ['Super Admin'], aliases: ['automation', 'rules'] },
    { id: 'page-integrations', title: 'Integrations & APIs', subtitle: 'Configure SMS, Exotel, Razorpay', url: '/integrations', allowedRoles: ['Super Admin'], aliases: ['api', 'integration'] },
    { id: 'page-user-management', title: 'User Management', subtitle: 'Manage staff, roles, and branch assignments', url: '/user-management', allowedRoles: ['Super Admin'], aliases: ['users', 'staff', 'employees'] },
    { id: 'page-branch-management', title: 'Branch Management', subtitle: 'Configure branch offices and details', url: '/branch-management', allowedRoles: ['Super Admin'], aliases: ['branch', 'branches', 'offices'] },
    { id: 'page-city-management', title: 'City Management', subtitle: 'Manage operational territories and cities', url: '/city-management', allowedRoles: ['Super Admin'], aliases: ['city', 'cities', 'territory'] }
];

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const { leads, customers, users } = useApi();

    const [query, setQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);

    const userRole = profile?.role || 'Sales Executive';

    // Filter pages by current user's role
    const allowedPages = useMemo(() => {
        return APP_PAGES.filter(page => {
            if (!page.allowedRoles) return true;
            return page.allowedRoles.includes(userRole as any);
        });
    }, [userRole]);

    // Load recent searches on mount
    useEffect(() => {
        const stored = localStorage.getItem('crm_recent_searches');
        if (stored) {
            try {
                setRecentSearches(JSON.parse(stored));
            } catch (e) {
                console.error(e);
            }
        }
    }, [isOpen]);

    // Save recent search helper
    const saveRecentSearch = (term: string) => {
        if (!term.trim()) return;
        const updated = [term.trim(), ...recentSearches.filter(s => s !== term.trim())].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('crm_recent_searches', JSON.stringify(updated));
    };

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Intelligent relevance scoring search algorithm
    const searchResults = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) {
            const results: SearchResultItem[] = [];
            recentSearches.forEach((term, idx) => {
                results.push({
                    type: 'history',
                    id: `history-${idx}`,
                    title: term,
                    subtitle: 'Recent search',
                    url: '',
                    query: term
                });
            });
            const actions: SearchResultItem[] = [
                { type: 'action', id: 'act-targets', title: 'Sales Targets & Commissions', subtitle: 'View sales targets and quotas', url: '/targets', actionType: 'targets' },
                { type: 'action', id: 'act-create-lead', title: 'Create New Lead', subtitle: 'Open the lead creator page', url: '/leads/new', actionType: 'create-lead' },
                { type: 'action', id: 'act-reminders', title: 'Reminders & Tasks', subtitle: 'View active scheduled reminders', url: '/reminders', actionType: 'reminders' }
            ];
            return [...results, ...actions];
        }

        const candidateItems: SearchResultItem[] = [];

        // 1. Evaluate Pages with relevance scoring
        allowedPages.forEach(page => {
            const title = page.title.toLowerCase();
            const subtitle = page.subtitle.toLowerCase();
            const url = page.url.toLowerCase();
            const aliases = page.aliases || [];

            let score = 0;

            if (title === q) {
                score += 1000;
            } else if (title.startsWith(q)) {
                score += 600;
            } else if (title.includes(q)) {
                score += 350;
            }

            if (aliases.some(a => a.toLowerCase() === q)) {
                score += 500;
            } else if (aliases.some(a => a.toLowerCase().startsWith(q))) {
                score += 300;
            } else if (aliases.some(a => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))) {
                score += 200;
            }

            if (subtitle.includes(q)) {
                score += 100;
            }

            if (url.includes(q)) {
                score += 50;
            }

            if (score > 0) {
                candidateItems.push({
                    type: 'page',
                    id: page.id,
                    title: page.title,
                    subtitle: page.subtitle,
                    url: page.url,
                    score
                });
            }
        });

        // 2. Search Leads with relevance scoring
        (leads || []).forEach(lead => {
            const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase().trim();
            const businessName = (lead.business_name || '').toLowerCase();
            const phone = (lead.phone_number || '').toLowerCase();
            const email = (lead.email || '').toLowerCase();
            const refNum = (lead.reference_number || '').toLowerCase();

            let score = 0;
            if (fullName === q || businessName === q || refNum === q) {
                score += 800;
            } else if (fullName.startsWith(q) || businessName.startsWith(q) || refNum.startsWith(q)) {
                score += 400;
            } else if (fullName.includes(q) || businessName.includes(q) || phone.includes(q) || email.includes(q) || refNum.includes(q)) {
                score += 150;
            }

            if (score > 0) {
                candidateItems.push({
                    type: 'lead',
                    id: lead.id,
                    title: fullName || lead.business_name || 'Lead',
                    subtitle: `${lead.business_name || 'No Business'} • ${lead.reference_number || 'Lead'}`,
                    url: `/leads/${lead.id}`,
                    score
                });
            }
        });

        // 3. Search Customers with relevance scoring
        (customers || []).forEach(c => {
            const name = (c.name || '').toLowerCase();
            const email = (c.email || '').toLowerCase();
            const phone = (c.phone || '').toLowerCase();
            const businessName = (c.business_name || '').toLowerCase();
            const refNum = (c.reference_number || '').toLowerCase();

            let score = 0;
            if (name === q || businessName === q || refNum === q) {
                score += 800;
            } else if (name.startsWith(q) || businessName.startsWith(q) || refNum.startsWith(q)) {
                score += 400;
            } else if (name.includes(q) || businessName.includes(q) || phone.includes(q) || email.includes(q) || refNum.includes(q)) {
                score += 150;
            }

            if (score > 0) {
                candidateItems.push({
                    type: 'customer',
                    id: c.id,
                    title: c.name,
                    subtitle: `${c.business_name || 'Customer'} • ${c.email || c.phone}`,
                    url: `/customers/${c.id}`,
                    score
                });
            }
        });

        // 4. Search Users (Super Admin and Admin only)
        if (['Super Admin', 'Admin'].includes(userRole)) {
            (users || []).forEach(u => {
                const name = (u.name || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                const role = (u.role || '').toLowerCase();

                let score = 0;
                if (name === q) score += 700;
                else if (name.startsWith(q)) score += 350;
                else if (name.includes(q) || email.includes(q) || role.includes(q)) score += 120;

                if (score > 0) {
                    candidateItems.push({
                        type: 'user',
                        id: u.id,
                        title: u.name,
                        subtitle: `${u.role} • ${u.email}`,
                        url: `/user-management`,
                        score
                    });
                }
            });
        }

        // Sort candidate items by highest score
        candidateItems.sort((a, b) => (b.score || 0) - (a.score || 0));

        return candidateItems.slice(0, 12);
    }, [query, allowedPages, leads, customers, users, recentSearches, userRole]);

    // Keyboard Navigation inside spotlight
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % searchResults.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const activeItem = searchResults[selectedIndex];
                if (activeItem) {
                    handleSelectItem(activeItem);
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, searchResults, selectedIndex]);

    // Auto-scroll selected element into view
    useEffect(() => {
        if (resultsContainerRef.current) {
            const activeEl = resultsContainerRef.current.querySelector('[data-active="true"]');
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    const handleSelectItem = (item: SearchResultItem) => {
        if (item.type === 'history') {
            setQuery(item.query);
            setSelectedIndex(0);
            return;
        }

        saveRecentSearch(query || item.title);
        onClose();
        navigate(item.url);
    };

    const getIcon = (type: SearchResultItem['type']) => {
        switch (type) {
            case 'lead':
                return <BriefcaseIcon className="h-4 w-4 text-blue-400" />;
            case 'customer':
                return <UserIcon className="h-4 w-4 text-emerald-400" />;
            case 'user':
                return <UserIcon className="h-4 w-4 text-indigo-400" />;
            case 'invoice':
                return <FileTextIcon className="h-4 w-4 text-amber-400" />;
            case 'action':
                return <ArrowRight className="h-4 w-4 text-slate-400" />;
            case 'history':
                return <History className="h-4 w-4 text-slate-400" />;
            case 'page':
                return <Compass className="h-4 w-4 text-pink-400" />;
            default:
                return <SearchIcon className="h-4 w-4 text-slate-400" />;
        }
    };

    return (
        <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl bg-slate-900 text-slate-100 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden p-0 gap-0 shadow-2xl">
                <DialogTitle className="sr-only">Spotlight Search</DialogTitle>
                {/* Search Header Input */}
                <div className="flex items-center border-b border-white/10 px-4 py-3.5 bg-slate-950/60">
                    <SearchIcon className="h-5 w-5 text-blue-400 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Search pages (sales targets, reminders, documents, leads, customers)..."
                        className="w-full bg-transparent border-0 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-0 outline-none pr-2"
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-800 text-xs font-mono border border-white/10 text-slate-400 mr-6">
                        ESC
                    </kbd>
                </div>

                {/* Search Results Display */}
                <div 
                    ref={resultsContainerRef} 
                    className="max-h-[380px] overflow-y-auto p-2 space-y-1 custom-scrollbar text-slate-300"
                >
                    {searchResults.length > 0 ? (
                        searchResults.map((item, idx) => {
                            const isActive = idx === selectedIndex;
                            return (
                                <div
                                    key={item.id}
                                    data-active={isActive}
                                    onClick={() => handleSelectItem(item)}
                                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
                                        isActive 
                                            ? 'bg-blue-600 text-white shadow-lg' 
                                            : 'hover:bg-white/5 text-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-950/60 border border-white/10'}`}>
                                            {getIcon(item.type)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-100'}`}>
                                                {item.title}
                                            </p>
                                            <p className={`text-[11px] truncate ${isActive ? 'opacity-90 text-blue-100' : 'text-slate-400'}`}>
                                                {item.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'text-slate-400 bg-slate-800/60'}`}>
                                        {item.type === 'action' ? 'Action' : item.type === 'history' ? 'Search' : item.type === 'page' ? 'Page' : 'View'}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-12 text-center text-slate-400">
                            <p className="text-sm font-bold">No results found for "{query}"</p>
                            <p className="text-xs mt-1 text-slate-500">Try searching for "sales targets", "reminders", "documents", "leads", or "customers".</p>
                        </div>
                    )}
                </div>

                {/* Visual Keyboard Navigation Help Footer */}
                <div className="flex justify-between items-center bg-slate-950/80 border-t border-white/10 px-4 py-2.5 text-[11px] text-slate-400 font-medium">
                    <div className="flex gap-4">
                        <span>↑↓ to navigate</span>
                        <span>↵ to select</span>
                    </div>
                    <span className="font-semibold text-slate-300">24eFiling Spotlight Search</span>
                </div>
            </DialogContent>
        </DialogRoot>
    );
};

export default GlobalSearch;
