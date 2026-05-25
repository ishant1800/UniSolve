import { useEffect, useMemo, useState, useRef } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = ['All', 'Open', 'In Progress', 'Resolved', 'Escalated'];
const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High'];

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const statusBadge = (status) => {
  const classes = {
    Open: 'bg-sky-100 text-sky-800 border border-sky-200',
    'In Progress': 'bg-amber-100 text-amber-800 border border-amber-200',
    Resolved: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    Escalated: 'bg-rose-100 text-rose-800 border border-rose-200',
  };
  return classes[status] || 'bg-slate-100 text-slate-800 border border-slate-200';
};

const slaBadge = (slaStatus) => {
  const classes = {
    OnTime: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    AtRisk: 'bg-amber-100 text-amber-800 border border-amber-200',
    Breached: 'bg-rose-100 text-rose-800 border border-rose-200',
  };
  return classes[slaStatus] || 'bg-slate-100 text-slate-800 border border-slate-200';
};

const Spinner = () => (
  <svg className="mr-1.5 h-3.5 w-3.5 animate-spin text-current" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const AgentDashboard = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('Open');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assignmentFilter, setAssignmentFilter] = useState('Me');
  const [agents, setAgents] = useState([]);
  const [agentSearch, setAgentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

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

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets');
      setTickets(response.data);
      const currentId = selectedTicket ? selectedTicket._id : null;
      const found = response.data.find((ticket) => ticket._id === currentId);
      if (found) {
        setSelectedTicket(found);
      } else {
        setSelectedTicket(response.data[0] || null);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    if (user?.role !== 'admin') return;
    try {
      const response = await api.get('/users/agents');
      setAgents(response.data);
    } catch (err) {
      console.error('Failed to load agents list:', err);
    }
  };

  useEffect(() => {
    loadTickets();
    if (user?.role === 'admin') {
      loadAgents();
    }

    const handleSocketUpdate = (updatedTicket) => {
      // Reconcile Optimistic Lock: If this ticket is actively mutating, ignore socket broadcasts to avoid overwrites
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

      setSelectedTicket((prev) => {
        if (prev && prev._id === updatedTicket._id) {
          return updatedTicket;
        }
        return prev;
      });
    };

    socket.on('myTicketUpdate', handleSocketUpdate);
    socket.on('ticketUpdated', handleSocketUpdate);
    socket.on('ticketCreated', handleSocketUpdate);
    socket.on('ticketAssigned', handleSocketUpdate);
    socket.on('ticketUnassigned', handleSocketUpdate);
    socket.on('ticketReassigned', handleSocketUpdate);

    return () => {
      socket.off('myTicketUpdate', handleSocketUpdate);
      socket.off('ticketUpdated', handleSocketUpdate);
      socket.off('ticketCreated', handleSocketUpdate);
      socket.off('ticketAssigned', handleSocketUpdate);
      socket.off('ticketUnassigned', handleSocketUpdate);
      socket.off('ticketReassigned', handleSocketUpdate);
    };
  }, [user]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' || ticket.priority === priorityFilter;

      let matchesAssignment = true;
      if (assignmentFilter === 'Me') {
        matchesAssignment = ticket.assignedTo?._id === user?._id || ticket.assignedTo === user?._id;
      } else if (assignmentFilter === 'Unassigned') {
        matchesAssignment = !ticket.assignedTo;
      }

      return matchesStatus && matchesPriority && matchesAssignment;
    });
  }, [tickets, statusFilter, priorityFilter, assignmentFilter, user]);

  const agentWorkload = useMemo(() => {
    const counts = {};
    tickets.forEach((t) => {
      if (t.assignedTo && t.status !== 'Resolved' && t.status !== 'Closed') {
        const id = t.assignedTo._id || t.assignedTo;
        counts[id] = (counts[id] || 0) + 1;
      }
    });
    return counts;
  }, [tickets]);

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) =>
      agent.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
      agent.email.toLowerCase().includes(agentSearch.toLowerCase())
    );
  }, [agents, agentSearch]);

  const summary = useMemo(() => ({
    total: tickets.filter((t) => t.assignedTo?._id === user?._id || t.assignedTo === user?._id).length,
    open: tickets.filter((t) => (t.assignedTo?._id === user?._id || t.assignedTo === user?._id) && t.status === 'Open').length,
    inProgress: tickets.filter((t) => (t.assignedTo?._id === user?._id || t.assignedTo === user?._id) && t.status === 'In Progress').length,
    resolved: tickets.filter((t) => (t.assignedTo?._id === user?._id || t.assignedTo === user?._id) && t.status === 'Resolved').length,
    escalated: tickets.filter((t) => (t.assignedTo?._id === user?._id || t.assignedTo === user?._id) && t.status === 'Escalated').length,
  }), [tickets, user]);

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
    if (mutatingTickets.has(selectedTicket._id)) return; // Prevent duplicate requests
    
    startMutation(selectedTicket._id);
    const previousTickets = [...tickets];
    const previousSelectedTicket = { ...selectedTicket };
    const updatedTicket = { ...selectedTicket, status };

    // Optimistic UI updates
    setSelectedTicket(updatedTicket);
    setTickets((prev) =>
      prev.map((t) => (t._id === selectedTicket._id ? updatedTicket : t))
    );

    try {
      setUpdating(true);
      setSelectedStatus(status);
      await api.patch(`/tickets/${selectedTicket._id}`, { status });
      await loadTickets();
      showToast(`Ticket status updated to "${status}"`, 'success');
    } catch (err) {
      console.error(err);
      // Rollback
      setTickets(previousTickets);
      setSelectedTicket(previousSelectedTicket);
      setSelectedStatus(previousSelectedTicket.status);
      showToast(err.response?.data?.message || 'Failed to update ticket status. Reverted change.', 'error');
    } finally {
      setUpdating(false);
      endMutation(previousSelectedTicket._id);
    }
  };

  const handleAssign = async (assignToMe) => {
    if (!selectedTicket) return;
    if (mutatingTickets.has(selectedTicket._id)) return; // Prevent duplicate requests

    startMutation(selectedTicket._id);
    const previousTickets = [...tickets];
    const previousSelectedTicket = { ...selectedTicket };
    
    const updatedTicket = {
      ...selectedTicket,
      assignedTo: assignToMe ? { _id: user._id, name: user.name, role: user.role } : null,
      assignedBy: assignToMe ? { _id: user._id, name: user.name, role: user.role } : null,
      assignedAt: assignToMe ? new Date().toISOString() : null,
    };

    // Optimistic UI updates
    setSelectedTicket(updatedTicket);
    setTickets((prev) =>
      prev.map((t) => (t._id === selectedTicket._id ? updatedTicket : t))
    );

    try {
      setUpdating(true);
      const response = await api.put(`/tickets/${selectedTicket._id}/assign`, {
        agentId: assignToMe ? user._id : null
      });
      setSelectedTicket(response.data);
      setTickets((prev) =>
        prev.map((t) => (t._id === selectedTicket._id ? response.data : t))
      );
      showToast(assignToMe ? 'Ticket successfully assigned to you!' : 'Ticket assignment released.', 'success');
    } catch (err) {
      console.error(err);
      // Rollback
      setTickets(previousTickets);
      setSelectedTicket(previousSelectedTicket);
      showToast(err.response?.data?.message || 'Failed to update ticket assignment. Reverted change.', 'error');
    } finally {
      setUpdating(false);
      endMutation(previousSelectedTicket._id);
    }
  };

  const handleAdminAssign = async (agentId) => {
    if (!selectedTicket) return;
    if (mutatingTickets.has(selectedTicket._id)) return; // Prevent duplicate requests

    startMutation(selectedTicket._id);
    const previousTickets = [...tickets];
    const previousSelectedTicket = { ...selectedTicket };

    const targetAgent = agents.find((a) => a._id === agentId);
    const updatedTicket = {
      ...selectedTicket,
      assignedTo: targetAgent ? { _id: targetAgent._id, name: targetAgent.name, role: targetAgent.role } : null,
      assignedBy: targetAgent ? { _id: user._id, name: user.name, role: user.role } : null,
      assignedAt: targetAgent ? new Date().toISOString() : null,
    };

    // Optimistic UI updates
    setSelectedTicket(updatedTicket);
    setTickets((prev) =>
      prev.map((t) => (t._id === selectedTicket._id ? updatedTicket : t))
    );

    try {
      setUpdating(true);
      const response = await api.put(`/tickets/${selectedTicket._id}/assign`, { agentId: agentId || null });
      setSelectedTicket(response.data);
      setTickets((prev) =>
        prev.map((t) => (t._id === selectedTicket._id ? response.data : t))
      );
      showToast(targetAgent ? `Ticket successfully assigned to ${targetAgent.name}` : 'Ticket assignment released.', 'success');
    } catch (err) {
      console.error(err);
      // Rollback
      setTickets(previousTickets);
      setSelectedTicket(previousSelectedTicket);
      showToast(err.response?.data?.message || 'Failed to reassign ticket. Reverted changes.', 'error');
    } finally {
      setUpdating(false);
      endMutation(previousSelectedTicket._id);
    }
  };

  return (
    <div>
      <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Agent Dashboard</h1>
            <p className="mt-2 text-slate-600">Manage your assigned tickets and stay ahead of critical SLA trends.</p>
          </div>
          <div className="rounded-full bg-slate-50 px-4 py-2 text-sm text-slate-700 font-medium border border-slate-200">
            Logged in as <span className="font-semibold text-slate-900">{user?.name}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Assigned', value: summary.total, color: 'bg-slate-950 border border-slate-800' },
              { label: 'Open', value: summary.open, color: 'bg-blue-700 border border-blue-800' },
              { label: 'In Progress', value: summary.inProgress, color: 'bg-amber-600 border border-amber-700' },
              { label: 'Escalated', value: summary.escalated, color: 'bg-rose-600 border border-rose-700' },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
                <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white ${item.color}`}>
                  {item.label}
                </div>
                <p className="mt-4 text-4xl font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>

          <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 font-sans">Assigned tickets</h2>
                <p className="mt-1 text-sm text-slate-500">Filter by status and priority to focus the queue.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <label htmlFor="statusFilter" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
                  <select
                    id="statusFilter"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-900 font-semibold focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <label htmlFor="priorityFilter" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</label>
                  <select
                    id="priorityFilter"
                    value={priorityFilter}
                    onChange={(event) => setPriorityFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-900 font-semibold focus:outline-none"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <label htmlFor="assignmentFilter" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Queue</label>
                  <select
                    id="assignmentFilter"
                    value={assignmentFilter}
                    onChange={(event) => setAssignmentFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-900 font-semibold focus:outline-none"
                  >
                    <option value="Me">Assigned to Me</option>
                    <option value="Unassigned">Unassigned</option>
                    <option value="All">All Tickets</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-slate-500 font-medium py-6 animate-pulse">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 p-8 text-center border border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">No assigned tickets match your filters.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-[1fr_120px_120px_120px] gap-4 bg-slate-50 border-b border-slate-200 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Ticket Details</span>
                  <span>Priority</span>
                  <span>Status</span>
                  <span>SLA Status</span>
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  {filteredTickets.map((ticket) => (
                    <button
                      key={ticket._id}
                      type="button"
                      onClick={() => handleSelectTicket(ticket)}
                      className={`group flex w-full items-center gap-4 px-5 py-4 text-left transition duration-200 hover:bg-slate-50/80 ${selectedTicket?._id === ticket._id ? 'bg-indigo-50/40 hover:bg-indigo-50/50' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors duration-150">{ticket.title}</p>
                        <p className="mt-1 text-xs text-slate-400 font-medium">{ticket.department} • Created {formatDate(ticket.createdAt)}</p>
                      </div>
                      <div className="flex min-w-[7.5rem] items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ticket.priority === 'High' ? 'bg-rose-100 text-rose-800' : ticket.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <div className="min-w-[7.5rem]">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${statusBadge(ticket.status)}`}>{ticket.status}</span>
                      </div>
                      <div className="min-w-[7.5rem]">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${slaBadge(ticket.slaStatus)}`}>{ticket.slaStatus}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Ticket details</h2>
                <p className="text-xs text-slate-400 font-medium">Select a ticket to review and update status.</p>
              </div>
              <span className="rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-bold border border-indigo-100">Details</span>
            </div>
            
            {!selectedTicket ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-slate-400 font-semibold">
                Select a ticket from the list to see details.
              </div>
            ) : (
              <div className={`space-y-5 transition-all duration-300 ${updating ? 'opacity-80 pointer-events-none animate-pulse' : ''}`}>
                <div>
                  <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Title</p>
                  <p className="mt-1 text-base font-semibold text-slate-900 leading-snug">{selectedTicket.title}</p>
                </div>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{selectedTicket.status}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Priority</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{selectedTicket.priority}</p>
                  </div>
                </div>

                {/* Premium Avatar style Assignee Display block inside Detail panel */}
                <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100 transition-all duration-300">
                  <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Assignee</p>
                  <div className="mt-3 flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-white text-sm font-bold shadow-sm transition-all duration-300 ${selectedTicket.assignedTo ? 'bg-indigo-600 scale-100' : 'bg-slate-300 scale-95'}`}>
                      {selectedTicket.assignedTo ? getInitials(selectedTicket.assignedTo.name) : '?'}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold transition-colors duration-300 ${selectedTicket.assignedTo ? 'text-slate-800' : 'text-slate-400 italic font-normal'}`}>
                        {selectedTicket.assignedTo?.name || 'Unassigned'}
                      </p>
                      {selectedTicket.assignedAt && selectedTicket.assignedBy && (
                        <p className="text-[10px] text-slate-400 font-medium italic mt-0.5">
                          Assigned by {selectedTicket.assignedBy.name} on {new Date(selectedTicket.assignedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs uppercase font-bold tracking-wider text-slate-400">SLA Status</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{selectedTicket.slaStatus}</p>
                  <p className="mt-1 text-xs text-slate-400 font-medium">Deadline: {formatDate(selectedTicket.deadline)}</p>
                </div>
                
                <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Description</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{selectedTicket.description}</p>
                </div>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Department</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{selectedTicket.department}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Created by</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{selectedTicket.createdBy?.name || 'Unknown'}</p>
                  </div>
                </div>
                
                {/* Clean Actions Layout Group (Shown ONLY for Admins & Agents) */}
                {['agent', 'admin'].includes(user?.role) && (
                  <div className="space-y-3 rounded-3xl bg-slate-50 p-4 border border-slate-100">
                    <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Start status action */}
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                        onClick={() => handleStatusChange('In Progress')}
                        disabled={updating || selectedTicket.status !== 'Open'}
                      >
                        {updating && selectedStatus === 'In Progress' && <Spinner />}
                        Start
                      </button>

                      {/* Resolve status action */}
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                        onClick={() => handleStatusChange('Resolved')}
                        disabled={updating || selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed'}
                      >
                        {updating && selectedStatus === 'Resolved' && <Spinner />}
                        Resolve
                      </button>

                      {/* Escalate status action */}
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                        onClick={() => handleStatusChange('Escalated')}
                        disabled={updating || selectedTicket.status === 'Escalated' || selectedTicket.status === 'Closed'}
                      >
                        {updating && selectedStatus === 'Escalated' && <Spinner />}
                        Escalate
                      </button>

                      {/* Assign / Release dynamic action */}
                      {!selectedTicket.assignedTo ? (
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                          onClick={() => handleAssign(true)}
                          disabled={updating}
                        >
                          {updating && <Spinner />}
                          Assign to Me
                        </button>
                      ) : (selectedTicket.assignedTo?._id === user?._id || selectedTicket.assignedTo === user?._id) ? (
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                          onClick={() => handleAssign(false)}
                          disabled={updating}
                        >
                          {updating && <Spinner />}
                          Release
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Admins Reassignment controls dropdown selectors */}
                {user?.role === 'admin' && (
                  <div className="space-y-3 rounded-3xl bg-slate-50 p-4 border border-slate-100">
                    <label htmlFor="agent-select" className="block text-xs uppercase font-bold tracking-wider text-slate-400">Reassign (Admin)</label>
                    <input
                      type="text"
                      placeholder="Search agents..."
                      value={agentSearch}
                      onChange={(e) => setAgentSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-400 transition"
                    />
                    <select
                      id="agent-select"
                      value={selectedTicket.assignedTo?._id || selectedTicket.assignedTo || ''}
                      onChange={(event) => handleAdminAssign(event.target.value)}
                      disabled={updating}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:border-indigo-400 transition"
                    >
                      <option value="">Unassigned</option>
                      {filteredAgents.map((agent) => (
                        <option key={agent._id} value={agent._id}>
                          {agent.name} ({agentWorkload[agent._id] || 0} active)
                        </option>
                      ))}
                    </select>
                    {(selectedTicket.assignedTo?._id || selectedTicket.assignedTo) && (
                      <button
                        type="button"
                        onClick={() => handleAdminAssign('')}
                        disabled={updating}
                        className="inline-flex w-full justify-center items-center rounded-2xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
                      >
                        {updating && <Spinner />}
                        Unassign Ticket
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Floating Premium Toast Notifications List */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
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

export default AgentDashboard;
