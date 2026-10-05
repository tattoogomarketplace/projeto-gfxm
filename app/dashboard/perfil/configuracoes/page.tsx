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
    <div className="space-y-6 p-4 sm:p-6 text-[var(--foreground)]">
      <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-5 backdrop-blur-md transition-all duration-300 light:border-black/10 light:from-black/[0.04] light:via-white/70">
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
            <span className="flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-full border border-[#FF5722]/40 bg-[#1a1a1a] text-[#FF5722] shadow-[0_0_18px_rgba(255,87,34,0.3)] light:bg-white">
              <Palette className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF5722]">
                Perfil
              </p>
              <h1 className="mt-0.5 bg-gradient-to-r from-white via-orange-100 to-[#FF5722] bg-clip-text text-2xl font-bold tracking-tight text-transparent light:from-zinc-900 light:via-zinc-700">
                Configurações
              </h1>
              <p className="mt-1 text-sm text-zinc-400 light:text-zinc-600">
                Aparência, preferências e segurança da sua conta.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-4 rounded-xl border border-white/10 bg-zinc-950/50 p-4 transition-all duration-300 hover:border-[#FF5722]/40 light:border-black/10 light:bg-white/80">
        <div>
          <h2 className="text-lg font-bold text-[#FF5722]">Aparência</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400 light:text-zinc-600">
            Escolha o clima visual do TattooGo MK. A preferência é salva neste dispositivo e aplicada na hora, sem recarregar a página.
          </p>
        </div>
        <ThemeSwitcher />
      </section>

      <NotificationPreferences />

      <section className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/50 p-4 transition-all duration-300 hover:border-[#FF5722]/40 light:border-black/10 light:bg-white/80">
        <h2 className="text-lg font-bold text-[#FF5722]">Preferências</h2>
        <div className="space-y-2">
          <div className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 light:border-black/10 light:bg-black/[0.03]">
            <Languages className="h-5 w-5 min-h-5 min-w-5 text-[#FF5722]" strokeWidth={1.75} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-white light:text-zinc-900">
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

      <section className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/50 p-4 transition-all duration-300 hover:border-[#FF5722]/40 light:border-black/10 light:bg-white/80">
        <h2 className="text-lg font-bold text-[#FF5722]">Segurança</h2>
        <Link
          href="/dashboard/perfil"
          className="group flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-all duration-300 hover:border-[#FF5722]/40 hover:bg-[#FF5722]/5 active:scale-[0.99] light:border-black/10 light:bg-black/[0.03]"
        >
          <LockKeyhole className="h-5 w-5 min-h-5 min-w-5 text-[#FF5722]" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-white light:text-zinc-900">
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
        <div className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 light:border-black/10 light:bg-black/[0.03]">
          <ShieldCheck className="h-5 w-5 min-h-5 min-w-5 text-[#FF5722]" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-white light:text-zinc-900">
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
