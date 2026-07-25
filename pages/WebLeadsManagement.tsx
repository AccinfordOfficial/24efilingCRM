// pages/WebLeadsManagement.tsx
import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/Toast';
import { Dialog } from '../components/ui/Dialog';
import { WebLead, User } from '../types';
import { 
  Search, Globe, MessageSquare, ArrowRightLeft, UserCheck, 
  ShieldAlert, MoreHorizontal, RotateCcw, User as UserIcon,
  Calendar, Clock
} from 'lucide-react';

interface WebLeadsManagementProps {
  webLeads: WebLead[];
  salesExecutives: User[];
  onAssignWebLead: (id: string, assignedToId: string | null) => Promise<void>;
  onUpdateWebLeadStatus: (id: string, status: WebLead['status']) => Promise<void>;
  onConvertWebLeadToCrmLead: (id: string, assignedToId: string | null) => Promise<void>;
}

export default function WebLeadsManagement({
  webLeads,
  salesExecutives,
  onAssignWebLead,
  onUpdateWebLeadStatus,
  onConvertWebLeadToCrmLead
}: WebLeadsManagementProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<WebLead['status']>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConverting, setIsConverting] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedLead, setSelectedLead] = useState<WebLead | null>(null);

  const filteredWebLeads = webLeads
    .filter(lead => lead.status === activeTab)
    .filter(lead => {
      const query = searchQuery.toLowerCase();
      return (
        lead.name.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        lead.phone.includes(query) ||
        (lead.service_interested || '').toLowerCase().includes(query)
      );
    })
    .filter(lead => {
      if (dateFilter === 'all') return true;
      const leadDate = new Date(lead.created_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === 'today') {
        const d = new Date(lead.created_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      }
      if (dateFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const d = new Date(lead.created_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === yesterday.getTime();
      }
      if (dateFilter === 'week') {
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        return leadDate >= lastWeek;
      }
      if (dateFilter === 'month') {
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return leadDate >= lastMonth;
      }
      if (dateFilter === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        let match = true;
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          match = match && leadDate >= start;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          match = match && leadDate <= end;
        }
        return match;
      }
      return true;
    });

  const handleConvert = async (leadId: string, assignedToId: string | null) => {
    setIsConverting(leadId);
    try {
      await onConvertWebLeadToCrmLead(leadId, assignedToId);
      toast.addToast('The website visitor has been successfully registered in the active leads pipeline.', 'success');
    } catch (e: any) {
      toast.addToast(e.message || 'An error occurred during lead conversion.', 'error');
    } finally {
      setIsConverting(null);
    }
  };

  const getStatusBadgeClass = (status: WebLead['status']) => {
    switch (status) {
      case 'Pending':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      case 'Contacted':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Converted':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Spam':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const activeSalesExecutives = salesExecutives.filter(u => u.is_active);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto text-white">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            <Globe className="h-6 w-6 text-indigo-400 animate-pulse" />
            Organic Website Leads
          </h1>
          <p className="text-sm text-slate-400 mt-1">Review contact inquiries captured from 24efiling.com and convert them instantly to trackable CRM pipeline leads.</p>
        </div>
      </div>

      {/* Tabs & Search Filter Block */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex border border-white/10 rounded-lg p-1 bg-slate-900/80 gap-1 self-start">
          {(['Pending', 'Contacted', 'Converted', 'Spam'] as const).map(tab => {
            const count = webLeads.filter(l => l.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setActiveMenuId(null); // close dropdown on tab switch
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === tab
                    ? 'bg-primary text-white shadow-sm border border-primary/50'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Advanced Date Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search inquiries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 bg-slate-900/80 text-white w-full border border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-primary placeholder-slate-500"
            />
          </div>

          {/* Date Filter Dropdown */}
          <div className="relative w-full sm:w-44">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="text-xs h-9 bg-slate-900/80 text-white w-full border border-white/10 rounded-md px-3 focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">📅 All Time</option>
              <option value="today" className="bg-slate-900 text-white">Today</option>
              <option value="yesterday" className="bg-slate-900 text-white">Yesterday</option>
              <option value="week" className="bg-slate-900 text-white">Last 7 Days</option>
              <option value="month" className="bg-slate-900 text-white">Last 30 Days</option>
              <option value="custom" className="bg-slate-900 text-white">Custom Range...</option>
            </select>
          </div>

          {/* Custom Date Range Picker */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs h-9 bg-slate-900/80 text-white border border-white/10 rounded-md px-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs h-9 bg-slate-900/80 text-white border border-white/10 rounded-md px-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* Table Card Grid */}
      <Card className="border border-white/10 shadow-xl bg-slate-900/80 backdrop-blur-md text-white overflow-visible">
        <CardContent className="p-0">
          {filteredWebLeads.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <MessageSquare className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="font-bold text-white">No Web Leads Found</p>
              <p className="text-xs text-slate-400 mt-1">There are no inquiries under this tab matching your search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[400px] rounded-t-xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider rounded-tl-xl">ID</th>
                    <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                    <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Service</th>
                    <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="py-4 px-6 text-right text-xs font-bold text-slate-400 uppercase tracking-wider rounded-tr-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredWebLeads.map((lead) => {
                    const idCode = `#LD-${lead.id.substring(0, 5).toUpperCase()}`;
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/75 transition-colors align-middle">
                        {/* ID Column */}
                        <td 
                          onClick={() => setSelectedLead(lead)}
                          className="py-4 px-6 font-semibold text-indigo-600 hover:underline cursor-pointer text-xs"
                        >
                          {idCode}
                        </td>
                        
                        {/* Customer Column */}
                        <td className="py-4 px-4">
                          <p className="font-bold text-white text-sm">{lead.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-medium">{lead.email}</p>
                        </td>
                        
                        {/* Service Column */}
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-slate-300 lowercase shadow-sm">
                            {lead.service_interested || 'general'}
                          </span>
                        </td>
                        
                        {/* Status Column */}
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        
                        {/* Date Column */}
                        <td className="py-4 px-4 text-xs font-bold text-slate-400">
                          {new Date(lead.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        
                        {/* Actions Column */}
                        <td className="py-4 px-6 text-right relative">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === lead.id ? null : lead.id)}
                            className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors inline-flex items-center justify-center h-8 w-8"
                          >
                            <MoreHorizontal className="h-4.5 w-4.5" />
                          </button>

                          {/* Float Dropdown Menu */}
                          {activeMenuId === lead.id && (
                            <>
                              {/* Backdrop layer to click away and close */}
                              <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                              
                              <div className="absolute right-6 mt-1 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 p-2 text-left text-xs text-white space-y-1.5 animate-fadeIn">
                                {/* Assignment Section */}
                                <div className="px-2 py-1.5 border-b border-white/5">
                                  <p className="font-extrabold text-[9px] text-slate-400 uppercase tracking-wider">Assign Executive</p>
                                  <div className="mt-1">
                                    <Select
                                      value={lead.assigned_to || ''}
                                      onChange={(e) => {
                                        onAssignWebLead(lead.id, e.target.value || null);
                                        setActiveMenuId(null);
                                      }}
                                      className="text-[11px] h-7 bg-slate-50 border border-slate-200 rounded-md w-full font-medium"
                                    >
                                      <option value="">Unassigned</option>
                                      {activeSalesExecutives.map(exec => (
                                        <option key={exec.id} value={exec.id}>{exec.name}</option>
                                      ))}
                                    </Select>
                                  </div>
                                </div>
                                
                                {/* CRM Operations */}
                                <div className="p-0.5 space-y-0.5">
                                  {lead.status !== 'Converted' ? (
                                    <button
                                      onClick={() => {
                                        handleConvert(lead.id, lead.assigned_to || null);
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors font-bold flex items-center gap-2"
                                      disabled={isConverting === lead.id}
                                    >
                                      <ArrowRightLeft className="h-3.5 w-3.5" />
                                      {isConverting === lead.id ? 'Converting...' : 'Convert to CRM'}
                                    </button>
                                  ) : (
                                    <div className="px-2.5 py-1.5 text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50/50 rounded-lg">
                                      <UserCheck className="h-4 w-4" /> Already Converted
                                    </div>
                                  )}

                                  {lead.status !== 'Pending' && (
                                    <button
                                      onClick={() => {
                                        onUpdateWebLeadStatus(lead.id, 'Pending');
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors font-bold flex items-center gap-2"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                                      Mark Pending
                                    </button>
                                  )}

                                  {lead.status !== 'Contacted' && lead.status !== 'Converted' && (
                                    <button
                                      onClick={() => {
                                        onUpdateWebLeadStatus(lead.id, 'Contacted');
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors font-bold flex items-center gap-2"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                                      Mark Contacted
                                    </button>
                                  )}

                                  {lead.status !== 'Spam' && lead.status !== 'Converted' && (
                                    <button
                                      onClick={() => {
                                        onUpdateWebLeadStatus(lead.id, 'Spam');
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors font-bold flex items-center gap-2 text-rose-600"
                                    >
                                      <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                                      Mark as Spam
                                    </button>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog Popup */}
      {selectedLead && (
        <Dialog
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          title={`Organic Lead Details - #LD-${selectedLead.id.substring(0, 5).toUpperCase()}`}
          description="Full contact inquiry details captured from 24efiling.com website forms"
          maxWidth="max-w-xl"
        >
          <div className="space-y-6 pt-4 text-xs text-slate-800">
            {/* Header / Info Grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Customer Name</p>
                <p className="text-sm font-extrabold text-slate-900 mt-1">{selectedLead.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</p>
                <div className="mt-1">
                  <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(selectedLead.status)}`}>
                    {selectedLead.status}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Address</p>
                <p className="font-bold text-slate-700 mt-1">{selectedLead.email}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mobile Number</p>
                <p className="font-bold text-slate-700 mt-1">{selectedLead.phone}</p>
              </div>
            </div>

            {/* Service & Time Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Service Interested</p>
                <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200 bg-white text-slate-700 lowercase shadow-sm mt-1.5">
                  {selectedLead.service_interested || 'general'}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Submission Date & Time</p>
                <div className="flex items-center gap-1.5 mt-1.5 font-bold text-slate-600">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                  {new Date(selectedLead.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                  <span className="text-slate-300">|</span>
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  {new Date(selectedLead.created_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
              </div>
            </div>

            {/* Message Inquiry Content */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Inquiry Message</p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs leading-relaxed font-medium text-slate-700 min-h-[80px]">
                {selectedLead.message || 'No inquiry message provided.'}
              </div>
            </div>

            {/* Assign Executive */}
            <div className="space-y-2 border-t pt-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lead Assignment</p>
              <div className="flex items-center gap-3">
                <Select
                  value={selectedLead.assigned_to || ''}
                  onChange={async (e) => {
                    const assignedToId = e.target.value || null;
                    await onAssignWebLead(selectedLead.id, assignedToId);
                    setSelectedLead(prev => prev ? { ...prev, assigned_to: assignedToId || undefined } : null);
                    toast.addToast('Successfully updated lead executive assignment.', 'success');
                  }}
                  className="text-xs h-9 bg-slate-50 border border-slate-200 rounded-md w-64 font-bold"
                >
                  <option value="">Unassigned</option>
                  {activeSalesExecutives.map(exec => (
                    <option key={exec.id} value={exec.id}>{exec.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Actions / Operations Block */}
            <div className="flex justify-end gap-3 border-t pt-5">
              {/* Mark Pending Button */}
              <button
                type="button"
                onClick={async () => {
                  await onUpdateWebLeadStatus(selectedLead.id, 'Pending');
                  setSelectedLead(prev => prev ? { ...prev, status: 'Pending' } : null);
                  toast.addToast('Inquiry marked as Pending.', 'success');
                }}
                disabled={selectedLead.status === 'Pending'}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
                  selectedLead.status === 'Pending'
                    ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                }`}
              >
                Mark Pending
              </button>

              {/* Mark Contacted Button */}
              <button
                type="button"
                onClick={async () => {
                  await onUpdateWebLeadStatus(selectedLead.id, 'Contacted');
                  setSelectedLead(prev => prev ? { ...prev, status: 'Contacted' } : null);
                  toast.addToast('Inquiry marked as Contacted.', 'success');
                }}
                disabled={selectedLead.status === 'Contacted' || selectedLead.status === 'Converted'}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
                  selectedLead.status === 'Contacted' || selectedLead.status === 'Converted'
                    ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                }`}
              >
                Contacted
              </button>

              {/* Convert to CRM Button */}
              <button
                type="button"
                onClick={async () => {
                  await handleConvert(selectedLead.id, selectedLead.assigned_to || null);
                  setSelectedLead(prev => prev ? { ...prev, status: 'Converted' } : null);
                }}
                disabled={selectedLead.status === 'Converted' || isConverting === selectedLead.id}
                className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all shadow-sm ${
                  selectedLead.status === 'Converted'
                    ? 'bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-[#1c398e] text-white hover:bg-[#1c398e]/90'
                }`}
              >
                {selectedLead.status === 'Converted' ? (
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-slate-400" /> Already Converted
                  </span>
                ) : isConverting === selectedLead.id ? (
                  'Converting...'
                ) : (
                  'Convert to CRM'
                )}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
