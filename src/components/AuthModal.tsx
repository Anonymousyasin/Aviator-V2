import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { authModalOpen, authModalMode, closeAuthModal, openAuthModal, login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const isLogin = authModalMode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password.');
      return;
    }

    setLoading(true);

    if (isLogin) {
      const res = await login(email, password);
      setLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Login failed. Please check your credentials.');
      }
    } else {
      const res = await register(email, password, name);
      setLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Registration failed. Please try again.');
      } else {
        setSuccessMessage('Account created successfully! Welcome to Aviator.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#0f141f] border border-[#f5c242]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0a0d14]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#e50539]/60 shadow-xs">
              <img
                src="/assets/aistudio/download_5e885c0f.jpeg"
                alt="Aviator"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-base leading-tight">
                {isLogin ? 'Player Login (লগইন)' : 'Create Account (নিবন্ধন)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isLogin ? 'Enter your credentials to continue playing' : 'Join Aviator Bangladesh & get ৳5,000 starter bonus'}
              </p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1.5 bg-[#07090e] border-b border-slate-800 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              openAuthModal('login');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              isLogin
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Login (লগইন)
          </button>
          <button
            type="button"
            onClick={() => {
              openAuthModal('register');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              !isLogin
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register (রেজিস্টার)
          </button>
        </div>

        {/* Alert banners */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-red-950/80 border border-red-500/40 text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Player Nickname / Name (ডাকনাম)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tanvir_VIP"
                  className="w-full bg-[#080d16] border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Email Address (ইমেইল ঠিকানা)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="youremail@example.com"
                required
                className="w-full bg-[#080d16] border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Password (পাসওয়ার্ড)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#080d16] border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Confirm Password (পাসওয়ার্ড নিশ্চিত করুন)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#080d16] border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>{isLogin ? 'Login to Play' : 'Create My Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
