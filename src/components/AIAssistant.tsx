'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ScreenContext {
  currentUser?: { name: string; email: string } | null;
  activeTab?: string;
  proposals?: any[];
  recentMessages?: any[];
  notifications?: any[];
  chatMode?: string;
  chatPartner?: string;
  selectedProposal?: any;
}

interface AIAssistantProps {
  screenContext: ScreenContext;
}

export default function AIAssistant({ screenContext }: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const contextSummary = () => {
    const parts: string[] = [];
    if (screenContext.proposals?.length) {
      parts.push(`${screenContext.proposals.length} proposal(s)`);
    }
    if (screenContext.recentMessages?.length) {
      parts.push(`${screenContext.recentMessages.length} recent message(s)`);
    }
    if (screenContext.notifications?.length) {
      parts.push(`${screenContext.notifications.length} notification(s)`);
    }
    if (parts.length === 0) return 'Reading app state...';
    return `Reading: ${parts.join(', ')}`;
  };

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, screenContext }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to get response');
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="w-[min(24rem,calc(100vw-1.5rem))] sm:w-96 bg-white rounded-2xl shadow-2xl border border-amber-200 flex flex-col overflow-hidden"
          style={{ height: '480px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">Dorm AI Assistant</h3>
              <p className="text-amber-100 text-xs mt-0.5 truncate">{contextSummary()}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white hover:text-amber-200 text-lg leading-none p-1"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-amber-50/30">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-xs pt-8 px-4">
                <div className="text-3xl mb-2">🤖</div>
                <p>Hi! I&apos;m your dorm AI assistant.</p>
                <p className="mt-1">I can see your current proposals, messages, and notifications to help answer your questions.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-amber-100 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-amber-100 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
                  <span className="flex gap-1 items-center text-amber-500 text-sm">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-amber-100 bg-white flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about the dorm..."
              rows={1}
              className="flex-1 resize-none border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800 placeholder-gray-400"
              style={{ maxHeight: '80px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white rounded-xl px-3 py-2 text-sm font-medium transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="AI Assistant"
        className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full shadow-xl ring-2 ring-white/80 flex items-center justify-center text-2xl transition-all hover:scale-105 active:scale-95"
      >
        {open ? '×' : '🤖'}
      </button>
    </div>
  );
}
