import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Building } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface BranchPerformanceTableProps {
  data: Array<{ id: string; name: string; city: string; leads: number; sales: number; revenue: number }>;
}

export const BranchPerformanceTable: React.FC<BranchPerformanceTableProps> = ({ data }) => {
  return (
    <Card className="glass-card mt-4 border-white/5">
      <CardHeader className="pb-2 border-b border-white/5 bg-white/5">
        <CardTitle className="text-sm font-bold dark:text-white flex items-center gap-2">
          <Building className="h-4 w-4 dark:text-slate-400" />
          Branch Performance Overview (Selected Period)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 border-b border-white/5 dark:text-slate-400 font-semibold text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3 text-right">Leads</th>
                <th className="px-4 py-3 text-right">Sales</th>
                <th className="px-4 py-3 text-right">Revenue (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((b) => (
                <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium dark:text-white">{b.name}</td>
                  <td className="px-4 py-3 dark:text-slate-300">{b.city}</td>
                  <td className="px-4 py-3 text-right dark:text-slate-300">{b.leads}</td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{b.sales}</td>
                  <td className="px-4 py-3 text-right text-indigo-400 font-bold">{formatCurrency(b.revenue)}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-slate-500">
                    No branches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
