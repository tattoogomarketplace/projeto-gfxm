import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="bg-zinc-950 text-white min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-700 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
          <div className="bg-orange-500/10 text-orange-500 border border-orange-500/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-8 h-8"
              aria-hidden="true"
            >
              <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 14H4V8h16v10Zm-2-2H6v-2h12v2Zm0-4H6v-2h12v2Zm0-4H6V6h12v2Z" />
            </svg>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white mb-2 text-center">
            Bem-vindo à Elite, GFXM!
          </h1>

          <p className="text-zinc-400 text-sm text-center mb-6">
            Sua conta está autenticada e o sistema operacional está ativo.
          </p>

          <div className="mb-8 rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-center">
            <span className="text-xs uppercase tracking-wider text-zinc-500 block mb-2">
              E-mail autenticado
            </span>
            <code className="font-mono text-sm text-orange-500 break-all">
              {user.email}
            </code>
          </div>

          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl transition-all text-sm border border-zinc-700 py-3 w-full"
            >
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
