'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { validateChatMessage } from "@/lib/utils/chat-moderation";
import { createClient } from '@/lib/supabase';

interface Message {
  id: string;
  sender: 'user' | 'peer';
  text: string;
  remetente_id?: string;
}

export function ChatBox({ destinatarioId }: { destinatarioId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function boot() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const peer = destinatarioId;
      if (!peer) return;

      const { data } = await supabase
        .from('mensagens_chat')
        .select('id, remetente_id, destinatario_id, mensagem, created_at')
        .or(`and(remetente_id.eq.${user.id},destinatario_id.eq.${peer}),and(remetente_id.eq.${peer},destinatario_id.eq.${user.id})`)
        .eq('bloqueada', false)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) {
        setMessages(data.map((m) => ({
          id: m.id,
          sender: m.remetente_id === user.id ? 'user' : 'peer',
          text: m.mensagem,
          remetente_id: m.remetente_id,
        })));
      }

      channel = supabase
        .channel(`chat:${[user.id, peer].sort().join(':')}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'mensagens_chat' },
          (payload) => {
            const row = payload.new as { id: string; remetente_id: string; destinatario_id: string; mensagem: string; bloqueada?: boolean };
            const involved = (row.remetente_id === user.id && row.destinatario_id === peer)
              || (row.remetente_id === peer && row.destinatario_id === user.id);
            if (!involved || row.bloqueada) return;
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return [...prev, {
                id: row.id,
                sender: row.remetente_id === user.id ? 'user' : 'peer',
                text: row.mensagem,
                remetente_id: row.remetente_id,
              }];
            });
          }
        )
        .subscribe();
    }

    boot();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [destinatarioId]);

  const sendMessage = async () => {
    if (!input.trim() || !userId || !destinatarioId) return;

    const { isValid, error } = validateChatMessage(input);

    if (!isValid) {
      alert(error);
      return;
    }

    const optimistic: Message = { id: Date.now().toString(), sender: 'user', text: input, remetente_id: userId };
    setMessages(prev => [...prev, optimistic]);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
      await fetch('/api/chat/enviar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          remetente_id: userId,
          destinatario_id: destinatarioId,
          mensagem: input,
        })
      });
    } catch (err) {
      console.error("Erro na moderação:", err);
    }

    setInput('');
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="flex flex-col w-full h-150 bg-[#121212] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${m.sender === 'user' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-[#1a1a1a] border-t border-gray-800 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500"
          placeholder={destinatarioId ? 'Digite sua mensagem...' : 'Selecione um artista para conversar'}
          disabled={!destinatarioId}
        />
        <button onClick={sendMessage} className="text-orange-500 hover:text-orange-400">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

