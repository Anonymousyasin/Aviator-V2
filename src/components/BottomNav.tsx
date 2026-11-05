import React from 'react';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { Activity, Plane, PlusCircle, ArrowDownToLine, User as UserIcon } from 'lucide-react';

interface BottomNavProps {
  onOpenCashier: (tab: 'deposit' | 'withdraw') => void;
  onOpenProfile: () => void;
  onOpenSignals: () => void;
  onOpenGame: () => void;
  currentPage: 'game' | 'signals';
}

export const BottomNav: React.FC<BottomNavProps> = ({
  onOpenCashier,
  onOpenProfile,
  onOpenSignals,
  onOpenGame,
  currentPage,
}) => {
  const { language } = useWallet();
  const { isAuthenticated, user } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0e14]/98 backdrop-blur-md border-t border-[#1e2330] px-3 py-1.5 flex items-center justify-around text-[10px] font-bold text-slate-400">
      <button
        onClick={onOpenGame}
        className={`flex flex-col items-center gap-0.5 p-1 transition-colors ${currentPage === 'game' ? 'font-black text-[#e50539]' : 'hover:text-slate-200'}`}
      >
        <Plane className="w-4 h-4" />
        <span>{language === 'bn' ? 'এভিয়েটর' : 'Aviator'}</span>
      </button>

      <button
        onClick={onOpenSignals}
        className={`flex flex-col items-center gap-0.5 p-1 transition-colors ${currentPage === 'signals' ? 'font-black text-emerald-400' : 'hover:text-emerald-300'}`}
      >
        <Activity className="w-4 h-4" />
        <span>{language === 'bn' ? 'সিগন্যাল' : 'Signals'}</span>
      </button>

      <button
        onClick={() => onOpenCashier('deposit')}
        className="flex flex-col items-center gap-0.5 p-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
      >
        <PlusCircle className="w-4 h-4" />
        <span>{language === 'bn' ? 'ডিপোজিট' : 'Deposit'}</span>
      </button>

      <button
        onClick={() => onOpenCashier('withdraw')}
        className="flex flex-col items-center gap-0.5 p-1 hover:text-slate-200 transition-colors cursor-pointer"
      >
        <ArrowDownToLine className="w-4 h-4" />
        <span>{language === 'bn' ? 'উইথড্র' : 'Withdraw'}</span>
      </button>

      <button
        onClick={onOpenProfile}
        className="flex flex-col items-center gap-0.5 p-1 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
      >
        <UserIcon className="w-4 h-4" />
        <span className="max-w-[65px] truncate">
          {isAuthenticated && user ? user.name : (language === 'bn' ? 'প্রোফাইল' : 'Profile')}
        </span>
      </button>
    </nav>
  );
};
