import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock3, Radio } from 'lucide-react';
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

function roundAnnouncement(signal: LiveSignal): string {
  if (signal.roundNumber === undefined) return 'Upcoming round';
  if (!signal.announcedDuringRound) return 'Available before the first run';
  return `Announced as Round ${signal.announcedDuringRound} started`;
}

function estimateSecondsUntilRound(signals: LiveSignal[], target: LiveSignal, now: number): number | null {
  if (target.roundNumber === undefined) return null;
  if (target.roundNumber === 1) {
    return Math.max(0, Math.ceil((target.createdAt.getTime() + 4_000 - now) / 1_000));
  }

  const currentRoundSignal = signals.find((signal) => (
    signal.sessionId === target.sessionId
    && signal.roundNumber === target.roundNumber! - 1
  ));
  if (!currentRoundSignal) return null;

  // Match the local game: exp(0.08 * seconds), then a 2.6s crash hold
  // and 3.8s countdown before the target round begins.
  const flightSeconds = currentRoundSignal.multiplier <= 1
    ? 0
    : Math.log(currentRoundSignal.multiplier) / 0.08;
  const estimatedStart = target.createdAt.getTime() + (flightSeconds + 6.4) * 1_000;
  return Math.max(0, Math.ceil((estimatedStart - now) / 1_000));
}

function formatCountdown(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds <= 0) return 'Starting now';
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return `~${minutes}:${remainder}`;
}

function multiplierStyle(multiplier: number): string {
  if (multiplier >= 10) return 'text-rose-300';
  if (multiplier >= 2) return 'text-violet-300';
  return 'text-sky-300';
}

export const SignalPage: React.FC<SignalPageProps> = ({ onBackToGame }) => {
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsubscribe = subscribeToSignals((nextSignals) => setSignals(nextSignals));
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, []);

  const latestSignal = signals[0];
  const countdown = useMemo(
    () => latestSignal ? estimateSecondsUntilRound(signals, latestSignal, now) : null,
    [signals, latestSignal, now],
  );
  const history = signals.slice(1, 7);

  return (
    <section className="mx-auto w-full max-w-3xl px-2 py-4 sm:px-4 sm:py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          onClick={onBackToGame}
          className="inline-flex items-center gap-2 rounded-xl border border-[#262d3d] bg-[#111622] px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Aviator game
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          LOCAL SIMULATION
        </div>
      </div>

      {latestSignal ? (
        <div className="overflow-hidden rounded-3xl border border-[#242b3a] bg-[#0e131d] shadow-2xl shadow-black/20">
          <div className="border-b border-[#202737] px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-rose-300">
              <Radio className="h-4 w-4" /> Next round signal
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-400">
              {latestSignal.roundNumber ? `Target: Round ${latestSignal.roundNumber}` : 'Target: next round'}
            </div>
            <div className={`mt-3 font-mono text-6xl font-black leading-none tabular-nums sm:text-7xl ${multiplierStyle(latestSignal.multiplier)}`}>
              {latestSignal.multiplier.toFixed(2)}x
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400">
              <span>{roundAnnouncement(latestSignal)}</span>
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                {formatAge(latestSignal.createdAt, now)} · {formatTime(latestSignal.createdAt)}
              </span>
            </div>
            {latestSignal.updatedAt && (
              <div className="mt-2 text-xs text-amber-300">
                Updated to match the game’s forced multiplier at {formatTime(latestSignal.updatedAt)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Estimated time until target round</div>
              <div className="mt-1 font-mono text-2xl font-black tabular-nums text-white">{formatCountdown(countdown)}</div>
            </div>
            <button
              onClick={onBackToGame}
              className="rounded-xl bg-[#e50539] px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-600"
            >
              Go to Aviator
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#242b3a] bg-[#0e131d] px-5 py-12 text-center sm:px-8">
          <Radio className="mx-auto h-7 w-7 text-rose-300" />
          <h1 className="mt-3 text-xl font-black text-white">Waiting for the first signal</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            The local simulation will create its first signal as soon as the game starts.
          </p>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#202737] bg-[#0e131d]">
        <div className="border-b border-[#202737] px-4 py-3.5 sm:px-5">
          <h2 className="font-black text-white">Recent rounds</h2>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500 sm:px-5">Round history will appear here as the game runs.</p>
        ) : (
          <div className="divide-y divide-[#202737]">
            {history.map((signal) => (
              <div key={signal.id} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    {signal.roundNumber ? `Round ${signal.roundNumber}` : 'Previous round'} · {roundAnnouncement(signal)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Announced at {formatTime(signal.createdAt)}</div>
                </div>
                <div className={`font-mono text-lg font-black tabular-nums ${multiplierStyle(signal.multiplier)}`}>
                  {signal.multiplier.toFixed(2)}x
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs leading-5 text-slate-500">
        This is the preselected multiplier for this app’s local simulation only. It cannot predict an external Aviator or real-money game.
      </p>
    </section>
  );
};
