'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * TATTOOGO MK - COMPONENTE DE BLINDAGEM (ERROR BOUNDARY)
 * Impede que erros em componentes individuais (como o Feed de Portfólio)
 * travem a renderização da tela inteira no APK/Mobile.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registro de erro para observabilidade
    console.error("[TATTOOGO MK] Erro detectado:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 p-4 text-center bg-zinc-900/50 border border-zinc-800 rounded-2xl backdrop-blur-md">
          <p className="text-zinc-400 mb-4 text-sm">Conteúdo temporariamente indisponível.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-6 py-2 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-500 transition-all active:scale-95"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
