import React from 'react';
import { Button } from '../ui/Button';
import { Download, ChevronUp, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';

interface DashboardExportMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onExport: (format: 'excel' | 'csv' | 'pdf') => void;
}

export const DashboardExportMenu: React.FC<DashboardExportMenuProps> = ({ isOpen, onToggle, onExport }) => {
  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={onToggle}
        className="gap-1.5 h-9 text-xs font-semibold border-white/10 bg-slate-900/60 text-slate-300 hover:bg-white/5 shadow-sm"
      >
        <Download className="h-3.5 w-3.5" /> Export
        {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
      </Button>
      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-44 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <button onClick={() => onExport('excel')} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Excel (.xlsx)
          </button>
          <button onClick={() => onExport('csv')} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors">
            <FileText className="h-3.5 w-3.5 text-blue-400" /> CSV (.csv)
          </button>
          <button onClick={() => onExport('pdf')} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors">
            <FileText className="h-3.5 w-3.5 text-rose-400" /> PDF (.pdf)
          </button>
        </div>
      )}
    </div>
  );
};
