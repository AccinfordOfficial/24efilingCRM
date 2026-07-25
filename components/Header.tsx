import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { MenuIcon, SearchIcon, BellIcon } from './icons';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';

import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import { LogOut, Sun, Moon } from 'lucide-react';


interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
  unreadCount?: number;
}

const PAGE_CONFIG: Record<string, { title: string, subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Key metrics and recent activities at a glance.' },
  '/cities': { title: 'City Management', subtitle: 'Configure operational cities and regional parameters.' },
  '/branch-management': { title: 'Branch Management', subtitle: 'Manage company branches and monitor branch-wise activity.' },
  '/users': { title: 'User Management', subtitle: 'Manage system users and their roles.' },
  '/leads': { title: 'Leads Overview', subtitle: 'Manage and track all leads in the system.' },
  '/leads/new': { title: 'Create New Lead', subtitle: 'Add a new potential customer to the system.' },
  '/lead-assignments': { title: 'Lead Assignments', subtitle: 'Review and route Head Office pending leads to sales executives.' },
  '/my-leads': { title: 'My Leads', subtitle: 'View and manage leads created by you.' },
  '/lead-workflow': { title: 'Lead Workflow', subtitle: 'Visualize and manage your sales pipeline.' },
  '/customers': { title: 'Customers', subtitle: 'View all converted leads and manage customer relationships.' },
  '/payments': { title: 'Payment Tracking', subtitle: 'Manage and track all payments in the system.' },
  '/reports': { title: 'Reports & Analytics', subtitle: 'Comprehensive business intelligence and performance metrics.' },
  '/activity': { title: 'Activity Feed', subtitle: 'Track all user actions across the system.' },
  '/settings': { title: 'System Settings', subtitle: 'Configure application and user settings.' },
  '/team': { title: 'Team Management', subtitle: 'Oversee your sales executives and their performance.' },
  '/verify-documents': { title: 'Document Verification', subtitle: 'Review and verify client documents.' },
  '/follow-ups': { title: 'Follow-ups', subtitle: 'Track and manage your upcoming follow-ups.' },
  '/client-documents': { title: 'Client Documents', subtitle: 'Manage all documents related to your clients.' },
  '/notifications': { title: 'Notifications', subtitle: 'View all your recent notifications.' },
  '/web': { title: '24eFiling Web', subtitle: 'Manage your website, articles, leads, and customer reviews.' },
  '/web/leads': { title: 'Organic Website Leads', subtitle: 'Review organic contact form queries from the main website.' },
  '/web/blogs': { title: 'Blogs Content Manager', subtitle: 'Compose educational resources and company updates.' },
  '/web/testimonials': { title: 'Client Testimonials Board', subtitle: 'Moderate client reviews, star ratings, and success quotes.' },
  '/web/services': { title: 'Manage Services', subtitle: 'Add and manage services and sub-services.' },
  '/offers': { title: 'Offers & Coupons', subtitle: 'Manage discount campaigns, coupons, and referral offers.' },
  '/forecast': { title: 'Revenue & Pipeline Forecast', subtitle: 'AI weighted probability and time-series revenue forecast.' },
  '/churn': { title: 'Churn Risk Prediction', subtitle: 'Identify at-risk accounts and automate client retention.' },
  '/gst-calendar': { title: 'GST Compliance Calendar', subtitle: 'Statutory GST filing deadlines and late fee calculator.' },
  '/team-chat': { title: 'Internal Team Chat', subtitle: 'Real-time internal collaboration and team channels.' },
};

export const Header: React.FC<HeaderProps> = ({ onMenuClick, onSearchClick, unreadCount = 0 }) => {
  const { profile: currentUser, logout } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    if (nextIsDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine title based on path
  let config = PAGE_CONFIG[location.pathname];
  if (!config) {
    if (location.pathname.startsWith('/leads/')) {
        config = { title: 'Lead Detail', subtitle: 'Viewing lead information and activity.' };
    } else if (location.pathname.startsWith('/customers/')) {
        config = { title: 'Customer Detail', subtitle: 'Viewing customer information and history.' };
    } else {
        config = { title: '24eFiling CRM', subtitle: 'Manage your business efficiently.' };
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-950/20 backdrop-blur-lg px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 md:hidden bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
          onClick={onMenuClick}
        >
          <MenuIcon className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
        <div className="hidden md:block">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{config.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{config.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
        <button 
          onClick={onSearchClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors text-xs font-medium cursor-pointer"
        >
          <SearchIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-500">
            <span>⌘</span><span>K</span>
          </kbd>
        </button>

        <button 
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-colors text-xs font-medium cursor-pointer"
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
        </button>

        <Link to="/leads/new">
          <Button 
            id="tour-header-create-lead"
            size="sm" 
            className="hidden sm:flex gap-1.5 bg-primary hover:bg-primary/95 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Create Lead
          </Button>
        </Link>

        <Link id="tour-header-notifications" to="/notifications" className="relative">
          <Button variant="ghost" size="icon" className="rounded-full relative text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5">
            <BellIcon className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-lg animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            <span className="sr-only">Toggle notifications</span>
          </Button>
        </Link>

        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1 rounded-full text-slate-800 dark:text-slate-100 select-none cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <Avatar className="h-9 w-9 border border-slate-200 dark:border-white/10">
              <AvatarImage src={currentUser?.avatar_url} alt={currentUser?.name} className="object-cover animate-fade-in" />
              <AvatarFallback className="bg-primary/20 text-primary font-bold">
                {getInitials(currentUser?.name || '')}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden md:block">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{currentUser?.name}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">{currentUser?.role}</div>
            </div>
          </div>
          {dropdownOpen && (
            <div className="absolute right-0 top-12 z-50 w-44 bg-white dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <button 
                onClick={() => { setDropdownOpen(false); logout(); }} 
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};