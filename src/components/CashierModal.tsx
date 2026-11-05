import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { PaymentMethod } from '../types';
import { formatBDT, isValidBDPhone } from '../utils/format';
import { X, CheckCircle, AlertCircle, ShieldCheck, Copy, Sparkles, Check } from 'lucide-react';

import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface CashierModalProps {
  isOpen: boolean;
  initialTab?: 'deposit' | 'withdraw';
  onClose: () => void;
}

const NAGAD_DEPOSIT_NUMBER = '01759806218';

export const CashierModal: React.FC<CashierModalProps> = ({
  isOpen,
  initialTab = 'deposit',
  onClose,
}) => {
  const { balance, deposit, withdraw, firstDepositBonusClaimed } = useWallet();
  const { token, user } = useAuth();
  const [tab, setTab] = useState<'deposit' | 'withdraw'>(initialTab);
  const [method, setMethod] = useState<PaymentMethod>('Nagad');
  const [phone, setPhone] = useState<string>('01712345678');
  const [amount, setAmount] = useState<string>('1000');
  const [trxId, setTrxId] = useState<string>('');
  const [step, setStep] = useState<1 | 2>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(NAGAD_DEPOSIT_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDepositStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!isValidBDPhone(phone)) {
      setMessage({ text: 'Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).', type: 'error' });
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val < 500) {
      setMessage({ text: 'Minimum deposit is ৳500 (সর্বনিম্ন ডিপোজিট ৫০০ টাকা).', type: 'error' });
      return;
    }
    if (val > 50000) {
      setMessage({ text: 'Maximum deposit amount is ৳50,000.', type: 'error' });
      return;
    }
    setStep(2);
  };

  const handleDepositFinal = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const cleanId = trxId.trim().toUpperCase();
    if (cleanId.length < 8) {
      setMessage({ text: 'Transaction ID must be at least 8 characters (e.g. 9B8N4K2L).', type: 'error' });
      return;
    }

    const val = parseFloat(amount);
    const result = deposit('Nagad', phone, val, cleanId);
    if (result.success) {
      setMessage({ text: result.message, type: 'success' });
      setStep(1);
      setTrxId('');

      // Mirror to Firestore transactions collection
      if (user) {
        setDoc(doc(db, 'transactions', cleanId), {
          id: cleanId,
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          type: 'Deposit',
          method: 'Nagad',
          phone,
          amount: val,
          trxId: cleanId,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        }).catch((err) => console.warn('Firestore deposit sync warning:', err));
      }

      // Send to backend for real-time admin dashboard tracking
      if (token) {
        fetch('/api/user/deposit-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ phone, amount: val, trxId: cleanId }),
        }).catch((err) => console.error('Failed to log deposit request:', err));
      }
    }
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!isValidBDPhone(phone)) {
      setMessage({ text: 'Please enter a valid 11-digit Bangladeshi mobile number.', type: 'error' });
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val < 500) {
      setMessage({ text: 'Minimum withdrawal is ৳500.', type: 'error' });
      return;
    }
    if (val > balance) {
      setMessage({ text: 'Insufficient balance in your wallet.', type: 'error' });
      return;
    }

    const result = withdraw(method, phone, val);
    if (result.success) {
      setMessage({ text: result.message, type: 'success' });
      setAmount('1000');

      const txId = `WD-${Date.now().toString().slice(-6)}`;

      // Mirror to Firestore
      if (user) {
        setDoc(doc(db, 'transactions', txId), {
          id: txId,
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          type: 'Withdraw',
          method,
          phone,
          amount: val,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        }).catch((err) => console.warn('Firestore withdrawal sync warning:', err));
      }

      // Send to backend for real-time admin review & approval
      if (token) {
        fetch('/api/user/withdraw-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ method, phone, amount: val }),
        }).catch((err) => console.error('Failed to log withdrawal request:', err));
      }
    } else {
      setMessage({ text: result.message, type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#0f1726] border border-[#f5c242]/25 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0b101c]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400">
              ৳
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-lg leading-tight">Cashier & Wallet</h3>
              <p className="text-xs text-slate-400">Balance: <span className="text-amber-400 font-bold font-mono">{formatBDT(balance)}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons (Deposit & Withdraw Only) */}
        <div className="grid grid-cols-2 p-1.5 bg-[#080d16] border-b border-slate-800 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setTab('deposit'); setStep(1); setMessage(null); setMethod('Nagad'); }}
            className={`py-2.5 rounded-xl transition-all cursor-pointer ${tab === 'deposit' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Deposit (ডিপোজিট)
          </button>
          <button
            type="button"
            onClick={() => { setTab('withdraw'); setMessage(null); }}
            className={`py-2.5 rounded-xl transition-all cursor-pointer ${tab === 'withdraw' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Withdraw (উইথড্র)
          </button>
        </div>

        {/* Notification Banner */}
        {message && (
          <div className={`mx-5 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300' : 'bg-red-950/80 border border-red-500/40 text-red-300'}`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* DEPOSIT TAB: EXCLUSIVELY NAGAD */}
          {tab === 'deposit' && (
            <div>
              {/* Payment Method Display */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Deposit Method (পদ্ধতি)
                </label>
                <div className="p-3.5 rounded-xl border border-[#f6921e]/60 bg-[#f6921e]/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f6921e] flex items-center justify-center font-black text-white text-sm shadow-md">
                      Ng
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
                        <span>Nagad (নগদ)</span>
                        <span className="text-[10px] bg-[#f6921e] text-white px-1.5 py-0.2 rounded font-bold">Exclusive</span>
                      </div>
                      <div className="text-xs text-amber-200/80">Instant Automated Cashier</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      ● Active
                    </span>
                  </div>
                </div>
              </div>

              {!firstDepositBonusClaimed && (
                <div className="p-3 mb-4 rounded-xl bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/30 flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-amber-300 block">100% First Deposit Match Bonus</span>
                    <span className="text-slate-400">Deposit now and get up to ৳10,000 extra free credits!</span>
                  </div>
                </div>
              )}

              {step === 1 ? (
                <form onSubmit={handleDepositStep1} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Your Nagad Mobile Number (আপনার নগদ নম্বর)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      maxLength={11}
                      className="w-full bg-[#080d16] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Deposit Amount (Min ৳500 – ৳50,000)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="500"
                      max="50000"
                      className="w-full bg-[#080d16] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                      required
                    />
                    <div className="grid grid-cols-5 gap-1.5 mt-2">
                      {quickAmounts.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setAmount(q.toString())}
                          className="py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                          +{q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                  >
                    Continue to Nagad Instructions →
                  </button>
                </form>
              ) : (
                <form onSubmit={handleDepositFinal} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-[#080d16] border border-slate-800 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                      <span>Method: <b className="text-[#f6921e]">Nagad (নগদ)</b></span>
                      <span>Amount: <b className="text-amber-400 font-mono">৳{parseFloat(amount).toLocaleString()}</b></span>
                    </div>

                    <p className="text-slate-300 font-medium">
                      1. Open your <b>Nagad App</b> or dial <b>*167#</b> and select <b>Send Money</b>.
                    </p>
                    <p className="text-slate-300 font-medium">
                      2. Send <b className="text-amber-400">৳{parseFloat(amount).toLocaleString()}</b> to this Nagad Number:
                    </p>
                    
                    {/* Assigned Nagad Deposit Number */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-amber-500/40 font-mono text-base text-amber-300 font-bold">
                      <span className="tracking-wider">{NAGAD_DEPOSIT_NUMBER}</span>
                      <button
                        type="button"
                        onClick={handleCopyNumber}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors border border-amber-500/30 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-sans">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="font-sans">Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-slate-400 text-[11px]">
                      3. After completing payment, enter your Nagad <b>Transaction ID (TrxID)</b> below for instant verification.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Enter Nagad TrxID (ট্রানজেকশন আইডি)
                    </label>
                    <input
                      type="text"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                      placeholder="e.g. 9H7K2LMN4P"
                      maxLength={14}
                      className="w-full bg-[#080d16] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase text-slate-100 tracking-wider focus:outline-none focus:border-amber-400 font-bold"
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                    >
                      Confirm Deposit (নিশ্চিত করুন)
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* WITHDRAW TAB: BKASH & NAGAD (ROCKET REMOVED) */}
          {tab === 'withdraw' && (
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Withdraw to (পদ্ধতি নির্বাচন)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('Nagad')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                      method === 'Nagad' ? 'bg-[#f6921e]/20 border-[#f6921e] text-white shadow-lg' : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#f6921e] flex items-center justify-center font-black text-white text-xs">
                      Ng
                    </div>
                    <span>Nagad (নগদ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('bKash')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                      method === 'bKash' ? 'bg-[#e2136e]/20 border-[#e2136e] text-white shadow-lg' : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#e2136e] flex items-center justify-center font-black text-white text-xs">
                      bK
                    </div>
                    <span>bKash (বিকাশ)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Recipient {method} Account Number (আপনার নম্বর)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  maxLength={11}
                  className="w-full bg-[#080d16] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-400">
                    Withdrawal Amount (Min ৳500)
                  </label>
                  <button
                    type="button"
                    onClick={() => setAmount(balance.toString())}
                    className="text-[11px] text-amber-400 hover:underline font-semibold cursor-pointer"
                  >
                    All In (৳{Math.floor(balance).toLocaleString()})
                  </button>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="500"
                  max={balance}
                  className="w-full bg-[#080d16] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-400 space-y-1">
                <p>• Fast withdrawal processing (average 3-5 minutes).</p>
                <p>• 0% withdrawal processing fee for Ace67 members.</p>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-98 transition-all cursor-pointer"
              >
                Request Withdrawal (উইথড্র রিকোয়েস্ট)
              </button>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#080d16] border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-Bit SSL Secured</span>
          </div>
          <span>Demo credits only (18+)</span>
        </div>
      </div>
    </div>
  );
};
