import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CreateTicketPage from './pages/CreateTicketPage';
import TicketListPage from './pages/TicketListPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AgentDashboard from './pages/AgentDashboard';
import socket from './services/socket';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const { user } = useAuth();
  const [toast, setToast] = useState(null);
  const routeKey = useMemo(() => (user ? user.role : 'guest'), [user]);

  useEffect(() => {
    if (!user) return undefined;

    const handleEscalated = ({ ticketId, title }) => {
      setToast({
        id: ticketId,
        message: `Ticket "${title}" has been escalated`,
      });

      window.setTimeout(() => {
        setToast(null);
      }, 5000);
    };

    socket.on('ticketEscalated', handleEscalated);

    return () => {
      socket.off('ticketEscalated', handleEscalated);
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Header />
      {toast ? (
        <div className="fixed right-4 top-20 z-50 w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="text-sm font-semibold text-slate-900">Escalation Alert</p>
          <p className="mt-2 text-sm text-slate-700">{toast.message}</p>
        </div>
      ) : null}
      <main className="container mx-auto px-4 py-6" key={routeKey}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
          />
          <Route
            path="/tickets"
            element={<ProtectedRoute><TicketListPage /></ProtectedRoute>}
          />
          <Route
            path="/create-ticket"
            element={<ProtectedRoute><CreateTicketPage /></ProtectedRoute>}
          />
          <Route
            path="/analytics"
            element={<ProtectedRoute roles={[ 'admin' ]}><AnalyticsPage /></ProtectedRoute>}
          />
          <Route
            path="/agent-dashboard"
            element={<ProtectedRoute roles={[ 'agent' ]}><AgentDashboard /></ProtectedRoute>}
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
