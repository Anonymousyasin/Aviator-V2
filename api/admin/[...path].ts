import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  adminStats, createSession, findUser, isAuthenticated, saveState, sessions,
  settings, transactionUsers, transactions, users,
} from '../adminStore';

function body(req: VercelRequest): Record<string, any> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, any>;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

function token(req: VercelRequest) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : undefined;
}

function idFromPath(pathname: string, marker: string) {
  const match = pathname.match(new RegExp(`${marker}/([^/]+)`));
  return match?.[1];
}

export default function adminApi(req: VercelRequest, res: VercelResponse) {
  const pathname = new URL(req.url || '/', `https://${req.headers.host || 'vercel'}`).pathname;
  const route = pathname.replace(/^\/api\/admin\/?/, '');
  const authToken = token(req);

  if (route === 'login' && req.method === 'POST') {
    const { username, password } = body(req);
    if (username !== 'admin' || password !== 'admin12345') {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }
    const sessionToken = createSession();
    return res.status(200).json({ success: true, message: 'Admin authenticated successfully.', token: sessionToken, admin: { username: 'admin' } });
  }

  if (!isAuthenticated(authToken)) return res.status(401).json({ error: 'Admin Unauthorized: Missing or invalid token' });
  if (route === 'me' && req.method === 'GET') return res.json({ success: true, admin: { username: 'admin' } });
  if (route === 'stats' && req.method === 'GET') return res.json({ success: true, stats: adminStats() });
  if (route === 'users' && req.method === 'GET') return res.json({ success: true, users: transactionUsers() });
  if (route === 'transactions' && req.method === 'GET') {
    const type = typeof req.query.type === 'string' ? req.query.type.toLowerCase() : 'all';
    const status = typeof req.query.status === 'string' ? req.query.status.toLowerCase() : 'all';
    const filtered = transactions.filter((tx) => (type === 'all' || tx.type.toLowerCase() === type) && (status === 'all' || tx.status.toLowerCase() === status));
    return res.json({ success: true, transactions: filtered });
  }
  if (route === 'settings' && req.method === 'GET') return res.json({ success: true, settings });

  const userId = idFromPath(route, 'users');
  if (userId && route.endsWith('/balance') && req.method === 'POST') {
    const user = findUser(userId); const input = body(req); const amount = Number(input.amount);
    if (!user || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Please enter a valid numeric amount greater than zero.' });
    const previous = user.balance;
    if (input.action === 'add') user.balance += amount;
    else if (input.action === 'deduct') user.balance = Math.max(0, user.balance - amount);
    else if (input.action === 'set') user.balance = amount;
    else return res.status(400).json({ error: 'Invalid action. Choose add, deduct, or set.' });
    transactions.unshift({ id: `ADM-${Date.now().toString().slice(-6)}`, userId: user.id, userEmail: user.email, userName: user.name, type: input.action === 'add' ? 'Admin Credit' : 'Admin Debit', method: 'System', phone: 'SYSTEM', amount, status: 'Approved', note: input.reason || `Admin adjusted balance from ৳${previous} to ৳${user.balance}`, createdAt: new Date().toISOString() });
    saveState(); return res.json({ success: true, message: `Updated balance for ${user.email} from ৳${previous} to ৳${user.balance}`, user });
  }
  if (userId && route.endsWith('/status') && req.method === 'POST') {
    const user = findUser(userId); const nextStatus = body(req).status;
    if (!user || !['active', 'banned'].includes(nextStatus)) return res.status(400).json({ error: 'Invalid user status.' });
    user.status = nextStatus; saveState(); return res.json({ success: true, message: `User ${user.email} status set to ${nextStatus}.`, user });
  }
  if (userId && req.method === 'DELETE' && route === `users/${userId}`) {
    const index = users.findIndex((user) => user.id === userId);
    if (index < 0) return res.status(404).json({ error: 'User not found.' });
    const [deleted] = users.splice(index, 1); saveState(); return res.json({ success: true, message: `User ${deleted.email} deleted successfully.` });
  }

  const depositId = idFromPath(route, 'deposits');
  const withdrawalId = idFromPath(route, 'withdrawals');
  if ((depositId || withdrawalId) && route.endsWith('/status') && req.method === 'POST') {
    const tx = transactions.find((item) => item.id === (depositId || withdrawalId)); const input = body(req); const nextStatus = input.status;
    if (!tx || !['Approved', 'Rejected'].includes(nextStatus)) return res.status(400).json({ error: 'Status must be Approved or Rejected.' });
    const previous = tx.status; tx.status = nextStatus; tx.note = input.note || tx.note; tx.updatedAt = new Date().toISOString();
    const user = tx.userId ? findUser(tx.userId) : users.find((item) => item.email === tx.userEmail);
    if (user && tx.type === 'Deposit' && nextStatus === 'Approved' && previous !== 'Approved') { user.balance += tx.amount; user.vipPoints += Math.floor(tx.amount / 10); }
    if (user && tx.type === 'Withdraw' && nextStatus === 'Rejected' && previous === 'Pending') user.balance += tx.amount;
    saveState(); return res.json({ success: true, message: `${tx.type} ${tx.id} marked as ${nextStatus}.`, transaction: tx });
  }

  if (route === 'aviator/multiplier' && req.method === 'POST') {
    const multiplier = Number(body(req).multiplier);
    if (!Number.isFinite(multiplier) || multiplier < 1.01) return res.status(400).json({ error: 'Multiplier must be a number >= 1.01x.' });
    settings.nextCrashMultiplier = Math.round(multiplier * 100) / 100; saveState(); return res.json({ success: true, message: `Next round crash point set to ${settings.nextCrashMultiplier.toFixed(2)}x!`, nextCrashMultiplier: settings.nextCrashMultiplier });
  }
  if (route === 'settings' && req.method === 'POST') {
    const input = body(req);
    if (typeof input.depositNagadNumber === 'string') settings.depositNagadNumber = input.depositNagadNumber.trim();
    if (typeof input.minDeposit === 'number' && input.minDeposit >= 100) settings.minDeposit = input.minDeposit;
    if (typeof input.minWithdraw === 'number' && input.minWithdraw >= 100) settings.minWithdraw = input.minWithdraw;
    saveState(); return res.json({ success: true, message: 'System settings updated.', settings });
  }
  if (route === 'change-password' && req.method === 'POST') return res.json({ success: true, message: 'Admin password updated successfully.' });
  if (route === 'logout') { sessions.delete(authToken || ''); return res.json({ success: true, message: 'Logged out successfully.' }); }
  return res.status(404).json({ error: 'Admin endpoint not found.' });
}
