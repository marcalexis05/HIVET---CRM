import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FDF8E1] flex items-center justify-center p-6 font-sans">
          <div className="max-w-2xl w-full bg-white rounded-[3.5rem] p-12 sm:p-16 shadow-2xl border border-red-100 relative overflow-hidden">
            {/* Architectural Background Detail */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full -mr-32 -mt-32 opacity-50" />
            
            <div className="relative z-10 space-y-8">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-10 h-10" />
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-black text-accent-brown tracking-tighter uppercase leading-none italic">
                  Systems <span className="text-red-500">Compromised</span>
                </h1>
                <p className="text-lg text-accent-brown/60 italic leading-relaxed">
                  An unexpected exception has occurred within the portal's core architecture. Our diagnostic team has been notified.
                </p>
              </div>

              {this.state.error && (
                <div className="bg-red-50/50 border border-red-100 rounded-3xl p-6 font-mono text-xs text-red-800 overflow-x-auto">
                  <span className="font-black uppercase tracking-widest text-red-400 block mb-2">Diagnostic Data:</span>
                  {this.state.error.toString()}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-brand-dark text-white py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] italic flex items-center justify-center gap-3 hover:shadow-2xl transition-all"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Attempt Initialize
                </button>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="flex-1 bg-accent-brown/5 text-accent-brown py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] italic flex items-center justify-center gap-3 hover:bg-accent-brown/10 transition-all"
                >
                  <Home className="w-4 h-4" />
                  Return Base
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
