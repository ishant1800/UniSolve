import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = ['All', 'Open', 'In Progress', 'Resolved', 'Escalated'];
const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High'];

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const statusBadge = (status) => {
  const classes = {
    Open: 'bg-sky-100 text-sky-800',
    'In Progress': 'bg-amber-100 text-amber-800',
    Resolved: 'bg-emerald-100 text-emerald-800',
    Escalated: 'bg-rose-100 text-rose-800',
  };
  return classes[status] || 'bg-slate-100 text-slate-800';
};

const slaBadge = (slaStatus) => {
  const classes = {
    OnTime: 'bg-emerald-100 text-emerald-800',
    AtRisk: 'bg-amber-100 text-amber-800',
    Breached: 'bg-rose-100 text-rose-800',
  };
  return classes[slaStatus] || 'bg-slate-100 text-slate-800';
};

const AgentDashboard = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('Open');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/tickets?assignedTo=me');
      setTickets(response.data);
      const currentId = selectedTicket ? selectedTicket._id : null;
      if (!response.data.find((ticket) => ticket._id === currentId)) {
        setSelectedTicket(response.data[0] || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load assigned tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();

    socket.on('myTicketUpdate', loadTickets);
    socket.on('ticketUpdated', loadTickets);
    socket.on('ticketCreated', loadTickets);

    return () => {
      socket.off('myTicketUpdate', loadTickets);
      socket.off('ticketUpdated', loadTickets);
      socket.off('ticketCreated', loadTickets);
    };
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || ticket.priority === priorityFilter;
      return matchesStatus && matchesPriority;
    });
  }, [tickets, statusFilter, priorityFilter]);

  const summary = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'Open').length,
    inProgress: tickets.filter((ticket) => ticket.status === 'In Progress').length,
    resolved: tickets.filter((ticket) => ticket.status === 'Resolved').length,
    escalated: tickets.filter((ticket) => ticket.status === 'Escalated').length,
  }), [tickets]);

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
  };

  useEffect(() => {
    if (selectedTicket) {
      setSelectedStatus(selectedTicket.status || 'Open');
    }
  }, [selectedTicket]);

  const handleStatusChange = async (status) => {
    if (!selectedTicket || selectedTicket.status === status) return;
    try {
      setUpdating(true);
      await api.patch(`/tickets/${selectedTicket._id}`, { status });
      await loadTickets();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Agent Dashboard</h1>
            <p className="mt-2 text-slate-600">Manage your assigned tickets and stay ahead of critical SLA trends.</p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Logged in as <span className="font-semibold">{user?.name}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Assigned', value: summary.total, color: 'bg-slate-950' },
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

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Assigned tickets</h2>
                <p className="mt-1 text-sm text-slate-500">Filter by status and priority to focus the queue.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <label htmlFor="statusFilter" className="text-sm text-slate-600">Status</label>
                  <select
                    id="statusFilter"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <label htmlFor="priorityFilter" className="text-sm text-slate-600">Priority</label>
                  <select
                    id="priorityFilter"
                    value={priorityFilter}
                    onChange={(event) => setPriorityFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-slate-600">Loading tickets...</div>
            ) : error ? (
              <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
            ) : filteredTickets.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 p-8 text-center shadow-sm">
                <p className="text-slate-600">No assigned tickets match your filters.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <div className="grid grid-cols-[1fr_140px_140px_140px] gap-4 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>Ticket</span>
                  <span>Priority</span>
                  <span>Status</span>
                  <span>SLA</span>
                </div>
                <div className="divide-y divide-slate-200 bg-white">
                  {filteredTickets.map((ticket) => (
                    <button
                      key={ticket._id}
                      type="button"
                      onClick={() => handleSelectTicket(ticket)}
                      className={`group flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-slate-50 ${selectedTicket?._id === ticket._id ? 'bg-slate-50' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{ticket.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{ticket.department} • Created {formatDate(ticket.createdAt)}</p>
                      </div>
                      <div className="flex min-w-[8rem] items-center gap-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${ticket.priority === 'High' ? 'bg-rose-100 text-rose-800' : ticket.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <div className="min-w-[8rem]">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(ticket.status)}`}>{ticket.status}</span>
                      </div>
                      <div className="min-w-[8rem]">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${slaBadge(ticket.slaStatus)}`}>{ticket.slaStatus}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Ticket details</h2>
                <p className="text-sm text-slate-500">Select a ticket to review and update status.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Assigned</span>
            </div>
            {!selectedTicket ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                Select a ticket from the list to see details.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Title</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{selectedTicket.title}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedTicket.status}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Priority</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedTicket.priority}</p>
                  </div>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">SLA</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedTicket.slaStatus}</p>
                  <p className="mt-1 text-sm text-slate-500">Deadline {formatDate(selectedTicket.deadline)}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Description</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{selectedTicket.description}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Department</p>
                    <p className="mt-2 text-sm text-slate-900">{selectedTicket.department}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Created by</p>
                    <p className="mt-2 text-sm text-slate-900">{selectedTicket.createdBy?.name || 'Unknown'}</p>
                  </div>
                </div>
                <div className="space-y-3 rounded-3xl bg-slate-50 p-4">
                  <label htmlFor="new-status" className="block text-sm font-semibold text-slate-700">Update status</label>
                  <select
                    id="new-status"
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                    disabled={updating}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    {STATUS_OPTIONS.filter((item) => item !== 'All').map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedStatus)}
                    disabled={updating || !selectedTicket || selectedStatus === selectedTicket.status}
                    className="inline-flex w-full justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updating ? 'Updating…' : 'Save status'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AgentDashboard;
