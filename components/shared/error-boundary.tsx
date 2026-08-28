'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    toast.error('Ocorreu um erro inesperado no sistema. Tente novamente.');
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-graphite text-white">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-neon-orange mb-4">Algo deu errado.</h2>
            <button 
              onClick={() => window.location.reload()}
              className="bg-neon-orange text-black px-6 py-2 rounded-lg font-bold"
            >
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
