export const SIGNAL_LICENSE_STORAGE_KEY = 'aviator_signal_license_key';

// The raw, high-entropy license keys are never shipped to the browser.
const SIGNAL_LICENSE_KEY_HASHES = new Set([
  'e37b8b6d5ae0e9fed93da2e46974d595c583c6507c0ace0c9f431da6bf394b78',
  'bf2e911aef00decd8f0db541ce102b4074d9547d2c35ebab7afb179ab14ac5ca',
  '777487b52d43936a501be47c6723d01213934c41ecc75c289e407c6271435a16',
  'c2dc0758117afa614f908692fcdf2b0b3ac384d4275b9b0f312d13b71ae57abf',
  'b605e5f75227f35113a46ba4d3f827257255b1cd3934fb124f99c8302e37dc27',
  'cd694b4094e910796c2b099d36de7bd3391f05c43f58262e1213eb6893c398ff',
  'e75d45771aeb557928de1e14e2565b5194cddd2b001d8bfdd2bfb240e982a46f',
  '66a5b1b78716b8bbf48ca833560f4626c74f99c77a913cfde71489bff812708e',
  '7cc851b53bc93e2de55cfde56139c93ccc6dcb04861f6e1979e5e7cccdc481d5',
  '880245218fccbcd0f71c7416b8773185afe44a0201ceac3faa8dad30d25be9cb',
]);

export async function validateSignalLicense(licenseKey: string): Promise<boolean> {
  const normalizedKey = licenseKey.replace(/[^A-Z2-7]/gi, '').toUpperCase();
  if (normalizedKey.length !== 32) return false;
  if (!globalThis.crypto?.subtle) throw new Error('Secure local key verification is unavailable in this browser.');

  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalizedKey),
  );
  const digestHex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return SIGNAL_LICENSE_KEY_HASHES.has(digestHex);
}
