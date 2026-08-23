'use client';
import { useState } from 'react';
import { supabase } from '@/lib/mock-services';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cliente');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { role },
        emailRedirectTo: `${window.location.origin}/auth/callback` 
      }
    });

    if (error) {
      alert("Erro no cadastro: " + error.message);
    } else {
      setMessage("Sucesso! Verifique seu e-mail e clique no link de confirmação para ser logado.");
    }
    setLoading(false);
  };

  if (message) return (
    <div className="p-8 bg-zinc-900 border border-amber-500/30 rounded-2xl text-center shadow-2xl">
      <h2 className="text-2xl font-bold text-amber-500 mb-4">Quase lá...</h2>
      <p className="text-zinc-300">{message}</p>
      <button 
        onClick={() => setMessage('')}
        className="mt-6 text-zinc-500 hover:text-white underline text-sm"
      >
        Voltar para o início
      </button>
    </div>
  );

  return (
    <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
      <h2 className="text-xl font-bold text-white mb-6">Criar Conta</h2>
      <input 
        type="email" 
        onChange={(e) => setEmail(e.target.value)} 
        placeholder="Email" 
        className="w-full p-3 mb-4 bg-zinc-950 text-white rounded-lg border border-zinc-700"
      />
      <input 
        type="password" 
        onChange={(e) => setPassword(e.target.value)} 
        placeholder="Senha" 
        className="w-full p-3 mb-4 bg-zinc-950 text-white rounded-lg border border-zinc-700"
      />
      <select 
        onChange={(e) => setRole(e.target.value)} 
        className="w-full p-3 mb-6 bg-zinc-950 text-white rounded-lg border border-zinc-700"
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
