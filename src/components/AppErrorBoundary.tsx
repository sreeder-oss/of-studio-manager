import React from 'react';
import { toast } from 'sonner';

interface State { hasError: boolean; error: Error | null }

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Surface the error so the user knows something went wrong.
    try { toast.error(error.message || 'Something went wrong.'); } catch { /* noop */ }
    // eslint-disable-next-line no-console
    console.error('AppErrorBoundary caught:', error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="font-serif text-2xl text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-widest shadow-glow"
              >
                Try again
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-[11px] font-bold uppercase tracking-widest"
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
