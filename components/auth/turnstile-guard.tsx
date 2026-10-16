'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { cn } from '@/lib/utils';

export const TURNSTILE_SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim();

/**
 * Sentinel usado quando a chave pública não está configurada no cliente.
 *
 * A decisão de bloquear (ou não) pertence ao BACKEND: `verifyTurnstileToken`
 * faz fail-open apenas quando `TURNSTILE_SECRET_KEY` está ausente e, com o
 * segredo presente, rejeita o token sentinela via `siteverify`. O cliente nunca
 * deve ser um beco sem saída — por isso emitimos o sentinel em vez de pintar um
 * erro fixo que impediria o usuário de sequer tentar autenticar.
 */
export const TURNSTILE_DEV_BYPASS_TOKEN = 'turnstile-dev-bypass';

export type TurnstileGuardHandle = {
  reset: () => void;
  getToken: () => string | undefined;
};

export type TurnstileGuardProps = {
  onSuccess: (token: string) => void;
  onError?: (errorCode?: string) => void;
  onExpire?: () => void;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
};

export const TurnstileGuard = forwardRef<TurnstileGuardHandle, TurnstileGuardProps>(
  function TurnstileGuard(
    { onSuccess, onError, onExpire, action, theme = 'dark', className },
    ref
  ) {
    const widgetRef = useRef<TurnstileInstance | undefined>(undefined);
    const onSuccessRef = useRef(onSuccess);
    onSuccessRef.current = onSuccess;
    const configured = TURNSTILE_SITE_KEY.length > 0;

    useEffect(() => {
      if (configured) return;
      console.warn(
        '[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY ausente: prosseguindo sem desafio visível (o backend decide via TURNSTILE_SECRET_KEY).'
      );
      onSuccessRef.current(TURNSTILE_DEV_BYPASS_TOKEN);
    }, [configured]);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => widgetRef.current?.reset(),
        getToken: () => widgetRef.current?.getResponse(),
      }),
      []
    );

    const handleSuccess = useCallback((token: string) => {
      onSuccessRef.current(token);
    }, []);

    const handleError = useCallback(
      (errorCode?: string) => {
        onError?.(errorCode);
      },
      [onError]
    );

    const handleExpire = useCallback(() => {
      onExpire?.();
    }, [onExpire]);

    if (!configured) {
      // Sem chave pública não há widget a montar. O sentinel já foi emitido no
      // efeito acima, então o formulário permanece utilizável; qualquer bloqueio
      // real é decidido no servidor, nunca por uma mensagem fixa no cliente.
      return null;
    }

    return (
      <div className={cn('flex justify-center', className)}>
        <Turnstile
          ref={widgetRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={handleSuccess}
          onError={handleError}
          onExpire={handleExpire}
          options={{
            theme,
            action,
            appearance: 'interaction-only',
            size: 'flexible',
            refreshExpired: 'auto',
            retry: 'auto',
          }}
        />
      </div>
    );
  }
);
