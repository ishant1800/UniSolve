import { useEffect, useMemo, useState, lazy, Suspense, useRef } from 'react';
import { Navigate, Route, Routes, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import socket from './services/socket';
import PageSkeleton from './components/PageSkeleton';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy-load dashboard and heavy modules
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CreateTicketPage = lazy(() => import('./pages/CreateTicketPage'));
const TicketListPage = lazy(() => import('./pages/TicketListPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'));

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

function App() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [escalationToast, setEscalationToast] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const routeKey = useMemo(() => (user ? user.role : 'guest'), [user]);

  // Click outside to close profile dropdown helper
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const handleEscalated = ({ ticketId, title }) => {
      setEscalationToast({
        id: ticketId,
        message: `Ticket "${title}" has been escalated`,
      });

      window.setTimeout(() => {
        setEscalationToast(null);
      }, 5000);
    };

    socket.on('ticketEscalated', handleEscalated);

    return () => {
      socket.off('ticketEscalated', handleEscalated);
    };
  }, [user]);

  // Hide nav layout for auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // Navigation Links definition
  const navigationItems = useMemo(() => {
    if (!user) return [];
    const items = [
      { path: '/dashboard', label: 'Overview', icon: '📊' },
      { path: '/tickets', label: 'All Tickets', icon: '🎫' },
      { path: '/create-ticket', label: 'Create Ticket', icon: '✍️' },
    ];
    if (user.role === 'agent') {
      items.push({ path: '/agent-dashboard', label: 'Agent Console', icon: '🛡️' });
    }
    if (user.role === 'admin') {
      items.push({ path: '/analytics', label: 'Analytics Hub', icon: '📈' });
    }
    return items;
  }, [user]);

  const activeMobileLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-150 ${
      isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-100'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Escalation Sockets Toast Notification */}
      <AnimatePresence>
        {escalationToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed right-4 top-20 z-50 w-[350px] rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm font-bold text-rose-950">Escalation Breach Alert</p>
                <p className="mt-1 text-xs font-semibold text-rose-700 leading-normal">{escalationToast.message}</p>
              </div>
            </div>
            <button
              onClick={() => setEscalationToast(null)}
              className="absolute top-4 right-4 text-rose-400 hover:text-rose-600 font-bold"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Layout Container */}
      {!user || isAuthPage ? (
        // Plain full-screen viewport for Auth screens
        <main className="flex-1 flex flex-col bg-slate-950">
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </main>
      ) : (
        // Premium Stable Persistent SaaS Dashboard Shell
        <div className="relative min-h-screen bg-slate-50 flex">
          {/* Stable Fixed Sidebar (Desktop) */}
          <aside
            className={`hidden md:flex flex-col justify-between shrink-0 bg-slate-950 text-slate-300 border-r border-white/[0.06] fixed left-0 top-0 bottom-0 z-40 h-screen overflow-y-auto transition-[width] duration-300 ease-in-out ${
              sidebarCollapsed ? 'w-[88px] px-3.5' : 'w-[280px] px-6'
            } py-6`}
          >
            <div className="space-y-8">
              {/* Sidebar Brand Header */}
              <div className="flex items-center justify-between">
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md">
                      <span className="text-white text-base font-black font-mono">U</span>
                    </div>
                    <span className="text-lg font-bold text-white tracking-tight">UniSolve</span>
                  </div>
                )}
                {sidebarCollapsed && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md mx-auto">
                    <span className="text-white text-sm font-black font-mono">U</span>
                  </div>
                )}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="rounded-lg p-1.5 hover:bg-white/[0.04] text-slate-400 hover:text-white transition duration-150"
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {sidebarCollapsed ? '➡️' : '⬅️'}
                </button>
              </div>

              {/* Sidebar Navigation */}
              <nav className="flex flex-col gap-2">
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <div key={item.path} className="relative group">
                      <NavLink
                        to={item.path}
                        className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                          isActive
                            ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                        }`}
                      >
                        {/* Smooth active route indicators */}
                        {isActive && (
                          <motion.div
                            layoutId="active-indicator"
                            className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className={`text-base shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-indigo-400' : ''}`}>
                          {item.icon}
                        </span>
                        {!sidebarCollapsed && (
                          <span className="font-semibold tracking-tight">{item.label}</span>
                        )}
                      </NavLink>

                      {/* Tooltip on compact collapsed mode */}
                      {sidebarCollapsed && (
                        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                          {item.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* Profile & Logout Box */}
            <div className="border-t border-white/[0.06] pt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-sm shadow-inner uppercase">
                  {getInitials(user.name)}
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate leading-tight">{user.name}</p>
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider truncate mt-0.5">{user.role}</p>
                  </div>
                )}
              </div>
              {!sidebarCollapsed ? (
                <button
                  onClick={logout}
                  className="w-full inline-flex justify-center items-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] px-4 py-2.5 text-xs font-bold text-white transition duration-200 active:scale-98"
                >
                  🔑 Sign Out
                </button>
              ) : (
                <button
                  onClick={logout}
                  className="mx-auto rounded-xl bg-white/[0.04] hover:bg-white/[0.08] p-2 text-xs font-bold text-white transition duration-200"
                  title="Sign Out"
                >
                  🔑
                </button>
              )}
            </div>
          </aside>

          {/* Right Main Panel Container with Stable Margins */}
          <div
            className="flex-1 flex flex-col min-w-0 bg-slate-50 transition-[margin-left] duration-300 ease-in-out"
            style={{ marginLeft: sidebarCollapsed ? '88px' : '280px' }}
          >
            {/* Sticky Floating Topbar */}
            <header className="sticky top-0 bg-white/70 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between z-30">
              <div className="flex items-center gap-3">
                {/* Mobile Menu Toggle button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden rounded-lg p-1.5 bg-slate-100 text-slate-600 border active:scale-95 transition"
                  aria-label="Toggle menu"
                >
                  ☰
                </button>
                <div className="md:hidden flex items-center gap-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600">
                    <span className="text-white text-xs font-black font-mono">U</span>
                  </div>
                  <span className="text-base font-bold text-slate-900 tracking-tight">UniSolve</span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>🏢 HELP CENTER</span>
                  <span>·</span>
                  <span className="text-indigo-600">{user.role} workspace</span>
                </div>
              </div>

              {/* Profile Bar */}
              <div className="flex items-center gap-3" ref={dropdownRef}>
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 rounded-full hover:bg-slate-100 p-1 pr-3 border border-transparent hover:border-slate-200 transition duration-150"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs">
                      {getInitials(user.name)}
                    </div>
                    <span className="hidden sm:inline text-xs font-semibold text-slate-700">{user.name}</span>
                  </button>

                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50"
                      >
                        <div className="px-3 py-2 border-b border-slate-100">
                          <p className="text-xs font-bold text-slate-900">{user.name}</p>
                          <p className="text-[10px] font-medium text-slate-500 truncate">{user.email}</p>
                        </div>
                        <button
                          onClick={logout}
                          className="w-full text-left rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition duration-150 mt-1"
                        >
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </header>

            {/* Mobile Slide-in Menu Drawer overlay */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <div className="relative z-50 md:hidden">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMobileMenuOpen(false)}
                    className="fixed inset-0 bg-black"
                  />
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-y-0 left-0 w-64 bg-slate-950 p-6 flex flex-col justify-between shadow-2xl border-r border-white/5"
                  >
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600">
                            <span className="text-white text-base font-black font-mono">U</span>
                          </div>
                          <span className="text-lg font-bold text-white tracking-tight">UniSolve</span>
                        </div>
                        <button
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-slate-400 hover:text-white font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      <nav className="flex flex-col gap-1.5">
                        {navigationItems.map((item) => (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={activeMobileLinkClass}
                          >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                          </NavLink>
                        ))}
                      </nav>
                    </div>

                    <button
                      onClick={logout}
                      className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] py-3 text-sm font-bold text-white transition active:scale-95"
                    >
                      🔑 Sign Out
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Main Stable Scroll Routing Panel */}
            <main className="flex-1 overflow-y-auto px-6 py-8 container mx-auto max-w-7xl">
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
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
                    element={<ProtectedRoute roles={['admin']}><AnalyticsPage /></ProtectedRoute>}
                  />
                  <Route
                    path="/agent-dashboard"
                    element={<ProtectedRoute roles={['agent']}><AgentDashboard /></ProtectedRoute>}
                  />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
