'use client';

import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Languages,
  LockKeyhole,
  Palette,
  ShieldCheck,
} from 'lucide-react';
import { NotificationPreferences } from '@/components/layout/notification-preferences';
import { ThemeSwitcher } from '@/components/layout/theme-switcher';

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6 bg-neutral-50 p-4 text-neutral-900 sm:p-6 dark:bg-transparent dark:text-white">
      <header className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm backdrop-blur-md transition-all duration-300 dark:border-white/10 dark:bg-gradient-to-br dark:from-white/[0.08] dark:via-white/[0.03] dark:to-transparent dark:shadow-none">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#FF5722]/20 blur-3xl"
        />
        <div className="relative space-y-3">
          <Link
            href="/dashboard/perfil"
            className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl text-sm font-medium text-zinc-400 transition-all duration-300 hover:text-[#FF5722] active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            Voltar ao perfil
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-full border border-[#FF5722]/40 bg-white text-[#FF5722] shadow-[0_0_18px_rgba(255,87,34,0.3)] dark:bg-[#1a1a1a]">
              <Palette className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF5722]">
                Perfil
              </p>
              <h1 className="mt-0.5 bg-gradient-to-r from-neutral-900 via-orange-700 to-[#FF5722] bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100">
                Configurações
              </h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">
                Aparência, preferências e segurança da sua conta.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#FF5722]/40 dark:border-white/10 dark:bg-zinc-950/50 dark:shadow-none">
        <div>
          <h2 className="text-lg font-bold text-[#FF5722]">Aparência</h2>
          <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-zinc-400">
            Escolha o clima visual do TattooGo MK. A preferência é salva neste dispositivo e aplicada na hora, sem recarregar a página.
          </p>
        </div>
        <ThemeSwitcher />
      </section>

      <NotificationPreferences />

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#FF5722]/40 dark:border-white/10 dark:bg-zinc-950/50 dark:shadow-none">
        <h2 className="text-lg font-bold text-[#FF5722]">Preferências</h2>
        <div className="space-y-2">
          <div className="flex min-h-11 items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <Languages className="h-5 w-5 min-h-5 min-w-5 text-[#FF5722]" strokeWidth={1.75} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-neutral-900 dark:text-white">
                Idioma
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">Português (Brasil)</span>
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Ativo
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#FF5722]/40 dark:border-white/10 dark:bg-zinc-950/50 dark:shadow-none">
        <h2 className="text-lg font-bold text-[#FF5722]">Segurança</h2>
        <Link
          href="/dashboard/perfil"
          className="group flex min-h-11 w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left transition-all duration-300 hover:border-[#FF5722]/40 hover:bg-[#FF5722]/5 active:scale-[0.99] dark:border-white/10 dark:bg-white/5"
        >
          <LockKeyhole className="h-5 w-5 min-h-5 min-w-5 text-[#FF5722]" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-neutral-900 dark:text-white">
              Senha e sessão
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Altere a senha e gerencie a conta no perfil.
            </span>
          </span>
          <ChevronRight
            className="h-4 w-4 min-h-4 min-w-4 text-zinc-500 transition-colors group-hover:text-[#FF5722]"
            strokeWidth={1.75}
          />
        </Link>
        <div className="flex min-h-11 items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <ShieldCheck className="h-5 w-5 min-h-5 min-w-5 text-[#FF5722]" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-neutral-900 dark:text-white">
              Proteção da sessão
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Autenticação Clerk com verificação em duas etapas quando exigida.
            </span>
          </span>
        </div>
      </section>
    </div>
  );
}
