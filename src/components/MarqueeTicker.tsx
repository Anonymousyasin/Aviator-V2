import React, { useMemo } from 'react';
import { BD_NAMES, formatBDT } from '../utils/format';
import { Flame, Plane } from 'lucide-react';

export const MarqueeTicker: React.FC = () => {
  const winners = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => {
      const name = BD_NAMES[(i * 3 + 1) % BD_NAMES.length];
      const digits = 10 + ((i * 19) % 89);
      const mult = [1.85, 2.45, 3.80, 5.20, 1.45, 8.90, 14.50, 2.10, 32.40, 4.10, 1.95, 68.20][i % 12];
      const amount = Math.floor(1200 + ((i * 5119) % 85000));
      return {
        id: i,
        user: `${name}***${digits}`,
        mult,
        amount,
      };
    });
  }, []);

  return (
    <div className="w-full bg-[#0a0d14] border-y border-[#1e2330] overflow-hidden py-1.5 select-none text-xs">
      <div className="max-w-7xl mx-auto flex items-center px-4">
        <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-[#262c3d] text-[#e50539] font-black uppercase tracking-wider text-[11px]">
          <Flame className="w-3.5 h-3.5 fill-[#e50539]" />
          <span>Aviator Live Wins:</span>
        </div>

        <div className="overflow-hidden flex-1 relative">
          <div className="animate-marquee flex items-center gap-8 text-xs text-slate-300">
            {winners.concat(winners).map((w, idx) => (
              <div key={idx} className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-[#e50539]">✈️</span>
                <span className="font-bold text-slate-200">{w.user}</span>
                <span className="text-slate-400">cashed out at</span>
                <span className="font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded text-[11px]">
                  {w.mult.toFixed(2)}x
                </span>
                <span className="font-mono font-black text-emerald-400">+{formatBDT(w.amount)}</span>
                <span className="text-slate-600 mx-1">/</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
