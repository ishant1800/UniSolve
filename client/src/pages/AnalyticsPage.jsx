import { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../services/api';
import socket from '../services/socket';

const MetricCard = ({ label, value, accent }) => (
  <div className="rounded-3xl bg-white p-6 shadow-sm">
    <p className="text-sm uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-4 text-3xl font-semibold ${accent || 'text-slate-900'}`}>{value}</p>
  </div>
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
      link.setAttribute('download', 'sla-report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError('Unable to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">SLA Analytics</h1>
            <p className="mt-2 text-slate-600">Monitor SLA performance and compliance across tickets in real time.</p>
            <p className="mt-3 text-sm text-slate-500">Showing data for last {range === '24h' ? '24 hours' : range === '30d' ? '30 days' : '7 days'}.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: '24h', label: 'Last 24 Hours' },
              { key: '7d', label: 'Last 7 Days' },
              { key: '30d', label: 'Last 30 Days' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  range === option.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm text-slate-600">Loading analytics...</div>
      ) : error ? (
        <div className="rounded-3xl bg-rose-100 p-6 text-rose-700 shadow-sm">{error}</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <MetricCard label="Total tickets" value={totalTickets} />
          <MetricCard label="SLA compliance" value={`${stats.complianceRate}%`} accent="text-slate-900" />
          <MetricCard label="Breached tickets" value={stats.breached} accent="text-rose-700" />
        </div>
      )}

      {exportError ? (
        <div className="rounded-3xl bg-rose-100 p-4 text-sm text-rose-700 shadow-sm">{exportError}</div>
      ) : null}

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Ticket trends</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Trend over time</h2>
          </div>
          <div className="text-sm text-slate-500">
            Showing {range === '24h' ? '24 hours' : range === '30d' ? '30 days' : '7 days'} of ticket movement.
          </div>
        </div>

        <div className="mt-6 h-[320px] min-h-[280px]">
          {trendLoading ? (
            <div className="flex h-full items-center justify-center text-slate-600">Loading trend data...</div>
          ) : trendError ? (
            <div className="flex h-full items-center justify-center rounded-3xl bg-rose-50 px-4 text-sm text-rose-700">{trendError}</div>
          ) : trendData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-3xl bg-slate-50 px-4 text-sm text-slate-600">No trend data available for this range.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#cbd5e1' }} />
                <Legend verticalAlign="top" height={36} />
                <Line type="monotone" dataKey="total" name="Total tickets" stroke="#0f172a" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="breached" name="Breached tickets" stroke="#dc2626" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {!loading && !error ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-500">SLA Breakdown</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">Performance by status</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-wide text-slate-600">
                Real-time updates
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex h-52 w-52 items-center justify-center rounded-full transition-all duration-700 ease-out" style={donutStyle}>
                <div className="absolute flex h-32 w-32 items-center justify-center rounded-full bg-white text-center">
                  <div>
                    <p className="text-xl font-semibold text-slate-900">{stats.complianceRate}%</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">compliant</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-4">
                {breakdown.map((item) => {
                  const percentage = totalTickets ? Math.round((item.value / totalTickets) * 100) : 0;
                  return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>{item.label}</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`${item.color} h-3 rounded-full transition-all duration-700 ease-out`}
                          style={{ width: chartLoaded ? `${percentage}%` : '0%' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-wide text-slate-500">SLA detail</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">On Time</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-700">{stats.onTime}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">At Risk</p>
                <p className="mt-2 text-3xl font-semibold text-amber-700">{stats.atRisk}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Breached</p>
                <p className="mt-2 text-3xl font-semibold text-rose-700">{stats.breached}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AnalyticsPage;
