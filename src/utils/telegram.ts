const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
const CHAT_IDS_KEY = 'aviator_telegram_subscriber_chat_ids';
const UPDATE_OFFSET_KEY = 'aviator_telegram_update_offset';

interface TelegramUpdate {
  update_id?: number;
  message?: {
    chat?: { id?: number | string; first_name?: string; username?: string };
    text?: string;
  };
}

function readStoredChatIds(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_IDS_KEY) || '[]');
    return Array.isArray(saved) ? saved.map(String) : [];
  } catch {
    return [];
  }
}

function rememberChatIds(ids: string[]) {
  try {
    localStorage.setItem(CHAT_IDS_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // Browser storage is optional.
  }
}

async function discoverSubscribers(): Promise<string[]> {
  const chatIds = new Set(readStoredChatIds());
  let offset = 0;

  try {
    offset = Number(localStorage.getItem(UPDATE_OFFSET_KEY) || 0);
  } catch {
    // Use Telegram's default offset.
  }

  try {
    const query = offset > 0
      ? `?offset=${offset}&allowed_updates=%5B%22message%22%5D`
      : '?allowed_updates=%5B%22message%22%5D';
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates${query}`);
    const data = await response.json();
    const updates: TelegramUpdate[] = Array.isArray(data.result) ? data.result : [];

    for (const update of updates) {
      const chatId = update.message?.chat?.id;
      if (chatId !== undefined) chatIds.add(String(chatId));
      if (typeof update.update_id === 'number') offset = Math.max(offset, update.update_id + 1);
    }

    if (offset > 0) localStorage.setItem(UPDATE_OFFSET_KEY, String(offset));
  } catch {
    // A temporary Telegram API error should not interrupt the game.
  }

  const ids = [...chatIds];
  rememberChatIds(ids);
  return ids;
}

async function sendMessage(chatId: string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
}

export async function notifyNextCrashMultiplier(multiplier: number): Promise<void> {
  if (!BOT_TOKEN) return;

  const text = `Aviator signal\n\nNext round crash multiplier: ${multiplier.toFixed(2)}x\n\nPress /start in the bot to receive future signals.`;
  const chatIds = await discoverSubscribers();

  await Promise.allSettled(chatIds.map((chatId) => sendMessage(chatId, text)));
}
