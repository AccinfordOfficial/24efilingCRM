import React, { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PageLoader } from './components/ui/PageLoader';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { supabase } from './lib/supabaseClient'; // Import supabase for storage operations
import { User, Lead, Document, Customer, Task, TaskPriority, City, Branch } from './types';
import { useToast } from './components/Toast';
import { useAuth } from './context/AuthContext';
import { useApi } from './hooks/useApi';
import { UserForm } from './components/UserForm';
import { LeadForm } from './components/LeadForm';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import { ConfirmationDialog } from './components/ui/ConfirmationDialog';
import { SuccessConversionModal } from './components/ui/SuccessConversionModal';
import { Toaster } from './components/ui/Toaster';
import { TooltipProvider } from './components/ui/Tooltip';

import { checkAndTriggerBirthdays } from './lib/birthdayScheduler';
import { checkAndTriggerOfferStatus } from './lib/offerScheduler';

// Lazy loaded page components
const DashboardOverview = lazy(() => import('./pages/DashboardOverview'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const LeadsOverview = lazy(() => import('./pages/LeadsOverview'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const TeamManagement = lazy(() => import('./pages/TeamManagement'));
const DocumentVerification = lazy(() => import('./pages/DocumentVerification'));
const PaymentTracker = lazy(() => import('./pages/PaymentTracker'));
const FollowUps = lazy(() => import('./pages/FollowUps'));
const ClientDocuments = lazy(() => import('./pages/ClientDocuments'));
const Notifications = lazy(() => import('./pages/Notifications'));
const LeadDetail = lazy(() => import('./pages/LeadDetail'));
const CreateLead = lazy(() => import('./pages/CreateLead'));
const LeadWorkflow = lazy(() => import('./pages/LeadWorkflow'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const ActivityFeed = lazy(() => import('./pages/ActivityFeed'));
const ServiceManagement = lazy(() => import('./pages/ServiceManagement'));
const OffersManagement = lazy(() => import('./pages/OffersManagement'));
const WebOverview = lazy(() => import('./pages/WebOverview'));
const WebLeadsManagement = lazy(() => import('./pages/WebLeadsManagement'));
const BlogsManagement = lazy(() => import('./pages/BlogsManagement'));
const TestimonialsManagement = lazy(() => import('./pages/TestimonialsManagement'));
const BranchManagement = lazy(() => import('./pages/BranchManagement'));
const CityManagement = lazy(() => import('./pages/CityManagement'));
const RevenueDashboard = lazy(() => import('./pages/RevenueDashboard'));
const EmployeePerformance = lazy(() => import('./pages/EmployeePerformance'));
const InvoiceManagement = lazy(() => import('./pages/InvoiceManagement'));
const PoliciesManagement = lazy(() => import('./pages/PoliciesManagement'));
const Reminders = lazy(() => import('./pages/Reminders'));
const WorkStatus = lazy(() => import('./pages/WorkStatus'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Support = lazy(() => import('./pages/Support'));
const EmployeeFeedback = lazy(() => import('./pages/EmployeeFeedback'));
const WorkOrders = lazy(() => import('./pages/WorkOrders'));
const WhatsAppDashboard = lazy(() => import('./pages/WhatsAppDashboard'));
import { GlobalFilterProvider, useGlobalFilter } from './contexts/GlobalFilterContext';
import { GlobalFilterBar } from './components/ui/GlobalFilterBar';

const PAGE_CONFIG: Record<string, { title: string, subtitle: string }> = {
  'Dashboard': { title: 'Dashboard', subtitle: 'Key metrics and recent activities at a glance.' },
  'City Management': { title: 'City Management', subtitle: 'Manage company operating cities.' },
  'Branch Management': { title: 'Branch Management', subtitle: 'Manage company branches and monitor branch-wise activity.' },
  'User Management': { title: 'User Management', subtitle: 'Manage system users and their roles.' },
  'Leads Overview': { title: 'Leads Overview', subtitle: 'Manage and track all leads in the system.' },
  'All Leads': { title: 'All Leads', subtitle: 'View and manage all leads across the system.' },
  'Lead Workflow': { title: 'Lead Workflow', subtitle: 'Visualize and manage your sales pipeline.' },
  'Customers': { title: 'Customers', subtitle: 'View all converted leads and manage customer relationships.' },
  'Payments': { title: 'Payment Tracking', subtitle: 'Manage and track all payments in the system.' },
  'Reports & Analytics': { title: 'Reports & Analytics', subtitle: 'Comprehensive business intelligence and performance metrics.' },
  'Activity Feed': { title: 'Activity Feed', subtitle: 'Track all user actions across the system.' },
  'System Settings': { title: 'System Settings', subtitle: 'Configure application and user settings.' },
  'Lead Management': { title: 'Lead Management', subtitle: 'Manage and track all team leads.' },
  'Team Management': { title: 'Team Management', subtitle: 'Oversee your sales executives and their performance.' },
  'Document Verification': { title: 'Document Verification', subtitle: 'Review and verify client documents.' },
  'Reports': { title: 'Reports', subtitle: 'Analyze team performance and track key metrics.' },
  'My Leads': { title: 'My Leads', subtitle: 'View and manage leads created by you.' },
  'Follow-ups': { title: 'Follow-ups', subtitle: 'Track and manage your upcoming follow-ups.' },
  'Client Documents': { title: 'Client Documents', subtitle: 'Manage all documents related to your clients.' },
  'Performance Report': { title: 'Performance Report', subtitle: 'Review your personal sales performance.' },
  'Notifications': { title: 'Notifications', subtitle: 'View all your recent notifications.' },
  'Lead Detail': { title: 'Lead Detail', subtitle: 'Viewing lead information and activity.' },
  'Customer Detail': { title: 'Customer Detail', subtitle: 'Viewing customer information and history.' },
  'Create New Lead': { title: 'Create New Lead', subtitle: 'Add a new potential customer to the system.' },
  'Services': { title: 'Manage Services', subtitle: 'Add and manage services and sub-services.' },
  'Offers & Coupons': { title: 'Offers & Coupons', subtitle: 'Manage discount campaigns, coupons, and referral offers.' },
  'Revenue Dashboard': { title: 'Revenue Dashboard', subtitle: 'Detailed revenue tracking, branch breakdowns, and time filters.' },
  'Employee Performance': { title: 'Employee Performance', subtitle: 'Track user conversions, rankings, and lead progression.' },
  'Invoices & Policies': { title: 'Invoices & Policies', subtitle: 'Manage billing invoices and document company terms.' },
  'Policies Management': { title: 'Policies Management', subtitle: 'Configure corporate guidelines and billing terms.' },
  '24efiling Web': { title: '24eFiling Web', subtitle: 'Manage your website, articles, leads, and customer reviews.' },
  'Web Leads': { title: 'Organic Website Leads', subtitle: 'Review organic contact form queries from the main website.' },
  'Blogs': { title: 'Blogs Content Manager', subtitle: 'Compose educational resources and company updates.' },
  'Testimonials': { title: 'Client Testimonials Board', subtitle: 'Moderate client reviews, star ratings, and success quotes.' },
  'Support': { title: 'Support Center', subtitle: 'Ticket tracking, conversation threads, and FAQ knowledge base.' },
  'Employee Feedback': { title: 'Employee Performance Feedback', subtitle: 'Manager scorecards, self-assessments, and quarterly performance reviews.' },
  'Work Orders': { title: 'Work Orders Dispatch', subtitle: 'Manage client service orders, dispatch assignments, and invoice conversions.' },
  'Reminders': { title: 'Reminders', subtitle: 'Manage personal schedule tasks and assigned team events.' },
  'Work Status': { title: 'Work Status Tracker', subtitle: 'Monitor task completion stages, workload distribution, and Kanban updates.' },
  'Announcements': { title: 'Company Announcements', subtitle: 'Corporate announcements feed, target distribution, and read receipts.' },
  'WhatsApp': { title: 'WhatsApp AI Broadcast Hub', subtitle: 'AI assistant conversational suggestions, messaging templates, and automated work order dispatch.' }
};


const uploadAvatar = async (fileData: string | undefined, fileNamePrefix: string): Promise<string | undefined> => {
  // Only upload if it's a local data: or blob: URL — otherwise it's already a remote URL, return as-is
  if (!fileData) return fileData;
  if (!fileData.startsWith('data:') && !fileData.startsWith('blob:')) return fileData;

  try {
    const res = await fetch(fileData);
    const blob = await res.blob();
    const fileExt = blob.type.split('/')[1] || 'png';
    const safePrefix = fileNamePrefix.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `user-avatars/${safePrefix}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, blob, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error("Avatar upload failed:", error);
    throw new Error("Failed to upload profile picture.");
  }
};

// Dedicated uploader for branch logos — takes the raw File object directly
const uploadBranchLogo = async (file: File): Promise<string> => {
  try {
    const fileExt = file.type.split('/')[1] || 'png';
    const fileName = `branch-logos/logo_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error("Branch logo upload failed:", error);
    throw new Error("Failed to upload branch logo.");
  }
};

function App() {
  const authData = useAuth();
  const apiData = useApi();
  const navigate = useNavigate();

  // Gracefully handle old hash routes by redirecting them
  useEffect(() => {
    if (window.location.hash && window.location.hash.startsWith('#/')) {
      const path = window.location.hash.replace('#', '');
      window.history.replaceState(null, '', path);
      navigate(path, { replace: true });
    }
  }, [navigate]);

  if (!authData.profile) {
    return <FilteredAppContent authData={authData} apiData={apiData} />;
  }

  return (
    <GlobalFilterProvider 
      currentUser={authData.profile} 
      allUsers={apiData.users} 
      allCities={apiData.cities} 
      allBranches={apiData.branches}
    >
      <FilteredAppContent authData={authData} apiData={apiData} />
    </GlobalFilterProvider>
  );
}

function FilteredAppContent({ authData, apiData }: { authData: any, apiData: any }) {
  const { session, profile, signOut, loading: authLoading, isPasswordRecovery, updateUserPassword, createUserByAdmin, refreshProfile, profileError } = authData;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toast = useToast();

  const {
    leads,
    users,
    customers,
    notifications,
    userActivities,
    services,
    loading: dataLoading,
    error: dataError,
    addLead,
    addNotification,
    updateLead,
    updateUser,
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
    refreshData,
    addService,
    updateService,
    deleteService,
    addSubService,
    updateSubService,
    deleteSubService,
    offers,
    addOffer,
    updateOffer,
    deleteOffer,
    incrementOfferUsage,
    webLeads,
    blogs,
    testimonials,
    cities,
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
    updateCustomer,
    branches,
    uploadBranchLogo,
    addBranch,
    updateBranch,
    addCity,
    updateCity,
    deleteCity,
    deleteBranch,
    invoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addInvoicePayment,
    companyPolicies,
    addPolicy,
    updatePolicy,
    deletePolicy,
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    announcements,
    addAnnouncement,
    deleteAnnouncement,
    markAnnouncementAsRead,
    tickets,
    addSupportTicket,
    updateSupportTicket,
    addTicketComment,
    addKbArticle,
    feedback,
    addEmployeeFeedback,
    updateFeedbackStatus,
    workOrders,
    addWorkOrder,
    updateWorkOrder,
    addWorkOrderNote,
    whatsappConversations,
    whatsappMessages,
    whatsappTemplates,
    sendWhatsAppMessage,
    addWhatsAppTemplate,
    syncWhatsAppConversations,
    transferUser,
    transferLogs,
    auditLogs
  } = apiData;

  const viewProfile = profile;

  // ── ROLE-SCOPED BASE ARRAYS ──────────────────────────────────────────────
  const roleScopedUsers = React.useMemo(() => {
    if (!viewProfile) return [];
    if (viewProfile.role === 'Super Admin') return users;
    if (viewProfile.role === 'Admin' || viewProfile.role === 'Branch Manager') {
      return users.filter(u => u.branch_id === viewProfile.branch_id);
    }
    return users.filter(u => u.id === viewProfile.id);
  }, [users, viewProfile]);

  const roleScopedLeads = React.useMemo(() => {
    if (!viewProfile) return [];
    if (viewProfile.role === 'Super Admin') return leads;
    if (viewProfile.role === 'Admin' || viewProfile.role === 'Branch Manager') {
      return leads.filter(lead => lead.branch_id === viewProfile.branch_id || lead.assigned_to?.branch_id === viewProfile.branch_id || lead.branch_name === viewProfile.branch_name);
    }
    return leads.filter(lead =>
      lead.assigned_to?.id === viewProfile.id ||
      lead.created_by === viewProfile.id
    );
  }, [leads, viewProfile]);

  const roleScopedCustomers = React.useMemo(() => {
    if (!viewProfile) return [];
    if (viewProfile.role === 'Super Admin') return customers;
    if (viewProfile.role === 'Admin' || viewProfile.role === 'Branch Manager') {
      return customers.filter(c => c.branch_id === viewProfile.branch_id || c.assigned_to?.branch_id === viewProfile.branch_id);
    }
    return customers.filter(c => c.assigned_to?.id === viewProfile.id || c.created_by?.id === viewProfile.id);
  }, [customers, viewProfile]);

  const roleScopedActivities = React.useMemo(() => {
    if (!viewProfile) return [];
    if (viewProfile.role === 'Super Admin') return userActivities;
    if (viewProfile.role === 'Admin' || viewProfile.role === 'Branch Manager') {
      const branchUserIds = roleScopedUsers.map(u => u.id);
      return userActivities.filter(a => branchUserIds.includes(a.user_id));
    }
    return userActivities.filter(a => a.user_id === viewProfile.id);
  }, [userActivities, roleScopedUsers, viewProfile]);

  const { cityId, branchId, adminId, employeeId, leadSourceId, dateRange: globalDateRange, availableCities, availableBranches } = profile ? useGlobalFilter() : { cityId: 'All Cities', branchId: 'All Branches', adminId: 'All Managers', employeeId: 'All Employees', leadSourceId: 'All Sources', dateRange: {from: undefined, to: undefined}, availableCities: [] as City[], availableBranches: [] as Branch[] };

  // ── GLOBALLY FILTERED ARRAYS ──────────────────────────────────────────────
  const globallyFilteredUsers = React.useMemo(() => {
    let res = roleScopedUsers;
    if (cityId !== 'All Cities') res = res.filter((u: any) => u.city_id === cityId || u.city_name === cityId);
    if (branchId !== 'All Branches') res = res.filter((u: any) => u.branch_id === branchId || u.branch_name === branchId);
    if (adminId !== 'All Managers') res = res.filter((u: any) => u.reporting_to === adminId || u.id === adminId);
    if (employeeId !== 'All Employees') res = res.filter((u: any) => u.id === employeeId);
    return res;
  }, [roleScopedUsers, cityId, branchId, adminId, employeeId]);

  const globallyFilteredLeads = React.useMemo(() => {
    let res = roleScopedLeads;
    if (cityId !== 'All Cities') res = res.filter((l: any) => { const u = roleScopedUsers.find((x: any) => x.id === (l.assigned_to?.id || l.created_by)); return u?.city_id === cityId || u?.city_name === cityId; });
    if (branchId !== 'All Branches') res = res.filter((l: any) => l.branch_id === branchId || (l.assigned_to?.branch_id === branchId) || l.branch_name === branchId);
    if (adminId !== 'All Managers') res = res.filter((l: any) => { const u = roleScopedUsers.find((x: any) => x.id === (l.assigned_to?.id || l.created_by)); return u?.reporting_to === adminId || u?.id === adminId; });
    if (employeeId !== 'All Employees') res = res.filter((l: any) => l.assigned_to?.id === employeeId || l.created_by === employeeId);
    if (leadSourceId !== 'All Sources') res = res.filter((l: any) => l.lead_source_id === leadSourceId);
    if (globalDateRange?.from) res = res.filter((l: any) => new Date(l.created_at) >= globalDateRange.from!);
    if (globalDateRange?.to) res = res.filter((l: any) => new Date(l.created_at) <= globalDateRange.to!);
    return res;
  }, [roleScopedLeads, roleScopedUsers, cityId, branchId, adminId, employeeId, leadSourceId, globalDateRange]);

  const globallyFilteredCustomers = React.useMemo(() => {
    let res = roleScopedCustomers;
    if (cityId !== 'All Cities') res = res.filter((c: any) => { const l = roleScopedLeads.find((x: any) => x.id === c.lead_id); const u = roleScopedUsers.find((x: any) => x.id === (c.assigned_to?.id || l?.assigned_to?.id)); return u?.city_id === cityId || u?.city_name === cityId; });
    if (branchId !== 'All Branches') res = res.filter((c: any) => { const l = roleScopedLeads.find((x: any) => x.id === c.lead_id); return l?.branch_id === branchId || c.assigned_to?.branch_id === branchId; });
    if (adminId !== 'All Managers') res = res.filter((c: any) => { const l = roleScopedLeads.find((x: any) => x.id === c.lead_id); const u = roleScopedUsers.find((x: any) => x.id === (c.assigned_to?.id || l?.assigned_to?.id)); return u?.reporting_to === adminId || u?.id === adminId; });
    if (employeeId !== 'All Employees') res = res.filter((c: any) => c.assigned_to?.id === employeeId);
    if (leadSourceId !== 'All Sources') res = res.filter((c: any) => c.lead_source_id === leadSourceId);
    if (globalDateRange?.from) res = res.filter((c: any) => new Date(c.created_at || Date.now()) >= globalDateRange.from!);
    if (globalDateRange?.to) res = res.filter((c: any) => new Date(c.created_at || Date.now()) <= globalDateRange.to!);
    return res;
  }, [roleScopedCustomers, roleScopedLeads, roleScopedUsers, cityId, branchId, adminId, employeeId, leadSourceId, globalDateRange]);

  const globallyFilteredActivities = React.useMemo(() => {
    let res = roleScopedActivities;
    if (globalDateRange?.from) res = res.filter((a: any) => new Date(a.timestamp) >= globalDateRange.from!);
    if (globalDateRange?.to) res = res.filter((a: any) => new Date(a.timestamp) <= globalDateRange.to!);
    if (employeeId !== 'All Employees') res = res.filter((a: any) => a.user_id === employeeId);
    return res;
  }, [roleScopedActivities, employeeId, globalDateRange]);



  const [userManagementBranchFilter, setUserManagementBranchFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForCustomerCreation, setLeadForCustomerCreation] = useState<Lead | null>(null);




  // Daily birthday scheduler check upon login/load
  useEffect(() => {
    if (customers.length > 0 && viewProfile && users.length > 0) {
      checkAndTriggerBirthdays(customers, viewProfile, users, addNotification, addTaskToLead);
    }
  }, [customers, viewProfile, users, addNotification, addTaskToLead]);

  // Daily offer scheduler check upon login/load
  useEffect(() => {
    if (offers.length > 0 && viewProfile && users.length > 0) {
      checkAndTriggerOfferStatus(offers, viewProfile, users, addNotification, updateOffer);
    }
  }, [offers, viewProfile, users, addNotification, updateOffer]);

  // Real-time task and follow-up due time checker (runs every 10 seconds)
  const notifiedTasksRef = useRef<Set<string>>(new Set());
  const notifiedFollowUpsRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (!profile || leads.length === 0) return;

    const checkTasksInterval = setInterval(async () => {
      const now = new Date();

      for (const lead of globallyFilteredLeads) {
        // 1. Check General Lead Follow-Up due dates
        if (lead.next_follow_up && lead.status !== 'Success' && lead.status !== 'Lost') {
          const followUpDate = new Date(lead.next_follow_up);
          if (followUpDate <= now) {
            const fuRefTag = `(FollowUpRef: ${lead.id}-${lead.next_follow_up.split('T')[0]})`;
            const alreadyNotifiedInState = notifications.some(n =>
              n.message && n.message.includes(fuRefTag)
            );
            const alreadyNotifiedInRef = notifiedFollowUpsRef.current.has(fuRefTag);

            if (!alreadyNotifiedInState && !alreadyNotifiedInRef) {
              notifiedFollowUpsRef.current.add(fuRefTag);
              const targetUserId = lead.assigned_to?.id || lead.created_by || profile.id;

              try {
                await addNotification({
                  user_id: targetUserId,
                  type: 'Status Updated',
                  title: '⏰ Follow-Up Reminder Due!',
                  message: `Scheduled follow-up for lead "${lead.business_name || (lead.first_name + ' ' + lead.last_name)}" is due now. ${fuRefTag}`,
                  link: { page: 'Lead Detail', id: lead.id }
                });

                if (targetUserId === profile.id) {
                  toast.addToast(`Follow-up due: "${lead.business_name || (lead.first_name + ' ' + lead.last_name)}"`, 'info');
                }
              } catch (e) {
                console.error("Failed to create follow-up notification", e);
                notifiedFollowUpsRef.current.delete(fuRefTag);
              }
            }
          }
        }

        // 2. Check Individual Task due dates
        if (!lead.tasks || lead.tasks.length === 0) continue;

        for (const task of lead.tasks) {
          if (task.is_completed || !task.due_date) continue;

          const dueDate = new Date(task.due_date);
          if (dueDate <= now) {
            const taskRefTag = `(Ref: ${task.id})`;
            const alreadyNotifiedInState = notifications.some(n =>
              n.message && n.message.includes(taskRefTag)
            );
            const alreadyNotifiedInRef = notifiedTasksRef.current.has(task.id);

            if (!alreadyNotifiedInState && !alreadyNotifiedInRef) {
              notifiedTasksRef.current.add(task.id);

              const targetUserId = lead.assigned_to?.id || task.created_by?.id || profile.id;

              try {
                await addNotification({
                  user_id: targetUserId,
                  type: 'Note Added',
                  title: '⏰ Task Reminder Due!',
                  message: `Scheduled task "${task.content}" is due now for lead "${lead.business_name || (lead.first_name + ' ' + lead.last_name)}". ${taskRefTag}`,
                  link: { page: 'Lead Detail', id: lead.id }
                });

                if (targetUserId === profile.id) {
                  toast.addToast(`Task Due: "${task.content}"`, 'info');
                }
              } catch (e) {
                console.error("Failed to create task due notification", e);
                notifiedTasksRef.current.delete(task.id);
              }
            }
          }
        }
      }
    }, 10000);

    return () => clearInterval(checkTasksInterval);
  }, [leads, notifications, profile, addNotification, toast]);

  const filteredLeads = useMemo(() => {
    const { from, to } = dateRange;
    if (!from && !to) {
      return leads;
    }
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    return leads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      if (fromDate && leadDate < fromDate) return false;
      if (toDate && leadDate > toDate) return false;
      return true;
    });
  }, [leads, dateRange]);

  const filteredUsers = useMemo(() => {
    const { from, to } = dateRange;
    if (!from && !to) {
      return users;
    }
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    return users.filter(user => {
      const userDate = new Date(user.created_at);
      if (fromDate && userDate < fromDate) return false;
      if (toDate && userDate > toDate) return false;
      return true;
    });
  }, [users, dateRange]);

  const userLeads = useMemo(() => {
    if (!viewProfile) return [];
    if (viewProfile.role === 'Super Admin') {
      return filteredLeads;
    }
    if (viewProfile.role === 'Admin' || viewProfile.role === 'Branch Manager') {
      return filteredLeads.filter(lead => lead.branch_id === viewProfile.branch_id || lead.assigned_to?.branch_id === viewProfile.branch_id || lead.branch_name === viewProfile.branch_name);
    }
    // Sales Exec can see:
    // 1. Leads assigned to them
    // 2. Leads created by them (regardless of current assignment)
    return filteredLeads.filter(lead =>
      lead.assigned_to?.id === viewProfile.id ||
      lead.created_by === viewProfile.id
    );
  }, [filteredLeads, viewProfile]);

  const userNotifications = useMemo(() => {
    if (!profile) return [];
    return notifications.filter(n => n.user_id === profile.id);
  }, [notifications, profile]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter(n => !n.is_read).length;
  }, [userNotifications]);

  const myLeads = useMemo(() => {
    if (!viewProfile) return [];
    // "My Leads" shows only leads created by the current user
    return filteredLeads.filter(lead => lead.created_by === viewProfile.id);
  }, [filteredLeads, viewProfile]);

  const leadsForPayments = useMemo(() => {
    return userLeads.filter(lead => ['Documents & Payments', 'Success', 'Lost'].includes(lead.status))
  }, [userLeads]);

  const activeUsers = useMemo(() => users.filter(u => u.is_active), [users]);

  const salesExecutives = useMemo(() => users.filter(u => u.role === 'Sales Executive'), [users]);
  const activeSalesExecutives = useMemo(() => salesExecutives.filter(u => u.is_active), [salesExecutives]);

  // Wrapped handlers in useCallback to prevent re-creation on every render,
  // fixing infinite loops and improving performance.
  const handlePasswordUpdate = useCallback(async (password: string) => {
    await updateUserPassword(password);
    toast.addToast('Password updated successfully! Please sign in again.', 'success');
    await signOut();
  }, [updateUserPassword, toast, signOut]);

  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);
  const handleNavigate = useCallback((page: string) => {
    const pageToPath: Record<string, string> = {
      'Dashboard': '/',
      'All Leads': '/leads',
      'Create New Lead': '/leads/new',
      'My Leads': '/my-leads',
      'Lead Workflow': '/lead-workflow',
      'Customers': '/customers',
      'Reports & Analytics': '/reports',
      'Payments': '/payments',
      'Activity Feed': '/activity',
      'User Management': '/users',
      'Branch Management': '/branch-management',
      'Team': '/team',
      'Verify Documents': '/verify-documents',
      'Follow-ups': '/follow-ups',
      'Client Documents': '/client-documents',
      'Notifications': '/notifications',
      'Settings': '/settings',
      'Offers': '/offers',
      'Web Leads': '/web',
      'Revenue Dashboard': '/revenue',
      'Employee Performance': '/performance',
      'Invoices & Policies': '/invoices',
      'Policies Management': '/policies',
      'Reminders': '/reminders',
      'Work Status': '/work-status',
      'Announcements': '/announcements',
      'Support': '/support',
      'Employee Feedback': '/feedback',
      'Work Orders': '/work-orders',
      'WhatsApp': '/whatsapp'
    };
    if (pageToPath[page]) {
      navigate(pageToPath[page]);
    }
  }, [navigate]);

  const handleViewLead = useCallback((leadId: string) => {
    navigate('/leads/' + leadId);
  }, [navigate]);

  const handleViewCustomer = useCallback((customerId: string) => {
    navigate('/customers/' + customerId);
  }, [navigate]);

  const handleBackFromDetail = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleNavigateToCreateLead = useCallback(() => {
    navigate('/leads/new');
  }, [navigate]);

  const handleCancelCreateLead = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleAddLead = useCallback(async (leadData: Omit<Lead, 'id' | 'created_at' | 'last_contacted' | 'status' | 'assigned_to'>, assignedToId: string | null) => {
    if (!profile) return;
    try {
      let assigned_to: User | undefined = undefined;
      // HEAD_OFFICE is a special sentinel value — treat as unassigned (goes to central pool)
      if (assignedToId && assignedToId !== 'HEAD_OFFICE') {
        assigned_to = users.find(u => u.id === assignedToId);
        if (!assigned_to) {
          toast.addToast('Error: Could not find the selected user to assign.', 'error');
          return;
        }
      }

      const totalPaymentFromSets = leadData.service_sets?.reduce((total, set) =>
        total + set.subservices.reduce((subTotal, sub) => subTotal + (sub.amount * sub.quantity) + (Number(sub.tax_amount) || 0), 0) + (Number(set.service_fee) || 0), 0) || 0;

      const requestedServices = leadData.service_sets?.flatMap(s => s.subservices.map(sub => sub.name));
      const serviceRequestedString = requestedServices && requestedServices.length > 0 ? requestedServices.join(', ') : 'No service specified';

      const newLeadData = {
        ...leadData,
        status: 'New Lead' as Lead['status'],
        assigned_to: assigned_to,
        total_payment: totalPaymentFromSets,
        service_requested: serviceRequestedString,
        // Tag lead as Head Office assignment in notes if applicable
        notes: assignedToId === 'HEAD_OFFICE'
          ? `[Assigned to Head Office]\n${leadData.notes || ''}`.trim()
          : leadData.notes,
      };

      await addLead(newLeadData);
      toast.addToast('Lead created successfully!', 'success');
      navigate(-1);
    } catch (error: any) {
      toast.addToast(`Error: ${error.message}`, 'error');
    }
  }, [profile, users, addLead, toast, navigate]);

  const handleUpdateLead = useCallback(async (leadData: Lead) => {
    const originalLead = leads.find(l => l.id === leadData.id);

    setIsLeadFormOpen(false);
    setEditingLead(null);

    if (originalLead && originalLead.status !== 'Success' && leadData.status === 'Success') {
      setLeadForCustomerCreation(leadData);
    } else {
      try {
        await updateLead(leadData);
        toast.addToast('Lead updated successfully!', 'success');
      } catch (error: any) {
        toast.addToast(`Error: ${error.message}`, 'error');
      }
    }
  }, [leads, updateLead, toast]);

  const handleConfirmCustomerCreation = useCallback(async (dob: string, pan: string, aadhar: string) => {
    if (!leadForCustomerCreation) return;
    try {
      const updatedLead = {
        ...leadForCustomerCreation,
        pan_number: pan || leadForCustomerCreation.pan_number
      };
      await updateLead(updatedLead, true, dob, aadhar);
      toast.addToast('Lead converted and customer created!', 'success');
      setLeadForCustomerCreation(null);
    } catch (error: any) {
      toast.addToast(`Error: ${error.message}`, 'error');
      setLeadForCustomerCreation(null);
      refreshData();
    }
  }, [leadForCustomerCreation, updateLead, toast, refreshData]);

  const handleCancelCustomerCreation = useCallback(() => {
    setLeadForCustomerCreation(null);
    toast.addToast('Conversion cancelled. Date of birth is mandatory for Success stage.', 'warning');
    refreshData();
  }, [refreshData, toast]);

  const handleAddUser = useCallback(async (userData: Omit<User, 'id'> & { password?: string }) => {
    try {
      if (!userData.password || !userData.email || !userData.name) {
        throw new Error("Name, email, and password are required to create a new user.");
      }

      const avatarUrl = await uploadAvatar(userData.avatar_url, userData.email);

      await createUserByAdmin({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        branch_id: userData.branch_id,
        is_active: userData.is_active,
        phone_number: userData.phone_number,
        department: userData.department,
        skills: userData.skills,
        avatar_url: avatarUrl,
        date_of_birth: userData.date_of_birth,
        gender: userData.gender,
        reporting_to: userData.reporting_to,
        employee_code: userData.employee_code
      });
      toast.addToast(`User created. An invitation has been sent to ${userData.email}.`, 'success');
      await refreshData(); // Force refresh to show new user
    } catch (error: any) {
      toast.addToast(`Error creating user: ${error.message}`, 'error');
    }
  }, [createUserByAdmin, toast, refreshData]);

  const handleUpdateUser = useCallback(async (userData: User) => {
    try {
      const avatarUrl = await uploadAvatar(userData.avatar_url, userData.email);
      await updateUser({ ...userData, avatar_url: avatarUrl });
      toast.addToast(`Profile for ${userData.name} has been updated.`, 'success');
    } catch (error: any) {
      toast.addToast(`Error updating profile: ${error.message}`, 'error');
    }
  }, [updateUser, toast]);

  const handleOpenUserForm = useCallback((user: User | null) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  }, []);

  const handleSaveUser = useCallback(async (userData: (User | Omit<User, 'id'>) & { password?: string }) => {
    if ('id' in userData) {
      await handleUpdateUser(userData);
    } else {
      await handleAddUser(userData);
    }
    setIsUserFormOpen(false);
  }, [handleUpdateUser, handleAddUser]);

  const handleOpenLeadForm = useCallback((lead: Lead | null) => {
    setEditingLead(lead);
    setIsLeadFormOpen(true);
  }, []);

  const handleSaveLead = useCallback(async (leadData: Lead | Omit<Lead, 'id' | 'created_at' | 'last_contacted'>) => {
    if ('id' in leadData) {
      await handleUpdateLead(leadData);
    }
    setIsLeadFormOpen(false);
    setEditingLead(null);
  }, [handleUpdateLead]);

  const handleBulkUpdateLeads = useCallback(async (leadIds: string[], updates: Partial<Omit<Lead, 'id'>>) => {
    if (leadIds.length === 0) return;
    try {
      await updateMultipleLeads(leadIds, updates);
      const count = leadIds.length;
      toast.addToast(`${count} lead${count > 1 ? 's' : ''} updated successfully.`, 'success');
    } catch (error: any) {
      toast.addToast(`Error: ${error.message}`, 'error');
    }
  }, [updateMultipleLeads, toast]);

  const handleBulkDeleteLeads = useCallback(async (leadIds: string[]) => {
    if (leadIds.length === 0) return;
    try {
      await deleteMultipleLeads(leadIds);
      const count = leadIds.length;
      toast.addToast(`${count} lead${count > 1 ? 's' : ''} deleted successfully.`, 'success');
    } catch (error: any) {
      toast.addToast(`Error: ${error.message}`, 'error');
    }
  }, [deleteMultipleLeads, toast]);

  const handleBulkDeleteUsers = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    try {
      await deleteMultipleUsers(userIds);
      const count = userIds.length;
      toast.addToast(`${count} user${count > 1 ? 's' : ''} deleted successfully.`, 'success');
    } catch (error: any) {
      toast.addToast(`Error: ${error.message}`, 'error');
    }
  }, [deleteMultipleUsers, toast]);

  const handleAddActivity = useCallback((leadId: string, content: string) => {
    if (!profile) return;
    addActivityToLead(leadId, {
      type: 'Note',
      content,
    }, profile);
    toast.addToast('Note added successfully.', 'info');
  }, [profile, addActivityToLead, toast]);

  const handleUploadDocument = useCallback(async (leadId: string, file: File, docType: string) => {
    if (!profile) return;
    try {
      await uploadDocument(leadId, file, docType, profile.id);
      toast.addToast('Document uploaded successfully!', 'success');
    } catch (error: any) {
      toast.addToast(`Error: ${error.message}`, 'error');
    }
  }, [profile, uploadDocument, toast]);

  const handleDeleteDocument = useCallback(async (leadId: string, docId: string) => {
    try {
      await deleteDocument(leadId, docId);
      toast.addToast('Document deleted successfully.', 'success');
    } catch (error: any) {
      toast.addToast(`Error: ${error.message}`, 'error');
    }
  }, [deleteDocument, toast]);

  const handleUpdateDocumentStatus = useCallback(async (leadId: string, docId: string, status: 'Approved' | 'Rejected', notes: string) => {
    try {
      await updateDocumentStatus(leadId, docId, status, notes);
      toast.addToast(`Document ${status.toLowerCase()}.`, 'success');
    } catch (error: any) {
      toast.addToast(`Error: ${error.message}`, 'error');
    }
  }, [updateDocumentStatus, toast]);

  const handleAddTask = useCallback(async (leadId: string, content: string, dueDate?: string, priority?: TaskPriority) => {
    if (!profile) return;
    try {
      await addTaskToLead(leadId, { content, due_date: dueDate, created_by: profile, priority: priority || 'Medium' });
      toast.addToast('Task added.', 'success');
    } catch (error: any) {
      toast.addToast(`Error: ${error.message}`, 'error');
      throw error;
    }
  }, [profile, addTaskToLead, toast]);

  const handleUpdateTask = useCallback(async (leadId: string, task: Task) => {
    try {
      await updateTaskOnLead(leadId, task);
      toast.addToast('Task updated.', 'info');
    } catch (error: any) {
      toast.addToast(`Error: ${error.message}`, 'error');
      throw error;
    }
  }, [updateTaskOnLead, toast]);

  const handleDeleteTask = useCallback(async (leadId: string, taskId: string) => {
    try {
      await deleteTaskFromLead(leadId, taskId);
      toast.addToast('Task deleted.', 'success');
    } catch (error: any) {
      toast.addToast(`Error: ${error.message}`, 'error');
      throw error;
    }
  }, [deleteTaskFromLead, toast]);

  const handleMarkNotificationsRead = useCallback(() => {
    if (profile) {
      markNotificationsAsRead(profile.id);
    }
  }, [profile, markNotificationsAsRead]);
  // ===== END OF HANDLERS SECTION =====


  // ===== AUTO-HEALING FOR STUCK LOADING STATE =====
  useEffect(() => {
    // If the user is authenticated (session exists) but profile is missing,
    // and we are NOT in the initial loading state, and no error is showing,
    // it implies we are stuck. Force a refresh.
    let timeout: NodeJS.Timeout;
    if (session && !profile && !authLoading && !profileError) {
      console.warn("App stuck in profile loading limbo. Triggering manual refresh...");
      timeout = setTimeout(() => {
        refreshProfile();
      }, 2000); // Wait 2s before forcing retry to avoid conflicts with ongoing fetches
    }
    return () => clearTimeout(timeout);
  }, [session, profile, authLoading, profileError, refreshProfile]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-slate-600 font-medium animate-pulse">Initializing Application...</p>
      </div>
    );
  }

  if (isPasswordRecovery) {
    return <ResetPassword onPasswordUpdate={handlePasswordUpdate} />;
  }

  if (!session) {
    return <Login />;
  }

  if (!profile || !viewProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        {profileError ? (
          <div className="text-center px-4">
            <p className="text-red-600 mb-2 font-medium">Error loading profile</p>
            <p className="text-sm text-slate-500 mb-4">{profileError}</p>
            <p className="text-xs text-slate-400 mb-4">User ID: {session?.user?.id}</p>
            <div className="flex gap-3 mt-4 justify-center">
              <button
                onClick={() => refreshProfile()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm text-sm font-medium transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => {
                  signOut();
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded shadow-sm text-sm font-medium text-slate-700 transition-colors"
              >
                Force Sign Out
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="text-slate-600 font-medium animate-pulse">Initializing Application...</p>
          </>
        )}
      </div>
    );
  }


  const isAdminOrAbove = viewProfile?.role === 'Super Admin' || viewProfile?.role === 'Admin' || viewProfile?.role === 'Branch Manager';
  const isSuperAdmin = viewProfile?.role === 'Super Admin';
  const AccessDenied = ({ requiredRole }: { requiredRole: string }) => (
    <div className="p-8 text-center text-red-500">
      <h2 className="text-xl font-bold">Access Denied</h2>
      <p>You need {requiredRole} privileges to view this page.</p>
    </div>
  );

  const LeadDetailRoute = () => {
    const { id } = useParams();
    const lead = leads.find(l => l.id === id);
    if (!lead) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <div className="text-6xl">🔍</div>
          <h2 className="text-2xl font-bold text-slate-800">Lead Not Found</h2>
          <p className="text-slate-500 max-w-md">This lead may have been removed or you may not have permission to view it.</p>
          <button onClick={() => navigate(-1)} className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Go Back</button>
        </div>
      );
    }
    return <LeadDetail
      lead={lead}
      onBack={() => navigate(-1)}
      onUpdateLead={handleUpdateLead}
      onAddActivity={(content) => handleAddActivity(lead.id, content)}
      onUploadDocument={(file, docType) => handleUploadDocument(lead.id, file, docType)}
      onDeleteDocument={(docId) => handleDeleteDocument(lead.id, docId)}
      onEditLead={() => handleOpenLeadForm(lead)}
      onAddTask={(content, dueDate, priority) => handleAddTask(lead.id, content, dueDate, priority)}
      onUpdateTask={(task) => handleUpdateTask(lead.id, task)}
      onDeleteTask={(taskId) => handleDeleteTask(lead.id, taskId)}
    />;
  };

  const CustomerDetailRoute = () => {
    const { id } = useParams();
    const customer = customers.find(c => c.id === id) || customers.find(c => c.lead_id === id);
    if (!customer) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <div className="text-6xl">🔍</div>
          <h2 className="text-2xl font-bold text-slate-800">Customer Not Found</h2>
          <p className="text-slate-500 max-w-md">This customer record may have been removed or you may not have permission to view it.</p>
          <button onClick={() => navigate(-1)} className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Go Back</button>
        </div>
      );
    }
    return <CustomerDetail 
      customer={customer} 
      onBack={() => navigate(-1)} 
      leads={leads} 
      onAddActivityToLead={addActivityToLead} 
      refreshData={refreshData} 
      onUpdateCustomer={updateCustomer}
    />;
  };

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Suspense fallback={<PageLoader />}>
        <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={
          <DashboardOverview
            leads={roleScopedLeads}
            users={users}
            customers={customers}
            branches={branches}
            cities={cities}
            userActivities={userActivities}
            currentUser={viewProfile!}
            dateRange={dateRange}
            setDateRange={setDateRange}
            onViewCustomer={handleViewCustomer}
            onViewLead={handleViewLead}
            onNavigate={handleNavigate}
            services={services}
            onAddActivityToLead={addActivityToLead}
            refreshData={refreshData}
            onUpdateLead={handleUpdateLead}
            onUpdateCustomer={updateCustomer}
            announcements={announcements}
            reminders={reminders}
          />
        } />
        <Route path="/leads" element={
          <LeadsOverview
            leads={roleScopedLeads}
            users={users}
            currentUser={viewProfile!}
            onUpdateLead={handleUpdateLead}
            onUpdateMultipleLeads={updateMultipleLeads}
            onDeleteMultipleLeads={deleteMultipleLeads}
            onViewLead={handleViewLead}
            onAddActivity={addActivityToLead}
            dateRange={dateRange}
            services={services}
            offers={offers}
          />
        } />
        <Route path="/leads/new" element={
          <CreateLead 
            onAddLead={handleAddLead} 
            onCancel={handleCancelCreateLead} 
            salesExecutives={activeSalesExecutives} 
            services={services} 
            leads={leads} 
            offers={offers} 
          />
        } />
        <Route path="/leads/:id" element={<LeadDetailRoute />} />
        <Route path="/my-leads" element={
          <LeadsOverview
            leads={roleScopedLeads.filter(l => l.assigned_to?.id === viewProfile?.id)}
            users={users}
            currentUser={viewProfile!}
            onUpdateLead={handleUpdateLead}
            onUpdateMultipleLeads={updateMultipleLeads}
            onDeleteMultipleLeads={deleteMultipleLeads}
            onViewLead={handleViewLead}
            onAddActivity={addActivityToLead}
            dateRange={dateRange}
            services={services}
            offers={offers}
          />
        } />
        <Route path="/lead-workflow" element={
          <LeadWorkflow
            leads={roleScopedLeads}
            currentUser={viewProfile!}
            onUpdateLead={handleUpdateLead}
            onViewLead={handleViewLead}
            onAddLead={() => setIsLeadFormOpen(true)}
            onDeleteLeads={handleBulkDeleteLeads}
            dateRange={dateRange}
            setDateRange={setDateRange}
            onOpenLeadForm={handleOpenLeadForm}
          />
        } />
        <Route path="/customers" element={
          <Customers
            customers={roleScopedCustomers}
            leads={roleScopedLeads}
            users={users}
            onViewCustomer={handleViewCustomer}
            onUpdateCustomer={updateCustomer}
            currentUser={viewProfile!}
          />
        } />
        <Route path="/customers/:id" element={<CustomerDetailRoute />} />
        <Route path="/reports" element={
          <Reports
            leads={roleScopedLeads}
            users={roleScopedUsers}
            currentUser={viewProfile!}
            dateRange={dateRange}
            services={services}
          />
        } />
        <Route path="/payments" element={
          <PaymentTracker
            leads={roleScopedLeads}
            customers={roleScopedCustomers}
            users={users}
            currentUser={viewProfile!}
            onUpdateLead={handleUpdateLead}
          />
        } />
        <Route path="/activity" element={
          <ActivityFeed
            userActivities={roleScopedActivities}
            users={users}
            leads={leads}
            customers={customers}
            currentUser={viewProfile!}
          />
        } />
        <Route path="/users" element={
          isAdminOrAbove ? (
            <UserManagement
              users={roleScopedUsers}
              currentUser={viewProfile!}
              currentUserRole={viewProfile?.role}
              branches={branches}
              cities={cities}
              onOpenUserForm={handleOpenUserForm}
              onUpdateUser={updateUser}
              onDeleteUsers={deleteMultipleUsers}
              onTransferUser={transferUser}
            />
          ) : <AccessDenied requiredRole="Admin or Super Admin" />
        } />
        <Route path="/revenue" element={
          <RevenueDashboard
            leads={roleScopedLeads}
            users={users}
            customers={customers}
            branches={branches}
            currentUser={viewProfile!}
          />
        } />
        <Route path="/performance" element={
          <EmployeePerformance
            leads={roleScopedLeads}
            users={users}
            branches={branches}
            currentUser={viewProfile!}
          />
        } />
        <Route path="/invoices" element={
          <InvoiceManagement
            invoices={invoices}
            onAddInvoice={addInvoice}
            onUpdateInvoice={updateInvoice}
            onDeleteInvoice={deleteInvoice}
            onAddInvoicePayment={addInvoicePayment}
            leads={roleScopedLeads}
            customers={roleScopedCustomers}
            users={users}
            branches={branches}
            currentUser={viewProfile!}
          />
        } />
        <Route path="/policies" element={
          <PoliciesManagement
            companyPolicies={companyPolicies}
            onAddPolicy={addPolicy}
            onUpdatePolicy={updatePolicy}
            onDeletePolicy={deletePolicy}
            currentUser={viewProfile!}
          />
        } />
        <Route path="/reminders" element={
          <Reminders
            reminders={reminders}
            onAddReminder={addReminder}
            onUpdateReminder={updateReminder}
            onDeleteReminder={deleteReminder}
            leads={roleScopedLeads}
            customers={roleScopedCustomers}
            users={users}
            branches={branches}
            currentUser={viewProfile!}
          />
        } />
        <Route path="/work-status" element={
          <WorkStatus
            leads={roleScopedLeads}
            users={users}
            branches={branches}
            currentUser={viewProfile!}
            onAddTask={addTaskToLead}
            onUpdateTask={updateTaskOnLead}
            onDeleteTask={deleteTaskFromLead}
          />
        } />
        <Route path="/announcements" element={
          <Announcements
            announcements={announcements}
            onAddAnnouncement={addAnnouncement}
            onDeleteAnnouncement={deleteAnnouncement}
            onMarkAsRead={markAnnouncementAsRead}
            users={users}
            branches={branches}
            currentUser={viewProfile!}
          />
        } />
        <Route path="/support" element={
          <Support
            tickets={tickets}
            onAddTicket={addSupportTicket}
            onUpdateTicket={updateSupportTicket}
            onAddComment={addTicketComment}
            onAddKbArticle={addKbArticle}
            users={users}
            branches={branches}
            currentUser={viewProfile!}
          />
        } />
        <Route path="/feedback" element={
          <EmployeeFeedback
            feedback={feedback}
            onAddFeedback={addEmployeeFeedback}
            onUpdateStatus={updateFeedbackStatus}
            users={users}
            branches={branches}
            currentUser={viewProfile!}
          />
        } />
        <Route path="/work-orders" element={
          <WorkOrders
            workOrders={workOrders}
            onAddWorkOrder={addWorkOrder}
            onUpdateWorkOrder={updateWorkOrder}
            onAddNote={addWorkOrderNote}
            customers={customers}
            services={services}
            users={users}
            branches={branches}
            currentUser={viewProfile!}
          />
        } />
        <Route path="/whatsapp" element={
          <WhatsAppDashboard
            conversations={whatsappConversations}
            messages={whatsappMessages}
            templates={whatsappTemplates}
            onSendMessage={sendWhatsAppMessage}
            onAddTemplate={addWhatsAppTemplate}
            onSync={syncWhatsAppConversations}
            customers={customers}
            users={users}
            currentUser={viewProfile!}
            onAddWorkOrder={addWorkOrder}
            services={services}
          />
        } />
        <Route path="/cities" element={
          isSuperAdmin ? (
            <CityManagement
              cities={cities}
              branches={branches}
              onAddCity={addCity}
              onUpdateCity={updateCity}
              onDeleteCity={deleteCity}
            />
          ) : <AccessDenied requiredRole="Super Admin" />
        } />
        <Route path="/branch-management" element={
          isSuperAdmin ? (
            <BranchManagement
              branches={branches}
              cities={cities}
              users={users}
              onAddBranch={addBranch}
              onUpdateBranch={updateBranch}
              onDeleteBranch={deleteBranch}
              onAddCity={addCity}
            />
          ) : <AccessDenied requiredRole="Super Admin" />
        } />
        <Route path="/team" element={
          isAdminOrAbove ? (
            <TeamManagement
              users={roleScopedUsers}
              currentUser={viewProfile!}
              leads={roleScopedLeads}
              onUpdateUser={updateUser}
            />
          ) : <AccessDenied requiredRole="Admin or Super Admin" />
        } />
        <Route path="/verify-documents" element={
          isAdminOrAbove ? (
            <DocumentVerification
              leads={roleScopedLeads}
              onUpdateDocumentStatus={updateDocumentStatus}
              currentUser={viewProfile!}
            />
          ) : <AccessDenied requiredRole="Admin or Super Admin" />
        } />
        <Route path="/follow-ups" element={
          <FollowUps
            leads={roleScopedLeads}
            users={users}
            currentUser={viewProfile!}
            onViewLead={handleViewLead}
            onUpdateLead={handleUpdateLead}
            onAddActivity={addActivityToLead}
          />
        } />
        <Route path="/client-documents" element={
          <ClientDocuments
            leads={roleScopedLeads}
            customers={roleScopedCustomers}
            currentUser={viewProfile!}
            onViewLead={handleViewLead}
            onViewCustomer={handleViewCustomer}
            onUploadDocument={(leadId, file, docType) => handleUploadDocument(leadId, file, docType)}
          />
        } />
        <Route path="/notifications" element={
          <Notifications
            notifications={notifications}
            onMarkAsRead={markNotificationsAsRead}
            onViewLead={handleViewLead}
            onViewCustomer={handleViewCustomer}
          />
        } />
        <Route path="/settings" element={
          <Settings
            currentUser={viewProfile!}
            transferLogs={[]} // TODO: wire up actual transfer logs
            auditLogs={[]} // TODO: wire up actual audit logs
          />
        } />
        <Route path="/web/leads" element={
          <WebLeadsManagement 
            webLeads={webLeads}
            salesExecutives={users.filter(u => u.role === 'Sales Executive')}
            onAssignWebLead={assignWebLead}
            onUpdateWebLeadStatus={updateWebLeadStatus}
            onConvertWebLeadToCrmLead={convertWebLeadToCrmLead}
          />
        } />
        <Route path="/web/blogs" element={
          <BlogsManagement 
            blogs={blogs}
            onAddBlog={addBlog}
            onUpdateBlog={updateBlog}
            onDeleteBlog={deleteBlog}
          />
        } />
        <Route path="/web/testimonials" element={
          <TestimonialsManagement 
            testimonials={testimonials}
            onAddTestimonial={addTestimonial}
            onUpdateTestimonialStatus={updateTestimonialStatus}
            onDeleteTestimonial={deleteTestimonial}
          />
        } />
        <Route path="/web/services" element={
          <ServiceManagement 
            services={services}
            onAddService={addService}
            onUpdateService={updateService}
            onDeleteService={deleteService}
            onAddSubService={addSubService}
            onUpdateSubService={updateSubService}
            onDeleteSubService={deleteSubService}
          />
        } />
        <Route path="/offers" element={
          <OffersManagement
            offers={offers}
            onAddOffer={addOffer}
            onUpdateOffer={updateOffer}
            onDeleteOffer={deleteOffer}
            services={services}
          />
        } />
        <Route path="/web" element={
          <WebLeadsManagement
            webLeads={webLeads}
            salesExecutives={activeSalesExecutives}
            onAssignWebLead={assignWebLead}
            onUpdateWebLeadStatus={updateWebLeadStatus}
            onConvertWebLeadToCrmLead={convertWebLeadToCrmLead}
          />
        } />
      </Route>
        </Routes>
        <UserForm
          isOpen={isUserFormOpen}
          onClose={() => setIsUserFormOpen(false)}
          onSave={handleSaveUser}
          user={editingUser}
          branches={branches}
          cities={cities}
          initialBranchName={userManagementBranchFilter}
          allUsers={users}
        />
        <LeadForm
          isOpen={isLeadFormOpen}
          onClose={() => setIsLeadFormOpen(false)}
          onSave={handleSaveLead}
          lead={editingLead}
          users={activeUsers}
          currentUser={viewProfile!}
          services={services}
          offers={offers}
          onUploadDocument={editingLead ? (file) => handleUploadDocument(editingLead.id, file, 'Other Documents') : undefined}
          onDeleteDocument={editingLead ? (docId) => handleDeleteDocument(editingLead.id, docId) : undefined}
        />
        <Toaster />
      </Suspense>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
