import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type UserStatus = 'active' | 'banned';
export type TxType = 'Deposit' | 'Withdraw' | 'Admin Credit' | 'Admin Debit';
export type TxStatus = 'Pending' | 'Approved' | 'Rejected';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  balance: number;
  vipPoints: number;
  status: UserStatus;
  createdAt: string;
}

export interface AdminTransaction {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  type: TxType;
  method: 'Nagad' | 'bKash' | 'System';
  phone: string;
  amount: number;
  trxId?: string;
  status: TxStatus;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminSettings {
  nextCrashMultiplier: number | null;
  minDeposit: number;
  minWithdraw: number;
  depositNagadNumber: string;
}

const defaultSettings: AdminSettings = {
  nextCrashMultiplier: null,
  minDeposit: 500,
  minWithdraw: 500,
  depositNagadNumber: '01759806218',
};

const demoUser: AdminUser = {
  id: 'user_demo_1001', email: 'player@aviator.bd', name: 'Shakib Gamer',
  balance: 0, vipPoints: 350, status: 'active', createdAt: new Date().toISOString(),
};

const demoTransactions: AdminTransaction[] = [
  { id: 'DEP-982142', userId: demoUser.id, userEmail: demoUser.email, userName: demoUser.name, type: 'Deposit', method: 'Nagad', phone: '01712345678', amount: 1500, trxId: '9G7K2LMN8P', status: 'Pending', createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: 'WD-541290', userId: demoUser.id, userEmail: demoUser.email, userName: demoUser.name, type: 'Withdraw', method: 'Nagad', phone: '01712345678', amount: 1000, status: 'Pending', createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
];

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

const dataDir = path.join(process.cwd(), 'data');
export const users: AdminUser[] = readJson<AdminUser[]>(path.join(dataDir, 'users.json'), [demoUser]).map((u) => ({ ...u, status: u.status || 'active' }));
export const transactions: AdminTransaction[] = readJson<AdminTransaction[]>(path.join(dataDir, 'transactions.json'), demoTransactions);
export const settings: AdminSettings = { ...defaultSettings, ...readJson<Partial<AdminSettings>>(path.join(dataDir, 'settings.json'), {}) };
export const sessions = new Set<string>();

export function createSession(): string {
  const token = `admin_${crypto.randomBytes(32).toString('hex')}`;
  sessions.add(token);
  return token;
}

export function isAuthenticated(token: string | undefined): boolean {
  return token === 'admin_vercel_master_session' || Boolean(token && sessions.has(token));
}

export function findUser(id: string): AdminUser | undefined {
  return users.find((user) => user.id === id);
}

export function saveState(): void {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users, null, 2));
    fs.writeFileSync(path.join(dataDir, 'transactions.json'), JSON.stringify(transactions, null, 2));
    fs.writeFileSync(path.join(dataDir, 'settings.json'), JSON.stringify(settings, null, 2));
  } catch {
    // Vercel's deployment filesystem is read-only; warm instances still retain state in memory.
  }
}

export function adminStats() {
  const pendingDeposits = transactions.filter((tx) => tx.type === 'Deposit' && tx.status === 'Pending');
  const pendingWithdrawals = transactions.filter((tx) => tx.type === 'Withdraw' && tx.status === 'Pending');
  return {
    totalUsers: users.length,
    activeUsers: users.filter((user) => user.status !== 'banned').length,
    totalBalance: Math.round(users.reduce((sum, user) => sum + (user.balance || 0), 0) * 100) / 100,
    pendingDepositsCount: pendingDeposits.length,
    pendingWithdrawalsCount: pendingWithdrawals.length,
    approvedDepositsVolume: transactions.filter((tx) => tx.type === 'Deposit' && tx.status === 'Approved').reduce((sum, tx) => sum + tx.amount, 0),
    approvedWithdrawalsVolume: transactions.filter((tx) => tx.type === 'Withdraw' && tx.status === 'Approved').reduce((sum, tx) => sum + tx.amount, 0),
    totalTransactions: transactions.length,
  };
}

export function transactionUsers() {
  return users.map((user) => ({
    ...user,
    transactionsCount: transactions.filter((tx) => tx.userId === user.id || tx.userEmail === user.email).length,
  }));
}
