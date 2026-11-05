import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

export interface TelegramChat {
  id: number | string;
  type?: string;
  first_name?: string;
  username?: string;
}

interface TelegramSubscriber {
  chatId: string;
  firstName?: string;
  username?: string;
  active: boolean;
  updatedAt: string;
}

interface TelegramUpdate {
  message?: {
    chat?: TelegramChat;
    text?: string;
  };
}

interface TelegramApiResponse {
  ok?: boolean;
  description?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SUBSCRIBERS_FILE = path.resolve(__dirname, '../data/telegram-subscribers.json');
const SIGNAL_STATE_FILE = path.resolve(__dirname, '../data/telegram-signal-state.json');
const MIN_SIGNAL_INTERVAL_MS = 5_000;
let localLastSignalAt = 0;
let firestore: Firestore | null | undefined;

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
}

function getFirestore(): Firestore | null {
  if (firestore !== undefined) return firestore;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    firestore = null;
    return firestore;
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  if (typeof serviceAccount.private_key === 'string') {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  const appName = 'telegram-subscriber-store';
  const adminApp = getApps().find((app) => app.name === appName)
    ?? initializeApp({ credential: cert(serviceAccount) }, appName);
  const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
  const databaseId = JSON.parse(fs.readFileSync(configPath, 'utf8')).firestoreDatabaseId;
  firestore = getAdminFirestore(adminApp, databaseId);
  return firestore;
}

function readJsonFile<T>(file: string, fallback: T): T {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (error) {
    console.error(`Unable to read Telegram state file ${file}:`, error);
  }
  return fallback;
}

function writeJsonFile<T>(file: string, value: T): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

async function updateSubscriber(chat: TelegramChat, active: boolean): Promise<void> {
  const chatId = String(chat.id);
  const subscriber: TelegramSubscriber = {
    chatId,
    firstName: chat.first_name,
    username: chat.username,
    active,
    updatedAt: new Date().toISOString(),
  };
  const db = getFirestore();
  if (db) {
    await db.collection('telegramSubscribers').doc(chatId).set(subscriber, { merge: true });
    return;
  }

  const subscribers = readJsonFile<TelegramSubscriber[]>(SUBSCRIBERS_FILE, []);
  const index = subscribers.findIndex((entry) => entry.chatId === chatId);
  if (index === -1) subscribers.push(subscriber);
  else subscribers[index] = subscriber;
  writeJsonFile(SUBSCRIBERS_FILE, subscribers);
}

async function listSubscribers(): Promise<TelegramSubscriber[]> {
  const db = getFirestore();
  if (db) {
    const snapshot = await db.collection('telegramSubscribers').where('active', '==', true).get();
    return snapshot.docs.map((doc) => doc.data() as TelegramSubscriber);
  }
  return readJsonFile<TelegramSubscriber[]>(SUBSCRIBERS_FILE, []).filter((subscriber) => subscriber.active);
}

async function setSubscriberInactive(chatId: string): Promise<void> {
  const db = getFirestore();
  if (db) {
    await db.collection('telegramSubscribers').doc(chatId).set({ active: false, updatedAt: new Date().toISOString() }, { merge: true });
    return;
  }
  const subscribers = readJsonFile<TelegramSubscriber[]>(SUBSCRIBERS_FILE, []);
  const subscriber = subscribers.find((entry) => entry.chatId === chatId);
  if (subscriber) {
    subscriber.active = false;
    subscriber.updatedAt = new Date().toISOString();
    writeJsonFile(SUBSCRIBERS_FILE, subscribers);
  }
}

export async function processTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  const chat = message?.chat;
  if (!chat || chat.type !== 'private' || typeof chat.id !== 'number' && typeof chat.id !== 'string') return;

  const command = message?.text?.trim().match(/^\/(start|stop|unsubscribe)(?:@\w+)?(?:\s|$)/i)?.[1]?.toLowerCase();
  if (command === 'start') {
    await updateSubscriber(chat, true);
    await sendTelegramMessage(String(chat.id), 'You are subscribed to Aviator signals. Send /stop to unsubscribe.');
  } else if (command === 'stop' || command === 'unsubscribe') {
    await updateSubscriber(chat, false);
    await sendTelegramMessage(String(chat.id), 'You are unsubscribed from Aviator signals. Send /start to subscribe again.');
  }
}

async function sendTelegramMessage(chatId: string, text: string): Promise<TelegramApiResponse> {
  const token = getBotToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const result = await response.json() as TelegramApiResponse;
  if (!response.ok || !result.ok) {
    const error = new Error(result.description || `Telegram API returned HTTP ${response.status}.`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return result;
}

async function reserveSignalDispatch(): Promise<boolean> {
  const now = Date.now();
  const db = getFirestore();
  if (db) {
    const stateRef = db.collection('telegramMeta').doc('signalDispatch');
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(stateRef);
      const lastSentAt = Number(snapshot.data()?.lastSentAt || 0);
      if (now - lastSentAt < MIN_SIGNAL_INTERVAL_MS) return false;
      transaction.set(stateRef, { lastSentAt: now });
      return true;
    });
  }

  const state = readJsonFile<{ lastSentAt?: number }>(SIGNAL_STATE_FILE, {});
  const lastSentAt = Number(state.lastSentAt || localLastSignalAt);
  if (now - lastSentAt < MIN_SIGNAL_INTERVAL_MS) return false;
  localLastSignalAt = now;
  writeJsonFile(SIGNAL_STATE_FILE, { lastSentAt: now });
  return true;
}

export async function broadcastSignal(multiplier: number): Promise<{ sent: number; failed: number; skipped: boolean }> {
  const token = getBotToken();
  if (!token) throw new Error('Telegram signal delivery is not configured.');

  const subscribers = await listSubscribers();
  if (subscribers.length === 0) return { sent: 0, failed: 0, skipped: false };
  if (!(await reserveSignalDispatch())) return { sent: 0, failed: 0, skipped: true };

  const text = `Aviator signal\n\nNext round crash multiplier: ${multiplier.toFixed(2)}x\n\nSend /stop to unsubscribe.`;
  let sent = 0;
  let failed = 0;
  for (let start = 0; start < subscribers.length; start += 20) {
    const batch = subscribers.slice(start, start + 20);
    const results = await Promise.allSettled(batch.map((subscriber) => sendTelegramMessage(subscriber.chatId, text)));
    await Promise.all(results.map(async (result, index) => {
      if (result.status === 'fulfilled') {
        sent += 1;
        return;
      }
      failed += 1;
      const status = (result.reason as { status?: number })?.status;
      if (status === 403) {
        await setSubscriberInactive(batch[index].chatId).catch((error) => {
          console.error('Unable to deactivate blocked Telegram subscriber:', error);
        });
      }
      console.warn(`Telegram signal delivery failed for subscriber ${batch[index].chatId}:`, result.reason);
    }));
  }
  return { sent, failed, skipped: false };
}
