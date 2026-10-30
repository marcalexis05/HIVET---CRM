import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props { children?: React.ReactNode }
interface State { hasError: boolean; error: Error | null }

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-5">
        <section role="alert" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-brand-dark"><AlertTriangle className="h-6 w-6" aria-hidden="true" /></div>
          <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">This page couldn’t load. Try reloading it or go back to the home page.</p>
          {import.meta.env.DEV && this.state.error && <details className="mt-5 rounded-xl border border-slate-200 p-3 text-xs text-slate-500"><summary className="cursor-pointer font-medium">Error details</summary><pre className="mt-3 whitespace-pre-wrap break-words">{this.state.error.toString()}</pre></details>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-dark px-4 text-sm font-semibold text-white hover:bg-brand"><RefreshCcw className="h-4 w-4" />Reload page</button>
            <button type="button" onClick={() => { window.location.href = '/'; }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Home className="h-4 w-4" />Go to home</button>
          </div>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
