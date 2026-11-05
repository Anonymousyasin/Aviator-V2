import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { formatBDT } from '../utils/format';
import {
  X,
  User as UserIcon,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  LogIn,
  LogOut,
  Award,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  Volume2,
  VolumeX,
  Globe,
  Clock,
  Phone,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCashier: (tab: 'deposit' | 'withdraw') => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenCashier,
}) => {
  const {
    balance,
    vipTier,
    vipPoints,
    transactions,
    language,
    setLanguage,
    soundMuted,
    toggleSound,
    firstDepositBonusClaimed,
  } = useWallet();

  const {
    user,
    isAuthenticated,
    logout,
    openAuthModal,
    signInWithGoogle,
  } = useAuth();

  const [copiedId, setCopiedId] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const isBn = language === 'bn';
  const playerId = user?.id || 'GUEST-PLAYER-7749';

  const handleCopyId = () => {
    navigator.clipboard.writeText(playerId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Compute transaction stats
  const depositsList = transactions.filter((t) => t.type === 'Deposit');
  const withdrawalsList = transactions.filter((t) => t.type === 'Withdraw');
  const totalDeposited = depositsList.reduce((acc, t) => acc + (t.status === 'Success' ? t.amount : 0), 0);
  const totalWithdrawn = withdrawalsList.reduce((acc, t) => acc + (t.status === 'Success' ? t.amount : 0), 0);
  const pendingCount = transactions.filter((t) => t.status === 'Pending').length;

  // VIP Tier calculations
  const nextTierPoints =
    vipTier === 'Bronze' ? 500 :
    vipTier === 'Silver' ? 1000 :
    vipTier === 'Gold' ? 2500 :
    vipTier === 'Platinum' ? 5000 : 10000;
  const vipProgress = Math.min(100, Math.round((vipPoints / nextTierPoints) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#0e121c] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1d2436] bg-[#090c14]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md shadow-amber-500/20">
              <div className="w-full h-full bg-[#0d111a] rounded-[10px] flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
                <span>{isBn ? 'খেলোয়াড় প্রোফাইল' : 'Player Profile'}</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {vipTier} VIP
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {isAuthenticated ? (user?.email || 'Verified Account') : (isBn ? 'গেস্ট মোড (লগইন করা নেই)' : 'Guest Mode · Demo Session')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-[#151a26] hover:bg-[#1e2536] border border-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* 1. User Identity & VIP Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#131826] to-[#0d111a] border border-[#222b3e] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-lg shadow-inner">
                  {isAuthenticated && user ? user.name.charAt(0).toUpperCase() : 'G'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-100 text-sm sm:text-base">
                      {isAuthenticated && user ? user.name : (isBn ? 'গেস্ট খেলোয়াড়' : 'Guest Player')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <span className="font-mono text-[11px] text-slate-400">{playerId}</span>
                    <button
                      onClick={handleCopyId}
                      title="Copy Player ID"
                      className="p-1 hover:text-amber-400 text-slate-500 transition-colors cursor-pointer"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* VIP Badge */}
              <div className="text-right">
                <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">
                  Club Tier
                </div>
                <div className="text-sm font-black text-amber-400 flex items-center justify-end gap-1">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>{vipTier}</span>
                </div>
              </div>
            </div>

            {/* VIP Points Progress */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  VIP Club Progress
                </span>
                <span className="font-mono font-bold text-amber-400">
                  {vipPoints} / {nextTierPoints} PTS ({vipProgress}%)
                </span>
              </div>
              <div className="w-full h-2 bg-[#090c14] rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500 shadow-xs"
                  style={{ width: `${vipProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. My Balance Display & Cashier Controls */}
          <div className="p-4 rounded-xl bg-[#111624] border border-[#20293d]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>{isBn ? 'আমার মূল ব্যালেন্স' : 'My Total Balance'}</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                BDT · ৳
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-[#00e701] font-mono tabular-nums tracking-tight mb-4">
              {formatBDT(balance)}
            </div>

            {/* Quick Action Buttons: Deposit & Withdrawal */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  onClose();
                  onOpenCashier('deposit');
                }}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>{isBn ? 'টাকা ডিপোজিট' : 'Deposit BDT'}</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenCashier('withdraw');
                }}
                className="py-2.5 px-3 rounded-xl bg-[#182133] hover:bg-[#202c44] border border-[#2e3b56] hover:border-slate-500 text-slate-100 font-bold text-xs sm:text-sm active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4 text-amber-400" />
                <span>{isBn ? 'টাকা উইথড্র' : 'Withdraw BDT'}</span>
              </button>
            </div>
          </div>

          {/* 3. Transaction Summary Highlights */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-[#0f1422] border border-[#1e2638]">
              <div className="text-[10px] text-slate-400 font-semibold mb-0.5">
                {isBn ? 'মোট ডিপোজিট' : 'Total Deposited'}
              </div>
              <div className="text-xs sm:text-sm font-bold font-mono text-emerald-400">
                ৳{totalDeposited.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#0f1422] border border-[#1e2638]">
              <div className="text-[10px] text-slate-400 font-semibold mb-0.5">
                {isBn ? 'মোট উইথড্র' : 'Total Withdrawn'}
              </div>
              <div className="text-xs sm:text-sm font-bold font-mono text-amber-400">
                ৳{totalWithdrawn.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#0f1422] border border-[#1e2638]">
              <div className="text-[10px] text-slate-400 font-semibold mb-0.5">
                {isBn ? 'পেন্ডিং রিকোয়েস্ট' : 'Pending Requests'}
              </div>
              <div className="text-xs sm:text-sm font-bold font-mono text-slate-200">
                {pendingCount}
              </div>
            </div>
          </div>

          {/* 4. Login / Registration / Logout Section */}
          <div className="p-4 rounded-xl bg-[#111624] border border-[#20293d] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                {isBn ? 'অ্যাকাউন্ট ম্যানেজমেন্ট' : 'Account Management'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {isAuthenticated ? 'Status: Authenticated' : 'Status: Guest Session'}
              </span>
            </div>

            {isAuthenticated ? (
              <div className="space-y-2.5">
                <div className="p-3 rounded-lg bg-[#0a0d16] border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-[10px]">Logged in as:</div>
                    <div className="font-semibold text-slate-200">{user?.email}</div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    Online
                  </span>
                </div>

                <button
                  onClick={async () => {
                    await logout();
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isBn ? 'লগআউট করুন' : 'Log Out from Account'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {isBn
                      ? 'লগইন করে আপনার ব্যালেন্স ও উইথড্র সুরক্ষিত রাখুন এবং ১০০% প্রথম ডিপোজিট বোনাস পান!'
                      : 'Login to save your balance, withdraw winnings, and unlock a 100% First Deposit Bonus!'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      openAuthModal('login');
                    }}
                    className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isBn ? 'লগইন' : 'Login'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      openAuthModal('register');
                    }}
                    className="py-2.5 rounded-xl bg-[#182133] hover:bg-[#202c44] border border-[#2e3b56] text-slate-100 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-amber-400" />
                    <span>{isBn ? 'রেজিস্টার' : 'Register'}</span>
                  </button>
                </div>

                {/* Direct Google Sign-In */}
                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={async () => {
                    setGoogleLoading(true);
                    const res = await signInWithGoogle();
                    setGoogleLoading(false);
                    if (res.success) {
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#090d16] hover:bg-[#121826] border border-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{googleLoading ? 'Connecting...' : 'One-Click Google Sign-In'}</span>
                </button>
              </div>
            )}
          </div>

          {/* 5. Extra App Settings & Info */}
          <div className="p-3.5 rounded-xl bg-[#0d111b] border border-[#1b2233] space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isBn ? 'সেটিংস ও সহায়তা' : 'Preferences & Support'}
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Language (ভাষা)</span>
              </span>
              <button
                onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                className="px-2.5 py-1 rounded-lg bg-[#182133] hover:bg-[#202c44] border border-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition-colors"
              >
                {language === 'en' ? 'বাংলায় দেখুন' : 'Switch to English'}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-300">
                {soundMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span>Sound FX (শব্দ)</span>
              </span>
              <button
                onClick={toggleSound}
                className="px-2.5 py-1 rounded-lg bg-[#182133] hover:bg-[#202c44] border border-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition-colors"
              >
                {soundMuted ? 'Muted (বন্ধ)' : 'Enabled (চালু)'}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Phone className="w-4 h-4 text-amber-400" />
                <span>Nagad Agent (ডিপোজিট নম্বর)</span>
              </span>
              <span className="font-mono font-bold text-amber-400">
                01759806218
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Fairness & Security</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Provably Fair SHA-256
              </span>
            </div>
          </div>

          {/* 6. Recent Transactions Log preview */}
          {transactions.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#0d111b] border border-[#1b2233]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {isBn ? 'সাম্প্রতিক ট্রানজ্যাকশন' : 'Recent Transactions'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {transactions.length} Records
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {transactions.slice(0, 4).map((tx, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-[#080c14] border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        tx.status === 'Success' ? 'bg-emerald-400' :
                        tx.status === 'Pending' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'
                      }`} />
                      <div>
                        <div className="font-bold text-slate-200">
                          {tx.type} ({tx.method})
                        </div>
                        <div className="text-[10px] text-slate-500">{tx.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-bold ${
                        tx.type === 'Withdraw' ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {tx.type === 'Withdraw' ? '-' : '+'}৳{tx.amount.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">{tx.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
