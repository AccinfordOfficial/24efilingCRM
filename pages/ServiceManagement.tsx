import React, { useState } from 'react';
import { Service, SubService } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { PlusIcon, Trash2Icon, EditIcon, CheckCircleIcon } from '../components/icons';
import { Dialog } from '../components/ui/Dialog';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';

interface ServiceManagementProps {
    services: Service[];
    onAddService: (name: string) => Promise<void>;
    onUpdateService: (id: string, updates: Partial<Service>) => Promise<void>;
    onDeleteService: (id: string) => Promise<void>;
    onAddSubService: (serviceId: string, subService: Omit<SubService, 'id' | 'created_at' | 'service_id'>) => Promise<void>;
    onUpdateSubService: (id: string, updates: Partial<SubService>) => Promise<void>;
    onDeleteSubService: (id: string) => Promise<void>;
}

const ServiceManagement: React.FC<ServiceManagementProps> = ({
    services,
    onAddService,
    onUpdateService,
    onDeleteService,
    onAddSubService,
    onUpdateSubService,
    onDeleteSubService
}) => {
    const { profile } = useAuth();
    const canManage = profile?.role === 'Super Admin' || profile?.role === 'Admin';

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

    // Handlers
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

    if (!canManage) {
        return <div className="p-8 text-center text-red-500">Access Denied. Only Admins can manage services.</div>;
    }

    return (
        <div className="space-y-6 text-white max-w-7xl mx-auto p-4 md:p-6">
            {/* Header Section */}
            <div className="flex justify-between items-center bg-white/5 p-6 rounded-xl border border-white/5 backdrop-blur-md">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent flex items-center gap-2">
                        Service Management
                    </h1>
                    <p className="text-slate-400 mt-1">Add, edit, or remove services and configure their pricing and documents.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => window.location.reload()} className="border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white" title="Reload page to fetch latest data">
                        Refresh
                    </Button>
                    <Button onClick={() => handleOpenServiceModal()} className="bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-2 neon-glow-primary border border-white/10">
                        <PlusIcon className="h-4 w-4" /> Add Main Service
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                {(services || []).map(service => (
                    <Card key={service.id} className="overflow-hidden glass-card border border-white/5 hover:border-primary/20 transition-all duration-300">
                        <CardHeader className="bg-white/5 border-b border-white/5 flex flex-row items-center justify-between py-3">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg font-semibold text-white">{service.name}</CardTitle>
                                {!service.is_active && <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-400 border border-slate-700">Disabled</Badge>}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleServiceStatus(service)}
                                    title={service.is_active ? "Disable Service" : "Enable Service"}
                                    className="hover:bg-white/5 text-slate-400 hover:text-white"
                                >
                                    <CheckCircleIcon className={`h-4 w-4 ${service.is_active ? 'text-emerald-400' : 'text-slate-500'}`} />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleOpenServiceModal(service)} className="hover:bg-white/5 text-slate-400 hover:text-white">
                                    <EditIcon className="h-4 w-4 text-slate-400" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'service', id: service.id, name: service.name })} className="hover:bg-rose-500/10 text-slate-400 hover:text-rose-400">
                                    <Trash2Icon className="h-4 w-4 text-rose-500" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sub-Services</h4>
                                <Button variant="ghost" size="sm" className="gap-1 text-xs border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white" onClick={() => handleOpenSubServiceModal(service.id)}>
                                    <PlusIcon className="h-3 w-3" /> Add Sub-Service
                                </Button>
                            </div>

                            {service.sub_services && service.sub_services.length > 0 ? (
                                <div className="space-y-2">
                                    {service.sub_services.map(sub => (
                                        <div key={sub.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${sub.is_active ? 'bg-slate-900/40 border-white/5' : 'bg-slate-950/20 border-white/5 opacity-50'}`}>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-white">{sub.name}</span>
                                                    {!sub.is_active && <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-400 border border-slate-700">Disabled</Badge>}
                                                </div>
                                                <div className="flex gap-4 mt-1 text-xs text-slate-400">
                                                    <span>Price: <strong className="text-indigo-300">{sub.price > 0 ? `₹${sub.price.toLocaleString()}` : 'Custom'}</strong></span>
                                                    <span>Docs: <strong className="text-slate-300">{sub.required_documents.length > 0 ? sub.required_documents.join(', ') : 'None'}</strong></span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleStatus(sub)}
                                                    title={sub.is_active ? "Disable" : "Enable"}
                                                    className="hover:bg-white/5 text-slate-400 hover:text-white"
                                                >
                                                    <CheckCircleIcon className={`h-4 w-4 ${sub.is_active ? 'text-emerald-400' : 'text-slate-500'}`} />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenSubServiceModal(service.id, sub)} className="hover:bg-white/5 text-slate-400 hover:text-white">
                                                    <EditIcon className="h-4 w-4 text-slate-400" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'subService', id: sub.id, name: sub.name })} className="hover:bg-rose-500/10 text-slate-400 hover:text-rose-400">
                                                    <Trash2Icon className="h-4 w-4 text-rose-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 italic text-center py-4">No sub-services defined.</p>
                            )}
                        </CardContent>
                    </Card >
                ))}
            </div >

            {/* Service Dialog */}
            < Dialog isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} title={editingService ? "Edit Service" : "Add Service"} >
                <form onSubmit={handleSaveService} className="space-y-4 text-white">
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Service Name</label>
                        <Input value={serviceName} onChange={e => setServiceName(e.target.value)} required placeholder="e.g. GST Services" className="bg-slate-900 border-white/10 text-white focus:ring-primary" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5" onClick={() => setIsServiceModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-primary hover:bg-primary/95 text-white">Save</Button>
                    </div>
                </form>
            </Dialog >

            {/* Sub-Service Dialog */}
            < Dialog isOpen={isSubServiceModalOpen} onClose={() => setIsSubServiceModalOpen(false)} title={editingSubService ? "Edit Sub-Service" : "Add Sub-Service"} >
                <form onSubmit={handleSaveSubService} className="space-y-4 text-white">
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Sub-Service Name</label>
                        <Input value={subServiceForm.name} onChange={e => setSubServiceForm({ ...subServiceForm, name: e.target.value })} required placeholder="e.g. GST Registration" className="bg-slate-900 border-white/10 text-white focus:ring-primary" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Price (₹)</label>
                        <Input type="number" value={subServiceForm.price} onChange={e => setSubServiceForm({ ...subServiceForm, price: Number(e.target.value) })} min="0" placeholder="0" className="bg-slate-900 border-white/10 text-white focus:ring-primary" />
                        <p className="text-[10px] text-slate-500 mt-1">Leave as 0 for custom/variable pricing.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Required Documents</label>
                        <Input value={subServiceForm.required_documents} onChange={e => setSubServiceForm({ ...subServiceForm, required_documents: e.target.value })} placeholder="e.g. PAN card, Aadhar card (comma separated)" className="bg-slate-900 border-white/10 text-white focus:ring-primary" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5" onClick={() => setIsSubServiceModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-primary hover:bg-primary/95 text-white">Save</Button>
                    </div>
                </form>
            </Dialog >

            <ConfirmationDialog
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDelete}
                title={`Delete ${deleteConfirm?.type === 'service' ? 'Service' : 'Sub-Service'}`}
                description={`Are you sure you want to delete "${deleteConfirm?.name}"? This cannot be undone.`}
                confirmButtonText="Delete"
            />
        </div >
    );
};

export default ServiceManagement;
