import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900 text-white z-50 p-4">
          <h2 className="text-2xl font-bold mb-2">Something went wrong.</h2>
          <pre className="text-sm bg-black/50 p-4 rounded overflow-auto max-w-2xl whitespace-pre-wrap">
            {this.state.error?.message}
          </pre>
          <button 
            className="mt-4 px-4 py-2 bg-white text-red-900 rounded font-bold"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
