import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, Clock3, Radio, TrendingUp } from 'lucide-react';
import { subscribeToSignals } from '../utils/signals';
import type { LiveSignal } from '../utils/signals';

interface SignalPageProps {
  onBackToGame: () => void;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function formatAge(date: Date, now: number): string {
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function multiplierStyle(multiplier: number): string {
  if (multiplier >= 10) return 'text-rose-300 border-rose-400/25 bg-rose-500/10';
  if (multiplier >= 2) return 'text-violet-300 border-violet-400/25 bg-violet-500/10';
  return 'text-sky-300 border-sky-400/25 bg-sky-500/10';
}

export const SignalPage: React.FC<SignalPageProps> = ({ onBackToGame }) => {
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsubscribe = subscribeToSignals((nextSignals) => setSignals(nextSignals));
    const timer = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, []);

  const average = useMemo(() => {
    const recent = signals.slice(0, 10);
    if (recent.length === 0) return null;
    return recent.reduce((total, signal) => total + signal.multiplier, 0) / recent.length;
  }, [signals]);
  const latestSignal = signals[0];

  return (
    <section className="mx-auto w-full max-w-5xl px-2 py-4 sm:px-4 sm:py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToGame}
          className="inline-flex items-center gap-2 rounded-xl border border-[#262d3d] bg-[#111622] px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Aviator
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          LOCAL FEED
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-[#242b3a] bg-[radial-gradient(ellipse_at_top_right,_rgba(229,5,57,0.16),_transparent_45%),linear-gradient(135deg,_#111622,_#0b0e15_70%)] p-5 shadow-2xl shadow-black/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-rose-500/10" />
        <div className="pointer-events-none absolute -right-7 -top-14 h-44 w-44 rounded-full border border-rose-500/10" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-rose-300">
              <Radio className="h-4 w-4" /> Aviator signal room
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Live Signals</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Signals from the game on this device appear here immediately and are saved in this browser. They do not sync to other devices. These simulated values are not guaranteed predictions of real-money game outcomes.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
            <div className="flex items-center gap-2 font-bold text-white">
              <Activity className="h-4 w-4 text-rose-300" />
              {signals.length} recent {signals.length === 1 ? 'signal' : 'signals'}
            </div>
            <div className="mt-1 text-xs text-slate-500">Saved locally · no refresh needed</div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#202737] bg-[#0e131d] p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Latest signal</div>
          <div className="mt-2 font-mono text-3xl font-black tabular-nums text-white">
            {latestSignal ? `${latestSignal.multiplier.toFixed(2)}x` : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {latestSignal ? `${formatAge(latestSignal.createdAt, now)} · ${formatTime(latestSignal.createdAt)}` : 'Waiting for the next game signal'}
          </div>
        </div>
        <div className="rounded-2xl border border-[#202737] bg-[#0e131d] p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Average · last 10</div>
          <div className="mt-2 font-mono text-3xl font-black tabular-nums text-white">
            {average === null ? '—' : `${average.toFixed(2)}x`}
          </div>
          <div className="mt-1 text-xs text-slate-500">A simple view of recent local values</div>
        </div>
        <div className="rounded-2xl border border-[#202737] bg-[#0e131d] p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Storage</div>
          <div className="mt-2 flex items-center gap-2 text-xl font-black text-white">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            This browser
          </div>
          <div className="mt-1 text-xs text-slate-500">Up to 40 recent signals kept locally</div>
        </div>
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl border border-[#202737] bg-[#0e131d]">
        <div className="flex items-center justify-between border-b border-[#202737] px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-black text-white">Recent signals</h2>
            <p className="mt-1 text-xs text-slate-500">Most recent first · stored on this device</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            {latestSignal ? formatTime(latestSignal.createdAt) : '—'}
          </div>
        </div>

        {signals.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-300">
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="mt-4 font-bold text-white">No local signals yet</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Open Aviator and start the game. New signals will be saved in this browser and appear here automatically.
            </p>
            <button
              onClick={onBackToGame}
              className="mt-5 rounded-xl bg-[#e50539] px-4 py-2 text-sm font-black text-white transition hover:bg-rose-600"
            >
              Open Aviator
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#202737]">
            {signals.map((signal, index) => (
              <div key={signal.id} className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#171d29] font-mono text-xs font-bold text-slate-500">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200">Next-round signal</div>
                    <div className="mt-0.5 text-xs text-slate-500">{formatTime(signal.createdAt)} · {formatAge(signal.createdAt, now)}</div>
                  </div>
                </div>
                <span className={`rounded-xl border px-3 py-1.5 font-mono text-lg font-black tabular-nums ${multiplierStyle(signal.multiplier)}`}>
                  {signal.multiplier.toFixed(2)}x
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
