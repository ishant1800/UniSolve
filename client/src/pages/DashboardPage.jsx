import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import TicketCard from '../components/TicketCard';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Premium Toast States
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Reconcile and optimize socket vs optimistic locks
  const mutatingTicketsRef = useRef(new Set());
  const [mutatingTickets, setMutatingTickets] = useState(new Set());

  const startMutation = (ticketId) => {
    mutatingTicketsRef.current.add(ticketId);
    setMutatingTickets(new Set(mutatingTicketsRef.current));
  };

  const endMutation = (ticketId) => {
    mutatingTicketsRef.current.delete(ticketId);
    setMutatingTickets(new Set(mutatingTicketsRef.current));
  };

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets');
      setTickets((prev) => {
        const optimistic = prev.filter((t) => t.isOptimistic);
        const responseDataFiltered = response.data.filter(
          (rt) => !optimistic.some((ot) => ot.title === rt.title && ot.description === rt.description)
        );
        return [...optimistic, ...responseDataFiltered];
      });
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not load tickets', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBackgroundCreation = async (payload) => {
    const tempId = `opt-${Date.now()}`;
    const optTicket = {
      _id: tempId,
      title: payload.title,
      description: payload.description,
      department: payload.department,
      priority: payload.priority,
      status: 'Open',
      slaStatus: 'OnTime',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdBy: { name: user?.name || 'Me' },
      isOptimistic: true,
    };

    setTickets((prev) => [optTicket, ...prev]);
    showToast('Creating your ticket in the background...', 'success');

    try {
      const response = await api.post('/tickets', payload);
      setTickets((prev) =>
        prev.map((t) => (t._id === tempId ? response.data : t))
      );
      showToast('Ticket created successfully!', 'success');
    } catch (err) {
      console.error(err);
      setTickets((prev) => prev.filter((t) => t._id !== tempId));
      showToast(err.response?.data?.message || 'Failed to create ticket in the background.', 'error');
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadTickets();
      if (location.state?.newTicketPayload) {
        const payload = location.state.newTicketPayload;
        window.history.replaceState({}, document.title);
        handleBackgroundCreation(payload);
      }
    };
    init();

    const handleSocketUpdate = (updatedTicket) => {
      // Reconcile socket updates to avoid overwriting newer local in-flight optimistic updates
      if (mutatingTicketsRef.current.has(updatedTicket._id)) {
        return;
      }

      setTickets((prev) => {
        const exists = prev.some((t) => t._id === updatedTicket._id);
        if (!exists) {
          return [updatedTicket, ...prev];
        }
        return prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t));
      });
    };

    socket.on('ticketCreated', handleSocketUpdate);
    socket.on('ticketUpdated', handleSocketUpdate);
    socket.on('ticketsEscalated', handleSocketUpdate);
    socket.on('ticketAssigned', handleSocketUpdate);
    socket.on('ticketUnassigned', handleSocketUpdate);
    socket.on('ticketReassigned', handleSocketUpdate);

    return () => {
      socket.off('ticketCreated', handleSocketUpdate);
      socket.off('ticketUpdated', handleSocketUpdate);
      socket.off('ticketsEscalated', handleSocketUpdate);
      socket.off('ticketAssigned', handleSocketUpdate);
      socket.off('ticketUnassigned', handleSocketUpdate);
      socket.off('ticketReassigned', handleSocketUpdate);
    };
  }, [location]);

  const summary = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((item) => item.status === 'Open').length,
    inProgress: tickets.filter((item) => item.status === 'In Progress').length,
    resolved: tickets.filter((item) => item.status === 'Resolved').length,
    escalated: tickets.filter((item) => item.status === 'Escalated').length,
  }), [tickets]);

  const handleUpdate = useCallback(async (ticket, fields) => {
    const updatePayload = typeof fields === 'string' ? { status: fields } : fields;
    
    // Prevent duplicate triggers
    if (mutatingTicketsRef.current.has(ticket._id)) return;
    startMutation(ticket._id);

    const previousTickets = [...tickets];

    // Optimistic UI updates
    let optimisticFields = { ...updatePayload };
    if (updatePayload.assignedTo !== undefined) {
      const isClaim = !!updatePayload.assignedTo;
      optimisticFields.assignedTo = isClaim
        ? { _id: updatePayload.assignedTo, name: user?.name, role: user?.role }
        : null;
      optimisticFields.assignedBy = isClaim
        ? { _id: user?._id, name: user?.name, role: user?.role }
        : null;
      optimisticFields.assignedAt = isClaim ? new Date().toISOString() : null;
    }

    setTickets((prev) =>
      prev.map((t) => (t._id === ticket._id ? { ...t, ...optimisticFields } : t))
    );

    try {
      if (updatePayload.assignedTo !== undefined) {
        const response = await api.put(`/tickets/${ticket._id}/assign`, { agentId: updatePayload.assignedTo || null });
        setTickets((prev) =>
          prev.map((t) => (t._id === ticket._id ? response.data : t))
        );
        showToast(updatePayload.assignedTo ? 'Ticket successfully assigned to you!' : 'Ticket released.', 'success');
      } else {
        const response = await api.patch(`/tickets/${ticket._id}`, updatePayload);
        setTickets((prev) =>
          prev.map((t) => (t._id === ticket._id ? response.data : t))
        );
        showToast(`Ticket status updated to "${updatePayload.status || 'Updated'}"`, 'success');
      }
    } catch (err) {
      console.error(err);
      setTickets(previousTickets);
      showToast(err.response?.data?.message || 'Failed to update ticket. Reverted changes.', 'error');
    } finally {
      endMutation(ticket._id);
    }
  }, [tickets, user]);

  return (
    <div className="space-y-6">
      {/* Dynamic Dashboard Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Glow Spheres */}
        <div className="absolute top-[-30%] right-[-10%] h-[300px] w-[300px] rounded-full bg-indigo-500/5 blur-[60px] pointer-events-none" />
        <div className="absolute bottom-[-30%] left-[-10%] h-[200px] w-[200px] rounded-full bg-purple-500/5 blur-[50px] pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">Welcome back, {user?.name}</h1>
          <p className="text-sm text-slate-500 font-medium">Coordinate, assign, and resolve campus ticketing queues in real time.</p>
        </div>
        <div className="relative z-10 shrink-0">
          <Link
            to="/create-ticket"
            className="inline-flex rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-bold text-white transition duration-200 active:scale-95 shadow-md shadow-indigo-600/10"
          >
            ✍️ Create Ticket
          </Link>
        </div>
      </div>

      {/* Grid Summaries */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total active tickets', value: summary.total, color: 'bg-slate-950 border border-slate-800' },
          { label: 'Open tickets', value: summary.open, color: 'bg-blue-700 border border-blue-800' },
          { label: 'In Progress', value: summary.inProgress, color: 'bg-amber-600 border border-amber-700' },
          { label: 'Escalated tickets', value: summary.escalated, color: 'bg-rose-600 border border-rose-700' },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between"
          >
            <div className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white ${item.color}`}>
              {item.label}
            </div>
            <p className="mt-4 text-4xl font-extrabold text-slate-900 tracking-tight leading-none">{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent tickets list */}
      <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recent campus tickets</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Quick queue overview. Browse details to claim or process.</p>
          </div>
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 bg-slate-50 border px-3 py-1.5 rounded-full">Role: {user?.role}</span>
        </div>

        {loading ? (
          <div className="text-slate-400 font-semibold py-8 animate-pulse text-center">Loading ticket queue...</div>
        ) : tickets.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-8 text-center border border-dashed border-slate-200">
            <p className="text-slate-500 font-semibold">No active tickets found. Click below to file a new case.</p>
            <Link
              to="/create-ticket"
              className="mt-4 inline-flex rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-xs font-bold text-white transition shadow-sm active:scale-95"
            >
              File a new Ticket
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {tickets.slice(0, 3).map((ticket, idx) => (
                <motion.div
                  key={ticket._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <TicketCard ticket={ticket} onUpdate={handleUpdate} userRole={user?.role} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Floating Premium Toast Notifications List */}
      <div className="fixed bottom-5 left-4 right-4 md:left-auto md:right-5 md:w-96 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg border text-xs font-bold pointer-events-auto transition-all duration-300 transform translate-y-0 ${
              t.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {t.type === 'success' ? (
              <svg className="h-4.5 w-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4.5 w-4.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="ml-auto text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
