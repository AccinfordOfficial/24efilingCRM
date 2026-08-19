import React, { useMemo, useState } from 'react';
import { Dialog } from './ui/Dialog';
import { User, Lead } from '../types';
import { DataTable } from './DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from './data-table/data-table-column-header';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { DownloadIcon } from './icons';
import { Badge } from './ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface SalesExecutivePerformanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    leads: Lead[];
}

interface PerformanceRecord {
    id: string;
    leadName: string;
    service: string;
    status: string;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    salesCredit: number; // New: Sales Amount Benefit
    paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';
    date: string;
}

const MetricCard: React.FC<{ title: string, value: string | number, subtext?: string, color?: string }> = ({ title, value, subtext, color }) => (
    <Card className={`${color ? color : ''}`}>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
        </CardContent>
    </Card>
);

export const SalesExecutivePerformanceModal: React.FC<SalesExecutivePerformanceModalProps> = ({ isOpen, onClose, user, leads }) => {
    // Default to current month
    const [dateRange, setDateRange] = useState({
        from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });

    const assignedLeads = useMemo(() => {
        if (!user) return [];
        return leads.filter(l => l.assigned_to?.id === user.id);
    }, [leads, user]);

    // Filter Leads based on Date Range (Creation Date)
    const filteredLeads = useMemo(() => {
        const fromDate = dateRange.from ? new Date(dateRange.from) : null;
        const toDate = dateRange.to ? new Date(dateRange.to) : null;
        if (fromDate) fromDate.setHours(0, 0, 0, 0);
        if (toDate) toDate.setHours(23, 59, 59, 999);

        return assignedLeads.filter(l => {
            const d = new Date(l.created_at);
            if (fromDate && d < fromDate) return false;
            // if (toDate && d > toDate) return false; // Strict end date?
            // Usually 'to' implies inclusive end of day.
            if (toDate && d > toDate) return false;
            return true;
        });
    }, [assignedLeads, dateRange]);

    const { metrics, tableData } = useMemo(() => {
        let totalLeads = 0;
        let successfulConversions = 0;
        let totalRevenue = 0; // Booked Value
        let totalPaid = 0;
        let totalDue = 0;
        let totalSalesCredit = 0; // New Metric

        const records: PerformanceRecord[] = filteredLeads.map(lead => {
            const paid = lead.payments?.reduce((sum, p) => sum + ((p as any).received || p.amount || 0), 0) || 0;
            // Calculate Sales Credit (Benefit) for this lead from its payments
            const salesCredit = lead.payments?.reduce((sum, p) => sum + ((p as any).sales_amount || (p as any).received || p.amount || 0), 0) || 0;
            
            const total = lead.total_payment || 0;
            const due = Math.max(0, total - paid);
            
            let paymentStatus: PerformanceRecord['paymentStatus'] = 'PENDING';
            if (lead.status === 'Success' && due === 0) paymentStatus = 'PAID';
            else if (paid > 0 && due > 0) paymentStatus = 'PARTIAL';
            else if (due > 0 && lead.next_follow_up && new Date(lead.next_follow_up) < new Date()) paymentStatus = 'OVERDUE';

            if (lead.status === 'Success') {
                successfulConversions++;
            }
            
            totalLeads++;
            totalRevenue += total;
            totalPaid += paid;
            totalDue += due;
            totalSalesCredit += salesCredit;

            return {
                id: lead.id,
                leadName: `${lead.first_name} ${lead.last_name}`,
                service: lead.service_requested || 'N/A',
                status: lead.status,
                totalAmount: total,
                paidAmount: paid,
                dueAmount: due,
                salesCredit: salesCredit,
                paymentStatus,
                date: lead.created_at
            };
        });

        // Use Sales Credit as "Revenue" in metrics if that's the performance indicator?
        // Or show both? Let's show Total Deal Value (Revenue) and Paid.

        return {
            metrics: {
                totalLeads,
                successfulConversions,
                conversionRate: totalLeads > 0 ? ((successfulConversions / totalLeads) * 100).toFixed(1) : '0.0',
                totalRevenue,
                totalPaid,
                totalDue,
                totalSalesCredit
            },
            tableData: records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };
    }, [filteredLeads]);

    const columns: ColumnDef<PerformanceRecord>[] = [
        {
            accessorKey: "date",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
            cell: ({ row }) => <span className="text-slate-500 text-xs">{new Date(row.original.date).toLocaleDateString('en-GB')}</span>
        },
        {
            accessorKey: "leadName",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Lead Name" />,
            cell: ({ row }) => (
                <div>
                    <div className="font-medium text-slate-900">{row.original.leadName}</div>
                    <div className="text-xs text-slate-500">{row.original.service}</div>
                </div>
            )
        },
        {
            accessorKey: "status",
             header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
            cell: ({ row }) => (
                <Badge variant={row.original.status === 'Success' ? 'default' : 'secondary'} className={row.original.status === 'Success' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}>
                    {row.original.status}
                </Badge>
            )
        },
         {
            accessorKey: "totalAmount",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Total Deal" />,
            cell: ({ row }) => <span className="font-medium">₹{row.original.totalAmount.toLocaleString('en-IN')}</span>
        },
         {
            accessorKey: "paidAmount",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Collected" />,
            cell: ({ row }) => <span className="text-green-600 font-medium">₹{row.original.paidAmount.toLocaleString('en-IN')}</span>
        },
        {
            accessorKey: "salesCredit",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Sales Limit" />, // Using 'Limit' or 'Credit' as header? 'Sales Credit' is better.
            cell: ({ row }) => <span className="text-indigo-600 font-bold">₹{row.original.salesCredit.toLocaleString('en-IN')}</span>
        },
         {
            accessorKey: "dueAmount",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Due" />,
            cell: ({ row }) => <span className={`font-medium ${row.original.dueAmount > 0 ? 'text-red-500' : 'text-slate-400'}`}>₹{row.original.dueAmount.toLocaleString('en-IN')}</span>
        },
        {
            accessorKey: "paymentStatus",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Payment Status" />,
            cell: ({ row }) => (
                <Badge variant="outline" className={
                    row.original.paymentStatus === 'PAID' ? 'text-green-600 border-green-200 bg-green-50' :
                    row.original.paymentStatus === 'OVERDUE' ? 'text-red-600 border-red-200 bg-red-50' :
                    row.original.paymentStatus === 'PARTIAL' ? 'text-orange-600 border-orange-200 bg-orange-50' :
                    'text-slate-500'
                }>
                    {row.original.paymentStatus}
                </Badge>
            )
        }
    ];

    const handleExportPDF = () => {
        if (!user) return;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Performance Report: ${user.name}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`${dateRange.from} to ${dateRange.to}`, 14, 26);
        
        // Metrics Summary
        let y = 35;
        doc.setFontSize(14);
        doc.text("Summary Metrics (Filtered)", 14, y);
        y += 10;
        doc.setFontSize(10);
        doc.text(`Total Leads: ${metrics.totalLeads}`, 14, y);
        doc.text(`Conversions: ${metrics.successfulConversions} (${metrics.conversionRate}%)`, 60, y);
        doc.text(`Sales Credit: Rs. ${metrics.totalSalesCredit.toLocaleString()}`, 120, y);
        y += 6;
        doc.text(`Total Booked: Rs. ${metrics.totalRevenue.toLocaleString()}`, 14, y);
        doc.text(`Collected: Rs. ${metrics.totalPaid.toLocaleString()}`, 60, y);
        doc.text(`Due: Rs. ${metrics.totalDue.toLocaleString()}`, 120, y);

        y += 15;
        doc.setFontSize(14);
        doc.text("Detailed Records", 14, y);

        const tableColumn = ["Date", "Lead Name", "Status", "Total", "Collected", "Sales Credit", "Due"];
        const tableRows = tableData.map(record => [
            new Date(record.date).toLocaleDateString(),
            record.leadName,
            record.status,
            record.totalAmount.toLocaleString(),
            record.paidAmount.toLocaleString(),
            record.salesCredit.toLocaleString(),
            record.dueAmount.toLocaleString(),
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: y + 5,
        });

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${user.name}_Performance_${dateRange.from}_to_${dateRange.to}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportExcel = () => {
         if (!user) return;
        const summaryData = [
            { Metric: "Sales Executive", Value: user.name },
            { Metric: "Period", Value: `${dateRange.from} to ${dateRange.to}` },
            { Metric: "Total Leads", Value: metrics.totalLeads },
            { Metric: "Conversions", Value: metrics.successfulConversions },
            { Metric: "Conversion Rate", Value: `${metrics.conversionRate}%` },
            { Metric: "Sales Credit Benefit", Value: metrics.totalSalesCredit },
            { Metric: "Total Booked Revenue", Value: metrics.totalRevenue },
            { Metric: "Collected Amount", Value: metrics.totalPaid },
            { Metric: "Due Amount", Value: metrics.totalDue },
        ];

        const recordData = tableData.map(r => ({
            "Date": new Date(r.date).toLocaleDateString(),
            "Lead Name": r.leadName,
            "Service": r.service,
            "Status": r.status,
            "Total Deal": r.totalAmount,
            "Collected": r.paidAmount,
            "Sales Credit": r.salesCredit,
            "Due": r.dueAmount,
        }));

        const wb = XLSX.utils.book_new();
        const summaryWS = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWS, "Summary");
        const recordsWS = XLSX.utils.json_to_sheet(recordData);
        XLSX.utils.book_append_sheet(wb, recordsWS, "Records");
        
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${user.name}_Performance.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!user) return null;

    return (
        <Dialog 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Performance: ${user.name}`}
            maxWidth="max-w-7xl"
        >
            <div className="space-y-6">
                {/* Header Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">From Date</label>
                            <Input 
                                type="date" 
                                value={dateRange.from} 
                                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                className="bg-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">To Date</label>
                            <Input 
                                type="date" 
                                value={dateRange.to} 
                                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} 
                                className="bg-white"
                            />
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-6 text-slate-500 hover:text-blue-600"
                            onClick={() => setDateRange({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') })}
                        >
                            Reset to This Month
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportExcel}>
                             <DownloadIcon className="mr-2 h-4 w-4" /> Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportPDF}>
                             <DownloadIcon className="mr-2 h-4 w-4" /> PDF
                        </Button>
                    </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <MetricCard title="Total Leads" value={metrics.totalLeads} />
                    <MetricCard title="Conversions" value={metrics.successfulConversions} subtext={`${metrics.conversionRate}% Rate`} />
                    <MetricCard title="Sales Achieved" value={`₹${(metrics.totalSalesCredit/1000).toFixed(1)}k`} subtext="Sales Credit" color="bg-indigo-50 border-indigo-100 text-indigo-900" />
                    <MetricCard title="Total Deals" value={`₹${(metrics.totalRevenue/1000).toFixed(1)}k`} subtext="Booked Value" />
                    <MetricCard title="Outstanding" value={`₹${(metrics.totalDue/1000).toFixed(1)}k`} color="text-red-600" />
                </div>

                {/* Table */}
                <div className="rounded-md border border-slate-200 overflow-hidden">
                    <DataTable 
                        columns={columns} 
                        data={tableData} 
                        searchKey="leadName"
                    />
                </div>
            </div>
        </Dialog>
    );
};
