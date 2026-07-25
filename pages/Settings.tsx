import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { User, TransferLog } from '../types';
import { useAuth } from '../contexts/AuthContext';

import { CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// New Components
import { ProfileSettings } from '../components/settings/ProfileSettings';
import { SecuritySettings } from '../components/settings/SecuritySettings';
import { CompanySettings } from '../components/settings/CompanySettings';
import { NotificationSettings } from '../components/settings/NotificationSettings';
import { LeadSettings } from '../components/settings/LeadSettings';
import { RoleSettings } from '../components/settings/RoleSettings';
import { BillingSettings } from '../components/settings/BillingSettings';
import { AuditLogsSettings } from '../components/settings/AuditLogsSettings';

interface SettingsProps {
    currentUser: User;
    transferLogs: TransferLog[];
    auditLogs: any[];
}

const Settings: React.FC<SettingsProps> = ({ currentUser, transferLogs, auditLogs }) => {
    const showToast = (type: 'success' | 'error', message: string) => {
        if (type === 'success') {
            toast.success(message);
        } else {
            toast.error(message);
        }
    };

    // Navigation
    const allTabs: { name: string, access: User['role'][] }[] = [
        { name: 'Profile', access: ['Super Admin', 'Admin', 'Sales Executive'] },
        { name: 'Security', access: ['Super Admin', 'Admin', 'Sales Executive'] },
        { name: 'Notifications', access: ['Super Admin', 'Admin', 'Sales Executive'] },
        { name: 'Company Profile', access: ['Super Admin'] },
        { name: 'Lead Settings', access: ['Super Admin', 'Admin'] },
        { name: 'Roles & Permissions', access: ['Super Admin', 'Admin'] },
        { name: 'Billing', access: ['Super Admin'] },
        { name: 'Audit Logs', access: ['Super Admin'] },
    ];

    const accessibleTabs = allTabs.filter(tab => tab.access.includes(currentUser.role));
    // Ensure activeTab is valid
    const [activeTab, setActiveTab] = useState(() => {
        return accessibleTabs.find(t => t.name === 'Profile')?.name || accessibleTabs[0]?.name || 'Profile';
    });

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Profile':
                return <ProfileSettings currentUser={currentUser} showToast={showToast} />;
            case 'Security':
                return <SecuritySettings currentUser={currentUser} showToast={showToast} />;
            case 'Notifications':
                return <NotificationSettings showToast={showToast} />;
            case 'Company Profile':
                return <CompanySettings showToast={showToast} />;
            case 'Lead Settings':
                return <LeadSettings showToast={showToast} />;
            case 'Roles & Permissions':
                return <RoleSettings showToast={showToast} />;
            case 'Billing':
                return <BillingSettings />;
            case 'Audit Logs':
                return <AuditLogsSettings transferLogs={transferLogs} auditLogs={auditLogs} />;
            default: return null;
        }
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">System Settings</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage your account and system preferences.</p>
            </header>

            <Card className="dark:bg-slate-900/80 dark:border-white/10">
                <CardHeader>
                    <div className="border-b border-slate-200 dark:border-white/10">
                        <nav className="-mb-px flex space-x-6 overflow-x-auto custom-scrollbar" aria-label="Tabs">
                            {accessibleTabs.map(tab => (
                                <button
                                    key={tab.name}
                                    onClick={() => setActiveTab(tab.name)}
                                    className={`${activeTab === tab.name
                                        ? 'border-primary text-primary font-bold'
                                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-white/20'
                                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer outline-none focus:text-primary`}
                                >
                                    {tab.name}
                                </button>
                            ))}
                        </nav>
                    </div>
                </CardHeader>
                <CardContent className="min-h-[400px] p-6">
                    {renderTabContent()}
                </CardContent>
            </Card>
        </div>
    );

};

export default Settings;
