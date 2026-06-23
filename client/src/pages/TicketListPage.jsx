import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import TicketCard from '../components/TicketCard';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const filterOptions = {
  status: ['', 'Open', 'In Progress', 'Resolved', 'Escalated', 'Closed'],
  department: ['', 'IT', 'Facilities', 'Admin'],
  priority: ['', 'Low', 'Medium', 'High'],
};

const TicketListPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState({ status: '', department: '', priority: '' });
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
      showToast(err.response?.data?.message || 'Failed to load tickets', 'error');
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
    showToast('Creating ticket in the background...', 'success');

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
    socket.on('ticketAssigned', handleSocketUpdate);
    socket.on('ticketUnassigned', handleSocketUpdate);
    socket.on('ticketReassigned', handleSocketUpdate);

    return () => {
      socket.off('ticketCreated', handleSocketUpdate);
      socket.off('ticketUpdated', handleSocketUpdate);
      socket.off('ticketAssigned', handleSocketUpdate);
      socket.off('ticketUnassigned', handleSocketUpdate);
      socket.off('ticketReassigned', handleSocketUpdate);
    };
  }, [location]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      return (
        (!filter.status || ticket.status === filter.status) &&
        (!filter.department || ticket.department === filter.department) &&
        (!filter.priority || ticket.priority === filter.priority)
      );
    });
  }, [tickets, filter]);

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
      showToast(err?.response?.data?.message || 'Update failed. Reverted changes.', 'error');
    } finally {
      endMutation(ticket._id);
    }
  }, [tickets, user]);

  return (
    <div className="space-y-6">
      {/* Premium Page Title Banner */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Ticket Queue</h1>
        <p className="text-sm text-slate-500 font-medium font-sans">Filter, audit, and coordinate campus-wide helpdesk tickets in real time.</p>
      </div>

      {/* Header controls block */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Search Filters</h2>
            <p className="text-xs text-slate-400 font-semibold">Refine active queues by status, department, and urgency.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <span className="rounded-full bg-slate-50 border px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">{filteredTickets.length} matches</span>
            <button
              type="button"
              onClick={() => setFilter({ status: '', department: '', priority: '' })}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              Clear filters
            </button>
            <Link
              to="/create-ticket"
              className="rounded-full bg-indigo-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 shadow-sm hover:shadow active:scale-95"
            >
              ✍️ New Ticket
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Options grids */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Object.entries(filterOptions).map(([key, options]) => (
          <label key={key} className="block rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 capitalize">{key}</span>
            <select
              value={filter[key]}
              onChange={(e) => setFilter((prev) => ({ ...prev, [key]: e.target.value }))}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition duration-150"
            >
              {options.map((option) => (
                <option key={option} value={option}>{option || `All ${key}`}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {/* Content list queues */}
      {loading ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 text-slate-400 font-semibold py-8 animate-pulse text-center">Loading ticket roster...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-3xl bg-slate-50 p-8 text-center border border-dashed border-slate-200 text-slate-500 font-semibold">No active tickets match the selected filters.</div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {filteredTickets.map((ticket, idx) => (
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

export default TicketListPage;
