import React from 'react';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { Plane, PlusCircle, ArrowDownToLine, User as UserIcon, LogIn } from 'lucide-react';

interface BottomNavProps {
  onOpenCashier: (tab: 'deposit' | 'withdraw') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  onOpenCashier,
}) => {
  const { language } = useWallet();
  const { isAuthenticated, user, openAuthModal } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0e14]/98 backdrop-blur-md border-t border-[#1e2330] px-3 py-1.5 flex items-center justify-around text-[10px] font-bold text-slate-400">
      <div className="flex flex-col items-center gap-0.5 p-1 text-[#e50539] font-black">
        <Plane className="w-4 h-4" />
        <span>{language === 'bn' ? 'এভিয়েটর' : 'Aviator'}</span>
      </div>

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
        onClick={() => openAuthModal(isAuthenticated ? 'login' : 'login')}
        className="flex flex-col items-center gap-0.5 p-1 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
      >
        {isAuthenticated ? (
          <>
            <UserIcon className="w-4 h-4" />
            <span className="max-w-[50px] truncate">{user?.name || (language === 'bn' ? 'প্রোফাইল' : 'Account')}</span>
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            <span>{language === 'bn' ? 'লগইন' : 'Login'}</span>
          </>
        )}
      </button>
    </nav>
  );
};
