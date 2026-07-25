import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users, Briefcase, LogOut, Settings, BarChart3,
  LayoutDashboard, DollarSign, Clock, FileUp, ShieldCheck, ChevronLeft, Target, Bell, FileCheck, Layers, Package, PlusCircle, Tag,
  Globe, ChevronDown, ChevronUp, FileText, MessageSquare, Building, MapPin, Calendar, Megaphone
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import { useAuth } from '../contexts/AuthContext';

import { useLeads } from '../hooks/queries/useLeads';
import { useUsers } from '../hooks/queries/useUsers';

const EfilingLogo = ({ className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <img
    src="/full-logo.png"
    alt="24 Filing"
    className={cn("object-contain", className)}
    {...props}
  />
);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavLinkItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavLinkItem[];
}

const NavLink: React.FC<{
  path: string;
  label: string;
  icon: React.ElementType;
  active?: boolean;
  onClick: () => void;
  count?: number | null;
}> = ({ path, label, icon: Icon, active, onClick, count }) => {
  return (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 w-full text-left transition-all duration-200 rounded-lg text-sm font-medium",
        active
          ? "bg-primary text-white shadow-sm font-bold border-l-2 border-primary"
          : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "text-white" : "text-slate-400")} />
      <span className="flex-1 truncate">{label}</span>
      {count != null && (
        <span className={cn(
          "text-xs font-semibold rounded-full px-2 py-0.5",
          active ? "bg-primary-foreground/20 text-white" : "bg-slate-800 text-slate-400"
        )}>
          {count}
        </span>
      )}
    </Link>
  );
};

const getInitials = (name: string) => {
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

const superAdminNav: NavSection[] = [
  {
    title: 'Core',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/cities', label: 'City Management', icon: MapPin },
      { path: '/branch-management', label: 'Branch Management', icon: Building },
      { path: '/users', label: 'User Management', icon: Users },
    ]
  },
  {
    title: 'Sales',
    items: [
      { path: '/my-day', label: 'My Day', icon: Calendar },
      { path: '/leads', label: 'All Leads', icon: Briefcase },
      { path: '/customers', label: 'Customers', icon: Users },
      { path: '/services', label: 'Services Catalog', icon: Layers },
      { path: '/targets', label: 'Sales Targets', icon: Target },
      { path: '/auto-assignment', label: 'Auto Assignment Rules', icon: Layers },
    ]
  },

  {
    title: 'Analytics',
    items: [
      { path: '/revenue', label: 'Revenue Dashboard', icon: DollarSign },
      { path: '/forecast', label: 'Revenue & Pipeline Forecast', icon: DollarSign },
      { path: '/churn', label: 'Churn Prediction', icon: ShieldCheck },
      { path: '/performance', label: 'Employee Performance', icon: BarChart3 },
      { path: '/reports', label: 'Reports & Analytics', icon: FileText },
    ]
  },
  {
    title: 'Management',
    items: [
      { path: '/invoices', label: 'Invoices & Policies', icon: FileText },
      { path: '/templates', label: 'Document Templates', icon: FileText },
      { path: '/expenses', label: 'Expense Manager', icon: DollarSign },
      { path: '/client-portal', label: 'Client Portal Simulator', icon: Users },
    ]
  },
  {
    title: 'Operations',
    items: [
      { path: '/my-day', label: 'My Day', icon: Calendar },
      { path: '/gst-calendar', label: 'GST Compliance Calendar', icon: Calendar },
      { path: '/service-delivery', label: 'Service Delivery', icon: Package },
      { path: '/renewals', label: 'Renewals & Recurring', icon: Clock },
      { path: '/attendance', label: 'Attendance & Leave', icon: Clock },
      { path: '/reminders', label: 'Reminders', icon: Calendar },
      { path: '/work-status', label: 'Work Status', icon: Briefcase },
      { path: '/announcements', label: 'Announcements', icon: Megaphone },
      { path: '/support', label: 'Support Center', icon: MessageSquare },
      { path: '/feedback', label: 'Employee Feedback', icon: ShieldCheck },
      { path: '/work-orders', label: 'Work Orders', icon: Package }
    ]
  },
  {
    title: 'Business & Web',
    items: [
      { path: '/offers', label: 'Offers & Coupons', icon: Tag },
      { path: '/payments', label: 'Payments', icon: DollarSign },
      { path: '/web', label: '24eFiling Web Dropdown', icon: Globe },
    ]
  },
  {
    title: 'Communication',
    items: [
      { path: '/whatsapp', label: 'WhatsApp Chats', icon: MessageSquare },
      { path: '/team-chat', label: 'Internal Team Chat', icon: MessageSquare },
      { path: '/automation', label: 'Workflow Automations', icon: Layers }
    ]
  },
  {
    title: 'System',
    items: [
      { path: '/integrations', label: 'Integrations & APIs', icon: Settings },
      { path: '/activity', label: 'Activity Feed', icon: Clock },
      { path: '/notifications', label: 'Notifications', icon: Bell },
      { path: '/settings', label: 'System Settings', icon: Settings },
    ]
  }
];

const adminNav: NavSection[] = [
  {
    title: 'Core',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/users', label: 'User Management', icon: Users },
    ]
  },
  {
    title: 'Sales',
    items: [
      { path: '/leads', label: 'All Leads', icon: Briefcase },
      { path: '/leads/new', label: 'Create New Lead', icon: PlusCircle },
      { path: '/my-leads', label: 'My Leads', icon: Target },
      { path: '/lead-workflow', label: 'Lead Workflow', icon: Target },
      { path: '/customers', label: 'Customers', icon: Users },
      { path: '/services', label: 'Services Catalog', icon: Layers },
    ]
  },

  {
    title: 'Analytics',
    items: [
      { path: '/revenue', label: 'Revenue Dashboard', icon: DollarSign },
      { path: '/performance', label: 'Employee Performance', icon: BarChart3 },
      { path: '/reports', label: 'Reports & Analytics', icon: FileText },
    ]
  },
  {
    title: 'People',
    items: [
      { path: '/team', label: 'Team Management', icon: ShieldCheck },
      { path: '/verify-documents', label: 'Document Verification', icon: FileCheck },
    ]
  },
  {
    title: 'Management',
    items: [
      { path: '/invoices', label: 'Invoices & Policies', icon: FileText },
    ]
  },
  {
    title: 'Operations',
    items: [
      { path: '/reminders', label: 'Reminders', icon: Calendar },
      { path: '/work-status', label: 'Work Status', icon: Briefcase },
      { path: '/announcements', label: 'Announcements', icon: Megaphone },
      { path: '/support', label: 'Support Center', icon: MessageSquare },
      { path: '/feedback', label: 'Employee Feedback', icon: ShieldCheck },
      { path: '/work-orders', label: 'Work Orders', icon: Package }
    ]
  },
  {
    title: 'Communication',
    items: [
      { path: '/team-chat', label: 'Internal Team Chat', icon: MessageSquare }
    ]
  },
  {
    title: 'System',
    items: [
      { path: '/notifications', label: 'Notifications', icon: Bell },
      { path: '/settings', label: 'Settings', icon: Settings },
    ]
  }
];

const salesExecNav: NavSection[] = [
  {
    title: 'Core',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Sales',
    items: [
      { path: '/leads/new', label: 'Create New Lead', icon: PlusCircle },
      { path: '/my-leads', label: 'My Leads', icon: Target },
      { path: '/customers', label: 'Customers', icon: Users },
      { path: '/services', label: 'Services Catalog', icon: Layers },
    ]
  },

  {
    title: 'Analytics',
    items: [
      { path: '/performance', label: 'My Performance', icon: BarChart3 },
    ]
  },
  {
    title: 'Management',
    items: [
      { path: '/invoices', label: 'Invoices & Policies', icon: FileText },
      { path: '/follow-ups', label: 'Follow-ups', icon: Clock },
      { path: '/client-documents', label: 'Client Documents', icon: FileUp },
    ]
  },
  {
    title: 'Operations',
    items: [
      { path: '/reminders', label: 'Reminders', icon: Calendar },
      { path: '/work-status', label: 'Work Status', icon: Briefcase },
      { path: '/announcements', label: 'Announcements', icon: Megaphone },
      { path: '/support', label: 'Support Center', icon: MessageSquare },
      { path: '/feedback', label: 'Employee Feedback', icon: ShieldCheck },
      { path: '/work-orders', label: 'Work Orders', icon: Package }
    ]
  },
  {
    title: 'Communication',
    items: [
      { path: '/team-chat', label: 'Internal Team Chat', icon: MessageSquare }
    ]
  },
  {
    title: 'System',
    items: [
      { path: '/notifications', label: 'Notifications', icon: Bell },
      { path: '/settings', label: 'Settings', icon: Settings },
    ]
  }
];

const WebMenuDropdown: React.FC<{
  currentPath: string;
  onClick: () => void;
}> = ({ currentPath, onClick }) => {
  const isWebPath = currentPath.startsWith('/web');
  const [isOpen, setIsOpen] = useState(isWebPath);

  useEffect(() => {
    if (isWebPath) setIsOpen(true);
  }, [isWebPath]);

  const subItems = [
    { path: '/web', label: '24efiling Web', icon: Globe },
    { path: '/web/leads', label: 'Web Leads', icon: MessageSquare },
    { path: '/web/blogs', label: 'Blogs', icon: FileText },
    { path: '/web/testimonials', label: 'Testimonials', icon: MessageSquare },
    { path: '/web/services', label: 'Services', icon: Layers }
  ];

  return (
    <div className="flex flex-col gap-1 w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 w-full text-left transition-all duration-200 rounded-md text-sm font-medium",
          isWebPath ? "text-white bg-white/10" : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
        )}
      >
        <Globe className="h-4 w-4 text-slate-400" />
        <span className="flex-1 truncate">24eFiling Web</span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-1 pl-4 mt-1 border-l border-slate-800 ml-5 transition-all duration-150">
          {subItems.map((item) => {
            const Icon = item.icon;
            const active = currentPath === item.path || (currentPath === '/web' && item.path === '/web');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClick}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 w-full text-left transition-all duration-150 rounded-md text-xs font-medium",
                  active ? "text-white bg-primary font-bold shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", active ? "text-white" : "text-slate-500")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { profile: currentUser, logout } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const { data: leads = [] } = useLeads();
  const { data: users = [] } = useUsers();

  if (!currentUser) return null;

  const userRole = currentUser.role;

  let navSections: NavSection[] = [];
  switch (userRole) {
    case 'Super Admin':
      navSections = superAdminNav;
      break;
    case 'Admin':
    case 'Branch Manager':
      navSections = adminNav;
      break;
    case 'Sales Executive':
      navSections = salesExecNav;
      break;
  }

  const handleNavClick = () => {
    if (window.innerWidth < 768) onClose();
  }

  const getPageCount = (path: string): number | null => {
    if (path === '/users') return users.length;
    if (path === '/leads') return leads.length;
    if (path === '/my-leads') {
      const myLeadsCount = leads.filter(l => l.created_by === currentUser?.id).length;
      return myLeadsCount > 0 ? myLeadsCount : null;
    }
    
    // Simplistic count calculation, would ideally come from server
    if (path === '/follow-ups') {
      let count = 0;
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      
      const relevantLeads = leads.filter(l => ['Super Admin', 'Admin'].includes(userRole) || l.assigned_to?.id === currentUser?.id || l.created_by === currentUser?.id);
      relevantLeads.forEach(lead => {
        if (lead.next_follow_up) {
           const d = new Date(lead.next_follow_up);
           if (d <= now && lead.status !== 'Success' && lead.status !== 'Lost') count++;
        }
        lead.tasks?.forEach(task => {
           if (!task.is_completed && task.due_date) {
              const d = new Date(task.due_date);
              if (d <= now) count++;
           }
        });
      });
      return count > 0 ? count : null;
    }
    return null;
  }

  return (
    <>
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 flex flex-col glass-sidebar text-slate-100 transition-transform duration-300 ease-in-out border-r border-white/5",
        "md:static md:translate-x-0 md:flex-shrink-0",
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/5 shrink-0">
          <Link to="/" onClick={handleNavClick} className="flex items-center gap-2 text-white px-2">
            <EfilingLogo className="h-12 w-auto" />
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden text-slate-400 hover:text-white hover:bg-white/5">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-6">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
                  {section.title}
                </h4>
                {section.items.map((link) => {
                  if (link.label === '24eFiling Web Dropdown') {
                    return (
                      <WebMenuDropdown
                        key="web-menu-dropdown"
                        currentPath={currentPath}
                        onClick={handleNavClick}
                      />
                    );
                  }
                  // Highlight exact match for root, or startsWith for subroutes
                  const active = currentPath === link.path || (link.path !== '/' && currentPath.startsWith(link.path));
                  return (
                    <NavLink
                      key={link.path}
                      path={link.path}
                      label={link.label}
                      icon={link.icon}
                      active={active}
                      onClick={handleNavClick}
                      count={getPageCount(link.path)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

      </aside>
      
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={onClose}
        ></div>
      )}
    </>
  );
};