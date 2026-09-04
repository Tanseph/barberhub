import React from 'react';
import { Calendar, CalendarDays, Clock } from 'lucide-react';
import { sounds } from '../utils/sound';

// Thai Months reference
export const THAI_MONTHS = [
  { value: '01', name: 'มกราคม', shortName: 'ม.ค.' },
  { value: '02', name: 'กุมภาพันธ์', shortName: 'ก.พ.' },
  { value: '03', name: 'มีนาคม', shortName: 'มี.ค.' },
  { value: '04', name: 'เมษายน', shortName: 'เม.ย.' },
  { value: '05', name: 'พฤษภาคม', shortName: 'พ.ค.' },
  { value: '06', name: 'มิถุนายน', shortName: 'มิ.ย.' },
  { value: '07', name: 'กรกฎาคม', shortName: 'ก.ค.' },
  { value: '08', name: 'สิงหาคม', shortName: 'ส.ค.' },
  { value: '09', name: 'กันยายน', shortName: 'ก.ย.' },
  { value: '10', name: 'ตุลาคม', shortName: 'ต.ค.' },
  { value: '11', name: 'พฤศจิกายน', shortName: 'พ.ย.' },
  { value: '12', name: 'ธันวาคม', shortName: 'ธ.ค.' },
];

// Helper: Get local date YYYY-MM-DD (Real-time local date)
export const getTodayDateStr = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Helper: Get yesterday date YYYY-MM-DD
export const getYesterdayDateStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Helper: Get tomorrow date YYYY-MM-DD
export const getTomorrowDateStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Helper: Shift date string YYYY-MM-DD by delta days (+1, -1, etc.)
export const shiftDateStr = (dateStr: string, deltaDays: number): string => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + deltaDays);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    const newD = String(date.getDate()).padStart(2, '0');
    return `${newY}-${newM}-${newD}`;
  } catch {
    return dateStr;
  }
};

// Helper: Format YYYY-MM-DD to full Thai Date with day of week (e.g. "วันศุกร์ที่ 4 กันยายน 2569")
export const formatThaiDateWithWeekday = (dateStr?: string): string => {
  if (!dateStr || dateStr === 'all') return 'ทุกวันที่';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const dateObj = new Date(y, m - 1, d);
  const weekdayName = dateObj.toLocaleDateString('th-TH', { weekday: 'long' });
  const monthName = THAI_MONTHS[m - 1]?.name || `${m}`;
  const thaiYear = y + 543;
  return `${weekdayName}ที่ ${d} ${monthName} ${thaiYear}`;
};

// Helper: Format YYYY-MM-DD to Thai Date "24 สิงหาคม 2569"
export const formatThaiDateFull = (dateStr?: string): string => {
  if (!dateStr || dateStr === 'all') return 'ทุกวันที่';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const monthName = THAI_MONTHS[m - 1]?.name || `${m}`;
  const thaiYear = y + 543;
  return `${d} ${monthName} ${thaiYear}`;
};

// Helper: Format YYYY-MM-DD to Thai Date Short "04/09/2569"
export const formatThaiDateShort = (dateStr?: string): string => {
  if (!dateStr || dateStr === 'all') return 'ทุกวัน';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const thaiYear = y + 543;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${thaiYear}`;
};

// Calculate difference in days between two date strings (YYYY-MM-DD)
export const getDayDifference = (targetDateStr: string, baseDateStr: string = getTodayDateStr()): number => {
  try {
    const [y1, m1, d1] = targetDateStr.split('-').map(Number);
    const [y2, m2, d2] = baseDateStr.split('-').map(Number);
    const date1 = new Date(y1, m1 - 1, d1);
    const date2 = new Date(y2, m2 - 1, d2);
    const diffTime = date1.getTime() - date2.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

export interface RealtimeDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (val: string) => void;
  label?: string;
  isDark?: boolean;
  showYesterday?: boolean;
  showTomorrow?: boolean;
  showTime?: boolean;
  timeValue?: string; // "HH:mm"
  onTimeChange?: (val: string) => void;
  subtitle?: string;
  className?: string;
}

export const RealtimeDatePicker: React.FC<RealtimeDatePickerProps> = ({
  value,
  onChange,
  label = 'วันที่ทำรายการ',
  isDark = true,
  showYesterday = true,
  showTomorrow = false,
  showTime = false,
  timeValue,
  onTimeChange,
  subtitle,
  className = '',
}) => {
  const todayStr = getTodayDateStr();
  const yesterdayStr = getYesterdayDateStr();
  const tomorrowStr = getTomorrowDateStr();

  const isToday = value === todayStr;
  const isYesterday = value === yesterdayStr;
  const isTomorrow = value === tomorrowStr;
  const diffDays = getDayDifference(value, todayStr);
  const isPast = diffDays < 0;
  const isFuture = diffDays > 0;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Header with status badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Calendar className={`w-4 h-4 ${isPast ? 'text-amber-500' : 'text-amber-600'}`} />
          <label className={`text-xs sm:text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
            {label}
          </label>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5">
          {isToday && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
              <span>🔴 วันนี้ (Real-time)</span>
            </span>
          )}

          {isPast && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40">
              <span>⏪ บันทึกย้อนหลัง ({Math.abs(diffDays)} วันก่อน)</span>
            </span>
          )}

          {isFuture && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30">
              <span>🗓️ บันทึกล่วงหน้า (+{diffDays} วัน)</span>
            </span>
          )}
        </div>
      </div>

      {subtitle && (
        <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          {subtitle}
        </p>
      )}

      {/* Main Date & Time Inputs with Prev/Next Steppers */}
      <div className="flex items-center gap-1.5">
        {/* Previous Day (-1) */}
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onChange(shiftDateStr(value, -1));
          }}
          title="วันก่อนหน้า (-1 วัน)"
          className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all btn-tactile shrink-0 ${
            isDark
              ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-2xs'
          }`}
        >
          ◀
        </button>

        {/* Date Input */}
        <div className="relative flex-1">
          <input
            type="date"
            value={value}
            onChange={(e) => {
              if (e.target.value) {
                sounds.playClick();
                onChange(e.target.value);
              }
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-mono border focus:outline-none transition-all ${
              isPast
                ? isDark
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-200 focus:border-amber-400'
                  : 'bg-amber-50/70 border-amber-300 text-amber-900 focus:border-amber-500 shadow-2xs'
                : isDark
                ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-amber-500'
                : 'bg-white border-slate-200 text-slate-900 focus:border-slate-800 shadow-2xs'
            }`}
          />
        </div>

        {/* Optional Time Input */}
        {showTime && onTimeChange && (
          <div className="w-28 sm:w-32 shrink-0 relative">
            <input
              type="time"
              value={timeValue || ''}
              onChange={(e) => {
                if (e.target.value) {
                  onTimeChange(e.target.value);
                }
              }}
              className={`w-full px-2.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-mono border focus:outline-none transition-all text-center ${
                isDark
                  ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-amber-500'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-slate-800 shadow-2xs'
              }`}
            />
          </div>
        )}

        {/* Next Day (+1) */}
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onChange(shiftDateStr(value, 1));
          }}
          title="วันถัดไป (+1 วัน)"
          className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all btn-tactile shrink-0 ${
            isDark
              ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-2xs'
          }`}
        >
          ▶
        </button>
      </div>

      {/* Quick Jump Buttons: เมื่อวาน / วันนี้ / พรุ่งนี้ */}
      <div className="flex flex-wrap items-center gap-2">
        {showYesterday && (
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onChange(yesterdayStr);
            }}
            className={`flex-1 min-w-[100px] py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all btn-tactile flex items-center justify-center gap-1 border ${
              isYesterday
                ? isDark
                  ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                  : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : isDark
                ? 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-2xs'
            }`}
          >
            <span>⏪ เมื่อวาน</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onChange(todayStr);
          }}
          className={`flex-1 min-w-[120px] py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all btn-tactile flex items-center justify-center gap-1 border ${
            isToday
              ? isDark
                ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                : 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : isDark
              ? 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-2xs'
          }`}
        >
          <span>📍 วันนี้ (Real-time)</span>
        </button>

        {showTomorrow && (
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onChange(tomorrowStr);
            }}
            className={`flex-1 min-w-[100px] py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all btn-tactile flex items-center justify-center gap-1 border ${
              isTomorrow
                ? isDark
                  ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                  : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : isDark
                ? 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-2xs'
            }`}
          >
            <span>🗓️ พรุ่งนี้</span>
          </button>
        )}
      </div>

      {/* Full localized Thai Date label banner */}
      <div
        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
          isPast
            ? isDark
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-amber-50 border-amber-200 text-amber-900'
            : isDark
            ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300'
            : 'bg-slate-100/70 border-slate-200 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className={`w-4 h-4 shrink-0 ${isPast ? 'text-amber-500' : 'text-amber-600'}`} />
          <span className="text-xs font-bold truncate">
            {formatThaiDateWithWeekday(value)}
          </span>
        </div>

        {showTime && timeValue && (
          <div className="flex items-center gap-1 text-xs font-mono font-bold shrink-0">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>{timeValue.replace(':', '.')} น.</span>
          </div>
        )}
      </div>
    </div>
  );
};
