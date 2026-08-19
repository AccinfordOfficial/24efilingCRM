import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useApi } from '../../hooks/useApi';
import { Loader2, Building, Globe, MapPin, Receipt, Phone, Mail } from 'lucide-react';

interface CompanySettingsProps {
    showToast: (type: 'success' | 'error', message: string) => void;
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({ showToast }) => {
    const { settings, updateOrganizationSettings } = useApi();
    const [saving, setSaving] = useState(false);

    const [companyInfo, setCompanyInfo] = useState({
        name: '',
        address: '',
        email: '',
        phone: '',
        meta: { gstin: '', pan: '', cin: '', website: '' },
        regional: { currency: 'INR', timezone: 'Asia/Kolkata', date_format: 'DD/MM/YYYY' }
    });

    useEffect(() => {
        if (settings) {
            setCompanyInfo({
                name: settings.company_name || '',
                address: settings.company_address || '',
                email: settings.company_email || '',
                phone: settings.company_phone || '',
                meta: (settings as any).company_meta || { gstin: '', pan: '', cin: '', website: '' },
                regional: (settings as any).regional_settings || { currency: 'INR', timezone: 'Asia/Kolkata', date_format: 'DD/MM/YYYY' }
            });
        }
    }, [settings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateOrganizationSettings({
                company_name: companyInfo.name,
                company_address: companyInfo.address,
                company_email: companyInfo.email,
                company_phone: companyInfo.phone,
                company_meta: companyInfo.meta,
                regional_settings: companyInfo.regional
            });
            showToast('success', "Company profile updated");
        } catch (e: any) {
            showToast('error', e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>Manage your company's public identity and regional preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm flex items-center gap-2 text-slate-700"><Building className="w-4 h-4" /> Basic Info</h4>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-slate-500">Company Name</label>
                            <Input value={companyInfo.name} onChange={e => setCompanyInfo({ ...companyInfo, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-slate-500">Website</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input className="pl-9" value={companyInfo.meta.website || ''} onChange={e => setCompanyInfo({ ...companyInfo, meta: { ...companyInfo.meta, website: e.target.value } })} placeholder="https://..." />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-medium text-sm flex items-center gap-2 text-slate-700"><MapPin className="w-4 h-4" /> Contact & Location</h4>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-slate-500">Address</label>
                            <Input value={companyInfo.address} onChange={e => setCompanyInfo({ ...companyInfo, address: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input className="pl-9" value={companyInfo.email} onChange={e => setCompanyInfo({ ...companyInfo, email: e.target.value })} placeholder="Email" />
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input className="pl-9" value={companyInfo.phone} onChange={e => setCompanyInfo({ ...companyInfo, phone: e.target.value })} placeholder="Phone" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t pt-6 grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm flex items-center gap-2 text-slate-700"><Receipt className="w-4 h-4" /> Legal & Compliance</h4>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-slate-500">GSTIN</label>
                            <Input value={companyInfo.meta.gstin} onChange={e => setCompanyInfo({ ...companyInfo, meta: { ...companyInfo.meta, gstin: e.target.value } })} placeholder="GST Number" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-slate-500">PAN</label>
                            <Input value={companyInfo.meta.pan} onChange={e => setCompanyInfo({ ...companyInfo, meta: { ...companyInfo.meta, pan: e.target.value } })} placeholder="PAN Number" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-slate-500">CIN (Corporate Identity Number)</label>
                            <Input value={companyInfo.meta.cin} onChange={e => setCompanyInfo({ ...companyInfo, meta: { ...companyInfo.meta, cin: e.target.value } })} placeholder="CIN" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-medium text-sm flex items-center gap-2 text-slate-700"><Globe className="w-4 h-4" /> Regional Settings</h4>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-slate-500">Default Currency</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                value={companyInfo.regional.currency}
                                onChange={e => setCompanyInfo({ ...companyInfo, regional: { ...companyInfo.regional, currency: e.target.value } })}
                            >
                                <option value="INR">INR (₹)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase text-slate-500">Timezone</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                value={companyInfo.regional.timezone}
                                onChange={e => setCompanyInfo({ ...companyInfo, regional: { ...companyInfo.regional, timezone: e.target.value } })}
                            >
                                <option value="Asia/Kolkata">Asia/Kolkata</option>
                                <option value="UTC">UTC</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Details'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
