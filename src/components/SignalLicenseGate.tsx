import React, { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { SignalPage } from './SignalPage';
import { SIGNAL_LICENSE_STORAGE_KEY, validateSignalLicense } from '../utils/license';

interface SignalLicenseGateProps {
  onBackToGame: () => void;
}

export const SignalLicenseGate: React.FC<SignalLicenseGateProps> = ({ onBackToGame }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    let savedKey = '';
    try {
      savedKey = window.localStorage.getItem(SIGNAL_LICENSE_STORAGE_KEY) || '';
    } catch {
      // The key can still be entered for this visit if browser storage is unavailable.
    }

    setLicenseKey(savedKey);
    if (!savedKey) {
      setChecking(false);
      return () => { mounted = false; };
    }

    validateSignalLicense(savedKey)
      .then((valid) => {
        if (!mounted) return;
        setAuthorized(valid);
        if (!valid) {
          setError('That saved license is no longer valid. Enter an active key to continue.');
          try { window.localStorage.removeItem(SIGNAL_LICENSE_STORAGE_KEY); } catch { /* ignore */ }
        }
      })
      .catch(() => {
        if (mounted) setError('Could not verify the saved key. Check your connection and try again.');
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });

    return () => { mounted = false; };
  }, []);

  const activate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const valid = await validateSignalLicense(licenseKey.trim());
      if (!valid) {
        setError('Invalid license key. Check it and try again.');
        return;
      }
      try { window.localStorage.setItem(SIGNAL_LICENSE_STORAGE_KEY, licenseKey.trim()); } catch { /* session remains authorized */ }
      setAuthorized(true);
    } catch {
      setError('License validation is unavailable. Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <section className="mx-auto flex min-h-[55vh] w-full max-w-md items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[#242b3a] bg-[#0e131d] px-5 py-4 text-sm font-semibold text-slate-300">
          <LoaderCircle className="h-4 w-4 animate-spin text-rose-300" />
          Checking signal license…
        </div>
      </section>
    );
  }

  if (authorized) return <SignalPage onBackToGame={onBackToGame} />;

  return (
    <section className="mx-auto flex min-h-[65vh] w-full max-w-md items-center justify-center px-2 py-8 sm:px-4">
      <div className="w-full rounded-3xl border border-[#242b3a] bg-[#0e131d] p-5 shadow-2xl shadow-black/20 sm:p-7">
        <button
          onClick={onBackToGame}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Aviator
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300">
          <KeyRound className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-white">Signal access</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Enter one of the issued license keys to open the Signals page. Your key is checked securely by the app server.
        </p>

        <form onSubmit={activate} className="mt-6 space-y-3">
          <label htmlFor="signal-license-key" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            License key
          </label>
          <input
            id="signal-license-key"
            type="text"
            value={licenseKey}
            onChange={(event) => setLicenseKey(event.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={48}
            className="w-full rounded-xl border border-[#30384a] bg-[#090d14] px-4 py-3 font-mono text-sm tracking-wider text-white outline-none transition placeholder:text-slate-700 focus:border-rose-500/60"
          />
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !licenseKey.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e50539] px-4 py-3 text-sm font-black text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {submitting ? 'Checking key…' : 'Unlock signals'}
          </button>
        </form>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Only ten keys are issued. Keep your key private. Signals remain local to this browser.
        </p>
      </div>
    </section>
  );
};
