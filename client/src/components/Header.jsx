import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();

  const navClass = ({ isActive }) =>
    `transition text-sm font-medium ${isActive ? 'text-emerald-300' : 'text-white hover:text-slate-200'}`;

  return (
    <header className="bg-slate-950 text-white shadow-sm">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-4">
        <NavLink to="/dashboard" className="font-semibold text-lg tracking-tight">
          UniSolve
        </NavLink>

        <nav className="flex flex-wrap items-center gap-3">
          {user ? (
            <>
              <NavLink to="/dashboard" className={navClass}>
                Dashboard
              </NavLink>
              <NavLink to="/tickets" className={navClass}>
                Tickets
              </NavLink>
              <NavLink to="/create-ticket" className={navClass}>
                Create Ticket
              </NavLink>
              {user.role === 'agent' && (
                <NavLink to="/agent-dashboard" className={navClass}>
                  Agent Dashboard
                </NavLink>
              )}
              {user.role === 'admin' && (
                <NavLink to="/analytics" className={navClass}>
                  Analytics
                </NavLink>
              )}
              <button onClick={logout} className="rounded bg-slate-700 px-3 py-1 text-sm transition hover:bg-slate-600">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass}>
                Login
              </NavLink>
              <NavLink to="/register" className={navClass}>
                Register
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
