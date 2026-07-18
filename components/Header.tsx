import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { MenuIcon, SearchIcon, BellIcon } from './icons';
import { Button } from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';

interface HeaderProps {
  onMenuClick: () => void;
}

const PAGE_CONFIG: Record<string, { title: string, subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Key metrics and recent activities at a glance.' },
  '/branch-management': { title: 'Branch Management', subtitle: 'Manage company branches and monitor branch-wise activity.' },
  '/users': { title: 'User Management', subtitle: 'Manage system users and their roles.' },
  '/leads': { title: 'Leads Overview', subtitle: 'Manage and track all leads in the system.' },
  '/leads/new': { title: 'Create New Lead', subtitle: 'Add a new potential customer to the system.' },
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
};

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { profile: currentUser } = useAuth();
  const location = useLocation();

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
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 backdrop-blur-lg px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 md:hidden bg-white/70"
          onClick={onMenuClick}
        >
          <MenuIcon className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-slate-800">{config.title}</h1>
          <p className="text-sm text-slate-500">{config.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
        <Link to="/notifications">
          <Button variant="ghost" size="icon" className="rounded-full relative">
            <BellIcon className="h-5 w-5" />
            <span className="sr-only">Toggle notifications</span>
          </Button>
        </Link>
        <div className="relative">
          <div className="flex items-center gap-2 p-1 rounded-full text-slate-900 select-none">
            <Avatar className="h-10 w-10 border border-slate-200">
              <AvatarImage src={currentUser?.avatar_url} alt={currentUser?.name} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {getInitials(currentUser?.name || '')}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden md:block">
              <div className="text-sm font-semibold">{currentUser?.name}</div>
              <div className="text-xs text-slate-500">{currentUser?.role}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};