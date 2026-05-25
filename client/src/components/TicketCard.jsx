import { useMemo, useEffect, useState, memo } from 'react';
import { getTimeLeft } from '../utils/timeUtils';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const statusStyles = {
  Open: 'bg-blue-100 text-blue-700 border border-blue-200',
  'In Progress': 'bg-amber-100 text-amber-700 border border-amber-200',
  Resolved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Escalated: 'bg-rose-100 text-rose-700 border border-rose-200',
  Closed: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const slaStyles = {
  OnTime: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  AtRisk: 'bg-amber-50 text-amber-700 border border-amber-200',
  Breached: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const Spinner = () => (
  <svg className="mr-1.5 h-3.5 w-3.5 animate-spin text-current" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const TicketCard = ({ ticket, onUpdate, userRole }) => {
  const { user } = useAuth();
  const statusClass = statusStyles[ticket.status] || 'bg-slate-100 text-slate-600 border border-slate-200';
  const slaClass = slaStyles[ticket.slaStatus] || 'bg-slate-100 text-slate-600 border border-slate-200';
  const [countdown, setCountdown] = useState(() => getTimeLeft(ticket.deadline));
  const [activeMutation, setActiveMutation] = useState(null); // 'Start', 'Resolve', 'Escalate', 'Assign', 'Release', 'Reassign'
  const [agents, setAgents] = useState([]);

  // Fetch agents roster for admins to allow premium inline reassignment
  useEffect(() => {
    if (userRole === 'admin') {
      const fetchAgents = async () => {
        try {
          const res = await api.get('/users/agents');
          setAgents(res.data);
        } catch (err) {
          console.error('Failed to load agents in TicketCard:', err);
        }
      };
      fetchAgents();
    }
  }, [userRole]);

  useEffect(() => {
    setCountdown(getTimeLeft(ticket.deadline));

    const interval = setInterval(() => {
      setCountdown(getTimeLeft(ticket.deadline));
    }, 1000);

    return () => clearInterval(interval);
  }, [ticket.deadline]);

  const deadlineText = useMemo(() => {
    const deadline = new Date(ticket.deadline);
    return !Number.isNaN(deadline.getTime()) ? deadline.toLocaleString() : 'N/A';
  }, [ticket.deadline]);

  const deadlineDistance = useMemo(() => {
    const deadline = new Date(ticket.deadline);
    const diffHours = Math.round((deadline.getTime() - Date.now()) / 3600000);
    if (Number.isNaN(diffHours)) return null;
    if (diffHours >= 72) return `${Math.round(diffHours / 24)} days left`;
    if (diffHours >= 0) return `${diffHours}h left`;
    return `${Math.abs(diffHours)}h overdue`;
  }, [ticket.deadline]);

  const isAssignedToMe = ticket.assignedTo?._id === user?._id || ticket.assignedTo === user?._id;
  const isUnassigned = !ticket.assignedTo;
  const isOptimistic = ticket.isOptimistic;

  const handleAction = async (label, payload) => {
    if (activeMutation) return;
    setActiveMutation(label);
    try {
      await onUpdate(ticket, payload);
    } catch (err) {
      console.error(`Failed executing ${label} on ticket ${ticket._id}:`, err);
    } finally {
      setActiveMutation(null);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
        isOptimistic || activeMutation ? 'animate-pulse opacity-85 shadow-inner bg-slate-50/50' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 transition-colors duration-200">{ticket.title}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            {ticket.department} · {ticket.priority}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(isOptimistic || activeMutation) && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 animate-pulse">
              <svg className="h-3 w-3 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Updating...
            </span>
          )}
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusClass}`}>
            {ticket.status}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-600">{ticket.description}</p>

      {/* Renders dynamic premium assignee avatar and user card details */}
      <div className="mt-5 grid gap-4 text-xs text-slate-500 sm:grid-cols-2 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 border border-slate-200 uppercase">
            {ticket.createdBy?.name?.[0] || '?'}
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Created By</p>
            <p className="font-semibold text-slate-800">{ticket.createdBy?.name || 'Unknown'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold shadow-sm transition-all duration-300 ${ticket.assignedTo ? 'bg-indigo-600 scale-100 rotate-0' : 'bg-slate-300 scale-95 rotate-12'}`}>
            {ticket.assignedTo ? getInitials(ticket.assignedTo.name) : '?'}
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Assignee</p>
            <p className={`font-semibold transition-colors duration-300 ${ticket.assignedTo ? 'text-slate-800' : 'text-slate-400 italic font-normal'}`}>
              {ticket.assignedTo?.name || 'Unassigned'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 font-semibold text-slate-400 border border-slate-200">
            ⏰
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Deadline</p>
            <p className="font-semibold text-slate-800">
              {deadlineText}
              {deadlineDistance ? <span className="ml-1 font-normal text-slate-500">· {deadlineDistance}</span> : null}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-sm ${ticket.priority === 'High' ? 'bg-rose-50 border border-rose-200' : ticket.priority === 'Medium' ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}>
            {ticket.priority === 'High' ? '🔥' : ticket.priority === 'Medium' ? '⚡' : '🟢'}
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Priority Level</p>
            <span className={`font-semibold ${ticket.priority === 'High' ? 'text-rose-700' : ticket.priority === 'Medium' ? 'text-amber-700' : 'text-slate-700'}`}>
              {ticket.priority}
            </span>
          </div>
        </div>
      </div>

      {ticket.assignedAt && ticket.assignedBy && (
        <p className="mt-4 text-[10px] text-slate-400 italic font-medium flex items-center gap-1">
          <span>🛡️</span> Assigned by {ticket.assignedBy.name} on {new Date(ticket.assignedAt).toLocaleString()}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs border-t border-slate-100 pt-3">
        <span className={`rounded-full px-3 py-1 font-semibold uppercase tracking-wider ${slaClass}`}>
          SLA: {ticket.slaStatus}
        </span>
        <span className="font-medium text-slate-500">Countdown: <span className="font-bold text-slate-700">{countdown}</span></span>
      </div>

      {/* Premium Integrated Action Group Container (Shown ONLY for Admins & Agents) */}
      {['agent', 'admin'].includes(userRole) && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition-all duration-200 hover:bg-slate-800 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => handleAction('Start', 'In Progress')}
              disabled={!!activeMutation || ticket.status !== 'Open'}
            >
              {activeMutation === 'Start' && <Spinner />}
              Start
            </button>
            
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition-all duration-200 hover:bg-emerald-500 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => handleAction('Resolve', 'Resolved')}
              disabled={!!activeMutation || ticket.status === 'Resolved' || ticket.status === 'Closed'}
            >
              {activeMutation === 'Resolve' && <Spinner />}
              Resolve
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white transition-all duration-200 hover:bg-amber-400 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => handleAction('Escalate', 'Escalated')}
              disabled={!!activeMutation || ticket.status === 'Escalated' || ticket.status === 'Closed'}
            >
              {activeMutation === 'Escalate' && <Spinner />}
              Escalate
            </button>

            {/* Render "Assign to Me" when ticket is unassigned */}
            {isUnassigned && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white transition-all duration-200 hover:bg-indigo-500 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => handleAction('Assign', { assignedTo: user?._id })}
                disabled={!!activeMutation}
              >
                {activeMutation === 'Assign' && <Spinner />}
                Assign to Me
              </button>
            )}

            {/* Render "Release" when the current logged in agent owns this ticket */}
            {isAssignedToMe && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white transition-all duration-200 hover:bg-rose-500 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => handleAction('Release', { assignedTo: null })}
                disabled={!!activeMutation}
              >
                {activeMutation === 'Release' && <Spinner />}
                Release
              </button>
            )}
          </div>

          {/* Render selective admin reassign dropdown tools */}
          {userRole === 'admin' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Reassign</span>
              <select
                value={ticket.assignedTo?._id || ticket.assignedTo || ''}
                onChange={(e) => handleAction('Reassign', { assignedTo: e.target.value || null })}
                disabled={!!activeMutation}
                className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition duration-150 disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(TicketCard);
