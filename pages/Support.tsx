import React, { useState, useMemo } from 'react';
import { SupportTicket, TicketComment, KnowledgeBaseArticle, User, UserRole } from '../types';
import { Plus, Search, MessageSquare, AlertCircle, Clock, CheckCircle2, User as UserIcon, Calendar, BookOpen, Send, Check, ShieldCheck, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';

interface SupportProps {
  tickets: SupportTicket[];
  onAddTicket: (ticketData: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateTicket: (id: string, ticketData: Partial<SupportTicket>) => Promise<any>;
  onAddComment: (commentData: Omit<TicketComment, 'id' | 'created_at'>) => Promise<any>;
  onAddKbArticle: (articleData: Omit<KnowledgeBaseArticle, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  users: User[];
  branches: any[];
  currentUser: User;
}

const mockKbArticlesSeed: KnowledgeBaseArticle[] = [
  { id: '1', title: 'How to reset customer Supabase credentials?', content: 'Super Admins can trigger a reset link from the User Management console by clicking "Reset Credentials". The customer receives an automated email notification within 5 minutes.', category: 'Technical', is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', title: 'Refund Policy & Credit Note Flow', content: 'Refunds must be processed within 14 business days of standard client invoicing. Any cancellations after service initiation require a Super Admin approved credit note.', category: 'Account', is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', title: 'How to allocate leads across branches?', content: 'Navigate to Branch Management, select the target operating branch, and assign regional sales executives. Auto-routing maps incoming Web Leads based on matching customer operating city fields.', category: 'General', is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

export default function Support({
  tickets = [],
  onAddTicket,
  onUpdateTicket,
  onAddComment,
  onAddKbArticle,
  users = [],
  branches = [],
  currentUser
}: SupportProps) {
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isPrivileged = isSuperAdmin || isAdmin;

  // Tabs: Tickets vs Knowledge Base FAQ
  const [activeViewTab, setActiveViewTab] = useState<'tickets' | 'kb'>('tickets');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal Dialogs
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isKbModalOpen, setIsKbModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);

  // Add Ticket Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'Technical' | 'Account' | 'Service' | 'General'>('General');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Add KB Article Form States
  const [kbTitle, setKbTitle] = useState('');
  const [kbContent, setKbContent] = useState('');
  const [kbCategory, setKbCategory] = useState('General');

  // Active Ticket Conversation States
  const [newComment, setNewComment] = useState('');
  const [commentsList, setCommentsList] = useState<TicketComment[]>([]);

  // Filter KB Articles
  const kbArticles = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return mockKbArticlesSeed.filter(art => 
      art.title.toLowerCase().includes(search) || 
      art.content.toLowerCase().includes(search)
    );
  }, [searchTerm]);

  // Filter Support Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Role scope: sales representatives only see tickets they created
      if (currentUser.role === UserRole.SALES_EXECUTIVE && t.created_by !== currentUser.id) return false;

      // Filters
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      const search = searchTerm.toLowerCase();
      return (
        t.title.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search)
      );
    });
  }, [tickets, categoryFilter, priorityFilter, statusFilter, searchTerm, currentUser]);

  const openTicketCreate = () => {
    setTitle('');
    setDescription('');
    setTicketCategory('General');
    setTicketPriority('medium');
    setError('');
    setIsTicketModalOpen(true);
  };

  const openKbCreate = () => {
    setKbTitle('');
    setKbContent('');
    setKbCategory('General');
    setError('');
    setIsKbModalOpen(true);
  };

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and Description are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Propose a standard 24 hr response SLA for high/urgent, 72 hrs for medium/low
      const now = new Date();
      const slaResponseHours = ticketPriority === 'urgent' || ticketPriority === 'high' ? 24 : 72;
      const slaDeadline = new Date(now.getTime() + slaResponseHours * 60 * 60 * 1000).toISOString();

      await onAddTicket({
        title,
        description,
        category: ticketCategory,
        priority: ticketPriority,
        status: 'open',
        created_by: currentUser.id,
        branch_id: currentUser.branch_id || null,
        sla_response_deadline: slaDeadline,
        attachments: []
      });
      setIsTicketModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbTitle.trim() || !kbContent.trim()) {
      setError('Title and content are required.');
      return;
    }
    try {
      await onAddKbArticle({
        title: kbTitle,
        content: kbContent,
        category: kbCategory,
        is_published: true,
        created_by: currentUser.id
      });
      alert('KB FAQ Published successfully!');
      setIsKbModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to publish article.');
    }
  };

  const handleOpenTicketDetails = (ticket: SupportTicket) => {
    setActiveTicket(ticket);
    // Seed initial description as a comment thread start
    const initialComments: TicketComment[] = [
      {
        id: 'start',
        ticket_id: ticket.id,
        user_id: ticket.created_by,
        content: ticket.description,
        created_at: ticket.created_at,
        user_name: ticket.creator_name || 'Ticket Opener'
      }
    ];
    setCommentsList(initialComments);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !activeTicket) return;

    try {
      const commentPayload = {
        ticket_id: activeTicket.id,
        user_id: currentUser.id,
        content: newComment,
        attachments: []
      };

      // In real code we await database insert:
      await onAddComment(commentPayload);
      
      const addedComment: TicketComment = {
        id: Math.random().toString(),
        ticket_id: activeTicket.id,
        user_id: currentUser.id,
        content: newComment,
        created_at: new Date().toISOString(),
        user_name: currentUser.name
      };

      setCommentsList([...commentsList, addedComment]);
      setNewComment('');

      // Auto update status to In Progress if open
      if (activeTicket.status === 'open') {
        await onUpdateTicket(activeTicket.id, {
          status: 'in_progress',
          first_response_at: new Date().toISOString()
        });
        setActiveTicket({ ...activeTicket, status: 'in_progress' });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit comment.');
    }
  };

  const handleCloseTicket = async (ticket: SupportTicket) => {
    if (!window.confirm('Close this ticket resolved?')) return;
    try {
      await onUpdateTicket(ticket.id, {
        status: 'closed',
        closed_at: new Date().toISOString(),
        resolved_at: new Date().toISOString()
      });
      setActiveTicket(null);
    } catch (err: any) {
      alert(err.message || 'Failed to close.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Support Center
          </h1>
          <p className="dark:text-slate-400 text-sm mt-1">
            Submit service issues, report system anomalies, browse guides, and monitor SLA compliance.
          </p>
        </div>

        <div className="flex gap-2">
          {isPrivileged && activeViewTab === 'kb' && (
            <Button
              onClick={openKbCreate}
              className="flex items-center gap-2 border border-blue-500/30 bg-blue-950/20 text-blue-400 hover:bg-blue-950/50"
            >
              <Plus className="h-4 w-4" /> Add Article
            </Button>
          )}

          <Button
            onClick={openTicketCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-blue-500/10 transition-all border-none"
          >
            <Plus className="h-4 w-4" /> Create Ticket
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Workspace */}
        <div className="lg:col-span-3 space-y-6">
          {/* Navigation Tab */}
          <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md p-4 flex justify-between items-center">
            <div className="flex bg-slate-950/40 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setActiveViewTab('tickets')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
                  activeViewTab === 'tickets' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="h-4 w-4" /> Support Tickets
              </button>
              <button
                onClick={() => setActiveViewTab('kb')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
                  activeViewTab === 'kb' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="h-4 w-4" /> Knowledge Base FAQ
              </button>
            </div>
          </Card>

          {/* Filters strip */}
          <Card className="glass-card border-white/5 bg-slate-900/20 backdrop-blur-md p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeViewTab === 'tickets' ? 'Search tickets...' : 'Search articles...'}
                className="pl-9 bg-slate-950 border-white/5 text-slate-100 text-sm focus:border-blue-500"
              />
            </div>

            {activeViewTab === 'tickets' && (
              <div className="flex flex-wrap gap-2.5 w-full sm:w-auto justify-end">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-white/5 text-slate-300 rounded-md p-2 text-xs focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="Technical">Technical</option>
                  <option value="Account">Account</option>
                  <option value="Service">Service</option>
                  <option value="General">General</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-white/5 text-slate-300 rounded-md p-2 text-xs focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            )}
          </Card>

          {/* 1. TICKETS LIST */}
          {activeViewTab === 'tickets' && (
            <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-950/20 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Ticket Title</th>
                      <th className="py-4 px-6">Category</th>
                      <th className="py-4 px-6">Priority</th>
                      <th className="py-4 px-6">SLA Deadline</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          No support tickets open.
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((ticket) => {
                        const prioBadges = {
                          urgent: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
                          high: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                          medium: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                          low: 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        };

                        const statusLabels = {
                          open: 'text-sky-400 font-semibold capitalize',
                          assigned: 'text-indigo-400 font-semibold capitalize',
                          in_progress: 'text-amber-400 font-semibold capitalize',
                          resolved: 'text-emerald-400 font-semibold capitalize',
                          closed: 'text-slate-500 font-normal capitalize'
                        };

                        return (
                          <tr key={ticket.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-6">
                              <p className="font-bold text-slate-200">{ticket.title}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Created on {new Date(ticket.created_at).toLocaleDateString()}</p>
                            </td>
                            <td className="py-4 px-6 text-slate-300">
                              {ticket.category}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${prioBadges[ticket.priority]}`}>
                                {ticket.priority}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-300">
                              <div className="flex items-center gap-1 text-xs">
                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                                <span>{ticket.sla_response_deadline ? new Date(ticket.sla_response_deadline).toLocaleDateString() : 'N/A'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={statusLabels[ticket.status]}>
                                {ticket.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenTicketDetails(ticket)}
                                className="text-xs text-slate-300 hover:text-white hover:bg-white/5"
                              >
                                Discuss
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* 2. KNOWLEDGE BASE FAQ ARTICLES */}
          {activeViewTab === 'kb' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {kbArticles.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-slate-500">
                  No knowledge articles match this search.
                </div>
              ) : (
                kbArticles.map((art) => (
                  <Card key={art.id} className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[9px] uppercase tracking-wider font-extrabold">
                          {art.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-200 text-base">{art.title}</h3>
                      <p className="text-slate-400 text-xs mt-3 leading-relaxed">{art.content}</p>
                    </div>

                    <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center text-[10px] text-slate-500 font-bold">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(art.created_at).toLocaleDateString()}</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sidebar details panels */}
        <div className="space-y-6">
          {/* Quick FAQ summary */}
          <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md p-6">
            <CardHeader className="p-0 pb-4 border-b border-white/5">
              <CardTitle className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-400" />
                Support Quick Guides
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-3">
              {mockKbArticlesSeed.map((art) => (
                <div
                  key={art.id}
                  onClick={() => {
                    setActiveViewTab('kb');
                    setSearchTerm(art.title);
                  }}
                  className="p-2.5 bg-slate-950/20 border border-white/5 hover:bg-slate-950/40 rounded-lg cursor-pointer transition-colors"
                >
                  <p className="font-bold text-xs text-slate-200 line-clamp-1">{art.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{art.category} Guide</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* KPI Analytics */}
          <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md p-6 text-xs text-slate-400 space-y-4">
            <h4 className="font-bold text-slate-200 border-b border-white/5 pb-2 uppercase tracking-wider">Ticket SLA Overview</h4>
            <div className="flex justify-between">
              <span>Unresolved Open:</span>
              <span className="text-slate-200 font-bold">{tickets.filter(t => t.status !== 'closed').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Urgent Alerts:</span>
              <span className="text-rose-400 font-bold">{tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed').length}</span>
            </div>
            <div className="flex justify-between">
              <span>SLA Met Rate:</span>
              <span className="text-emerald-400 font-bold">98.5%</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Ticket Create Dialog */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-slate-900 border border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Create Support Ticket
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveTicket} className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ticket Subject</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of the issue..."
                className="bg-slate-950 border-white/10 text-slate-100 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Describe the issue</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include error codes, customer reference, or reproduction steps..."
                className="bg-slate-950 border-white/10 text-slate-100 focus:border-blue-500 h-32 resize-none"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="General">General Broadcast</option>
                  <option value="Technical">Technical Error</option>
                  <option value="Account">Account/Invoice Issue</option>
                  <option value="Service">Service Request</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority</label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Priority</option>
                </select>
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsTicketModalOpen(false)}
                className="border border-white/10 text-slate-400 hover:text-white"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Create Ticket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* KB Article Create Dialog */}
      <Dialog open={isKbModalOpen} onOpenChange={setIsKbModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-slate-900 border border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Publish FAQ Article
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveKb} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Article Title</label>
              <Input
                value={kbTitle}
                onChange={(e) => setKbTitle(e.target.value)}
                placeholder="Question or headline topic..."
                className="bg-slate-950 border-white/10 text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Article Content</label>
              <Textarea
                value={kbContent}
                onChange={(e) => setKbContent(e.target.value)}
                placeholder="Detailed guidance, workflow, or solution steps..."
                className="bg-slate-950 border-white/10 text-slate-100 h-32 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
              <select
                value={kbCategory}
                onChange={(e) => setKbCategory(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
              >
                <option value="Technical">Technical</option>
                <option value="Account">Account</option>
                <option value="General">General</option>
              </select>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsKbModalOpen(false)} className="border border-white/10 text-slate-400">
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                Publish FAQ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket detail discussion dialog drawer */}
      <Dialog open={!!activeTicket} onOpenChange={(open) => !open && setActiveTicket(null)}>
        {activeTicket && (
          <DialogContent className="sm:max-w-[600px] bg-slate-900 border border-white/10 text-slate-100 flex flex-col max-h-[85vh]">
            <DialogHeader className="border-b border-white/5 pb-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[9px] uppercase font-extrabold">
                    {activeTicket.category}
                  </span>
                  <DialogTitle className="text-lg font-bold text-slate-200 mt-2">{activeTicket.title}</DialogTitle>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold capitalize text-amber-400 block">{activeTicket.status}</span>
                  {activeTicket.status !== 'closed' && (
                    <Button
                      size="sm"
                      onClick={() => handleCloseTicket(activeTicket)}
                      className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold py-1 h-7 flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" /> Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* Conversation Messages Thread */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 min-h-[30vh]">
              {commentsList.map((comm) => {
                const isMe = comm.user_id === currentUser.id;
                return (
                  <div key={comm.id} className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                    <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center shrink-0 text-slate-400 text-xs font-bold">
                      {comm.user_name ? comm.user_name.substring(0, 2).toUpperCase() : 'US'}
                    </div>
                    <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                      isMe 
                        ? 'bg-blue-600/10 border-blue-500/20 text-blue-100 rounded-tr-none' 
                        : 'bg-slate-950/40 border-white/5 text-slate-200 rounded-tl-none'
                    }`}>
                      <p className="font-extrabold text-[10px] text-slate-400">{comm.user_name}</p>
                      <p className="whitespace-pre-wrap">{comm.content}</p>
                      <p className="text-[8px] text-slate-500 text-right">{new Date(comm.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Form */}
            {activeTicket.status !== 'closed' && (
              <form onSubmit={handleSendComment} className="border-t border-white/5 pt-4 flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type support response or follow-up content..."
                  className="bg-slate-950 border-white/10 text-slate-100 text-xs focus:border-blue-500 flex-1"
                />
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
