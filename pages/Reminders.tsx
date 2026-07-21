import React, { useState, useMemo } from 'react';
import { Reminder, User, UserRole, Lead, Customer } from '../types';
import { Plus, Search, Calendar as CalendarIcon, Clock, AlertCircle, Trash2, CheckCircle, Eye, UserCheck, Bell, ChevronLeft, ChevronRight, List, Kanban, Heart } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns';

interface RemindersProps {
  reminders: Reminder[];
  onAddReminder: (reminderData: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateReminder: (id: string, reminderData: Partial<Reminder>) => Promise<any>;
  onDeleteReminder: (id: string) => Promise<any>;
  leads: Lead[];
  customers: Customer[];
  users: User[];
  branches: any[];
  currentUser: User;
}

export default function Reminders({
  reminders = [],
  onAddReminder,
  onUpdateReminder,
  onDeleteReminder,
  leads = [],
  customers = [],
  users = [],
  branches = [],
  currentUser,
}: RemindersProps) {
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isBranchManager = currentUser?.role === UserRole.BRANCH_MANAGER;
  const isPrivileged = isSuperAdmin || isAdmin || isBranchManager;

  // View States
  const [activeTab, setActiveTab] = useState<'personal' | 'assigned'>('personal');
  const [layoutMode, setLayoutMode] = useState<'list' | 'calendar' | 'kanban'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modal Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueTime, setDueTime] = useState('09:00');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [reminderType, setReminderType] = useState<'personal' | 'task_assigned'>('personal');
  const [assignedToId, setAssignedToId] = useState('');
  const [relatedLeadId, setRelatedLeadId] = useState('');
  const [relatedCustomerId, setRelatedCustomerId] = useState('');
  const [status, setStatus] = useState<'pending' | 'snoozed' | 'completed' | 'overdue'>('pending');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Scoped list
  const filteredReminders = useMemo(() => {
    return reminders.filter(reminder => {
      // 1. Tab Scoping
      if (activeTab === 'personal') {
        if (reminder.user_id !== currentUser.id && reminder.assigned_to !== currentUser.id) return false;
      } else {
        // Assigned Tab (only relevant for creators or assignees of task_assigned reminders)
        if (reminder.type !== 'task_assigned') return false;
        if (reminder.assigned_by !== currentUser.id && reminder.assigned_to !== currentUser.id) return false;
      }

      // 2. Priority Filter
      if (priorityFilter !== 'all' && reminder.priority !== priorityFilter) return false;

      // 3. Search
      const search = searchTerm.toLowerCase();
      return (
        reminder.title.toLowerCase().includes(search) ||
        (reminder.description || '').toLowerCase().includes(search)
      );
    });
  }, [reminders, activeTab, currentUser.id, priorityFilter, searchTerm]);

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOffset = getDay(startOfMonth(currentMonth));

  // Upcoming birthdays (next 30 days)
  const upcomingBirthdays = useMemo(() => {
    const list: Array<{ name: string; type: string; date: string; daysLeft: number }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkBirthday = (name: string, dobString: string | undefined, type: string) => {
      if (!dobString) return;
      const dob = new Date(dobString);
      const bdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      let diffTime = bdayThisYear.getTime() - today.getTime();
      let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (days < 0) {
        // Already passed this year, check next year
        const bdayNextYear = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
        diffTime = bdayNextYear.getTime() - today.getTime();
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      if (days <= 30) {
        list.push({
          name,
          type,
          date: format(dob, 'dd MMMM'),
          daysLeft: days
        });
      }
    };

    customers.forEach(c => checkBirthday(c.name, c.date_of_birth, 'Customer'));
    users.forEach(u => checkBirthday(u.name, (u as any).date_of_birth, 'Employee'));

    return list.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [customers, users]);

  // Open creation modal
  const openCreateModal = () => {
    setEditingReminder(null);
    setTitle('');
    setDescription('');
    setDueDate(format(new Date(), 'yyyy-MM-dd'));
    setDueTime('09:00');
    setPriority('medium');
    setReminderType('personal');
    setAssignedToId('');
    setRelatedLeadId('');
    setRelatedCustomerId('');
    setStatus('pending');
    setError('');
    setIsOpen(true);
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setTitle(reminder.title);
    setDescription(reminder.description || '');
    setDueDate(reminder.due_date);
    setDueTime(reminder.due_time || '09:00');
    setPriority(reminder.priority);
    setReminderType(reminder.type);
    setAssignedToId(reminder.assigned_to || '');
    setRelatedLeadId(reminder.related_lead_id || '');
    setRelatedCustomerId(reminder.related_customer_id || '');
    setStatus(reminder.status);
    setError('');
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        title,
        description,
        due_date: dueDate,
        due_time: dueTime,
        priority,
        type: reminderType,
        status,
        assigned_by: editingReminder ? editingReminder.assigned_by : currentUser.id,
        assigned_to: reminderType === 'task_assigned' ? assignedToId || null : null,
        user_id: reminderType === 'personal' ? currentUser.id : (assignedToId || currentUser.id),
        related_lead_id: relatedLeadId || null,
        related_customer_id: relatedCustomerId || null,
        branch_id: currentUser.branch_id || null
      };

      if (editingReminder) {
        await onUpdateReminder(editingReminder.id, payload);
      } else {
        await onAddReminder(payload);
      }
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save reminder.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await onDeleteReminder(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete.');
    }
  };

  const handleToggleCompleted = async (reminder: Reminder) => {
    try {
      const newStatus = reminder.status === 'completed' ? 'pending' : 'completed';
      await onUpdateReminder(reminder.id, {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      });
    } catch (err: any) {
      alert(err.message || 'Failed to update reminder status.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Task Reminders
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Create, schedule, and track individual follow-up alerts, customer tasks, and corporate timelines.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium border-none shadow-lg hover:shadow-blue-500/10 transition-all"
        >
          <Plus className="h-4 w-4" /> Add Reminder
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Navigation Tab & Layout selectors */}
          <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex bg-slate-950/40 p-1 rounded-lg border border-white/5 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('personal')}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
                  activeTab === 'personal' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Personal Reminders
              </button>
              <button
                onClick={() => setActiveTab('assigned')}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
                  activeTab === 'assigned' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Team Assigned
              </button>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex bg-slate-950/40 p-1 rounded-lg border border-white/5">
                {[
                  { id: 'list', icon: List },
                  { id: 'calendar', icon: CalendarIcon },
                  { id: 'kanban', icon: Kanban }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setLayoutMode(item.id as any)}
                      className={`p-2 rounded-md transition-all ${
                        layoutMode === item.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Filters Bar */}
          <Card className="glass-card border-white/5 bg-slate-900/20 backdrop-blur-md p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search reminders..."
                className="pl-9 bg-slate-950 border-white/5 text-slate-100 text-sm focus:border-blue-500"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full sm:w-44 bg-slate-950 border border-white/5 text-slate-300 rounded-md p-2 text-xs focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </Card>

          {/* 1. LIST LAYOUT */}
          {layoutMode === 'list' && (
            <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-950/20 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-4 px-6 w-12"></th>
                      <th className="py-4 px-6">Reminder</th>
                      <th className="py-4 px-6">Due Date / Time</th>
                      <th className="py-4 px-6">Priority</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredReminders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          No Reminders scheduled.
                        </td>
                      </tr>
                    ) : (
                      filteredReminders.map((reminder) => {
                        const priorityColors = {
                          high: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
                          medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                          low: 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        };

                        return (
                          <tr key={reminder.id} className={`hover:bg-white/5 transition-colors ${reminder.status === 'completed' ? 'opacity-50' : ''}`}>
                            <td className="py-4 px-6">
                              <button
                                onClick={() => handleToggleCompleted(reminder)}
                                className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                                  reminder.status === 'completed'
                                    ? 'bg-emerald-600 border-emerald-500 text-white'
                                    : 'border-slate-600 hover:border-slate-400 bg-slate-950'
                                }`}
                              >
                                {reminder.status === 'completed' && <CheckCircle className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="py-4 px-6">
                              <p className={`font-bold text-slate-200 ${reminder.status === 'completed' ? 'line-through text-slate-500' : ''}`}>
                                {reminder.title}
                              </p>
                              {reminder.description && (
                                <p className="text-slate-400 text-xs mt-1 line-clamp-1">{reminder.description}</p>
                              )}
                            </td>
                            <td className="py-4 px-6 text-slate-300">
                              <div className="flex items-center gap-1.5 text-xs">
                                <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
                                <span>{format(new Date(reminder.due_date), 'dd/MM/yyyy')}</span>
                                {reminder.due_time && (
                                  <>
                                    <Clock className="h-3.5 w-3.5 text-slate-500 ml-1.5" />
                                    <span>{reminder.due_time}</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${priorityColors[reminder.priority]}`}>
                                {reminder.priority}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-slate-400 text-xs font-semibold capitalize">
                                {reminder.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleEdit(reminder)}
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                                  title="Edit Reminder"
                                >
                                  <Plus className="h-4 w-4 rotate-45" /> {/* Just edit symbol representation */}
                                </button>
                                <button
                                  onClick={() => handleDelete(reminder.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-md transition-colors"
                                  title="Delete Reminder"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
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

          {/* 2. CALENDAR LAYOUT */}
          {layoutMode === 'calendar' && (
            <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md p-6">
              {/* Calendar Month Selector */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-200">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Grid Header */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Grid Days */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty Offsets */}
                {Array.from({ length: startDayOffset }).map((_, i) => (
                  <div key={`offset-${i}`} className="h-24 bg-slate-950/10 rounded-lg border border-white/0 opacity-30" />
                ))}

                {/* Actual Days */}
                {calendarDays.map((day) => {
                  const dayReminders = filteredReminders.filter(r => isSameDay(new Date(r.due_date), day));
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toString()}
                      className={`h-24 p-2 bg-slate-950/30 border rounded-lg flex flex-col justify-between hover:bg-slate-900/40 transition-colors ${
                        isToday ? 'border-blue-500/50 bg-blue-950/10' : 'border-white/5'
                      }`}
                    >
                      <span className={`text-xs font-bold ${isToday ? 'text-blue-400 font-extrabold' : 'text-slate-400'}`}>
                        {format(day, 'd')}
                      </span>

                      {/* Reminder Dots */}
                      <div className="space-y-1 overflow-y-auto max-h-14">
                        {dayReminders.slice(0, 2).map((r) => (
                          <div
                            key={r.id}
                            onClick={() => handleEdit(r)}
                            className={`px-1.5 py-0.5 rounded text-[9px] truncate font-semibold cursor-pointer ${
                              r.priority === 'high'
                                ? 'bg-rose-500/20 text-rose-300'
                                : r.priority === 'medium'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                            title={r.title}
                          >
                            {r.title}
                          </div>
                        ))}
                        {dayReminders.length > 2 && (
                          <div className="text-[8px] text-slate-500 font-bold text-center">
                            +{dayReminders.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* 3. KANBAN LAYOUT */}
          {layoutMode === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['pending', 'snoozed', 'overdue', 'completed'].map((colStatus) => {
                const columnReminders = filteredReminders.filter(r => r.status === colStatus);
                const colHeaders: Record<string, { title: string; color: string }> = {
                  pending: { title: 'Pending', color: 'border-blue-500 bg-blue-500/5' },
                  snoozed: { title: 'Snoozed', color: 'border-amber-500 bg-amber-500/5' },
                  overdue: { title: 'Overdue', color: 'border-rose-500 bg-rose-500/5' },
                  completed: { title: 'Completed', color: 'border-emerald-500 bg-emerald-500/5' }
                };

                return (
                  <Card key={colStatus} className={`glass-card border-t-2 border-white/5 bg-slate-900/30 backdrop-blur-md flex flex-col p-4 gap-4 h-[65vh] ${colHeaders[colStatus].color}`}>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{colHeaders[colStatus].title}</span>
                      <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-full font-bold text-slate-400">{columnReminders.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {columnReminders.map((reminder) => (
                        <div
                          key={reminder.id}
                          onClick={() => handleEdit(reminder)}
                          className="bg-slate-950/40 hover:bg-slate-950/70 p-3 rounded-lg border border-white/5 cursor-pointer transition-all space-y-2 hover:translate-y-[-2px] shadow-sm"
                        >
                          <h4 className="font-bold text-xs text-slate-200 line-clamp-1">{reminder.title}</h4>
                          {reminder.description && <p className="text-[10px] text-slate-400 line-clamp-2">{reminder.description}</p>}
                          
                          <div className="flex justify-between items-center pt-1 text-[9px] text-slate-500 font-semibold border-t border-white/5">
                            <span>{format(new Date(reminder.due_date), 'dd/MM/yy')}</span>
                            <span className="capitalize">{reminder.priority}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Info Panel */}
        <div className="space-y-6">
          {/* Upcoming Birthdays Widget */}
          <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md p-6">
            <CardHeader className="p-0 pb-4 border-b border-white/5 flex flex-row items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500 shrink-0" />
              <CardTitle className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Upcoming Birthdays
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              {upcomingBirthdays.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No birthdays in the next 30 days.</p>
              ) : (
                <div className="space-y-3.5">
                  {upcomingBirthdays.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs bg-slate-950/20 p-2.5 rounded-lg border border-white/5">
                      <div>
                        <p className="font-bold text-slate-200">{item.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{item.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 font-semibold">{item.date}</p>
                        <p className="text-[9px] text-rose-400 font-bold mt-0.5">In {item.daysLeft} days</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Summary */}
          <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md p-6 text-xs text-slate-400 space-y-4">
            <h4 className="font-bold text-slate-200 border-b border-white/5 pb-2 uppercase tracking-wider">Reminder Metrics</h4>
            <div className="flex justify-between">
              <span>Total Active:</span>
              <span className="text-slate-200 font-bold">{reminders.filter(r => r.status !== 'completed').length}</span>
            </div>
            <div className="flex justify-between">
              <span>High Priority:</span>
              <span className="text-rose-400 font-bold">{reminders.filter(r => r.priority === 'high' && r.status !== 'completed').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed Tasks:</span>
              <span className="text-emerald-400 font-bold">{reminders.filter(r => r.status === 'completed').length}</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Editor Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[550px] bg-slate-900 border border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              {editingReminder ? 'Edit Reminder' : 'Add Reminder'}
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
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reminder Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What do you need to follow up on?"
                className="bg-slate-950 border-white/10 text-slate-100 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add secondary notes, instructions, or summaries..."
                className="bg-slate-950 border-white/10 text-slate-100 focus:border-blue-500 h-24 resize-none"
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
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Due Time</label>
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="bg-slate-950 border-white/10 text-slate-100"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              {isPrivileged && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reminder Type</label>
                  <select
                    value={reminderType}
                    onChange={(e) => setReminderType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                    disabled={loading}
                  >
                    <option value="personal">Personal</option>
                    <option value="task_assigned">Assign to Representative</option>
                  </select>
                </div>
              )}
            </div>

            {/* Conditional Assigned Representative Selection */}
            {reminderType === 'task_assigned' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assign Representative</label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                  disabled={loading}
                >
                  <option value="">-- Select Employee --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Related Entity fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Relate to Lead</label>
                <select
                  value={relatedLeadId}
                  onChange={(e) => setRelatedLeadId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                  disabled={loading}
                >
                  <option value="">-- Optional --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Relate to Customer</label>
                <select
                  value={relatedCustomerId}
                  onChange={(e) => setRelatedCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                  disabled={loading}
                >
                  <option value="">-- Optional --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {editingReminder && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                  disabled={loading}
                >
                  <option value="pending">Pending</option>
                  <option value="snoozed">Snoozed</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}

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
                {loading ? 'Saving...' : 'Save Reminder'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
