import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import TicketCard from '../components/TicketCard';
import { useAuth } from '../context/AuthContext';

const filterOptions = {
  status: ['', 'Open', 'In Progress', 'Resolved', 'Escalated', 'Closed'],
  department: ['', 'IT', 'Facilities', 'Admin'],
  priority: ['', 'Low', 'Medium', 'High'],
};

const TicketListPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState({ status: '', department: '', priority: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets');
      setTickets(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();

    socket.on('ticketUpdated', loadTickets);
    socket.on('ticketCreated', loadTickets);

    return () => {
      socket.off('ticketUpdated', loadTickets);
      socket.off('ticketCreated', loadTickets);
    };
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      return (
        (!filter.status || ticket.status === filter.status) &&
        (!filter.department || ticket.department === filter.department) &&
        (!filter.priority || ticket.priority === filter.priority)
      );
    });
  }, [tickets, filter]);

  const handleUpdate = async (ticket, status) => {
    try {
      await api.put(`/tickets/${ticket._id}`, { status });
      await loadTickets();
    } catch (err) {
      console.error(err?.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Ticket List</h1>
        <p className="mt-2 text-slate-600">Filter, review, and manage campus helpdesk tickets.</p>
      </div>

      <div className="mb-4 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Filter tickets</h2>
            <p className="mt-1 text-sm text-slate-500">Refine the list by status, department, or priority.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">{filteredTickets.length} matches</span>
            <button
              type="button"
              onClick={() => setFilter({ status: '', department: '', priority: '' })}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Clear filters
            </button>
            <Link
              to="/create-ticket"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              New ticket
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.entries(filterOptions).map(([key, options]) => (
          <label key={key} className="block rounded-3xl bg-white p-4 shadow-sm">
            <span className="text-sm font-medium text-slate-700 capitalize">{key}</span>
            <select
              value={filter[key]}
              onChange={(e) => setFilter((prev) => ({ ...prev, [key]: e.target.value }))}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"
            >
              {options.map((option) => (
                <option key={option} value={option}>{option || `All ${key}`}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {loading ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm text-slate-600">Loading tickets...</div>
      ) : error ? (
        <div className="rounded-3xl bg-rose-100 p-6 text-rose-700 shadow-sm">{error}</div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm text-slate-600">No tickets match the current filters.</div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
            <TicketCard key={ticket._id} ticket={ticket} onUpdate={handleUpdate} userRole={user?.role} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketListPage;
