export type PaymentMethod = 'bKash' | 'Nagad';

export interface User {
  id: string;
  email: string;
  name: string;
  balance: number;
  vipPoints: number;
  createdAt?: string;
}

export type TransactionType = 'Deposit' | 'Withdraw' | 'Daily Bonus' | 'Welcome Bonus' | 'Cashback';

export type TransactionStatus = 'Success' | 'Pending' | 'Failed';

export interface Transaction {
  id: string;
  type: TransactionType;
  method: PaymentMethod | 'Promo' | 'System';
  amount: number;
  status: TransactionStatus;
  date: string;
  phone?: string;
}

export type VipTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface CrashRoundHistory {
  id: number;
  multiplier: number;
  time: string;
  hash: string;
}

export interface PlayerBet {
  id: string;
  user: string;
  avatar: string;
  bet: number;
  multiplier?: number;
  cashout?: number;
  isCurrentUser?: boolean;
}
