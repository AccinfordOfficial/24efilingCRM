import React from 'react';
import { Loader2 } from 'lucide-react';

export const PageLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
      <p className="text-sm font-semibold">Loading...</p>
    </div>
  );
};
