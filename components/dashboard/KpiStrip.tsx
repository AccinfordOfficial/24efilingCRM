import React from 'react';
import { Briefcase, Users, IndianRupee, TrendingUp, Clock, Activity } from 'lucide-react';
import { StatCard } from '../ui/StatCard';

interface KpiStripProps {
  role: 'super_admin' | 'admin' | 'sales_exec';
  metrics: {
    // Super Admin
    totalLeads?: number;
    totalCustomers?: number;
    totalRevenue?: number;
    conversionRate?: number;
    // Admin / Branch Manager  
    branchLeads?: number;
    branchCustomers?: number;
    branchConvRate?: number;
    branchPerformance?: string;
    // Sales Exec
    myLeads?: number;
    myCustomers?: number;
    myFollowUps?: number;
    myConvRate?: number;
  };
  trends?: {
    leads?: { value: number; label: string; isPositive: boolean };
    converted?: { value: number; label: string; isPositive: boolean };
    revenue?: { value: number; label: string; isPositive: boolean };
    rate?: { value: number; label: string; isPositive: boolean };
  };
  onNavigate: (page: string) => void;
}

export const KpiStrip: React.FC<KpiStripProps> = ({ role, metrics, trends, onNavigate }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {role === 'super_admin' && (
        <>
          <StatCard title="Total Leads" value={metrics.totalLeads ?? 0} icon={Briefcase} onClick={() => onNavigate('All Leads')} trend={trends?.leads} />
          <StatCard title="Total Customers" value={metrics.totalCustomers ?? 0} icon={Users} onClick={() => onNavigate('Customers')} trend={trends?.converted} />
          <StatCard title="Total Revenue" value={metrics.totalRevenue ?? 0} type="currency" icon={IndianRupee} trend={trends?.revenue} />
          <StatCard title="Conversion Rate" value={metrics.conversionRate ?? 0} type="percentage" icon={TrendingUp} trend={trends?.rate} />
        </>
      )}

      {role === 'admin' && (
        <>
          <StatCard title="Branch Leads" value={metrics.branchLeads ?? 0} icon={Briefcase} onClick={() => onNavigate('All Leads')} />
          <StatCard title="Branch Customers" value={metrics.branchCustomers ?? 0} icon={Users} onClick={() => onNavigate('Customers')} />
          <StatCard title="Conversion Rate" value={metrics.branchConvRate ?? 0} type="percentage" icon={TrendingUp} />
          <StatCard title="Branch Performance" value={metrics.branchPerformance ?? 'N/A'} icon={Activity} />
        </>
      )}

      {role === 'sales_exec' && (
        <>
          <StatCard title="My Leads" value={metrics.myLeads ?? 0} icon={Briefcase} onClick={() => onNavigate('All Leads')} />
          <StatCard title="My Customers" value={metrics.myCustomers ?? 0} icon={Users} onClick={() => onNavigate('Customers')} />
          <StatCard title="My Follow-ups" value={metrics.myFollowUps ?? 0} icon={Clock} onClick={() => onNavigate('Follow-ups')} />
          <StatCard title="My Performance" value={metrics.myConvRate ?? 0} type="percentage" icon={TrendingUp} />
        </>
      )}
    </div>
  );
};
