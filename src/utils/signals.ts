export interface LiveSignal {
  id: string;
  multiplier: number;
  createdAt: Date;
}

interface StoredSignal {
  id: string;
  multiplier: number;
  createdAt: number;
}

const STORAGE_KEY = 'aviator_local_signal_feed_v1';
const LOCAL_UPDATE_EVENT = 'aviator-local-signals-updated';
const MAX_SIGNALS = 40;
const MIN_PUBLISH_INTERVAL_MS = 12_000;
let lastPublishedAt = 0;
let memorySignals: StoredSignal[] = [];

function parseSignals(raw: string | null): StoredSignal[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is StoredSignal => (
        typeof item?.id === 'string'
        && Number.isFinite(item?.multiplier)
        && item.multiplier >= 1.01
        && item.multiplier <= 500
        && Number.isFinite(item?.createdAt)
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

export function publishSignal(multiplier: number): void {
  const now = Date.now();
  if (!Number.isFinite(multiplier) || multiplier < 1.01 || multiplier > 500) return;
  if (now - lastPublishedAt < MIN_PUBLISH_INTERVAL_MS) return;

  lastPublishedAt = now;
  const signal: StoredSignal = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${now}-${Math.random().toString(36).slice(2, 10)}`,
    multiplier: Math.round(multiplier * 100) / 100,
    createdAt: now,
  };
  saveSignals([signal, ...readStoredSignals()].slice(0, MAX_SIGNALS));
}

export function subscribeToSignals(onSignals: (signals: LiveSignal[]) => void): () => void {
  const notify = () => {
    const signals = readStoredSignals().map((signal) => ({
      id: signal.id,
      multiplier: signal.multiplier,
      createdAt: new Date(signal.createdAt),
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
