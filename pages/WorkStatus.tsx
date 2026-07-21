import React, { useState, useMemo } from 'react';
import { Task, User, UserRole, Lead, Branch } from '../types';
import { Plus, Search, Calendar, User as UserIcon, Clock, AlertCircle, Trash2, CheckCircle2, ChevronRight, Filter, TrendingUp, BarChart3, Edit2, Play, Eye } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';

interface WorkStatusProps {
  leads: Lead[];
  users: User[];
  branches: Branch[];
  currentUser: User;
  onAddTask: (leadId: string | null, taskData: Omit<Task, 'id' | 'created_at' | 'is_completed' | 'completed_at'>) => Promise<any>;
  onUpdateTask: (leadId: string | null, updatedTask: Task) => Promise<any>;
  onDeleteTask: (leadId: string | null, taskId: string) => Promise<any>;
}

export default function WorkStatus({
  leads = [],
  users = [],
  branches = [],
  currentUser,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}: WorkStatusProps) {
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isBranchManager = currentUser?.role === UserRole.BRANCH_MANAGER;
  const isPrivileged = isSuperAdmin || isAdmin || isBranchManager;

  // Extract all tasks from leads, plus add fallback tasks mapping
  const allTasks = useMemo(() => {
    const list: Task[] = [];
    leads.forEach(lead => {
      if (lead.tasks && Array.isArray(lead.tasks)) {
        lead.tasks.forEach(t => {
          // Bind lead details onto the task object for display/updates
          list.push({
            ...t,
            // Ensure status default
            status: t.status || (t.is_completed ? 'done' : 'todo'),
            // Save lead ref
            depends_on_task_id: lead.id as any
          });
        });
      }
    });
    return list;
  }, [leads]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form Fields
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'review' | 'done'>('todo');
  const [category, setCategory] = useState<'work_order' | 'internal' | 'client_task'>('client_task');
  const [assignedToId, setAssignedToId] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [actualHours, setActualHours] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [branchId, setBranchId] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Scoped list
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      // 1. Branch Filter
      if (branchFilter !== 'all' && task.branch_id !== branchFilter) return false;

      // 2. Category Filter
      const taskCategory = task.category || 'client_task';
      if (categoryFilter !== 'all' && taskCategory !== categoryFilter) return false;

      // 3. Assigned Representative Filter
      const assignedId = task.assigned_to?.id || (task.assigned_to as any);
      if (assignedFilter !== 'all' && assignedId !== assignedFilter) return false;

      // 4. Search Filter
      const search = searchTerm.toLowerCase();
      return (
        task.content.toLowerCase().includes(search) ||
        (task.assigned_to?.name || '').toLowerCase().includes(search)
      );
    });
  }, [allTasks, branchFilter, categoryFilter, assignedFilter, searchTerm]);

  // Totals calculations
  const metrics = useMemo(() => {
    let est = 0;
    let act = 0;
    let completedCount = 0;

    filteredTasks.forEach(t => {
      est += Number(t.estimated_hours || 0);
      act += Number(t.actual_hours || 0);
      if (t.status === 'done' || t.is_completed) completedCount++;
    });

    return {
      estimatedHours: est,
      actualHours: act,
      completionRate: filteredTasks.length > 0 ? Math.round((completedCount / filteredTasks.length) * 100) : 0,
      totalCount: filteredTasks.length
    };
  }, [filteredTasks]);

  // Open modal
  const openCreateModal = () => {
    setEditingTask(null);
    setContent('');
    setDueDate('');
    setPriority('medium');
    setStatus('todo');
    setCategory('client_task');
    setAssignedToId('');
    setEstimatedHours('');
    setActualHours('');
    setSelectedLeadId('');
    setBranchId(currentUser.branch_id || '');
    setError('');
    setIsOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setContent(task.content);
    setDueDate(task.due_date || '');
    setPriority(task.priority as any);
    setStatus(task.status || 'todo');
    setCategory(task.category || 'client_task');
    setAssignedToId(task.assigned_to?.id || (task.assigned_to as any) || '');
    setEstimatedHours(task.estimated_hours?.toString() || '');
    setActualHours(task.actual_hours?.toString() || '');
    setSelectedLeadId(task.depends_on_task_id as any || ''); // depends_on_task_id holds the lead_id in our local wrapper
    setBranchId(task.branch_id || '');
    setError('');
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Task content/name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: any = {
        content,
        due_date: dueDate || null,
        priority,
        status,
        is_completed: status === 'done',
        completed_at: status === 'done' ? new Date().toISOString() : null,
        category,
        assigned_to: assignedToId || null,
        estimated_hours: estimatedHours ? Number(estimatedHours) : null,
        actual_hours: actualHours ? Number(actualHours) : null,
        branch_id: branchId || currentUser.branch_id || null
      };

      const targetLeadId = selectedLeadId || null;

      if (editingTask) {
        // Find parent lead ID from editing task wrapper
        const leadId = editingTask.depends_on_task_id as any;
        await onUpdateTask(leadId, {
          ...editingTask,
          ...payload
        });
      } else {
        await onAddTask(targetLeadId, payload);
      }
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save task.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (task: Task) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const leadId = task.depends_on_task_id as any;
      await onDeleteTask(leadId, task.id);
      setIsOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete task.');
    }
  };

  const handleMoveStatus = async (task: Task, nextStatus: 'todo' | 'in_progress' | 'review' | 'done') => {
    try {
      const leadId = task.depends_on_task_id as any;
      await onUpdateTask(leadId, {
        ...task,
        status: nextStatus,
        is_completed: nextStatus === 'done',
        completed_at: nextStatus === 'done' ? new Date().toISOString() : null
      });
    } catch (err: any) {
      alert(err.message || 'Failed to transition task.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Work Status Kanban
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor client orders, employee task progress, and resource distribution across branches.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium border-none shadow-lg hover:shadow-blue-500/10 transition-all"
        >
          <Plus className="h-4 w-4" /> Create Work Order
        </Button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Total Tasks Active', value: metrics.totalCount, desc: 'Across active scopes', icon: BarChart3, color: 'text-blue-400' },
          { title: 'Task Completion Rate', value: `${metrics.completionRate}%`, desc: 'Done vs total workload', icon: CheckCircle2, color: 'text-emerald-400' },
          { title: 'Est. Workload Hours', value: `${metrics.estimatedHours} hrs`, desc: 'Target workload allocated', icon: Clock, color: 'text-indigo-400' },
          { title: 'Actual Hours Spent', value: `${metrics.actualHours} hrs`, desc: 'Time logged on execution', icon: TrendingUp, color: 'text-amber-400' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-200 mt-1">{stat.value}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{stat.desc}</p>
              </div>
              <div className={`p-3 bg-slate-950/50 rounded-lg border border-white/5 ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters Bar */}
      <Card className="glass-card border-white/5 bg-slate-900/20 backdrop-blur-md p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks or assignees..."
            className="pl-9 bg-slate-950 border-white/5 text-slate-100 text-sm focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
          {/* Branch Filter */}
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

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-white/5 text-slate-300 rounded-md p-2 text-xs focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="client_task">Client Tasks</option>
            <option value="work_order">Work Orders</option>
            <option value="internal">Internal Tasks</option>
          </select>

          {/* Representative Filter */}
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="bg-slate-950 border border-white/5 text-slate-300 rounded-md p-2 text-xs focus:outline-none"
          >
            <option value="all">All Assignees</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['todo', 'in_progress', 'review', 'done'] as const).map((colStatus) => {
          const columnTasks = filteredTasks.filter(t => t.status === colStatus);
          const colConfigs = {
            todo: { title: 'To Do', color: 'border-slate-500 bg-slate-500/5', dot: 'bg-slate-400' },
            in_progress: { title: 'In Progress', color: 'border-blue-500 bg-blue-500/5', dot: 'bg-blue-500' },
            review: { title: 'Under Review', color: 'border-amber-500 bg-amber-500/5', dot: 'bg-amber-500' },
            done: { title: 'Completed', color: 'border-emerald-500 bg-emerald-500/5', dot: 'bg-emerald-500' }
          };

          return (
            <Card key={colStatus} className={`glass-card border-t-2 border-white/5 bg-slate-900/30 backdrop-blur-md flex flex-col p-4 gap-4 h-[65vh] ${colConfigs[colStatus].color}`}>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${colConfigs[colStatus].dot}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {colConfigs[colStatus].title}
                  </span>
                </div>
                <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-full font-bold text-slate-400">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                {columnTasks.map((task) => {
                  const priorityColors = {
                    high: 'border-rose-500/30 bg-rose-500/5 text-rose-300',
                    medium: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
                    low: 'border-blue-500/30 bg-blue-500/5 text-blue-300'
                  };

                  const resolvedCategory = task.category || 'client_task';
                  const catLabels = {
                    work_order: 'Work Order',
                    internal: 'Internal',
                    client_task: 'Client Task'
                  };

                  return (
                    <div
                      key={task.id}
                      className="bg-slate-950/40 hover:bg-slate-950/70 p-3.5 rounded-lg border border-white/5 transition-all space-y-3 shadow-md hover:translate-y-[-2px] relative group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold border ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">
                          {catLabels[resolvedCategory]}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-200 leading-relaxed">{task.content}</h4>

                      {/* Display Assignee */}
                      {task.assigned_to && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <UserIcon className="h-3 w-3 text-slate-500" />
                          <span>{task.assigned_to.name || (task.assigned_to as any)}</span>
                        </div>
                      )}

                      {/* Bottom row: hours & action triggers */}
                      <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[9px] text-slate-500 font-semibold">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{task.actual_hours || 0}/{task.estimated_hours || 0} hrs</span>
                        </div>

                        {/* Quick state sliders */}
                        <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {colStatus !== 'done' && (
                            <button
                              onClick={() => {
                                const nextMap = { todo: 'in_progress', in_progress: 'review', review: 'done' } as const;
                                handleMoveStatus(task, nextMap[colStatus]);
                              }}
                              className="p-1 hover:text-white hover:bg-white/5 rounded"
                              title="Advance task status"
                            >
                              <Play className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(task)}
                            className="p-1 hover:text-white hover:bg-white/5 rounded"
                            title="Edit details"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[550px] bg-slate-900 border border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              {editingTask ? 'Edit Work Order Details' : 'Create New Work Order'}
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
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Task Summary</label>
              <Input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What client service, internal operation, or task needs action?"
                className="bg-slate-950 border-white/10 text-slate-100 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-slate-950 border-white/10 text-slate-100"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                  disabled={loading}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Task Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="client_task">Client Task</option>
                  <option value="work_order">Work Order</option>
                  <option value="internal">Internal Operation</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assign Representative</label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                  disabled={loading}
                >
                  <option value="">-- Select Representative --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimated Hours</label>
                <Input
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g. 5"
                  className="bg-slate-950 border-white/10 text-slate-100"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actual Hours Spent</label>
                <Input
                  type="number"
                  value={actualHours}
                  onChange={(e) => setActualHours(e.target.value)}
                  placeholder="e.g. 3"
                  className="bg-slate-950 border-white/10 text-slate-100"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Link to Lead/Customer Pipeline</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                  disabled={loading || !!editingTask} // Prevent re-linking existing tasks
                >
                  <option value="">-- Select Lead Reference --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Task Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                  disabled={loading}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Under Review</option>
                  <option value="done">Done/Completed</option>
                </select>
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-between gap-2">
              {editingTask && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleDelete(editingTask)}
                  className="bg-rose-950/20 text-rose-400 border border-rose-950 hover:bg-rose-950/40 mr-auto"
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                </Button>
              )}
              <div className="flex gap-2">
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
                  {loading ? 'Saving...' : 'Save Order'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
