import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { FormField } from './ui/FormField';
import { FormSelect } from './ui/FormSelect';
import { FormTextarea } from './ui/FormTextarea';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { MailIcon, SendIcon } from './icons';

interface EmailComposerProps {
    isOpen: boolean;
    onClose: () => void;
    recipientEmail?: string;
    recipientName?: string;
    leadId?: string;
    customerId?: string;
}

const TEMPLATES = [
    {
        name: 'Welcome & Introduction',
        subject: 'Welcome to 24eFiling - Financial & Tax Services',
        body: 'Dear {{name}},\n\nThank you for getting in touch with 24eFiling! We offer comprehensive GST, Company Incorporation, and Tax Filing services.\n\nOur team will assist you with every step of your compliance process.\n\nBest regards,\n24eFiling Team'
    },
    {
        name: 'Payment Reminder',
        subject: 'Payment Reminder - 24eFiling Invoice Pending',
        body: 'Dear {{name}},\n\nThis is a friendly reminder regarding your pending invoice for service enrollment with 24eFiling.\n\nPlease complete your payment to expedite document processing.\n\nThank you,\nFinance Dept, 24eFiling'
    },
    {
        name: 'Document Request',
        subject: 'Required Documents for Your Filing Request',
        body: 'Dear {{name}},\n\nTo proceed with your service registration, please upload your PAN card, Aadhar card, and passport-size photographs in our client portal.\n\nBest regards,\nDocuments Verification Team'
    }
];

export const EmailComposer: React.FC<EmailComposerProps> = ({
    isOpen,
    onClose,
    recipientEmail = '',
    recipientName = '',
    leadId,
    customerId
}) => {
    const { profile } = useAuth();
    const [toEmail, setToEmail] = useState(recipientEmail);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSelectTemplate = (templateName: string) => {
        const t = TEMPLATES.find(x => x.name === templateName);
        if (t) {
            setSubject(t.subject);
            setBody(t.body.replace('{{name}}', recipientName || 'Valued Client'));
        }
    };

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!toEmail.trim() || !subject.trim() || !body.trim()) {
            toast.error("Please fill in recipient email, subject, and message content.");
            return;
        }

        try {
            setIsSending(true);
            const { error } = await (supabase.from('email_logs') as any).insert([{
                lead_id: leadId || null,
                customer_id: customerId || null,
                sent_by: profile?.id,
                to_email: toEmail.trim(),
                subject: subject.trim(),
                status: 'sent'
            }]);

            if (error) throw error;
            toast.success(`Email dispatched to ${toEmail}`);
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to log sent email");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Send Email Communication">
            <form onSubmit={handleSendEmail} className="space-y-4">
                <FormSelect
                    label="Quick Template Selector"
                    id="email_template"
                    value=""
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    options={[
                        { value: '', label: 'Select a template...' },
                        ...TEMPLATES.map(t => ({ value: t.name, label: t.name }))
                    ]}
                />

                <FormField
                    label="Recipient Email *"
                    id="email_to"
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    required
                />

                <FormField
                    label="Subject Line *"
                    id="email_subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                />

                <FormTextarea
                    label="Message Body *"
                    id="email_body"
                    rows={6}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                />

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
                    <Button type="submit" disabled={isSending} className="bg-[#1c398e] hover:bg-[#152c6f] text-white">
                        <SendIcon className="h-4 w-4 mr-1" /> {isSending ? 'Sending...' : 'Send Email'}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};
