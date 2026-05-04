import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-8 shadow-lg">
      <h1 className="text-3xl font-semibold text-slate-900">Login</h1>
      <p className="mt-2 text-slate-600">Access your UniSolve helpdesk account.</p>

      {error && (
        <div role="alert" aria-live="polite" className="mt-4 rounded-lg bg-rose-100 px-4 py-3 text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            placeholder="name@campus.edu"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-500 focus:outline-none"
            required
          />
          <span className="mt-2 block text-xs text-slate-500">Use your campus email address.</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-500 focus:outline-none"
            required
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to UniSolve?{' '}
        <Link to="/register" className="font-semibold text-slate-900 hover:text-slate-700">
          Create an account
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
