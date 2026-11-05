import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// Persistent storage setup
const DATA_DIR = path.resolve(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  balance: number;
  vipPoints: number;
  status: 'active' | 'banned';
  createdAt: string;
}

interface StoredAdmin {
  username: string;
  passwordHash: string;
  salt: string;
}

interface StoredTransaction {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  type: 'Deposit' | 'Withdraw' | 'Admin Credit' | 'Admin Debit';
  method: 'Nagad' | 'bKash' | 'System';
  phone: string;
  amount: number;
  trxId?: string; // for Nagad deposits
  status: 'Pending' | 'Approved' | 'Rejected';
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

interface AppSettings {
  nextCrashMultiplier: number | null;
  minDeposit: number;
  minWithdraw: number;
  depositNagadNumber: string;
}

interface UserSession {
  userId: string;
  createdAt: number;
}

interface AdminSession {
  username: string;
  createdAt: number;
}

// In-memory sessions store
const sessions = new Map<string, UserSession>();
const adminSessions = new Map<string, AdminSession>();

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// --- FILE HELPERS ---
function loadJson<T>(file: string, fallback: T): T {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error loading file ${file}:`, err);
  }
  return fallback;
}

function saveJson<T>(file: string, data: T): void {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error saving file ${file}:`, err);
  }
}

// Initialize Admin credentials if not present
let adminData = loadJson<StoredAdmin | null>(ADMIN_FILE, null);
if (!adminData) {
  const adminSalt = crypto.randomBytes(16).toString('hex');
  adminData = {
    username: 'admin',
    passwordHash: hashPassword('admin12345', adminSalt),
    salt: adminSalt,
  };
  saveJson(ADMIN_FILE, adminData);
}

// Initialize Settings if not present
let settingsData = loadJson<AppSettings>(SETTINGS_FILE, {
  nextCrashMultiplier: null,
  minDeposit: 500,
  minWithdraw: 500,
  depositNagadNumber: '01759806218',
});

// Initialize Users
let usersCache = loadJson<StoredUser[]>(USERS_FILE, []);
if (usersCache.length === 0) {
  const demoSalt = crypto.randomBytes(16).toString('hex');
  const demoUser: StoredUser = {
    id: 'user_demo_1001',
    email: 'player@aviator.bd',
    name: 'Shakib Gamer',
    passwordHash: hashPassword('aviator123', demoSalt),
    salt: demoSalt,
    balance: 5000,
    vipPoints: 350,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  usersCache.push(demoUser);
  saveJson(USERS_FILE, usersCache);
} else {
  // ensure status field
  usersCache.forEach((u) => {
    if (!u.status) u.status = 'active';
  });
  saveJson(USERS_FILE, usersCache);
}

// Initialize Transactions
let transactionsCache = loadJson<StoredTransaction[]>(TRANSACTIONS_FILE, []);
if (transactionsCache.length === 0) {
  // seed initial demo transactions for immediate review in admin dashboard
  transactionsCache = [
    {
      id: 'DEP-982142',
      userId: 'user_demo_1001',
      userEmail: 'player@aviator.bd',
      userName: 'Shakib Gamer',
      type: 'Deposit',
      method: 'Nagad',
      phone: '01712345678',
      amount: 1500,
      trxId: '9G7K2LMN8P',
      status: 'Pending',
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'WD-541290',
      userId: 'user_demo_1001',
      userEmail: 'player@aviator.bd',
      userName: 'Shakib Gamer',
      type: 'Withdraw',
      method: 'Nagad',
      phone: '01712345678',
      amount: 1000,
      status: 'Pending',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
  ];
  saveJson(TRANSACTIONS_FILE, transactionsCache);
}

function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    balance: user.balance,
    vipPoints: user.vipPoints,
    status: user.status,
    createdAt: user.createdAt,
  };
}

// --- MIDDLEWARES ---
function userAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
  }

  usersCache = loadJson<StoredUser[]>(USERS_FILE, []);
  const user = usersCache.find((u) => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User not found' });
  }

  if (user.status === 'banned') {
    return res.status(403).json({ error: 'Your account has been suspended by administration.' });
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
}

function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];
  const session = adminSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Admin Unauthorized: Session expired' });
  }

  (req as any).admin = session;
  next();
}

// --- API ROUTER ---
const apiRouter = express.Router();

// ==========================================
// 1. PUBLIC USER AUTH & ACTIONS
// ==========================================
apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  usersCache = loadJson<StoredUser[]>(USERS_FILE, []);

  const existing = usersCache.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const userId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const newUser: StoredUser = {
    id: userId,
    email: normalizedEmail,
    name: (name && typeof name === 'string' && name.trim()) ? name.trim() : normalizedEmail.split('@')[0],
    passwordHash,
    salt,
    balance: 5000,
    vipPoints: 200,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  usersCache.push(newUser);
  saveJson(USERS_FILE, usersCache);

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId, createdAt: Date.now() });

  res.status(201).json({
    success: true,
    message: 'Registration successful! Welcome to Aviator.',
    user: sanitizeUser(newUser),
    token,
  });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide both email and password.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  usersCache = loadJson<StoredUser[]>(USERS_FILE, []);

  const user = usersCache.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.status === 'banned') {
    return res.status(403).json({ error: 'This account has been banned by administration.' });
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId: user.id, createdAt: Date.now() });

  res.json({
    success: true,
    message: 'Login successful!',
    user: sanitizeUser(user),
    token,
  });
});

apiRouter.get('/auth/me', userAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  res.json({
    success: true,
    user: sanitizeUser(user),
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    sessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.post('/user/sync-wallet', userAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  const { balance, vipPoints } = req.body;

  if (typeof balance === 'number' && balance >= 0) {
    user.balance = Math.round(balance * 100) / 100;
  }
  if (typeof vipPoints === 'number' && vipPoints >= 0) {
    user.vipPoints = vipPoints;
  }

  saveJson(USERS_FILE, usersCache);

  res.json({
    success: true,
    user: sanitizeUser(user),
  });
});

// User submit Deposit Request
apiRouter.post('/user/deposit-request', userAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  const { phone, amount, trxId } = req.body;

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount < 500) {
    return res.status(400).json({ error: 'Minimum deposit amount is ৳500.' });
  }

  if (!trxId || typeof trxId !== 'string' || trxId.trim().length < 6) {
    return res.status(400).json({ error: 'Please enter a valid Nagad Transaction ID.' });
  }

  const newTx: StoredTransaction = {
    id: `DEP-${Math.floor(100000 + Math.random() * 900000)}`,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    type: 'Deposit',
    method: 'Nagad',
    phone: phone || '01XXXXXXXXX',
    amount: numAmount,
    trxId: trxId.trim().toUpperCase(),
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };

  transactionsCache = loadJson<StoredTransaction[]>(TRANSACTIONS_FILE, []);
  transactionsCache.unshift(newTx);
  saveJson(TRANSACTIONS_FILE, transactionsCache);

  res.status(201).json({
    success: true,
    message: `Deposit request of ৳${numAmount.toLocaleString()} submitted for review!`,
    transaction: newTx,
  });
});

// User submit Withdrawal Request
apiRouter.post('/user/withdraw-request', userAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  const { method, phone, amount } = req.body;

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount < 500) {
    return res.status(400).json({ error: 'Minimum withdrawal amount is ৳500.' });
  }

  if (numAmount > user.balance) {
    return res.status(400).json({ error: 'Insufficient balance for this withdrawal.' });
  }

  // Deduct balance immediately upon request
  user.balance = Math.round((user.balance - numAmount) * 100) / 100;
  saveJson(USERS_FILE, usersCache);

  const newTx: StoredTransaction = {
    id: `WD-${Math.floor(100000 + Math.random() * 900000)}`,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    type: 'Withdraw',
    method: method === 'bKash' ? 'bKash' : 'Nagad',
    phone: phone || '01XXXXXXXXX',
    amount: numAmount,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };

  transactionsCache = loadJson<StoredTransaction[]>(TRANSACTIONS_FILE, []);
  transactionsCache.unshift(newTx);
  saveJson(TRANSACTIONS_FILE, transactionsCache);

  res.status(201).json({
    success: true,
    message: `Withdrawal request of ৳${numAmount.toLocaleString()} submitted.`,
    balance: user.balance,
    transaction: newTx,
  });
});

// Check if next round crash multiplier is predetermined by admin
apiRouter.get('/aviator/next-crash', (_req: Request, res: Response) => {
  settingsData = loadJson<AppSettings>(SETTINGS_FILE, {
    nextCrashMultiplier: null,
    minDeposit: 500,
    minWithdraw: 500,
    depositNagadNumber: '01759806218',
  });

  const customMultiplier = settingsData.nextCrashMultiplier;
  if (customMultiplier !== null && customMultiplier > 1.0) {
    // Reset back to null after consuming once
    settingsData.nextCrashMultiplier = null;
    saveJson(SETTINGS_FILE, settingsData);
    return res.json({ multiplier: customMultiplier, forced: true });
  }

  res.json({ multiplier: null, forced: false });
});

// ==========================================
// 2. ADMIN AUTH & DASHBOARD CONTROL ROUTES
// ==========================================

// Admin Login
apiRouter.post('/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter admin username and password.' });
  }

  adminData = loadJson<StoredAdmin>(ADMIN_FILE, adminData!);
  if (username.trim() !== adminData.username) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const hash = hashPassword(password, adminData.salt);
  if (hash !== adminData.passwordHash) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const token = `admin_${crypto.randomBytes(32).toString('hex')}`;
  adminSessions.set(token, { username: adminData.username, createdAt: Date.now() });

  res.json({
    success: true,
    message: 'Admin authenticated successfully.',
    token,
    admin: { username: adminData.username },
  });
});

// Admin Verify Session
apiRouter.get('/admin/me', adminAuthMiddleware, (req: Request, res: Response) => {
  const admin = (req as any).admin as AdminSession;
  res.json({
    success: true,
    admin: { username: admin.username },
  });
});

// Admin Change Password
apiRouter.post('/admin/change-password', adminAuthMiddleware, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  adminData = loadJson<StoredAdmin>(ADMIN_FILE, adminData!);
  const currentHash = hashPassword(currentPassword, adminData.salt);
  if (currentHash !== adminData.passwordHash) {
    return res.status(401).json({ error: 'Current admin password is incorrect.' });
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  adminData.salt = newSalt;
  adminData.passwordHash = hashPassword(newPassword, newSalt);
  saveJson(ADMIN_FILE, adminData);

  res.json({ success: true, message: 'Admin password updated successfully.' });
});

// Admin KPI Stats
apiRouter.get('/admin/stats', adminAuthMiddleware, (_req: Request, res: Response) => {
  usersCache = loadJson<StoredUser[]>(USERS_FILE, []);
  transactionsCache = loadJson<StoredTransaction[]>(TRANSACTIONS_FILE, []);

  const totalUsers = usersCache.length;
  const activeUsers = usersCache.filter((u) => u.status !== 'banned').length;
  const totalBalance = usersCache.reduce((acc, u) => acc + (u.balance || 0), 0);

  const pendingDeposits = transactionsCache.filter((t) => t.type === 'Deposit' && t.status === 'Pending');
  const pendingWithdrawals = transactionsCache.filter((t) => t.type === 'Withdraw' && t.status === 'Pending');

  const approvedDepositsVolume = transactionsCache
    .filter((t) => t.type === 'Deposit' && t.status === 'Approved')
    .reduce((acc, t) => acc + t.amount, 0);

  const approvedWithdrawalsVolume = transactionsCache
    .filter((t) => t.type === 'Withdraw' && t.status === 'Approved')
    .reduce((acc, t) => acc + t.amount, 0);

  res.json({
    success: true,
    stats: {
      totalUsers,
      activeUsers,
      totalBalance: Math.round(totalBalance * 100) / 100,
      pendingDepositsCount: pendingDeposits.length,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      approvedDepositsVolume,
      approvedWithdrawalsVolume,
      totalTransactions: transactionsCache.length,
    },
  });
});

// Admin Get All Users
apiRouter.get('/admin/users', adminAuthMiddleware, (_req: Request, res: Response) => {
  usersCache = loadJson<StoredUser[]>(USERS_FILE, []);
  transactionsCache = loadJson<StoredTransaction[]>(TRANSACTIONS_FILE, []);

  const usersWithCounts = usersCache.map((u) => {
    const userTx = transactionsCache.filter((t) => t.userId === u.id || t.userEmail === u.email);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      balance: u.balance,
      vipPoints: u.vipPoints,
      status: u.status || 'active',
      createdAt: u.createdAt,
      transactionsCount: userTx.length,
    };
  });

  res.json({ success: true, users: usersWithCounts });
});

// Admin Adjust User Balance (Add / Deduct / Set)
apiRouter.post('/admin/users/:id/balance', adminAuthMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, amount, reason } = req.body;

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid numeric amount greater than zero.' });
  }

  usersCache = loadJson<StoredUser[]>(USERS_FILE, []);
  const user = usersCache.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const prevBalance = user.balance;

  if (action === 'add') {
    user.balance = Math.round((user.balance + numAmount) * 100) / 100;
  } else if (action === 'deduct') {
    user.balance = Math.max(0, Math.round((user.balance - numAmount) * 100) / 100);
  } else if (action === 'set') {
    user.balance = Math.round(numAmount * 100) / 100;
  } else {
    return res.status(400).json({ error: 'Invalid action. Choose add, deduct, or set.' });
  }

  saveJson(USERS_FILE, usersCache);

  // Record admin audit transaction
  const auditTx: StoredTransaction = {
    id: `ADM-${Date.now().toString().slice(-6)}`,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    type: action === 'add' ? 'Admin Credit' : 'Admin Debit',
    method: 'System',
    phone: 'SYSTEM',
    amount: numAmount,
    status: 'Approved',
    note: reason || `Admin adjusted balance from ৳${prevBalance} to ৳${user.balance}`,
    createdAt: new Date().toISOString(),
  };

  transactionsCache = loadJson<StoredTransaction[]>(TRANSACTIONS_FILE, []);
  transactionsCache.unshift(auditTx);
  saveJson(TRANSACTIONS_FILE, transactionsCache);

  res.json({
    success: true,
    message: `Updated balance for ${user.email} from ৳${prevBalance} to ৳${user.balance}`,
    user: sanitizeUser(user),
  });
});

// Admin Update User Status (Ban / Unban)
apiRouter.post('/admin/users/:id/status', adminAuthMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'active' && status !== 'banned') {
    return res.status(400).json({ error: 'Invalid status. Choose active or banned.' });
  }

  usersCache = loadJson<StoredUser[]>(USERS_FILE, []);
  const user = usersCache.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  user.status = status;
  saveJson(USERS_FILE, usersCache);

  res.json({
    success: true,
    message: `User ${user.email} status set to ${status}.`,
    user: sanitizeUser(user),
  });
});

// Admin Delete User
apiRouter.delete('/admin/users/:id', adminAuthMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  usersCache = loadJson<StoredUser[]>(USERS_FILE, []);

  const index = usersCache.findIndex((u) => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const deleted = usersCache.splice(index, 1)[0];
  saveJson(USERS_FILE, usersCache);

  res.json({
    success: true,
    message: `User ${deleted.email} deleted successfully.`,
  });
});

// Admin Get All Transactions (Deposits and Withdrawals)
apiRouter.get('/admin/transactions', adminAuthMiddleware, (req: Request, res: Response) => {
  transactionsCache = loadJson<StoredTransaction[]>(TRANSACTIONS_FILE, []);
  const typeFilter = req.query.type as string;
  const statusFilter = req.query.status as string;

  let filtered = [...transactionsCache];
  if (typeFilter && typeFilter !== 'all') {
    filtered = filtered.filter((t) => t.type.toLowerCase() === typeFilter.toLowerCase());
  }
  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter((t) => t.status.toLowerCase() === statusFilter.toLowerCase());
  }

  res.json({ success: true, transactions: filtered });
});

// Admin Approve / Reject Deposit
apiRouter.post('/admin/deposits/:id/status', adminAuthMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, note } = req.body; // status: 'Approved' | 'Rejected'

  if (status !== 'Approved' && status !== 'Rejected') {
    return res.status(400).json({ error: 'Status must be Approved or Rejected.' });
  }

  transactionsCache = loadJson<StoredTransaction[]>(TRANSACTIONS_FILE, []);
  const tx = transactionsCache.find((t) => t.id === id);
  if (!tx || tx.type !== 'Deposit') {
    return res.status(404).json({ error: 'Deposit request not found.' });
  }

  const prevStatus = tx.status;
  tx.status = status;
  tx.note = note || tx.note;
  tx.updatedAt = new Date().toISOString();

  // If approved and was not already approved, credit the user's wallet!
  if (status === 'Approved' && prevStatus !== 'Approved') {
    usersCache = loadJson<StoredUser[]>(USERS_FILE, []);
    const user = usersCache.find((u) => u.id === tx.userId || u.email === tx.userEmail);
    if (user) {
      user.balance = Math.round((user.balance + tx.amount) * 100) / 100;
      user.vipPoints += Math.floor(tx.amount / 10);
      saveJson(USERS_FILE, usersCache);
    }
  }

  saveJson(TRANSACTIONS_FILE, transactionsCache);

  res.json({
    success: true,
    message: `Deposit ${tx.id} marked as ${status}.${status === 'Approved' ? ` Credited ৳${tx.amount.toLocaleString()} to user balance.` : ''}`,
    transaction: tx,
  });
});

// Admin Approve / Reject Withdrawal
apiRouter.post('/admin/withdrawals/:id/status', adminAuthMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, note } = req.body; // status: 'Approved' | 'Rejected'

  if (status !== 'Approved' && status !== 'Rejected') {
    return res.status(400).json({ error: 'Status must be Approved or Rejected.' });
  }

  transactionsCache = loadJson<StoredTransaction[]>(TRANSACTIONS_FILE, []);
  const tx = transactionsCache.find((t) => t.id === id);
  if (!tx || tx.type !== 'Withdraw') {
    return res.status(404).json({ error: 'Withdrawal request not found.' });
  }

  const prevStatus = tx.status;
  tx.status = status;
  tx.note = note || tx.note;
  tx.updatedAt = new Date().toISOString();

  // If rejected and was previously Pending, REFUND the money back to the user!
  if (status === 'Rejected' && prevStatus === 'Pending') {
    usersCache = loadJson<StoredUser[]>(USERS_FILE, []);
    const user = usersCache.find((u) => u.id === tx.userId || u.email === tx.userEmail);
    if (user) {
      user.balance = Math.round((user.balance + tx.amount) * 100) / 100;
      saveJson(USERS_FILE, usersCache);
    }
  }

  saveJson(TRANSACTIONS_FILE, transactionsCache);

  res.json({
    success: true,
    message: `Withdrawal ${tx.id} marked as ${status}.${status === 'Rejected' ? ` Refunded ৳${tx.amount.toLocaleString()} back to user balance.` : ''}`,
    transaction: tx,
  });
});

// Admin Aviator Next Crash Multiplier Control
apiRouter.post('/admin/aviator/multiplier', adminAuthMiddleware, (req: Request, res: Response) => {
  const { multiplier } = req.body;

  const numM = parseFloat(multiplier);
  if (isNaN(numM) || numM < 1.01) {
    return res.status(400).json({ error: 'Multiplier must be a number >= 1.01x.' });
  }

  settingsData = loadJson<AppSettings>(SETTINGS_FILE, {
    nextCrashMultiplier: null,
    minDeposit: 500,
    minWithdraw: 500,
    depositNagadNumber: '01759806218',
  });

  settingsData.nextCrashMultiplier = Math.round(numM * 100) / 100;
  saveJson(SETTINGS_FILE, settingsData);

  res.json({
    success: true,
    message: `Next round crash point set to ${settingsData.nextCrashMultiplier.toFixed(2)}x!`,
    nextCrashMultiplier: settingsData.nextCrashMultiplier,
  });
});

// Admin Get Settings
apiRouter.get('/admin/settings', adminAuthMiddleware, (_req: Request, res: Response) => {
  settingsData = loadJson<AppSettings>(SETTINGS_FILE, {
    nextCrashMultiplier: null,
    minDeposit: 500,
    minWithdraw: 500,
    depositNagadNumber: '01759806218',
  });
  res.json({ success: true, settings: settingsData });
});

// Admin Update Settings
apiRouter.post('/admin/settings', adminAuthMiddleware, (req: Request, res: Response) => {
  const { depositNagadNumber, minDeposit, minWithdraw } = req.body;

  settingsData = loadJson<AppSettings>(SETTINGS_FILE, {
    nextCrashMultiplier: null,
    minDeposit: 500,
    minWithdraw: 500,
    depositNagadNumber: '01759806218',
  });

  if (depositNagadNumber && typeof depositNagadNumber === 'string') {
    settingsData.depositNagadNumber = depositNagadNumber.trim();
  }
  if (typeof minDeposit === 'number' && minDeposit >= 100) {
    settingsData.minDeposit = minDeposit;
  }
  if (typeof minWithdraw === 'number' && minWithdraw >= 100) {
    settingsData.minWithdraw = minWithdraw;
  }

  saveJson(SETTINGS_FILE, settingsData);

  res.json({
    success: true,
    message: 'System settings updated.',
    settings: settingsData,
  });
});

app.use('/api', apiRouter);

// Start Server with Vite or Static
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Aviator Server with Admin Control running at http://${HOST}:${PORT}`);
  });
}

startServer();
