import React, { useState } from 'react';
import { Customer, Lead, Document, Payment, ServiceSet } from '../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeftIcon, MailIcon, PhoneIcon, UserIcon, DownloadIcon, FileTextIcon } from '../components/icons';
import { Dialog } from '../components/ui/Dialog';
import { SinglePaymentReceipt } from '../components/SinglePaymentReceipt';
import { MultiPaymentReceipt } from '../components/MultiPaymentReceipt';
import { ServiceInvoice } from '../components/ServiceInvoice';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useApi } from '../hooks/useApi';

import { BUSINESS_CATEGORIES, INDUSTRY_TYPES } from '../constants';

interface CustomerDetailProps {
    customer: Customer;
    onBack: () => void;
    leads: Lead[];
    onAddActivityToLead?: (leadId: string, activityData: any) => Promise<void>;
    refreshData?: () => Promise<void>;
    onUpdateCustomer?: (customerId: string, updates: Partial<Customer>) => Promise<void>;
}

const DocStatusChip: React.FC<{ doc: Document | undefined }> = ({ doc }) => {
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

const CustomerDetail: React.FC<CustomerDetailProps> = ({ customer, onBack, leads, onAddActivityToLead, refreshData, onUpdateCustomer }) => {
    const { leadSources, customers: allCustomers, users: allUsers } = useApi();
    const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
    const [selectedPayments, setSelectedPayments] = useState<Payment[]>([]);
    const [isMultiReceiptOpen, setIsMultiReceiptOpen] = useState(false);
    const [viewingServiceSet, setViewingServiceSet] = useState<ServiceSet | null>(null);

    // Editing Customer Profile states
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editBusinessName, setEditBusinessName] = useState('');
    const [editBusinessCategory, setEditBusinessCategory] = useState('');
    const [editIndustryType, setEditIndustryType] = useState('');
    const [editDob, setEditDob] = useState('');
    const [editPanNumber, setEditPanNumber] = useState('');
    const [editAadharNumber, setEditAadharNumber] = useState('');
    const [editResidentialAddress, setEditResidentialAddress] = useState('');
    const [editBusinessAddress, setEditBusinessAddress] = useState('');
    const [editAlternateMobile, setEditAlternateMobile] = useState('');
    const [editAlternateIsWhatsapp, setEditAlternateIsWhatsapp] = useState(false);
    const [editLeadSource, setEditLeadSource] = useState('');
    const [editReferredByCustomer, setEditReferredByCustomer] = useState('');
    const [editReferredByEmployee, setEditReferredByEmployee] = useState('');

    const handleOpenEdit = () => {
        setEditName(customer.name || '');
        setEditEmail(customer.email || '');
        setEditPhone(customer.phone || '');
        setEditBusinessName(customer.business_name || '');
        setEditBusinessCategory(customer.business_category || '');
        setEditIndustryType(customer.industry_type || '');
        setEditDob(customer.date_of_birth || '');
        setEditPanNumber(customer.pan_number || '');
        setEditAadharNumber(customer.aadhar_number || '');
        setEditResidentialAddress(customer.residential_address || '');
        setEditBusinessAddress(customer.business_address || '');
        setEditAlternateMobile(customer.alternate_mobile || '');
        setEditAlternateIsWhatsapp(customer.alternate_is_whatsapp || false);
        setEditLeadSource(customer.lead_source || 'Other');
        setEditReferredByCustomer(customer.referred_by_customer_id || '');
        setEditReferredByEmployee(customer.referred_by_employee_id || '');
        setIsEditOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onUpdateCustomer) return;

        // Validate Business Details in Edit Customer Form
        if (!editBusinessName?.trim() || !editBusinessCategory?.trim() || !editIndustryType?.trim()) {
            alert('Business Name, Business Category, and Industry Type are mandatory.');
            return;
        }

        try {
            await onUpdateCustomer(customer.id, {
                name: editName,
                email: editEmail,
                phone: editPhone,
                business_name: editBusinessName,
                business_category: editBusinessCategory || undefined,
                industry_type: editIndustryType || undefined,
                date_of_birth: editDob || undefined,
                pan_number: editPanNumber || undefined,
                aadhar_number: editAadharNumber || undefined,
                residential_address: editResidentialAddress || undefined,
                business_address: editBusinessAddress || undefined,
                alternate_mobile: editAlternateMobile || undefined,
                alternate_is_whatsapp: editAlternateMobile ? editAlternateIsWhatsapp : undefined,
                lead_source: editLeadSource,
                referred_by_customer_id: editLeadSource === 'Customer Referral' ? (editReferredByCustomer || null) : null,
                referred_by_employee_id: editLeadSource === 'Employer Referral' ? (editReferredByEmployee || null) : null,
            });
            setIsEditOpen(false);
            if (refreshData) await refreshData();
        } catch (err: any) {
            alert(`Failed to update customer: ${err.message}`);
        }
    };

    const lead = leads.find(l => l.id === customer.lead_id);
    const panDoc = customer.uploaded_documents?.find(d => d.type === 'Pancard');

    const advance_paid = customer.payment_details.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const paymentPending = (customer.payment_details.total_payment || 0) - advance_paid;
    const paymentProgress = customer.payment_details.total_payment ? (advance_paid / customer.payment_details.total_payment) * 100 : 0;

    const formatDob = (dobString: string | undefined) => {
        if (!dobString) return 'Not Specified';
        const parts = dobString.split('-');
        if (parts.length < 3) return dobString;
        const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return dateObj.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleSendBirthdayWish = async () => {
        const currentYear = new Date().getFullYear();
        const message = `*Happy Birthday!* 🎂\n\nDear ${customer.name},\n\nWish you a very Happy Birthday from all of us at 24eFiling! May this year bring you endless happiness, success, and prosperity.\n\nBest regards,\n*24eFiling*`;
        
        let formattedPhone = customer.phone.replace(/[^0-9]/g, '');
        if (formattedPhone.length === 10) {
            formattedPhone = '91' + formattedPhone;
        }
        
        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        
        if (customer.lead_id && onAddActivityToLead) {
            try {
                await onAddActivityToLead(customer.lead_id, {
                    type: 'Call',
                    content: `[Birthday Wish] Sent WhatsApp birthday wish for year ${currentYear}`
                });
                if (refreshData) {
                    await refreshData();
                }
            } catch (e) {
                console.error("Failed to log activity:", e);
            }
        }
        
        window.open(url, '_blank');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSelectPayment = (payment: Payment) => {
        setSelectedPayments(prev =>
            prev.find(p => p.id === payment.id)
                ? prev.filter(p => p.id !== payment.id)
                : [...prev, payment]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedPayments(customer.payment_details.payments || []);
        } else {
            setSelectedPayments([]);
        }
    };

    const allPayments = customer.payment_details.payments || [];
    const allSelected = selectedPayments.length === allPayments.length && allPayments.length > 0;

    return (
        <div className="space-y-6">
            <header>
                <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Back to Customers
                </Button>
                <div className="flex items-center gap-6">
                    <div className="relative h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                        {customer.avatar_url ? (
                            <img src={customer.avatar_url} alt={customer.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                            <UserIcon className="h-12 w-12 text-slate-400" />
                        )}
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
                            <p className="text-slate-500 text-lg">{customer.business_name}</p>
                            <p className="text-sm text-slate-500">Customer since {new Date(customer.date_of_enroll).toLocaleDateString()}</p>
                        </div>
                        {onUpdateCustomer && (
                            <Button variant="outline" size="sm" onClick={handleOpenEdit} className="sm:self-start bg-white shadow-sm border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold gap-1.5 transition-all">
                                ⚙️ Edit Profile
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Services & Invoices</CardTitle>
                            <CardDescription>Manage services requested by this customer and generate invoices.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {customer.service_sets && customer.service_sets.length > 0 ? (
                                <ul className="space-y-3">
                                    {customer.service_sets.map((set, idx) => (
                                        <li key={set.id || idx} className="p-4 border rounded-lg bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="font-semibold text-slate-800">{set.mainService}</h4>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {set.subservices.map((sub, sIdx) => (
                                                        <span key={sIdx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            {sub.name} (x{sub.quantity})
                                                        </span>
                                                    ))}
                                                </div>
                                                <p className="text-sm font-medium text-slate-600 mt-2">
                                                    Set Total: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                                                        set.subservices.reduce((acc, curr) => acc + (curr.amount * curr.quantity) + (curr.tax_amount || 0), 0) + (set.service_fee || 0) - (set.discount || 0)
                                                    )}
                                                </p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setViewingServiceSet(set)} className="shrink-0 gap-2">
                                                <FileTextIcon className="h-4 w-4" />
                                                Generate Invoice
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                                    <p>No detailed service sets available.</p>
                                    <p className="text-xs mt-1">Primary Service: {customer.service_name}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
                            <div><strong className="font-medium text-slate-600 block">Email</strong> <a href={`mailto:${customer.email}`} className="text-[#1c398e] hover:underline">{customer.email}</a></div>
                            <div><strong className="font-medium text-slate-600 block">Phone</strong> <a href={`tel:${customer.phone}`} className="text-[#1c398e] hover:underline">{customer.phone}</a></div>
                            {customer.alternate_mobile && (
                                <div>
                                    <strong className="font-medium text-slate-600 block">Alternate Mobile</strong>
                                    <span className="flex items-center gap-1.5">
                                        <a href={`tel:${customer.alternate_mobile}`} className="text-[#1c398e] hover:underline">{customer.alternate_mobile}</a>
                                        {customer.alternate_is_whatsapp && (
                                            <a href={`https://wa.me/${customer.alternate_mobile.replace(/[^0-9]/g, '').length === 10 ? '91' + customer.alternate_mobile.replace(/[^0-9]/g, '') : customer.alternate_mobile.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full hover:bg-green-100 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-green-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                                WhatsApp
                                            </a>
                                        )}
                                    </span>
                                </div>
                            )}
                            <div><strong className="font-medium text-slate-600 block">PAN Number</strong> {customer.pan_number || 'N/A'}</div>
                            <div><strong className="font-medium text-slate-600 block">Service Name</strong> {customer.service_name}</div>
                            <div><strong className="font-medium text-slate-600 block">Lead Source</strong> {customer.lead_source}</div>
                            {customer.lead_source === 'Customer Referral' && customer.referred_by_customer_id && (
                                <div>
                                    <strong className="font-medium text-slate-600 block">Referring Customer</strong>
                                    <span>
                                        {(() => {
                                            const refCust = allCustomers.find(c => c.id === customer.referred_by_customer_id);
                                            return refCust ? `${refCust.name} (${refCust.business_name || 'No Business'})` : 'Loading / Unknown';
                                        })()}
                                    </span>
                                </div>
                            )}
                            {customer.lead_source === 'Employer Referral' && customer.referred_by_employee_id && (
                                <div>
                                    <strong className="font-medium text-slate-600 block">Referring Employee</strong>
                                    <span>
                                        {(() => {
                                            const refEmp = allUsers.find(u => u.id === customer.referred_by_employee_id);
                                            return refEmp ? `${refEmp.name} (${refEmp.role})` : 'Loading / Unknown';
                                        })()}
                                    </span>
                                </div>
                            )}
                            <div><strong className="font-medium text-slate-600 block">Business Category</strong> {customer.business_category || 'Other'}</div>
                            <div><strong className="font-medium text-slate-600 block">Industry Type</strong> {customer.industry_type || 'Other'}</div>
                            <div>
                                <strong className="font-medium text-slate-600 block">PAN Card</strong>
                                <DocStatusChip doc={panDoc} />
                            </div>
                            <div>
                                <strong className="font-medium text-slate-600 block">Date of Birth</strong>
                                <span>{formatDob(customer.date_of_birth)}</span>
                            </div>
                            <div className="sm:col-span-2"><strong className="font-medium text-slate-600 block">Residential Address</strong> {customer.residential_address || 'N/A'}</div>
                            <div className="sm:col-span-2"><strong className="font-medium text-slate-600 block">Business Address</strong> {customer.business_address || 'N/A'}</div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-none bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-white flex items-center gap-2">
                                <span className="p-1.5 bg-white/20 rounded-lg">🎂</span> Birthday & Engagement
                            </CardTitle>
                            <CardDescription className="text-white/80">Send quick wishes and track customer birthday engagement status.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                                <div>
                                    <p className="text-sm font-semibold text-white/95">Customer Date of Birth</p>
                                    <p className="text-lg font-bold mt-1 text-white">
                                        {customer.date_of_birth ? formatDob(customer.date_of_birth) : 'Not Specified'}
                                    </p>
                                </div>
                                <Button 
                                    onClick={handleSendBirthdayWish}
                                    className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-sm self-start sm:self-auto"
                                >
                                    💬 Send WhatsApp Wish
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                            <img src={customer.assigned_to?.avatar_url || `https://ui-avatars.com/api/?name=UA`} alt={customer.assigned_to?.name || 'Unassigned'} className="h-10 w-10 rounded-full" />
                            <div>
                                <CardTitle className="text-base">Assigned To</CardTitle>
                                <CardDescription>{customer.assigned_to?.name || 'Unassigned'}</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Payment Status</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Paid: ₹{advance_paid.toLocaleString('en-IN')}</span>
                                <span className="text-slate-500">Total: ₹{customer.payment_details.total_payment?.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${paymentProgress}%` }}></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                {paymentPending > 0 ? `₹${paymentPending.toLocaleString('en-IN')} pending` : 'Fully Paid'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Payments Received</CardTitle></CardHeader>
                        <CardContent>
                            {(allPayments && allPayments.length > 0) ? (
                                <>
                                    <div className="flex items-center justify-between mb-3 border-b pb-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="select-all-payments"
                                                checked={allSelected}
                                                onChange={handleSelectAll}
                                                className="h-4 w-4 rounded border-slate-300 text-[#1c398e] focus:ring-[#1c398e]/50"
                                            />
                                            <label htmlFor="select-all-payments" className="text-sm font-medium text-slate-700">Select All</label>
                                        </div>
                                        {selectedPayments.length > 0 && (
                                            <Button size="sm" onClick={() => setIsMultiReceiptOpen(true)}>
                                                Download Selected ({selectedPayments.length})
                                            </Button>
                                        )}
                                    </div>
                                    <ul className="space-y-3 max-h-60 overflow-y-auto">
                                        {allPayments.map(payment => (
                                            <li key={payment.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center group">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPayments.some(p => p.id === payment.id)}
                                                        onChange={() => handleSelectPayment(payment)}
                                                        className="h-4 w-4 rounded border-slate-300 text-[#1c398e] focus:ring-[#1c398e]/50"
                                                    />
                                                    <div>
                                                        <p className="font-semibold text-slate-800">
                                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payment.amount)}
                                                        </p>
                                                        <div className="text-xs text-slate-500 flex items-center flex-wrap gap-2 mt-0.5">
                                                            <span>{new Date(payment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} via {payment.method}</span>
                                                            {payment.service_name && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                                    {payment.service_name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => setViewingPayment(payment)}>
                                                    View Receipt
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <p className="text-sm text-slate-500 italic">No payments recorded for this customer.</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
                        <CardContent>
                            {customer.uploaded_documents && customer.uploaded_documents.length > 0 ? (
                                <ul className="space-y-2">
                                    {customer.uploaded_documents.map(doc => (
                                        <li key={doc.id} className="text-sm flex justify-between items-center group bg-slate-50 p-2 rounded-md">
                                            <div className="flex-1 overflow-hidden">
                                                <p className="font-medium truncate text-slate-800" title={doc.name}>{doc.type}</p>
                                                <p className="text-xs text-slate-500 truncate">{doc.name}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="ghost" size="sm">View</Button>
                                                </a>
                                                <a href={doc.url} download={doc.name}>
                                                    <Button variant="ghost" size="sm"><DownloadIcon className="h-4 w-4" /></Button>
                                                </a>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500 italic">No documents found.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog isOpen={!!viewingPayment} onClose={() => setViewingPayment(null)} title={`Receipt #${viewingPayment?.receipt_number}`} maxWidth="max-w-4xl">
                {lead && viewingPayment && (
                    <SinglePaymentReceipt customer={customer} lead={lead} payment={viewingPayment} />
                )}
            </Dialog>

            <Dialog isOpen={isMultiReceiptOpen} onClose={() => setIsMultiReceiptOpen(false)} title={`Selected Receipts (${selectedPayments.length})`} maxWidth="max-w-4xl">
                {lead && selectedPayments.length > 0 && (
                    <MultiPaymentReceipt customer={customer} lead={lead} payments={selectedPayments} />
                )}
            </Dialog>

            <Dialog isOpen={!!viewingServiceSet} onClose={() => setViewingServiceSet(null)} title="Generate Invoice" maxWidth="max-w-3xl">
                {viewingServiceSet && (
                    <>
                        <div id="service-invoice-content" className="bg-white">
                            <ServiceInvoice customer={customer} lead={lead} serviceSet={viewingServiceSet} />
                        </div>
                        <div className="flex justify-end mt-6 gap-3 pb-2 pr-2">
                            <Button variant="outline" onClick={() => setViewingServiceSet(null)}>Close</Button>
                            <Button onClick={handlePrint}>Print / Save PDF</Button>
                        </div>
                    </>
                )}
            </Dialog>

            {/* Edit Customer Dialog */}
            <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Customer Profile" maxWidth="max-w-xl">
                <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                            <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Phone *</label>
                            <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Business Name *</label>
                            <input type="text" value={editBusinessName} onChange={(e) => setEditBusinessName(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Date of Birth</label>
                            <input type="date" value={editDob} onChange={(e) => setEditDob(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Business Category *</label>
                            <SearchableSelect
                                options={BUSINESS_CATEGORIES}
                                value={editBusinessCategory}
                                onChange={(val) => setEditBusinessCategory(val)}
                                placeholder="Select Category..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Industry Type *</label>
                            <SearchableSelect
                                options={INDUSTRY_TYPES}
                                value={editIndustryType}
                                onChange={(val) => setEditIndustryType(val)}
                                placeholder="Select Industry..."
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Lead Source *</label>
                            <SearchableSelect
                                options={leadSources.map(s => ({ value: s.source_name, label: s.source_name }))}
                                value={editLeadSource}
                                onChange={(val) => {
                                    setEditLeadSource(val);
                                    if (val !== 'Customer Referral') setEditReferredByCustomer('');
                                    if (val !== 'Employer Referral') setEditReferredByEmployee('');
                                }}
                                placeholder="Select Lead Source..."
                            />
                        </div>
                    </div>
                    {editLeadSource === 'Customer Referral' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Referring Customer *</label>
                            <SearchableSelect
                                options={allCustomers.filter(c => c.id !== customer.id).map(c => ({ value: c.id, label: `${c.name} (${c.business_name || 'No Business'})` }))}
                                value={editReferredByCustomer}
                                onChange={(val) => setEditReferredByCustomer(val)}
                                placeholder="Search & Select Customer..."
                            />
                        </div>
                    )}
                    {editLeadSource === 'Employer Referral' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Referring Employee *</label>
                            <SearchableSelect
                                options={allUsers.map(u => ({ value: u.id, label: `${u.name} (${u.role})` }))}
                                value={editReferredByEmployee}
                                onChange={(val) => setEditReferredByEmployee(val)}
                                placeholder="Search & Select Employee..."
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">PAN Number</label>
                            <input type="text" value={editPanNumber} onChange={(e) => setEditPanNumber(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Aadhar Number</label>
                            <input type="text" value={editAadharNumber} onChange={(e) => setEditAadharNumber(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
                        </div>
                    </div>
                    <div className="border-t pt-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Alternate Mobile Number</label>
                        <div className="flex items-start gap-3">
                            <input type="tel" value={editAlternateMobile} onChange={(e) => setEditAlternateMobile(e.target.value)} placeholder="e.g., 9876543211" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
                            <div
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all select-none ${editAlternateIsWhatsapp ? 'bg-green-50 border-green-400 text-green-700' : 'bg-slate-50 border-slate-300 text-slate-600'}`}
                                onClick={() => setEditAlternateIsWhatsapp(prev => !prev)}
                            >
                                <input type="checkbox" checked={editAlternateIsWhatsapp} onChange={(e) => setEditAlternateIsWhatsapp(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-green-600 cursor-pointer" onClick={(e) => e.stopPropagation()} />
                                <label className="text-sm font-medium cursor-pointer whitespace-nowrap flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`h-4 w-4 ${editAlternateIsWhatsapp ? 'text-green-600' : 'text-slate-400'}`}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    WhatsApp
                                </label>
                            </div>
                        </div>
                        {editAlternateMobile && (
                            <p className={`text-xs mt-1.5 font-medium ${editAlternateIsWhatsapp ? 'text-green-600' : 'text-slate-500'}`}>
                                {editAlternateIsWhatsapp ? '✅ Alternate number is also a WhatsApp number.' : '📱 Mobile only (not WhatsApp).'}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Residential Address</label>
                        <textarea value={editResidentialAddress} onChange={(e) => setEditResidentialAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white h-20" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Business Address</label>
                        <textarea value={editBusinessAddress} onChange={(e) => setEditBusinessAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white h-20" />
                    </div>
                    <div className="flex justify-end gap-2 border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-[#1c398e] hover:bg-[#152c6f] text-white">Save Changes</Button>
                    </div>
                </form>
            </Dialog>
        </div>
    )
};

export default CustomerDetail;