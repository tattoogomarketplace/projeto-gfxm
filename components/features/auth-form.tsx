'use client';
import { useState } from 'react';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cliente');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignUp = async () => {
    setLoading(true);
    void email;
    void password;
    void role;
    setMessage('Cadastro migrado para Clerk. Use /register.');
    setLoading(false);
  };

  if (message) return (
    <div className="rounded-2xl border border-amber-500/30 bg-white p-8 text-center shadow-2xl dark:border-white/[0.05] dark:bg-white/[0.03]">
      <h2 className="mb-4 text-2xl font-bold text-amber-500">Quase lá...</h2>
      <p className="text-neutral-600 dark:text-zinc-300">{message}</p>
      <button 
        onClick={() => setMessage('')}
        className="mt-6 text-zinc-500 hover:text-white underline text-sm"
      >
        Voltar para o início
      </button>
    </div>
  );

  return (
    <div className="rounded-xl border border-black/[0.04] bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <h2 className="mb-6 text-xl font-bold text-neutral-900 dark:text-white">Criar Conta</h2>
      <input 
        type="email" 
        onChange={(e) => setEmail(e.target.value)} 
        placeholder="Email" 
        className="mb-4 w-full rounded-lg border border-black/[0.04] bg-white p-3 text-neutral-900 caret-neutral-900 placeholder:text-neutral-400 dark:border-white/[0.05] dark:bg-neutral-900 dark:text-white dark:caret-white dark:placeholder:text-neutral-500"
      />
      <input 
        type="password" 
        onChange={(e) => setPassword(e.target.value)} 
        placeholder="Senha" 
        className="mb-4 w-full rounded-lg border border-black/[0.04] bg-white p-3 text-neutral-900 caret-neutral-900 placeholder:text-neutral-400 dark:border-white/[0.05] dark:bg-neutral-900 dark:text-white dark:caret-white dark:placeholder:text-neutral-500"
      />
      <select 
        onChange={(e) => setRole(e.target.value)} 
        className="mb-6 w-full rounded-lg border border-black/[0.04] bg-white p-3 text-neutral-900 dark:border-white/[0.05] dark:bg-neutral-900 dark:text-white"
      >
        <option value="cliente">Cliente</option>
        <option value="tatuador">Tatuador</option>
      </select>
      <button 
        disabled={loading}
        onClick={handleSignUp} 
        className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-lg transition-all"
      >
        {loading ? 'Processando...' : 'Acessar Plataforma'}
      </button>
    </div>
  );
}
