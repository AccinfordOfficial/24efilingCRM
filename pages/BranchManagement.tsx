import React, { useState, useRef, useMemo } from 'react';
import { Branch, User, City } from '../types';
import { Plus, Edit2, Trash2, Building, MapPin, Phone, Users, ShieldCheck, Mail, Upload, X, Image as ImageIcon, AlertTriangle, UserCheck, UserX, BarChart2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { StatCard } from '../components/ui/StatCard';
import { GlassCard } from '../components/ui/GlassCard';

interface BranchManagementProps {
  branches: Branch[];
  users: User[];
  cities: City[];
  onAddBranch: (branch: Omit<Branch, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateBranch: (id: string, branch: Partial<Branch>) => Promise<void>;
  onDeleteBranch: (id: string) => Promise<void>;
  onAddCity?: (cityName: string) => Promise<City>;
  onNavigateToUsers?: (branchName: string) => void;
  onUploadLogo?: (file: File) => Promise<string>;
}

export default function BranchManagement({ branches, users, cities = [], onAddBranch, onUpdateBranch, onDeleteBranch, onAddCity, onNavigateToUsers, onUploadLogo }: BranchManagementProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [cityInput, setCityInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city_id: '',
    address: '',
    phone: '',
    email: '',
    manager_id: '',
    is_active: true,
    logo_url: '' as string | null,
  });

  // Eligible managers: Branch Manager, Admin, Super Admin – active only
  const eligibleManagers = useMemo(() =>
    users.filter(u =>
      ['Branch Manager', 'Admin', 'Super Admin'].includes(u.role) && u.is_active
    ),
    [users]
  );

  // Dashboard stats derived from data
  const stats = useMemo(() => {
    const totalBranches = branches.length;
    const assignedBranches = branches.filter(b => !!(b as any).manager_id).length;
    const unassignedBranches = totalBranches - assignedBranches;
    const activeBranchManagers = users.filter(u => u.role === 'Branch Manager' && u.is_active).length;
    return { totalBranches, assignedBranches, unassignedBranches, activeBranchManagers };
  }, [branches, users]);

  const headOfficeBranch = useMemo(() =>
    branches.find(b => (b as any).is_head_office === true || b.code === 'HO-001'),
    [branches]
  );

  const handleOpenForm = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        code: branch.code || '',
        city_id: branch.city_id || '',
        address: branch.address || '',
        phone: branch.phone || '',
        email: branch.email || '',
        manager_id: (branch as any).manager_id || '',
        is_active: branch.is_active ?? true,
        logo_url: branch.logo_url || null,
      });
      const existingCity = cities.find(c => c.id === branch.city_id);
      setCityInput(existingCity ? existingCity.city_name : '');
    } else {
      setEditingBranch(null);
      setFormData({
        name: '',
        code: '',
        city_id: '',
        address: '',
        phone: '',
        email: '',
        manager_id: '',
        is_active: true,
        logo_url: null,
      });
      setCityInput('');
    }
    setIsFormOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadLogo) return;
    try {
      setUploadingLogo(true);
      const url = await onUploadLogo(file);
      setFormData(prev => ({ ...prev, logo_url: url }));
    } catch (err: any) {
      alert("Failed to upload logo: " + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalCityId = formData.city_id;

      if (cityInput.trim()) {
        const matchedCity = cities.find(c => c.city_name.toLowerCase() === cityInput.trim().toLowerCase());
        if (matchedCity) {
          finalCityId = matchedCity.id;
        } else if (onAddCity) {
          const newCity = await onAddCity(cityInput.trim());
          finalCityId = newCity.id;
        }
      }

      const payloadToSave = {
        ...formData,
        city_id: finalCityId,
        city_name: cities.find(c => c.id === finalCityId)?.city_name ?? null,
        manager_id: formData.manager_id || null,  // Explicitly null when not assigned
      };

      if (editingBranch) {
        await onUpdateBranch(editingBranch.id, payloadToSave);
      } else {
        await onAddBranch(payloadToSave);
      }
      setIsFormOpen(false);
    } catch (error: any) {
      alert(`Error saving branch: ${error.message || 'Check database connection or columns.'}\n\nDid you run the FIX_BRANCH_MANAGER_OPTIONAL.sql script in Supabase SQL editor?`);
    }
  };

  const confirmDelete = async () => {
    if (branchToDelete) {
      await onDeleteBranch(branchToDelete);
      setIsDeleteOpen(false);
      setBranchToDelete(null);
    }
  };

  const isHeadOffice = (branch: Branch) =>
    (branch as any).is_head_office === true || branch.code === 'HO-001';

  return (
    <div className="space-y-6 pb-8 text-white max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white/5 p-6 rounded-xl border border-white/5 backdrop-blur-md">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent flex items-center gap-2">
            <Building className="h-8 w-8 text-primary" />
            Branch Management
          </h2>
          <p className="text-slate-400 mt-1">Manage all company branches, assign managers, and monitor regional activity.</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-2 neon-glow-primary border border-white/10">
          <Plus className="h-5 w-5" />
          Add Branch
        </Button>
      </div>

      {/* Branch Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Branches" value={stats.totalBranches} icon={Building} />
        <StatCard title="Assigned" value={stats.assignedBranches} icon={UserCheck} />
        <StatCard title="Unassigned" value={stats.unassignedBranches} icon={UserX} />
        <StatCard title="Branch Managers" value={stats.activeBranchManagers} icon={ShieldCheck} />
      </div>

      {/* Unassigned Alert Banner */}
      {stats.unassignedBranches > 0 && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-3.5 text-amber-400">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 animate-pulse" />
          <p className="text-sm font-medium">
            <span className="font-bold">{stats.unassignedBranches} {stats.unassignedBranches === 1 ? 'branch has' : 'branches have'} no manager assigned.</span>
            {' '}Edit each branch below and assign a Branch Manager to complete the setup.
          </p>
        </div>
      )}

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
        {branches.map((branch) => {
          const manager = users.find(u => u.id === (branch as any).manager_id);
          const employeesCount = users.filter(u => u.branch_id === branch.id).length;
          const isHO = isHeadOffice(branch);

          return (
            <Card key={branch.id} className="group glass-card border border-white/5 hover:border-primary/20 transition-all duration-300 relative overflow-hidden flex flex-col h-full">
              {/* Cover Area */}
              <div className={`h-20 relative ${isHO ? 'bg-gradient-to-r from-slate-800 to-slate-950' : 'bg-gradient-to-r from-indigo-900 to-slate-950'}`}>
                {isHO && (
                  <div className="absolute top-4 left-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
                    Permanent System Branch
                  </div>
                )}
                <div className={`absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${branch.is_active ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-slate-800/40 text-slate-400 border border-slate-700/50'}`}>
                  {branch.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>

              {/* Logo Area */}
              <div className="px-6 relative flex justify-between items-end -mt-10 mb-3">
                <div className="h-20 w-20 rounded-2xl bg-slate-900 p-1.5 shadow-lg border border-white/10 overflow-hidden relative group-hover:-translate-y-1 transition-transform">
                  {branch.logo_url && !branch.logo_url.startsWith('blob:') ? (
                    <img 
                      src={branch.logo_url} 
                      alt={`${branch.name} Logo`} 
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 rounded-xl flex items-center justify-center">
                      <Building className="h-8 w-8 text-slate-500" />
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-slate-900/50 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-white" onClick={() => handleOpenForm(branch)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  {!isHO && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-slate-900/50 hover:bg-rose-500/10 border border-white/5 text-slate-400 hover:text-rose-400" onClick={() => { setBranchToDelete(branch.id); setIsDeleteOpen(true); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <CardContent className="px-6 pb-5 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{branch.name}</h3>
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mt-0.5">{branch.code || 'NO CODE'}</p>
                </div>

                {/* Manager Section */}
                {manager ? (
                  <div className="mb-4 bg-primary/5 p-2.5 rounded-xl border border-primary/10 flex items-center gap-3">
                    {manager.avatar_url ? (
                      <img src={manager.avatar_url} alt={manager.name} className="h-9 w-9 rounded-full border border-white/10 shadow-sm object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/20 border border-white/10 shadow-sm flex items-center justify-center text-primary font-bold text-xs">
                        {manager.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Branch Manager
                      </span>
                      <p className="text-sm font-semibold text-white leading-tight">{manager.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-amber-500/10 border border-white/10 shadow-sm flex items-center justify-center">
                      <UserX className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Branch Manager
                      </span>
                      <p className="text-sm font-semibold text-amber-500 leading-tight">Not Assigned</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-xs text-slate-300 mb-4 flex-1">
                  {branch.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-snug">{branch.address}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="font-medium text-slate-200">{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="font-medium text-slate-200 truncate">{branch.email}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5 mt-auto">
                  <button
                    onClick={() => onNavigateToUsers && onNavigateToUsers(branch.name)}
                    className="w-full flex items-center justify-between bg-white/5 hover:bg-primary/20 p-3 rounded-lg transition-colors border border-white/5 group/btn"
                  >
                    <div className="flex items-center gap-2 text-slate-300 group-hover/btn:text-white font-medium text-sm">
                      <Users className="h-4 w-4" />
                      View Personnel
                    </div>
                    <span className="bg-white/5 border border-white/10 group-hover/btn:bg-primary group-hover/btn:text-white text-slate-300 text-xs font-bold px-2.5 py-1 rounded-full transition-colors">
                      {employeesCount}
                    </span>
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {branches.length === 0 && (
          <div className="col-span-full py-16 text-center glass-card border-2 border-dashed border-white/10 rounded-2xl">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Building className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white">No Branches Setup</h3>
            <p className="text-slate-400 max-w-sm mx-auto mt-2 mb-6">
              Get started by creating your first business branch. You can assign a Branch Manager later.
            </p>
            <Button onClick={() => handleOpenForm()} className="bg-primary hover:bg-primary/90 text-white font-medium shadow-md">
              <Plus className="h-4 w-4 mr-2" /> Add Your First Branch
            </Button>
          </div>
        )}
      </div>

      {/* Branch Form Modal */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={() => setIsFormOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl my-8">
            <GlassCard className="w-full flex flex-col border border-white/10 text-white animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  {editingBranch ? 'Edit Branch Profile' : 'Setup New Branch'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">Fill in the details to configure this branch. Branch Manager can be assigned later.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white p-1.5 bg-white/5 border border-white/10 rounded-full shadow-sm">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-2 space-y-5 mt-4">

              {/* Logo Upload Section */}
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/10 rounded-xl bg-slate-900/50 hover:bg-slate-900 transition-colors relative group">
                {formData.logo_url ? (
                  <div className="relative">
                    <img src={formData.logo_url} alt="Logo preview" className="h-24 object-contain rounded-lg shadow-sm bg-slate-950 p-2 border border-white/10" />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, logo_url: null }))}
                      className="absolute -top-3 -right-3 bg-rose-500 text-white rounded-full p-1.5 shadow-md hover:bg-rose-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <div className="mx-auto h-10 w-10 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      {uploadingLogo ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" /> : <Upload className="h-4 w-4" />}
                    </div>
                    <p className="text-xs font-semibold text-slate-300">Upload Branch Logo</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG up to 2MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadingLogo || !onUploadLogo}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* City */}
                <div className="space-y-1 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300">City <span className="text-rose-500">*</span></label>
                    {onAddCity && (
                      <button 
                        type="button" 
                        onClick={() => {
                          const name = prompt("Enter new operating city name:");
                          if (name && name.trim()) {
                            onAddCity(name.trim()).then((newCity) => {
                              if (newCity) {
                                setCityInput(newCity.city_name);
                                setFormData(prev => ({ ...prev, city_id: newCity.id }));
                              }
                            });
                          }
                        }}
                        className="text-[10px] text-primary hover:underline focus:outline-none"
                      >
                        + Create New City
                      </button>
                    )}
                  </div>
                  <select
                    required
                    value={formData.city_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setFormData(prev => ({ ...prev, city_id: selectedId }));
                      const selectedCity = cities.find(c => c.id === selectedId);
                      setCityInput(selectedCity ? selectedCity.city_name : '');
                    }}
                    className="w-full px-4 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-slate-900 text-white text-sm"
                  >
                    <option value="" className="bg-slate-950 text-slate-500">— Select operating city —</option>
                    {cities.filter(c => c.status).map(city => (
                      <option key={city.id} value={city.id} className="bg-slate-950 text-white">
                        {city.city_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Branch / Locality Name <span className="text-rose-500">*</span></label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-slate-900 text-white text-sm"
                    placeholder="e.g., Kukatpally"
                  />
                </div>

                {/* Branch Code */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Branch Code <span className="text-slate-500 font-normal text-[10px]">(Optional)</span></label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-4 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-slate-900 text-white text-sm"
                    placeholder="e.g., HYD-KUK-01"
                  />
                </div>

                {/* Branch Manager – OPTIONAL */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    Branch Manager
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Optional</span>
                  </label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, manager_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-slate-900 text-white text-sm"
                  >
                    <option value="">— Not Assigned —</option>
                    {eligibleManagers.map(u => (
                      <option key={u.id} value={u.id} className="bg-slate-950 text-white">{u.name} ({u.role})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    You can create the branch now and assign a manager later via <strong>Edit Branch</strong>.
                  </p>
                </div>

                {/* Contact Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-slate-900 text-white text-sm"
                    placeholder="e.g., +91 98765 43210"
                  />
                </div>

                {/* Contact Email */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Contact Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-slate-900 text-white text-sm"
                    placeholder="e.g., branch@company.com"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Physical Address</label>
                  <textarea
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-slate-900 text-white text-sm resize-none"
                    placeholder="Enter complete branch address..."
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-3 p-3 border border-white/5 bg-slate-900/20 hover:bg-slate-900/50 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 text-primary rounded bg-slate-900 border-white/10 focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Branch is Active</span>
                    <span className="text-[10px] text-slate-400">Inactive branches will not be available for selection across the system.</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <Button type="button" variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/95 text-white" disabled={uploadingLogo}>
                  {editingBranch ? 'Save Changes' : 'Create Branch'}
                </Button>
              </div>
            </form>
          </GlassCard>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Branch"
        description="Are you sure you want to delete this branch? This action will not delete associated users, but they will need to be reassigned. This action cannot be undone."
        confirmButtonText="Delete Branch"
        cancelButtonText="Cancel"
      />
    </div>
  );
}
