import React, { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { Customer, User, Lead, Document, Service } from '../types';
import { useAuth } from '../contexts/AuthContext';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { SearchIcon, FileUp, FileDown, Plus, Trash2 } from 'lucide-react';
import { Select } from '../components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { CustomerForm } from '../components/CustomerForm';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { BUSINESS_CATEGORIES, INDUSTRY_TYPES } from '../constants';
import { usePagination } from '../hooks/usePagination';



interface CustomersProps {
    customers: Customer[];
    users: User[];
    leads: Lead[];
    onViewCustomer: (customerId: string) => void;
    onViewLead: (leadId: string) => void;
    services: Service[];
}

const DocStatusChip: React.FC<{ doc: Document | undefined }> = ({ doc }) => {
    // ... same
    if (!doc) {
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Missing</span>;
    }
    const colors = {
        Pending: 'bg-yellow-100 text-yellow-800',
        Approved: 'bg-green-100 text-green-800',
        Rejected: 'bg-red-100 text-red-800',
    };
    return <a href={doc.url} target="_blank" rel="noopener noreferrer" className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${colors[doc.status]} hover:opacity-80`} title={doc.name}>{doc.status}</a>;
};

const Customers: React.FC<CustomersProps> = ({ customers, users, leads, onViewCustomer, onViewLead, services }) => {
    const { profile } = useAuth();
    // OPTIMIZATION: Do not fetch data again here, rely on props
    const { importCustomers, deleteCustomers, addCustomer, leadSources } = useApi({ fetchOnMount: false });
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [serviceFilter, setServiceFilter] = useState('All');
    const [assigneeFilter, setAssigneeFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All');
    const [showFilters, setShowFilters] = useState(false);
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });
    const [amountRange, setAmountRange] = useState<{ min: string, max: string }>({ min: '', max: '' });
    const [paymentStatus, setPaymentStatus] = useState('All'); // All, Paid, Due

    const serviceOptions = useMemo(() => {
        if (!customers) return [];
        return [...new Set(customers.map(c => c.service_name).filter(Boolean))];
    }, [customers]);

    const salesExecutives = useMemo(() => {
        if (!users) return [];
        return users.filter(u => u.role === 'Sales Executive');
    }, [users]);

    const filteredCustomers = useMemo(() => {
        if (!customers) return [];
        try {
            return customers.filter(customer => {
                if (!customer) return false;
                const lowercasedQuery = searchQuery.toLowerCase();
                const cleanPhone = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
                const cleanQuery = lowercasedQuery.replace(/[^0-9]/g, '');
                
                const receiptSearchMatch = customer.payment_details?.payments?.some(p => 
                    p.receipt_number && p.receipt_number.toLowerCase().includes(lowercasedQuery)
                ) || false;
                
                const searchMatch = searchQuery === '' ||
                    (customer.reference_number && customer.reference_number.toLowerCase().includes(lowercasedQuery)) ||
                    (customer.business_name && customer.business_name.toLowerCase().includes(lowercasedQuery)) ||
                    (customer.name && customer.name.toLowerCase().includes(lowercasedQuery)) ||
                    (customer.email && customer.email.toLowerCase().includes(lowercasedQuery)) ||
                    (customer.phone && customer.phone.toLowerCase().includes(lowercasedQuery)) ||
                    (cleanQuery !== '' && cleanPhone.includes(cleanQuery)) ||
                    (customer.alternate_mobile && customer.alternate_mobile.includes(cleanQuery)) ||
                    (customer.alternate_mobile && customer.alternate_mobile.toLowerCase().includes(lowercasedQuery)) ||
                    (customer.pan_number && customer.pan_number.toLowerCase().includes(lowercasedQuery)) ||
                    receiptSearchMatch;

                 const serviceMatch = serviceFilter === 'All' || customer.service_name === serviceFilter;
                const assigneeMatch = assigneeFilter === 'All' || customer.assigned_to?.id === assigneeFilter;
                const sourceMatch = sourceFilter === 'All' || customer.lead_source === sourceFilter;

                // Advanced Filters
                let dateMatch = true;
                if (customer.date_of_enroll) {
                    const customerDate = new Date(customer.date_of_enroll).getTime();
                    dateMatch = (!dateRange.start || customerDate >= new Date(dateRange.start).getTime()) &&
                        (!dateRange.end || customerDate <= new Date(dateRange.end).getTime() + 86400000); // Add 1 day to include end date
                }

                const totalAmount = customer.total_amount || 0;
                const amountMatch = (!amountRange.min || totalAmount >= Number(amountRange.min)) &&
                    (!amountRange.max || totalAmount <= Number(amountRange.max));

                let paymentMatch = true;
                if (paymentStatus === 'Paid') {
                    paymentMatch = (customer.due_amount || 0) <= 0;
                } else if (paymentStatus === 'Due') {
                    paymentMatch = (customer.due_amount || 0) > 0;
                }

                return searchMatch && serviceMatch && assigneeMatch && sourceMatch && dateMatch && amountMatch && paymentMatch;
            });
        } catch (e) {
            console.error("Error filtering customers:", e);
            return [];
        }
    }, [customers, searchQuery, serviceFilter, assigneeFilter, sourceFilter, dateRange, amountRange, paymentStatus]);

    const { currentData: paginatedCustomers, next, prev, jump, currentPage, maxPage } = usePagination(filteredCustomers, 20);

    const lostLeads = useMemo(() => leads.filter(l => l.status === 'Lost'), [leads]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedCustomerIds(filteredCustomers.map(c => c.id));
        } else {
            setSelectedCustomerIds([]);
        }
    };

    const handleSelectOne = (customerId: string) => {
        setSelectedCustomerIds(prev =>
            prev.includes(customerId) ? prev.filter(id => id !== customerId) : [...prev, customerId]
        );
    };

    const handleDeleteSelected = () => {
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await deleteCustomers(selectedCustomerIds);
            setSelectedCustomerIds([]);
        } catch (error: any) {
            alert(`Failed to delete customers: ${error.message || 'Unknown error'}`);
            console.error('Delete failed:', error);
        } finally {
            setIsDeleteConfirmOpen(false);
        }
    };


    const handleExport = (format: 'excel' | 'csv' | 'pdf') => {
        const dataToExport = filteredCustomers.map((c, index) => ({
            'S. No': index + 1,
            'Ref ID': c.reference_number || '-',
            'Lead Date': c.date_of_enroll ? new Date(c.date_of_enroll).toLocaleDateString('en-IN') : '-',
            'Full Name': c.name || '-',
            'Contact Number': c.phone || '-',
            'Alternate Mobile': c.alternate_mobile || '-',
            'WhatsApp (Alt)': c.alternate_is_whatsapp ? 'Yes' : (c.alternate_mobile ? 'No' : '-'),
            'PAN Number': c.pan_number || '-',
            'Aadhar Number': c.aadhar_number || '-',
            'Lead Source': c.lead_source || '-',
            'Services Required': c.service_name || '-',
            'Service Amount (₹)': c.service_amount || 0,
            'Tax (₹)': c.tax_amount || 0,
            'Total Amount (₹)': c.total_amount || 0,
            'Paid Amount (₹)': c.paid_amount || 0,
            'Due Amount (₹)': c.due_amount || 0,
            'Completed On': c.date_of_completion ? new Date(c.date_of_completion).toLocaleDateString('en-IN') : '-',
            'Status': c.status || 'Success'
        }));

        const triggerDownload = (dataUri: string, filename: string) => {
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                if (dataUri.startsWith('blob:')) {
                    URL.revokeObjectURL(dataUri);
                }
            }, 200);
        };


        if (format === 'excel') {
            try {
                const ws = XLSX.utils.json_to_sheet(dataToExport);

                // Set column widths for readability
                ws['!cols'] = [
                    { wch: 6 },   // S.No
                    { wch: 14 },  // Ref ID
                    { wch: 12 },  // Lead Date
                    { wch: 22 },  // Full Name
                    { wch: 15 },  // Contact
                    { wch: 14 },  // PAN
                    { wch: 16 },  // Aadhar
                    { wch: 28 },  // Service
                    { wch: 16 },  // Service Amt
                    { wch: 10 },  // Tax
                    { wch: 16 },  // Total
                    { wch: 16 },  // Paid
                    { wch: 16 },  // Due
                    { wch: 14 },  // Completed On
                    { wch: 10 },  // Status
                ];

                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Customers');

                // Write using array output type and Blob Object URL to prevent corruption
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                triggerDownload(url, `customers_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
            } catch (err: any) {
                console.error('Excel export failed:', err);
                alert('Excel export failed: ' + (err.message || 'Unknown error'));
            }
        } else if (format === 'csv') {
            try {
                const ws = XLSX.utils.json_to_sheet(dataToExport);
                const csv = XLSX.utils.sheet_to_csv(ws);
                // Add UTF-8 BOM for Excel compatibility and wrap in Blob
                const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                triggerDownload(url, `customers_export_${new Date().toISOString().slice(0, 10)}.csv`);
            } catch (err: any) {
                console.error('CSV export failed:', err);
                alert('CSV export failed: ' + (err.message || 'Unknown error'));
            }
        } else if (format === 'pdf') {
            try {
                const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4

                // Title
                doc.setFontSize(14);
                doc.setTextColor(28, 57, 142);
                doc.text('24eFiling — Customer Export', 14, 14);
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text(`Generated: ${new Date().toLocaleString('en-IN')}  |  Total Records: ${filteredCustomers.length}`, 14, 20);

                autoTable(doc, {
                    startY: 25,
                    head: [['S.No', 'Ref ID', 'Name', 'Phone', 'PAN', 'Source', 'Service', 'Total ₹', 'Paid ₹', 'Due ₹', 'Completed', 'Status']],
                    body: filteredCustomers.map((c, i) => [
                        i + 1,
                        c.reference_number || '-',
                        c.name || '-',
                        c.phone || '-',
                        c.pan_number || '-',
                        c.lead_source || '-',
                        c.service_name || '-',
                        `₹${(c.total_amount || 0).toLocaleString('en-IN')}`,
                        `₹${(c.paid_amount || 0).toLocaleString('en-IN')}`,
                        `₹${(c.due_amount || 0).toLocaleString('en-IN')}`,
                        c.date_of_completion ? new Date(c.date_of_completion).toLocaleDateString('en-IN') : '-',
                        c.status || 'Success'
                    ]),
                    styles: { fontSize: 7, cellPadding: 2 },
                    headStyles: { fillColor: [28, 57, 142], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [245, 247, 255] },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 10 },
                        7: { halign: 'right' },
                        8: { halign: 'right', textColor: [22, 163, 74] },
                        9: { halign: 'right', textColor: [220, 38, 38] },
                    }
                });

                // Use base64 data URI to avoid file association issues
                const pdfBase64 = doc.output('datauristring');
                // Replace mime type to force download not open
                const downloadUri = pdfBase64.replace('data:application/pdf;filename=generated.pdf;base64,', 'data:application/octet-stream;base64,');
                triggerDownload(pdfBase64, `customers_export_${new Date().toISOString().slice(0, 10)}.pdf`);
            } catch (err: any) {
                console.error('PDF export failed:', err);
                alert('PDF export failed: ' + (err.message || 'Unknown error'));
            }
        }
    };



    // Removed duplicate useApi() call

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                let data: any[] = [];

                if (fileExt === 'json') {
                    // Parse JSON
                    data = JSON.parse(bstr as string);
                } else if (fileExt === 'xml') {
                    try {
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(bstr as string, "text/xml");

                        // Check for parse errors
                        const parserError = xmlDoc.getElementsByTagName("parsererror");
                        if (parserError.length > 0) {
                            throw new Error("Invalid XML format");
                        }

                        // Try to find customer nodes - assume <Customer> or generic Item tags, or just use root children
                        let itemNodes = Array.from(xmlDoc.getElementsByTagName("Customer"));
                        if (itemNodes.length === 0) {
                            itemNodes = Array.from(xmlDoc.getElementsByTagName("item"));
                        }
                        if (itemNodes.length === 0 && xmlDoc.documentElement) {
                            // Fallback to all direct children of root
                            itemNodes = Array.from(xmlDoc.documentElement.children);
                        }

                        data = itemNodes.map(node => {
                            const obj: any = {};
                            Array.from(node.children).forEach(child => {
                                obj[child.tagName] = child.textContent;
                            });
                            return obj;
                        });

                        if (data.length === 0) {
                            throw new Error("No data records found in XML. Expected <Customer> or <item> tags.");
                        }

                    } catch (e: any) {
                        alert("XML Parse Error: " + e.message);
                        return;
                    }
                } else {
                    // Parse Excel/CSV
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    data = XLSX.utils.sheet_to_json(ws);
                }


                // Helper to normalize keys (remove whitespace, lowercase)
                const normalizeKey = (key: string) => key.trim().toLowerCase();

                // Map Import Columns to Schema with robust fallback
                const mappedData = data.map((rawRow: any) => {
                    // Create a normalized row object where keys are lowercased for easier matching
                    const row: any = {};
                    Object.keys(rawRow).forEach(k => {
                        row[normalizeKey(k)] = rawRow[k];
                    });

                    // Flexible matching for Name
                    const name = row['full name'] || row['name'] || row['customer name'] || row['customer'];

                    if (!name) return null; // Skip invalid rows without name

                    return {
                        name: name,
                        phone: String(row['contact number'] || row['contact'] || row['phone'] || row['mobile'] || '-'),
                        email: row['email'] || row['e-mail'] || `imported_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
                        business_name: row['business name'] || row['company'] || row['business'] || name, // Fallback business name to person name
                        service_name: row['services required'] || row['service'] || row['service name'] || 'Consulting',
                        lead_source: 'Import',
                        date_of_enroll: new Date().toISOString(),
                        date_of_completion: (() => {
                            if (!row['completed on']) return new Date().toISOString();
                            const parsed = new Date(row['completed on']);
                            return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
                        })(),


                        pan_number: row['pan number'] || row['pan'] || row['pan card'] || null,
                        aadhar_number: row['aadhar number'] || row['aadhar'] || row['aadhar card'] || null,
                        service_amount: Number(row['service amount'] || row['amount'] || 0),
                        tax_amount: Number(row['taxes'] || row['tax'] || 0),
                        total_amount: Number(row['total amount'] || row['total'] || 0),
                        paid_amount: Number(row['paid amount'] || row['paid'] || 0),
                        due_amount: Number(row['due amount'] || row['due'] || 0),
                        feedback: row['feedback'] || row['remarks'] || null,
                        lead_id: null // Imported customers don't have a source Lead ID
                    };
                }).filter(r => r !== null); // Filter out skipped rows

                if (mappedData.length > 0) {
                    await importCustomers(mappedData);
                    const skippedCount = data.length - mappedData.length;
                    let msg = `Successfully imported ${mappedData.length} customers.`;
                    if (skippedCount > 0) msg += ` ${skippedCount} rows were skipped due to missing 'Name'.`;
                    alert(msg);
                    window.location.reload();
                } else {
                    alert("No valid data found. Please ensure your file has a 'Full Name', 'Name', or 'Customer Name' column.");
                }

            } catch (err: any) {
                console.error("Import Failed:", err);
                if (err.message?.includes('schema cache') || err.message?.includes('Could not find the')) {
                    alert("Import Failed: The database schema is missing required columns (e.g., aadhar_number). Please ask your administrator to run the 'UPDATE_CUSTOMERS_SCHEMA_EXTENDED.sql' script in Supabase.");
                } else {
                    alert("Import failed: " + err.message);
                }
            }
        };

        if (fileExt === 'json') {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">All Customers</h1>
                        <p className="text-slate-500 dark:text-slate-400">View and filter all converted leads.</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2 w-full xl:w-auto">
                        <div className="relative">
                            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                            <Input
                                type="search"
                                placeholder="Search customers..."
                                className="pl-8 w-full sm:w-64 bg-background dark:bg-slate-950 border-input dark:border-white/10 text-foreground dark:text-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button
                            variant={showFilters ? "default" : "outline"}
                            className="bg-background dark:bg-slate-900 border-input dark:border-white/10 text-foreground dark:text-white gap-2"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <span className="text-slate-700 dark:text-slate-300">Filters</span>
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="relative flex items-center gap-2">
                                <input type="file" id="import-file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImport} />
                                <Button variant="outline" size="sm" className="gap-2 bg-background dark:bg-slate-900 border-input dark:border-white/10 text-foreground dark:text-white" onClick={() => document.getElementById('import-file')?.click()}>
                                    <FileUp className="h-4 w-4" /> Import
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1 h-9 bg-background dark:bg-slate-900 border-input dark:border-white/10 text-foreground dark:text-white" onClick={() => handleExport('pdf')}>
                                    <FileDown className="h-3.5 w-3.5" />
                                    PDF
                                </Button>
                                <Button size="sm" className="gap-1 h-9 bg-primary text-primary-foreground hover:opacity-90" onClick={() => setIsAddCustomerOpen(true)}>
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Customer
                                </Button>
                                {profile?.role === 'Super Admin' && selectedCustomerIds.length > 0 && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="gap-2"
                                        onClick={handleDeleteSelected}
                                    >
                                        <Trash2 className="h-4 w-4" /> Delete ({selectedCustomerIds.length})
                                    </Button>
                                )}
                            </div>
                            <Select
                                value=""
                                onChange={(e) => {
                                    handleExport(e.target.value as any);
                                    e.target.value = ''; // Reset immediate to allow re-selection
                                }}
                                className="w-[110px] bg-background dark:bg-slate-900 border-slate-300 dark:border-white/10 text-foreground dark:text-white"
                            >
                                <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Export</option>
                                <option value="excel" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Excel</option>
                                <option value="csv" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">CSV</option>
                                <option value="pdf" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">PDF</option>
                            </Select>
                        </div>
                    </div>
                </div>

                {showFilters && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Service</label>
                            <Select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="w-full bg-white dark:bg-slate-950 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white">
                                <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Services</option>
                                {serviceOptions.map(service => <option key={service} value={service} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{service}</option>)}
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Assigned To</label>
                            <Select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="w-full bg-white dark:bg-slate-950 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white">
                                <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Users</option>
                                {salesExecutives.map(user => <option key={user.id} value={user.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{user.name}</option>)}
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Lead Source</label>
                            <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="w-full bg-white dark:bg-slate-950 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white">
                                <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Sources</option>
                                {leadSources.map(source => <option key={source.id} value={source.source_name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{source.source_name}</option>)}
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Enrollment Date Range</label>
                            <div className="flex gap-2">
                                <Input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs border-slate-300 dark:border-white/10" />
                                <Input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs border-slate-300 dark:border-white/10" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Amount Range</label>
                            <div className="flex gap-2">
                                <Input type="number" placeholder="Min" value={amountRange.min} onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs border-slate-300 dark:border-white/10" />
                                <Input type="number" placeholder="Max" value={amountRange.max} onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs border-slate-300 dark:border-white/10" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Payment Status</label>
                            <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full bg-white dark:bg-slate-950 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white">
                                <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Statuses</option>
                                <option value="Paid" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Fully Paid</option>
                                <option value="Due" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Payment Due</option>
                            </Select>
                        </div>

                        <div className="flex items-end">
                            <Button
                                variant="ghost"
                                className="text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 w-full justify-start px-0"
                                onClick={() => {
                                    setServiceFilter('All');
                                    setAssigneeFilter('All');
                                    setSourceFilter('All');
                                    setDateRange({ start: '', end: '' });
                                    setAmountRange({ min: '', max: '' });
                                    setPaymentStatus('All');
                                    setSearchQuery('');
                                }}
                            >
                                Clear All Filters
                            </Button>
                        </div>
                    </div>
                )}
            </header>
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Customer List</CardTitle>
                        <CardDescription>A list of all clients who have been successfully converted.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative overflow-auto max-h-[70vh] -mx-4 md:-mx-6 border-b border-slate-200 dark:border-white/10 rounded-t-md">
                        <table className="w-full text-xs text-left">
                            <thead className="text-xs uppercase bg-[#1c398e] dark:bg-slate-800 text-white sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap w-[40px]">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={filteredCustomers.length > 0 && selectedCustomerIds.length === filteredCustomers.length}
                                            className="rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                    </th>
                                    <th className="px-4 py-3 whitespace-nowrap">S.No</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Ref ID</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Lead Date</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Full Name</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Contact</th>
                                    <th className="px-4 py-3 whitespace-nowrap">PAN/Aadhar</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Service</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">Service Amt</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">Tax</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">Total</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">Paid</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">Due</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Completed</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedCustomers.map((customer, index) => (
                                    <tr
                                        key={customer.id}
                                        onClick={() => onViewCustomer(customer.id)}
                                        className="border-b border-slate-200 dark:border-white/5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100"
                                    >
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                onChange={() => handleSelectOne(customer.id)}
                                                checked={selectedCustomerIds.includes(customer.id)}
                                                className="rounded border-slate-300 text-primary focus:ring-primary"
                                            />
                                        </td>
                                        <td className="px-4 py-3">{index + 1}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{customer.reference_number || '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{new Date(customer.date_of_enroll).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="truncate max-w-[120px]" title={customer.name}>{customer.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5">
                                                <span>{customer.phone}</span>
                                                {customer.alternate_mobile && (
                                                    <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                                        {customer.alternate_mobile}
                                                        {customer.alternate_is_whatsapp && (
                                                            <span className="inline-flex items-center gap-0.5 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 px-1 py-0 rounded-full font-bold">
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                                                WA
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400">PAN: {customer.pan_number || '-'}</span>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400">AAD: {customer.aadhar_number || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="truncate max-w-[150px]" title={customer.service_name}>{customer.service_name}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">₹{customer.service_amount?.toLocaleString() || 0}</td>
                                        <td className="px-4 py-3 text-right">₹{customer.tax_amount?.toLocaleString() || 0}</td>
                                        <td className="px-4 py-3 text-right font-semibold">₹{customer.total_amount?.toLocaleString() || 0}</td>
                                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">₹{customer.paid_amount?.toLocaleString() || 0}</td>
                                        <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-semibold">₹{customer.due_amount?.toLocaleString() || 0}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{customer.date_of_completion ? new Date(customer.date_of_completion).toLocaleDateString() : '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${customer.status === 'Success' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                {customer.status || 'Success'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCustomers.length === 0 && (
                                    <tr>
                                        <td colSpan={15} className="text-center py-10 text-slate-500 dark:text-slate-400">
                                            No customers found matching your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 dark:border-white/10">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Showing <strong>{(currentPage - 1) * 20 + 1}</strong> to <strong>{Math.min(currentPage * 20, filteredCustomers.length)}</strong> of <strong>{filteredCustomers.length}</strong> customers
                    </div>
                    {maxPage > 1 && (
                        <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={prev} disabled={currentPage === 1}>
                            Previous
                        </Button>
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400 px-2">
                            Page {currentPage} of {maxPage}
                        </div>
                        <Button variant="outline" size="sm" onClick={next} disabled={currentPage === maxPage}>
                            Next
                        </Button>
                        </div>
                    )}
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Lost Leads for Follow-up</CardTitle>
                        <CardDescription>Leads marked as 'Lost' that may require attention.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative overflow-auto max-h-[400px] -mx-4 md:-mx-6 border-b border-slate-200 dark:border-white/10 rounded-t-md">
                        <table className="w-full text-sm">
                            <thead className="text-xs uppercase bg-slate-700 dark:bg-slate-800 text-white sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th scope="col" className="px-4 py-3 md:px-6 text-left font-medium">Lead</th>
                                    <th scope="col" className="px-4 py-3 md:px-6 hidden sm:table-cell text-left font-medium">Service Requested</th>
                                    <th scope="col" className="px-4 py-3 md:px-6 hidden md:table-cell text-left font-medium">Assigned To</th>
                                    <th scope="col" className="px-4 py-3 md:px-6 hidden lg:table-cell text-left font-medium">Last Contacted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lostLeads.map((lead) => (
                                    <tr
                                        key={lead.id}
                                        onClick={() => onViewLead(lead.id)}
                                        className="border-b border-slate-200 dark:border-white/5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100"
                                    >
                                        <td className="px-4 py-4 md:px-6 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                            <div className="font-semibold text-slate-900 dark:text-white">{lead.business_name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{lead.first_name} {lead.last_name}</div>
                                        </td>
                                        <td className="px-4 py-4 md:px-6 hidden sm:table-cell text-slate-900 dark:text-slate-100">{lead.service_requested}</td>
                                        <td className="px-4 py-4 md:px-6 hidden md:table-cell text-slate-900 dark:text-slate-100">
                                            {lead.assigned_to ? (
                                                <div className="flex items-center gap-2">
                                                    <img src={lead.assigned_to.avatar_url} alt={lead.assigned_to.name} className="w-6 h-6 rounded-full" />
                                                    {lead.assigned_to.name}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 md:px-6 hidden lg:table-cell text-slate-900 dark:text-slate-100">{new Date(lead.last_contacted).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    </tr>
                                ))}
                                {lostLeads.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-10 text-slate-500 dark:text-slate-400">
                                            No lost leads to display.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Showing <strong>{lostLeads.length}</strong> lost leads
                    </div>
                </CardFooter>
            </Card>

            <ConfirmationDialog
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Customers"
                description={`Are you sure you want to delete ${selectedCustomerIds.length} customer(s)? This action cannot be undone.`}
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
            />

            <CustomerForm
                isOpen={isAddCustomerOpen}
                onClose={() => setIsAddCustomerOpen(false)}
                onSave={addCustomer}
                users={users}
                services={services}
            />
        </div >
    );
};

export default Customers;