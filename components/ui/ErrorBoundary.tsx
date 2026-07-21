import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full h-full p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-slate-500 mb-6 max-w-md">
            We encountered an unexpected error while trying to load this page. Please try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()} className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh Page
          </Button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
