import React, { useState } from 'react';
import { CompanyPolicy, User, UserRole } from '../types';
import { Plus, Edit2, Trash2, FileText, Check, AlertCircle, ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';

interface PoliciesManagementProps {
  companyPolicies: CompanyPolicy[];
  onAddPolicy: (policyData: Omit<CompanyPolicy, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdatePolicy: (id: string, policyData: Partial<CompanyPolicy>) => Promise<any>;
  onDeletePolicy: (id: string) => Promise<any>;
  currentUser: User;
}

export default function PoliciesManagement({
  companyPolicies = [],
  onAddPolicy,
  onUpdatePolicy,
  onDeletePolicy,
  currentUser,
}: PoliciesManagementProps) {
  const navigate = useNavigate();
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  const [isOpen, setIsOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CompanyPolicy | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const openCreateModal = () => {
    setEditingPolicy(null);
    setName('');
    setContent('');
    setIsActive(true);
    setError('');
    setIsOpen(true);
  };

  const openEditModal = (policy: CompanyPolicy) => {
    setEditingPolicy(policy);
    setName(policy.name);
    setContent(policy.content);
    setIsActive(policy.is_active);
    setError('');
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) {
      setError('Name and content are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (editingPolicy) {
        await onUpdatePolicy(editingPolicy.id, {
          name,
          content,
          is_active: isActive,
          version: editingPolicy.version + 1,
        });
      } else {
        await onAddPolicy({
          name,
          content,
          is_active: isActive,
          version: 1,
          created_by: currentUser.id,
        });
      }
      setIsOpen(false);
    } catch (e: any) {
      setError(e.message || 'An error occurred while saving the policy.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      try {
        await onDeletePolicy(deleteId);
        toast.success('Policy deleted successfully');
      } catch (e: any) {
        toast.error(e.message || 'Failed to delete policy.');
      } finally {
        setDeleteId(null);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Company Policies & Guidelines
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure terms, agreements, and policies attached to billing and customer service.
          </p>
        </div>

        {isSuperAdmin && (
          <Button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-blue-500/10 transition-all border-none"
          >
            <Plus className="h-4 w-4" /> Add Policy
          </Button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6">
        {companyPolicies.length === 0 ? (
          <Card className="glass-card border-white/5 bg-slate-900/50 backdrop-blur-md">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-400 gap-3">
              <FileText className="h-12 w-12 text-slate-600" />
              <div>
                <h3 className="font-semibold text-lg text-slate-200">No Policies Configured</h3>
                <p className="text-sm mt-1 text-slate-400">
                  {isSuperAdmin
                    ? 'Get started by creating your first policy agreement.'
                    : 'Contact your administrator to add company policies.'}
                </p>
              </div>
              {isSuperAdmin && (
                <Button onClick={openCreateModal} variant="outline" className="mt-2 border-white/10 hover:bg-white/5 text-white">
                  Create First Policy
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {companyPolicies.map((policy) => (
              <Card key={policy.id} className="glass-card border-white/5 bg-slate-900/50 backdrop-blur-md hover:border-white/10 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-white/5 flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-400 shrink-0" />
                      {policy.name}
                    </CardTitle>
                    <div className="flex gap-2 items-center mt-1.5 text-xs text-slate-400">
                      <span>Version {policy.version}</span>
                      <span>•</span>
                      <span className={policy.is_active ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {policy.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditModal(policy)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                        title="Edit policy"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(policy.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-md transition-colors"
                        title="Delete policy"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex flex-col justify-between gap-4">
                  <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed line-clamp-6">
                    {policy.content}
                  </div>
                  <div className="text-xs text-slate-500 mt-2 flex justify-between items-center">
                    <span>Created: {new Date(policy.created_at).toLocaleDateString()}</span>
                    <span>Last updated: {new Date(policy.updated_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[650px] bg-slate-900 border border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              {editingPolicy ? 'Edit Company Policy' : 'Create Company Policy'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="policy-name" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Policy Name
              </label>
              <Input
                id="policy-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Terms & Conditions, Cancellation Policy"
                className="bg-slate-950 border-white/10 text-slate-100 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="policy-content" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Policy Content (Markdown / Text)
              </label>
              <Textarea
                id="policy-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter detailed guidelines or terms..."
                className="bg-slate-950 border-white/10 text-slate-100 focus:border-blue-500 h-64 resize-none"
                disabled={loading}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="policy-status"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <label htmlFor="policy-status" className="text-sm text-slate-300">
                Mark as active and attach to new invoices
              </label>
            </div>

            <DialogFooter className="mt-6 flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="border border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Policy'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Policy"
        description="Are you sure you want to delete this policy? This action cannot be undone."
      />
    </div>
  );
}
