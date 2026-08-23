import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Check,
  X,
  Sparkles,
  Plus,
  Zap,
  RotateCcw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { UserAccount } from '../types';
import { sounds } from '../utils/sound';

interface ModalEditUserDaysProps {
  user: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (email: string, updates: Partial<UserAccount>) => Promise<void>;
  isDark?: boolean;
}

// Format Date object to YYYY-MM-DD string
function formatDateToString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calculate difference in days between two YYYY-MM-DD dates
function calculateDaysRemaining(expireDateStr?: string): number | null {
  if (!expireDateStr) return null;
  try {
    const [year, month, day] = expireDateStr.split('-').map(Number);
    const exp = new Date(year, month - 1, day, 23, 59, 59);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

// Add days to a given YYYY-MM-DD base date (or today)
function addDaysToDate(baseDateStr: string, daysToAdd: number): string {
  let base: Date;
  if (baseDateStr) {
    const [year, month, day] = baseDateStr.split('-').map(Number);
    base = new Date(year, month - 1, day);
  } else {
    base = new Date();
  }
  base.setDate(base.getDate() + daysToAdd);
  return formatDateToString(base);
}

// Add months to a date
function addMonthsToDate(baseDateStr: string, monthsToAdd: number): string {
  let base: Date;
  if (baseDateStr) {
    const [year, month, day] = baseDateStr.split('-').map(Number);
    base = new Date(year, month - 1, day);
  } else {
    base = new Date();
  }
  base.setMonth(base.getMonth() + monthsToAdd);
  return formatDateToString(base);
}

export const ModalEditUserDays: React.FC<ModalEditUserDaysProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
  isDark = true,
}) => {
  const todayStr = formatDateToString(new Date());

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [expireDate, setExpireDate] = useState<string>('');
  const [customDays, setCustomDays] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setStartDate(user.startDate || todayStr);
      setExpireDate(user.expireDate || addDaysToDate(user.startDate || todayStr, 30));
      setNotes(user.notes || '');
      setCustomDays('');
    }
  }, [user, isOpen, todayStr]);

  if (!isOpen || !user) return null;

  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const inputBg = isDark
    ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-amber-500'
    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800';

  const daysRemaining = calculateDaysRemaining(expireDate);

  // Quick Preset Add Days (+30 วัน, +60 วัน, +90 วัน, +180 วัน, +365 วัน ฯลฯ)
  const handleAddDays = (days: number) => {
    sounds.playClick();
    // ถ้ามีวันหมดอายุอยู่แล้วและยังไม่หมด ให้บวกต่อจากวันหมดอายุเดิม ถ้าไม่มีให้บวกจาก startDate
    const base = expireDate && expireDate >= todayStr ? expireDate : (startDate || todayStr);
    const newExp = addDaysToDate(base, days);
    setExpireDate(newExp);
  };

  const handleAddMonths = (months: number) => {
    sounds.playClick();
    const base = expireDate && expireDate >= todayStr ? expireDate : (startDate || todayStr);
    const newExp = addMonthsToDate(base, months);
    setExpireDate(newExp);
  };

  const handleSetExactDaysFromStart = (days: number) => {
    sounds.playClick();
    const base = startDate || todayStr;
    const newExp = addDaysToDate(base, days);
    setExpireDate(newExp);
  };

  const handleSetLifetime = () => {
    sounds.playClick();
    setExpireDate('');
  };

  const handleApplyCustomDays = () => {
    const num = parseInt(customDays, 10);
    if (!isNaN(num) && num > 0) {
      handleAddDays(num);
      setCustomDays('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const activeDaysCount = daysRemaining !== null && daysRemaining > 0 ? daysRemaining : undefined;
      await onSave(user.email, {
        startDate: startDate || todayStr,
        expireDate: expireDate || '',
        activeDays: activeDaysCount,
        notes: notes.trim(),
        status: 'approved', // บันทึกวันใช้งานให้อัตโนมัติเป็น approved
      });
      sounds.playSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving user subscription days', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden ${cardBg} animate-scaleUp`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-5 border-b flex items-center justify-between gap-4 ${
            isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-slate-100 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${headingText}`}>กำหนดวันใช้งานสมาชิก</h3>
              <p className={`text-xs font-mono font-medium ${mutedText} mt-0.5 truncate max-w-[260px] sm:max-w-md`}>
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors ${
              isDark
                ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-500 hover:text-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Summary Status Pill */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              !expireDate
                ? isDark
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : daysRemaining !== null && daysRemaining > 0
                ? isDark
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
                : isDark
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-xs font-semibold">สถานะระยะเวลาการใช้งาน</p>
                <p className="text-xs opacity-80">
                  {!expireDate
                    ? 'ใช้งานได้ตลอดชีพ (ไม่มีวันหมดอายุ)'
                    : daysRemaining !== null && daysRemaining > 0
                    ? `ใช้งานได้อีก ${daysRemaining} วัน (ถึงวันที่ ${expireDate})`
                    : `หมดอายุแล้วเมื่อ ${expireDate}`}
                </p>
              </div>
            </div>
            {daysRemaining !== null && daysRemaining > 0 && (
              <span className="font-mono text-lg font-black shrink-0">
                +{daysRemaining} วัน
              </span>
            )}
          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${headingText}`}>
                📅 วันที่เริ่มใช้งาน (Start Date)
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-medium focus:outline-none transition-all ${inputBg}`}
              />
              <p className={`text-[11px] ${mutedText} mt-1`}>
                กำหนดวันเริ่มต้นรอบการคิดวันใช้งาน
              </p>
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1.5 ${headingText}`}>
                ⏰ วันที่หมดอายุ (Expire Date)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={expireDate}
                  onChange={(e) => setExpireDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-medium focus:outline-none transition-all ${inputBg}`}
                />
              </div>
              <p className={`text-[11px] ${mutedText} mt-1`}>
                เว้นว่างไว้หากต้องการให้ใช้งานตลอดชีพ
              </p>
            </div>
          </div>

          {/* Quick Add Buttons Grid */}
          <div className="space-y-2.5">
            <label className={`block text-xs font-bold ${headingText}`}>
              ⚡ ปุ่มด่วน: เพิ่มจำนวนวัน/เดือน ให้ผู้ใช้งาน
            </label>
            
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => handleAddDays(7)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all btn-tactile text-center ${
                  isDark
                    ? 'bg-zinc-800/80 hover:bg-amber-500/20 hover:border-amber-500/40 border-zinc-700 text-zinc-200'
                    : 'bg-slate-100 hover:bg-amber-50 hover:border-amber-300 border-slate-200 text-slate-700'
                }`}
              >
                +7 วัน
              </button>

              <button
                type="button"
                onClick={() => handleAddDays(15)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all btn-tactile text-center ${
                  isDark
                    ? 'bg-zinc-800/80 hover:bg-amber-500/20 hover:border-amber-500/40 border-zinc-700 text-zinc-200'
                    : 'bg-slate-100 hover:bg-amber-50 hover:border-amber-300 border-slate-200 text-slate-700'
                }`}
              >
                +15 วัน
              </button>

              <button
                type="button"
                onClick={() => handleAddDays(30)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all btn-tactile text-center shadow-xs ${
                  isDark
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 text-amber-300'
                    : 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900'
                }`}
              >
                +30 วัน (1 ด.)
              </button>

              <button
                type="button"
                onClick={() => handleAddMonths(3)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all btn-tactile text-center ${
                  isDark
                    ? 'bg-zinc-800/80 hover:bg-amber-500/20 hover:border-amber-500/40 border-zinc-700 text-zinc-200'
                    : 'bg-slate-100 hover:bg-amber-50 hover:border-amber-300 border-slate-200 text-slate-700'
                }`}
              >
                +3 เดือน
              </button>

              <button
                type="button"
                onClick={() => handleAddMonths(6)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all btn-tactile text-center ${
                  isDark
                    ? 'bg-zinc-800/80 hover:bg-amber-500/20 hover:border-amber-500/40 border-zinc-700 text-zinc-200'
                    : 'bg-slate-100 hover:bg-amber-50 hover:border-amber-300 border-slate-200 text-slate-700'
                }`}
              >
                +6 เดือน
              </button>

              <button
                type="button"
                onClick={() => handleAddMonths(12)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all btn-tactile text-center shadow-xs ${
                  isDark
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/50 text-emerald-300'
                    : 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-900'
                }`}
              >
                +1 ปี (12 ด.)
              </button>
            </div>

            {/* Custom Days Input and Lifetime Button */}
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  placeholder="ระบุจำนวนวันเอง เช่น 45, 90..."
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-medium focus:outline-none ${inputBg}`}
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCustomDays}
                disabled={!customDays}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 btn-tactile shrink-0"
              >
                บวกเพิ่มวัน
              </button>
              <button
                type="button"
                onClick={handleSetLifetime}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border btn-tactile shrink-0 ${
                  !expireDate
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
              >
                ตลอดชีพ (Lifetime)
              </button>
            </div>
          </div>

          {/* Notes / Plan input */}
          <div>
            <label className={`block text-xs font-bold mb-1.5 ${headingText}`}>
              📝 บันทึกข้อความ / โน้ตแพ็กเกจ (Admin Memo)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น ต่ออายุรายเดือน 350 บาท ผ่านการโอนเงิน..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${inputBg}`}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/40">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                isDark ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 flex items-center gap-1.5 btn-tactile"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกวันใช้งาน'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
