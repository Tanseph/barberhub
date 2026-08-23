import React, { useState } from 'react';
import {
  Clock,
  ShieldAlert,
  LogOut,
  RefreshCw,
  Mail,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { UserAccount } from '../types';
import { sounds } from '../utils/sound';

interface PendingApprovalScreenProps {
  userAccount: UserAccount | null;
  email: string;
  themeDark?: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({
  userAccount,
  email,
  themeDark = true,
  onRefresh,
  onLogout,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    sounds.playClick();
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const isBlocked = userAccount?.status === 'blocked';

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 sm:p-6 transition-colors ${
        themeDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Decorative background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 ${
            isBlocked ? 'bg-rose-500' : 'bg-amber-500'
          }`}
        />
        <div
          className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20 ${
            themeDark ? 'bg-zinc-700' : 'bg-slate-300'
          }`}
        />
      </div>

      <div className="relative w-full max-w-lg">
        <div
          className={`rounded-3xl border p-6 sm:p-8 shadow-2xl backdrop-blur-xl ${
            themeDark
              ? 'bg-zinc-900/95 border-zinc-800 shadow-black/70'
              : 'bg-white/95 border-slate-200 shadow-slate-200/80'
          }`}
        >
          {/* Status Icon */}
          <div className="text-center mb-6">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl p-1 mb-4 shadow-xl ${
                isBlocked
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-500 shadow-rose-500/10'
                  : 'bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-amber-500/10'
              }`}
            >
              {isBlocked ? (
                <ShieldAlert className="w-10 h-10 stroke-[2]" />
              ) : (
                <Clock className="w-10 h-10 stroke-[2] animate-pulse" />
              )}
            </div>

            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-2xl font-black tracking-tight">
                {isBlocked ? 'ระงับการเข้าใช้งานชั่วคราว' : 'รอการอนุมัติจากแอดมิน'}
              </h1>
            </div>

            <p
              className={`text-xs sm:text-sm leading-relaxed max-w-md mx-auto ${
                themeDark ? 'text-zinc-400' : 'text-slate-500'
              }`}
            >
              {isBlocked
                ? 'บัญชีนี้ถูกระงับสิทธิ์การใช้งานชั่วคราว กรุณาติดต่อแอดมินเพื่อต่ออายุหรือขอเปิดใช้งาน'
                : 'ระบบได้รับข้อมูลอีเมลของคุณแล้ว ขณะนี้อยู่ระหว่างรอแอดมินตรวจสอบและกดอนุมัติการเข้าใช้งานรายเดือน'}
            </p>
          </div>

          {/* User Info Card */}
          <div
            className={`p-4 rounded-2xl border mb-6 space-y-2.5 ${
              themeDark
                ? 'bg-zinc-950/70 border-zinc-800/80 text-zinc-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/50 dark:border-zinc-800/50">
              <span className={themeDark ? 'text-zinc-500' : 'text-slate-400'}>อีเมลของคุณ:</span>
              <span className="font-mono font-bold flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
                <Mail className="w-3.5 h-3.5" />
                {email}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/50 dark:border-zinc-800/50">
              <span className={themeDark ? 'text-zinc-500' : 'text-slate-400'}>สถานะปัจจุบัน:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  isBlocked
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {isBlocked ? '🚫 ระงับการใช้งาน' : '⏳ รอการอนุมัติ (Pending)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className={themeDark ? 'text-zinc-500' : 'text-slate-400'}>ส่งคำขอเมื่อ:</span>
              <span className="font-medium text-[11px]">
                {userAccount?.registeredAt
                  ? new Date(userAccount.registeredAt).toLocaleString('th-TH', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'เพิ่งลงทะเบียนเมื่อสักครู่'}
              </span>
            </div>
          </div>

          {/* Real-time Notice */}
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 mb-6 ${
              themeDark
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>ระบบ Real-time:</strong> เมื่อแอดมินกดอนุมัติที่ระบบหลังบ้าน หน้าจอนี้จะปลดล็อกและนำท่านเข้าสู่โปรแกรม BarberPOS ทันทีโดยอัตโนมัติ
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all btn-tactile ${
                themeDark
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'กำลังตรวจสอบสถานะ...' : 'ตรวจสอบสถานะอีกครั้ง'}</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onLogout();
              }}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all border ${
                themeDark
                  ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>สลับบัญชี / ใช้อีเมลอื่น</span>
            </button>
          </div>

          {/* Admin Contact info placeholder */}
          <div className="mt-6 pt-4 border-t border-zinc-800/50 text-center">
            <p className={`text-[11px] flex items-center justify-center gap-1.5 ${
              themeDark ? 'text-zinc-500' : 'text-slate-400'
            }`}>
              <PhoneCall className="w-3.5 h-3.5" />
              <span>หากต้องการอนุมัติด่วน กรุณาติดต่อแอดมินผู้ดูแลระบบ</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
