import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import NeuralBackground from '../components/NeuralBackground';

// SVG Grid Pattern for premium tech backdrop
const GridBackground = () => (
  <svg className="absolute inset-0 h-full w-full stroke-white/[0.04] [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true">
    <defs>
      <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse" x="-1" y="-1">
        <path d="M.5 40V.5H40" fill="none" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid-pattern)" strokeWidth="0" />
  </svg>
);

const UserIcon = () => (
  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const MailIcon = () => (
  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
  </svg>
);

const LockIcon = () => (
  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="h-5 w-5 text-slate-400 hover:text-slate-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeSlashIcon = () => (
  <svg className="h-5 w-5 text-slate-400 hover:text-slate-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
  </svg>
);

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin text-white mr-2" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const getPasswordStrength = (pass) => {
  if (!pass) return { score: 0, label: 'None', color: 'bg-slate-800 w-0' };
  let score = 0;
  if (pass.length >= 8) score += 1;
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
  if (/\d/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score === 1) return { score: 1, label: 'Weak', color: 'bg-rose-500 w-1/3' };
  if (score === 2) return { score: 2, label: 'Medium', color: 'bg-amber-500 w-2/3' };
  if (score === 3) return { score: 3, label: 'Strong', color: 'bg-emerald-500 w-full' };
  return { score: 0, label: 'None', color: 'bg-slate-800 w-0' };
};

const RegisterPage = () => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const strength = getPasswordStrength(password);

  // 3D Perspective Motion Values
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useTransform(mouseY, [0, 1], [15, -15]);
  const rotateY = useTransform(mouseX, [0, 1], [-15, 15]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const xVal = (e.clientX - rect.left) / width;
    const yVal = (e.clientY - rect.top) / height;
    mouseX.set(xVal);
    mouseY.set(yVal);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Pre-flight Password Validation Check
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* LEFT SIDE: Premium AI Branding & Dynamic Stats (Hidden on Mobile) */}
      <div className="relative hidden lg:flex lg:col-span-5 xl:col-span-6 flex-col justify-between p-12 overflow-hidden bg-[#0f1117] border-r border-white/[0.06]">
        <NeuralBackground />
        {/* Glow Spheres */}
        <div className="absolute top-[-10%] right-[-20%] h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[100px] pointer-events-none" />
        <GridBackground />

        {/* Brand Header */}
        <motion.div 
          whileHover={{ scale: 1.05 }} 
          className="relative z-10 flex items-center gap-2 cursor-pointer w-fit"
        >
          <motion.div 
            whileHover={{ rotate: 15 }} 
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/25"
          >
            <span className="text-white text-lg font-black font-mono">U</span>
          </motion.div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            UniSolve
          </span>
        </motion.div>

        {/* Central Slogan/Tagline */}
        <div className="relative z-10 max-w-md my-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-4"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/20">
              ✨ Intelligent Campus Helpdesk
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
              Empower your campus <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                with automated sync.
              </span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Create an account to claim work queues, reassign workload, track SLA parameters in real time, and converse with the UniSolve AI ticket drafting co-pilot.
            </p>
          </motion.div>

          {/* Floating AI Feature / Stat Cards */}
          <div className="space-y-3.5 pt-4">
            {[
              { text: '14 tickets resolved today', icon: '✅', desc: 'Resolved instantly by agents', delay: 0.1 },
              { text: 'AI Copilot active', icon: '🤖', desc: 'Drafting conversational responses', delay: 0.2 },
              { text: 'SLA compliance at 98%', icon: '⚡', desc: 'SLA deadline breaches eliminated', delay: 0.3 }
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: card.delay, ease: 'easeOut' }}
                whileHover={{ y: -3, scale: 1.01 }}
                className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md p-4 shadow-xl shadow-black/10 transition-all duration-300 hover:bg-white/[0.04]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-lg">
                  {card.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{card.text}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-500 font-medium">
          © {new Date().getFullYear()} UniSolve Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE: Centered Premium Register Card */}
      <div className="flex col-span-12 lg:col-span-7 xl:col-span-6 flex-col justify-center items-center p-8 bg-slate-900 relative">
        <div className="absolute top-[20%] left-[20%] h-[300px] w-[300px] rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />
        
        {/* Mobile Header Logo */}
        <motion.div 
          whileHover={{ scale: 1.05 }} 
          className="lg:hidden flex items-center gap-2 mb-8 cursor-pointer"
        >
          <motion.div 
            whileHover={{ rotate: 15 }} 
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 shadow"
          >
            <span className="text-white text-base font-black font-mono">U</span>
          </motion.div>
          <span className="text-lg font-bold text-white tracking-tight">UniSolve</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ 
            rotateX, 
            rotateY, 
            transformStyle: 'preserve-3d', 
            perspective: 1000 
          }}
          className="w-full max-w-[440px] rounded-3xl border border-white/[0.06] bg-slate-950/60 backdrop-blur-lg p-8 md:p-10 shadow-2xl shadow-black/40"
        >
          <div className="space-y-2" style={{ transform: 'translateZ(35px)', transformStyle: 'preserve-3d' }}>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Get Started</h1>
            <p className="text-sm text-slate-400">Join UniSolve and coordinate your helpdesk instantly.</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, x: 0 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                x: [0, -10, 10, -10, 10, -5, 5, 0]
              }}
              transition={{ duration: 0.5 }}
              style={{ transform: 'translateZ(40px)' }}
              role="alert"
              aria-live="polite"
              className="mt-6 flex items-start gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-semibold text-rose-400"
            >
              <svg className="h-5 w-5 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" style={{ transform: 'translateZ(30px)', transformStyle: 'preserve-3d' }}>
            {/* Full Name Field */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
              style={{ transform: 'translateZ(20px)' }}
              className="space-y-1.5"
            >
              <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Full Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <UserIcon />
                </div>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="John Doe"
                  className="w-full rounded-2xl border border-white/[0.08] bg-slate-900 pl-10 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all duration-200 group-hover:border-white/[0.12]"
                  required
                />
              </div>
            </motion.div>

            {/* Email Address Field */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
              style={{ transform: 'translateZ(22px)' }}
              className="space-y-1.5"
            >
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <MailIcon />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="name@campus.edu"
                  className="w-full rounded-2xl border border-white/[0.08] bg-slate-900 pl-10 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all duration-200 group-hover:border-white/[0.12]"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium italic">Your official campus email accounts only.</p>
            </motion.div>

            {/* Password Field */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
              style={{ transform: 'translateZ(24px)' }}
              className="space-y-1.5"
            >
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <LockIcon />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="w-full rounded-2xl border border-white/[0.08] bg-slate-900 pl-10 pr-10 py-3.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all duration-200 group-hover:border-white/[0.12]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>

              {/* Dynamic Animated Password Strength Indicator */}
              {password && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Password Strength</span>
                    <span className={
                      strength.score === 1 ? 'text-rose-500' : strength.score === 2 ? 'text-amber-500' : 'text-emerald-500'
                    }>{strength.label}</span>
                  </div>
                  <div className="h-1 w-full rounded bg-slate-800 overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strength.color}`} />
                  </div>
                </div>
              )}
            </motion.div>

            {/* Confirm Password Field */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4, ease: 'easeOut' }}
              style={{ transform: 'translateZ(26px)' }}
              className="space-y-1.5"
            >
              <label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Confirm Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <LockIcon />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  className={`w-full rounded-2xl border bg-slate-900 pl-10 pr-10 py-3.5 text-sm text-white placeholder-slate-500 focus:ring-1 focus:outline-none transition-all duration-200 group-hover:border-white/[0.12] ${
                    confirmPassword
                      ? password === confirmPassword
                        ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500'
                        : 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-white/[0.08] focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-rose-500 font-medium italic mt-0.5">Passwords do not match.</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-[10px] text-emerald-500 font-medium italic mt-0.5">Passwords match!</p>
              )}
            </motion.div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
              whileHover={{ scale: 1.01, translateZ: '35px' }}
              whileTap={{ scale: 0.99 }}
              style={{ transform: 'translateZ(30px)' }}
              className="w-full mt-2 inline-flex items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3.5 text-sm font-bold text-white transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10"
              disabled={loading}
            >
              {loading && <Spinner />}
              {loading ? 'Creating Identity...' : 'Create Account'}
            </motion.button>
          </form>

          {/* Account Redirect */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{ transform: 'translateZ(15px)' }}
            className="mt-8 pt-6 border-t border-white/[0.06] text-center"
          >
            <p className="text-xs text-slate-400 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                Sign in
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;
