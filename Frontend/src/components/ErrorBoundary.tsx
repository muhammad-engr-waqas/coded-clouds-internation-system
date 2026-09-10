import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State { hasError: boolean; error: Error | null; }

/**
 * ErrorBoundary — wraps any subtree and catches runtime React errors.
 * Shows a friendly UI instead of a blank white screen.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode; label?: string }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.label ?? '', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center p-10 text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight text-red-600">
            {this.props.label ? `${this.props.label} failed to load` : 'Something went wrong'}
          </h2>
          <p className="text-xs font-medium opacity-50 mt-1 max-w-xs mx-auto">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
        </div>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-accent/20 hover:scale-105 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }
}
