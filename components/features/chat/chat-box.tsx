import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

const FORBIDDEN_WORDS = ['palavrao1', 'palavrao2']; // Exemplo
const PAYMENT_LINK_REGEX = /(https?:\/\/)?(www\.)?(pay|checkout|stripe|paypal|picpay)\.[a-z]{2,}/i;

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = () => {
    if (!input.trim()) return;

    // Moderação de IA
    if (PAYMENT_LINK_REGEX.test(input) || FORBIDDEN_WORDS.some(word => input.toLowerCase().includes(word))) {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: '⚠️ Mensagem bloqueada: Violação das políticas de segurança.' }]);
      setInput('');
      return;
    }

    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: input }]);
    setInput('');
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="flex flex-col w-full h-[600px] bg-[#121212] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
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
