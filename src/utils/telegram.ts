export async function notifyNextCrashMultiplier(multiplier: number): Promise<void> {
  if (!Number.isFinite(multiplier) || multiplier < 1.01 || multiplier > 500) return;

  try {
    await fetch('/api/telegram/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ multiplier }),
    });
  } catch {
    // Telegram delivery is optional and must not interrupt the game.
  }
}
