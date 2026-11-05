/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { Header } from './components/Header';
import { MarqueeTicker } from './components/MarqueeTicker';
import { BottomNav } from './components/BottomNav';
import { CashierModal } from './components/CashierModal';
import { RulesModal } from './components/RulesModal';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { AviatorGame } from './games/AviatorGame';
import { SignalPage } from './components/SignalPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Lock } from 'lucide-react';

const MainContent: React.FC = () => {
  const [cashierOpen, setCashierOpen] = useState<boolean>(false);
  const [cashierTab, setCashierTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [rulesOpen, setRulesOpen] = useState<boolean>(false);
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<'game' | 'signals'>(() => (
    window.location.hash === '#signal' ? 'signals' : 'game'
  ));
  const [adminOpen, setAdminOpen] = useState<boolean>(() => {
    return (
      window.location.hash === '#admin' ||
      window.location.pathname.startsWith('/admin') ||
      window.location.search.includes('admin=true')
    );
  });

  // Listen for hash changes or secret keyboard shortcut (Ctrl + Shift + A)
  useEffect(() => {
    const handleHash = () => {
      setCurrentPage(window.location.hash === '#signal' ? 'signals' : 'game');
      if (window.location.hash === '#admin' || window.location.search.includes('admin=true')) {
        setAdminOpen(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setAdminOpen((prev) => !prev);
      }
    };

    window.addEventListener('hashchange', handleHash);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const openCashier = (tab: 'deposit' | 'withdraw' = 'deposit') => {
    setCashierTab(tab);
    setCashierOpen(true);
  };

  const openSignals = () => {
    if (window.location.hash !== '#signal') window.location.hash = 'signal';
    setCurrentPage('signals');
  };

  const openGame = () => {
    if (window.location.hash === '#signal') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
    setCurrentPage('game');
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-[#e50539] selection:text-white pb-16 md:pb-6">
      {/* 1. Header with Aviator branding, BDT Wallet & Auth */}
      <Header
        onOpenCashier={openCashier}
        onOpenRules={() => setRulesOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenSignals={openSignals}
      />

      {/* 2. Live Aviator Bangladesh Payouts Marquee */}
      <MarqueeTicker />

      {/* 3. 100% Dedicated 1:1 Spribe Aviator Crash Game Stage */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-2 sm:p-4 lg:p-6">
        <div className={currentPage === 'game' ? '' : 'hidden'} aria-hidden={currentPage === 'signals'}>
          <AviatorGame onOpenRules={() => setRulesOpen(true)} />
        </div>
        {currentPage === 'signals' && <SignalPage onBackToGame={openGame} />}
      </main>

      {/* 4. Cashier & Modals */}
      <CashierModal
        isOpen={cashierOpen}
        initialTab={cashierTab}
        onClose={() => setCashierOpen(false)}
      />

      <RulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
      />

      {/* 5. Authentication Modal (Login & Registration) */}
      <AuthModal />

      {/* 6. Profile Modal (User Info, Balance, Deposit/Withdraw, Preferences) */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        onOpenCashier={openCashier}
      />

      {/* 7. Fully Hidden Master Admin Dashboard */}
      {adminOpen && (
        <AdminDashboard
          onClose={() => {
            setAdminOpen(false);
            if (window.location.hash === '#admin') {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
        />
      )}

      {/* 8. Discreet Footer with Hidden Admin Trigger */}
      <footer className="text-center py-2 text-[10px] text-slate-700 flex items-center justify-center gap-2 select-none">
        <span>Ace67 Spribe Aviator Bangladesh · 18+ Only</span>
        <button
          onClick={() => setAdminOpen(true)}
          title="Master Admin Portal (or Ctrl+Shift+A)"
          className="text-slate-800 hover:text-amber-500/80 transition-colors p-0.5 cursor-pointer"
        >
          <Lock className="w-2.5 h-2.5 opacity-30 hover:opacity-100" />
        </button>
      </footer>

      {/* 9. Mobile Bottom Navigation Bar with Profile Tab */}
      <BottomNav
        onOpenCashier={openCashier}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenSignals={openSignals}
        onOpenGame={openGame}
        currentPage={currentPage}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <MainContent />
      </WalletProvider>
    </AuthProvider>
  );
}
