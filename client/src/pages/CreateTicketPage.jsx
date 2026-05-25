import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const AIChat = lazy(() => import('../components/AIChat'));

const initialForm = {
  title: '',
  description: '',
  department: 'IT',
  priority: 'Medium',
};

const CreateTicketPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    navigate('/dashboard', { state: { newTicketPayload: form } });
  };

  const handleTicketReady = (ticket) => {
    setForm({
      title: ticket.title,
      description: ticket.description,
      department: ticket.department,
      priority: ticket.priority,
    });

    if (ticket.fallback) {
      setMessage('⚠️ AI is currently unavailable. Please review the ticket content manually before submitting.');
      setMessageType('warning');
    } else {
      setMessage('✨ AI ticket draft loaded successfully! Please review and click Create Ticket.');
      setMessageType('info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Page Header */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Create Ticket</h1>
        <p className="text-sm text-slate-500 font-medium">Use the form below or chat with the co-pilot AI assistant to draft details automatically.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1.2fr]">
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100"
        >
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={handleChange('title')}
              placeholder="Brief summary of the issue..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Description</label>
            <textarea
              value={form.description}
              onChange={handleChange('description')}
              placeholder="Provide a detailed explanation of the issue..."
              className="h-44 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all duration-200 resize-none leading-relaxed"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Department</label>
              <select
                value={form.department}
                onChange={handleChange('department')}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
              >
                <option>IT</option>
                <option>Facilities</option>
                <option>Admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Priority</label>
              <select
                value={form.priority}
                onChange={handleChange('priority')}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="rounded-2xl bg-slate-900 hover:bg-slate-800 px-6 py-3.5 text-sm font-bold text-white transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-slate-900/10 inline-flex items-center justify-center"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Create Ticket'}
          </motion.button>

          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl border px-4 py-3.5 text-xs font-semibold leading-normal ${
                messageType === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : messageType === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-indigo-100 bg-indigo-50/50 text-indigo-800'
              }`}
            >
              {message}
            </motion.div>
          )}
        </motion.form>

        <aside className="w-full">
          <Suspense fallback={
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 animate-pulse h-96 flex flex-col justify-center items-center gap-3">
              <div className="h-6 w-1/2 rounded bg-slate-200"></div>
              <div className="h-4 w-2/3 rounded bg-slate-200"></div>
              <div className="h-32 w-full rounded-2xl bg-slate-50 mt-4"></div>
            </div>
          }>
            <AIChat onTicketReady={handleTicketReady} />
          </Suspense>
        </aside>
      </div>
    </div>
  );
};

export default CreateTicketPage;
