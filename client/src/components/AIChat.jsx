import { useEffect, useRef, useState } from 'react';
import { aiConversation } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const initialMessages = [
  {
    role: 'ai',
    content: 'Hi! Describe the issue you are facing, and I will draft a premium, structured ticket details card for you to review and import instantly.',
  },
];

const Spinner = () => (
  <svg className="mr-1.5 h-3.5 w-3.5 animate-spin text-current" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const AIChat = ({ onTicketReady }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingTicket, setPendingTicket] = useState(null);
  const [failedPrompt, setFailedPrompt] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingTicket]);

  const sendMessage = async (textToUse) => {
    const trimmed = (textToUse !== undefined ? textToUse : input).trim();
    if (!trimmed || loading) {
      return;
    }

    setFailedPrompt(null);

    // Optimistically update message state
    setMessages((prev) => {
      const filtered = prev.filter((m) => m.role !== 'system-error');
      const lastMsg = filtered[filtered.length - 1];
      if (lastMsg && lastMsg.role === 'user' && lastMsg.content === trimmed) {
        return filtered;
      }
      return [...filtered, { role: 'user', content: trimmed }];
    });

    if (textToUse === undefined) {
      setInput('');
    }
    setLoading(true);
    setPendingTicket(null);

    // Build the clean chat history for standard API payload
    const conversationHistory = [...messages.filter((m) => m.role === 'user' || m.role === 'ai')];
    const lastHistoryMsg = conversationHistory[conversationHistory.length - 1];
    if (!lastHistoryMsg || lastHistoryMsg.role !== 'user' || lastHistoryMsg.content !== trimmed) {
      conversationHistory.push({ role: 'user', content: trimmed });
    }

    try {
      const response = await aiConversation(trimmed, conversationHistory);
      const result = response.data;

      if (result.type === 'question') {
        setMessages((prev) => [
          ...prev.filter((m) => m.role !== 'system-error'),
          { role: 'ai', content: result.message },
        ]);
      } else if (result.type === 'ticket') {
        setMessages((prev) => [
          ...prev.filter((m) => m.role !== 'system-error'),
          { role: 'ai', content: '✨ I have successfully constructed a structured ticket draft from our conversation! Please review the details below.' },
        ]);
        setPendingTicket({
          ...result.data,
          confidence: result.data.confidence || 'Medium',
        });
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.role !== 'system-error'),
          { role: 'ai', content: 'I encountered an unexpected format response. Let’s try that again.' },
        ]);
      }
    } catch (error) {
      console.error(error);
      setFailedPrompt(trimmed);
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'system-error'),
        {
          role: 'system-error',
          content:
            error.response?.data?.message ||
            error.message ||
            'Sorry, I was unable to connect to the AI copilot engine right now.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await sendMessage();
  };

  const handleTicketChange = (field) => (event) => {
    setPendingTicket((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleUseTicket = () => {
    if (!pendingTicket) {
      return;
    }

    onTicketReady(pendingTicket);
    setMessages((prev) => [
      ...prev,
      {
        role: 'ai',
        content: '🎉 Ticket imported directly into the form! Verify the details and submit when ready.',
      },
    ]);
    setPendingTicket(null);
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI Copilot Chat</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Automate and structure ticket inputs.</p>
        </div>
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" title="AI Copilot Online" />
      </div>

      {/* Message Roster Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[380px] max-h-[420px] scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
            if (message.role === 'system-error') {
              return (
                <motion.div
                  key={`system-error-${index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-rose-900 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">
                      Connection Interrupted
                    </span>
                  </div>
                  <div className="text-xs font-semibold leading-relaxed">{message.content}</div>
                  <button
                    type="button"
                    onClick={() => sendMessage(failedPrompt)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white transition active:scale-95 shadow-sm"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89" />
                    </svg>
                    Retry Prompt
                  </button>
                </motion.div>
              );
            }

            const isUser = message.role === 'user';
            return (
              <motion.div
                key={`${message.role}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm transition-all duration-200 ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isUser ? 'text-slate-400' : 'text-slate-400'}`}>
                      {isUser ? 'Customer' : '🤖 AI Copilot'}
                    </span>
                  </div>
                  <div className="mt-1 leading-relaxed whitespace-pre-wrap">{message.content}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full justify-start"
          >
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm rounded-tl-none">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 animate-pulse">Drafting Reply</span>
                <div className="flex gap-1 items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }}></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }}></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }}></span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input controls container */}
      <form onSubmit={handleSubmit} className="mt-4 border-t border-slate-100 pt-4 space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="ai-input" className="block text-xs font-bold uppercase tracking-wider text-slate-400">Ask the co-pilot</label>
          <textarea
            id="ai-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition resize-none leading-relaxed"
            placeholder="Type your issue details here..."
            disabled={loading}
          />
        </div>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md shadow-slate-900/5"
          disabled={loading || !input.trim()}
        >
          {loading && <Spinner />}
          Send Prompt
        </motion.button>
      </form>

      {/* AI Draft proposal card */}
      <AnimatePresence>
        {pendingTicket && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.98 }}
            className="mt-6 rounded-3xl border border-amber-200 bg-amber-50/70 p-5 text-sm text-amber-950 shadow-md"
          >
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-amber-200/50 pb-2">
              <div>
                <div className="font-bold text-base text-slate-900">Review Draft Proposal</div>
                {pendingTicket.fallback && (
                  <div className="mt-1 text-xs text-amber-700">⚠️ Backup logic triggered. Please review form carefully.</div>
                )}
              </div>
              <span className="rounded-full bg-amber-100/80 border border-amber-200 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                Confidence: {pendingTicket.confidence || 'Medium'}
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Draft Title</label>
                <input
                  type="text"
                  value={pendingTicket.title}
                  onChange={handleTicketChange('title')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Draft Description</label>
                <textarea
                  value={pendingTicket.description}
                  onChange={handleTicketChange('description')}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-400 resize-none leading-relaxed"
                />
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Dept</label>
                  <select
                    value={pendingTicket.department}
                    onChange={handleTicketChange('department')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-400"
                  >
                    <option>IT</option>
                    <option>Facilities</option>
                    <option>Admin</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Priority</label>
                  <select
                    value={pendingTicket.priority}
                    onChange={handleTicketChange('priority')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-400"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleUseTicket}
                className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-3 text-sm font-bold text-white transition duration-200 shadow-md shadow-emerald-600/10"
              >
                Import Draft into Form
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIChat;
