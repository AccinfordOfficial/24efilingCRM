import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FormField } from '../components/ui/FormField';
import { RazorpayIntegration, ExotelCloudTelephony, MSG91SmsGateway } from '../lib/integrations';
import { toast } from 'sonner';
import { Phone, DollarSign, MessageSquare, CheckCircle2 } from 'lucide-react';

export const IntegrationsCenter: React.FC = () => {
    const [testPhone, setTestPhone] = useState('9876543210');
    const [testAmount, setTestAmount] = useState(5000);
    const [paymentLink, setPaymentLink] = useState<string | null>(null);

    const handleCreateRazorpayLink = async () => {
        const res = await RazorpayIntegration.generatePaymentLink('test-lead', testAmount, 'Test Client', testPhone);
        setPaymentLink(res.payment_link);
        toast.success("Razorpay payment link generated!");
    };

    const handleTestClickToCall = async () => {
        const res = await ExotelCloudTelephony.initiateClickToCall('9999999999', testPhone);
        toast.success(`Click-to-call initiated (Call ID: ${res.call_id})`);
    };

    const handleTestSms = async () => {
        const res = await MSG91SmsGateway.sendSmsNotification(testPhone, 'DLT_WELCOME_01', { client_name: 'Test Client' });
        toast.success(`MSG91 SMS sent via DLT Template`);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white">Integrations & Cloud Services Center</h2>
                <p className="text-xs text-slate-400">Manage Razorpay payment links, Exotel cloud telephony click-to-call, and MSG91 DLT SMS gateways.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Razorpay Gateway */}
                <Card className="bg-slate-900/60 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-emerald-400" /> Razorpay Payment Gateway
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs">
                        <p className="text-slate-400">Generate instant UPI/Card payment links with webhook auto-reconciliation.</p>
                        <FormField
                            label="Test Payment Amount (₹)"
                            id="rzp_amount"
                            type="number"
                            value={testAmount}
                            onChange={(e) => setTestAmount(Number(e.target.value))}
                        />
                        <Button onClick={handleCreateRazorpayLink} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                            Generate Razorpay Link
                        </Button>
                        {paymentLink && (
                            <div className="p-2 bg-slate-950 rounded border border-emerald-500/30 text-[11px] text-emerald-400 font-mono truncate">
                                {paymentLink}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Exotel Cloud Telephony */}
                <Card className="bg-slate-900/60 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                            <Phone className="h-5 w-5 text-blue-400" /> Exotel Cloud Telephony
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs">
                        <p className="text-slate-400">Initiate 1-click calls between executive mobile and prospect numbers with call recording logs.</p>
                        <FormField
                            label="Target Prospect Mobile"
                            id="exotel_phone"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                        />
                        <Button onClick={handleTestClickToCall} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                            Test Click-to-Call
                        </Button>
                    </CardContent>
                </Card>

                {/* MSG91 SMS Gateway */}
                <Card className="bg-slate-900/60 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-amber-400" /> MSG91 DLT SMS Gateway
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs">
                        <p className="text-slate-400">Send transactional DLT-approved SMS alerts and client portal OTPs.</p>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            DLT Registered & Active
                        </Badge>
                        <Button onClick={handleTestSms} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                            Dispatch Test SMS
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
