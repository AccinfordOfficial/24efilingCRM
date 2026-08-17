import React, { useState, useEffect, useCallback } from 'react';
import { Lead, Activity, Document, Task, Payment, TaskPriority } from '../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ArrowLeftIcon, FileTextIcon, BriefcaseIcon, EditIcon } from '../components/icons';
import { getStatusColor, getPriorityColor, DOCUMENT_TYPES, TASK_PRIORITIES } from '../constants';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { calculateLeadScore, getScoreCategory, getScoreBreakdown } from '../lib/scoring';
import { useApi } from '../hooks/useApi';
import { supabase } from '../lib/supabaseClient';
import { getNextPaymentSequenceClientSide, formatPaymentReferenceId } from '../lib/paymentUtils';
import { StandardInvoice, InvoiceItem } from '../components/StandardInvoice';
import { Dialog } from '../components/ui/Dialog';
import { EditPaymentDialog } from '../components/EditPaymentDialog';
import { CompletenessMeter } from '../components/ui/CompletenessMeter';

// Import split components
import { LeadStatusStepper } from './lead-detail/LeadStatusStepper';
import { LeadScoreBreakdown } from './lead-detail/LeadScoreBreakdown';
import { LeadOverviewTab } from './lead-detail/LeadOverviewTab';
import { LeadActivitiesTab } from './lead-detail/LeadActivitiesTab';
import { LeadDocumentsTab } from './lead-detail/LeadDocumentsTab';
import { LeadTasksTab } from './lead-detail/LeadTasksTab';
import { LeadPaymentsTab } from './lead-detail/LeadPaymentsTab';

interface LeadDetailProps {
    lead: Lead;
    onBack: () => void;
    onUpdateLead: (lead: Lead) => void;
    onAddActivity: (content: string) => void;
    onUploadDocument: (file: File, docType: string) => Promise<void>;
    onDeleteDocument: (docId: string) => Promise<void>;
    onEditLead: () => void;
    onAddTask: (content: string, dueDate: string | undefined, priority: TaskPriority) => Promise<void>;
    onUpdateTask: (task: Task) => Promise<void>;
    onDeleteTask: (taskId: string) => Promise<void>;
}

interface DocumentUploadRow {
    id: number;
    docType: string;
    file: File | null;
}

const LeadDetail: React.FC<LeadDetailProps> = ({
    lead,
    onBack,
    onUpdateLead,
    onAddActivity,
    onUploadDocument,
    onDeleteDocument,
    onEditLead,
    onAddTask,
    onUpdateTask,
    onDeleteTask
}) => {
    const fetchLeadDetails = useCallback(async (leadId: string) => {
        const { data: actData } = await supabase.from('activities').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
        const { data: docData } = await supabase.from('documents').select('*').eq('lead_id', leadId).order('uploaded_at', { ascending: false });
        const { data: taskData } = await supabase.from('tasks').select('*, created_by:profiles!tasks_created_by_fkey(name)').eq('lead_id', leadId).order('due_date', { ascending: true });
        return {
            activities: actData || [],
            documents: docData || [],
            tasks: taskData || []
        };
    }, []);

    // Local state for tabs
    const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'documents' | 'tasks' | 'payments'>('overview');

    // Local state for full details (Lazy Loading)
    const [details, setDetails] = useState<{
        activities: Activity[];
        documents: Document[];
        tasks: Task[];
    }>({ activities: [], documents: [], tasks: [] });

    const [isLoadingDetails, setIsLoadingDetails] = useState(true);

    // Fetch details on mount or when lead changes
    useEffect(() => {
        let isMounted = true;
        const loadDetails = async () => {
            setIsLoadingDetails(true);
            try {
                const data = await fetchLeadDetails(lead.id);
                if (isMounted) {
                    setDetails(data);
                }
            } catch (error) {
                console.error("Failed to load lead details:", error);
            } finally {
                if (isMounted) setIsLoadingDetails(false);
            }
        };

        loadDetails();

        return () => {
            isMounted = false;
        };
    }, [lead.id, fetchLeadDetails, lead.activities?.length, lead.documents?.length, lead.tasks?.length]);

    const [newNote, setNewNote] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [docToDelete, setDocToDelete] = useState<Document | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [newTaskContent, setNewTaskContent] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('Medium');
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [isTaskDeleteConfirmOpen, setIsTaskDeleteConfirmOpen] = useState(false);
    const [animatedTaskId, setAnimatedTaskId] = useState<string | null>(null);
    const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);
    const [documentUploads, setDocumentUploads] = useState<DocumentUploadRow[]>([{ id: Date.now(), docType: DOCUMENT_TYPES[0], file: null }]);
    
    // Payment state
    const [newPaymentAmount, setNewPaymentAmount] = useState('');
    const [newPaymentMethod, setNewPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer'>('UPI');
    const [newPaymentServiceId, setNewPaymentServiceId] = useState('');
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false); 
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null); 

    const score = lead.score ?? calculateLeadScore(lead);
    const scoreInfo = getScoreCategory(score);
    const scoreBreakdown = getScoreBreakdown(lead);

    const handleAddNote = () => {
        if (newNote.trim()) {
            onAddActivity(newNote.trim());
            setNewNote('');
        }
    };

    const handleDeleteClick = (doc: Document) => {
        setDocToDelete(doc);
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (docToDelete) {
            await onDeleteDocument(docToDelete.id);
            setIsDeleteConfirmOpen(false);
            setDocToDelete(null);
        }
    };

    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
    const [editTaskContent, setEditTaskContent] = useState('');
    const [editTaskDueDate, setEditTaskDueDate] = useState('');
    const [editTaskPriority, setEditTaskPriority] = useState<TaskPriority>('Medium');

    const handleAddTask = async () => {
        if (newTaskContent.trim()) {
            setIsLoadingDetails(true);
            try {
                await onAddTask(newTaskContent.trim(), newTaskDueDate || undefined, newTaskPriority);
                const data = await fetchLeadDetails(lead.id);
                setDetails(data);
                setNewTaskContent('');
                setNewTaskDueDate('');
                setNewTaskPriority('Medium');
                setIsTaskDialogOpen(false);
            } catch (e) {
                console.error("Failed to add task:", e);
            } finally {
                setIsLoadingDetails(false);
            }
        }
    };

    const handleToggleTask = async (task: Task) => {
        const updatedTask = {
            ...task,
            is_completed: !task.is_completed,
            completed_at: !task.is_completed ? new Date().toISOString() : undefined,
        };
        
        setAnimatedTaskId(task.id);
        setTimeout(() => setAnimatedTaskId(null), 700);

        if (updatedTask.is_completed) {
            setCompletedTaskId(task.id);
            setTimeout(() => setCompletedTaskId(null), 1000);
        }

        setIsLoadingDetails(true);
        try {
            await onUpdateTask(updatedTask);
            const data = await fetchLeadDetails(lead.id);
            setDetails(data);
        } catch (e) {
            console.error("Failed to update task:", e);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleDeleteTaskClick = (task: Task) => {
        setTaskToDelete(task);
        setIsTaskDeleteConfirmOpen(true);
    };

    const handleConfirmDeleteTask = async () => {
        if (taskToDelete) {
            setIsLoadingDetails(true);
            try {
                await onDeleteTask(taskToDelete.id);
                const data = await fetchLeadDetails(lead.id);
                setDetails(data);
                setIsTaskDeleteConfirmOpen(false);
                setTaskToDelete(null);
            } catch (e) {
                console.error("Failed to delete task:", e);
            } finally {
                setIsLoadingDetails(false);
            }
        }
    };

    const handleEditTaskClick = (task: Task) => {
        setEditingTask(task);
        setEditTaskContent(task.content);
        setEditTaskDueDate(task.due_date ? task.due_date.substring(0, 16) : '');
        setEditTaskPriority(task.priority);
        setIsEditTaskDialogOpen(true);
    };

    const handleSaveTaskEdit = async () => {
        if (editingTask && editTaskContent.trim()) {
            const updatedTask: Task = {
                ...editingTask,
                content: editTaskContent.trim(),
                due_date: editTaskDueDate || undefined,
                priority: editTaskPriority,
            };
            setIsLoadingDetails(true);
            try {
                await onUpdateTask(updatedTask);
                const data = await fetchLeadDetails(lead.id);
                setDetails(data);
                setIsEditTaskDialogOpen(false);
                setEditingTask(null);
            } catch (e) {
                console.error("Failed to edit task:", e);
            } finally {
                setIsLoadingDetails(false);
            }
        }
    };

    const handleAddUploadRow = () => {
        setDocumentUploads(prev => [...prev, { id: Date.now(), docType: DOCUMENT_TYPES[0], file: null }]);
    };

    const handleRemoveUploadRow = (id: number) => {
        setDocumentUploads(prev => prev.filter(row => row.id !== id));
    };

    const handleUploadRowChange = (id: number, updates: Partial<DocumentUploadRow>) => {
        setDocumentUploads(prev => prev.map(row =>
            row.id === id ? { ...row, ...updates } : row
        ));
    };

    const handleUploadSelectedFiles = async () => {
        const filesToUpload = documentUploads.filter(row => row.file);
        if (filesToUpload.length === 0) return;

        setIsUploading(true);
        try {
            for (const upload of filesToUpload) {
                if (upload.file) {
                    await onUploadDocument(upload.file, upload.docType);
                }
            }
            setDocumentUploads([{ id: Date.now(), docType: DOCUMENT_TYPES[0], file: null }]);
            const data = await fetchLeadDetails(lead.id);
            setDetails(data);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddPayment = async (amountArg?: number, methodArg?: string, serviceId?: string, serviceName?: string) => {
        const amount = amountArg || parseFloat(newPaymentAmount);
        const method = (methodArg as any) || newPaymentMethod;

        if (!amount || amount <= 0) {
            alert("Please enter a valid payment amount.");
            return;
        }

        const selectedServiceId = serviceId || newPaymentServiceId;
        let paymentServiceName = serviceName;
        if (!paymentServiceName && selectedServiceId) {
            paymentServiceName = lead.service_sets?.find(s => s.id === selectedServiceId)?.mainService;
        }

        const currentYear = new Date().getFullYear();
        let nextSeq: number;
        try {
            const { data, error } = await (supabase.rpc as any)('generate_next_payment_sequence', { payment_year: currentYear });
            if (error || data === null) throw error || new Error("RPC returned null");
            nextSeq = Number(data);
        } catch (err) {
            console.warn("Postgres RPC not available, falling back to database-wide client-side sequence calculation", err);
            try {
                const { data: leadsData } = await supabase.from('leads').select('payments');
                const mockLeads = (leadsData || []) as any[];
                nextSeq = getNextPaymentSequenceClientSide(mockLeads, currentYear);
            } catch (fallbackErr) {
                console.error("Database fetch fallback failed, using current lead's payments only", fallbackErr);
                nextSeq = getNextPaymentSequenceClientSide([lead], currentYear);
            }
        }
        const receiptNumber = formatPaymentReferenceId(nextSeq, currentYear);

        const newPayment: Payment = {
            id: `pay_${Date.now()}`,
            amount,
            received: amount,
            tax: 0,
            fee: 0,
            total: 0,
            due: 0 - amount,
            sales_amount: amount,
            method,
            date: new Date().toISOString(),
            receipt_number: receiptNumber,
            service_set_id: selectedServiceId,
            service_name: paymentServiceName,
        };
        const updatedPayments = [...(lead.payments || []), newPayment];
        
        const newAdvance = updatedPayments.reduce((sum, p) => sum + (p.received || p.amount || 0), 0);
        const newRemaining = Math.max(0, (lead.total_payment || 0) - newAdvance);

        await onUpdateLead({ 
            ...lead, 
            payments: updatedPayments,
            advance_amount: newAdvance,
            remaining_amount: newRemaining
        });
        const refreshedDetails = await fetchLeadDetails(lead.id);
        setDetails(refreshedDetails);
        setNewPaymentAmount('');
        setNewPaymentServiceId('');
    };

    const handleStatusUpdate = (newStatus: Lead['status']) => {
        onUpdateLead({ ...lead, status: newStatus });
    };

    const handleSavePaymentEdit = (updatedPayment: Payment, remarks: string) => {
        const updatedPayments = lead.payments?.map(p => p.id === updatedPayment.id ? updatedPayment : p) || [];
        const oldPayment = lead.payments?.find(p => p.id === updatedPayment.id);
        
        const changes = [];
        if (oldPayment?.received !== updatedPayment.received) changes.push(`Received: ${oldPayment?.received} -> ${updatedPayment.received}`);
        if (oldPayment?.tax !== updatedPayment.tax) changes.push(`Tax: ${oldPayment?.tax} -> ${updatedPayment.tax}`);
        if (oldPayment?.fee !== updatedPayment.fee) changes.push(`Fee: ${oldPayment?.fee} -> ${updatedPayment.fee}`);
        if (oldPayment?.sales_amount !== updatedPayment.sales_amount) changes.push(`SalesCredit: ${oldPayment?.sales_amount} -> ${updatedPayment.sales_amount}`);
        if (oldPayment?.date !== updatedPayment.date) changes.push(`Date: ${new Date(oldPayment?.date || '').toLocaleDateString()} -> ${new Date(updatedPayment.date).toLocaleDateString()}`);
        if (oldPayment?.method !== updatedPayment.method) changes.push(`Mode: ${oldPayment?.method} -> ${updatedPayment.method}`);
        
        const logContent = `Payment Receipt Edited (${updatedPayment.receipt_number}). ${changes.join(', ')}. Audit Note: ${remarks}`;
        onAddActivity(logContent);
        
        const newAdvance = updatedPayments.reduce((sum, p) => sum + (p.received || p.amount || 0), 0);
        const newRemaining = Math.max(0, (lead.total_payment || 0) - newAdvance);

        onUpdateLead({ 
            ...lead, 
            payments: updatedPayments,
            advance_amount: newAdvance,
            remaining_amount: newRemaining
        });
        setEditingPayment(null);
    };

    const advance_paid = lead.payments?.reduce((sum, p) => sum + (p.received || p.amount || 0), 0) || 0;

    // Use local details for rendering lists
    const displayTasks = details.tasks;
    const displayDocuments = details.documents;
    const displayActivities = details.activities;

    const [isReceiptOpen, setIsReceiptOpen] = useState(false);

    const handleOpenReceipt = () => {
        setIsReceiptOpen(true);
    };

    const invoiceItems: InvoiceItem[] = lead.service_sets?.flatMap(set => {
        const items = set.subservices.map(sub => ({
            name: sub.name,
            description: set.mainService !== sub.name ? set.mainService : undefined,
            quantity: sub.quantity,
            rate: sub.amount,
            taxAmount: sub.tax_amount,
            total: (sub.amount * sub.quantity) + (sub.tax_amount || 0),
            date: new Date(lead.created_at).toLocaleDateString('en-GB')
        }));
        if (set.service_fee && set.service_fee > 0) {
            items.push({
                name: "Service Fee",
                description: `${set.mainService} - Surcharges`,
                quantity: 1,
                rate: set.service_fee,
                total: set.service_fee
            });
        }
        return items;
    }) || [];

    if (invoiceItems.length === 0 && (lead.total_payment || 0) > 0) {
        invoiceItems.push({
            name: "Professional Services",
            description: lead.service_requested || "Services as agreed",
            quantity: 1,
            rate: lead.total_payment || 0,
            total: lead.total_payment || 0
        });
    }

    const receiptSubtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);

    const getLeadCompleteness = (l: Lead) => {
        const fields = [
            { name: 'Business Name', filled: !!l.business_name },
            { name: 'First Name', filled: !!l.first_name },
            { name: 'Last Name', filled: !!l.last_name },
            { name: 'Email Address', filled: !!l.email },
            { name: 'Phone Number', filled: !!l.phone_number },
            { name: 'PAN Number', filled: !!l.pan_number },
            { name: 'Aadhaar Card', filled: !!l.aadhar_number },
            { name: 'Personal Address', filled: !!(l.residential_address || l.personal_city) },
            { name: 'Business Address', filled: !!(l.business_address || l.business_city) },
            { name: 'Service Requested', filled: !!(l.service_requested || (l.service_sets && l.service_sets.length > 0)) },
        ];
        const filledCount = fields.filter(f => f.filled).length;
        const missingFields = fields.filter(f => !f.filled).map(f => f.name);
        const percentage = Math.round((filledCount / fields.length) * 100);
        return { percentage, missingFields };
    };

    const leadCompleteness = getLeadCompleteness(lead);

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 shrink-0 self-start">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Button>
                    <div className="relative h-20 w-20 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        {lead.avatar_url ? (
                            <img src={lead.avatar_url} alt={lead.business_name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                            <BriefcaseIcon className="h-10 w-10 text-slate-400" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                            {lead.business_name}
                            {lead.reference_number && (
                                <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-900/30 text-primary border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded shadow-sm">
                                    {lead.reference_number}
                                </span>
                            )}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">{lead.first_name} {lead.last_name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Lead since {new Date(lead.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="self-start flex flex-wrap items-center gap-3">
                    <CompletenessMeter percentage={leadCompleteness.percentage} missingFields={leadCompleteness.missingFields} title="Lead Profile" />
                    <Button variant="outline" className="gap-2" onClick={handleOpenReceipt}>
                        <FileTextIcon className="h-4 w-4" /> View Receipt
                    </Button>
                    <Button variant="primary" className="gap-2" onClick={onEditLead}> <EditIcon className="h-4 w-4" /> Edit Lead</Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Workflow pipeline stage stepper */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Lead Workflow</CardTitle>
                        </CardHeader>
                         <CardContent>
                            <LeadStatusStepper currentStatus={lead.status} onStatusChange={handleStatusUpdate} />
                             {lead.status !== 'Lost' && lead.status !== 'Success' && (
                                <div className="mt-6 text-center border-t border-slate-200 dark:border-white/10 pt-4">
                                    <Button variant="destructive" size="sm" onClick={() => handleStatusUpdate('Lost')}>Mark as Lost</Button>
                                    <Button variant="outline" size="sm" onClick={() => handleStatusUpdate('Success')} className="ml-2 text-green-600 dark:text-green-400 hover:text-green-700 bg-green-50 dark:bg-green-950/40 hover:bg-green-100 border-green-200 dark:border-green-800">Mark as Success</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-200 dark:border-white/10 gap-6">
                        <button 
                            onClick={() => setActiveTab('overview')} 
                            className={`pb-3 font-semibold text-sm border-b-2 transition-all ${
                                activeTab === 'overview' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            Overview
                        </button>
                        <button 
                            onClick={() => setActiveTab('activities')} 
                            className={`pb-3 font-semibold text-sm border-b-2 transition-all ${
                                activeTab === 'activities' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            Activities ({displayActivities?.length || 0})
                        </button>
                        <button 
                            onClick={() => setActiveTab('documents')} 
                            className={`pb-3 font-semibold text-sm border-b-2 transition-all ${
                                activeTab === 'documents' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            Documents ({displayDocuments?.length || 0})
                        </button>
                        <button 
                            onClick={() => setActiveTab('tasks')} 
                            className={`pb-3 font-semibold text-sm border-b-2 transition-all ${
                                activeTab === 'tasks' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            Tasks ({displayTasks?.length || 0})
                        </button>
                        <button 
                            onClick={() => setActiveTab('payments')} 
                            className={`pb-3 font-semibold text-sm border-b-2 transition-all ${
                                activeTab === 'payments' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            Payments ({lead.payments?.length || 0})
                        </button>
                    </div>

                    {/* Tab Contents */}
                    <div>
                        {activeTab === 'overview' && (
                            <LeadOverviewTab 
                                lead={lead} 
                                onAddPayment={(amount, method, serviceId, serviceName) => handleAddPayment(amount, method, serviceId, serviceName)} 
                            />
                        )}

                        {activeTab === 'activities' && (
                            <LeadActivitiesTab 
                                activities={displayActivities}
                                newNote={newNote}
                                setNewNote={setNewNote}
                                onAddNote={handleAddNote}
                                isLoadingDetails={isLoadingDetails}
                            />
                        )}

                        {activeTab === 'documents' && (
                            <LeadDocumentsTab 
                                documents={displayDocuments}
                                documentUploads={documentUploads}
                                isUploading={isUploading}
                                isLoadingDetails={isLoadingDetails}
                                handleAddUploadRow={handleAddUploadRow}
                                handleRemoveUploadRow={handleRemoveUploadRow}
                                handleUploadRowChange={handleUploadRowChange}
                                handleUploadSelectedFiles={handleUploadSelectedFiles}
                                handleDeleteClick={handleDeleteClick}
                            />
                        )}

                        {activeTab === 'tasks' && (
                            <LeadTasksTab 
                                tasks={displayTasks}
                                isTaskDialogOpen={isTaskDialogOpen}
                                setIsTaskDialogOpen={setIsTaskDialogOpen}
                                newTaskContent={newTaskContent}
                                setNewTaskContent={setNewTaskContent}
                                newTaskDueDate={newTaskDueDate}
                                setNewTaskDueDate={setNewTaskDueDate}
                                newTaskPriority={newTaskPriority}
                                setNewTaskPriority={setNewTaskPriority}
                                handleAddTask={handleAddTask}
                                isLoadingDetails={isLoadingDetails}
                                completedTaskId={completedTaskId}
                                animatedTaskId={animatedTaskId}
                                handleToggleTask={handleToggleTask}
                                handleEditTaskClick={handleEditTaskClick}
                                handleDeleteTaskClick={handleDeleteTaskClick}
                            />
                        )}

                        {activeTab === 'payments' && (
                            <LeadPaymentsTab 
                                lead={lead}
                                advance_paid={advance_paid}
                                newPaymentAmount={newPaymentAmount}
                                setNewPaymentAmount={setNewPaymentAmount}
                                newPaymentMethod={newPaymentMethod}
                                setNewPaymentMethod={setNewPaymentMethod}
                                newPaymentServiceId={newPaymentServiceId}
                                setNewPaymentServiceId={setNewPaymentServiceId}
                                handleAddPayment={() => handleAddPayment()}
                                handleOpenReceipt={handleOpenReceipt}
                                setEditingPayment={setEditingPayment}
                            />
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Status & Priority Card */}
                    <Card>
                         <CardContent className="p-4 grid grid-cols-2 gap-4">
                             <div>
                                <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Status</h4>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                                    {lead.status}
                                </span>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Priority</h4>
                                <div className="flex items-center gap-2">
                                    <div className={`h-2.5 w-2.5 rounded-full ${getPriorityColor(lead.priority)}`}></div>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">{lead.priority}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Assigned Employee Card */}
                     <Card>
                        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                            {lead.assigned_to ? (
                                <img src={lead.assigned_to.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.assigned_to.name)}`} alt={lead.assigned_to.name} className="h-10 w-10 rounded-full" />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-primary font-bold text-sm shrink-0">HO</div>
                            )}
                            <div>
                                <CardTitle className="text-base">Assigned To</CardTitle>
                                <CardDescription className="flex items-center gap-1">
                                    {lead.assigned_to ? lead.assigned_to.name : (
                                        <span className="font-semibold text-primary">🏢 Head Office</span>
                                    )}
                                </CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                    
                    {/* Score Card Breakdown */}
                    <LeadScoreBreakdown 
                        score={score}
                        scoreInfo={scoreInfo}
                        scoreBreakdown={scoreBreakdown}
                    />
                </div>
            </div>

            {/* Receipt Modal */}
            <Dialog 
                isOpen={isReceiptOpen} 
                onClose={() => setIsReceiptOpen(false)}
                title="Payment Receipt"
                maxWidth="max-w-4xl"
            >
                <StandardInvoice
                    customer={{
                        name: lead.first_name + ' ' + lead.last_name,
                        email: lead.email,
                        phone: lead.phone_number,
                        address: lead.address,
                        business_name: lead.business_name || '',
                        business_address: lead.address,
                        id: lead.id,
                        reference_number: lead.reference_number,
                        branch_name: '',
                        created_at: lead.created_at,
                        is_active: true,
                    } as any}
                    invoiceNumber={lead.payments && lead.payments.length > 0 ? lead.payments[lead.payments.length - 1].receipt_number : (lead.reference_number || `E-000-${new Date(lead.created_at).getFullYear()}`)}
                    date={new Date().toLocaleDateString('en-GB')}
                    items={invoiceItems}
                    subtotal={receiptSubtotal}
                    tax={0}
                    total={receiptSubtotal}
                    paid={advance_paid}
                    due={receiptSubtotal - advance_paid}
                />
            </Dialog>

            {/* Delete Document Confirmation */}
            <ConfirmationDialog
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Document"
                description={`Are you sure you want to delete ${docToDelete?.name}? This action cannot be undone.`}
            />

            {/* Delete Task Confirmation */}
            <ConfirmationDialog
                isOpen={isTaskDeleteConfirmOpen}
                onClose={() => setIsTaskDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDeleteTask}
                title="Delete Task"
                description={`Are you sure you want to delete the task: "${taskToDelete?.content}"?`}
            />

            {/* Edit Task Dialog */}
            {isEditTaskDialogOpen && (
                <Dialog 
                    isOpen={isEditTaskDialogOpen} 
                    onClose={() => setIsEditTaskDialogOpen(false)}
                    title="Edit Task"
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Task Content</label>
                            <Input 
                                value={editTaskContent} 
                                onChange={(e) => setEditTaskContent(e.target.value)} 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                                <Input 
                                    type="datetime-local" 
                                    value={editTaskDueDate} 
                                    onChange={(e) => setEditTaskDueDate(e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                                <Select
                                    value={editTaskPriority}
                                    onChange={(e) => setEditTaskPriority(e.target.value as TaskPriority)}
                                >
                                    {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/10">
                            <Button variant="ghost" onClick={() => setIsEditTaskDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveTaskEdit}>Save Changes</Button>
                        </div>
                    </div>
                </Dialog>
            )}

            {/* Edit Payment Receipt Dialog */}
            {editingPayment && (
                <EditPaymentDialog
                    isOpen={!!editingPayment}
                    onClose={() => setEditingPayment(null)}
                    payment={editingPayment}
                    onSave={handleSavePaymentEdit}
                    totalInvoiceValue={lead.total_payment || 0}
                />
            )}
        </div>
    );
};

export default LeadDetail;