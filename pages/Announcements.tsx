import React, { useState, useMemo } from 'react';
import { Announcement, User, UserRole, Branch } from '../types';
import { Plus, Search, Megaphone, Calendar, Trash2, CheckCircle, Eye, AlertTriangle, Pin, RefreshCw, X, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';

interface AnnouncementsProps {
  announcements: Announcement[];
  onAddAnnouncement: (announcementData: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onDeleteAnnouncement: (id: string) => Promise<any>;
  onMarkAsRead: (id: string) => Promise<any>;
  users: User[];
  branches: Branch[];
  currentUser: User;
}

export default function Announcements({
  announcements = [],
  onAddAnnouncement,
  onDeleteAnnouncement,
  onMarkAsRead,
  users = [],
  branches = [],
  currentUser
}: AnnouncementsProps) {
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isPrivileged = isSuperAdmin || isAdmin;

  // View States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'general' | 'policy_update' | 'urgent'>('general');
  const [targetRole, setTargetRole] = useState('all');
  const [targetBranchId, setTargetBranchId] = useState('all');
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Scope Filtering
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(ann => {
      // 1. Check targeted role criteria
      if (ann.target_roles && ann.target_roles.length > 0) {
        if (!ann.target_roles.includes(currentUser.role) && !isSuperAdmin) {
          return false;
        }
      }

      // 2. Check targeted branch criteria
      if (ann.target_branches && ann.target_branches.length > 0 && currentUser.branch_id) {
        if (!ann.target_branches.includes(currentUser.branch_id) && !isSuperAdmin) {
          return false;
        }
      }

      // 3. Search Term
      const search = searchTerm.toLowerCase();
      if (!ann.title.toLowerCase().includes(search) && !ann.content.toLowerCase().includes(search)) {
        return false;
      }

      // 4. Type Filter
      if (typeFilter !== 'all' && ann.type !== typeFilter) return false;

      return true;
    });
  }, [announcements, currentUser, isSuperAdmin, searchTerm, typeFilter]);

  // Sort: Pinned first, then created_at DESC
  const sortedAnnouncements = useMemo(() => {
    return [...filteredAnnouncements].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredAnnouncements]);

  const openCreateModal = () => {
    setTitle('');
    setContent('');
    setType('general');
    setTargetRole('all');
    setTargetBranchId('all');
    setIsPinned(false);
    setExpiresAt('');
    setError('');
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and Content are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        title,
        content,
        type,
        target_roles: targetRole === 'all' ? [] : [targetRole],
        target_branches: targetBranchId === 'all' ? [] : [targetBranchId],
        is_pinned: isPinned,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        created_by: currentUser.id
      };

      await onAddAnnouncement(payload);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to publish announcement.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await onDeleteAnnouncement(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete.');
    }
  };

  const handleRead = async (ann: Announcement) => {
    if (ann.is_read) return;
    try {
      await onMarkAsRead(ann.id);
    } catch (err) {
      console.warn("Failed to mark announcement as read", err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Company Announcements
          </h1>
          <p className="dark:text-slate-400 text-sm mt-1">
            Stay informed with corporate policy updates, urgent notifications, and company directives.
          </p>
        </div>

        {isPrivileged && (
          <Button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium border-none shadow-lg hover:shadow-blue-500/10 transition-all"
          >
            <Plus className="h-4 w-4" /> Publish Announcement
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <Card className="glass-card border-white/5 bg-slate-900/20 backdrop-blur-md p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search announcements..."
            className="pl-9 bg-slate-950 border-white/5 text-slate-100 text-sm focus:border-blue-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-44 bg-slate-950 border border-white/5 text-slate-300 rounded-md p-2 text-xs focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="general">General</option>
          <option value="policy_update">Policy Updates</option>
          <option value="urgent">Urgent</option>
        </select>
      </Card>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedAnnouncements.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 text-center py-20 text-slate-500">
            No announcements found matching current scope.
          </div>
        ) : (
          sortedAnnouncements.map((ann) => {
            const cardBorders = {
              urgent: 'border-l-4 border-l-rose-500 hover:border-rose-400',
              policy_update: 'border-l-4 border-l-purple-500 hover:border-purple-400',
              general: 'border-l-4 border-l-blue-500 hover:border-blue-400'
            };

            const headerBadges = {
              urgent: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
              policy_update: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
              general: 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            };

            return (
              <Card
                key={ann.id}
                onClick={() => {
                  setActiveAnnouncement(ann);
                  handleRead(ann);
                }}
                className={`glass-card border-white/5 bg-slate-900/30 backdrop-blur-md hover:bg-slate-900/40 hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between overflow-hidden shadow-sm h-72 ${
                  cardBorders[ann.type]
                }`}
              >
                <div>
                  <CardHeader className="flex flex-row justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold ${headerBadges[ann.type]}`}>
                          {ann.type}
                        </span>
                        {ann.is_pinned && (
                          <span className="p-0.5 bg-slate-950 border border-white/5 text-amber-400 rounded-md">
                            <Pin className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-200 mt-2 line-clamp-1">{ann.title}</h3>
                    </div>

                    {!ann.is_read && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                      </span>
                    )}
                  </CardHeader>

                  <CardContent>
                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-4">{ann.content}</p>
                  </CardContent>
                </div>

                <div className="p-6 pt-0 border-t border-white/5 mt-auto flex justify-between items-center text-[10px] text-slate-500 font-bold">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                  </div>

                  {isPrivileged && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(ann.id);
                      }}
                      className="p-1 hover:bg-rose-500/10 hover:text-rose-400 rounded text-slate-500 transition-colors"
                      title="Delete Announcement"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Publish Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[550px] bg-slate-900 border border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Publish Corporate Announcement
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
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Announcement Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Direct headline summarizing this alert..."
                className="bg-slate-950 border-white/10 text-slate-100 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Announcement Content</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Compose detail descriptions, guideline steps, or announcement statements..."
                className="bg-slate-950 border-white/10 text-slate-100 focus:border-blue-500 h-32 resize-none"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alert Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="general">General Broadcast</option>
                  <option value="policy_update">Policy Update</option>
                  <option value="urgent">Urgent Announcement</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expiration Date</label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="bg-slate-950 border-white/10 text-slate-100"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Role Scope</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="all">All Roles</option>
                  <option value="Super Admin">Super Admin Only</option>
                  <option value="Admin">Admin Only</option>
                  <option value="Branch Manager">Branch Managers</option>
                  <option value="Sales Representative">Sales Executives</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Branch Scope</label>
                <select
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="all">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isPinned"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 bg-slate-950 border-white/10 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <label htmlFor="isPinned" className="text-xs font-semibold text-slate-300 cursor-pointer uppercase tracking-wider">
                Pin Announcement to Top
              </label>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2">
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
                {loading ? 'Publishing...' : 'Publish Alert'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Drawer Dialog */}
      <Dialog open={!!activeAnnouncement} onOpenChange={(open) => !open && setActiveAnnouncement(null)}>
        {activeAnnouncement && (
          <DialogContent className="sm:max-w-[550px] bg-slate-900 border border-white/10 text-slate-100">
            <DialogHeader className="border-b border-white/5 pb-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold border ${
                  activeAnnouncement.type === 'urgent'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : activeAnnouncement.type === 'policy_update'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {activeAnnouncement.type}
                </span>
                {activeAnnouncement.is_pinned && (
                  <span className="p-0.5 bg-slate-950 border border-white/5 text-amber-400 rounded-md">
                    <Pin className="h-3 w-3" />
                  </span>
                )}
              </div>
              <DialogTitle className="text-xl font-bold text-slate-100">{activeAnnouncement.title}</DialogTitle>
              <p className="text-[10px] text-slate-500">
                Published on {new Date(activeAnnouncement.created_at).toLocaleString()}
              </p>
            </DialogHeader>

            <div className="py-4 text-sm text-slate-300 leading-relaxed max-h-[40vh] overflow-y-auto whitespace-pre-line">
              {activeAnnouncement.content}
            </div>

            <DialogFooter className="mt-4 border-t border-white/5 pt-4">
              <Button
                variant="ghost"
                onClick={() => setActiveAnnouncement(null)}
                className="border border-white/10 text-slate-300 hover:text-white"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
