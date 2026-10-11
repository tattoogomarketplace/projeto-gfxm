'use client';

import { useEffect, useState } from 'react';
import { BRAND_NAME } from '@/lib/i18n/brands';

/**
 * global-error — a última linha de defesa do TattooGo MK.
 *
 * O `error.tsx` do App Router só captura falhas lançadas *abaixo* do root
 * layout: um crash dentro dos providers (`ClerkProvider`, `QueryProvider`,
 * `ThemeProvider`, `I18nProvider`) ou do próprio `<body>` escapa para cá.
 *
 * Por substituir o root layout, este arquivo é intencionalmente autossuficiente:
 *  - não importa providers, hooks de tema/i18n nem `globals.css`;
 *  - usa estilos 100% inline (funcionam mesmo se o CSS falhar em carregar);
 *  - depende apenas de `BRAND_NAME` (módulo puro, sem efeitos).
 *
 * O resultado é uma superfície de recuperação "Dark Luxury" — nunca a tela
 * preta muda — com duas saídas: recarregar ou voltar ao início.
 */

type RecoveryCopy = {
  readonly code: string;
  readonly title: string;
  readonly body: string;
  readonly reload: string;
  readonly home: string;
};

const COPY: Record<'pt-BR' | 'en', RecoveryCopy> = {
  'pt-BR': {
    code: 'Sistema',
    title: 'Traço interrompido',
    body: 'Algo saiu do eixo e interrompeu o aplicativo. Recarregue para continuar de onde parou.',
    reload: 'Recarregar',
    home: 'Início',
  },
  en: {
    code: 'System',
    title: 'Stroke interrupted',
    body: 'Something went off-axis and stopped the app. Reload to continue where you left off.',
    reload: 'Reload',
    home: 'Home',
  },
};

function resolveCopy(): RecoveryCopy {
  if (typeof document === 'undefined') return COPY['pt-BR'];
  return document.documentElement.lang?.toLowerCase().startsWith('en') ? COPY.en : COPY['pt-BR'];
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copy, setCopy] = useState<RecoveryCopy>(COPY['pt-BR']);

  useEffect(() => {
    console.error('FATAL CRASH (global):', error);
    setCopy(resolveCopy());
  }, [error]);

  const reload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  return (
    <html lang="pt-BR" dir="ltr">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding:
            'calc(1.5rem + env(safe-area-inset-top)) 1.5rem calc(1.5rem + env(safe-area-inset-bottom))',
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <main
          role="alert"
          style={{
            width: '100%',
            maxWidth: '22rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '1.25rem',
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'flex',
              height: '4rem',
              width: '4rem',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '1.25rem',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              color: '#fb923c',
              fontSize: '1.75rem',
              fontWeight: 700,
              boxShadow: '0 0 22px rgba(249, 115, 22, 0.25)',
            }}
          >
            !
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p
              style={{
                margin: 0,
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: '#f97316',
              }}
            >
              {BRAND_NAME}
            </p>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
              {copy.title}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: '0.875rem',
                lineHeight: 1.6,
                color: '#a1a1aa',
              }}
            >
              {copy.body}
            </p>
          </div>

          <div style={{ display: 'flex', width: '100%', flexDirection: 'column', gap: '0.625rem' }}>
            <button
              type="button"
              onClick={reload}
              style={{
                minHeight: '2.75rem',
                width: '100%',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(249, 115, 22, 0.12)',
                color: '#fb923c',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copy.reload}
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  reset();
                  window.location.assign('/');
                }
              }}
              style={{
                minHeight: '2.75rem',
                width: '100%',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '0.75rem',
                backgroundColor: 'transparent',
                color: '#e4e4e7',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copy.home}
            </button>
          </div>

          {copy.code ? (
            <p style={{ margin: 0, fontSize: '0.6875rem', color: '#52525b' }}>
              {BRAND_NAME} · {copy.code}
              {error.digest ? ` #${error.digest}` : ''}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
