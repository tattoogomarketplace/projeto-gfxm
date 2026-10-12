'use client';

import { useMemo } from 'react';
import { getTermsDocument } from '@/lib/terms';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

interface TermsContentProps {
  className?: string;
}

/**
 * Renderizador único dos Termos de Uso e Política de Privacidade. Usado no
 * primeiro acesso (onboarding) e na visualização dentro das Configurações do
 * Perfil, garantindo consistência total do conteúdo. O idioma do documento é
 * resolvido dinamicamente a partir da preferência ativa do usuário.
 */
export function TermsContent({ className }: TermsContentProps) {
  const { t, locale } = useI18n();
  const termsDoc = useMemo(() => getTermsDocument(locale), [locale]);

  return (
    <div className={cn('space-y-6', className)}>
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
          {t('terms.documentBadge')}
        </p>
        <h3 className="bg-gradient-to-r from-white via-orange-100 to-orange-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
          {termsDoc.title}
        </h3>
        <p className="text-xs text-zinc-500">
          {t('terms.updatedAt', { date: termsDoc.updatedAt })}
        </p>
      </header>

      {termsDoc.sections.map((section) => (
        <section key={section.id} className="space-y-2">
          <h4 className="text-sm font-semibold text-orange-400">{section.title}</h4>
          <div className="space-y-2">
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className="text-sm leading-relaxed text-zinc-300">
                {paragraph}
              </p>
            ))}
          </div>
          {section.bullets ? (
            <ul className="space-y-1.5 border-l border-white/10 pl-4">
              {section.bullets.map((bullet, index) => (
                <li
                  key={index}
                  className="relative text-sm leading-relaxed text-zinc-300 before:absolute before:-left-4 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-orange-400"
                >
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
