import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TabType } from '../types';
import {
  Scissors,
  Receipt,
  LayoutDashboard,
  CalendarDays,
  Settings,
  Clock,
  Wallet,
  Cloud,
  FileText,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    settings,
    expenses,
    queues,
    theme,
    currentUserEmail,
    cloudSyncStatus,
  } = useApp();

  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Today stats for badges
  const todayStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;
  
  const todayExpenses = expenses.filter((e) => e.dateStr === todayStr);
  const todayQueues = queues.filter((q) => q.date === todayStr && !q.isLeaveOrBlocked);
  const waitingQueues = todayQueues.filter((q) => q.status === 'waiting' || q.status === 'in_progress').length;

  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'pos',
      label: 'บันทึกยอดขาย',
      icon: <Receipt className="w-4 h-4" />,
      badge: 'POS',
    },
    {
      id: 'dashboard',
      label: 'แดชบอร์ด & สรุปยอด',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'queue',
      label: 'จองคิว',
      icon: <CalendarDays className="w-4 h-4" />,
      badge: waitingQueues > 0 ? `${waitingQueues} คิว` : undefined,
    },
    {
      id: 'expenses',
      label: 'รายจ่ายร้าน',
      icon: <Wallet className="w-4 h-4" />,
      badge: todayExpenses.length > 0 ? `${todayExpenses.length}` : undefined,
    },
    {
      id: 'payslip',
      label: 'สลิปเงินเดือน',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'ตั้งค่าร้าน',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const formattedDate = currentTime.toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const isDark = theme.isDark ?? true;

  return (
    <header className={`sticky top-0 z-40 ${theme.headerBg} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top brand & live info row */}
        <div className="flex flex-col sm:flex-row items-center justify-between py-3 gap-3">
          {/* Brand Info */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-md shadow-amber-500/20 flex items-center justify-center overflow-hidden">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                  ) : (
                    <div className={`w-full h-full ${isDark ? 'bg-zinc-950' : 'bg-slate-900'} rounded-[14px] flex items-center justify-center text-amber-400`}>
                      <Scissors className="w-5 h-5 animate-pulse" />
                    </div>
                  )}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 ${isDark ? 'border-zinc-950' : 'border-white'} flex items-center justify-center shadow-xs`}>
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-base sm:text-lg font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-slate-900'} flex items-center gap-1.5`}>
                    <span>{settings.shopName}</span>
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                    PRO POS
                  </span>
                </div>
                <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  <span className="flex items-center gap-1">
                    <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                    <span>{formattedDate}</span>
                    <span className={`font-mono font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>{formattedTime} น.</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Header Section: Cloud Sync */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            {/* Cloud Sync Status Indicator (Small) */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs shadow-xs ${
              isDark
                ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
                : 'bg-slate-50 border-slate-200/90 text-slate-700'
            }`}>
              <div
                className={`w-2 h-2 rounded-full ${
                  cloudSyncStatus === 'synced'
                    ? 'bg-emerald-500'
                    : cloudSyncStatus === 'syncing'
                    ? 'bg-amber-500 animate-spin'
                    : 'bg-zinc-400'
                }`}
                title={cloudSyncStatus === 'synced' ? 'ซิงก์ Cloud แล้ว' : 'กำลังซิงก์...'}
              />
              <Cloud className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden sm:inline text-[11px] font-medium">
                {cloudSyncStatus === 'synced' ? 'Cloud Connected' : 'Syncing...'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Tabs Navigation Bar */}
        <div className={`flex items-center overflow-x-auto no-scrollbar gap-1 sm:gap-2 pb-2.5 pt-1 border-t ${
          isDark ? 'border-zinc-800/60' : 'border-slate-200/80'
        }`}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 btn-tactile ${
                  isActive
                    ? theme.tabActiveBg
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-current'
                        : isDark
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
