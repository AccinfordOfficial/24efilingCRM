import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Lead, User, Service, Offer } from '../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { PlusCircleIcon, MoreVerticalIcon, ChevronDown, Trash2Icon, SearchIcon, TargetIcon } from './icons';
import { getStatusColor, getPriorityColor, LEAD_STATUSES, LEAD_PRIORITIES, SERVICE_OPTIONS } from '../constants';
import { LeadForm } from './LeadForm';
import { ConfirmationDialog } from './ui/ConfirmationDialog';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { getScoreCategory } from '../lib/scoring';
import { usePagination } from '../hooks/usePagination';
import { useToast } from './Toast';


interface LeadTableProps {
  leads: Lead[];
  users: User[];
  services: Service[];
  offers?: Offer[];
  onAddLead: () => void;
  onUpdateLead: (lead: Lead) => void;
  onUpdateMultipleLeads: (leadIds: string[], updates: Partial<Omit<Lead, 'id'>>) => void;
  onDeleteMultipleLeads: (leadIds: string[]) => void;
  onViewLead?: (leadId: string) => void;
  title?: string;
  description?: string;
  showFilters?: boolean;
  showAddButton?: boolean;
  currentUser: User;
}

const BulkActionDropdown: React.FC<{
  buttonLabel: string;
  items: { value: string; label: string }[];
  onSelect: (value: string) => void;
  title?: string;
}> = ({ buttonLabel, items, onSelect, title }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    onSelect(value);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1">
        {buttonLabel}
        <ChevronDown className="h-4 w-4" />
      </Button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 origin-top-right rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {title && <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{title}</div>}
            {items.map(item => (
              <button
                key={item.value}
                onClick={() => handleSelect(item.value)}
                className="w-full text-left block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  users,
  services, // Destructure services
  offers = [],
  onAddLead,
  onUpdateLead,
  onUpdateMultipleLeads,
  onDeleteMultipleLeads,
  onViewLead,
  title = "Leads",
  description = "Manage and track all customer leads.",
  showFilters = true,
  showAddButton = true,
  currentUser,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Filtering and Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'created_at', direction: 'descending' });

  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Derive active sales executives from users prop
  const salesExecutives = useMemo(() => users.filter(u => u.is_active), [users]);


  const handleRequestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const processedLeads = useMemo(() => {
    const sortableLeads = leads.filter(lead => {
      const statusMatch = statusFilter === 'All' || lead.status === statusFilter;
      const priorityMatch = priorityFilter === 'All' || lead.priority === priorityFilter;
      const assigneeMatch = assigneeFilter === 'All'
        ? true
        : assigneeFilter === 'Unassigned'
          ? !lead.assigned_to
          : lead.assigned_to?.id === assigneeFilter;
      const serviceMatch = serviceFilter === 'All' || (lead.service_requested && lead.service_requested.includes(serviceFilter));

      const searchMatch = !searchQuery ||
        (lead.business_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.reference_number && lead.reference_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase());

      return statusMatch && priorityMatch && assigneeMatch && searchMatch && serviceMatch;
    });

    if (sortConfig !== null) {
      sortableLeads.sort((a, b) => {
        const getNestedValue = (obj: any, path: string): any => {
          if (!path) return obj;
          return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
        };

        const aValue = getNestedValue(a, sortConfig.key);
        const bValue = getNestedValue(b, sortConfig.key);

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableLeads;
  }, [leads, searchQuery, sortConfig, statusFilter, priorityFilter, assigneeFilter, serviceFilter]);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const isIndeterminate = selectedLeadIds.length > 0 && selectedLeadIds.length < processedLeads.length;
      selectAllCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [selectedLeadIds, processedLeads.length]);

  const { currentData: paginatedLeads, next, prev, jump, currentPage, maxPage } = usePagination(processedLeads, 20);

  const assignableUsers = useMemo(() => users.filter(u => u.role === 'Sales Executive' || u.role === 'Admin'), [users]);

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsFormOpen(true);
  };

  const handleSave = (leadData: Lead | Omit<Lead, 'id' | 'created_at' | 'last_contacted'>) => {
    if ('id' in leadData) {
      onUpdateLead(leadData);
    }
    setIsFormOpen(false);
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(processedLeads.map(lead => lead.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectOne = (leadId: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleBulkStatusChange = (newStatus: string) => {
    onUpdateMultipleLeads(selectedLeadIds, { status: newStatus as Lead['status'] });
    setSelectedLeadIds([]);
  };

  const handleBulkPriorityChange = (newPriority: string) => {
    onUpdateMultipleLeads(selectedLeadIds, { priority: newPriority as Lead['priority'] });
    setSelectedLeadIds([]);
  };

  const handleBulkAssigneeChange = (userId: string) => {
    const newAssignee = users.find(u => u.id === userId);
    if (!newAssignee) return;
    onUpdateMultipleLeads(selectedLeadIds, { assigned_to: newAssignee });
    setSelectedLeadIds([]);
  };

  const toast = useToast();

  const handleConfirmDelete = async () => {
    try {
      await onDeleteMultipleLeads(selectedLeadIds);
      toast.addToast(`${selectedLeadIds.length} lead(s) deleted successfully`, 'success');
      setSelectedLeadIds([]);
    } catch (err: any) {
      toast.addToast(`Failed to delete lead: ${err.message || 'Permission denied'}`, 'error');
    } finally {
      setIsDeleteConfirmOpen(false);
    }
  };

  const statusOptions = LEAD_STATUSES.map(status => ({ value: status, label: status }));
  const priorityOptions = LEAD_PRIORITIES.map(priority => ({ value: priority, label: priority }));
  const userOptions = assignableUsers.map(user => ({ value: user.id, label: user.name }));

  const SortIndicator: React.FC<{
    columnKey: string;
    sortConfig: { key: string; direction: string; } | null;
  }> = ({ columnKey, sortConfig }) => {
    if (sortConfig?.key !== columnKey) {
      return <ChevronDown className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />;
    }
    return (
      <ChevronDown
        className={`h-4 w-4 transition-transform duration-200 ${sortConfig.direction === 'ascending' ? 'transform rotate-180' : ''}`}
      />
    );
  };

  return (
    <>
      <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-sm">
        <CardHeader>
          {selectedLeadIds.length > 0 ? (
            <div className="flex w-full items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected</span>
              <div className="flex items-center gap-2">
                <BulkActionDropdown buttonLabel="Change Status" items={statusOptions} onSelect={handleBulkStatusChange} title="Set new status" />
                <BulkActionDropdown buttonLabel="Change Priority" items={priorityOptions} onSelect={handleBulkPriorityChange} title="Set new priority" />
                <BulkActionDropdown buttonLabel="Assign To" items={userOptions} onSelect={handleBulkAssigneeChange} title="Assign to user" />
                <Button variant="destructive" size="sm" onClick={() => setIsDeleteConfirmOpen(true)}>
                  <Trash2Icon className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedLeadIds([])}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="dark:text-white">{title}</CardTitle>
                <CardDescription className="dark:text-slate-400">{description}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 w-full md:w-auto">
                {showFilters && (
                  <>
                    <div className="relative flex-grow md:flex-grow-0">
                      <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <Input
                        type="search"
                        placeholder="Search..."
                        className="pl-8 w-full sm:w-[150px] lg:w-[200px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                      <option value="All" className="bg-slate-950 text-white">All Statuses</option>
                      {LEAD_STATUSES.map(status => <option key={status} value={status} className="bg-slate-950 text-white">{status}</option>)}
                    </Select>
                    <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="w-auto bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                      <option value="All" className="bg-slate-950 text-white">All Priorities</option>
                      {LEAD_PRIORITIES.map(priority => <option key={priority} value={priority} className="bg-slate-950 text-white">{priority}</option>)}
                    </Select>
                    <Select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="w-auto bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                      <option value="All" className="bg-slate-950 text-white">All Services</option>
                      {Object.values(SERVICE_OPTIONS).flat().map(service => <option key={service} value={service} className="bg-slate-950 text-white">{service}</option>)}
                    </Select>
                    <Select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="w-auto bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                      <option value="All" className="bg-slate-950 text-white">All Users</option>
                      <option value="Unassigned" className="bg-slate-950 text-white">Unassigned</option>
                      {salesExecutives.map(user => <option key={user.id} value={user.id} className="bg-slate-950 text-white">{user.name}</option>)}
                    </Select>
                  </>
                )}
                {showAddButton && (
                  <Button size="sm" className="gap-1 bg-primary text-primary-foreground hover:opacity-90 font-bold" onClick={onAddLead}>
                    <PlusCircleIcon className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add Lead</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto max-h-[75vh] border border-slate-200 dark:border-white/10 rounded-md">
            <table className="w-full text-sm text-left text-slate-700 dark:text-slate-200">
              <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th scope="col" className="p-4 md:px-6">
                    <input
                      type="checkbox"
                      ref={selectAllCheckboxRef}
                      checked={selectedLeadIds.length === processedLeads.length && processedLeads.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3 md:px-6 text-left font-medium">
                    <button onClick={() => handleRequestSort('business_name')} className="flex items-center justify-between w-full group" aria-label="Sort by Business Name">
                      Business Name
                      <SortIndicator columnKey="business_name" sortConfig={sortConfig} />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 md:px-6 text-left font-medium">
                    <button onClick={() => handleRequestSort('status')} className="flex items-center justify-between w-full group" aria-label="Sort by Status">
                      Status
                      <SortIndicator columnKey="status" sortConfig={sortConfig} />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 md:px-6 text-left font-medium">
                    <button onClick={() => handleRequestSort('score')} className="flex items-center justify-between w-full group" aria-label="Sort by Score">
                      Score
                      <SortIndicator columnKey="score" sortConfig={sortConfig} />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 md:px-6 hidden md:table-cell text-left font-medium">
                    <button onClick={() => handleRequestSort('service_requested')} className="flex items-center justify-between w-full group" aria-label="Sort by Service">
                      Service
                      <SortIndicator columnKey="service_requested" sortConfig={sortConfig} />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 md:px-6 hidden lg:table-cell text-left font-medium">
                    <button onClick={() => handleRequestSort('assigned_to.name')} className="flex items-center justify-between w-full group" aria-label="Sort by Assigned To">
                      Assigned To
                      <SortIndicator columnKey="assigned_to.name" sortConfig={sortConfig} />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 md:px-6 hidden lg:table-cell text-left font-medium">
                    <button onClick={() => handleRequestSort('created_at')} className="flex items-center justify-between w-full group" aria-label="Sort by Created date">
                      Created By
                      <SortIndicator columnKey="created_at" sortConfig={sortConfig} />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 md:px-6 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.map((lead) => {
                  const scoreInfo = getScoreCategory(lead.score || 0);
                  return (
                    <tr
                      key={lead.id}
                      onClick={onViewLead ? () => onViewLead(lead.id) : undefined}
                      className={`border-b border-slate-100 dark:border-white/5 ${onViewLead ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''} ${selectedLeadIds.includes(lead.id) ? 'bg-blue-50/50 dark:bg-blue-950/30' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors'}`}
                    >
                      <td className="p-4 md:px-6" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => handleSelectOne(lead.id)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-background dark:bg-slate-900 text-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4 md:px-6 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          {lead.avatar_url ? (
                            <img src={lead.avatar_url} alt={lead.business_name || 'Lead'} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                              {(lead.business_name || lead.first_name || 'L').charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">{lead.business_name || 'No Business Name'}</span>
                            {lead.reference_number && (
                              <span className="ml-2 inline-block text-[10px] font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-1 py-0.25 rounded">
                                {lead.reference_number}
                              </span>
                            )}
                            <div className="text-xs text-slate-500 dark:text-slate-400">{lead.first_name} {lead.last_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${scoreInfo.color} ${scoreInfo.textColor}`}>
                          <TargetIcon className="h-3 w-3" />
                          {lead.score}
                        </span>
                      </td>
                      <td className="px-4 py-4 md:px-6 hidden md:table-cell text-slate-600 dark:text-slate-300 max-w-xs truncate" title={lead.service_requested}>
                        {lead.service_requested}
                      </td>
                      <td className="px-4 py-4 md:px-6 hidden lg:table-cell text-slate-600 dark:text-slate-300">
                        {(() => {
                          const assignedUser = typeof lead.assigned_to === 'object' && lead.assigned_to !== null 
                            ? lead.assigned_to 
                            : users.find(u => u.id === (lead.assigned_to as unknown as string));
                          const createdId = typeof lead.created_by === 'object' && lead.created_by !== null 
                            ? (lead.created_by as any).id 
                            : lead.created_by;

                          return assignedUser ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <img src={assignedUser.avatar_url} alt={assignedUser.name} className="w-6 h-6 rounded-full" />
                                <span className="text-sm text-slate-700 dark:text-slate-200">{assignedUser.name}</span>
                              </div>
                              {lead.assigned_at && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-8">
                                  {new Date(lead.assigned_at).toLocaleDateString()}
                                </span>
                              )}
                              {createdId === currentUser.id && assignedUser.id !== currentUser.id && (
                                <span className="text-[10px] text-primary font-medium ml-8">
                                  Shared (Owned by you)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">Unassigned</span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-4 md:px-6 hidden lg:table-cell text-slate-600 dark:text-slate-300">
                        {(() => {
                          const creator = users.find(u => u.id === lead.created_by);
                          return creator ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                {creator.avatar_url ? (
                                  <img src={creator.avatar_url} alt={creator.name} className="w-6 h-6 rounded-full" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                    {creator.name.charAt(0)}
                                  </div>
                                )}
                                <span className="text-sm text-slate-700 dark:text-slate-200">{creator.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-8">
                                {timeAgo(lead.created_at)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400 text-sm">
                              Unknown <br />
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">{timeAgo(lead.created_at)}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-4 md:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Edit Lead" onClick={() => handleEdit(lead)}>
                            <MoreVerticalIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Delete Lead"
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            onClick={() => {
                              setSelectedLeadIds([lead.id]);
                              setIsDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 dark:border-white/10">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong>{(currentPage - 1) * 20 + 1}</strong> to <strong>{Math.min(currentPage * 20, processedLeads.length)}</strong> of <strong>{processedLeads.length}</strong> leads
          </div>
          {maxPage > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prev} disabled={currentPage === 1}>
                Previous
              </Button>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 px-2">
                Page {currentPage} of {maxPage}
              </div>
              <Button variant="outline" size="sm" onClick={next} disabled={currentPage === maxPage}>
                Next
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      <LeadForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        lead={selectedLead}
        users={users}
        currentUser={currentUser}
        services={services}
        offers={offers}
      />

      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`Delete ${selectedLeadIds.length} Lead${selectedLeadIds.length > 1 ? 's' : ''}`}
        description="Are you sure you want to permanently delete the selected leads? This action cannot be undone."
        confirmButtonText="Yes, Delete"
      />
    </>
  );
};