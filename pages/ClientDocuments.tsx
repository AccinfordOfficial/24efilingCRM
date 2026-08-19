import React, { useRef, useState, useMemo } from 'react';
import { Lead, Document as DocType } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FileUpIcon, Trash2Icon, CalendarIcon, SearchIcon, FileTextIcon, DownloadIcon } from '../components/icons';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { Popover } from '../components/ui/Popover';
import { Calendar } from '../components/ui/Calendar';

interface ClientDocumentsProps {
    leads: Lead[];
    customers?: any[];
    dateRange?: { from?: string; to?: string };
    setDateRange?: (value: React.SetStateAction<{ from: string; to: string; }>) => void;
    onUploadDocument?: (leadId: string, file: File, docType?: string) => Promise<void>;
    onDeleteDocument?: (leadId: string, docId: string) => Promise<void>;
    onViewLead?: (leadId: string) => void;
    onViewCustomer?: (customerId: string) => void;
    currentUser?: any;
}

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

const ClientDocuments: React.FC<ClientDocumentsProps> = ({ 
    leads = [], 
    dateRange, 
    setDateRange, 
    onUploadDocument, 
    onDeleteDocument, 
    onViewLead 
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingLeadId, setUploadingLeadId] = useState<string | null>(null);
    const [docToDelete, setDocToDelete] = useState<{ leadId: string; doc: DocType } | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const getStatusChip = (status: 'Pending' | 'Approved' | 'Rejected') => {
        const colors = {
            Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            Approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            Rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        };
        return <span className={`px-2.5 py-0.5 text-[10px] uppercase font-extrabold rounded-full border ${colors[status]}`}>{status}</span>;
    };

    const handleUploadClick = (leadId: string) => {
        setUploadingLeadId(leadId);
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && uploadingLeadId && onUploadDocument) {
            try {
                await onUploadDocument(uploadingLeadId, file);
            } catch (error) {
                console.error("Upload failed", error);
            } finally {
                setUploadingLeadId(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        }
    };

    const handleDeleteClick = (leadId: string, doc: DocType) => {
        setDocToDelete({ leadId, doc });
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (docToDelete && onDeleteDocument) {
            await onDeleteDocument(docToDelete.leadId, docToDelete.doc.id);
            setIsDeleteConfirmOpen(false);
            setDocToDelete(null);
        }
    };

    const filteredLeads = useMemo(() => {
        return (leads || []).filter(lead => {
            const bName = (lead?.business_name || '').toLowerCase();
            const fName = (lead?.first_name || '').toLowerCase();
            const lName = (lead?.last_name || '').toLowerCase();
            const q = (searchQuery || '').toLowerCase();

            return bName.includes(q) || `${fName} ${lName}`.includes(q);
        });
    }, [leads, searchQuery]);

    return (
        <div className="space-y-6 h-full flex flex-col">
            <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight dark:text-white">Client Documents</h1>
                    <p className="dark:text-slate-400 text-sm mt-1">Centralized document management repository for all client records.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-slate-900/80 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Popover
                            align="end"
                            trigger={
                                <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-semibold gap-2 bg-slate-900/80 border-white/10 text-slate-200 shadow-md hover:bg-slate-800">
                                    <CalendarIcon className="h-4 w-4 text-blue-400" />
                                    <span className="hidden sm:inline">
                                        {dateRange && dateRange.from ? (
                                            dateRange.to ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}` : `${formatDate(dateRange.from)}`
                                        ) : (
                                            <span className="text-slate-400">Filter Date</span>
                                        )}
                                    </span>
                                </Button>
                            }
                            content={<Calendar dateRange={dateRange || { from: '', to: '' }} onDateChange={setDateRange} />}
                        />
                        {dateRange && (dateRange.from || dateRange.to) && setDateRange && (
                            <Button variant="ghost" size="icon" onClick={() => setDateRange({ from: '', to: '' })} className="text-rose-400 hover:bg-rose-500/10">
                                <Trash2Icon className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <div className="glass-card bg-slate-900/80 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex-1 flex flex-col min-h-0 backdrop-blur-md">
                <div className="relative overflow-auto flex-1 max-h-[72vh]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-900 text-slate-300 font-bold border-b border-white/10 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 w-[260px]">Client Details</th>
                                <th className="px-6 py-4">Documents Repository</th>
                                <th className="px-6 py-4 w-[140px] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLeads.map(lead => (
                                <tr key={lead.id} className="group hover:bg-slate-800/40 transition-colors">
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex flex-col">
                                            <button 
                                                onClick={() => onViewLead && onViewLead(lead.id)} 
                                                className="font-bold text-white text-base text-left hover:text-blue-400 hover:underline transition-colors w-fit"
                                            >
                                                {lead.business_name || 'Untitled Business'}
                                            </button>
                                            <span className="text-slate-400 font-medium text-xs mt-0.5">{lead.first_name} {lead.last_name}</span>
                                            <span className="text-[10px] font-mono text-slate-500 mt-1">ID: {lead.id.slice(0, 8)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        {lead.documents && lead.documents.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2.5">
                                                {lead.documents.map(doc => (
                                                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-slate-950/50 hover:bg-slate-900 hover:border-blue-500/40 transition-all">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
                                                                <FileTextIcon className="h-4 w-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-200 hover:text-blue-400 hover:underline block truncate text-sm">
                                                                    {doc.type}
                                                                </a>
                                                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                                                    <span className="truncate max-w-[160px] font-mono">{doc.name}</span>
                                                                    <span>•</span>
                                                                    <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 pl-2 shrink-0">
                                                            {getStatusChip(doc.status)}
                                                            <div className="flex items-center border-l border-white/10 pl-2 ml-2 gap-1">
                                                                <a href={doc.url} download={doc.name} title="Download Document">
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10">
                                                                        <DownloadIcon className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </a>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-7 w-7 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" 
                                                                    onClick={() => handleDeleteClick(lead.id, doc)}
                                                                >
                                                                    <Trash2Icon className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-6 text-slate-500 italic border border-dashed border-white/10 rounded-xl bg-slate-950/20">
                                                <FileTextIcon className="h-7 w-7 mb-1.5 text-slate-600 opacity-60" />
                                                <span className="text-xs">No documents uploaded for this client</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 align-top text-right">
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            className="gap-2 shadow-md transition-all font-semibold"
                                            onClick={() => handleUploadClick(lead.id)}
                                            disabled={!!uploadingLeadId}
                                        >
                                            {uploadingLeadId === lead.id ? (
                                                <>
                                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <FileUpIcon className="h-4 w-4" />
                                                    Upload
                                                </>
                                            )}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {filteredLeads.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <SearchIcon className="h-10 w-10 text-slate-600 mb-2" />
                                            <p className="text-base font-bold text-slate-300">No clients found</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search term or date filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmationDialog
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Document"
                description={`Are you sure you want to delete the document "${docToDelete?.doc.name}" for lead "${leads.find(l => l.id === docToDelete?.leadId)?.business_name}"? This action cannot be undone.`}
                confirmButtonText="Yes, Delete"
            />
        </div>
    );
};

export default ClientDocuments;