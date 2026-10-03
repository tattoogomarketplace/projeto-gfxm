'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { AiChatHeader } from '@/components/layout/ai-chat-header';
import { cn } from '@/lib/utils';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export default function DashboardAiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        content?: string;
        erro?: string;
      };

      if (!response.ok || !payload.content) {
        throw new Error(payload.erro || 'Não foi possível falar com o assistente agora.');
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: payload.content as string,
        },
      ]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível falar com o assistente agora.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tattoo-wallpaper relative mx-auto flex min-h-dvh w-full max-w-app flex-col bg-[#09090b]">
      <AiChatHeader />

      <div
        ref={scrollerRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
      >
        {messages.length === 0 ? (
          <section className="glass-panel relative overflow-hidden rounded-2xl p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#F97316]/15 blur-2xl" />
            <div className="relative flex items-start gap-3">
              <div className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-[#F97316]/40 bg-[#1a1a1a] text-[#F97316] shadow-[0_0_16px_rgba(249,115,22,0.28)]">
                <Sparkles className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#F97316]">
                  Assistente IA
                </p>
                <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-[#F5F5F5]">
                  TattooGo Studio
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
                  Ideias de estilo, cuidados e agendamento — pergunte à elite.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div key={message.id} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[84%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[14px] leading-relaxed',
                  isUser
                    ? 'rounded-tr-md bg-[#F97316] text-black shadow-[0_0_16px_rgba(249,115,22,0.28)]'
                    : 'rounded-tl-md border border-white/8 bg-[#1a1a1a] text-[#F5F5F5]'
                )}
              >
                {message.content}
              </div>
            </div>
          );
        })}

        {isLoading ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-md border border-[#F97316]/25 bg-[#1a1a1a] px-4 py-3 text-[13px] text-[#F97316]">
              Traçando resposta...
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="text-center text-[13px] text-red-400">{errorMessage}</p>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="fixed bottom-0 left-1/2 z-40 w-full max-w-app -translate-x-1/2 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2"
      >
        <div className="glass-panel flex items-center gap-2 rounded-2xl px-3 py-2">
          <input
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder="Pergunte sobre estilos, cuidados ou agenda..."
            className="h-11 min-h-11 min-w-0 flex-1 bg-transparent px-2 text-[14px] text-[#F5F5F5] outline-none placeholder:text-zinc-500"
            autoComplete="off"
            aria-label="Mensagem para o assistente"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label="Enviar mensagem"
            className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-[#F97316]/40 bg-[#1a1a1a] text-[#F97316] transition-colors hover:border-[#F97316] disabled:opacity-40"
          >
            <Send className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </form>
    </div>
  );
}
