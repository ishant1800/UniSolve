import { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../services/api';
import socket from '../services/socket';
import { motion, AnimatePresence } from 'framer-motion';

const MetricCard = ({ label, value, accent, icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2 }}
    className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex items-center justify-between gap-4 transition-all duration-200"
  >
    <div>
      <p className="text-xs uppercase font-bold tracking-wider text-slate-400">{label}</p>
      <p className={`mt-3 text-3xl font-extrabold tracking-tight ${accent || 'text-slate-900'}`}>{value}</p>
    </div>
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-xl shadow-sm">
      {icon}
    </div>
  </motion.div>
);

const Spinner = () => (
  <svg className="mr-1.5 h-3.5 w-3.5 animate-spin text-current" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const AnalyticsPage = () => {
  const [range, setRange] = useState('7d');
  const [stats, setStats] = useState({ onTime: 0, atRisk: 0, breached: 0, complianceRate: 0, totalTickets: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [chartLoaded, setChartLoaded] = useState(false);

  const loadAnalytics = async (selectedRange) => {
    try {
      setLoading(true);
      setChartLoaded(false);
      const response = await api.get(`/analytics/sla?range=${selectedRange}`);
      setStats(response.data);
      setError('');
      window.requestAnimationFrame(() => setChartLoaded(true));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to fetch SLA analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadTrendData = async (selectedRange) => {
    try {
      setTrendLoading(true);
      setTrendError('');
      const response = await api.get(`/analytics/sla/trends?range=${selectedRange}`);
      setTrendData(response.data || []);
    } catch (err) {
      setTrendError(err.response?.data?.message || 'Unable to fetch trend data');
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const refreshTimerRef = useRef(null);

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        loadAnalytics(range);
        loadTrendData(range);
        refreshTimerRef.current = null;
      }, 300);
    };

    loadAnalytics(range);
    loadTrendData(range);

    const events = ['ticketCreated', 'ticketUpdated', 'ticketsEscalated', 'ticketEscalated', 'slaUpdated'];
    const handleRealtimeUpdate = () => {
      scheduleRefresh();
    };

    events.forEach((eventName) => socket.on(eventName, handleRealtimeUpdate));

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      events.forEach((eventName) => socket.off(eventName, handleRealtimeUpdate));
    };
  }, [range]);

  const totalTickets = stats.totalTickets;
  const breakdown = [
    { label: 'On Time', value: stats.onTime, color: 'bg-emerald-500' },
    { label: 'At Risk', value: stats.atRisk, color: 'bg-amber-500' },
    { label: 'Breached', value: stats.breached, color: 'bg-rose-500' },
  ];

  const onTimePct = totalTickets ? Math.round((stats.onTime / totalTickets) * 100) : 0;
  const atRiskPct = totalTickets ? Math.round((stats.atRisk / totalTickets) * 100) : 0;
  const breachedPct = totalTickets ? 100 - onTimePct - atRiskPct : 0;

  const donutStyle = {
    background: totalTickets
      ? `conic-gradient(#10b981 0% ${onTimePct}%, #f59e0b ${onTimePct}% ${onTimePct + atRiskPct}%, #ef4444 ${onTimePct + atRiskPct}% 100%)`
      : '#e2e8f0',
    transition: 'background 700ms ease-out, opacity 700ms ease-out',
    opacity: chartLoaded ? 1 : 0.4,
  };

  const handleExport = async () => {
    try {
      setExportError('');
      setExporting(true);

      const response = await api.get(`/analytics/sla/export?range=${range}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `unisolve-sla-report-${range}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError('Unable to export report. Please try again later.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Range Select Header */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">SLA Analytics</h1>
            <p className="mt-1 text-sm text-slate-500 font-medium">Monitor and audit SLA compliance metrics and trend performance in real time.</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-50 border px-3 py-1 text-xs font-bold text-slate-500">
              📊 Data Range: Last {range === '24h' ? '24 Hours' : range === '30d' ? '30 Days' : '7 Days'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border">
              {[
                { key: '24h', label: '24 Hours' },
                { key: '7d', label: '7 Days' },
                { key: '30d', label: '30 Days' },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRange(option.key)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 ${
                    range === option.key
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 shadow-md shadow-indigo-600/10"
            >
              {exporting && <Spinner />}
              {exporting ? 'Exporting…' : 'Export CSV'}
            </motion.button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 text-slate-400 font-semibold py-8 animate-pulse">Loading analytics data...</div>
      ) : error ? (
        <div className="rounded-3xl bg-rose-100 p-6 text-rose-700 shadow-sm">{error}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Total Tickets" value={totalTickets} icon="🎫" accent="text-slate-950" />
          <MetricCard label="SLA Compliance Rate" value={`${stats.complianceRate}%`} icon="⚡" accent="text-indigo-600" />
          <MetricCard label="Breached Tickets" value={stats.breached} icon="🔥" accent="text-rose-600" />
        </div>
      )}

      <AnimatePresence>
        {exportError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 shadow-sm"
          >
            {exportError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SLA Line Trend chart */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-50 pb-4 mb-6">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Audits & Forecasts</p>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">Ticket compliance trend</h2>
          </div>
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-50 border px-3 py-1.5 rounded-full">
            Realtime Synchronization Active
          </div>
        </div>

        <div className="h-[340px] min-h-[300px]">
          {trendLoading ? (
            <div className="flex h-full items-center justify-center text-slate-400 font-medium py-6 animate-pulse">Loading trend chart...</div>
          ) : trendError ? (
            <div className="flex h-full items-center justify-center rounded-3xl bg-rose-50 px-4 text-sm text-rose-700">{trendError}</div>
          ) : trendData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-3xl bg-slate-50 px-4 text-sm text-slate-500 font-semibold border border-dashed">No trend data available for this range.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 12, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} stroke="#e2e8f0" />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} stroke="#e2e8f0" />
                <Tooltip contentStyle={{ borderRadius: 16, borderColor: '#f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11, fontWeight: 700, color: '#475569' }} />
                <Line type="monotone" dataKey="total" name="Total Tickets" stroke="#4f46e5" strokeWidth={3.5} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="breached" name="Breached Tickets" stroke="#e11d48" strokeWidth={3.5} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Gauges Breakdown */}
      {!loading && !error && (
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Radial Conic Donut Gauge */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-6">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Volume ratios</p>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-1">Compliance distribution</h2>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                SLA Compliance Gauge
              </span>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-around my-auto">
              <div className="relative flex h-48 w-48 shrink-0 items-center justify-center rounded-full shadow-lg transition-all duration-700 ease-out" style={donutStyle}>
                <div className="absolute flex h-32 w-32 items-center justify-center rounded-full bg-white text-center shadow-inner">
                  <div>
                    <p className="text-2xl font-black text-slate-900">{stats.complianceRate}%</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">compliant</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-4">
                {breakdown.map((item) => {
                  const percentage = totalTickets ? Math.round((item.value / totalTickets) * 100) : 0;
                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>{item.label}</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`${item.color} h-full rounded-full transition-all duration-700 ease-out`}
                          style={{ width: chartLoaded ? `${percentage}%` : '0%' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SLA Details numeric block summary */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-6">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total metrics</p>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-1">Audit trail totals</h2>
              </div>
            </div>

            <div className="space-y-3.5 my-auto">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 transition duration-150 hover:bg-slate-100/50 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold tracking-wider text-slate-400">On Time Compliance</p>
                  <p className="mt-1 text-3xl font-extrabold text-emerald-600 tracking-tight">{stats.onTime}</p>
                </div>
                <span className="text-2xl">🟢</span>
              </div>
              
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 transition duration-150 hover:bg-slate-100/50 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold tracking-wider text-slate-400">At Risk Deadline</p>
                  <p className="mt-1 text-3xl font-extrabold text-amber-600 tracking-tight">{stats.atRisk}</p>
                </div>
                <span className="text-2xl">⚡</span>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 transition duration-150 hover:bg-slate-100/50 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Breached Deadline</p>
                  <p className="mt-1 text-3xl font-extrabold text-rose-600 tracking-tight">{stats.breached}</p>
                </div>
                <span className="text-2xl">🔥</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
