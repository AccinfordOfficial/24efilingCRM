import React, { useState, useMemo } from 'react';
import { City, Branch } from '../types';
import { Plus, Edit2, Trash2, MapPin, CheckCircle, XCircle, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { GlassCard } from '../components/ui/GlassCard';
import { StatCard } from '../components/ui/StatCard';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { useToast } from '../components/Toast';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];

interface CityManagementProps {
  cities: City[];
  branches?: Branch[];
  onAddCity: (cityName: string, stateName?: string, status?: boolean) => Promise<any>;
  onUpdateCity: (id: string, updates: Partial<City>) => Promise<void>;
  onDeleteCity: (id: string) => Promise<void>;
}

export default function CityManagement({
  cities = [],
  branches = [],
  onAddCity,
  onUpdateCity,
  onDeleteCity,
}: CityManagementProps) {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [cityToDelete, setCityToDelete] = useState<string | null>(null);

  // Form State
  const [cityName, setCityName] = useState('');
  const [stateName, setStateName] = useState('');
  const [status, setStatus] = useState(true);

  // Derive stats
  const stats = useMemo(() => {
    const total = cities.length;
    const active = cities.filter((c) => c.status).length;
    const uniqueStates = new Set(cities.map((c) => c.state).filter(Boolean)).size;
    return { total, active, uniqueStates };
  }, [cities]);

  // Filtered cities list
  const filteredCities = useMemo(() => {
    return cities.filter(
      (c) =>
        c.city_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.state || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.city_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [cities, searchTerm]);

  // Count branches in each city
  const getBranchCount = (cityId: string) => {
    return branches.filter((b) => b.city_id === cityId).length;
  };

  const handleOpenForm = (city?: City) => {
    if (city) {
      setEditingCity(city);
      setCityName(city.city_name);
      setStateName(city.state || '');
      setStatus(city.status);
    } else {
      setEditingCity(null);
      setCityName('');
      setStateName('');
      setStatus(true);
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName.trim()) {
      toast.addToast('City name is required', 'error');
      return;
    }

    try {
      if (editingCity) {
        await onUpdateCity(editingCity.id, {
          city_name: cityName.trim(),
          state: stateName || null,
          status,
        });
        toast.addToast('City updated successfully', 'success');
      } else {
        await onAddCity(cityName.trim(), stateName || undefined, status);
        toast.addToast('City created successfully', 'success');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      toast.addToast(err.message || 'Operation failed', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!cityToDelete) return;
    try {
      await onDeleteCity(cityToDelete);
      toast.addToast('City deleted successfully', 'success');
      setIsDeleteOpen(false);
      setCityToDelete(null);
    } catch (err: any) {
      toast.addToast(err.message || 'Failed to delete city', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-white">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            City Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage company operating cities and configure regional parameters.
          </p>
        </div>
        <Button
          onClick={() => handleOpenForm()}
          className="bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-2 neon-glow-primary border border-white/10"
        >
          <Plus className="h-4 w-4" /> Add City
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Cities" value={stats.total} icon={MapPin} />
        <StatCard title="Active Cities" value={stats.active} icon={CheckCircle} />
        <StatCard title="States Covered" value={stats.uniqueStates} icon={MapPin} />
      </div>

      {/* Cities list / search */}
      <GlassCard className="border border-white/5">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-center mb-6">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by city, code, state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder-slate-500 rounded-lg h-10 w-full"
            />
          </div>
          <div className="text-sm text-slate-400 w-full md:w-auto text-right">
            Showing {filteredCities.length} of {cities.length} cities
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">City Name</th>
                <th className="px-6 py-4">City Code</th>
                <th className="px-6 py-4">State</th>
                <th className="px-6 py-4 text-center">Branches</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredCities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No cities found. Create a new one to get started.
                  </td>
                </tr>
              ) : (
                filteredCities.map((city) => (
                  <tr key={city.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4 font-medium text-white">{city.city_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wider text-blue-300 bg-blue-500/10 border border-blue-500/20 shadow-sm whitespace-nowrap">
                        {city.city_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{city.state || 'N/A'}</td>
                    <td className="px-6 py-4 text-center text-slate-300">
                      {getBranchCount(city.id)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={async () => {
                          try {
                            await onUpdateCity(city.id, { status: !city.status });
                            toast.addToast(`City status updated`, 'success');
                          } catch (err: any) {
                            toast.addToast(err.message || 'Toggle failed', 'error');
                          }
                        }}
                        className="focus:outline-none"
                        title={city.status ? 'Deactivate City' : 'Activate City'}
                      >
                        {city.status ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenForm(city)}
                          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCityToDelete(city.id);
                            setIsDeleteOpen(true);
                          }}
                          className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Create / Edit City Modal */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setIsFormOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
            <GlassCard className="w-full border border-white/10 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              {editingCity ? 'Edit City' : 'Create City'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">City Name</label>
                <Input
                  type="text"
                  placeholder="e.g. Hyderabad"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  className="bg-slate-900 border-white/10 text-white placeholder-slate-600 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">State / Region</label>
                <select
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-white/10 bg-slate-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-slate-400">Select State...</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state} className="bg-slate-900 text-white">
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium text-slate-300">Active Status</span>
                <button
                  type="button"
                  onClick={() => setStatus(!status)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                    status ? 'bg-primary' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      status ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  className="border-white/10 hover:bg-white/5 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/95 text-white font-medium"
                >
                  {editingCity ? 'Save Changes' : 'Create'}
                </Button>
              </div>
            </form>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        title="Delete City"
        description="Are you sure you want to delete this city? This action will remove the city from the system. Ensure no active branches are linked to this city first."
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setIsDeleteOpen(false);
          setCityToDelete(null);
        }}
      />
    </div>
  );
}
