import { useEffect, useRef, useState } from 'react';
import { aiConversation } from '../services/api';

const initialMessages = [
  {
    role: 'ai',
    content: 'Hi! Describe the issue and I will ask follow-up questions if needed before drafting your ticket.',
  },
];

const AIChat = ({ onTicketReady }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingTicket, setPendingTicket] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingTicket]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) {
      return;
    }

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setPendingTicket(null);

    try {
      const response = await aiConversation(trimmed, nextMessages);
      const result = response.data;

      if (result.type === 'question') {
        setMessages((prev) => [...prev, { role: 'ai', content: result.message }]);
      } else if (result.type === 'ticket') {
        setMessages((prev) => [...prev, { role: 'ai', content: 'I have a ticket draft ready for you to review.' }]);
        setPendingTicket({
          ...result.data,
          confidence: result.data.confidence || 'Medium',
        });
      } else {
        setMessages((prev) => [...prev, { role: 'ai', content: 'I could not process that response. Please try again.' }]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content:
            error.response?.data?.message ||
            error.message ||
            'Sorry, I could not reach the AI service right now.',
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
        content: 'Ticket imported into the form. Please review and submit when ready.',
      },
    ]);
    setPendingTicket(null);
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">AI Ticket Chat</h2>
          <p className="mt-2 text-slate-600">Chat with the assistant and fill the ticket form automatically.</p>
        </div>
      </div>

      <div className="mt-6 space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 h-[420px] overflow-y-auto">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className="space-y-2">
            <div className={`inline-block rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 border border-slate-200'}`}>
              <div className="text-xs uppercase tracking-wide text-slate-500">{message.role === 'user' ? 'You' : 'AI'}</div>
              <div className="mt-1 whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700">
            AI is typing...
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-slate-700">Ask the AI</label>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 focus:border-slate-500 focus:outline-none"
          placeholder="Describe the issue, or answer the assistant's question."
          disabled={loading}
        />

        <button
          type="submit"
          className="w-full rounded-xl bg-slate-900 px-5 py-3 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading || !input.trim()}
        >
          Send message
        </button>
      </form>

      {pendingTicket && (
        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Review proposed ticket</div>
              {pendingTicket.fallback && (
                <div className="mt-1 text-amber-700">⚠ AI is unavailable, please review the ticket before submitting.</div>
              )}
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              Confidence: {pendingTicket.confidence || 'Medium'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Title</label>
              <input
                type="text"
                value={pendingTicket.title}
                onChange={handleTicketChange('title')}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Description</label>
              <textarea
                value={pendingTicket.description}
                onChange={handleTicketChange('description')}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">Department</label>
                <select
                  value={pendingTicket.department}
                  onChange={handleTicketChange('department')}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                >
                  <option>IT</option>
                  <option>Facilities</option>
                  <option>Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">Priority</label>
                <select
                  value={pendingTicket.priority}
                  onChange={handleTicketChange('priority')}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUseTicket}
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-white transition hover:bg-emerald-500"
            >
              Use this ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;
