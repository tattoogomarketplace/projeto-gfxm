'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
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
const MAX_RECOVER_ATTEMPTS = 3;

const WIDGET_HOST_STYLE: CSSProperties = {
  position: 'fixed',
  left: 0,
  top: 0,
  width: 300,
  minWidth: 300,
  height: 65,
  minHeight: 65,
  margin: 0,
  transform: 'translate(-100%, -100%)',
  overflow: 'visible',
};

const INTERACTIVE_HOST_STYLE: CSSProperties = {
  position: 'fixed',
  left: '50%',
  top: '50%',
  width: 300,
  minWidth: 300,
  minHeight: 65,
  margin: 0,
  transform: 'translate(-50%, -50%)',
  overflow: 'visible',
  pointerEvents: 'auto',
  zIndex: 2147483000,
};

const WIDGET_BOX_STYLE: CSSProperties = {
  width: 300,
  minWidth: 300,
  height: 65,
  minHeight: 65,
  overflow: 'visible',
};

function subscribePortalTarget() {
  return () => undefined;
}

function getPortalTargetSnapshot() {
  return document.body;
}

function getPortalTargetServerSnapshot(): HTMLElement | null {
  return null;
}

const challengeExecutors = new Set<() => void>();

function destroyWidget(widgetId: string | null) {
  if (!widgetId) return;
  try {
    window.turnstile?.remove(widgetId);
  } catch {
    void 0;
  }
}

function resetTurnstileWidget(
  instance: TurnstileInstance | undefined,
  widgetId: string | null
) {
  if (instance) {
    try {
      instance.reset();
      return;
    } catch {
      void 0;
    }
  }
  if (!widgetId) return;
  try {
    window.turnstile?.reset(widgetId);
  } catch {
    void 0;
  }
}

function runInvisibleChallenge() {
  challengeExecutors.forEach((run) => run());
}

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
    runInvisibleChallenge();
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
    const widgetIdRef = useRef<string | null>(null);
    const isExecutingRef = useRef(false);
    const pendingExecuteRef = useRef(false);
    const mountedRef = useRef(true);
    const recoverAttemptsRef = useRef(0);
    const onSuccessRef = useRef(onSuccess);
    const [interactive, setInteractive] = useState(false);
    const portalTarget = useSyncExternalStore(
      subscribePortalTarget,
      getPortalTargetSnapshot,
      getPortalTargetServerSnapshot
    );
    const configured = TURNSTILE_SITE_KEY.length > 0;

    useEffect(() => {
      onSuccessRef.current = onSuccess;
    }, [onSuccess]);

    const executeChallenge = useCallback(() => {
      if (!mountedRef.current || isExecutingRef.current) return;
      const instance = widgetRef.current;
      if (!instance) {
        pendingExecuteRef.current = true;
        return;
      }
      try {
        if (!instance.isExpired()) {
          const existing = instance.getResponse();
          if (existing) return;
        }
      } catch {
        pendingExecuteRef.current = true;
        return;
      }
      isExecutingRef.current = true;
      pendingExecuteRef.current = false;
      try {
        if (instance.isExpired()) {
          instance.reset();
        }
        instance.execute();
      } catch {
        isExecutingRef.current = false;
        pendingExecuteRef.current = false;
      }
    }, []);

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);

    useEffect(() => {
      if (configured) return;
      console.warn(
        '[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY ausente: prosseguindo sem desafio visível (o backend decide via TURNSTILE_SECRET_KEY).'
      );
      onSuccessRef.current(TURNSTILE_DEV_BYPASS_TOKEN);
    }, [configured]);

    useEffect(() => {
      if (!configured) return;
      challengeExecutors.add(executeChallenge);
      return () => {
        challengeExecutors.delete(executeChallenge);
      };
    }, [configured, executeChallenge]);

    useLayoutEffect(() => {
      if (!configured) return;
      return () => {
        isExecutingRef.current = false;
        pendingExecuteRef.current = false;
        const widgetId = widgetIdRef.current;
        widgetIdRef.current = null;
        destroyWidget(widgetId);
      };
    }, [configured]);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          isExecutingRef.current = false;
          pendingExecuteRef.current = false;
          recoverAttemptsRef.current = 0;
          setInteractive(false);
          resetTurnstileWidget(widgetRef.current, widgetIdRef.current);
        },
        getToken: () => widgetRef.current?.getResponse(),
        execute: executeChallenge,
      }),
      [executeChallenge]
    );

    const handleWidgetLoad = useCallback(
      (widgetId: string) => {
        widgetIdRef.current = widgetId;
        if (!mountedRef.current) return;
        if (pendingExecuteRef.current && !isExecutingRef.current) {
          executeChallenge();
        }
      },
      [executeChallenge]
    );

    const scheduleWidgetReset = useCallback(() => {
      const runReset = () => {
        if (!mountedRef.current) return;
        resetTurnstileWidget(widgetRef.current, widgetIdRef.current);
      };
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(runReset);
      } else {
        window.setTimeout(runReset, 0);
      }
    }, []);

    const recoverFromError = useCallback(() => {
      isExecutingRef.current = false;
      pendingExecuteRef.current = false;
      if (recoverAttemptsRef.current >= MAX_RECOVER_ATTEMPTS) return;
      recoverAttemptsRef.current += 1;
      scheduleWidgetReset();
    }, [scheduleWidgetReset]);

    const recoverFromExpire = useCallback(() => {
      isExecutingRef.current = false;
      pendingExecuteRef.current = false;
      scheduleWidgetReset();
    }, [scheduleWidgetReset]);

    const handleSuccess = useCallback((token: string) => {
      isExecutingRef.current = false;
      pendingExecuteRef.current = false;
      recoverAttemptsRef.current = 0;
      setInteractive(false);
      onSuccessRef.current(token);
    }, []);

    const handleBeforeInteractive = useCallback(() => {
      setInteractive(true);
    }, []);

    const handleAfterInteractive = useCallback(() => {
      setInteractive(false);
    }, []);

    const handleError = useCallback(
      (errorCode?: string) => {
        setInteractive(false);
        recoverFromError();
        onError?.(errorCode);
      },
      [onError, recoverFromError]
    );

    const handleExpire = useCallback(() => {
      setInteractive(false);
      recoverFromExpire();
      onExpire?.();
    }, [onExpire, recoverFromExpire]);

    const handleTimeout = useCallback(() => {
      setInteractive(false);
      recoverFromError();
      onError?.('timeout');
    }, [onError, recoverFromError]);

    if (!configured || !portalTarget) {
      return null;
    }

    return createPortal(
      <div
        aria-hidden={!interactive}
        data-turnstile-host=""
        data-turnstile-interactive={interactive ? '' : undefined}
        style={interactive ? INTERACTIVE_HOST_STYLE : WIDGET_HOST_STYLE}
      >
        <style>{`
[data-turnstile-host] iframe{width:300px!important;min-width:300px!important;height:65px!important;min-height:65px!important;overflow:visible!important}
[data-turnstile-host][data-turnstile-interactive] iframe{min-height:150px!important;height:auto!important}
`}</style>
        <Turnstile
          ref={widgetRef}
          siteKey={TURNSTILE_SITE_KEY}
          style={WIDGET_BOX_STYLE}
          onSuccess={handleSuccess}
          onError={handleError}
          onExpire={handleExpire}
          onTimeout={handleTimeout}
          onWidgetLoad={handleWidgetLoad}
          onBeforeInteractive={handleBeforeInteractive}
          onAfterInteractive={handleAfterInteractive}
          options={{
            theme,
            action,
            appearance: 'interaction-only',
            execution: 'execute',
            refreshExpired: 'auto',
            retry: 'auto',
          }}
        />
      </div>,
      portalTarget
    );
  }
);
