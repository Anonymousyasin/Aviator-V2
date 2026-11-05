import {
  Timestamp,
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface LiveSignal {
  id: string;
  multiplier: number;
  createdAt: Date;
}

const SIGNALS_COLLECTION = 'signals';
const MAX_SIGNALS = 40;
const MIN_PUBLISH_INTERVAL_MS = 12_000;
let lastPublishedAt = 0;

export async function publishSignal(multiplier: number): Promise<void> {
  const now = Date.now();
  if (!Number.isFinite(multiplier) || multiplier < 1.01 || multiplier > 500) return;
  if (now - lastPublishedAt < MIN_PUBLISH_INTERVAL_MS) return;

  lastPublishedAt = now;
  try {
    await addDoc(collection(db, SIGNALS_COLLECTION), {
      multiplier: Math.round(multiplier * 100) / 100,
      createdAt: serverTimestamp(),
      source: 'aviator',
    });
  } catch (error) {
    lastPublishedAt = 0;
    console.warn('Could not publish live signal:', error);
  }
}

export function subscribeToSignals(
  onSignals: (signals: LiveSignal[]) => void,
  onError: (error: Error) => void,
): () => void {
  const signalsQuery = query(
    collection(db, SIGNALS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(MAX_SIGNALS),
  );

  return onSnapshot(
    signalsQuery,
    (snapshot) => {
      const signals = snapshot.docs.flatMap((signalDoc) => {
        const data = signalDoc.data();
        const multiplier = Number(data.multiplier);
        const createdAt = data.createdAt;
        if (
          !Number.isFinite(multiplier)
          || multiplier < 1.01
          || multiplier > 500
          || !(createdAt instanceof Timestamp)
        ) return [];

        return [{ id: signalDoc.id, multiplier, createdAt: createdAt.toDate() }];
      });
      onSignals(signals);
    },
    (error) => onError(error),
  );
}
