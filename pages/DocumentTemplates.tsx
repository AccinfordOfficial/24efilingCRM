import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FormField } from '../components/ui/FormField';
import { FormSelect } from '../components/ui/FormSelect';
import { FormTextarea } from '../components/ui/FormTextarea';
import { Dialog } from '../components/ui/Dialog';
import { supabase } from '../lib/supabaseClient';
import { sanitizeHtml } from '../lib/sanitize';

import { toast } from 'sonner';
import { FileTextIcon, PlusIcon, SparklesIcon, DownloadIcon } from '../components/icons';
import { FileCheck } from 'lucide-react';

interface TemplateRecord {
    id: string;
    name: string;
    category: string;
    body_html: string;
    variables: string[];
    is_active: boolean;
}

export const DocumentTemplates: React.FC = () => {
    const [templates, setTemplates] = useState<TemplateRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<TemplateRecord | null>(null);

    const [name, setName] = useState('');
    const [category, setCategory] = useState('engagement_letter');
    const [bodyHtml, setBodyHtml] = useState(
        '<h3>Client Engagement Agreement</h3><p>This agreement is entered into on <strong>{{date}}</strong> between <strong>24eFiling Corporate Services</strong> and <strong>{{client_name}}</strong> for the provision of <strong>{{service_name}}</strong> services.</p>'
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchTemplates = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.from('document_templates').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setTemplates((data || []) as TemplateRecord[]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !bodyHtml.trim()) {
            toast.error("Please enter template name and body text");
            return;
        }

        try {
            setIsSubmitting(true);
            const { error } = await (supabase.from('document_templates') as any).insert([{
                name: name.trim(),
                category: category,
                body_html: bodyHtml,
                variables: ['{{client_name}}', '{{service_name}}', '{{date}}', '{{company_gst}}'],
                is_active: true
            }]);

            if (error) throw error;
            toast.success("Document template saved!");
            setIsCreateOpen(false);
            setName('');
            fetchTemplates();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to create template");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderPreviewHtml = (htmlStr: string) => {
        return htmlStr
            .replace(/\{\{client_name\}\}/g, 'Acme Technologies Pvt Ltd')
            .replace(/\{\{service_name\}\}/g, 'Private Limited Incorporation')
            .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
            .replace(/\{\{company_gst\}\}/g, '36AAAC24E1F1Z9');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Document Template Generator</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage standard engagement letters, NOCs, power of attorney forms, and legal agreements.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90">
                    <PlusIcon className="h-4 w-4 mr-1" /> Create Template
                </Button>
            </div>

            {/* Templates List */}
            <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
                <CardContent className="p-4">
                    {isLoading ? (
                        <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">Loading legal document templates...</div>
                    ) : templates.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                            <FileCheck className="h-8 w-8 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
                            <p className="font-semibold text-slate-800 dark:text-slate-300">No Legal Templates Created</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                Create standardized document templates with auto-filled client variables.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {templates.map((tpl) => (
                                <div key={tpl.id} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-lg space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{tpl.name}</h3>
                                            <Badge variant="outline" className="text-[10px] uppercase bg-blue-500/10 text-primary border-blue-500/20 mt-1">
                                                {tpl.category.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(tpl)}>
                                            Preview
                                        </Button>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 bg-slate-100 dark:bg-slate-900/40 p-2.5 rounded border border-slate-200 dark:border-white/5 font-mono">
                                        {tpl.body_html.replace(/<[^>]*>?/gm, '')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Template Modal */}
            <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Legal Document Template">
                <form onSubmit={handleCreateTemplate} className="space-y-4">
                    <FormField
                        label="Template Title *"
                        id="tpl_name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Standard GST Client Engagement Letter"
                        required
                    />

                    <FormSelect
                        label="Category *"
                        id="tpl_category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        options={[
                            { value: 'engagement_letter', label: 'Engagement Letter' },
                            { value: 'agreement', label: 'Client Service Agreement' },
                            { value: 'noc', label: 'No Objection Certificate (NOC)' },
                            { value: 'authorization', label: 'Tax Authorization Form' }
                        ]}
                    />

                    <FormTextarea
                        label="Template HTML Body (Use {{client_name}}, {{service_name}}, {{date}}) *"
                        id="tpl_body"
                        rows={6}
                        value={bodyHtml}
                        onChange={(e) => setBodyHtml(e.target.value)}
                        required
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:opacity-90">
                            {isSubmitting ? 'Saving...' : 'Save Template'}
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Preview Modal */}
            {previewTemplate && (
                <Dialog isOpen={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title={`Preview: ${previewTemplate.name}`}>
                    <div className="space-y-4">
                        <div className="p-4 bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-serif leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderPreviewHtml(previewTemplate.body_html)) }} />

                        <div className="flex justify-end">
                            <Button onClick={() => setPreviewTemplate(null)} className="bg-primary text-primary-foreground hover:opacity-90">Close</Button>
                        </div>
                    </div>
                </Dialog>
            )}
        </div>
    );
};
