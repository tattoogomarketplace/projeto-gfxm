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
 * Sentinel usado somente fora de produção, quando a chave pública não está
 * configurada. O backend também faz fail-open sem `TURNSTILE_SECRET_KEY`, então
 * o fluxo local continua funcional sem quebrar a proteção em produção.
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
      if (configured || process.env.NODE_ENV === 'production') return;
      console.warn(
        '[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY ausente: bypass de desenvolvimento ativo.'
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
      if (process.env.NODE_ENV === 'production') {
        return (
          <p role="alert" className={cn('text-center text-xs text-red-400', className)}>
            Verificação de segurança indisponível. Tente novamente mais tarde.
          </p>
        );
      }
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
