import React, { createContext, useContext, useState, useEffect } from 'react';
import { PaymentMethod, Transaction, VipTier } from '../types';
import { sound } from '../utils/audio';
import { useAuth } from './AuthContext';
import { FIRST_WITHDRAWAL_FEE, MAX_BETTING_WALLET_BALANCE, NAGAD_AGENT_NUMBER } from '../utils/walletPolicy';

interface WalletContextType {
  balance: number;
  transactions: Transaction[];
  vipTier: VipTier;
  vipPoints: number;
  firstDepositBonusClaimed: boolean;
  firstWithdrawalFeePaid: boolean;
  setFirstWithdrawalFeePaid: (paid: boolean) => void;
  lastDailyBonusDate: string | null;
  activeGameId: string | null;
  language: 'en' | 'bn';
  soundMuted: boolean;
  setActiveGameId: (id: string | null) => void;
  setLanguage: (lang: 'en' | 'bn') => void;
  toggleSound: () => void;
  placeBet: (amount: number) => boolean;
  creditWin: (amount: number, gameTitle: string) => { creditedAmount: number; capped: boolean };
  deposit: (method: PaymentMethod, phone: string, amount: number, trxId: string) => { success: boolean; message: string; bonus: number };
  withdraw: (method: PaymentMethod, phone: string, amount: number, feeTrxId?: string, markFeePaid?: boolean) => { success: boolean; message: string };
  claimDailyBonus: () => { success: boolean; message: string; amount: number };
}

const STORAGE_KEY = 'ace67_platform_state_v1';

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, updateUserBalance } = useAuth();
  const [balance, setBalance] = useState<number>(user ? Math.min(user.balance, MAX_BETTING_WALLET_BALANCE) : 0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [firstDepositBonusClaimed, setFirstDepositBonusClaimed] = useState<boolean>(false);
  const [firstWithdrawalFeePaid, setFirstWithdrawalFeePaid] = useState<boolean>(false);
  const [lastDailyBonusDate, setLastDailyBonusDate] = useState<string | null>(null);
  const [vipPoints, setVipPoints] = useState<number>(user ? user.vipPoints : 350);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  // Sync when user changes in AuthContext
  useEffect(() => {
    if (user) {
      setBalance(Math.min(user.balance, MAX_BETTING_WALLET_BALANCE));
      setVipPoints(user.vipPoints);
      const feeKey = `aviator_first_withdrawal_fee_paid_${user.id}`;
      const savedFeeState = localStorage.getItem(feeKey) === 'true';
      setFirstWithdrawalFeePaid(typeof user.firstWithdrawalFeePaid === 'boolean' ? user.firstWithdrawalFeePaid : savedFeeState);
    } else {
      setBalance(0);
      setFirstWithdrawalFeePaid(localStorage.getItem('aviator_first_withdrawal_fee_paid_guest') === 'true');
    }
  }, [user]);

  useEffect(() => {
    const feeKey = `aviator_first_withdrawal_fee_paid_${user?.id || 'guest'}`;
    localStorage.setItem(feeKey, String(firstWithdrawalFeePaid));
  }, [firstWithdrawalFeePaid, user?.id]);

  // Initialize from LocalStorage if not logged in
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && !user) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.transactions)) {
          setTransactions(parsed.transactions);
          if (parsed.transactions.some((tx: Transaction) => tx.type === 'Withdraw' && tx.status === 'Success')) {
            setFirstWithdrawalFeePaid(true);
          }
        }
        if (typeof parsed.firstDepositBonusClaimed === 'boolean') setFirstDepositBonusClaimed(parsed.firstDepositBonusClaimed);
        if (parsed.lastDailyBonusDate) setLastDailyBonusDate(parsed.lastDailyBonusDate);
        if (typeof parsed.vipPoints === 'number') setVipPoints(parsed.vipPoints);
        if (parsed.language === 'en' || parsed.language === 'bn') setLanguage(parsed.language);
        if (typeof parsed.soundMuted === 'boolean') {
          setSoundMuted(parsed.soundMuted);
          sound.muted = parsed.soundMuted;
        }
      }
    } catch {
      // LocalStorage error fallback
    }
  }, [user]);

  // Save to LocalStorage
  const saveState = (
    newBal: number,
    newTx: Transaction[],
    newFd: boolean,
    newDaily: string | null,
    newVip: number,
    newLang: 'en' | 'bn',
    newMuted: boolean
  ) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          balance: newBal,
          transactions: newTx,
          firstDepositBonusClaimed: newFd,
          lastDailyBonusDate: newDaily,
          vipPoints: newVip,
          language: newLang,
          soundMuted: newMuted,
        })
      );
    } catch {
      // Ignore
    }
  };

  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    sound.muted = next;
    saveState(balance, transactions, firstDepositBonusClaimed, lastDailyBonusDate, vipPoints, language, next);
  };

  // Derive VIP Tier
  const vipTier: VipTier =
    vipPoints >= 5000 ? 'Diamond' :
    vipPoints >= 2500 ? 'Platinum' :
    vipPoints >= 1000 ? 'Gold' :
    vipPoints >= 500 ? 'Silver' : 'Bronze';

  const placeBet = (amount: number): boolean => {
    if (amount <= 0 || amount > balance || balance >= MAX_BETTING_WALLET_BALANCE) {
      return false;
    }
    const nextBal = Math.round((balance - amount) * 100) / 100;
    const nextVip = vipPoints + Math.floor(amount / 50);
    setBalance(nextBal);
    setVipPoints(nextVip);
    updateUserBalance(nextBal, nextVip);
    sound.playBet();
    saveState(nextBal, transactions, firstDepositBonusClaimed, lastDailyBonusDate, nextVip, language, soundMuted);
    return true;
  };

  const creditWin = (amount: number, gameTitle: string) => {
    if (amount <= 0) return { creditedAmount: 0, capped: false };
    const nextBal = Math.min(MAX_BETTING_WALLET_BALANCE, Math.round((balance + amount) * 100) / 100);
    const creditedAmount = Math.max(0, Math.round((nextBal - balance) * 100) / 100);
    const capped = creditedAmount < amount;
    const nextVip = vipPoints + Math.floor(creditedAmount / 30);
    setBalance(nextBal);
    setVipPoints(nextVip);
    updateUserBalance(nextBal, nextVip);
    
    if (creditedAmount > 1000) {
      sound.playBigWin();
    } else {
      sound.playWin();
    }

    // Save state
    saveState(nextBal, transactions, firstDepositBonusClaimed, lastDailyBonusDate, nextVip, language, soundMuted);
    return { creditedAmount, capped };
  };

  const deposit = (method: PaymentMethod, phone: string, amount: number, trxId: string) => {
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const newTx: Transaction[] = [
      {
        id: trxId.toUpperCase(),
        type: 'Deposit',
        method,
        amount,
        status: 'Pending',
        date: dateStr,
        phone,
      },
      ...transactions,
    ];

    setTransactions(newTx);
    // Deposits are intentionally not credited here. The balance and first
    // deposit bonus are applied only after an administrator approves the
    // pending request in the admin control panel.
    saveState(balance, newTx, firstDepositBonusClaimed, lastDailyBonusDate, vipPoints, language, soundMuted);

    return {
      success: true,
      message: `Deposit request of ৳${amount.toLocaleString()} submitted and is pending admin approval.`,
      bonus: 0,
    };
  };

  const withdraw = (method: PaymentMethod, phone: string, amount: number, feeTrxId?: string, markFeePaid = true) => {
    if (amount > balance) {
      return { success: false, message: 'Insufficient balance' };
    }
    if (!firstWithdrawalFeePaid && (!feeTrxId || feeTrxId.trim().length < 8)) {
      return { success: false, message: 'Enter the transaction ID for the ৳1,000 first-withdrawal fee.' };
    }

    const nextBal = Math.round((balance - amount) * 100) / 100;
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const txId = `WD${Math.floor(10000000 + Math.random() * 90000000)}`;

    const newTx: Transaction[] = [
      {
        id: txId,
        type: 'Withdraw',
        method,
        amount,
        status: 'Pending',
        date: dateStr,
        phone,
        ...(firstWithdrawalFeePaid ? {} : {
          feeAmount: FIRST_WITHDRAWAL_FEE,
          feeTrxId: feeTrxId?.trim().toUpperCase(),
          feeAgentNumber: NAGAD_AGENT_NUMBER,
        }),
      },
      ...transactions,
    ];

    setBalance(nextBal);
    setTransactions(newTx);
    if (!firstWithdrawalFeePaid && markFeePaid) {
      const feeKey = `aviator_first_withdrawal_fee_paid_${user?.id || 'guest'}`;
      localStorage.setItem(feeKey, 'true');
      setFirstWithdrawalFeePaid(true);
    }
    updateUserBalance(nextBal, vipPoints);
    sound.playClick();

    saveState(nextBal, newTx, firstDepositBonusClaimed, lastDailyBonusDate, vipPoints, language, soundMuted);

    // Keep backend-backed transactions pending until the admin processes them.
    if (!token) {
      setTimeout(() => {
        setTransactions((prev) => prev.map((t) => (t.id === txId ? { ...t, status: 'Success' } : t)));
      }, 4000);
    }

    return {
      success: true,
      message: `Withdrawal request of ৳${amount.toLocaleString()} to ${phone} (${method}) submitted. Will be processed within 5 minutes.`,
    };
  };

  const claimDailyBonus = () => {
    const today = new Date().toDateString();
    if (lastDailyBonusDate === today) {
      return { success: false, message: 'You have already claimed today’s free ৳100! Come back tomorrow.', amount: 0 };
    }

    const amount = Math.min(100, Math.max(0, MAX_BETTING_WALLET_BALANCE - balance));
    if (amount === 0) {
      return { success: false, message: 'Wallet limit reached. Withdraw funds before claiming more credits.', amount: 0 };
    }
    const nextBal = balance + amount;
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const newTx: Transaction[] = [
      {
        id: `DAILY-${Date.now().toString().slice(-6)}`,
        type: 'Daily Bonus',
        method: 'Promo',
        amount,
        status: 'Success',
        date: dateStr,
      },
      ...transactions,
    ];

    setBalance(nextBal);
    setTransactions(newTx);
    setLastDailyBonusDate(today);
    sound.playBigWin();

    saveState(nextBal, newTx, firstDepositBonusClaimed, today, vipPoints, language, soundMuted);

    return { success: true, message: '৳100 Daily Free Bonus credited to your account!', amount };
  };

  return (
    <WalletContext.Provider
      value={{
        balance,
        transactions,
        vipTier,
        vipPoints,
        firstDepositBonusClaimed,
        firstWithdrawalFeePaid,
        setFirstWithdrawalFeePaid,
        lastDailyBonusDate,
        activeGameId,
        language,
        soundMuted,
        setActiveGameId,
        setLanguage: (lang) => {
          setLanguage(lang);
          saveState(balance, transactions, firstDepositBonusClaimed, lastDailyBonusDate, vipPoints, lang, soundMuted);
        },
        toggleSound,
        placeBet,
        creditWin,
        deposit,
        withdraw,
        claimDailyBonus,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within a WalletProvider');
  return context;
};
