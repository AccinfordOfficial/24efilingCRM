import React, { useState } from 'react';
import { Lead, User, Customer, Branch, City, UserActivity, Service, Testimonial, Announcement, Reminder } from '../types';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import AICopilot from '../components/AICopilot';
import WidgetGrid, { WidgetLayout } from '../components/dashboards/WidgetGrid';
import { Sparkles } from 'lucide-react';
import { DashboardGreeting } from '../components/dashboard/DashboardGreeting';
import { KpiStrip } from '../components/dashboard/KpiStrip';
import { BusinessAnalyticsChart } from '../components/dashboard/BusinessAnalyticsChart';
import { BranchPerformanceTable } from '../components/dashboard/BranchPerformanceTable';
import { RecentActivityFeed } from '../components/dashboard/RecentActivityFeed';
import { TodayAgendaCard } from '../components/dashboard/TodayAgendaCard';
import { AiInsightsPanel } from '../components/dashboard/AiInsightsPanel';
import { DashboardSearchResults } from '../components/dashboard/DashboardSearchResults';
import { DashboardFilterBar } from '../components/dashboard/DashboardFilterBar';

interface DashboardOverviewProps {
    leads: Lead[];
    users: User[];
    customers: Customer[];
    branches: Branch[];
    cities?: City[];
    userActivities: UserActivity[];
    currentUser: User;
    dateRange: { from: string; to: string };
    setDateRange: (range: { from: string; to: string }) => void;
    onViewCustomer: (customerId: string) => void;
    onViewLead?: (leadId: string) => void;
    onNavigate: (page: string) => void;
    services: Service[];
    onAddActivityToLead?: (leadId: string, activityData: any) => Promise<void>;
    refreshData?: () => Promise<void>;
    onUpdateLead?: (leadId: string, leadData: any) => Promise<void>;
    onUpdateCustomer?: (customerId: string, customerData: any) => Promise<void>;
    testimonials: Testimonial[];
    announcements?: Announcement[];
    reminders?: Reminder[];
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    leads, users, customers, branches, cities = [], userActivities, currentUser, dateRange: propDateRange, setDateRange: propSetDateRange,
    onViewCustomer, onViewLead, onNavigate, services, onAddActivityToLead, refreshData, testimonials,
    announcements = [], reminders = []
}) => {
    const metrics = useDashboardMetrics({
        leads,
        users,
        customers,
        branches,
        cities,
        userActivities,
        currentUser,
        services
    });

    const [isCopilotOpen, setIsCopilotOpen] = useState(false);
    const [widgetLayout, setWidgetLayout] = useState<WidgetLayout>({
        kpiStrip: true,
        analyticsChart: true,
        todayAgenda: true,
        branchPerformance: true,
        activityFeed: true,
        reminders: true,
        aiInsights: true
    });

    // Handle birthday wish call
    const handleSendWish = async (customer: Customer) => {
        const currentYear = new Date().getFullYear();
        const message = `*Happy Birthday!* 🎂\n\nDear ${customer.name},\n\nWish you a very Happy Birthday from all of us at 24eFiling! May this year bring you endless happiness, success, and prosperity.\n\nBest regards,\n*24eFiling*`;
        let formattedPhone = customer.phone.replace(/[^0-9]/g, '');
        if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        if (customer.lead_id && onAddActivityToLead) {
            try {
                await onAddActivityToLead(customer.lead_id, { type: 'Call', content: `[Birthday Wish] Sent WhatsApp birthday wish for year ${currentYear}` });
                if (refreshData) await refreshData();
            } catch (e) { console.error('Failed to log birthday activity', e); }
        }
        window.open(url, '_blank');
    };

    const kpiMetrics = {
        // Super admin
        totalLeads: leads.length,
        totalCustomers: customers.length,
        totalRevenue: metrics.currentMetrics.revenue,
        conversionRate: metrics.currentMetrics.rate,
        // Admin
        branchLeads: metrics.branchLeadsCount,
        branchCustomers: metrics.branchCustomersCount,
        branchConvRate: metrics.branchConvRate,
        branchPerformance: metrics.branchPerformance,
        // Sales exec
        myLeads: metrics.myLeads.length,
        myCustomers: metrics.myCustomers.length,
        myFollowUps: metrics.seFollowUpsCount,
        myConvRate: metrics.seConvRate
    };

    const kpiRole = metrics.isSuperAdmin ? 'super_admin' : (metrics.isAdmin ? 'admin' : 'sales_exec') as 'super_admin' | 'admin' | 'sales_exec';

    // Search Mode Overlay
    if (metrics.localSearchTerm) {
        return (
            <DashboardSearchResults
                searchTerm={metrics.localSearchTerm}
                results={metrics.searchResults}
                onViewCustomer={onViewCustomer}
                onViewLead={onViewLead}
                onClearSearch={() => metrics.setLocalSearchTerm('')}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Greeting Hero Banner */}
            <DashboardGreeting
                currentUser={currentUser}
                overdueCount={metrics.agendaData.overdueFollowUpsCount}
                todayAgendaCount={metrics.agendaData.todayFollowUpsCount}
                activeUsersCount={metrics.activeUsersCount}
                onNavigate={onNavigate}
            />

            {/* Pinned Announcements Alert Banner */}
            {announcements && announcements.filter(a => a.is_pinned).length > 0 && (
                <div className="space-y-2">
                    {announcements.filter(a => a.is_pinned).map(ann => (
                        <div
                            key={ann.id}
                            onClick={() => onNavigate('Announcements')}
                            className={`p-4 rounded-xl border backdrop-blur-md cursor-pointer flex items-center justify-between transition-all hover:scale-[1.005] ${
                                ann.type === 'urgent'
                                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-200'
                                    : 'bg-blue-500/10 border-blue-500/20 text-blue-200'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="flex h-2.5 w-2.5 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                                </span>
                                <span className="font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950 border border-white/5">
                                    {ann.type === 'urgent' ? 'Urgent' : 'Update'}
                                </span>
                                <span className="font-bold text-sm line-clamp-1">{ann.title}</span>
                            </div>
                            <span className="text-xs text-slate-400 font-semibold hover:underline">Read →</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Local Dashboard Filters */}
            <DashboardFilterBar currentUserRole={currentUser.role} />

            {/* Custom Control Bar (AI Copilot & Customize Layout) */}
            {currentUser.role !== 'Sales Executive' && (
                <div className="flex justify-between items-center gap-4 bg-slate-900/10 border border-white/5 p-3 rounded-xl backdrop-blur-md relative z-20">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-400" />
                        <span className="text-xs text-slate-300">Need AI-powered predictions or layouts?</span>
                    </div>
                    <div className="flex gap-2">
                        <WidgetGrid
                            userId={currentUser.id}
                            onLayoutChange={setWidgetLayout}
                            isSuperAdmin={metrics.isSuperAdmin}
                        />
                        <button
                            onClick={() => setIsCopilotOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 py-1.5 rounded-lg border-none shadow-md shadow-blue-500/10 transition-all cursor-pointer"
                        >
                            <Sparkles className="h-4 w-4" /> Ask Gemini Copilot
                        </button>
                    </div>
                </div>
            )}

            {/* KPI Cards Row */}
            {widgetLayout.kpiStrip && (
                <KpiStrip
                    role={kpiRole}
                    metrics={kpiMetrics}
                    trends={metrics.parsedTrends || undefined}
                    onNavigate={onNavigate}
                />
            )}

            {/* Main content grid (Row 1: Business Analytics and Today's Agenda side by side) */}
            {(widgetLayout.analyticsChart || widgetLayout.todayAgenda) && (
                <div className="grid gap-5 lg:grid-cols-5 relative z-10">
                    {widgetLayout.analyticsChart && currentUser.role !== 'Sales Executive' && (
                        <div className={widgetLayout.todayAgenda ? 'lg:col-span-3' : 'lg:col-span-5'}>
                            <BusinessAnalyticsChart
                                trendData={metrics.trendData}
                                sourceData={metrics.sourceData}
                                isSuperAdmin={metrics.isSuperAdmin}
                                activeTab={metrics.activeChartTab}
                                onTabChange={metrics.setActiveChartTab}
                            />
                        </div>
                    )}
                    {widgetLayout.todayAgenda && (
                        <div className={widgetLayout.analyticsChart ? 'lg:col-span-2' : 'lg:col-span-5'}>
                            <TodayAgendaCard
                                agendaData={metrics.agendaData}
                                birthdayCustomers={metrics.birthdayCustomers}
                                isWishSent={metrics.isWishSent}
                                onSendWish={handleSendWish}
                                onViewLead={onViewLead}
                                onViewCustomer={onViewCustomer}
                                onNavigate={onNavigate}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Main content grid (Row 2: Branch Performance, Recent Activity, and AI Insights) */}
            {(widgetLayout.branchPerformance || widgetLayout.activityFeed || widgetLayout.reminders || widgetLayout.aiInsights) && (
                <div className="grid gap-5 lg:grid-cols-5 relative z-0">
                    <div className="lg:col-span-3 space-y-5">
                        {widgetLayout.branchPerformance && metrics.isSuperAdmin && (
                            <BranchPerformanceTable data={metrics.branchPerformanceData} />
                        )}
                        {widgetLayout.activityFeed && (
                            <RecentActivityFeed
                                activities={metrics.recentActivities}
                                users={users}
                                onNavigate={onNavigate}
                            />
                        )}
                    </div>
                    <div className="lg:col-span-2 space-y-5">
                        {/* Active Schedule Reminders Widget */}
                        {widgetLayout.reminders && (
                            <div className="rounded-xl border border-white/5 bg-slate-900/30 backdrop-blur-md p-6">
                                <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
                                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                        Active Schedule Reminders
                                    </h3>
                                    <button
                                        onClick={() => onNavigate('Reminders')}
                                        className="text-xs text-blue-400 font-semibold hover:underline bg-transparent border-none cursor-pointer"
                                    >
                                        View All
                                    </button>
                                </div>
                                
                                {reminders.filter(r => r.status !== 'completed' && (r.user_id === currentUser.id || r.assigned_to === currentUser.id)).length === 0 ? (
                                    <p className="text-xs text-slate-500 text-center py-4">No active reminders.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {reminders
                                            .filter(r => r.status !== 'completed' && (r.user_id === currentUser.id || r.assigned_to === currentUser.id))
                                            .slice(0, 3)
                                            .map(rem => (
                                                <div
                                                    key={rem.id}
                                                    onClick={() => onNavigate('Reminders')}
                                                    className="p-3 bg-slate-950/20 hover:bg-slate-950/40 border border-white/5 rounded-lg transition-colors cursor-pointer flex justify-between items-center"
                                                >
                                                    <div>
                                                        <p className="font-bold text-xs text-slate-200">{rem.title}</p>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">Due: {rem.due_date} {rem.due_time || ''}</p>
                                                    </div>
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                                                        rem.priority === 'high'
                                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                            : rem.priority === 'medium'
                                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    }`}>
                                                        {rem.priority}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {widgetLayout.aiInsights && (
                            <AiInsightsPanel insights={metrics.aiInsights} />
                        )}
                    </div>
                </div>
            )}

            {/* AI Copilot slide drawer */}
            <AICopilot
                isOpen={isCopilotOpen}
                onClose={() => setIsCopilotOpen(false)}
                leads={leads}
                customers={customers}
                tasks={userActivities}
                reminders={reminders}
                currentUser={currentUser}
            />
        </div>
    );
};

export default DashboardOverview;