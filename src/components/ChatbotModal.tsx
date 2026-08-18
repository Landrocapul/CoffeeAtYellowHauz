import React, { useState, useRef, useEffect } from 'react';
import { AppStore } from '../services/store';
import { MessageSquare, Send, X, Bot, User as UserIcon, Sparkles } from 'lucide-react';

interface ChatbotModalProps {
  onClose: () => void;
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

const QUICK_PROMPTS = [
  '⭐ What are the best sellers?',
  '⏰ What are your store hours?',
  '💳 What payment methods are accepted?',
  '🪑 How do I reserve a table?',
  '🏷️ How do discounts work?',
];

export const ChatbotModal: React.FC<ChatbotModalProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: 'Hi there! ☕ Welcome to Coffee at Yellow Hauz. How can I help you today? Ask me about menu favorites, table reservations, store hours, or POS operations!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { sender: 'user', text: query, time };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');

    setTimeout(() => {
      const reply = AppStore.getChatbotResponse(query);
      const botMsg: Message = {
        sender: 'bot',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="flex flex-col w-full max-w-lg h-[600px] max-h-[90vh] rounded-3xl bg-white shadow-2xl overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between bg-stone-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500 text-stone-950">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <span>Yellow Hauz Assistant</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <p className="text-[11px] text-stone-400">Instant answers for guests &amp; staff</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/60">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  msg.sender === 'user'
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-900 text-amber-400'
                }`}
              >
                {msg.sender === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-amber-500 text-stone-950 font-medium rounded-tr-xs'
                    : 'bg-white text-stone-800 border border-stone-200/80 shadow-xs rounded-tl-xs whitespace-pre-line'
                }`}
              >
                {msg.text}
                <div
                  className={`mt-1 text-[10px] text-right ${
                    msg.sender === 'user' ? 'text-stone-800' : 'text-stone-400'
                  }`}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="border-t border-stone-200 bg-white px-4 py-2.5 overflow-x-auto flex gap-2">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-medium text-stone-700 hover:bg-amber-100 hover:border-amber-300 transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t border-stone-200 bg-white p-3.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about menu, orders, tables..."
              className="flex-1 rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-stone-950 disabled:opacity-40 hover:bg-amber-400 transition"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
