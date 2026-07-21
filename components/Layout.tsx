import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalFilterBar } from './ui/GlobalFilterBar';
import { useAuth } from '../context/AuthContext';
import { GlobalSearch } from './GlobalSearch';
import { QuickAddLead } from './QuickAddLead';
import { PlusIcon } from './icons';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const location = useLocation();
  const { profile } = useAuth();
  
  const showFilterBar = ['/', '/leads', '/customers', '/payments', '/reports', '/activity', '/users', '/web/leads', '/my-leads'].includes(location.pathname);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle search on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        return;
      }

      // Quick add lead on 'N' key if not typing in an input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
      if (!isInput && (e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-slate-950/15 text-slate-100 overflow-hidden font-sans relative">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header 
          onMenuClick={() => setSidebarOpen(true)} 
          onSearchClick={() => setIsSearchOpen(true)} 
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth focus:outline-none bg-transparent" tabIndex={-1}>
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Quick-Add Button */}
      <button
        onClick={() => setIsQuickAddOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-[#1c398e] hover:bg-[#152c6f] text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer font-semibold text-sm border border-white/10 group"
        title="Quick Add Lead (Press 'N')"
      >
        <PlusIcon className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
        <span className="hidden sm:inline">Quick Lead</span>
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono text-white ml-1">
          N
        </kbd>
      </button>

      {/* Global Modals */}
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
      <QuickAddLead
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </div>
  );
};
