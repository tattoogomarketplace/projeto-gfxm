'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from '@/lib/toast';
import { subscribeLocale, t } from '@/lib/i18n/store';

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
  private unsubscribe: (() => void) | null = null;

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidMount() {
    this.unsubscribe = subscribeLocale(() => this.forceUpdate());
  }

  public componentWillUnmount() {
    this.unsubscribe?.();
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    toast.error(t('toast.unexpected'));
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden bg-graphite text-white">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-neon-orange mb-4">{t('error.wentWrong')}</h2>
            <button 
              onClick={() => window.location.reload()}
              className="bg-neon-orange text-black px-6 py-2 rounded-lg font-bold"
            >
              {t('error.reloadSystem')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
