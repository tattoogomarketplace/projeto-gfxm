'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

export const TURNSTILE_SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim();

const SITE_ORIGIN = 'https://tattoogomk.com.br';
const TURNSTILE_ONLOAD_NAME = 'onloadTurnstileCallback';

declare global {
  interface Window {
    onloadTurnstileCallback?: () => void;
  }
}

function ensureTurnstileOnloadCallback() {
  if (typeof window === 'undefined') return;
  if (typeof window.onloadTurnstileCallback === 'function') return;
  window.onloadTurnstileCallback = function onloadTurnstileCallback() {};
}

ensureTurnstileOnloadCallback();

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

const TOKEN_WAIT_MS = 15000;
const MAX_RECOVER_ATTEMPTS = 3;
const EXECUTION_WATCHDOG_MS = 20000;
const INTERACTION_GRACE_MS = 25000;

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

function destroyWidget(
  instance: TurnstileInstance | undefined,
  widgetId: string | null,
  host: HTMLElement | null
) {
  try {
    instance?.remove();
  } catch {
    void 0;
  }
  if (widgetId) {
    try {
      window.turnstile?.remove(widgetId);
    } catch {
      void 0;
    }
  }
  if (!host) return;
  host.querySelectorAll('iframe').forEach((frame) => {
    frame.remove();
  });
}

function resetTurnstileWidget(
  instance: TurnstileInstance | undefined,
  widgetId: string | null
): boolean {
  if (instance) {
    try {
      instance.reset();
      return true;
    } catch {
      void 0;
    }
  }
  if (!widgetId) return false;
  try {
    window.turnstile?.reset(widgetId);
    return true;
  } catch {
    return false;
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
  const waiterRef = useRef<((next: string | null) => void) | null>(null);

  const settleWaiter = useCallback((next: string | null) => {
    const waiter = waiterRef.current;
    waiterRef.current = null;
    waiter?.(next);
  }, []);

  const onSuccess = useCallback(
    (next: string) => {
      tokenRef.current = next;
      setToken(next);
      settleWaiter(next);
    },
    [settleWaiter]
  );

  const onExpire = useCallback(() => {
    tokenRef.current = '';
    setToken('');
    // Libera qualquer submit que esteja aguardando o token: sem isso o
    // usuário ficaria preso até o timeout total do formulário.
    settleWaiter(null);
  }, [settleWaiter]);

  const onError = useCallback(() => {
    tokenRef.current = '';
    setToken('');
    settleWaiter(null);
  }, [settleWaiter]);

  const waitForToken = useCallback(
    (timeoutMs = TOKEN_WAIT_MS) => {
      if (tokenRef.current) return Promise.resolve(tokenRef.current);
      // Um novo submit substitui o anterior: resolve o waiter antigo como
      // falha para que nenhuma promessa fique pendurada para sempre.
      settleWaiter(null);
      return new Promise<string | null>((resolve) => {
        const timeout = window.setTimeout(() => {
          waiterRef.current = null;
          resolve(null);
        }, timeoutMs);
        waiterRef.current = (next: string | null) => {
          window.clearTimeout(timeout);
          resolve(next);
        };
        runInvisibleChallenge();
      });
    },
    [settleWaiter]
  );

  const reset = useCallback(() => {
    tokenRef.current = '';
    setToken('');
    settleWaiter(null);
    setNonce((current) => current + 1);
  }, [settleWaiter]);

  return { token, nonce, onSuccess, onExpire, onError, waitForToken, reset };
}

export const TurnstileGuard = forwardRef<TurnstileGuardHandle, TurnstileGuardProps>(
  function TurnstileGuard(
    { onSuccess, onError, onExpire, action, theme = 'dark' },
    ref
  ) {
    const widgetRef = useRef<TurnstileInstance | undefined>(undefined);
    const hostRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const isExecutingRef = useRef(false);
    const pendingExecuteRef = useRef(false);
    const needsResetRef = useRef(false);
    const interactiveRef = useRef(false);
    const mountedRef = useRef(true);
    const recoverAttemptsRef = useRef(0);
    const watchdogRef = useRef<number | null>(null);
    const resetTimerRef = useRef<number | null>(null);
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);
    const onExpireRef = useRef(onExpire);
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

    useEffect(() => {
      onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
      onExpireRef.current = onExpire;
    }, [onExpire]);

    const clearExecutionWatchdog = useCallback(() => {
      if (watchdogRef.current === null) return;
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }, []);

    const clearPendingReset = useCallback(() => {
      if (resetTimerRef.current === null) return;
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }, []);

    const scheduleWidgetReset = useCallback(() => {
      clearPendingReset();
      resetTimerRef.current = window.setTimeout(() => {
        resetTimerRef.current = null;
        if (!mountedRef.current) return;
        if (resetTurnstileWidget(widgetRef.current, widgetIdRef.current)) {
          needsResetRef.current = false;
        }
      }, 0);
    }, [clearPendingReset]);

    const recoverFromFailure = useCallback(
      (errorCode?: string) => {
        clearExecutionWatchdog();
        isExecutingRef.current = false;
        pendingExecuteRef.current = false;
        interactiveRef.current = false;
        setInteractive(false);
        // O widget ficou em estado inválido: a próxima execução (manual ou
        // automática) precisa de reset antes de chamar `execute()` novamente.
        needsResetRef.current = true;
        onErrorRef.current?.(errorCode);

        if (recoverAttemptsRef.current >= MAX_RECOVER_ATTEMPTS) {
          // Sem reset automático após o limite para evitar loop de rede. O
          // lock de execução já foi liberado e o próximo submit reseta.
          return;
        }
        recoverAttemptsRef.current += 1;
        scheduleWidgetReset();
      },
      [clearExecutionWatchdog, scheduleWidgetReset]
    );

    const armExecutionWatchdog = useCallback(() => {
      clearExecutionWatchdog();
      if (!mountedRef.current) return;

      const deadline = Date.now() + EXECUTION_WATCHDOG_MS;

      const check = () => {
        watchdogRef.current = null;
        if (!mountedRef.current || !isExecutingRef.current) return;

        // Enquanto o usuário resolve um desafio interativo, dá uma janela
        // extra antes de considerar o adaptador travado.
        if (interactiveRef.current && Date.now() < deadline + INTERACTION_GRACE_MS) {
          const remaining = deadline + INTERACTION_GRACE_MS - Date.now();
          watchdogRef.current = window.setTimeout(check, Math.min(5000, remaining));
          return;
        }

        recoverFromFailure('timeout');
      };

      watchdogRef.current = window.setTimeout(check, EXECUTION_WATCHDOG_MS);
    }, [clearExecutionWatchdog, recoverFromFailure]);

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
          if (existing) {
            pendingExecuteRef.current = false;
            return;
          }
        }
      } catch {
        pendingExecuteRef.current = true;
        return;
      }

      // Nova tentativa iniciada pelo formulário: zera o orçamento de
      // recuperação para que o usuário nunca fique permanentemente bloqueado.
      recoverAttemptsRef.current = 0;
      pendingExecuteRef.current = false;
      isExecutingRef.current = true;

      try {
        if (needsResetRef.current || instance.isExpired()) {
          if (resetTurnstileWidget(instance, widgetIdRef.current)) {
            needsResetRef.current = false;
          }
        }
        instance.execute();
        armExecutionWatchdog();
      } catch {
        recoverFromFailure('execute-error');
      }
    }, [armExecutionWatchdog, recoverFromFailure]);

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
      const host = hostRef.current;
      return () => {
        clearExecutionWatchdog();
        clearPendingReset();
        isExecutingRef.current = false;
        pendingExecuteRef.current = false;
        const widgetId = widgetIdRef.current;
        const instance = widgetRef.current;
        widgetIdRef.current = null;
        widgetRef.current = undefined;
        destroyWidget(instance, widgetId, host);
      };
    }, [configured, clearExecutionWatchdog, clearPendingReset]);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          clearExecutionWatchdog();
          clearPendingReset();
          isExecutingRef.current = false;
          pendingExecuteRef.current = false;
          needsResetRef.current = true;
          recoverAttemptsRef.current = 0;
          interactiveRef.current = false;
          setInteractive(false);
          if (resetTurnstileWidget(widgetRef.current, widgetIdRef.current)) {
            needsResetRef.current = false;
          }
        },
        getToken: () => widgetRef.current?.getResponse(),
        execute: executeChallenge,
      }),
      [clearExecutionWatchdog, clearPendingReset, executeChallenge]
    );

    const handleWidgetLoad = useCallback(
      (widgetId: string) => {
        widgetIdRef.current = widgetId;
        needsResetRef.current = false;
        if (!mountedRef.current) return;
        if (pendingExecuteRef.current && !isExecutingRef.current) {
          executeChallenge();
        }
      },
      [executeChallenge]
    );

    const handleSuccess = useCallback(
      (token: string) => {
        clearExecutionWatchdog();
        clearPendingReset();
        isExecutingRef.current = false;
        pendingExecuteRef.current = false;
        needsResetRef.current = false;
        recoverAttemptsRef.current = 0;
        interactiveRef.current = false;
        setInteractive(false);
        onSuccessRef.current(token);
      },
      [clearExecutionWatchdog, clearPendingReset]
    );

    const handleBeforeInteractive = useCallback(() => {
      interactiveRef.current = true;
      setInteractive(true);
    }, []);

    const handleAfterInteractive = useCallback(() => {
      interactiveRef.current = false;
      setInteractive(false);
    }, []);

    const handleError = useCallback(
      (errorCode?: string) => {
        recoverFromFailure(errorCode ?? 'error');
      },
      [recoverFromFailure]
    );

    const handleExpire = useCallback(() => {
      clearExecutionWatchdog();
      isExecutingRef.current = false;
      pendingExecuteRef.current = false;
      interactiveRef.current = false;
      needsResetRef.current = true;
      setInteractive(false);
      scheduleWidgetReset();
      onExpireRef.current?.();
    }, [clearExecutionWatchdog, scheduleWidgetReset]);

    const handleTimeout = useCallback(() => {
      recoverFromFailure('timeout');
    }, [recoverFromFailure]);

    const handleUnsupported = useCallback(() => {
      recoverFromFailure('unsupported');
    }, [recoverFromFailure]);

    const handleScriptError = useCallback(() => {
      recoverFromFailure('script-load-error');
    }, [recoverFromFailure]);

    const scriptOptions = useMemo(
      () => ({
        async: true,
        defer: true,
        appendTo: 'head' as const,
        onLoadCallbackName: TURNSTILE_ONLOAD_NAME,
      }),
      []
    );

    useLayoutEffect(() => {
      ensureTurnstileOnloadCallback();
    }, []);

    useEffect(() => {
      if (!configured) return;
      const script = document.getElementById('cf-turnstile-script');
      if (!script) return;
      const onErr = () => handleScriptError();
      script.addEventListener('error', onErr);
      return () => {
        script.removeEventListener('error', onErr);
      };
    }, [configured, handleScriptError]);

    if (!configured || !portalTarget) {
      return null;
    }

    return createPortal(
      <div
        ref={hostRef}
        aria-hidden={!interactive}
        data-turnstile-host=""
        data-turnstile-origin={SITE_ORIGIN}
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
          scriptOptions={scriptOptions}
          onSuccess={handleSuccess}
          onError={handleError}
          onExpire={handleExpire}
          onTimeout={handleTimeout}
          onUnsupported={handleUnsupported}
          onWidgetLoad={handleWidgetLoad}
          onBeforeInteractive={handleBeforeInteractive}
          onAfterInteractive={handleAfterInteractive}
          options={{
            theme,
            action,
            appearance: 'interaction-only',
            execution: 'execute',
            refreshExpired: 'auto',
            refreshTimeout: 'auto',
            retry: 'auto',
          }}
        />
      </div>,
      portalTarget
    );
  }
);
