'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';
import { validateChatMessage } from "@/lib/utils/chat-moderation";
import { useOfflineQueue } from '@/hooks/use-offline-queue';

interface Message {
  id: string;
  sender: 'user' | 'peer';
  text: string;
  remetente_id?: string;
}

interface ChatHistoryRow {
  id: string;
  remetente_id: string;
  destinatario_id?: string;
  mensagem: string;
  bloqueada?: boolean;
}

export function ChatBox({ destinatarioId }: { destinatarioId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    async function boot() {
      if (!isLoaded || !isSignedIn || !user) return;
      setUserId(user.id);

      const peer = destinatarioId;
      if (!peer) return;

      const token = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
      const res = await fetch(`/api/chat/historico?interlocutor_id=${encodeURIComponent(peer)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return;
      const json = await res.json().catch(() => ({}));
      const data = (json.data || []) as ChatHistoryRow[];
      setMessages(data.map((m: ChatHistoryRow) => ({
        id: m.id,
        sender: m.remetente_id === user.id ? 'user' : 'peer',
        text: m.mensagem,
        remetente_id: m.remetente_id,
      })));
    }

    boot();
  }, [destinatarioId, isLoaded, isSignedIn, user]);

  const sendMessage = async () => {
    if (!input.trim() || !userId || !destinatarioId) return;

    const { isValid, error } = validateChatMessage(input);

    if (!isValid) {
      toast.error(error || 'Mensagem bloqueada pelas diretrizes.');
      return;
    }

    const payload: Record<string, unknown> = {
      remetente_id: userId,
      destinatario_id: destinatarioId,
      mensagem: input,
    };
    const optimistic: Message = { id: Date.now().toString(), sender: 'user', text: input, remetente_id: userId };
    setMessages(prev => [...prev, optimistic]);
    setInput('');

    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    if (!online) {
      useOfflineQueue.getState().enqueue('message', payload);
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
      const res = await fetch('/api/chat/enviar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('chat-send-failed');
    } catch (err) {
      console.error("Erro na moderação:", err);
      useOfflineQueue.getState().enqueue('message', payload);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="tattoo-wallpaper flex h-150 w-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-[#121212] dark:shadow-2xl">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 pb-32 space-y-4">
        {messages.map((m: Message) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${m.sender === 'user' ? 'bg-orange-600 text-white' : 'bg-neutral-100 text-neutral-800 dark:bg-gray-800 dark:text-gray-200'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-[#121212]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 border-none bg-transparent text-neutral-900 caret-neutral-900 outline-none placeholder:text-neutral-400 dark:text-white dark:caret-white dark:placeholder:text-neutral-500"
          placeholder={destinatarioId ? 'Digite sua mensagem...' : 'Selecione um artista para conversar'}
          disabled={!destinatarioId}
        />
        <button onClick={sendMessage} className="flex min-h-11 min-w-11 items-center justify-center text-orange-500 hover:text-orange-400 active:scale-95">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
