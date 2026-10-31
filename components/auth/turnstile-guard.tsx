'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

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

const TOKEN_WAIT_MS = 8000;

export type TurnstileGuardHandle = {
  reset: () => void;
  getToken: () => string | undefined;
  execute: () => void;
};

export type TurnstileGuardProps = {
  onSuccess: (token: string) => void;
  onError?: (errorCode?: string) => void;
  onExpire?: () => void;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
};

export function useTurnstileToken() {
  const [token, setToken] = useState('');
  const [nonce, setNonce] = useState(0);
  const tokenRef = useRef('');
  const waiterRef = useRef<((next: string) => void) | null>(null);

  const onSuccess = useCallback((next: string) => {
    tokenRef.current = next;
    setToken(next);
    waiterRef.current?.(next);
    waiterRef.current = null;
  }, []);

  const onExpire = useCallback(() => {
    tokenRef.current = '';
    setToken('');
  }, []);

  const onError = useCallback(() => {
    tokenRef.current = '';
    setToken('');
  }, []);

  const waitForToken = useCallback((timeoutMs = TOKEN_WAIT_MS) => {
    if (tokenRef.current) return Promise.resolve(tokenRef.current);
    return new Promise<string | null>((resolve) => {
      const timeout = window.setTimeout(() => {
        waiterRef.current = null;
        resolve(null);
      }, timeoutMs);
      waiterRef.current = (next: string) => {
        window.clearTimeout(timeout);
        resolve(next);
      };
    });
  }, []);

  const reset = useCallback(() => {
    tokenRef.current = '';
    setToken('');
    waiterRef.current = null;
    setNonce((current) => current + 1);
  }, []);

  return { token, nonce, onSuccess, onExpire, onError, waitForToken, reset };
}

export const TurnstileGuard = forwardRef<TurnstileGuardHandle, TurnstileGuardProps>(
  function TurnstileGuard(
    { onSuccess, onError, onExpire, action, theme = 'dark' },
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
        execute: () => widgetRef.current?.execute(),
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
      return null;
    }

    return (
      <div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 -z-10 h-px w-px overflow-hidden opacity-0"
      >
        <Turnstile
          ref={widgetRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={handleSuccess}
          onError={handleError}
          onExpire={handleExpire}
          options={{
            theme,
            action,
            appearance: 'execute',
            execution: 'render',
            size: 'invisible',
            refreshExpired: 'auto',
            retry: 'auto',
          }}
        />
      </div>
    );
  }
);
