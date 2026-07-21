import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FormSelect } from '../components/ui/FormSelect';
import { useApi } from '../hooks/useApi';
import { toast } from 'sonner';
import { FileTextIcon, DownloadIcon } from '../components/icons';
import { ShieldCheck, Smartphone, CheckCircle2 } from 'lucide-react';

export const ClientPortalView: React.FC = () => {
    const { customers, documents, invoices } = useApi({ fetchOnMount: false });
    const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
    const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const clientDocs = documents.filter(d => d.lead_id === selectedCustomer?.lead_id);
    const clientInvoices = invoices.filter(i => i.customer_id === selectedCustomerId);

    const handleGenerateAccessOTP = () => {
        if (!selectedCustomer) {
            toast.error("Please select a client account");
            return;
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(otp);
        toast.success(`Access OTP ${otp} generated for ${selectedCustomer.name} (${selectedCustomer.phone})`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white">Client Self-Service Portal Simulator</h2>
                    <p className="text-xs text-slate-400">View what clients see on their mobile portal: document vault, filing status, and digital receipts.</p>
                </div>
            </div>

            {/* Client Selector & Access Generator */}
            <Card className="bg-slate-900/60 border-white/10">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="w-full sm:w-1/2">
                        <FormSelect
                            label="Select Client Account"
                            id="portal_client_select"
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                            options={customers.map(c => ({ value: c.id, label: `${c.name} (${c.phone || c.email})` }))}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Button onClick={handleGenerateAccessOTP} className="bg-[#1c398e] hover:bg-[#152c6f] text-white">
                            <Smartphone className="h-4 w-4 mr-1" /> Generate Portal OTP
                        </Button>
                        {generatedOtp && (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-sm px-3 py-1 font-mono">
                                OTP: {generatedOtp}
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Simulated Client Portal UI */}
            {selectedCustomer && (
                <div className="border border-white/10 rounded-2xl bg-slate-950/80 p-6 space-y-6 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{selectedCustomer.business_name || selectedCustomer.name}</h3>
                                <p className="text-xs text-slate-400">Client Portal Dashboard • GSTIN / PAN Verified</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            Active Account
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Client Document Vault */}
                        <Card className="bg-slate-900/40 border-white/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                    <FileTextIcon className="h-4 w-4 text-blue-400" /> Digital Document Vault
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 pt-2">
                                {clientDocs.length > 0 ? (
                                    clientDocs.map(doc => (
                                        <div key={doc.id} className="p-2.5 bg-slate-950/50 rounded-lg border border-white/5 flex items-center justify-between text-xs">
                                            <div>
                                                <p className="font-semibold text-white">{doc.type}</p>
                                                <p className="text-[10px] text-slate-500">{doc.name}</p>
                                            </div>
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded">
                                                <DownloadIcon className="h-4 w-4" />
                                            </a>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-500 py-4 text-center">No documents in vault yet.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Client Invoices & Receipts */}
                        <Card className="bg-slate-900/40 border-white/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Invoices & Receipts
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 pt-2">
                                {clientInvoices.length > 0 ? (
                                    clientInvoices.map(inv => (
                                        <div key={inv.id} className="p-2.5 bg-slate-950/50 rounded-lg border border-white/5 flex items-center justify-between text-xs">
                                            <div>
                                                <p className="font-semibold text-white">Invoice #{inv.invoice_number}</p>
                                                <p className="text-[10px] text-slate-500">Due: {inv.due_date}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-white block">₹{inv.total_amount.toLocaleString()}</span>
                                                <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                                    {inv.status.toUpperCase()}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-500 py-4 text-center">No billing statements available.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};
