import React, { useState, useMemo } from 'react';
import { WorkOrder, WorkOrderNote, Customer, Service, User, UserRole } from '../types';
import { Plus, Search, Clipboard, Clock, CheckCircle2, ChevronRight, FileText, User as UserIcon, Calendar, ArrowRight, DollarSign, Send, Edit, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';

interface WorkOrdersProps {
  workOrders: WorkOrder[];
  onAddWorkOrder: (workOrderData: Omit<WorkOrder, 'id' | 'created_at' | 'updated_at' | 'reference_number'>) => Promise<any>;
  onUpdateWorkOrder: (id: string, workOrderData: Partial<WorkOrder>) => Promise<any>;
  onAddNote: (noteData: Omit<WorkOrderNote, 'id' | 'created_at'>) => Promise<any>;
  customers: Customer[];
  services: Service[];
  users: User[];
  branches: any[];
  currentUser: User;
}

export default function WorkOrders({
  workOrders = [],
  onAddWorkOrder,
  onUpdateWorkOrder,
  onAddNote,
  customers = [],
  services = [],
  users = [],
  branches = [],
  currentUser
}: WorkOrdersProps) {
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isPrivileged = isSuperAdmin || isAdmin;

  // View States
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // Modal Dialogs
  const [isOpen, setIsOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<WorkOrder | null>(null);

  // Form Fields
  const [customerId, setCustomerId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [subServiceId, setSubServiceId] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'normal' | 'low'>('normal');
  const [status, setStatus] = useState<'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'completed' | 'invoiced'>('accepted'); // Auto-accept by default!
  const [assignedTo, setAssignedTo] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [branchId, setBranchId] = useState('');

  // Active Work Order Notes States
  const [newNote, setNewNote] = useState('');
  const [notesList, setNotesList] = useState<WorkOrderNote[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Scoped list
  const resolvedWorkOrders = useMemo(() => {
    return workOrders.map(wo => {
      const cust = customers.find(c => c.id === wo.customer_id);
      const serv = services.find(s => s.id === wo.service_id);
      const sub = serv?.sub_services?.find(ss => ss.id === wo.sub_service_id);
      const ass = users.find(u => u.id === wo.assigned_to);

      return {
        ...wo,
        customer_name: cust ? cust.name : wo.customer_name || 'Walk-in Client',
        customer_phone: cust ? cust.phone : wo.customer_phone || 'N/A',
        service_name: serv ? serv.name : 'General Consulting',
        sub_service_name: sub ? sub.name : 'Standard Assistance',
        assignee_name: ass ? ass.name : 'Unassigned Representative'
      };
    });
  }, [workOrders, customers, services, users]);

  // Filtering
  const filteredOrders = useMemo(() => {
    return resolvedWorkOrders.filter(wo => {
      if (branchFilter !== 'all' && wo.branch_id !== branchFilter) return false;
      if (priorityFilter !== 'all' && wo.priority !== priorityFilter) return false;

      // Sales exec scope: only see orders assigned to them
      if (currentUser.role === UserRole.SALES_EXECUTIVE && wo.assigned_to !== currentUser.id) return false;

      const search = searchTerm.toLowerCase();
      return (
        (wo.reference_number || '').toLowerCase().includes(search) ||
        (wo.customer_name || '').toLowerCase().includes(search) ||
        (wo.description || '').toLowerCase().includes(search)
      );
    });
  }, [resolvedWorkOrders, branchFilter, priorityFilter, searchTerm, currentUser]);

  // SLA Totals KPI
  const kpis = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let pendingAssign = 0;

    filteredOrders.forEach(o => {
      if (o.status === 'completed' || o.status === 'invoiced') completed++;
      else if (o.status === 'in_progress') inProgress++;
      else if (o.status === 'submitted' || o.status === 'accepted') pendingAssign++;
    });

    return { completed, inProgress, pendingAssign, total: filteredOrders.length };
  }, [filteredOrders]);

  const openCreateModal = () => {
    setCustomerId('');
    setServiceId('');
    setSubServiceId('');
    setDescription('');
    setPriority('normal');
    setStatus('accepted'); // Auto-accept immediately!
    setAssignedTo('');
    setEstimatedCompletion('');
    setTotalAmount('');
    setBranchId(currentUser.branch_id || '');
    setError('');
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Client selection is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const client = customers.find(c => c.id === customerId);

      const payload = {
        customer_id: customerId,
        customer_name: client ? client.name : 'Unknown Client',
        customer_phone: client ? client.phone : 'N/A',
        service_id: serviceId || null,
        sub_service_id: subServiceId || null,
        description,
        priority,
        status,
        assigned_to: assignedTo || null,
        branch_id: branchId || currentUser.branch_id || null,
        estimated_completion: estimatedCompletion ? new Date(estimatedCompletion).toISOString() : null,
        total_amount: totalAmount ? Number(totalAmount) : 0,
        source: 'crm' as const,
        created_by: currentUser.id
      };

      await onAddAddWorkOrder(payload);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create work order.');
    } finally {
      setLoading(false);
    }
  };

  // Helper because standard compiler name maps to apiData
  const onAddAddWorkOrder = async (payload: any) => {
    if (onAddWorkOrder) {
      return await onAddWorkOrder(payload);
    }
  };

  const handleOpenOrderDetails = (order: WorkOrder) => {
    setActiveOrder(order);
    // Seed initial description as notes
    const startNotes: WorkOrderNote[] = [
      {
        id: 'start',
        work_order_id: order.id,
        user_id: order.created_by || currentUser.id,
        content: order.description || 'Work order initiated.',
        created_at: order.created_at,
        user_name: 'System Initiator'
      }
    ];
    setNotesList(startNotes);
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !activeOrder) return;

    try {
      const notePayload = {
        work_order_id: activeOrder.id,
        user_id: currentUser.id,
        content: newNote
      };

      await onAddNote(notePayload);

      const addedNote: WorkOrderNote = {
        id: Math.random().toString(),
        work_order_id: activeOrder.id,
        user_id: currentUser.id,
        content: newNote,
        created_at: new Date().toISOString(),
        user_name: currentUser.name
      };

      setNotesList([...notesList, addedNote]);
      setNewNote('');
    } catch (err: any) {
      alert(err.message || 'Failed to add notes.');
    }
  };

  const handleAdvanceStatus = async (order: WorkOrder, nextStatus: typeof status) => {
    try {
      const updates: Partial<WorkOrder> = {
        status: nextStatus,
        actual_completion: nextStatus === 'completed' ? new Date().toISOString() : undefined
      };
      await onUpdateWorkOrder(order.id, updates);
      setActiveOrder({ ...order, ...updates });
    } catch (err: any) {
      alert(err.message || 'Failed to update work order.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Work Orders Lifecycle
          </h1>
          <p className="dark:text-slate-400 text-sm mt-1">
            Dispatch customer service assignments, track operational SLA progress, and auto-convert to invoices.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-blue-500/10 transition-all border-none"
        >
          <Plus className="h-4 w-4" /> Create Work Order
        </Button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Work Orders Dispatch', value: kpis.total, desc: 'All channels logged', color: 'text-blue-400' },
          { label: 'Completed Orders', value: kpis.completed, desc: 'Ready for client invoicing', color: 'text-emerald-400' },
          { label: 'Active Pipeline', value: kpis.inProgress, desc: 'Representative processing', color: 'text-amber-400' },
          { label: 'Awaiting Assignment', value: kpis.pendingAssign, desc: 'Auto-accepted, pending staff', color: 'text-rose-400' },
        ].map((item, idx) => (
          <Card key={idx} className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md p-4">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{item.label}</p>
            <h3 className={`text-2xl font-bold mt-1.5 ${item.color}`}>{item.value}</h3>
            <p className="text-[10px] text-slate-400 mt-1">{item.desc}</p>
          </Card>
        ))}
      </div>

      {/* Filters Bar */}
      <Card className="glass-card border-white/5 bg-slate-900/20 backdrop-blur-md p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reference or customer..."
            className="pl-9 bg-slate-950 border-white/5 text-slate-100 text-sm focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto justify-end">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-white/5 text-slate-300 rounded-md p-2 text-xs focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          {isSuperAdmin && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-slate-950 border border-white/5 text-slate-300 rounded-md p-2 text-xs focus:outline-none"
            >
              <option value="all">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
      </Card>

      {/* Kanban Board columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { key: 'accepted', title: 'Awaiting Assignment', color: 'border-rose-500 bg-rose-500/5', dot: 'bg-rose-500' },
          { key: 'assigned', title: 'Assigned Dispatch', color: 'border-blue-500 bg-blue-500/5', dot: 'bg-blue-500' },
          { key: 'in_progress', title: 'In Progress', color: 'border-amber-500 bg-amber-500/5', dot: 'bg-amber-500' },
          { key: 'completed', title: 'Completed Delivery', color: 'border-emerald-500 bg-emerald-500/5', dot: 'bg-emerald-500' }
        ].map((column) => {
          // Submitted and Accepted orders go to column 1. Completed and Invoiced go to column 4.
          const columnOrders = filteredOrders.filter(o => {
            if (column.key === 'accepted') return o.status === 'submitted' || o.status === 'accepted';
            if (column.key === 'completed') return o.status === 'completed' || o.status === 'invoiced';
            return o.status === column.key;
          });

          return (
            <Card key={column.key} className={`glass-card border-t-2 border-white/5 bg-slate-900/30 backdrop-blur-md flex flex-col p-4 gap-4 h-[65vh] ${column.color}`}>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${column.dot}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{column.title}</span>
                </div>
                <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-full font-bold text-slate-400">{columnOrders.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                {columnOrders.map((order) => {
                  const prioBadges = {
                    urgent: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                    normal: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                    low: 'bg-slate-500/20 text-slate-400 border-white/10'
                  };

                  return (
                    <div
                      key={order.id}
                      onClick={() => handleOpenOrderDetails(order)}
                      className="bg-slate-950/40 hover:bg-slate-950/70 p-3.5 rounded-lg border border-white/5 cursor-pointer transition-all space-y-2.5 hover:translate-y-[-2px] shadow-sm relative group"
                    >
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold border-b border-white/5 pb-2">
                        <span>{order.reference_number || 'WO-PENDING'}</span>
                        <span className="capitalize">{order.source}</span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-200 line-clamp-1">{order.customer_name}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{order.description || 'No description provided.'}</p>

                      <div className="flex justify-between items-center pt-2 text-[9px] text-slate-500 font-semibold">
                        <span className={`px-1.5 py-0.5 rounded border text-[8px] uppercase font-extrabold ${prioBadges[order.priority]}`}>
                          {order.priority}
                        </span>
                        <span className="text-slate-400">{order.assignee_name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Work Order Create Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[550px] bg-slate-900 border border-white/10 text-slate-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Create Work Order Dispatch
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
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
                disabled={loading}
              >
                <option value="">-- Choose Client Profile --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Service</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="">-- Choose Service --</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sub-Service Product</label>
                <select
                  value={subServiceId}
                  onChange={(e) => setSubServiceId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="">-- Choose Product --</option>
                  {services.find(s => s.id === serviceId)?.sub_services?.map(ss => (
                    <option key={ss.id} value={ss.id}>{ss.name} (Rs {ss.price})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Service Task Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include client requests, custom pricing adjustments, or specific deadlines..."
                className="bg-slate-950 border-white/10 text-slate-100 focus:border-blue-500 h-24 resize-none text-xs"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Work Order Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="urgent">Urgent Priority</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operating Branch</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="">-- Select Branch --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimated Completion</label>
                <Input
                  type="date"
                  value={estimatedCompletion}
                  onChange={(e) => setEstimatedCompletion(e.target.value)}
                  className="bg-slate-950 border-white/10 text-slate-100"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Service Billing Cost (Rs)</label>
                <Input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="bg-slate-950 border-white/10 text-slate-100"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Representative</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="">-- Dispatch to Staff --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workflow Status</label>
                <div className="w-full bg-slate-950 border border-white/10 text-slate-400 rounded-md p-2 text-sm font-semibold text-center select-none uppercase tracking-wider">
                  Accepted (Auto 24/7)
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
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
                {loading ? 'Submitting...' : 'Dispatch Order'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details drawer dialog */}
      <Dialog open={!!activeOrder} onOpenChange={(open) => !open && setActiveOrder(null)}>
        {activeOrder && (
          <DialogContent className="sm:max-w-[600px] bg-slate-900 border border-white/10 text-slate-100 flex flex-col max-h-[85vh]">
            <DialogHeader className="border-b border-white/5 pb-4 space-y-2">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[9px] uppercase font-extrabold">
                    {activeOrder.reference_number || 'WO-PENDING'}
                  </span>
                  <DialogTitle className="text-lg font-bold text-slate-200 mt-2">{activeOrder.customer_name}</DialogTitle>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">{activeOrder.status}</span>
                  <span className="text-[10px] text-slate-500 mt-1">Source: {activeOrder.source}</span>
                </div>
              </div>
            </DialogHeader>

            {/* Main scrollable body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 min-h-[35vh]">
              {/* General Order fields */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/20 p-4 rounded-xl border border-white/5">
                <div>
                  <p className="text-slate-500 font-bold uppercase tracking-wide">Client Phone</p>
                  <p className="text-slate-200 font-semibold mt-1">{activeOrder.customer_phone}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase tracking-wide">Assigned To</p>
                  <p className="text-slate-200 font-semibold mt-1">{activeOrder.assignee_name}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase tracking-wide">Estimated Completion</p>
                  <p className="text-slate-200 font-semibold mt-1">
                    {activeOrder.estimated_completion ? new Date(activeOrder.estimated_completion).toLocaleDateString() : 'No date set'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase tracking-wide">Billing Amount</p>
                  <p className="text-slate-200 font-semibold mt-1">Rs {activeOrder.total_amount || 0}</p>
                </div>
              </div>

              {/* Status progression triggers */}
              <div className="space-y-2">
                <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Workflow Transitions</h4>
                <div className="flex flex-wrap gap-2">
                  {activeOrder.status === 'accepted' && (
                    <Button
                      size="sm"
                      onClick={() => handleAdvanceStatus(activeOrder, 'assigned')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1 h-8 flex items-center gap-1"
                    >
                      Dispatch Assignment <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {activeOrder.status === 'assigned' && (
                    <Button
                      size="sm"
                      onClick={() => handleAdvanceStatus(activeOrder, 'in_progress')}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-1 h-8 flex items-center gap-1"
                    >
                      Start Execution <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {activeOrder.status === 'in_progress' && (
                    <Button
                      size="sm"
                      onClick={() => handleAdvanceStatus(activeOrder, 'completed')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1 h-8 flex items-center gap-1"
                    >
                      Mark Completed <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {activeOrder.status === 'completed' && (
                    <Button
                      size="sm"
                      onClick={() => handleAdvanceStatus(activeOrder, 'invoiced')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1 h-8 flex items-center gap-1"
                    >
                      Convert to Invoice <FileText className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {activeOrder.status === 'invoiced' && (
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 bg-emerald-950/20 border border-emerald-950 p-2 rounded-lg">
                      <CheckCircle2 className="h-4 w-4" /> Work Order Completed & Invoiced
                    </span>
                  )}
                </div>
              </div>

              {/* Work Order Notes/Staff Updates */}
              <div className="space-y-3">
                <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Service Delivery Notes</h4>
                
                {/* Notes thread */}
                <div className="space-y-2 max-h-[25vh] overflow-y-auto">
                  {notesList.map((note) => (
                    <div key={note.id} className="bg-slate-950/30 p-3 rounded-lg border border-white/5 text-xs text-slate-300">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mb-1">
                        <span>{note.user_name}</span>
                        <span>{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <p>{note.content}</p>
                    </div>
                  ))}
                </div>

                {/* Send Note Form */}
                <form onSubmit={handleSendNote} className="flex gap-2 pt-2">
                  <Input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Log a progress detail or client change update..."
                    className="bg-slate-950 border-white/10 text-slate-100 text-xs focus:border-blue-500 flex-1"
                  />
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>

            <DialogFooter className="mt-4 border-t border-white/5 pt-4">
              <Button variant="ghost" onClick={() => setActiveOrder(null)} className="border border-white/10 text-slate-300 hover:text-white">
                Close Details
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
