import React from 'react';
import { Lead, User, Customer, Branch, City, UserActivity, Service, Testimonial } from '../types';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
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
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    leads, users, customers, branches, cities = [], userActivities, currentUser, dateRange: propDateRange, setDateRange: propSetDateRange,
    onViewCustomer, onViewLead, onNavigate, services, onAddActivityToLead, refreshData, testimonials
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

            {/* Local Dashboard Filters */}
            <DashboardFilterBar currentUserRole={currentUser.role} />

            {/* KPI Cards Row */}
            <KpiStrip
                role={kpiRole}
                metrics={kpiMetrics}
                trends={metrics.parsedTrends || undefined}
                onNavigate={onNavigate}
            />

            {/* Main content grid (Row 1: Business Analytics and Today's Agenda side by side) */}
            <div className="grid gap-5 lg:grid-cols-5 relative z-10">
                <div className="lg:col-span-3">
                    <BusinessAnalyticsChart
                        trendData={metrics.trendData}
                        sourceData={metrics.sourceData}
                        isSuperAdmin={metrics.isSuperAdmin}
                        activeTab={metrics.activeChartTab}
                        onTabChange={metrics.setActiveChartTab}
                    />
                </div>
                <div className="lg:col-span-2">
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
            </div>

            {/* Main content grid (Row 2: Branch Performance, Recent Activity, and AI Insights) */}
            <div className="grid gap-5 lg:grid-cols-5 relative z-0">
                <div className="lg:col-span-3 space-y-5">
                    {metrics.isSuperAdmin && (
                        <BranchPerformanceTable data={metrics.branchPerformanceData} />
                    )}
                    <RecentActivityFeed
                        activities={metrics.recentActivities}
                        users={users}
                        onNavigate={onNavigate}
                    />
                </div>
                <div className="lg:col-span-2">
                    <AiInsightsPanel insights={metrics.aiInsights} />
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;