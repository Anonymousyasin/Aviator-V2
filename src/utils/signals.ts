export interface LiveSignal {
  id: string;
  multiplier: number;
  createdAt: Date;
  roundNumber?: number;
  announcedDuringRound?: number;
  sessionId?: string;
  updatedAt?: Date;
}

interface StoredSignal {
  id: string;
  multiplier: number;
  createdAt: number;
  roundNumber?: number;
  announcedDuringRound?: number;
  sessionId?: string;
  updatedAt?: number;
}

const STORAGE_KEY = 'aviator_local_signal_feed_v1';
const LOCAL_UPDATE_EVENT = 'aviator-local-signals-updated';
const MAX_SIGNALS = 40;
let memorySignals: StoredSignal[] = [];

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSignalSessionId(): string {
  return makeId();
}

function parseSignals(raw: string | null): StoredSignal[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is StoredSignal => (
        typeof item?.id === 'string'
        && Number.isFinite(item?.multiplier)
        && item.multiplier >= 1
        && item.multiplier <= 500
        && Number.isFinite(item?.createdAt)
        && (item?.updatedAt === undefined || Number.isFinite(item.updatedAt))
        && (item?.roundNumber === undefined || Number.isInteger(item.roundNumber))
        && (item?.announcedDuringRound === undefined || Number.isInteger(item.announcedDuringRound))
      ))
      .slice(0, MAX_SIGNALS);
  } catch {
    return [];
  }
}

function readStoredSignals(): StoredSignal[] {
  if (typeof window === 'undefined') return memorySignals;
  try {
    const saved = parseSignals(window.localStorage.getItem(STORAGE_KEY));
    memorySignals = saved;
    return saved;
  } catch {
    return memorySignals;
  }
}

function saveSignals(signals: StoredSignal[]): void {
  memorySignals = signals.slice(0, MAX_SIGNALS);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memorySignals));
  } catch {
    // The in-memory copy still keeps the feed available for this tab.
  }
  window.dispatchEvent(new CustomEvent(LOCAL_UPDATE_EVENT));
}

export function publishSignal(multiplier: number, roundNumber: number, sessionId: string): void {
  const now = Date.now();
  if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 500) return;
  if (!Number.isInteger(roundNumber) || roundNumber < 1 || !sessionId) return;

  const existingSignals = readStoredSignals();
  const roundedMultiplier = Math.round(multiplier * 100) / 100;
  const existingIndex = existingSignals.findIndex(
    (signal) => signal.sessionId === sessionId && signal.roundNumber === roundNumber,
  );
  if (existingIndex >= 0) {
    const existing = existingSignals[existingIndex];
    if (existing.multiplier === roundedMultiplier) return;
    const correctedSignal = { ...existing, multiplier: roundedMultiplier, updatedAt: now };
    saveSignals([correctedSignal, ...existingSignals.filter((_, index) => index !== existingIndex)]);
    return;
  }

  const signal: StoredSignal = {
    id: makeId(),
    multiplier: roundedMultiplier,
    createdAt: now,
    roundNumber,
    announcedDuringRound: Math.max(0, roundNumber - 1),
    sessionId,
  };
  saveSignals([signal, ...existingSignals].slice(0, MAX_SIGNALS));
}

export function subscribeToSignals(onSignals: (signals: LiveSignal[]) => void): () => void {
  const notify = () => {
    const signals = readStoredSignals().map((signal) => ({
      id: signal.id,
      multiplier: signal.multiplier,
      createdAt: new Date(signal.createdAt),
      roundNumber: signal.roundNumber,
      announcedDuringRound: signal.announcedDuringRound,
      sessionId: signal.sessionId,
      updatedAt: signal.updatedAt === undefined ? undefined : new Date(signal.updatedAt),
    }));
    onSignals(signals);
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) notify();
  };

  notify();
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(LOCAL_UPDATE_EVENT, notify);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(LOCAL_UPDATE_EVENT, notify);
    window.removeEventListener('storage', handleStorage);
  };
}
