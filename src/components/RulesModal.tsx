import React from 'react';
import { X, ShieldCheck, HelpCircle, CheckCircle } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-lg bg-[#0f1420] border border-[#263147] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f283a] bg-[#0b0e17]">
          <div className="flex items-center gap-2">
            <span className="text-xl">✈️</span>
            <h3 className="font-extrabold text-white text-base">How to Play Aviator (খেলার নিয়মাবলী)</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-[#141a29] border border-[#222c42] space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <span className="w-5 h-5 rounded-full bg-[#e50539] flex items-center justify-center text-xs">1</span>
              <span>Place Your Bet (বাজি ধরুন)</span>
            </div>
            <p className="text-slate-400 pl-7">
              Select your bet amount and press <b>BET</b> before the round takes off. You can place two simultaneous bets using <b>Panel 1</b> and <b>Panel 2</b>!
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141a29] border border-[#222c42] space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs">2</span>
              <span>Watch the Multiplier Soar</span>
            </div>
            <p className="text-slate-400 pl-7">
              As the red lucky plane takes flight, the multiplier increases exponentially from 1.00x upwards to 100x, 200x, or even 500x!
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141a29] border border-[#222c42] space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <span className="w-5 h-5 rounded-full bg-[#00e701] text-slate-950 flex items-center justify-center text-xs">3</span>
              <span>Cash Out Before it Flies Away!</span>
            </div>
            <p className="text-slate-400 pl-7">
              Press <b>CASH OUT</b> before the plane flies away. Your win is your bet multiplied by the exact cash out coefficient. If the plane flies away before you cash out, the bet is lost.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 space-y-1.5">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Provably Fair 100% Cryptographic Technology</span>
            </div>
            <p className="text-[11px] text-slate-400">
              The round outcome is generated not on our servers, but with the help of the players. The result is generated with high cryptographic certainty and can be independently verified for every round.
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#0b0e17] border-t border-[#1f283a] text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#e50539] hover:bg-[#ff1744] text-white font-bold text-xs tracking-wider uppercase transition-colors"
          >
            Got It, Let’s Play!
          </button>
        </div>
      </div>
    </div>
  );
};
