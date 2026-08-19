import React, { useState, useMemo } from 'react';
import { Lead, Document, User } from '../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/Card';
import { DollarSignIcon, ClockIcon, CheckCircleIcon, MoreVerticalIcon, FileTextIcon } from '../components/icons'; // Removed CalendarIcon etc as they are in DataTable
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { ServiceInvoice } from '../components/ServiceInvoice';
import CustomPaymentExport from '../components/CustomPaymentExport';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '../components/data-table/data-table-column-header';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Check, Download } from 'lucide-react'; // Use lucide icons
import { Badge } from '../components/ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/Avatar';
import { cn } from '../lib/utils';

interface PaymentTrackerProps {
    leads: Lead[];
    users?: User[];
    currentUser?: User;
    dateRange: { from: string; to: string };
    setDateRange: (value: React.SetStateAction<{ from: string; to: string; }>) => void;
    onViewLead: (leadId: string) => void;
}

interface Transaction {
    id: string;
    transactionId: string;
    customer: string;
    orderId: string;
    amount: number;
    status: 'PAID' | 'PENDING' | 'OVERDUE' | 'FAILED';
    date: string;
    assignedToId?: string;
    assignedToName?: string;
    assignedToAvatar?: string;
    assignedBy?: string; // New field
    assignedByAvatar?: string;
    panDoc?: Document;
    aadharDoc?: Document;
    lead: Lead; // Keep reference to lead for actions
    subTotal: number;
    tax: number;
    discount: number; // New field
    serviceFee: number;
    salesAmount?: number; // New field
    totalAmount: number;
    advancePaid: number;
    dueAmount: number;
}

const MetricCard: React.FC<{ title: string, value: string | number, description: string, color: string, icon: React.ElementType }> = ({ title, value, description, color, icon: Icon }) => (
    <div className={`${color} text-white p-6 rounded-xl shadow-md flex flex-col`}>
        <div className="flex items-start justify-between">
            <h3 className="se-on-color text-base font-medium">{title}</h3>
            <Icon className="h-6 w-6 opacity-80" />
        </div>
        <div className="mt-auto">
            <p className="text-4xl font-bold">{value}</p>
            <p className="text-sm opacity-90">{description}</p>
        </div>
    </div>
);

const PaymentTracker: React.FC<PaymentTrackerProps> = ({ leads, users, currentUser, dateRange, setDateRange, onViewLead }) => {
    const [viewingInvoicesForLead, setViewingInvoicesForLead] = useState<Lead | null>(null);
    const [selectedServiceSet, setSelectedServiceSet] = useState<{ lead: Lead, set: any } | null>(null);

    const isAdmin = currentUser && ['Super Admin', 'Admin'].includes(currentUser.role);

    const transactions = useMemo(() => {
        return leads.map((lead, index) => {
            let status: Transaction['status'] = 'PENDING';
            const advance_paid = lead.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
            const pendingAmount = (lead.total_payment || 0) - advance_paid;

            if (lead.status === 'Lost') {
                status = 'FAILED';
            } else if (pendingAmount <= 0 && (lead.total_payment || 0) > 0) {
                status = 'PAID';
            } else if (lead.next_follow_up && new Date(lead.next_follow_up) < new Date()) {
                status = 'OVERDUE';
            }

            // Calculate breakdowns from service sets
            const serviceSets = lead.service_sets || [];
            const serviceFee = serviceSets.reduce((sum, set) => 
                sum + set.subservices.reduce((s, sub) => s + (sub.amount * sub.quantity), 0) + (Number(set.service_fee) || 0)
            , 0);

            const tax = serviceSets.reduce((sum, set) => 
                sum + set.subservices.reduce((s, sub) => s + (sub.tax_amount || 0), 0)
            , 0);

            const discount = serviceSets.reduce((sum, set) => sum + (Number(set.discount) || 0), 0);

            const totalAmount = lead.total_payment || (serviceFee + tax - discount); 
            const dueAmount = totalAmount - advance_paid;
            // Calculate Total Sales Amount (Sum of sales_amount from all payments)
            // "Sales Amount means, excluded Tax Fee amount" - as per user definition for the column
            const salesAmount = lead.payments?.reduce((sum, p) => sum + ((p as any).sales_amount || 0), 0) || 0;

            return {
                id: lead.id,
                transactionId: `TXN${(index + 1).toString().padStart(3, '0')}`,
                customer: `${lead.first_name} ${lead.last_name}`,
                orderId: `ORD${(index + 1).toString().padStart(3, '0')}`,
                amount: totalAmount,
                status,
                date: new Date(lead.created_at).toISOString(),
                assignedToId: lead.assigned_to?.id,
                assignedToName: lead.assigned_to?.name || 'Unassigned',
                assignedToAvatar: lead.assigned_to?.avatar_url,
                assignedBy: lead.assigner?.name || '-', // Map assigner name
                assignedByAvatar: (lead.assigner as any)?.avatar_url,
                panDoc: lead.documents?.find(d => d.type === 'Pancard'),
                aadharDoc: lead.documents?.find(d => d.type === 'Aadhar Card'),
                lead: lead,
                serviceFee, // Mapped to calculated sum
                subTotal: serviceFee + tax - discount,
                tax,
                discount,
                totalAmount,
                salesAmount, // New field
                advancePaid: advance_paid,
                dueAmount: dueAmount > 0 ? dueAmount : 0
            };
        });
    }, [leads]);

    const columns: ColumnDef<Transaction>[] = useMemo(() => [
        {
            accessorKey: "transactionId",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Txn ID" />,
            cell: ({ row }) => <div className="font-medium text-xs">{row.getValue("transactionId")}</div>,
            enableSorting: true,
            enableHiding: true,
        },
        {
            id: "customer",
            accessorFn: row => `${row.customer} ${row.lead.payments?.map((p: any) => p.receipt_number).join(' ') || ''}`,
            header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.customer}</div>
                </div>
            ),
        },
        {
            id: "referenceIds",
            header: "Ref IDs",
            cell: ({ row }) => {
                const payments = row.original.lead.payments || [];
                if (payments.length === 0) return <span className="text-slate-400">-</span>;
                return (
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {payments.map((p: any) => (
                            <span key={p.id} className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded tracking-tight block" title={p.notes || ''}>
                                {p.receipt_number}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        {
            accessorKey: "assignedBy", 
            header: ({ column }) => <DataTableColumnHeader column={column} title="Assigned Lead By" />,
            cell: ({ row }) => {
                 const name = row.getValue("assignedBy") as string;
                 const avatar = row.original.assignedByAvatar;
                 const initials = name === '-' ? '-' : name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                 
                 return (
                    <div className="flex items-center gap-2">
                        {name !== '-' && (
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={avatar} alt={name} />
                                <AvatarFallback className="text-[9px] bg-slate-100">{initials}</AvatarFallback>
                            </Avatar>
                        )}
                        <span className="text-sm text-slate-600">{name}</span>
                    </div>
                )
            },
             enableSorting: true,
        },
        {
            accessorKey: "assignedToName", 
            header: ({ column }) => <DataTableColumnHeader column={column} title="Sales Executive" />,
            cell: ({ row }) => {
                 const name = row.getValue("assignedToName") as string;
                 const avatar = row.original.assignedToAvatar;
                 const initials = name === 'Unassigned' ? 'U' : name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                 
                 return (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={avatar} alt={name} />
                            <AvatarFallback className="text-[9px] bg-blue-100 text-blue-800">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{name}</span>
                    </div>
                 )
            },
            filterFn: (row, id, value) => {
                 return value.includes(row.getValue(id))
            },
        },
        {
            accessorKey: "serviceFee",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Service Fee" />,
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("serviceFee"));
                const formatted = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                }).format(amount);
                return <div className="font-medium text-slate-500">{formatted}</div>;
            },
        },
        {
            accessorKey: "discount",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Discount" />,
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("discount"));
                const formatted = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                }).format(amount);
                return <div className="font-medium text-red-500">-{formatted}</div>;
            },
        },
        {
            accessorKey: "tax",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Tax" />,
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("tax"));
                const formatted = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                }).format(amount);
                return <div className="font-medium text-slate-500">{formatted}</div>;
            },
        },
        {
            accessorKey: "salesAmount",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Sales Amount" />,
            cell: ({ row }) => {
                const amount = (row.original as any).salesAmount || 0;
                const formatted = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                }).format(amount);
                return <div className="font-bold text-indigo-600">{formatted}</div>;
            },
        },
        {
            accessorKey: "totalAmount",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("totalAmount"));
                const formatted = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                }).format(amount);
                return <div className="font-bold">{formatted}</div>;
            },
        },
        {
            accessorKey: "advancePaid",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Advance" />,
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("advancePaid"));
                const formatted = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                }).format(amount);
                return <div className="font-medium text-green-600">{formatted}</div>;
            },
        },
        {
            accessorKey: "dueAmount",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Due" />,
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("dueAmount"));
                const formatted = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                }).format(amount);
                return <div className="font-medium text-red-600">{formatted}</div>;
            },
        },
        {
            accessorKey: "status",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                const colors: Record<string, string> = {
                    PAID: 'bg-green-100 text-green-800',
                    PENDING: 'bg-yellow-100 text-yellow-800',
                    OVERDUE: 'bg-orange-100 text-orange-800',
                    FAILED: 'bg-red-100 text-red-800',
                };
                return (
                     <Badge variant="outline" className={`border-0 font-semibold ${colors[status] || 'bg-slate-100 text-slate-800'}`}>
                        {status}
                     </Badge>
                )
            },
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            accessorKey: "date",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
            cell: ({ row }) => {
                return new Date(row.getValue("date")).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            },
            filterFn: (row, id, value: { from: string; to: string }) => {
                const rowDate = new Date(row.getValue(id)).getTime();
                const fromDate = value.from ? new Date(`${value.from}T00:00:00`).getTime() : 0;
                const toDate = value.to ? new Date(`${value.to}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
                return rowDate >= fromDate && rowDate <= toDate;
            }
        },
        {
            id: "pan_card",
            header: "PAN Card",
            cell: ({ row }) => {
                const doc = row.original.panDoc;
                if (!doc || !doc.url) return <span className="text-slate-400">-</span>;
                return (
                    <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800">
                        <Download className="h-4 w-4" /> <span className="text-xs">Down</span>
                    </a>
                )
            }
        },
        {
            id: "aadhar_card",
            header: "Aadhar Card",
            cell: ({ row }) => {
                const doc = row.original.aadharDoc;
                if (!doc || !doc.url) return <span className="text-slate-400">-</span>;
                return (
                    <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800">
                        <Download className="h-4 w-4" /> <span className="text-xs">Down</span>
                    </a>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const lead = row.original.lead;
                const hasServices = !!(lead?.service_sets && lead.service_sets.length > 0);
                
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewLead(lead.id)}>
                                View Lead
                            </DropdownMenuItem>
                            {hasServices && (
                                <DropdownMenuItem onClick={() => setViewingInvoicesForLead(lead)}>
                                    View Invoices
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ], [isAdmin, onViewLead]);

    // Initial visibility: Hide 'assignedToName' if not admin? 
    // Handled in table props? DataTable doesn't expose initialVisibility.
    // I can modify DataTable to map over columns and check if they should be hidden?
    // Or just default show.

    const statusOptions = [
        { label: 'PAID', value: 'PAID' },
        { label: 'PENDING', value: 'PENDING' },
        { label: 'OVERDUE', value: 'OVERDUE' },
        { label: 'FAILED', value: 'FAILED' },
    ];

    const employeeOptions = users?.filter(u => u.role === 'Sales Executive' || u.role === 'Admin').map(u => ({
        label: u.name,
        value: u.name // Filter by name as accessor assignedToName is name
    })) || [];

    const filters = [
        {
            columnKey: 'status',
            title: 'Status',
            options: statusOptions
        },
    ];

    if (isAdmin && employeeOptions.length > 0) {
        filters.push({
            columnKey: 'assignedToName',
            title: 'Sales Executive',
            options: employeeOptions
        });
    }

    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const pendingCount = transactions.filter(t => t.status === 'PENDING').length;
    const overdueCount = transactions.filter(t => t.status === 'OVERDUE').length;
    const paidCount = transactions.filter(t => t.status === 'PAID').length;

    const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Total Revenue" value={formatCurrency(totalRevenue)} description="All time revenue" color="bg-blue-500" icon={DollarSignIcon} />
                <MetricCard title="Pending Payments" value={pendingCount} description="Awaiting payment" color="bg-yellow-500" icon={ClockIcon} />
                <MetricCard title="Overdue" value={overdueCount} description="Past due date" color="bg-red-500" icon={ClockIcon} />
                <MetricCard title="Paid" value={paidCount} description="Successfully collected" color="bg-green-500" icon={CheckCircleIcon} />
            </div>

            <Card>
                <CardHeader>
                     <div className='flex justify-between items-center'>
                        <div>
                            <CardTitle>Payment Transactions</CardTitle>
                            <CardDescription>
                                Manage and track all payments.
                            </CardDescription>
                        </div>
                        <CustomPaymentExport 
                           transactions={transactions} // Export all? Or filtered? 
                           // Current CustomPaymentExport takes list. Ideally we pass table.getFilteredRowModel().rows
                           // But logic is outside DataTable. 
                           // For now pass all, or I need to lift state up from DataTable which is complex.
                           // User Request: "Real-Time Updates ... Any payment ... update must immediately reflect".
                           // If I export, it should export filtered?
                           // CustomPaymentExport acts on 'transactions'.
                           // Ideally I move CustomPaymentExport INTO DataTableToolbar.
                           // But CustomPaymentExport is specific.
                           // For now, I'll pass 'transactions' (all) as before, or pass nothing and rely on User filtering in Export?
                           // The previous code passed 'filteredTransactions'.
                           // With DataTable, filtering is internal.
                           // I will keep it simple for now: export ALL, or refactor later.
                           // Passing dateRange (which is state) helps Export know range.
                           dateRange={dateRange}
                        />
                     </div>
                </CardHeader>
                <CardContent>
                    <DataTable 
                        columns={columns} 
                        data={transactions} 
                        searchKey="customer"
                        filters={filters}
                        dateFilterColumnKey="date"
                    />
                </CardContent>
            </Card>

            {/* Invoices List Modal */}
            <Dialog 
                isOpen={!!viewingInvoicesForLead} 
                onClose={() => setViewingInvoicesForLead(null)} 
                title={`Invoices for ${viewingInvoicesForLead?.first_name} ${viewingInvoicesForLead?.last_name}`}
                maxWidth="max-w-2xl"
            >
                {viewingInvoicesForLead && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">Select a service to view its invoice.</p>
                        {viewingInvoicesForLead.service_sets && viewingInvoicesForLead.service_sets.length > 0 ? (
                            <div className="grid gap-3">
                                {viewingInvoicesForLead.service_sets.map((set, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                                        <div>
                                            <h4 className="font-semibold text-slate-800">{set.mainService}</h4>
                                            <p className="text-sm text-slate-500">
                                                Amount: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                                                    set.subservices.reduce((acc: number, curr: any) => acc + (curr.amount * curr.quantity), 0) + (set.service_fee || 0)
                                                )}
                                            </p>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => setSelectedServiceSet({ lead: viewingInvoicesForLead, set })}>
                                            <FileTextIcon className="h-4 w-4 mr-2" />
                                            View Invoice
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed">No service sets found for this lead.</p>
                        )}
                        <div className="flex justify-end pt-4">
                            <Button variant="ghost" onClick={() => setViewingInvoicesForLead(null)}>Close</Button>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Invoice Detail Modal */}
            <Dialog 
                isOpen={!!selectedServiceSet} 
                onClose={() => setSelectedServiceSet(null)} 
                title="Tax Invoice"
                maxWidth="max-w-4xl"
            >
                {selectedServiceSet && (
                    <div>
                        <ServiceInvoice 
                            customer={{
                                ...selectedServiceSet.lead,
                                name: `${selectedServiceSet.lead.business_name || selectedServiceSet.lead.first_name + ' ' + selectedServiceSet.lead.last_name}`,
                                phone: selectedServiceSet.lead.phone_number,
                                email: selectedServiceSet.lead.email,
                                lead_id: selectedServiceSet.lead.id,
                                business_address: selectedServiceSet.lead.business_address || selectedServiceSet.lead.residential_address || ''
                            } as any} 
                            lead={selectedServiceSet.lead as any}
                            serviceSet={selectedServiceSet.set} 
                            invoiceNumber={selectedServiceSet.lead.reference_number} 
                            date={new Date().toLocaleDateString('en-GB')}
                        />
                        <div className="flex justify-end mt-4">
                            <Button variant="outline" onClick={() => setSelectedServiceSet(null)}>Back to List</Button>
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    );
};

export default PaymentTracker;