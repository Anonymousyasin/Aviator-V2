export const SIGNAL_LICENSE_STORAGE_KEY = 'aviator_signal_license_key';

export async function validateSignalLicense(licenseKey: string): Promise<boolean> {
  const response = await fetch('/api/signals/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey }),
    credentials: 'same-origin',
  });

  if (!response.ok) throw new Error('License validation is unavailable.');
  const result = await response.json() as { valid?: boolean };
  return result.valid === true;
}
