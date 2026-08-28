import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { validateChatMessage } from "@/lib/utils/chat-moderation";

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

const FORBIDDEN_WORDS = ['palavrao1', 'palavrao2']; // Exemplo
const PAYMENT_LINK_REGEX = /(https?:\/\/)?(www\.)?(pay|checkout|stripe|paypal|picpay)\.[a-z]{2,}/i;

export function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Bloqueio duplo: UI já bloqueia, backend é a camada final (chamada será feita abaixo)
    const { isValid, error } = validateChatMessage(input);

    if (!isValid) {
      alert(error);
      return;
    }

    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: input }]);

    // Injeção cirúrgica: Chamada ao backend para dupla validação
    try {
      await fetch('/api/chat/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: input }) // Id e destinatário devem ser geridos pelo contexto
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
          placeholder="Digite sua mensagem..."
        />
        <button onClick={sendMessage} className="text-orange-500 hover:text-orange-400">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

