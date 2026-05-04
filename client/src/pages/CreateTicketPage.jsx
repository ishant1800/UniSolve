import { useState } from 'react';
import api from '../services/api';
import AIChat from '../components/AIChat';

const initialForm = {
  title: '',
  description: '',
  department: 'IT',
  priority: 'Medium',
};

const CreateTicketPage = () => {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setMessageType('info');
    setLoading(true);

    try {
      await api.post('/tickets', form);
      setMessage('Ticket created successfully!');
      setForm(initialForm);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create ticket');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleTicketReady = (ticket) => {
    setForm({
      title: ticket.title,
      description: ticket.description,
      department: ticket.department,
      priority: ticket.priority,
    });

    if (ticket.fallback) {
      setMessage('⚠ AI is unavailable, please review the ticket before submitting.');
      setMessageType('warning');
    } else {
      setMessage('AI ticket draft loaded. Review and submit.');
      setMessageType('info');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Create Ticket</h1>
        <p className="mt-2 text-slate-600">Use the form below or the AI assistant to generate ticket details.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl bg-white p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={handleChange('title')}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={handleChange('description')}
              className="mt-3 h-40 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Department</label>
              <select
                value={form.department}
                onChange={handleChange('department')}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"
              >
                <option>IT</option>
                <option>Facilities</option>
                <option>Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Priority</label>
              <select
                value={form.priority}
                onChange={handleChange('priority')}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-3 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Creating ticket...' : 'Create Ticket'}
          </button>

          {message && (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                messageType === 'warning'
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : messageType === 'error'
                  ? 'border-rose-300 bg-rose-50 text-rose-900'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              {message}
            </div>
          )}
        </form>

        <aside className="rounded-3xl bg-white p-6 shadow-sm">
          <AIChat onTicketReady={handleTicketReady} />
        </aside>
      </div>
    </div>
  );
};

export default CreateTicketPage;
