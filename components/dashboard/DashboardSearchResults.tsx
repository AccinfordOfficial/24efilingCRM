import React from 'react';
import { Customer, Lead } from '../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArrowUpRight, CreditCard, Phone, Search } from 'lucide-react';

export interface DashboardSearchResultsProps {
  searchTerm: string;
  results: {
    customers: Customer[];
    leads: Lead[];
  };
  onViewCustomer: (id: string) => void;
  onViewLead?: (id: string) => void;
  onClearSearch: () => void;
}

export const DashboardSearchResults: React.FC<DashboardSearchResultsProps> = ({
  searchTerm,
  results,
  onViewCustomer,
  onViewLead,
  onClearSearch,
}) => {
  const totalMatches = results.customers.length + results.leads.length;

  return (
      <div className="space-y-6 animate-in fade-in duration-500">
          <header className="flex items-center justify-between">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight text-white">Search Results</h1>
                  <p className="text-slate-400 mt-1">Found {totalMatches} matches for "{searchTerm}"</p>
              </div>
              <Button variant="ghost" onClick={onClearSearch} className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10">
                  <ArrowUpRight className="h-4 w-4 mr-2 rotate-180" /> Back to Dashboard
              </Button>
          </header>
          
          {results.customers.length > 0 && (
              <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">Customers ({results.customers.length})</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {results.customers.map(c => (
                          <Card key={c.id} className="glass-card border border-white/10 hover:border-primary/30 cursor-pointer transition-colors" onClick={() => onViewCustomer(c.id)}>
                              <CardHeader className="pb-2">
                                  <CardTitle className="flex justify-between text-white">
                                      {c.name}
                                      <span className="text-xs font-normal bg-white/5 text-slate-400 border border-white/10 px-2 py-1 rounded-full">
                                          {c.service_name}
                                      </span>
                                  </CardTitle>
                                  <CardDescription className="text-slate-400">{c.business_name}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                  <div className="text-sm text-slate-400 space-y-1">
                                      <p className="flex items-center gap-2"><CreditCard className="h-3 w-3 text-slate-500" /> {c.email}</p>
                                      <p className="flex items-center gap-2"><Phone className="h-3 w-3 text-slate-500" /> {c.phone}</p>
                                  </div>
                              </CardContent>
                          </Card>
                      ))}
                  </div>
              </div>
          )}
          
          {results.leads.length > 0 && (
              <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">Leads ({results.leads.length})</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {results.leads.map(l => (
                          <Card key={l.id} className="glass-card border border-white/10 hover:border-primary/30 cursor-pointer transition-colors" onClick={() => onViewLead && onViewLead(l.id)}>
                              <CardHeader className="pb-2">
                                  <CardTitle className="flex justify-between text-white">
                                      {l.first_name} {l.last_name}
                                      <span className="text-xs font-normal bg-white/5 text-slate-400 border border-white/10 px-2 py-1 rounded-full">
                                          {l.status}
                                      </span>
                                  </CardTitle>
                                  <CardDescription className="text-slate-400">{l.business_name}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                  <div className="text-sm text-slate-400 space-y-1">
                                      <p className="flex items-center gap-2"><CreditCard className="h-3 w-3 text-slate-500" /> {l.email}</p>
                                      <p className="flex items-center gap-2"><Phone className="h-3 w-3 text-slate-500" /> {l.phone_number}</p>
                                  </div>
                              </CardContent>
                          </Card>
                      ))}
                  </div>
              </div>
          )}

          {totalMatches === 0 && (
              <div className="text-center py-12 bg-slate-900/40 rounded-lg border border-dashed border-white/10">
                  <Search className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-500">No customers or leads found matching your criteria.</p>
              </div>
          )}
      </div>
  );
};
