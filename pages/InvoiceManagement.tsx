import React, { useState, useMemo } from 'react';
import { Invoice, Customer, Lead, User, UserRole, InvoiceItem, InvoiceTotals, InvoiceData, CompanyPolicy } from '../types';
import { Plus, Search, FileText, Check, AlertCircle, FileDown, Trash2, Eye, Link2, DollarSign, Calendar, RefreshCw, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';

import { format } from 'date-fns';
import { InvoiceDocument } from '../components/InvoicePDF';
import { supabase } from '../lib/supabaseClient';


interface InvoiceManagementProps {
  invoices: Invoice[];
  onAddInvoice: (invoiceData: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'invoice_number'>) => Promise<any>;
  onUpdateInvoice: (id: string, invoiceData: Partial<Invoice>) => Promise<any>;
  onDeleteInvoice: (id: string) => Promise<any>;
  onAddInvoicePayment: (invoiceId: string, paymentId: string, amount: number) => Promise<any>;
  leads: Lead[];
  customers: Customer[];
  users: User[];
  branches: any[];
  currentUser: User;
}

export default function InvoiceManagement({
  invoices = [],
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onAddInvoicePayment,
  leads = [],
  customers = [],
  users = [],
  branches = [],
  currentUser,
}: InvoiceManagementProps) {
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const isBranchManager = currentUser?.role === UserRole.BRANCH_MANAGER;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isPrivileged = isSuperAdmin || isBranchManager || isAdmin;

  // State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(18); // 18% standard GST
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Settle item updates
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        sno: items.length + 1,
        service_name: '',
        description: '',
        qty: 1,
        rate: 0,
        discount_amount: 0,
        discount_percent: 0,
        amount: 0
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      sno: i + 1
    }));
    setItems(updated);
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === 'qty') item.qty = Number(value) || 0;
    else if (field === 'rate') item.rate = Number(value) || 0;
    else if (field === 'discount_amount') {
      item.discount_amount = Number(value) || 0;
      item.discount_percent = item.rate > 0 ? (item.discount_amount / (item.rate * item.qty)) * 100 : 0;
    } else if (field === 'discount_percent') {
      item.discount_percent = Number(value) || 0;
      item.discount_amount = (item.rate * item.qty) * (item.discount_percent / 100);
    } else {
      (item as any)[field] = value;
    }

    // Recalculate amount
    item.amount = (item.qty * item.rate) - item.discount_amount;
    updated[index] = item;
    setItems(updated);
  };

  // Calculations
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.qty * item.rate), 0), [items]);
  const totalDiscount = useMemo(() => items.reduce((sum, item) => sum + item.discount_amount, 0) + discountAmount, [items, discountAmount]);
  const taxableValue = useMemo(() => Math.max(0, subtotal - totalDiscount), [subtotal, totalDiscount]);
  const taxAmount = useMemo(() => taxableValue * (taxRate / 100), [taxableValue, taxRate]);
  const totalAmount = useMemo(() => taxableValue + taxAmount, [taxableValue, taxAmount]);

  // Pull customer service set
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer && customer.service_sets) {
      const populatedItems: InvoiceItem[] = [];
      let sno = 1;
      customer.service_sets.forEach((set) => {
        set.subservices?.forEach((sub) => {
          populatedItems.push({
            sno: sno++,
            service_name: set.mainService,
            description: sub.name,
            qty: sub.quantity || 1,
            rate: sub.amount || 0,
            discount_amount: 0,
            discount_percent: 0,
            amount: (sub.quantity || 1) * (sub.amount || 0)
          });
        });
      });
      setItems(populatedItems);
    } else {
      setItems([]);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedCustomerId('');
    setDueDate(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    setNotes('');
    setItems([]);
    setDiscountAmount(0);
    setError('');
    setIsOpen(true);
  };

  // Convert number to words helper
  const amountToWords = (amount: number): string => {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const numToWords = (n: number): string => {
      if (n < 20) return units[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
      if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + numToWords(n % 100) : '');
      if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
      return n.toString(); // Fallback for huge numbers
    };
    
    const floorAmount = Math.floor(amount);
    const words = numToWords(floorAmount);
    return words ? words + ' Rupees Only' : 'Zero Rupees Only';
  };

  // Upload generated PDF to Supabase Storage bucket
  const generateAndUploadPDF = async (invoiceNumber: string, invoiceObj: Invoice, customerObj: Customer) => {
    const invoiceData: InvoiceData = {
      invoice_no: invoiceNumber,
      invoice_datetime: new Date().toISOString(),
      company: {
        name: '24eFiling CRM',
        address: 'Plot No. 12, Cyber Hills, Gachibowli, Hyderabad, Telangana',
        gstin: '36AAAAA1111A1Z1',
        pan: 'AAAAA1111A',
        phone: '+91 98765 43210',
        email: 'billing@24efiling.com',
        website: 'www.24efiling.com'
      },
      bill_to: {
        name: customerObj.name || customerObj.business_name || 'Valued Customer',
        place_of_supply: customerObj.city_name || 'Telangana',
        mobile: customerObj.phone || '',
        address: customerObj.business_address || ''
      },
      items: invoiceObj.items,
      totals: {
        total_qty: invoiceObj.items.reduce((sum, item) => sum + item.qty, 0),
        subtotal: invoiceObj.subtotal,
        tax_breakdown: [{ type: 'GST', rate: taxRate, amount: invoiceObj.tax_amount }],
        total_amount: invoiceObj.total_amount,
        previous_balance: customerObj.payment_details?.total_payment || 0,
        current_balance: invoiceObj.total_amount,
        amount_in_words: amountToWords(invoiceObj.total_amount)
      },
      bank_details: {
        account_name: '24eFiling Solutions Private Limited',
        ifsc: 'HDFC0001234',
        account_no: '50200012345678',
        bank_name: 'HDFC Bank Limited'
      },
      payment: {
        upi_id: 'billing@hdfcbank',
      },
      terms: [
        'Payment is due within 7 days of invoice date.',
        'Please quote invoice number in all payment references.',
        'This is a computer-generated tax invoice and requires no signature.'
      ],
      authorized_signatory: {
        name: '24eFiling Billing Team',
      }
    };

    try {
      // 1. Generate Blob dynamically
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(<InvoiceDocument data={invoiceData} />).toBlob();

      const fileName = `${invoiceNumber}.pdf`;

      // 2. Upload to storage bucket
      const { data, error: uploadErr } = await supabase.storage
        .from('invoices')
        .upload(fileName, blob, { contentType: 'application/pdf', upsert: true });

      if (uploadErr) throw uploadErr;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Error generating PDF upload:', err);
      return null;
    }
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one item to the invoice.');
      return;
    }

    setLoading(true);
    setError('');

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) {
      setError('Selected customer not found.');
      setLoading(false);
      return;
    }

    try {
      // Create initial payload
      const invoicePayload = {
        customer_id: selectedCustomerId,
        lead_id: customer.lead_id || null,
        branch_id: customer.branch_id || currentUser.branch_id || null,
        items,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: totalDiscount,
        total_amount: totalAmount,
        status: 'draft' as const,
        due_date: dueDate,
        notes,
        created_by: currentUser.id
      };

      // 1. Insert invoice record
      const inserted = await onAddInvoice(invoicePayload);
      if (inserted && inserted.invoice_number) {
        // 2. Generate PDF and upload to Supabase
        const pdfUrl = await generateAndUploadPDF(inserted.invoice_number, inserted, customer);
        if (pdfUrl) {
          // Update URL in record
          await onUpdateInvoice(inserted.id, { pdf_url: pdfUrl });
        }
      }
      setIsOpen(false);
    } catch (e: any) {
      setError(e.message || 'Failed to create invoice.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: any) => {
    try {
      const updates: Partial<Invoice> = { status: newStatus };
      if (newStatus === 'paid') {
        updates.paid_date = new Date().toISOString();
      }
      await onUpdateInvoice(id, updates);
    } catch (e: any) {
      alert(e.message || 'Failed to update invoice status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await onDeleteInvoice(id);
    } catch (e: any) {
      alert(e.message || 'Failed to delete invoice.');
    }
  };

  const openPreview = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewOpen(true);
  };

  // Filtered List
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      // Status Filter
      if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;

      // Scoping check (Branch restrictions)
      if (!isSuperAdmin) {
        const userBranch = currentUser.branch_id || currentUser.branch_name;
        if (invoice.branch_id && invoice.branch_id !== userBranch) return false;
      }

      // Search Term
      const customer = customers.find(c => c.id === invoice.customer_id);
      const customerName = customer ? customer.name.toLowerCase() : '';
      const invoiceNo = invoice.invoice_number ? invoice.invoice_number.toLowerCase() : '';
      const search = searchTerm.toLowerCase();

      return customerName.includes(search) || invoiceNo.includes(search);
    });
  }, [invoices, searchTerm, statusFilter, customers, currentUser, isSuperAdmin]);

  // Metric summaries
  const summaries = useMemo(() => {
    const activeInvoices = invoices.filter(invoice => {
      if (!isSuperAdmin) {
        const userBranch = currentUser.branch_id || currentUser.branch_name;
        return invoice.branch_id === userBranch;
      }
      return true;
    });

    return {
      total: activeInvoices.length,
      revenue: activeInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0),
      outstanding: activeInvoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + i.total_amount, 0),
      overdue: activeInvoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.total_amount, 0)
    };
  }, [invoices, currentUser, isSuperAdmin]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Invoice Management
          </h1>
          <p className="dark:text-slate-400 text-sm mt-1">
            Create, track, and manage invoices and payment receipts for customer services.
          </p>
        </div>

        {isPrivileged && (
          <Button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-blue-500/10 transition-all border-none"
          >
            <Plus className="h-4 w-4" /> Create Invoice
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Invoices</p>
              <h3 className="text-3xl font-bold mt-2 text-slate-100">{summaries.total}</h3>
            </div>
            <FileText className="h-8 w-8 text-blue-500/40" />
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collected Revenue</p>
              <h3 className="text-3xl font-bold mt-2 text-emerald-400">₹ {summaries.revenue.toLocaleString('en-IN')}</h3>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-500/40" />
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding Dues</p>
              <h3 className="text-3xl font-bold mt-2 text-indigo-400">₹ {summaries.outstanding.toLocaleString('en-IN')}</h3>
            </div>
            <Clock className="h-8 w-8 text-indigo-500/40" />
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Dues</p>
              <h3 className="text-3xl font-bold mt-2 text-rose-400">₹ {summaries.overdue.toLocaleString('en-IN')}</h3>
            </div>
            <AlertCircle className="h-8 w-8 text-rose-500/40" />
          </CardContent>
        </Card>
      </div>

      {/* Filter and search panel */}
      <Card className="glass-card border-white/5 bg-slate-900/20 backdrop-blur-md p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer or invoice no..."
            className="pl-9 bg-slate-950 border-white/5 text-slate-100 text-sm focus:border-blue-500 focus:ring-0"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </Card>

      {/* Invoices List */}
      <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/20 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Invoice Number</th>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Total Amount</th>
                <th className="py-4 px-6">Due Date</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No Invoices Found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const customer = customers.find(c => c.id === invoice.customer_id);
                  const statusColors: Record<string, string> = {
                    draft: 'bg-slate-800/80 text-slate-400 border border-slate-700/50',
                    sent: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
                    paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                    overdue: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
                    cancelled: 'bg-slate-900 text-slate-600 border border-white/5'
                  };

                  return (
                    <tr key={invoice.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-200">
                        {invoice.invoice_number || 'INV-DRAFT'}
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        {customer ? customer.name : 'Unknown Customer'}
                      </td>
                      <td className="py-4 px-6 text-slate-200 font-semibold">
                        ₹ {invoice.total_amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[invoice.status] || ''}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-1.5">
                          {invoice.pdf_url && (
                            <a
                              href={invoice.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-white/5 rounded-md transition-colors"
                              title="Download PDF"
                            >
                              <FileDown className="h-4 w-4" />
                            </a>
                          )}
                          {isPrivileged && (
                            <div className="relative inline-block text-left">
                              <select
                                value={invoice.status}
                                onChange={(e) => handleUpdateStatus(invoice.id, e.target.value)}
                                className="bg-slate-950 border border-white/5 text-xs text-slate-300 px-2 py-1 rounded-md focus:outline-none"
                              >
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="paid">Paid</option>
                                <option value="overdue">Overdue</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                          )}
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(invoice.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white/5 rounded-md transition-colors"
                              title="Delete Invoice"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[750px] bg-slate-900 border border-white/10 text-slate-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Create Tax Invoice
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveInvoice} className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                  disabled={loading}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.business_name || 'No business'})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-slate-950 border-white/10 text-slate-100 focus:border-blue-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice Items</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddItem}
                  className="h-7 text-xs border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                  disabled={loading}
                >
                  Add Item
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No items added. Select a customer to auto-populate items from service sets, or add items manually.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2.5 items-end bg-slate-950/20 p-2.5 rounded-lg border border-white/5">
                      <div className="col-span-4 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Service Name</label>
                        <Input
                          value={item.service_name}
                          onChange={(e) => handleUpdateItem(index, 'service_name', e.target.value)}
                          placeholder="Service title"
                          className="h-8 bg-slate-950 border-white/5 text-xs"
                          disabled={loading}
                        />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                          placeholder="Details"
                          className="h-8 bg-slate-950 border-white/5 text-xs"
                          disabled={loading}
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qty</label>
                        <Input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleUpdateItem(index, 'qty', e.target.value)}
                          className="h-8 bg-slate-950 border-white/5 text-xs"
                          disabled={loading}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rate</label>
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleUpdateItem(index, 'rate', e.target.value)}
                          className="h-8 bg-slate-950 border-white/5 text-xs"
                          disabled={loading}
                        />
                      </div>
                      <div className="col-span-1 text-slate-300 font-semibold text-xs pb-2.5 truncate">
                        ₹ {item.amount.toLocaleString('en-IN')}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-white/5 rounded transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations Summary */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5 mt-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes / Terms</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Billing terms, bank details override, or customer remarks..."
                  className="bg-slate-950 border-white/10 text-slate-100 text-xs h-24 resize-none"
                  disabled={loading}
                />
              </div>

              <div className="bg-slate-950/40 p-4 rounded-lg border border-white/5 text-xs space-y-2 text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-slate-200 font-semibold">₹ {subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Discount:</span>
                  <Input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    className="h-6 w-20 bg-slate-950 border-white/5 text-right text-xs p-1 text-slate-200"
                    disabled={loading}
                  />
                </div>
                <div className="flex justify-between">
                  <span>Taxable Value:</span>
                  <span className="text-slate-200">₹ {taxableValue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>GST Rate:</span>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                    className="h-6 bg-slate-950 border border-white/5 text-xs p-0.5 text-slate-200"
                    disabled={loading}
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <div className="flex justify-between">
                  <span>GST Amount:</span>
                  <span className="text-slate-300">₹ {taxAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-bold text-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-blue-400">₹ {totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="border border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
