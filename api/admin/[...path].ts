import type { VercelRequest, VercelResponse } from '@vercel/node';

type User = { id: string; email: string; name: string; balance: number; vipPoints: number; status: 'active' | 'banned'; createdAt: string };
type Tx = { id: string; userId: string; userEmail: string; userName: string; type: 'Deposit' | 'Withdraw' | 'Admin Credit' | 'Admin Debit'; method: 'Nagad' | 'bKash' | 'System'; phone: string; amount: number; trxId?: string; status: 'Pending' | 'Approved' | 'Rejected'; note?: string; createdAt: string; updatedAt?: string };

const user: User = { id: 'user_demo_1001', email: 'player@aviator.bd', name: 'Shakib Gamer', balance: 0, vipPoints: 350, status: 'active', createdAt: new Date().toISOString() };
const users: User[] = [user];
const transactions: Tx[] = [
  { id: 'DEP-982142', userId: user.id, userEmail: user.email, userName: user.name, type: 'Deposit', method: 'Nagad', phone: '01712345678', amount: 1500, trxId: '9G7K2LMN8P', status: 'Pending', createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: 'WD-541290', userId: user.id, userEmail: user.email, userName: user.name, type: 'Withdraw', method: 'Nagad', phone: '01712345678', amount: 1000, status: 'Pending', createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
];
const settings = { nextCrashMultiplier: null as number | null, minDeposit: 500, minWithdraw: 500, depositNagadNumber: '01759806218' };

function input(req: VercelRequest) {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, any>;
  try { return JSON.parse(String(req.body || '{}')) as Record<string, any>; } catch { return {}; }
}
function authorized(req: VercelRequest) { return (req.headers.authorization || '') === 'Bearer admin_vercel_master_session'; }
function stats() {
  return {
    totalUsers: users.length, activeUsers: users.filter((u) => u.status !== 'banned').length,
    totalBalance: users.reduce((sum, u) => sum + u.balance, 0),
    pendingDepositsCount: transactions.filter((t) => t.type === 'Deposit' && t.status === 'Pending').length,
    pendingWithdrawalsCount: transactions.filter((t) => t.type === 'Withdraw' && t.status === 'Pending').length,
    approvedDepositsVolume: transactions.filter((t) => t.type === 'Deposit' && t.status === 'Approved').reduce((sum, t) => sum + t.amount, 0),
    approvedWithdrawalsVolume: transactions.filter((t) => t.type === 'Withdraw' && t.status === 'Approved').reduce((sum, t) => sum + t.amount, 0),
    totalTransactions: transactions.length,
  };
}

export default function adminApi(req: VercelRequest, res: VercelResponse) {
  const pathname = new URL(req.url || '/', `https://${req.headers.host || 'vercel'}`).pathname;
  const route = pathname.replace(/^\/api\/admin\/?/, '');
  if (!authorized(req)) return res.status(401).json({ error: 'Admin Unauthorized: Missing or invalid token' });
  if (route === 'me') return res.json({ success: true, admin: { username: 'admin' } });
  if (route === 'stats') return res.json({ success: true, stats: stats() });
  if (route === 'users') return res.json({ success: true, users: users.map((u) => ({ ...u, transactionsCount: transactions.filter((t) => t.userId === u.id).length })) });
  if (route === 'transactions') return res.json({ success: true, transactions });
  if (route === 'settings' && req.method === 'GET') return res.json({ success: true, settings });
  if (route === 'logout') return res.json({ success: true, message: 'Logged out successfully.' });
  if (route === 'change-password') return res.json({ success: true, message: 'Admin password updated successfully.' });
  if (route === 'settings' && req.method === 'POST') { Object.assign(settings, input(req)); return res.json({ success: true, message: 'System settings updated.', settings }); }
  if (route === 'aviator/multiplier') { settings.nextCrashMultiplier = Number(input(req).multiplier); return res.json({ success: true, message: `Next round crash point set to ${settings.nextCrashMultiplier.toFixed(2)}x!`, nextCrashMultiplier: settings.nextCrashMultiplier }); }

  const userMatch = route.match(/^users\/([^/]+)(?:\/(balance|status))?$/);
  if (userMatch) {
    const target = users.find((u) => u.id === userMatch[1]);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (userMatch[2] === 'balance') { const data = input(req); const amount = Number(data.amount); if (data.action === 'add') target.balance += amount; else if (data.action === 'deduct') target.balance = Math.max(0, target.balance - amount); else target.balance = amount; return res.json({ success: true, message: `Updated balance for ${target.email}.`, user: target }); }
    if (userMatch[2] === 'status') { target.status = input(req).status === 'banned' ? 'banned' : 'active'; return res.json({ success: true, message: `User ${target.email} status set to ${target.status}.`, user: target }); }
  }

  const txMatch = route.match(/^(deposits|withdrawals)\/([^/]+)\/status$/);
  if (txMatch) { const tx = transactions.find((t) => t.id === txMatch[2]); if (!tx) return res.status(404).json({ error: 'Transaction not found.' }); tx.status = input(req).status === 'Rejected' ? 'Rejected' : 'Approved'; tx.updatedAt = new Date().toISOString(); if (tx.type === 'Deposit' && tx.status === 'Approved') user.balance += tx.amount; if (tx.type === 'Withdraw' && tx.status === 'Rejected') user.balance += tx.amount; return res.json({ success: true, message: `${tx.type} ${tx.id} marked as ${tx.status}.`, transaction: tx }); }
  return res.status(404).json({ error: 'Admin endpoint not found.' });
}
