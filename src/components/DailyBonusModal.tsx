import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { Gift, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface DailyBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyBonusModal: React.FC<DailyBonusModalProps> = ({ isOpen, onClose }) => {
  const { claimDailyBonus, lastDailyBonusDate } = useWallet();
  const [claimedNotice, setClaimedNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAlreadyClaimedToday = lastDailyBonusDate === new Date().toDateString();

  const handleClaim = () => {
    setClaimedNotice(null);
    setErrorNotice(null);
    const res = claimDailyBonus();
    if (res.success) {
      setClaimedNotice(res.message);
    } else {
      setErrorNotice(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-sm bg-[#0f1726] border border-[#f5c242]/30 rounded-2xl shadow-2xl overflow-hidden p-6 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4 glow-gold">
          <Gift className="w-8 h-8 text-slate-950" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-100 mb-1">Daily Lucky Reload</h3>
        <p className="text-xs text-slate-400 mb-5">
          Claim free ৳100 BDT demo credits every single day to test any casino game risk-free!
        </p>

        {claimedNotice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{claimedNotice}</span>
          </div>
        )}

        {errorNotice && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs">
            {errorNotice}
          </div>
        )}

        <div className="p-4 rounded-xl bg-[#080d16] border border-slate-800 mb-5">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Today’s Reward</div>
          <div className="text-3xl font-black text-amber-400 font-mono mt-1">৳100.00</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Instant wallet credit</span>
          </div>
        </div>

        <button
          onClick={handleClaim}
          disabled={isAlreadyClaimedToday}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${isAlreadyClaimedToday ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 hover:brightness-110 active:scale-98 shadow-amber-500/20'}`}
        >
          {isAlreadyClaimedToday ? 'Claimed Today (কালকে আবার আসুন)' : 'Claim ৳100 Credits Now'}
        </button>
      </div>
    </div>
  );
};
