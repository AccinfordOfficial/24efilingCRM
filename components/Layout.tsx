import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalFilterBar } from './ui/GlobalFilterBar';
import { useAuth } from '../context/AuthContext';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { profile } = useAuth();
  
  const showFilterBar = ['/', '/leads', '/customers', '/payments', '/reports', '/activity', '/users', '/web/leads', '/my-leads'].includes(location.pathname);

  return (
    <div className="flex h-screen bg-slate-950/15 text-slate-100 overflow-hidden font-sans">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth focus:outline-none bg-transparent" tabIndex={-1}>
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
