import React from 'react';
import { Toaster as Sonner } from 'sonner';

export const Toaster: React.FC = () => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg rounded-xl p-4 flex gap-3 items-center border",
          description: "group-[.toast]:text-slate-500 text-xs",
          actionButton: "group-[.toast]:bg-blue-600 group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-500",
        },
      }}
      position="top-right"
      richColors
    />
  );
};

export default Toaster;
