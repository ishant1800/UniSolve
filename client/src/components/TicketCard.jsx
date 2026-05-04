import { useMemo, useEffect, useState } from 'react';
import { getTimeLeft } from '../utils/timeUtils';

const statusStyles = {
  Open: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Escalated: 'bg-rose-100 text-rose-700',
  Closed: 'bg-slate-100 text-slate-600',
};

const slaStyles = {
  OnTime: 'bg-emerald-100 text-emerald-700',
  AtRisk: 'bg-amber-100 text-amber-700',
  Breached: 'bg-rose-100 text-rose-700',
};

const TicketCard = ({ ticket, onUpdate, userRole }) => {
  const statusClass = statusStyles[ticket.status] || 'bg-slate-100 text-slate-600';
  const slaClass = slaStyles[ticket.slaStatus] || 'bg-slate-100 text-slate-600';
  const [countdown, setCountdown] = useState(() => getTimeLeft(ticket.deadline));

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

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{ticket.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{ticket.department} · {ticket.priority}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${statusClass}`}>
          {ticket.status}
        </span>
      </div>

      <p className="mt-4 text-slate-700">{ticket.description}</p>

      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <div>Created by: {ticket.createdBy?.name || 'Unknown'}</div>
        <div>
          Deadline: {deadlineText}
          {deadlineDistance ? <span className="ml-1 text-slate-500">· {deadlineDistance}</span> : null}
        </div>
        <div>Assigned to: {ticket.assignedTo?.name || 'Unassigned'}</div>
        <div>Priority: {ticket.priority}</div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded-full px-3 py-1 uppercase tracking-wide ${slaClass}`}>
          {ticket.slaStatus}
        </span>
        <span className="text-slate-600">Countdown: {countdown}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-slate-800 px-3 py-2 text-sm text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onUpdate(ticket, 'In Progress')}
          disabled={ticket.status !== 'Open' || !['agent', 'admin'].includes(userRole)}
        >
          Start
        </button>
        <button
          type="button"
          className="rounded bg-emerald-600 px-3 py-2 text-sm text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onUpdate(ticket, 'Resolved')}
          disabled={!['agent', 'admin'].includes(userRole) || ticket.status === 'Resolved' || ticket.status === 'Closed'}
        >
          Resolve
        </button>
        <button
          type="button"
          className="rounded bg-amber-500 px-3 py-2 text-sm text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onUpdate(ticket, 'Escalated')}
          disabled={!['agent', 'admin'].includes(userRole) || ticket.status === 'Escalated'}
        >
          Escalate
        </button>
      </div>
    </div>
  );
};

export default TicketCard;
