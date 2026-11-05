import React from 'react';
import { useWallet } from '../context/WalletContext';
import { VipTier } from '../types';
import { X, Award, Crown, Check, Shield } from 'lucide-react';

interface VipClubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VipClubModal: React.FC<VipClubModalProps> = ({ isOpen, onClose }) => {
  const { vipTier, vipPoints } = useWallet();

  if (!isOpen) return null;

  const tiers: { tier: VipTier; points: number; cashback: string; perk: string; color: string }[] = [
    { tier: 'Bronze', points: 0, cashback: '3.0%', perk: 'Daily ৳100 reload bonus', color: 'from-amber-700 to-amber-900' },
    { tier: 'Silver', points: 500, cashback: '5.0%', perk: 'Weekly 5% cashback + Level-up gift', color: 'from-slate-400 to-slate-600' },
    { tier: 'Gold', points: 1000, cashback: '7.5%', perk: 'Priority withdrawals + dedicated support', color: 'from-amber-400 to-yellow-600' },
    { tier: 'Platinum', points: 2500, cashback: '10.0%', perk: 'Instant withdraw + exclusive VIP tables', color: 'from-cyan-400 to-blue-600' },
    { tier: 'Diamond', points: 5000, cashback: '15.0%', perk: 'Maximum limits + 15% unlimited weekly cashback', color: 'from-purple-400 to-indigo-600' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-lg bg-[#0f1726] border border-[#f5c242]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0b101c]">
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-400" />
            <h3 className="font-extrabold text-slate-100 text-lg">Ace67 VIP Royale Club</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Current Status Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Your Current Tier</div>
              <div className="text-2xl font-black text-amber-400">{vipTier} Member</div>
              <div className="text-xs text-slate-400 mt-1">Accumulated Points: <b className="text-slate-200 font-mono">{vipPoints} XP</b></div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tier Progression & Privileges</div>

          <div className="space-y-2.5">
            {tiers.map((t) => {
              const isCurrent = t.tier === vipTier;
              return (
                <div
                  key={t.tier}
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${isCurrent ? 'bg-amber-500/10 border-amber-400 shadow-md' : 'bg-[#080d16] border-slate-800 opacity-80'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center font-bold text-white shadow-sm`}>
                      {t.tier[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-100">{t.tier}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-500/40">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-[11px] block">{t.perk}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-emerald-400 font-mono">{t.cashback}</div>
                    <span className="text-[10px] text-slate-500">Cashback</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-[#080d16] border-t border-slate-800 text-center text-xs text-slate-400">
          Play any game to earn XP points automatically (৳50 bet = 1 XP).
        </div>
      </div>
    </div>
  );
};
