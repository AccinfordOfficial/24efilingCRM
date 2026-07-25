import React from 'react';
import { Document } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Trash2Icon, FileTextIcon, DownloadIcon, FileUpIcon, PlusIcon } from '../../components/icons';
import { DOCUMENT_TYPES } from '../../constants';
import { supabase } from '../../lib/supabaseClient';

interface DocumentUploadRow {
    id: number;
    docType: string;
    file: File | null;
}

interface LeadDocumentsTabProps {
    documents: Document[];
    documentUploads: DocumentUploadRow[];
    isUploading: boolean;
    isLoadingDetails: boolean;
    handleAddUploadRow: () => void;
    handleRemoveUploadRow: (id: number) => void;
    handleUploadRowChange: (id: number, updates: Partial<DocumentUploadRow>) => void;
    handleUploadSelectedFiles: () => void;
    handleDeleteClick: (doc: Document) => void;
}

const getFilePathFromUrl = (url: string, bucket: string): string | null => {
    try {
        const urlObj = new URL(url);
        const searchString = `/storage/v1/object/public/${bucket}/`;
        if (urlObj.pathname.includes(searchString)) {
            return decodeURIComponent(urlObj.pathname.split(searchString)[1]);
        }
        const fallbackString = `/${bucket}/`;
        if (urlObj.pathname.includes(fallbackString)) {
            return decodeURIComponent(urlObj.pathname.split(fallbackString)[1]);
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const LeadDocumentsTab: React.FC<LeadDocumentsTabProps> = ({
    documents,
    documentUploads,
    isUploading,
    isLoadingDetails,
    handleAddUploadRow,
    handleRemoveUploadRow,
    handleUploadRowChange,
    handleUploadSelectedFiles,
    handleDeleteClick
}) => {
    const handleDownload = async (e: React.MouseEvent, docUrl: string) => {
        e.preventDefault();
        const filePath = getFilePathFromUrl(docUrl, 'documents');
        if (!filePath) {
            window.open(docUrl, '_blank');
            return;
        }
        try {
            const { data, error } = await supabase.storage
                .from('documents')
                .createSignedUrl(filePath, 3600);
            if (error || !data?.signedUrl) {
                throw error || new Error("Failed to generate signed URL");
            }
            window.open(data.signedUrl, '_blank');
        } catch (err) {
            console.error("Error creating signed URL:", err);
            window.open(docUrl, '_blank');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-6 space-y-4">
                    {documentUploads.map((row) => (
                        <div key={row.id} className="flex gap-2 items-center">
                            <Select
                                value={row.docType}
                                onChange={(e) => handleUploadRowChange(row.id, { docType: e.target.value })}
                                className="w-1/3 bg-background dark:bg-slate-950 border-input dark:border-white/10 text-foreground dark:text-white"
                            >
                                {DOCUMENT_TYPES.map(type => <option key={type} value={type} className="bg-slate-950 text-white">{type}</option>)}
                            </Select>
                            <div className="flex-1 relative">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => handleUploadRowChange(row.id, { file: e.target.files?.[0] || null })}
                                />
                                <div className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 rounded-md text-sm text-slate-500 dark:text-slate-400 bg-background dark:bg-slate-950 flex items-center justify-between">
                                    <span className="truncate">{row.file ? row.file.name : "Choose file..."}</span>
                                    <FileUpIcon className="h-4 w-4" />
                                </div>
                            </div>
                            {documentUploads.length > 1 && (
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveUploadRow(row.id)}>
                                    <Trash2Icon className="h-4 w-4 text-slate-400 hover:text-red-500" />
                                </Button>
                            )}
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleAddUploadRow} className="text-gray-600 dark:text-slate-300">
                            <PlusIcon className="h-4 w-4 mr-1" /> Add Another File
                        </Button>
                        <Button onClick={handleUploadSelectedFiles} disabled={isUploading || !documentUploads.some(r => r.file)} className="flex-1 bg-primary text-primary-foreground hover:opacity-90 font-bold">
                            {isUploading ? 'Uploading...' : 'Upload All Selected'}
                        </Button>
                    </div>
                </div>

                <div className="space-y-3">
                    {isLoadingDetails && <div className="text-center py-4 text-slate-500 dark:text-slate-400">Loading documents...</div>}

                    {(!documents || documents.length === 0) && !isLoadingDetails && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No documents uploaded.</p>
                    )}

                    {documents?.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-lg group hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                    <FileTextIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{doc.type}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{doc.name} • {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => handleDownload(e, doc.url)}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                                    title="Download"
                                >
                                    <DownloadIcon className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(doc)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2Icon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
export type { DocumentUploadRow };
