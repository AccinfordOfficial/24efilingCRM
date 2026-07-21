import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DialogRoot, DialogContent } from './ui/Dialog';
import { SearchIcon, UserIcon, BriefcaseIcon, FileTextIcon } from './icons';
import { History, ArrowRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { Lead, Customer, User, Payment } from '../types';

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

type SearchResultItem =
    | { type: 'lead'; id: string; title: string; subtitle: string; url: string }
    | { type: 'customer'; id: string; title: string; subtitle: string; url: string }
    | { type: 'user'; id: string; title: string; subtitle: string; url: string }
    | { type: 'invoice'; id: string; title: string; subtitle: string; url: string }
    | { type: 'action'; id: string; title: string; subtitle: string; url: string; actionType: string }
    | { type: 'history'; id: string; title: string; subtitle: string; url: string; query: string };

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { leads, customers, users, invoices } = useApi({ fetchOnMount: false });

    const [query, setQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);

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

    // Perform clientside search filtering
    const searchResults = useMemo(() => {
        const q = query.trim().toLowerCase();
        const results: SearchResultItem[] = [];

        // Standard actions
        const actions: SearchResultItem[] = [
            { type: 'action', id: 'act-create-lead', title: 'Create New Lead', subtitle: 'Open the lead creator page', url: '/leads/new', actionType: 'create-lead' },
            { type: 'action', id: 'act-invoice', title: 'Invoice Tracker', subtitle: 'Manage billing and tracking', url: '/payments', actionType: 'invoice' },
            { type: 'action', id: 'act-add-user', title: 'Add System User', subtitle: 'Register a new employee', url: '/users', actionType: 'add-user' }
        ];

        if (!q) {
            // Show recent searches + quick actions when query is empty
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
            return [...results, ...actions];
        }

        // 1. Search Leads
        leads?.forEach(lead => {
            const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase();
            const businessName = (lead.business_name || '').toLowerCase();
            const phone = (lead.phone_number || '').toLowerCase();
            const email = (lead.email || '').toLowerCase();
            const refNum = (lead.reference_number || '').toLowerCase();
            const pan = (lead.pan_number || '').toLowerCase();

            if (
                fullName.includes(q) ||
                businessName.includes(q) ||
                phone.includes(q) ||
                email.includes(q) ||
                refNum.includes(q) ||
                pan.includes(q)
            ) {
                results.push({
                    type: 'lead',
                    id: lead.id,
                    title: `${lead.first_name} ${lead.last_name}`,
                    subtitle: `${lead.business_name || 'No Business'} • ${lead.reference_number || 'Lead'}`,
                    url: `/leads/${lead.id}`
                });
            }
        });

        // 2. Search Customers
        customers?.forEach(c => {
            const name = (c.name || '').toLowerCase();
            const email = (c.email || '').toLowerCase();
            const phone = (c.phone || '').toLowerCase();
            const businessName = (c.business_name || '').toLowerCase();
            const refNum = (c.reference_number || '').toLowerCase();
            const pan = (c.pan_number || '').toLowerCase();

            if (
                name.includes(q) ||
                email.includes(q) ||
                phone.includes(q) ||
                businessName.includes(q) ||
                refNum.includes(q) ||
                pan.includes(q)
            ) {
                results.push({
                    type: 'customer',
                    id: c.id,
                    title: c.name,
                    subtitle: `${c.business_name || 'Customer'} • ${c.email || c.phone}`,
                    url: `/customers/${c.id}`
                });
            }
        });

        // 3. Search Users
        users?.forEach(u => {
            const name = (u.name || '').toLowerCase();
            const email = (u.email || '').toLowerCase();
            const role = (u.role || '').toLowerCase();

            if (name.includes(q) || email.includes(q) || role.includes(q)) {
                results.push({
                    type: 'user',
                    id: u.id,
                    title: u.name,
                    subtitle: `${u.role} • ${u.email}`,
                    url: `/users`
                });
            }
        });

        // Limit to max 12 items for clean visibility
        return [...results.slice(0, 10), ...actions];
    }, [query, leads, customers, users, recentSearches]);

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
                return <BriefcaseIcon className="h-4 w-4 text-blue-500" />;
            case 'customer':
                return <UserIcon className="h-4 w-4 text-green-500" />;
            case 'user':
                return <UserIcon className="h-4 w-4 text-indigo-500" />;
            case 'invoice':
                return <FileTextIcon className="h-4 w-4 text-amber-500" />;
            case 'action':
                return <ArrowRight className="h-4 w-4 text-slate-400" />;
            case 'history':
                return <History className="h-4 w-4 text-slate-400" />;
            default:
                return <SearchIcon className="h-4 w-4 text-slate-400" />;
        }
    };

    return (
        <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden p-0 gap-0 shadow-2xl">
                {/* Search Header Input */}
                <div className="flex items-center border-b border-white/10 px-4 py-3">
                    <SearchIcon className="h-5 w-5 text-slate-400 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Search leads, customers, users, invoices..."
                        className="w-full bg-transparent border-0 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-0 outline-none"
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-900 text-xs font-mono border border-white/5 text-slate-500">
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
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                                        isActive 
                                            ? 'bg-[#1c398e] text-white shadow-md' 
                                            : 'hover:bg-white/5 text-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-1.5 rounded-md ${isActive ? 'bg-white/15' : 'bg-slate-900/80 border border-white/5'}`}>
                                            {getIcon(item.type)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                                                {item.title}
                                            </p>
                                            <p className={`text-[11px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                                                {item.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                        {item.type === 'action' ? 'Action' : item.type === 'history' ? 'Search' : 'View'}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-12 text-center text-slate-500">
                            <p className="text-sm">No results found for "{query}"</p>
                            <p className="text-xs mt-1">Try searching for name, phone, email, or business registration details.</p>
                        </div>
                    )}
                </div>

                {/* Visual Keyboard Navigation Help Footer */}
                <div className="flex justify-between items-center bg-slate-900/40 border-t border-white/5 px-4 py-2.5 text-[11px] text-slate-500 font-medium">
                    <div className="flex gap-4">
                        <span>↑↓ to navigate</span>
                        <span>↵ to select</span>
                    </div>
                    <span>24eFiling Spotlight Search</span>
                </div>
            </DialogContent>
        </DialogRoot>
    );
};
