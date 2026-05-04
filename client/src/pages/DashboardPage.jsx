import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import TicketCard from '../components/TicketCard';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets');
      setTickets(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();

    socket.on('ticketCreated', loadTickets);
    socket.on('ticketUpdated', loadTickets);
    socket.on('ticketsEscalated', loadTickets);

    return () => {
      socket.off('ticketCreated', loadTickets);
      socket.off('ticketUpdated', loadTickets);
      socket.off('ticketsEscalated', loadTickets);
    };
  }, []);

  const summary = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((item) => item.status === 'Open').length,
    inProgress: tickets.filter((item) => item.status === 'In Progress').length,
    resolved: tickets.filter((item) => item.status === 'Resolved').length,
    escalated: tickets.filter((item) => item.status === 'Escalated').length,
  }), [tickets]);

  const handleUpdate = async (ticket, status) => {
    try {
      await api.put(`/tickets/${ticket._id}`, { status });
      await loadTickets();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Welcome back, {user?.name}</h1>
        <p className="mt-2 text-slate-600">Use UniSolve to manage campus support tickets in one place.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total tickets', value: summary.total, color: 'bg-slate-950' },
          { label: 'Open', value: summary.open, color: 'bg-blue-700' },
          { label: 'In Progress', value: summary.inProgress, color: 'bg-amber-600' },
          { label: 'Escalated', value: summary.escalated, color: 'bg-rose-600' },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl bg-white p-5 shadow-sm">
            <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold text-white ${item.color}`}>
              {item.label}
            </div>
            <p className="mt-4 text-4xl font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-slate-900">Recent tickets</h2>
          <span className="text-sm text-slate-500">Role: {user?.role}</span>
        </div>

        {loading ? (
          <div className="text-slate-600">Loading tickets...</div>
        ) : error ? (
          <div className="rounded-lg bg-rose-100 px-4 py-3 text-rose-700">{error}</div>
        ) : tickets.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-8 text-center shadow-sm">
            <p className="text-slate-600">No tickets found yet. Create your first ticket to get started.</p>
            <Link
              to="/create-ticket"
              className="mt-4 inline-flex rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Create a ticket
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.slice(0, 3).map((ticket) => (
              <TicketCard key={ticket._id} ticket={ticket} onUpdate={handleUpdate} userRole={user?.role} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
