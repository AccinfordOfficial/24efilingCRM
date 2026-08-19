import React, { useState, useMemo } from 'react';
import { Offer, Service, Lead } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { TagIcon, PlusIcon, PercentIcon, CalendarIcon, UsersIcon, CheckCircle2Icon, XCircleIcon, BarChart3Icon, GiftIcon, Trash2Icon, Edit3Icon, AlertTriangleIcon, LayersIcon, SearchIcon, FilterIcon } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, subWeeks, subMonths, format } from 'date-fns';
import { useToast } from '../components/Toast';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';

interface OffersManagementProps {
  offers: Offer[];
  services: Service[];
  onAddOffer: (offer: Omit<Offer, 'id' | 'created_at' | 'usage_count'>) => Promise<void>;
  onUpdateOffer: (id: string, updates: Partial<Offer>) => Promise<void>;
  onDeleteOffer: (id: string) => Promise<void>;
}

export default function OffersManagement({ offers, services, onAddOffer, onUpdateOffer, onDeleteOffer }: OffersManagementProps) {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('percentage');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offerType, setOfferType] = useState<Offer['offer_type']>('festival');
  const [maxUsage, setMaxUsage] = useState<number | ''>('');
  const [serviceId, setServiceId] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<'created_at' | 'end_date' | 'start_date'>('created_at');
  const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expired' | 'Upcoming'>('All');
  const [offerTypeFilter, setOfferTypeFilter] = useState<'All' | Offer['offer_type']>('All');

  const setPresetDateRange = (preset: string) => {
    const today = new Date();
    let start = '';
    let end = '';

    switch (preset) {
      case 'today':
        start = format(today, 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'yesterday': {
        const yesterday = subDays(today, 1);
        start = format(yesterday, 'yyyy-MM-dd');
        end = format(yesterday, 'yyyy-MM-dd');
        break;
      }
      case 'this_week':
        start = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'last_week': {
        const lastWeek = subWeeks(today, 1);
        start = format(startOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        end = format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      }
      case 'this_month':
        start = format(startOfMonth(today), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'last_month': {
        const lastMonth = subMonths(today, 1);
        start = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        end = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        break;
      }
      case 'this_quarter':
        start = format(startOfQuarter(today), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'this_year':
        start = format(startOfYear(today), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'clear':
        start = '';
        end = '';
        break;
    }
    setDateRange({ start, end });
  };

  const filteredOffers = useMemo(() => {
    return offers.filter(offer => {
      // 1. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = offer.name.toLowerCase().includes(query);
        const matchesCode = offer.promo_code.toLowerCase().includes(query);
        if (!matchesName && !matchesCode) return false;
      }

      // 2. Offer Type Filter
      if (offerTypeFilter !== 'All' && offer.offer_type !== offerTypeFilter) return false;

      // 3. Status Filter (Active, Expired, Upcoming)
      const todayDateStr = new Date().toISOString().split('T')[0];
      const isExpired = todayDateStr > offer.end_date;
      const isUpcoming = todayDateStr < offer.start_date;
      const isActive = offer.status === 'active' && !isExpired && !isUpcoming;
      
      if (statusFilter === 'Active' && !isActive) return false;
      if (statusFilter === 'Expired' && !isExpired) return false;
      if (statusFilter === 'Upcoming' && !isUpcoming) return false;

      // 4. Date Range Filter
      if (dateRange.start || dateRange.end) {
        const dateToCompare = dateFilterType === 'created_at' 
                                ? (offer.created_at ? offer.created_at.split('T')[0] : '') 
                                : dateFilterType === 'start_date' ? offer.start_date : offer.end_date;
        if (!dateToCompare) return false;

        if (dateRange.start && dateToCompare < dateRange.start) return false;
        if (dateRange.end && dateToCompare > dateRange.end) return false;
      }

      return true;
    });
  }, [offers, searchQuery, offerTypeFilter, statusFilter, dateRange, dateFilterType]);

  // Stats calculation
  const stats = useMemo(() => {
    const todayDateStr = new Date().toISOString().split('T')[0];
    const activeCount = filteredOffers.filter(o => o.status === 'active' && todayDateStr <= o.end_date && todayDateStr >= o.start_date).length;
    const totalUsage = filteredOffers.reduce((acc, o) => acc + (o.usage_count || 0), 0);
    
    // Sort offers by usage to find the most popular
    const sortedByUsage = [...filteredOffers].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
    const mostPopular = sortedByUsage.length > 0 && sortedByUsage[0].usage_count > 0 ? sortedByUsage[0] : null;

    // Estimate total discount given
    const totalDiscountEstimate = filteredOffers.reduce((acc, o) => {
      // Estimated average discount of ₹500 if percentage, or exact if fixed
      const multiplier = o.discount_type === 'fixed' ? o.discount_value : 500;
      return acc + (o.usage_count * multiplier);
    }, 0);

    return {
      activeCount,
      totalUsage,
      mostPopular,
      totalDiscountEstimate
    };
  }, [filteredOffers]);

  const activeServices = useMemo(() => (services || []).filter(s => s.is_active), [services]);

  const handleOpenCreateModal = () => {
    setEditingOffer(null);
    setName('');
    setPromoCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 30 days default
    setOfferType('festival');
    setMaxUsage('');
    setServiceId('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (offer: Offer) => {
    setEditingOffer(offer);
    setName(offer.name);
    setPromoCode(offer.promo_code);
    setDiscountType(offer.discount_type);
    setDiscountValue(offer.discount_value);
    setStartDate(offer.start_date);
    setEndDate(offer.end_date);
    setOfferType(offer.offer_type);
    setMaxUsage(offer.max_usage || '');
    setServiceId(offer.service_id || '');
    setStatus(offer.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !promoCode || discountValue === '' || !startDate || !endDate) {
      toast.addToast("Please fill in all required fields.", "error");
      return;
    }

    if (discountType === 'percentage' && (Number(discountValue) <= 0 || Number(discountValue) > 100)) {
      toast.addToast("Percentage discount must be between 1% and 100%.", "error");
      return;
    }

    if (discountType === 'fixed' && Number(discountValue) <= 0) {
      toast.addToast("Discount value must be greater than zero.", "error");
      return;
    }

    if (startDate > endDate) {
      toast.addToast("Start Date cannot be later than End Date.", "error");
      return;
    }

    setIsSubmitting(true);
    const offerPayload = {
      name,
      promo_code: promoCode.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue),
      start_date: startDate,
      end_date: endDate,
      status,
      max_usage: maxUsage === '' ? undefined : Number(maxUsage),
      service_id: serviceId || undefined,
      offer_type: offerType,
    };

    try {
      if (editingOffer) {
        await onUpdateOffer(editingOffer.id, offerPayload);
        toast.addToast(`Promo offer "${name}" updated successfully!`, "success");
      } else {
        await onAddOffer(offerPayload);
        toast.addToast(`Promo offer "${name}" created successfully!`, "success");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.addToast(`Error: ${err.message || 'Operation failed'}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (offer: Offer) => {
    setOfferToDelete(offer);
  };

  const handleConfirmDelete = async () => {
    if (!offerToDelete) return;
    try {
      await onDeleteOffer(offerToDelete.id);
      toast.addToast(`Promo offer deleted successfully.`, "success");
    } catch (err: any) {
      toast.addToast(`Error: ${err.message}`, "error");
    } finally {
      setOfferToDelete(null);
    }
  };

  const handleToggleStatus = async (offer: Offer) => {
    const newStatus = offer.status === 'active' ? 'inactive' : 'active';
    try {
      await onUpdateOffer(offer.id, { status: newStatus });
      toast.addToast(`Offer status updated to ${newStatus}.`, "info");
    } catch (err: any) {
      toast.addToast(`Error updating status: ${err.message}`, "error");
    }
  };

  const getBadgeStyleForType = (type: Offer['offer_type']) => {
    switch (type) {
      case 'festival':
        return 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border-orange-200';
      case 'referral':
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200';
      case 'first-customer':
        return 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200';
      case 'combo':
        return 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getServiceName = (id?: string) => {
    if (!id) return 'All Services';
    const srv = services.find(s => s.id === id);
    return srv ? srv.name : 'Unknown Service';
  };

  return (
    <div className="space-y-6">
      {/* Header section with Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Offers & Coupons</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Create, manage, and analyze promotional discount campaigns.</p>
        </div>
        <Button onClick={handleOpenCreateModal} className="gap-2 bg-primary text-primary-foreground hover:opacity-90 font-bold transition-all shadow-md">
          <PlusIcon className="w-4 h-4" /> Create Offer
        </Button>
      </div>

      {/* Filters & Search Header */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="relative w-full xl:w-96">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search campaigns by name or code..."
            className="pl-8 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-100 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 gap-2 shrink-0 shadow-sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FilterIcon className="w-4 h-4" /> Filters {showFilters ? '(Active)' : ''}
        </Button>
      </div>

      {showFilters && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl animate-in fade-in slide-in-from-top-2 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Offer Type</label>
              <Select value={offerTypeFilter} onChange={(e) => setOfferTypeFilter(e.target.value as any)} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 dark:text-white h-9">
                <option value="All" className="bg-slate-950 text-white">All Types</option>
                <option value="festival" className="bg-slate-950 text-white">Festival</option>
                <option value="referral" className="bg-slate-950 text-white">Referral</option>
                <option value="first-customer" className="bg-slate-950 text-white">New Customer</option>
                <option value="combo" className="bg-slate-950 text-white">Combo Pack</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</label>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 dark:text-white h-9">
                <option value="All" className="bg-slate-950 text-white">All Statuses</option>
                <option value="Active" className="bg-slate-950 text-white">Active Currently</option>
                <option value="Upcoming" className="bg-slate-950 text-white">Upcoming</option>
                <option value="Expired" className="bg-slate-950 text-white">Expired</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Date Applied To</label>
              <Select value={dateFilterType} onChange={(e) => setDateFilterType(e.target.value as any)} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 dark:text-white h-9">
                <option value="created_at" className="bg-slate-950 text-white">Creation Date</option>
                <option value="start_date" className="bg-slate-950 text-white">Start Date</option>
                <option value="end_date" className="bg-slate-950 text-white">Expiry Date</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Custom Range</label>
              <div className="flex gap-2">
                <Input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 dark:text-white text-xs w-full h-9" />
                <Input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 dark:text-white text-xs w-full h-9" />
              </div>
            </div>

          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mr-2 flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> Quick:</span>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10" onClick={() => setPresetDateRange('today')}>Today</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10" onClick={() => setPresetDateRange('yesterday')}>Yesterday</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10" onClick={() => setPresetDateRange('this_week')}>This Week</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10" onClick={() => setPresetDateRange('last_week')}>Last Week</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10" onClick={() => setPresetDateRange('this_month')}>This Month</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10" onClick={() => setPresetDateRange('last_month')}>Last Month</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10" onClick={() => setPresetDateRange('this_quarter')}>This Quarter</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10" onClick={() => setPresetDateRange('this_year')}>This Year</Button>
            
            <div className="ml-auto">
              <Button variant="ghost" size="sm" className="h-7 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => {
                setSearchQuery('');
                setOfferTypeFilter('All');
                setStatusFilter('All');
                setPresetDateRange('clear');
              }}>
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Metric Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Campaigns</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{stats.activeCount}</h3>
            </div>
            <div className="h-10 w-10 shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
              <TagIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Coupon Uses</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{stats.totalUsage}</h3>
            </div>
            <div className="h-10 w-10 shrink-0 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
              <UsersIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estimated Savings Disbursed</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">₹{stats.totalDiscountEstimate.toLocaleString('en-IN')}</h3>
            </div>
            <div className="h-10 w-10 shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
              <GiftIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Most Popular Coupon</p>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate" title={stats.mostPopular ? stats.mostPopular.promo_code : 'N/A'}>
                {stats.mostPopular ? `${stats.mostPopular.promo_code} (${stats.mostPopular.usage_count} uses)` : 'None yet'}
              </h3>
            </div>
            <div className="h-10 w-10 shrink-0 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center">
              <BarChart3Icon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Campaign List Card */}
      <Card className="shadow-sm border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
          <CardTitle className="text-lg text-slate-900 dark:text-white">Coupon Campaigns</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">View, edit, or toggle campaign statuses. Expired campaigns are deactivated automatically.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOffers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <GiftIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-medium text-slate-600 dark:text-slate-300">No campaigns found.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Try adjusting your search query or calendar filters, or click "Create Offer" to configure a new campaign.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-white/5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Campaign & Code</th>
                    <th className="py-3.5 px-4 text-center">Type</th>
                    <th className="py-3.5 px-4 text-right">Discount</th>
                    <th className="py-3.5 px-4">Applies To</th>
                    <th className="py-3.5 px-4">Validity Range</th>
                    <th className="py-3.5 px-4 text-center">Usage Count</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                  {filteredOffers.map(offer => {
                    const todayDateStr = new Date().toISOString().split('T')[0];
                    const isExpired = todayDateStr > offer.end_date;
                    const isUpcoming = todayDateStr < offer.start_date;
                    const isLimitReached = offer.max_usage !== undefined && offer.max_usage !== null && offer.usage_count >= offer.max_usage;

                    return (
                      <tr key={offer.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-4 px-5">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{offer.name}</span>
                            <span className="block font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded px-1.5 py-0.5 mt-1 w-max">
                              {offer.promo_code}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex border px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide capitalize shadow-xs ${getBadgeStyleForType(offer.offer_type)}`}>
                            {offer.offer_type.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-slate-800 dark:text-slate-200">
                          {offer.discount_type === 'percentage' ? (
                            <span className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                              {offer.discount_value}% Off <PercentIcon className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              ₹{offer.discount_value.toLocaleString('en-IN')} Off
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <LayersIcon className="w-3.5 h-3.5 text-slate-400" />
                            {getServiceName(offer.service_id)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{offer.start_date}</span>
                            <span className="text-slate-300 dark:text-slate-600">to</span>
                            <span className={isExpired ? 'text-red-500 font-semibold' : ''}>{offer.end_date}</span>
                          </div>
                          {isExpired && <span className="block text-[10px] text-red-500 font-bold mt-0.5">Expired</span>}
                        </td>
                        <td className="py-4 px-4 text-center font-medium">
                          <div className="space-y-0.5">
                            <span className="text-slate-800 dark:text-slate-200">{offer.usage_count}</span>
                            {offer.max_usage ? (
                              <span className="block text-[10px] text-slate-400 dark:text-slate-500">Limit: {offer.max_usage}</span>
                            ) : (
                              <span className="block text-[10px] text-slate-400 dark:text-slate-500">Unlimited</span>
                            )}
                          </div>
                          {isLimitReached && <span className="block text-[10px] text-red-500 font-bold mt-0.5">Limit Reached</span>}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(offer)}
                            className="focus:outline-none transition-transform hover:scale-105"
                            title={`Click to toggle status (Currently: ${offer.status})`}
                          >
                            {offer.status === 'active' && !isExpired && !isUpcoming && !isLimitReached ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full px-2 py-0.5 shadow-sm">
                                <CheckCircle2Icon className="w-3 h-3 text-emerald-600" /> Active
                              </span>
                            ) : isUpcoming ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-full px-2 py-0.5 shadow-sm">
                                <CalendarIcon className="w-3 h-3 text-blue-600" /> Upcoming
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 shadow-sm">
                                <XCircleIcon className="w-3 h-3 text-slate-500" /> Inactive
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditModal(offer)}
                              className="h-8 w-8 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-white/5"
                              title="Edit Offer"
                            >
                              <Edit3Icon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(offer)}
                              className="h-8 w-8 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              title="Delete Offer"
                            >
                              <Trash2Icon className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Create / Edit Campaign Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg my-8">
            <Card className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
              <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4 bg-slate-50/50 dark:bg-white/5 rounded-t-xl">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <GiftIcon className="w-5 h-5 text-primary" />
                  {editingOffer ? 'Edit Coupon Campaign' : 'Launch New Campaign'}
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">Configure promotional rules, discount rates, and validity windows.</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar text-slate-900 dark:text-white">
                {/* Campaign Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Campaign Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Diwali Super Savings"
                    required
                  />
                </div>

                {/* Promo Code & Offer Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Promo Code *</label>
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="e.g. FESTIVAL50"
                      className="uppercase font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Offer Type *</label>
                    <Select value={offerType} onChange={(e) => setOfferType(e.target.value as any)}>
                      <option value="festival">Festival Offer</option>
                      <option value="referral">Referral Code</option>
                      <option value="first-customer">New Customer</option>
                      <option value="combo">Combo Pack Discount</option>
                    </Select>
                  </div>
                </div>

                {/* Discount Configuration */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-white/10">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Discount Type *</label>
                    <Select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Flat (₹)</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {discountType === 'percentage' ? 'Percentage Rate (%) *' : 'Flat Amount (₹) *'}
                    </label>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder={discountType === 'percentage' ? 'e.g. 15' : 'e.g. 500'}
                      min="1"
                      required
                    />
                  </div>
                </div>

                {/* Service Assignment & Limit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Service</label>
                    <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                      <option value="">Store-wide (All Services)</option>
                      {activeServices.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Uses Cap</label>
                    <Input
                      type="number"
                      value={maxUsage}
                      onChange={(e) => setMaxUsage(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Unlimited if empty"
                      min="1"
                    />
                  </div>
                </div>

                {/* Validity Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> Start Date *
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> End Date *
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Status Switch */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Campaign Status</label>
                  <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                    <option value="active">Active (Launch Immediately)</option>
                    <option value="inactive">Inactive (Draft/Hold)</option>
                  </Select>
                </div>
              </CardContent>

              {/* Form Footers */}
              <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-white/5 p-4 bg-slate-50/50 dark:bg-white/5 rounded-b-xl">
                <Button type="button" variant="outline" className="border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold">
                  {isSubmitting ? 'Saving...' : editingOffer ? 'Save Changes' : 'Launch Campaign'}
                </Button>
              </div>
            </form>
          </Card>
          </div>
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!offerToDelete}
        onClose={() => setOfferToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Offer?"
        description={`Are you sure you want to delete the offer "${offerToDelete?.name}" (${offerToDelete?.promo_code})? This action cannot be undone.`}
        confirmButtonText="Yes, Delete Offer"
        cancelButtonText="Cancel"
      />
    </div>
  );
}
