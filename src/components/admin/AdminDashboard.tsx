import React, { useState, useEffect } from 'react';
import { formatBDT } from '../../utils/format';
import {
  Shield,
  Lock,
  User as UserIcon,
  Users,
  DollarSign,
  ArrowDownToLine,
  PlusCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  LogOut,
  Flame,
  Settings,
  AlertTriangle,
  ArrowLeft,
  Key,
  Trash2,
  Ban,
  Check,
  Search,
  ExternalLink,
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalBalance: number;
  pendingDepositsCount: number;
  pendingWithdrawalsCount: number;
  approvedDepositsVolume: number;
  approvedWithdrawalsVolume: number;
  totalTransactions: number;
}

interface UserItem {
  id: string;
  email: string;
  name: string;
  balance: number;
  vipPoints: number;
  status: 'active' | 'banned';
  createdAt: string;
  transactionsCount: number;
}

interface TransactionItem {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  type: 'Deposit' | 'Withdraw' | 'Admin Credit' | 'Admin Debit';
  method: 'Nagad' | 'bKash' | 'System';
  phone: string;
  amount: number;
  trxId?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

interface AdminDashboardProps {
  onClose: () => void;
}

const ADMIN_TOKEN_KEY = 'aviator_admin_auth_token';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  // Auth state
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<'overview' | 'deposits' | 'withdrawals' | 'users' | 'game' | 'settings'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');

  // Actions state
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Balance edit modal
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [creditAction, setCreditAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [creditAmount, setCreditAmount] = useState<string>('1000');
  const [creditReason, setCreditReason] = useState<string>('Admin bonus');

  // Next crash multiplier preset
  const [customCrashMultiplier, setCustomCrashMultiplier] = useState<string>('10.00');

  // Change password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // Auto-refresh timer
  useEffect(() => {
    if (!adminToken) return;

    loadAllData();
    const interval = setInterval(loadAllData, 10000);
    return () => clearInterval(interval);
  }, [adminToken]);

  const loadAllData = async () => {
    if (!adminToken) return;
    setLoadingData(true);
    try {
      const [resStats, resUsers, resTx] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch('/api/admin/transactions', { headers: { Authorization: `Bearer ${adminToken}` } }),
      ]);

      if (resStats.status === 401) {
        handleLogout();
        return;
      }

      const dataStats = await resStats.json();
      const dataUsers = await resUsers.json();
      const dataTx = await resTx.json();

      if (dataStats.success) setStats(dataStats.stats);
      if (dataUsers.success) setUsers(dataUsers.users);
      if (dataTx.success) setTransactions(dataTx.transactions);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || 'Invalid credentials');
        return;
      }

      setAdminToken(data.token);
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setPassword('');
    } catch {
      setAuthError('Connection error. Server may be reloading.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
  };

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Deposit Actions (Approve / Reject)
  const handleDepositStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/deposits/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(data.message, 'success');
        loadAllData();
      } else {
        showFeedback(data.error || 'Failed to update deposit', 'error');
      }
    } catch {
      showFeedback('Network error updating deposit', 'error');
    }
  };

  // Withdrawal Actions (Approve / Reject)
  const handleWithdrawalStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(data.message, 'success');
        loadAllData();
      } else {
        showFeedback(data.error || 'Failed to update withdrawal', 'error');
      }
    } catch {
      showFeedback('Network error updating withdrawal', 'error');
    }
  };

  // User Credit Adjust
  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !adminToken) return;

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          action: creditAction,
          amount: parseFloat(creditAmount),
          reason: creditReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback(data.message, 'success');
        setEditingUser(null);
        loadAllData();
      } else {
        showFeedback(data.error || 'Failed to adjust balance', 'error');
      }
    } catch {
      showFeedback('Network error adjusting balance', 'error');
    }
  };

  // User Status Toggle (Ban / Unban)
  const handleToggleUserStatus = async (user: UserItem) => {
    if (!adminToken) return;
    const newStatus = user.status === 'banned' ? 'active' : 'banned';
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(data.message, 'success');
        loadAllData();
      }
    } catch {
      showFeedback('Failed to update user status', 'error');
    }
  };

  // Delete User
  const handleDeleteUser = async (id: string, email: string) => {
    if (!window.confirm(`Are you sure you want to completely delete user ${email}?`)) return;
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(data.message, 'success');
        loadAllData();
      }
    } catch {
      showFeedback('Failed to delete user', 'error');
    }
  };

  // Preset Next Crash Multiplier
  const handleSetCrashMultiplier = async (val: string) => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/admin/aviator/multiplier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ multiplier: parseFloat(val) }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(data.message, 'success');
      } else {
        showFeedback(data.error || 'Failed to set multiplier', 'error');
      }
    } catch {
      showFeedback('Network error setting multiplier', 'error');
    }
  };

  // Change Admin Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      showFeedback('New passwords do not match!', 'error');
      return;
    }
    if (!adminToken) return;

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Admin password updated successfully!', 'success');
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
      } else {
        showFeedback(data.error || 'Failed to change password', 'error');
      }
    } catch {
      showFeedback('Network error changing password', 'error');
    }
  };

  // If not logged in as Admin, show login screen
  if (!adminToken) {
    return (
      <div className="fixed inset-0 z-50 bg-[#06080d] flex items-center justify-center p-4 select-none">
        <div className="w-full max-w-md bg-[#0f141f] border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />
          
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-600/15 border border-red-500/40 flex items-center justify-center text-red-500 mb-3 shadow-lg shadow-red-500/10">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white tracking-wide">Ace67 Master Control</h2>
            <p className="text-xs text-slate-400 mt-1">Authorized Administration & Financial Audit Portal</p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full bg-[#080d16] border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#080d16] border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-sm shadow-lg shadow-red-600/30 hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authLoading ? 'Verifying Credentials...' : 'Authenticate Master Admin'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Default: admin / admin12345</span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white underline cursor-pointer"
            >
              ← Back to Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  const depositTransactions = transactions.filter((t) => t.type === 'Deposit');
  const withdrawalTransactions = transactions.filter((t) => t.type === 'Withdraw');
  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e] text-slate-100 flex flex-col font-sans overflow-hidden select-none">
      
      {/* Top Navbar */}
      <header className="bg-[#0b0e17] border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-500 shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base sm:text-lg text-white tracking-wide">
                Ace67 Master Control
              </h1>
              <span className="text-[10px] bg-red-600/30 text-red-400 border border-red-500/40 font-mono px-1.5 py-0.2 rounded font-bold uppercase">
                SuperAdmin
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Real-time Financial & Player Control Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={loadAllData}
            title="Refresh Data"
            className="p-2 text-slate-400 hover:text-white bg-[#121622] border border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold bg-[#141b2a] hover:bg-[#1d273d] text-emerald-400 border border-emerald-500/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Play Aviator</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs font-bold bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`mx-4 mt-3 p-3 rounded-xl text-xs flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
              : 'bg-red-950 border border-red-500/50 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="bg-[#090c14] border-b border-slate-800 px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-2 shrink-0 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('deposits')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap relative ${
            activeTab === 'deposits' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>Deposits Control</span>
          {(stats?.pendingDepositsCount || 0) > 0 && (
            <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
              {stats?.pendingDepositsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap relative ${
            activeTab === 'withdrawals' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4 text-amber-400" />
          <span>Withdrawals Control</span>
          {(stats?.pendingWithdrawalsCount || 0) > 0 && (
            <span className="bg-red-500 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
              {stats?.pendingWithdrawalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'users' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-blue-400" />
          <span>Users & Credits</span>
        </button>

        <button
          onClick={() => setActiveTab('game')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'game' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-4 h-4 text-red-500" />
          <span>Aviator Engine Rig</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'settings' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Security & Password</span>
        </button>
      </div>

      {/* Main Body */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {/* =========================================
            TAB 1: OVERVIEW METRICS
        ========================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-[#0e1320] border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Total Players</span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {stats?.totalUsers || 0}
                </div>
                <div className="text-[11px] text-emerald-400 mt-1">
                  {stats?.activeUsers || 0} Active Accounts
                </div>
              </div>

              <div className="bg-[#0e1320] border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Player Balances</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {formatBDT(stats?.totalBalance || 0)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Platform Total Liability</div>
              </div>

              <div className="bg-[#0e1320] border border-amber-500/30 p-4 rounded-2xl bg-amber-500/5">
                <div className="flex items-center justify-between text-amber-400 text-xs mb-1">
                  <span>Pending Deposits</span>
                  <PlusCircle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black font-mono text-amber-300">
                  {stats?.pendingDepositsCount || 0}
                </div>
                <div className="text-[11px] text-amber-300/80 mt-1">Awaiting verification</div>
              </div>

              <div className="bg-[#0e1320] border border-red-500/30 p-4 rounded-2xl bg-red-500/5">
                <div className="flex items-center justify-between text-red-400 text-xs mb-1">
                  <span>Pending Withdrawals</span>
                  <ArrowDownToLine className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-2xl font-black font-mono text-red-400">
                  {stats?.pendingWithdrawalsCount || 0}
                </div>
                <div className="text-[11px] text-red-300/80 mt-1">Awaiting dispatch</div>
              </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pending Deposits Preview */}
              <div className="bg-[#0c101a] border border-slate-800 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-emerald-400" />
                    <span>Pending Deposit Approvals</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('deposits')}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    View All →
                  </button>
                </div>

                {depositTransactions.filter((d) => d.status === 'Pending').length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs bg-[#080b12] rounded-xl border border-slate-800/60">
                    No pending deposits. All requests have been processed!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {depositTransactions
                      .filter((d) => d.status === 'Pending')
                      .slice(0, 4)
                      .map((d) => (
                        <div
                          key={d.id}
                          className="p-3 rounded-xl bg-[#080d16] border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-white">{d.userEmail || d.phone}</div>
                            <div className="text-[11px] text-amber-300 font-mono">
                              TrxID: {d.trxId} · {d.phone}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-emerald-400 text-sm">
                              +{formatBDT(d.amount)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDepositStatus(d.id, 'Approved')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDepositStatus(d.id, 'Rejected')}
                                className="px-2 py-1 bg-red-600/30 hover:bg-red-600 text-red-300 font-bold rounded-lg cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Pending Withdrawals Preview */}
              <div className="bg-[#0c101a] border border-slate-800 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4 text-red-400" />
                    <span>Pending Withdrawal Requests</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('withdrawals')}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    View All →
                  </button>
                </div>

                {withdrawalTransactions.filter((w) => w.status === 'Pending').length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs bg-[#080b12] rounded-xl border border-slate-800/60">
                    No pending withdrawals. All payout requests resolved!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {withdrawalTransactions
                      .filter((w) => w.status === 'Pending')
                      .slice(0, 4)
                      .map((w) => (
                        <div
                          key={w.id}
                          className="p-3 rounded-xl bg-[#080d16] border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-white">{w.userEmail || w.phone}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              To: {w.method} · {w.phone}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-red-400 text-sm">
                              -{formatBDT(w.amount)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleWithdrawalStatus(w.id, 'Approved')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer"
                              >
                                Pay
                              </button>
                              <button
                                onClick={() => handleWithdrawalStatus(w.id, 'Rejected')}
                                className="px-2 py-1 bg-red-600/30 hover:bg-red-600 text-red-300 font-bold rounded-lg cursor-pointer"
                              >
                                Refund
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            TAB 2: DEPOSIT REQUESTS CONTROL
        ========================================= */}
        {activeTab === 'deposits' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Deposit Requests Control (Nagad)</h2>
                <p className="text-xs text-slate-400">Review Nagad Transaction IDs and credit player balances</p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {depositTransactions.length} Total Deposits
              </span>
            </div>

            <div className="bg-[#0c101a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#080b12] text-slate-400 border-b border-slate-800 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="p-3.5">ID / Date</th>
                      <th className="p-3.5">Player</th>
                      <th className="p-3.5">Nagad Number</th>
                      <th className="p-3.5">Transaction ID</th>
                      <th className="p-3.5 text-right">Amount</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {depositTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No deposit requests found.
                        </td>
                      </tr>
                    ) : (
                      depositTransactions.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-3.5 font-mono">
                            <span className="font-bold text-white block">{d.id}</span>
                            <span className="text-[10px] text-slate-500">{new Date(d.createdAt).toLocaleString()}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-200 block">{d.userName || 'Player'}</span>
                            <span className="text-slate-400 text-[11px] font-mono">{d.userEmail}</span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300">{d.phone}</td>
                          <td className="p-3.5">
                            <span className="bg-slate-900 border border-slate-700 px-2 py-1 rounded font-mono font-bold text-amber-300 text-xs">
                              {d.trxId || 'N/A'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-black text-emerald-400 text-sm">
                            +{formatBDT(d.amount)}
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                d.status === 'Approved'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                                  : d.status === 'Rejected'
                                  ? 'bg-red-950 text-red-400 border border-red-700/60'
                                  : 'bg-amber-950 text-amber-300 border border-amber-700/60 animate-pulse'
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            {d.status === 'Pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleDepositStatus(d.id, 'Approved')}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer shadow-sm text-xs"
                                >
                                  ✓ Approve (+Credit)
                                </button>
                                <button
                                  onClick={() => handleDepositStatus(d.id, 'Rejected')}
                                  className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 font-bold rounded-lg cursor-pointer text-xs"
                                >
                                  ✕ Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            TAB 3: WITHDRAWAL REQUESTS CONTROL
        ========================================= */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Withdrawal Requests Control</h2>
                <p className="text-xs text-slate-400">Process player cashouts or refund failed requests</p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {withdrawalTransactions.length} Total Withdrawals
              </span>
            </div>

            <div className="bg-[#0c101a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#080b12] text-slate-400 border-b border-slate-800 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="p-3.5">ID / Date</th>
                      <th className="p-3.5">Player</th>
                      <th className="p-3.5">Channel / Phone</th>
                      <th className="p-3.5 text-right">Amount</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {withdrawalTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No withdrawal requests found.
                        </td>
                      </tr>
                    ) : (
                      withdrawalTransactions.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-3.5 font-mono">
                            <span className="font-bold text-white block">{w.id}</span>
                            <span className="text-[10px] text-slate-500">{new Date(w.createdAt).toLocaleString()}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-200 block">{w.userName || 'Player'}</span>
                            <span className="text-slate-400 text-[11px] font-mono">{w.userEmail}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-white block">{w.method}</span>
                            <span className="font-mono text-slate-400">{w.phone}</span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-black text-red-400 text-sm">
                            -{formatBDT(w.amount)}
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                w.status === 'Approved'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                                  : w.status === 'Rejected'
                                  ? 'bg-red-950 text-red-400 border border-red-700/60'
                                  : 'bg-red-950/70 text-red-300 border border-red-700/60 animate-pulse'
                              }`}
                            >
                              {w.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            {w.status === 'Pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleWithdrawalStatus(w.id, 'Approved')}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer shadow-sm text-xs"
                                >
                                  ✓ Mark Paid
                                </button>
                                <button
                                  onClick={() => handleWithdrawalStatus(w.id, 'Rejected')}
                                  className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 font-bold rounded-lg cursor-pointer text-xs"
                                >
                                  ✕ Reject & Refund
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            TAB 4: USERS & CREDITS CONTROL
        ========================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">Player Accounts & Wallet Credits</h2>
                <p className="text-xs text-slate-400">Search, add/deduct credits, ban/unban, or manage users</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by email or name..."
                  className="w-full bg-[#0c101a] border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="bg-[#0c101a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#080b12] text-slate-400 border-b border-slate-800 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="p-3.5">Player / Email</th>
                      <th className="p-3.5">Balance</th>
                      <th className="p-3.5">VIP Points</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5">Joined</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No players match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-xs">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-white block">{u.name}</span>
                                <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono font-black text-amber-400 text-sm">
                            {formatBDT(u.balance)}
                          </td>
                          <td className="p-3.5 font-mono text-slate-300">
                            {u.vipPoints} pts
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'banned'
                                  ? 'bg-red-950 text-red-400 border border-red-700/60'
                                  : 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                              }`}
                            >
                              {u.status === 'banned' ? 'Banned' : 'Active'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setCreditAction('add');
                                  setCreditAmount('1000');
                                }}
                                className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold rounded-lg cursor-pointer text-xs shadow-xs"
                              >
                                ± Credits
                              </button>

                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                title={u.status === 'banned' ? 'Unban Account' : 'Ban Account'}
                                className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                                  u.status === 'banned'
                                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-400'
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-red-400'
                                }`}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                title="Delete Account"
                                className="p-1.5 bg-slate-900 hover:bg-red-950 border border-slate-700 hover:border-red-600 text-slate-400 hover:text-red-400 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            TAB 5: AVIATOR ENGINE RIG & MULTIPLIER
        ========================================= */}
        {activeTab === 'game' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                <span>Aviator Trajectory Engine Control</span>
              </h2>
              <p className="text-xs text-slate-400">
                Preset the exact multiplier for the next upcoming flight round
              </p>
            </div>

            <div className="bg-[#0c101a] border border-red-500/30 rounded-2xl p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Target Next Round Crash Multiplier (যেমন 15.50x বা 100.00x)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    value={customCrashMultiplier}
                    onChange={(e) => setCustomCrashMultiplier(e.target.value)}
                    className="flex-1 bg-[#080d16] border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono font-black text-amber-400 focus:outline-none focus:border-red-500"
                  />
                  <button
                    onClick={() => handleSetCrashMultiplier(customCrashMultiplier)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-sm hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-lg shadow-red-600/30"
                  >
                    Lock Multiplier
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="block text-xs font-semibold text-slate-400 mb-2">
                  Instant Multiplier Presets:
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {['1.15', '1.80', '2.50', '5.00', '10.00', '50.00', '100.00'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setCustomCrashMultiplier(preset);
                        handleSetCrashMultiplier(preset);
                      }}
                      className="py-2 px-1 text-center font-mono font-bold text-xs bg-[#080d16] hover:bg-red-600/20 border border-slate-700 hover:border-red-500/50 text-slate-200 rounded-xl transition-all cursor-pointer"
                    >
                      {preset}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  How Multiplier Rigging Works:
                </p>
                <p className="text-slate-300">
                  When you lock a multiplier, the very next round of the Aviator red plane will fly up smoothly and crash at that exact target point, allowing you to test massive payouts or instant crashes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            TAB 6: SECURITY & PASSWORD
        ========================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-xl mx-auto">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <span>Admin Security & Credentials</span>
              </h2>
              <p className="text-xs text-slate-400">Update your master admin login password</p>
            </div>

            <form onSubmit={handleChangePassword} className="bg-[#0c101a] border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Current Admin Password
                </label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Current password"
                  required
                  className="w-full bg-[#080d16] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Admin Password
                </label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  className="w-full bg-[#080d16] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="w-full bg-[#080d16] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black text-sm shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer"
              >
                Update Admin Password
              </button>
            </form>
          </div>
        )}

      </main>

      {/* BALANCE ADJUST MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0f141f] border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Adjust Player Balance</h3>
                <p className="text-xs text-slate-400">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustBalance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Action Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreditAction('add')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      creditAction === 'add'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    + Add Credits
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditAction('deduct')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      creditAction === 'deduct'
                        ? 'bg-red-600/20 border-red-500 text-red-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    - Deduct
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditAction('set')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      creditAction === 'set'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Set Exact
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Amount (BDT)
                </label>
                <input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  required
                  className="w-full bg-[#080d16] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                />
                <div className="flex gap-1.5 mt-2">
                  {[500, 1000, 2000, 5000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setCreditAmount(v.toString())}
                      className="flex-1 py-1 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 font-mono"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Audit Reason / Note
                </label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="e.g. VIP Reload Bonus, Customer Support"
                  className="w-full bg-[#080d16] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black text-xs hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                >
                  Apply Balance Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
