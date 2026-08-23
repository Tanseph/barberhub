/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { TabPOS } from './components/TabPOS';
import { TabDashboard } from './components/TabDashboard';
import { TabQueue } from './components/TabQueue';
import { TabExpenses } from './components/TabExpenses';
import { TabSettings } from './components/TabSettings';
import { ToastContainer } from './components/ToastContainer';
import { ModalConfirm } from './components/ModalConfirm';
import { ModalReceipt } from './components/ModalReceipt';
import { ModalEditBill } from './components/ModalEditBill';
import { ModalAdminManagement } from './components/ModalAdminManagement';
import { LoginScreen } from './components/LoginScreen';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    theme,
    currentUserEmail,
    currentUserAccount,
    isCurrentUserAdmin,
    login,
    logout,
    refreshUserStatus,
  } = useApp();

  // If no user is logged in, show the Email Login Screen
  if (!currentUserEmail) {
    return (
      <div className={`min-h-screen ${theme.bgMain} font-sans`}>
        <LoginScreen onLogin={login} themeDark={theme.isDark} />
        <ToastContainer />
      </div>
    );
  }

  // If user is pending approval or blocked, show PendingApprovalScreen (unless they are Super Admin)
  if (!isCurrentUserAdmin && (currentUserAccount?.status === 'pending' || currentUserAccount?.status === 'blocked')) {
    return (
      <div className={`min-h-screen ${theme.bgMain} font-sans`}>
        <PendingApprovalScreen
          userAccount={currentUserAccount}
          email={currentUserEmail}
          themeDark={theme.isDark}
          onRefresh={refreshUserStatus}
          onLogout={logout}
        />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bgMain} flex flex-col font-sans transition-colors duration-300`}>
      {/* App Header with user badge and cloud sync */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'pos' && <TabPOS />}
        {activeTab === 'dashboard' && <TabDashboard />}
        {activeTab === 'queue' && <TabQueue />}
        {activeTab === 'expenses' && <TabExpenses />}
        {activeTab === 'settings' && <TabSettings />}
      </main>

      {/* Footer info */}
      <footer className={`py-4 border-t ${theme.isDark ? 'border-zinc-800/60 bg-zinc-950/40 text-zinc-500' : 'border-slate-200/80 bg-white/70 text-slate-500'} text-center text-xs transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 font-medium">
            <span>💈 BarberPOS Pro</span>
            <span className={theme.isDark ? 'text-zinc-400' : 'text-slate-600'}>— ระบบจัดการร้านตัดผมและยอดขายระดับมืออาชีพ</span>
          </p>
          <p className={`${theme.isDark ? 'text-zinc-600' : 'text-slate-400'} font-mono text-[11px]`}>
            Cloud Multi-Tenant • Real-time • POS
          </p>
        </div>
      </footer>

      {/* Global Modals & Notifications */}
      <ModalReceipt />
      <ModalEditBill />
      <ModalAdminManagement />
      <ModalConfirm />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
