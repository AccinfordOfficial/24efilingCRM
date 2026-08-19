
import React, { useState, createContext, useContext, useCallback, ReactNode } from 'react';
import { CheckCircleIcon, XIcon, BellIcon, AlertTriangleIcon } from './icons';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  add: (input: { title?: string; message: string; type?: ToastType }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ICONS: Record<ToastType, React.ElementType> = {
    success: CheckCircleIcon,
    error: AlertTriangleIcon,
    info: BellIcon,
};

const COLORS: Record<ToastType, { bg: string, text: string, icon: string }> = {
    success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: 'text-green-500' },
    error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: 'text-red-500' },
    info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: 'text-blue-500' },
};

const Toast: React.FC<ToastMessage & { onClose: () => void }> = ({ message, type, onClose }) => {
    const Icon = ICONS[type];
    const color = COLORS[type];

  return (
    <div className={`relative w-full p-4 pr-10 rounded-lg border shadow-lg animate-slide-in-right ${color.bg} ${color.text}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 ${color.icon}`} />
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button onClick={onClose} className={`absolute top-2 right-2 p-1 rounded-full hover:bg-black/10`}>
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
};


export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  const add = useCallback(({ title, message, type = 'info' }: { title?: string; message: string; type?: ToastType }) => {
    addToast(title ? `${title}: ${message}` : message, type);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, add }}>
      {children}
      <div className="fixed top-5 right-5 z-50 space-y-3 w-80">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
       <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out forwards;
        }
      `}</style>
    </ToastContext.Provider>
  );
};
