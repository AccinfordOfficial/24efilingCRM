import React, { useState, useMemo } from 'react';
import { Service, SubService } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { PlusIcon, Trash2Icon, EditIcon, CheckCircleIcon } from '../components/icons';
import { Dialog } from '../components/ui/Dialog';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { Search, Layers, FileText, ShieldCheck, Tag, Rocket, Shield, Receipt, Landmark, Award, Building2, Calculator, X, Check, Edit3, Lock } from 'lucide-react';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { SERVICE_OPTIONS } from '../constants';

interface ServiceManagementProps {
    services: Service[];
    onAddService: (name: string) => Promise<void>;
    onUpdateService: (id: string, updates: Partial<Service>) => Promise<void>;
    onDeleteService: (id: string) => Promise<void>;
    onAddSubService: (serviceId: string, subService: Omit<SubService, 'id' | 'created_at' | 'service_id'>) => Promise<void>;
    onUpdateSubService: (id: string, updates: Partial<SubService>) => Promise<void>;
    onDeleteSubService: (id: string) => Promise<void>;
}

// IndiaFilings Inspired Main Category Definitions
const INDIAFILINGS_MAIN_CATEGORIES = [
    { id: 'All', label: 'All Services', icon: Layers, desc: 'Complete catalog of offerings' },
    { id: 'Business Registration', label: 'Startup & Business', icon: Rocket, desc: 'Private Ltd, OPC, LLP, Trust, Section 8' },
    { id: 'Trademark & IP', label: 'Trademark & IP', icon: Shield, desc: 'Trademark, Copyright, Patent & Designs' },
    { id: 'GST Services', label: 'GST Services', icon: Receipt, desc: 'Registration, Monthly & Annual Return Filings' },
    { id: 'Income Tax Services', label: 'Income Tax & Audit', icon: Landmark, desc: 'ITR 1-7, Business Tax, TDS & Notices' },
    { id: 'Licenses & Compliance', label: 'Licenses & Regs', icon: Award, desc: 'FSSAI, IEC, Udyam MSME, PF/ESI, DSC' },
    { id: 'MCA (Corporate) Services', label: 'MCA & Corporate', icon: Building2, desc: 'Annual Compliance, Director Change & Capital' },
    { id: 'Accounting & HR', label: 'Accounting & Payroll', icon: Calculator, desc: 'Bookkeeping, Payroll & Virtual CFO' },
];

const ServiceManagement: React.FC<ServiceManagementProps> = ({
    services = [],
    onAddService,
    onUpdateService,
    onDeleteService,
    onAddSubService,
    onUpdateSubService,
    onDeleteSubService
}) => {
    const { profile } = useAuth();
    const canManage = profile?.role === 'Super Admin';

    // Search and Category Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<string>('All');

    // Right Sidebar / Drawer State
    const [drawerItem, setDrawerItem] = useState<{
        mainCategory: string;
        serviceId: string;
        subService?: SubService;
    } | null>(null);

    // Form state inside right drawer for Super Admin
    const [drawerForm, setDrawerForm] = useState({
        name: '',
        price: 0,
        required_documents: '',
        is_active: true
    });
    const [isSavingDrawer, setIsSavingDrawer] = useState(false);

    // State for Modals
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [serviceName, setServiceName] = useState('');

    const [isSubServiceModalOpen, setIsSubServiceModalOpen] = useState(false);
    const [editingSubService, setEditingSubService] = useState<SubService | null>(null);
    const [activeServiceId, setActiveServiceId] = useState<string | null>(null);
    const [subServiceForm, setSubServiceForm] = useState({
        name: '',
        price: 0,
        required_documents: '' // comma separated for input
    });

    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'service' | 'subService', id: string, name: string } | null>(null);

    // Merge constant defaults with DB services so view is rich even before database seeding
    const displayServices = useMemo(() => {
        const mergedMap = new Map<string, Service>();

        // First populate from constants
        Object.entries(SERVICE_OPTIONS).forEach(([catName, subList], index) => {
            mergedMap.set(catName.toLowerCase(), {
                id: `const-cat-${index}`,
                name: catName,
                is_active: true,
                created_at: new Date().toISOString(),
                sub_services: subList.map((subName, subIdx) => ({
                    id: `const-sub-${index}-${subIdx}`,
                    service_id: `const-cat-${index}`,
                    name: subName,
                    price: 0,
                    required_documents: ['PAN Card', 'Aadhar Card', 'Address Proof'],
                    is_active: true,
                    created_at: new Date().toISOString()
                }))
            });
        });

        // Overlay with database services
        (services || []).forEach(dbService => {
            mergedMap.set(dbService.name.toLowerCase(), dbService);
        });

        return Array.from(mergedMap.values());
    }, [services]);

    // Filter services based on search query and IndiaFilings top navbar tab selection
    const filteredServices = useMemo(() => {
        return displayServices.filter(service => {
            const matchesTab = activeTab === 'All' || 
                service.name.toLowerCase().includes(activeTab.toLowerCase()) ||
                (activeTab === 'Business Registration' && service.name.toLowerCase().includes('business')) ||
                (activeTab === 'Licenses & Compliance' && (service.name.toLowerCase().includes('license') || service.name.toLowerCase().includes('compliance'))) ||
                (activeTab === 'Trademark & IP' && (service.name.toLowerCase().includes('trademark') || service.name.toLowerCase().includes('ip'))) ||
                (activeTab === 'GST Services' && service.name.toLowerCase().includes('gst')) ||
                (activeTab === 'Income Tax Services' && service.name.toLowerCase().includes('tax')) ||
                (activeTab === 'MCA (Corporate) Services' && (service.name.toLowerCase().includes('mca') || service.name.toLowerCase().includes('corporate')));

            const queryLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery || 
                service.name.toLowerCase().includes(queryLower) ||
                (service.sub_services && service.sub_services.some(sub => 
                    sub.name.toLowerCase().includes(queryLower) ||
                    sub.required_documents.some(doc => doc.toLowerCase().includes(queryLower))
                ));

            return matchesTab && matchesSearch;
        });
    }, [displayServices, searchQuery, activeTab]);

    const totalSubServicesCount = useMemo(() => {
        return displayServices.reduce((acc, s) => acc + (s.sub_services?.length || 0), 0);
    }, [displayServices]);

    // Drawer opener
    const handleOpenDrawer = (mainCategory: string, serviceId: string, subService?: SubService) => {
        setDrawerItem({ mainCategory, serviceId, subService });
        if (subService) {
            setDrawerForm({
                name: subService.name,
                price: subService.price || 0,
                required_documents: (subService.required_documents || []).join(', '),
                is_active: subService.is_active ?? true
            });
        } else {
            setDrawerForm({
                name: mainCategory,
                price: 0,
                required_documents: '',
                is_active: true
            });
        }
    };

    const handleSaveDrawer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!drawerItem || !canManage) return;
        try {
            setIsSavingDrawer(true);
            if (drawerItem.subService && !drawerItem.subService.id.startsWith('const-')) {
                const docs = drawerForm.required_documents.split(',').map(d => d.trim()).filter(Boolean);
                await onUpdateSubService(drawerItem.subService.id, {
                    name: drawerForm.name,
                    price: Number(drawerForm.price),
                    required_documents: docs,
                    is_active: drawerForm.is_active
                });
            } else if (!drawerItem.subService && !drawerItem.serviceId.startsWith('const-')) {
                await onUpdateService(drawerItem.serviceId, {
                    name: drawerForm.name,
                    is_active: drawerForm.is_active
                });
            }
            setDrawerItem(null);
        } catch (err) {
            console.error(err);
            alert("Failed to save updates from sidebar drawer.");
        } finally {
            setIsSavingDrawer(false);
        }
    };

    // Handlers for modals
    const handleOpenServiceModal = (service?: Service) => {
        if (service) {
            setEditingService(service);
            setServiceName(service.name);
        } else {
            setEditingService(null);
            setServiceName('');
        }
        setIsServiceModalOpen(true);
    };

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingService) {
                await onUpdateService(editingService.id, { name: serviceName });
            } else {
                await onAddService(serviceName);
            }
            setIsServiceModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Failed to save service");
        }
    };

    const handleOpenSubServiceModal = (serviceId: string, subService?: SubService) => {
        setActiveServiceId(serviceId);
        if (subService) {
            setEditingSubService(subService);
            setSubServiceForm({
                name: subService.name,
                price: subService.price,
                required_documents: subService.required_documents.join(', ')
            });
        } else {
            setEditingSubService(null);
            setSubServiceForm({ name: '', price: 0, required_documents: '' });
        }
        setIsSubServiceModalOpen(true);
    };

    const handleSaveSubService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeServiceId) return;
        try {
            const docs = subServiceForm.required_documents.split(',').map(d => d.trim()).filter(d => d);
            const payload = {
                name: subServiceForm.name,
                price: Number(subServiceForm.price),
                required_documents: docs,
                is_active: true
            };

            if (editingSubService) {
                await onUpdateSubService(editingSubService.id, payload);
            } else {
                await onAddSubService(activeServiceId, payload);
            }
            setIsSubServiceModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Failed to save sub-service");
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            if (deleteConfirm.type === 'service') {
                await onDeleteService(deleteConfirm.id);
            } else {
                await onDeleteSubService(deleteConfirm.id);
            }
            setDeleteConfirm(null);
        } catch (error) {
            console.error(error);
            alert("Failed to delete");
        }
    };

    const toggleStatus = async (sub: SubService) => {
        try {
            await onUpdateSubService(sub.id, { is_active: !sub.is_active });
        } catch (error) {
            console.error(error);
        }
    };

    const toggleServiceStatus = async (service: Service) => {
        try {
            await onUpdateService(service.id, { is_active: !service.is_active });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6 text-slate-900 dark:text-white max-w-7xl mx-auto p-4 md:p-6 relative">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="h-8 w-8 text-[#1c398e] dark:text-blue-400" />
                        Services Catalog & Category Explorer
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Explore company offerings, sub-services, pricing models, and document checklists structured like IndiaFilings.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {!canManage && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                            <Lock className="h-3.5 w-3.5" /> View Only (Super Admin can edit)
                        </span>
                    )}
                    {canManage && (
                        <Button onClick={() => handleOpenServiceModal()} className="bg-[#1c398e] dark:bg-blue-600 hover:bg-[#152c70] dark:hover:bg-blue-700 text-white font-medium flex items-center gap-2 shadow-sm">
                            <PlusIcon className="h-4 w-4" /> Add Main Category
                        </Button>
                    )}
                </div>
            </div>

            {/* IndiaFilings Top Category Navigation Bar */}
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
                <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-[#1c398e] dark:text-blue-400" />
                        Main Service Categories (IndiaFilings Navigation Bar)
                    </span>
                    <span className="text-xs font-semibold text-[#1c398e] dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                        {displayServices.length} Main Categories • {totalSubServicesCount} Sub-Services
                    </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {INDIAFILINGS_MAIN_CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const isActive = activeTab === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border cursor-pointer ${
                                    isActive
                                        ? 'bg-[#1c398e] text-white border-[#1c398e] shadow-md dark:bg-blue-600 dark:border-blue-500'
                                        : 'bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                            >
                                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#1c398e] dark:text-blue-400'}`} />
                                <span>{cat.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        type="search"
                        placeholder="Search services, sub-services (e.g. Private Limited, GST Return, FSSAI), or documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white dark:bg-slate-950 border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-100 h-10 w-full"
                    />
                </div>
            </div>

            {/* Services Grid (Main Categories & Sub-services) */}
            <div className="grid gap-6">
                {filteredServices.length > 0 ? (
                    filteredServices.map(service => (
                        <Card key={service.id} className="overflow-hidden bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm hover:border-[#1c398e]/30 transition-all duration-300">
                            <CardHeader className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-white/10 flex flex-row items-center justify-between py-4 px-6">
                                <div 
                                    className="flex items-center gap-3 cursor-pointer group"
                                    onClick={() => handleOpenDrawer(service.name, service.id)}
                                >
                                    <div className="p-2 bg-[#1c398e]/10 dark:bg-blue-500/20 text-[#1c398e] dark:text-blue-400 rounded-lg group-hover:scale-105 transition-transform">
                                        <Layers className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="se-data text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 group-hover:text-[#1c398e] dark:group-hover:text-blue-400 transition-colors">
                                            {service.name}
                                            <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-[#1c398e] dark:text-blue-300 border border-blue-500/20">
                                                {service.sub_services?.length || 0} Sub-services
                                            </Badge>
                                        </CardTitle>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Click to open detailed side drawer & document requirements
                                        </p>
                                    </div>
                                </div>

                                {canManage && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleServiceStatus(service)}
                                            title={service.is_active ? "Disable Service" : "Enable Service"}
                                            className="hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400"
                                        >
                                            <CheckCircleIcon className={`h-4 w-4 ${service.is_active ? 'text-emerald-500' : 'text-slate-400'}`} />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenServiceModal(service)} className="hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400">
                                            <EditIcon className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'service', id: service.id, name: service.name })} className="hover:bg-rose-500/10 text-rose-500">
                                            <Trash2Icon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Tag className="h-3.5 w-3.5 text-[#1c398e] dark:text-blue-400" />
                                        Sub-Services List & Document Requirements (Click card to view side details)
                                    </h4>
                                    {canManage && (
                                        <Button variant="outline" size="sm" className="gap-1 text-xs dark:bg-slate-950 dark:border-white/10 dark:text-slate-200" onClick={() => handleOpenSubServiceModal(service.id)}>
                                            <PlusIcon className="h-3.5 w-3.5" /> Add Sub-Service
                                        </Button>
                                    )}
                                </div>

                                {service.sub_services && service.sub_services.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {service.sub_services.map(sub => (
                                            <div 
                                                key={sub.id} 
                                                onClick={() => handleOpenDrawer(service.name, service.id, sub)}
                                                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                                                    sub.is_active 
                                                        ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-white/10 hover:border-[#1c398e] dark:hover:border-blue-500 hover:shadow-md' 
                                                        : 'bg-slate-100/50 dark:bg-slate-950/20 border-slate-200 dark:border-white/5 opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 dark:text-white text-sm">{sub.name}</span>
                                                        {!sub.is_active && <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}
                                                    </div>
                                                </div>

                                                <div className="mt-1 flex items-center justify-between">
                                                    <span className="text-xs font-bold text-[#1c398e] dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                                                        {sub.price > 0 ? `₹${sub.price.toLocaleString('en-IN')}` : 'Custom Fee'}
                                                    </span>
                                                </div>

                                                <div className="mt-3 text-xs space-y-1.5 border-t border-slate-200 dark:border-white/5 pt-2">
                                                    <p className="text-slate-500 dark:text-slate-400 font-medium flex items-start gap-1.5">
                                                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                        <span>
                                                            <strong>Required Docs: </strong>
                                                            {sub.required_documents && sub.required_documents.length > 0 ? (
                                                                <span className="text-slate-700 dark:text-slate-300">{sub.required_documents.join(', ')}</span>
                                                            ) : (
                                                                <span className="italic text-slate-400">Standard business KYC</span>
                                                            )}
                                                        </span>
                                                    </p>
                                                </div>

                                                {canManage && (
                                                    <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-slate-200 dark:border-white/5" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => toggleStatus(sub)}
                                                            className="h-7 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                                        >
                                                            {sub.is_active ? 'Disable' : 'Enable'}
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleOpenSubServiceModal(service.id, sub)} className="h-7 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                                                            Edit
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'subService', id: sub.id, name: sub.name })} className="h-7 text-xs text-rose-500 hover:text-rose-600">
                                                            Delete
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-6">No sub-services defined for {service.name}.</p>
                                )}
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-12 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/10 p-8">
                        <Layers className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                        <h3 className="se-data text-lg font-bold text-slate-900 dark:text-white">No services found</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Try adjusting your search filter or select another main category tab above.</p>
                    </div>
                )}
            </div>

            {/* Right Slide-Over Drawer / Sidebar */}
            {drawerItem && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
                        onClick={() => setDrawerItem(null)}
                    />

                    {/* Drawer Panel */}
                    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300">
                        <div className="space-y-6">
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-[#1c398e]/10 dark:bg-blue-500/20 text-[#1c398e] dark:text-blue-400 rounded-xl">
                                        <Layers className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                                            Category: {drawerItem.mainCategory}
                                        </span>
                                        <h2 className="se-data text-xl font-extrabold text-slate-900 dark:text-white">
                                            {drawerItem.subService ? drawerItem.subService.name : drawerItem.mainCategory}
                                        </h2>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setDrawerItem(null)}
                                    className="rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Details or Edit Form */}
                            {canManage && drawerItem.subService && !drawerItem.subService.id.startsWith('const-') ? (
                                <form onSubmit={handleSaveDrawer} className="space-y-4">
                                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                        <Edit3 className="h-4 w-4 shrink-0 text-blue-500" />
                                        <span>Super Admin Mode: Edit service details directly inside this sidebar drawer.</span>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sub-Service Name</label>
                                        <Input 
                                            value={drawerForm.name} 
                                            onChange={e => setDrawerForm({ ...drawerForm, name: e.target.value })} 
                                            required 
                                            className="bg-white dark:bg-slate-950 border-slate-300 dark:border-white/10 dark:text-white" 
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Price (₹)</label>
                                        <Input 
                                            type="number" 
                                            value={drawerForm.price} 
                                            onChange={e => setDrawerForm({ ...drawerForm, price: Number(e.target.value) })} 
                                            min="0" 
                                            className="bg-white dark:bg-slate-950 border-slate-300 dark:border-white/10 dark:text-white" 
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Required Documents (Comma separated)</label>
                                        <Input 
                                            value={drawerForm.required_documents} 
                                            onChange={e => setDrawerForm({ ...drawerForm, required_documents: e.target.value })} 
                                            className="bg-white dark:bg-slate-950 border-slate-300 dark:border-white/10 dark:text-white" 
                                        />
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status</span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setDrawerForm({ ...drawerForm, is_active: !drawerForm.is_active })}
                                            className={drawerForm.is_active ? 'text-emerald-600 border-emerald-500/30' : 'text-slate-500'}
                                        >
                                            {drawerForm.is_active ? 'Active' : 'Disabled'}
                                        </Button>
                                    </div>

                                    <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-white/10">
                                        <Button type="button" variant="outline" onClick={() => setDrawerItem(null)}>Cancel</Button>
                                        <Button type="submit" disabled={isSavingDrawer} className="bg-[#1c398e] dark:bg-blue-600 text-white">
                                            {isSavingDrawer ? 'Saving...' : 'Save Service'}
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    {!canManage && (
                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                                            <Lock className="h-4 w-4 shrink-0 text-amber-500" />
                                            <span>Read-Only View: Only Super Admin accounts can edit service catalog options.</span>
                                        </div>
                                    )}

                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500 dark:text-slate-400">Pricing Model</span>
                                            <span className="text-base font-extrabold text-[#1c398e] dark:text-blue-400">
                                                {drawerItem.subService && drawerItem.subService.price > 0 ? `₹${drawerItem.subService.price.toLocaleString('en-IN')}` : 'Custom Pricing Package'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-t border-slate-200 dark:border-white/5 pt-2">
                                            <span className="text-xs text-slate-500 dark:text-slate-400">Status</span>
                                            <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                Active Offering
                                            </Badge>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                                            <FileText className="h-4 w-4 text-[#1c398e] dark:text-blue-400" />
                                            Required Document Checklist
                                        </h4>
                                        <div className="space-y-2">
                                            {(drawerItem.subService?.required_documents || ['PAN Card', 'Aadhar Card', 'Address Proof']).map((doc, idx) => (
                                                <div key={idx} className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 text-xs text-slate-800 dark:text-slate-200 font-medium">
                                                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                                                    <span>{doc}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-slate-200 dark:border-white/10">
                            <Button 
                                variant="outline" 
                                className="w-full" 
                                onClick={() => setDrawerItem(null)}
                            >
                                Close Drawer
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {/* Service Dialog */}
            <Dialog isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} title={editingService ? "Edit Main Service Category" : "Add Main Service Category"}>
                <form onSubmit={handleSaveService} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category Name</label>
                        <Input value={serviceName} onChange={e => setServiceName(e.target.value)} required placeholder="e.g. Startup & Business Registration" className="bg-white dark:bg-slate-950 border-slate-300 dark:border-white/10 dark:text-white" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsServiceModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-[#1c398e] dark:bg-blue-600 text-white">Save Main Category</Button>
                    </div>
                </form>
            </Dialog>

            {/* Sub-Service Dialog */}
            <Dialog isOpen={isSubServiceModalOpen} onClose={() => setIsSubServiceModalOpen(false)} title={editingSubService ? "Edit Sub-Service" : "Add Sub-Service"}>
                <form onSubmit={handleSaveSubService} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sub-Service Name</label>
                        <Input value={subServiceForm.name} onChange={e => setSubServiceForm({ ...subServiceForm, name: e.target.value })} required placeholder="e.g. Private Limited Company Registration" className="bg-white dark:bg-slate-950 border-slate-300 dark:border-white/10 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Price (₹)</label>
                        <Input type="number" value={subServiceForm.price} onChange={e => setSubServiceForm({ ...subServiceForm, price: Number(e.target.value) })} min="0" placeholder="0" className="bg-white dark:bg-slate-950 border-slate-300 dark:border-white/10 dark:text-white" />
                        <p className="text-[10px] text-slate-500 mt-1">Leave as 0 for custom/variable pricing.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Required Documents</label>
                        <Input value={subServiceForm.required_documents} onChange={e => setSubServiceForm({ ...subServiceForm, required_documents: e.target.value })} placeholder="e.g. PAN card, Aadhar card, Passport photo (comma separated)" className="bg-white dark:bg-slate-950 border-slate-300 dark:border-white/10 dark:text-white" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsSubServiceModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-[#1c398e] dark:bg-blue-600 text-white">Save Sub-Service</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmationDialog
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDelete}
                title={`Delete ${deleteConfirm?.type === 'service' ? 'Category' : 'Sub-Service'}`}
                description={`Are you sure you want to delete "${deleteConfirm?.name}"? This cannot be undone.`}
                confirmButtonText="Delete"
            />
        </div>
    );
};

export default ServiceManagement;

