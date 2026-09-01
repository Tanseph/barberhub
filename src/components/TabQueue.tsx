import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { QueueBooking } from '../types';
import {
  CalendarDays,
  Clock,
  Phone,
  Plus,
  Trash2,
  Receipt,
  UserX,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { sounds } from '../utils/sound';

// Helper: Get local date YYYY-MM-DD (Real-time local date)
export const getTodayDateStr = (): string => {
  const d = new Date();
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

// Helper: Get current nearest 30-minute slot (e.g. 10:00, 10:30, 11:00)
export const getCurrentSlotTimeStr = (): string => {
  const d = new Date();
  let h = d.getHours();
  let m = d.getMinutes();
  if (m > 0 && m <= 30) {
    m = 30;
  } else if (m > 30) {
    m = 0;
    h = (h + 1) % 24;
  } else {
    m = 0;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

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

// Helper: Format time string (e.g. "13:00", "13.00") to Thai format "13.00 น."
export const formatThaiTime = (timeStr?: string, withUnit: boolean = true): string => {
  if (!timeStr) return '-';
  const clean = timeStr.trim().replace(':', '.');
  return withUnit ? `${clean} น.` : clean;
};

// Helper: Format time range (e.g. "13:00", "13:30") to "13.00 - 13.30 น."
export const formatThaiTimeRange = (start?: string, end?: string): string => {
  if (!start) return '-';
  const s = start.replace(':', '.');
  const e = end ? end.replace(':', '.') : '';
  return e ? `${s} - ${e} น.` : `${s} น.`;
};

// Helper: Format YYYY-MM-DD to Thai Date "วัน เดือน ปี พ.ศ." (e.g. "24 สิงหาคม 2569")
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

// Helper: Format YYYY-MM-DD to Thai Date Short "24/08/2569"
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

// 24-Hour Time slots with ONLY :00 and :30 (เช่น 09.00 น., 09.30 น., 10.00 น., 10.30 น.)
const ALL_24H_TIME_OPTIONS: string[] = [];
// ช่วงเวลาทำการ 06:00 - 23:30
for (let h = 6; h <= 23; h++) {
  const hh = String(h).padStart(2, '0');
  ALL_24H_TIME_OPTIONS.push(`${hh}:00`);
  ALL_24H_TIME_OPTIONS.push(`${hh}:30`);
}
// ช่วง 00:00 - 05:30
for (let h = 0; h < 6; h++) {
  const hh = String(h).padStart(2, '0');
  ALL_24H_TIME_OPTIONS.push(`${hh}:00`);
  ALL_24H_TIME_OPTIONS.push(`${hh}:30`);
}

// Reusable Thai Date (วัน / เดือน / ปี พ.ศ.) Picker Component with Real-time synchronization
const ThaiDatePicker: React.FC<{
  value: string; // "YYYY-MM-DD"
  onChange: (val: string) => void;
  label?: string;
  isDark?: boolean;
}> = ({ value, onChange, label, isDark }) => {
  const todayStr = getTodayDateStr();
  const tomorrowStr = getTomorrowDateStr();
  const isToday = value === todayStr;
  const isTomorrow = value === tomorrowStr;

  const parts = value.split('-').map(Number);
  const curY = parts[0] || new Date().getFullYear();
  const curM = parts[1] || new Date().getMonth() + 1;
  const curD = parts[2] || new Date().getDate();

  const daysInMonth = new Date(curY, curM, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Thai Buddhist Years (e.g. 2567..2575 / 2024..2032)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 9 }, (_, i) => currentYear - 2 + i);

  const handleDay = (d: number) => {
    const padD = String(d).padStart(2, '0');
    const padM = String(curM).padStart(2, '0');
    onChange(`${curY}-${padM}-${padD}`);
  };

  const handleMonth = (m: number) => {
    const maxDays = new Date(curY, m, 0).getDate();
    const safeDay = Math.min(curD, maxDays);
    const padD = String(safeDay).padStart(2, '0');
    const padM = String(m).padStart(2, '0');
    onChange(`${curY}-${padM}-${padD}`);
  };

  const handleYear = (y: number) => {
    const maxDays = new Date(y, curM, 0).getDate();
    const safeDay = Math.min(curD, maxDays);
    const padD = String(safeDay).padStart(2, '0');
    const padM = String(curM).padStart(2, '0');
    onChange(`${y}-${padM}-${padD}`);
  };

  const selectClass = `px-2 py-2 rounded-xl text-xs font-bold font-mono border focus:outline-none ${
    isDark
      ? 'bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-amber-500'
      : 'bg-white border-slate-200 text-slate-800 focus:border-slate-800 shadow-2xs'
  }`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={`text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'} flex items-center gap-1.5`}>
          <Calendar className="w-3.5 h-3.5 text-amber-600" />
          <span>{label || 'วันที่จอง (วัน / เดือน / ปี)'}</span>
        </label>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
          isToday
            ? isDark
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-amber-50 text-amber-800 border-amber-300'
            : isDark
            ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
            : 'bg-slate-100 text-slate-700 border-slate-200'
        }`}>
          {isToday ? '📍 วันนี้ (Real-time)' : formatThaiDateShort(value)}
        </span>
      </div>

      {/* Quick Date Presets */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onChange(todayStr);
          }}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all btn-tactile flex items-center justify-center gap-1 border ${
            isToday
              ? isDark
                ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                : 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : isDark
              ? 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <span>📍 วันนี้</span>
          <span className="text-[10px] opacity-80">(Real-time)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onChange(tomorrowStr);
          }}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all btn-tactile flex items-center justify-center gap-1 border ${
            isTomorrow
              ? isDark
                ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                : 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : isDark
              ? 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <span>🗓️ พรุ่งนี้</span>
        </button>
      </div>

      {/* 3 Select Dropdowns: วัน / เดือน / ปี พ.ศ. */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* วัน */}
        <div>
          <span className={`block text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'} mb-0.5`}>
            วัน
          </span>
          <select
            value={curD}
            onChange={(e) => handleDay(Number(e.target.value))}
            className={`w-full ${selectClass}`}
          >
            {days.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* เดือน */}
        <div>
          <span className={`block text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'} mb-0.5`}>
            เดือน
          </span>
          <select
            value={curM}
            onChange={(e) => handleMonth(Number(e.target.value))}
            className={`w-full ${selectClass}`}
          >
            {THAI_MONTHS.map((m, idx) => (
              <option key={m.value} value={idx + 1}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* ปี พ.ศ. */}
        <div>
          <span className={`block text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'} mb-0.5`}>
            ปี (พ.ศ.)
          </span>
          <select
            value={curY}
            onChange={(e) => handleYear(Number(e.target.value))}
            className={`w-full ${selectClass}`}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y + 543}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'} pt-0.5`}>
        🗓️ {formatThaiDateFull(value)}
      </p>
    </div>
  );
};

// Reusable Pure 24-Hour Time Dropdown (NO AM/PM AT ALL)
const Thai24HourSelect: React.FC<{
  value: string;
  onChange: (val: string) => void;
  label: string;
  isDark?: boolean;
}> = ({ value, onChange, label, isDark }) => {
  const options = useMemo(() => {
    if (value && !ALL_24H_TIME_OPTIONS.includes(value)) {
      return [...ALL_24H_TIME_OPTIONS, value].sort();
    }
    return ALL_24H_TIME_OPTIONS;
  }, [value]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className={`text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'} flex items-center gap-1`}>
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>{label}</span>
        </label>
        <span className="text-[11px] font-mono font-extrabold text-amber-600">
          {formatThaiTime(value)}
        </span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold font-mono border focus:outline-none ${
          isDark
            ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-amber-500'
            : 'bg-white border-slate-200 text-slate-900 focus:border-slate-900 shadow-2xs'
        }`}
      >
        {options.map((t) => (
          <option key={t} value={t}>
            {formatThaiTime(t)}
          </option>
        ))}
      </select>
    </div>
  );
};

export const TabQueue: React.FC = () => {
  const {
    barbers,
    queues,
    addQueueBooking,
    deleteQueueBooking,
    changeQueueStatus,
    startPosFromQueue,
    settings,
    theme,
    openConfirm,
  } = useApp();

  const isDark = theme.isDark ?? false;

  // Active sub-view: 'booking' (จองคิว & รายการจอง) vs 'leave' (ปิดคิว / ลางาน)
  const [subTab, setSubTab] = useState<'booking' | 'leave'>('booking');

  // Form State for Booking
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    barbers[0]?.id || ''
  );

  useEffect(() => {
    if ((!selectedBarberId || !barbers.find((b) => b.id === selectedBarberId)) && barbers.length > 0) {
      setSelectedBarberId(barbers[0].id);
    }
  }, [barbers, selectedBarberId]);

  const [bookingDate, setBookingDate] = useState<string>(() => getTodayDateStr());

  // Calculate end time helper based on slot duration minutes (strictly in 30-minute intervals: :00 and :30)
  const calculateEndTime = (start: string, durationMinutes: number = 30): string => {
    try {
      const normalized = start.replace('.', ':');
      const [h, m] = normalized.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return '10:30';
      // Normalize duration to steps of 30 minutes (minimum 30 min)
      const dur = Math.max(30, Math.round((durationMinutes || 30) / 30) * 30);
      const totalMinutes = h * 60 + m + dur;
      const endH = Math.floor(totalMinutes / 60) % 24;
      const endM = totalMinutes % 60;
      const cleanM = endM >= 30 ? 30 : 0;
      return `${String(endH).padStart(2, '0')}:${String(cleanM).padStart(2, '0')}`;
    } catch {
      return '10:30';
    }
  };

  // Time States (24h internal "HH:mm")
  const [startTime, setStartTime] = useState<string>(() => {
    const slot = getCurrentSlotTimeStr();
    return slot;
  });
  const [endTime, setEndTime] = useState<string>(() => calculateEndTime(getCurrentSlotTimeStr(), settings.queueSlotDuration || 30));
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // Keep end time synced when slot duration setting changes
  useEffect(() => {
    if (startTime) {
      setEndTime(calculateEndTime(startTime, settings.queueSlotDuration || 30));
    }
  }, [settings.queueSlotDuration]);

  // Form State for Barber Leave / Blocked Slot
  const [leaveBarberId, setLeaveBarberId] = useState<string>(
    barbers[0]?.id || ''
  );
  const [leaveDate, setLeaveDate] = useState<string>(() => getTodayDateStr());
  const [leaveStartTime, setLeaveStartTime] = useState<string>('09:00');
  const [leaveEndTime, setLeaveEndTime] = useState<string>('19:00');
  const [leaveReason, setLeaveReason] = useState<string>('ลาพักร้อนประจำสัปดาห์');

  // Filter in Queue list (default to real-time today)
  const [filterDate, setFilterDate] = useState<string>(() => getTodayDateStr());
  const [filterBarber, setFilterBarber] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Helper when start time changes
  const handleStartTimeChange = (start: string) => {
    const standard = start.replace('.', ':');
    setStartTime(standard);
    if (standard) {
      const calculated = calculateEndTime(standard, settings.queueSlotDuration || 45);
      setEndTime(calculated);
    }
  };

  // Submit Queue Booking
  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const barberObj = barbers.find((b) => b.id === selectedBarberId) || barbers[0];

    addQueueBooking({
      barberId: selectedBarberId,
      barberName: barberObj ? (barberObj.nickname || barberObj.name) : 'ช่างประจำร้าน',
      date: bookingDate,
      startTime,
      endTime,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || '-',
      serviceType: 'บริการตัดผม/ทั่วไป',
      status: 'waiting',
      isLeaveOrBlocked: false,
    });

    // Reset customer fields
    setCustomerName('');
    setCustomerPhone('');

    // Advance start time
    handleStartTimeChange(endTime);
  };

  // Submit Leave / Blocked Slot
  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const barberObj = barbers.find((b) => b.id === leaveBarberId) || barbers[0];

    addQueueBooking({
      barberId: leaveBarberId,
      barberName: barberObj ? barberObj.name : 'ช่างประจำร้าน',
      date: leaveDate,
      startTime: leaveStartTime,
      endTime: leaveEndTime,
      customerName: `[ปิดคิว/ลางาน] ${barberObj?.nickname || ''}`,
      customerPhone: '-',
      serviceType: leaveReason,
      notes: leaveReason,
      status: 'cancelled',
      isLeaveOrBlocked: true,
      leaveReason: leaveReason.trim() || 'ช่างติดธุระส่วนตัว',
    });

    setLeaveReason('ลาพักร้อนประจำสัปดาห์');
  };

  // Filtered Queues List for view
  const visibleQueues = useMemo(() => {
    return queues
      .filter((q) => {
        if (subTab === 'leave') {
          return q.isLeaveOrBlocked && q.date === filterDate;
        }
        const matchDate = filterDate === 'all' || q.date === filterDate;
        const matchBarber = filterBarber === 'all' || q.barberId === filterBarber;
        const matchStatus = filterStatus === 'all' || q.status === filterStatus;
        return matchDate && matchBarber && matchStatus && !q.isLeaveOrBlocked;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [queues, subTab, filterDate, filterBarber, filterStatus]);

  // Delete Queue confirmation
  const handleDeleteQueue = (queue: QueueBooking) => {
    openConfirm({
      title: 'ต้องการยกเลิกคิวนี้ใช่หรือไม่? 🗑️',
      message: `คุณกำลังจะลบคิว ${queue.queueNumber} ของคุณ ${queue.customerName} (เวลา ${formatThaiTimeRange(queue.startTime, queue.endTime)})`,
      confirmText: 'ลบคิวเลย',
      cancelText: 'เก็บไว้',
      confirmColor: 'bg-rose-600 hover:bg-rose-500',
      icon: '✂️',
      onConfirm: () => {
        deleteQueueBooking(queue.id);
      },
    });
  };

  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';
  const borderSubtle = isDark ? 'border-zinc-800' : 'border-slate-200';
  const inputClass = isDark
    ? 'w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none'
    : 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:border-slate-800 focus:outline-none';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. TOP SUB-NAVIGATION */}
      <div className={`${theme.bgCard} rounded-2xl p-5 sm:p-6 transition-all duration-200`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-600" />
              <h2 className={`text-lg font-bold ${headingText}`}>
                ระบบจัดการคิว & ตารางงานช่าง (Thai 24-Hour Queue)
              </h2>
            </div>
            <p className={`text-xs ${mutedText} mt-0.5`}>
              กำหนดเวลาจองคิวล่วงหน้าแบบเวลาไทย 24 ชั่วโมง ({settings.queueSlotDuration} นาที/คิว) และบันทึกวันหยุดช่าง
            </p>
          </div>

          <div className={`flex rounded-xl p-1 border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'}`}>
            <button
              onClick={() => {
                sounds.playClick();
                setSubTab('booking');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all btn-tactile ${
                subTab === 'booking'
                  ? isDark ? 'bg-amber-500 text-zinc-950 shadow-md' : 'bg-white text-slate-900 shadow-xs'
                  : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 จองคิวลูกค้า
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setSubTab('leave');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all btn-tactile ${
                subTab === 'leave'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🚫 ปิดคิว / ลางาน
            </button>
          </div>
        </div>
      </div>

      {/* 2. SUBTAB: NORMAL BOOKING */}
      {subTab === 'booking' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: New Booking Form (5 Cols) */}
          <div className={`lg:col-span-5 xl:col-span-5 ${theme.bgCard} rounded-2xl p-5 sm:p-6 space-y-4`}>
            <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle}`}>
              <span className={`text-sm font-bold ${headingText} flex items-center gap-2`}>
                <Plus className="w-4 h-4 text-amber-600" />
                <span>ลงทะเบียนจองคิวใหม่</span>
              </span>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              {/* Select Barber */}
              <div>
                <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
                  เลือกช่างประจำคิว <span className="text-rose-500">*</span>
                </label>
                {barbers.length === 0 ? (
                  <div className={`p-3 rounded-xl border text-center ${
                    isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    <p className="text-xs font-semibold">ยังไม่มีรายชื่อช่างในระบบ</p>
                    <p className="text-[11px] mt-0.5">กรุณาเพิ่มรายชื่อช่างที่แท็บ "ตั้งค่าร้าน"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {barbers.map((b) => {
                      const isSel = selectedBarberId === b.id;
                      return (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => {
                            sounds.playClick();
                            setSelectedBarberId(b.id);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all btn-tactile ${
                            isSel
                              ? isDark
                                ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                                : 'border-slate-900 bg-slate-900 text-white shadow-xs'
                              : isDark
                              ? 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{b.avatar ? `${b.avatar} ` : ''}{b.nickname}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Date & Time Picker (วัน เดือน ปี พ.ศ. และเวลา 24 ชั่วโมง) */}
              <div className={`space-y-3.5 p-4 rounded-2xl border ${
                isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50/90 border-slate-200'
              }`}>
                {/* วันที่จอง (วัน / เดือน / ปี) */}
                <ThaiDatePicker
                  value={bookingDate}
                  onChange={(newD) => {
                    setBookingDate(newD);
                    setFilterDate(newD);
                  }}
                  label="วันที่จอง (วัน / เดือน / ปี พ.ศ.)"
                  isDark={isDark}
                />

                {/* Time Selection: Start Time & End Time (100% 24h - NO AM/PM) */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-dashed border-slate-200 dark:border-zinc-800">
                  <Thai24HourSelect
                    label="เวลาเริ่ม"
                    value={startTime}
                    onChange={handleStartTimeChange}
                    isDark={isDark}
                  />

                  <Thai24HourSelect
                    label="เวลาสิ้นสุด"
                    value={endTime}
                    onChange={(val) => setEndTime(val)}
                    isDark={isDark}
                  />
                </div>
              </div>

              {/* Customer Name & Phone */}
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-semibold ${mutedText} mb-1`}>
                    ชื่อลูกค้า <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="กรุณาระบุชื่อลูกค้า"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold ${mutedText} mb-1`}>
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="กรุณาระบุเบอร์โทรศัพท์ลูกค้า (ไม่บังคับ)"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${theme.primary} btn-tactile shadow-md`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกการจองคิว 💈 ({formatThaiTimeRange(startTime, endTime)})</span>
              </button>
            </form>
          </div>

          {/* RIGHT: Queue Timeline & List (7 Cols) */}
          <div className={`lg:col-span-7 xl:col-span-7 ${theme.bgCard} rounded-2xl p-5 sm:p-6 space-y-4`}>
            {/* Header & Filter Bar */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${borderSubtle}`}>
              <div>
                <h3 className={`text-base font-bold ${headingText} flex items-center gap-2`}>
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>ตารางรายการจองคิว ({visibleQueues.length} คิว)</span>
                </h3>
                <p className={`text-xs ${mutedText} mt-0.5`}>
                  วันที่: <span className={`font-bold text-amber-600`}>{formatThaiDateFull(filterDate)}</span>
                </p>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    setFilterDate(todayStr);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold btn-tactile ${
                    isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  📍 วันนี้
                </button>

                <select
                  value={filterBarber}
                  onChange={(e) => setFilterBarber(e.target.value)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">ช่างทั้งหมด</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nickname}
                    </option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="waiting">🕒 รอตัด</option>
                  <option value="in_progress">✂️ กำลังตัด</option>
                  <option value="completed">✅ เสร็จสิ้น</option>
                  <option value="cancelled">❌ ยกเลิก</option>
                </select>
              </div>
            </div>

            {/* Queue Cards List */}
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {visibleQueues.length === 0 ? (
                <div className={`py-12 text-center rounded-xl border ${
                  isDark ? 'text-zinc-500 bg-zinc-950/40 border-zinc-800/60' : 'text-slate-400 bg-slate-50 border-slate-200'
                }`}>
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">ยังไม่มีรายการจองคิวในวันที่เลือก</p>
                  <p className="text-xs text-slate-500 mt-1">สามารถสร้างคิวใหม่ได้จากแบบฟอร์มด้านซ้าย</p>
                </div>
              ) : (
                visibleQueues.map((q) => {
                  const isCompleted = q.status === 'completed';
                  const isInProgress = q.status === 'in_progress';
                  const isWaiting = q.status === 'waiting';
                  const isCancelled = q.status === 'cancelled';

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isInProgress
                          ? isDark
                            ? 'border-amber-500/60 bg-amber-500/10 shadow-md'
                            : 'border-slate-900 bg-slate-50 shadow-sm'
                          : isCompleted
                          ? isDark
                            ? 'border-emerald-500/30 bg-emerald-500/5 opacity-80'
                            : 'border-emerald-200 bg-emerald-50/50 opacity-90'
                          : isCancelled
                          ? isDark
                            ? 'border-zinc-800 bg-zinc-950/40 opacity-50'
                            : 'border-slate-200 bg-slate-50 opacity-50'
                          : isDark
                          ? 'border-zinc-800 bg-zinc-950/80 hover:border-zinc-700'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b ${
                        isDark ? 'border-zinc-800/80' : 'border-slate-100'
                      }`}>
                        {/* Time & Queue Number (Thai 24H Format) */}
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                            isDark ? 'bg-zinc-900 border border-zinc-700 text-amber-400' : 'bg-slate-900 text-white'
                          }`}>
                            {q.queueNumber}
                          </span>
                          <span className={`font-mono text-sm font-bold ${headingText} flex items-center gap-1.5`}>
                            <Clock className={`w-3.5 h-3.5 ${mutedText}`} />
                            <span>{formatThaiTimeRange(q.startTime, q.endTime)}</span>
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isWaiting
                                ? 'bg-amber-500/15 text-amber-600 border border-amber-500/25'
                                : isInProgress
                                ? 'bg-sky-500/15 text-sky-600 border border-sky-500/25 animate-pulse'
                                : isCompleted
                                ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/25'
                                : 'bg-rose-500/15 text-rose-600 border border-rose-500/25'
                            }`}
                          >
                            {isWaiting && '🕒 รอตัด'}
                            {isInProgress && '✂️ กำลังตัด'}
                            {isCompleted && '✅ เสร็จสิ้น'}
                            {isCancelled && '❌ ยกเลิก'}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="py-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className={`font-bold text-sm ${headingText}`}>{q.customerName}</p>
                          {q.customerPhone && q.customerPhone !== '-' && (
                            <p className={`${mutedText} font-mono mt-0.5 flex items-center gap-1`}>
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{q.customerPhone}</span>
                            </p>
                          )}
                        </div>
                        <div>
                          <p className={isDark ? 'text-zinc-300' : 'text-slate-700'}>
                            ช่าง: <strong className="text-amber-600">{q.barberName}</strong>
                          </p>
                          <p className={`${mutedText} mt-0.5 truncate`}>
                            บริการ: {q.serviceType}
                          </p>
                        </div>
                      </div>

                      {q.notes && (
                        <div className={`text-[11px] italic px-2.5 py-1 rounded mb-2.5 ${
                          isDark ? 'text-zinc-400 bg-zinc-900/60' : 'text-slate-500 bg-slate-50'
                        }`}>
                          หมายเหตุ: {q.notes}
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 ${
                        isDark ? 'border-zinc-800/80' : 'border-slate-100'
                      }`}>
                        {/* Status Change Buttons */}
                        <div className="flex items-center gap-1">
                          {isWaiting && (
                            <button
                              onClick={() => changeQueueStatus(q.id, 'in_progress')}
                              className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500 hover:text-white text-sky-600 text-xs font-semibold transition-colors btn-tactile"
                            >
                              เริ่มตัด ✂️
                            </button>
                          )}
                          {isInProgress && (
                            <button
                              onClick={() => changeQueueStatus(q.id, 'completed')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 hover:text-white text-emerald-600 text-xs font-semibold transition-colors btn-tactile"
                            >
                              เสร็จแล้ว ✅
                            </button>
                          )}
                          {!isCancelled && !isCompleted && (
                            <button
                              onClick={() => changeQueueStatus(q.id, 'cancelled')}
                              className={`px-2 py-1 rounded-lg text-xs transition-colors btn-tactile ${
                                isDark ? 'bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400' : 'bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600'
                              }`}
                            >
                              ยกเลิก
                            </button>
                          )}
                        </div>

                        {/* Open in POS Button & Delete */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startPosFromQueue(q)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all btn-tactile"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>เปิดบิลคิดเงิน POS 💵</span>
                          </button>

                          <button
                            onClick={() => handleDeleteQueue(q)}
                            className={`p-1.5 rounded-lg transition-colors btn-tactile ${
                              isDark ? 'bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400' : 'bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600'
                            }`}
                            title="ลบคิว"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SUBTAB: BARBER LEAVE / BLOCK SLOT */}
      {subTab === 'leave' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form to block time/leave (5 cols) */}
          <div className={`lg:col-span-5 ${theme.bgCard} rounded-2xl p-5 sm:p-6 space-y-4`}>
            <div className={`flex items-center gap-2 pb-3 border-b ${borderSubtle}`}>
              <UserX className="w-5 h-5 text-rose-500" />
              <h3 className={`text-base font-bold ${headingText}`}>
                บันทึกการปิดคิว / ลางานของช่าง
              </h3>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
                  เลือกช่างที่ต้องการปิดคิว/ลางาน
                </label>
                <select
                  value={leaveBarberId}
                  onChange={(e) => setLeaveBarberId(e.target.value)}
                  className={inputClass}
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.avatar ? `${b.avatar} ` : ''}{b.nickname}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time Picker for Leave */}
              <div className={`space-y-3.5 p-4 rounded-2xl border ${
                isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50/90 border-slate-200'
              }`}>
                <ThaiDatePicker
                  value={leaveDate}
                  onChange={(newD) => {
                    setLeaveDate(newD);
                    setFilterDate(newD);
                  }}
                  label="วันที่ลา / ปิดคิว (วัน / เดือน / ปี พ.ศ.)"
                  isDark={isDark}
                />

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-dashed border-slate-200 dark:border-zinc-800">
                  <Thai24HourSelect
                    label="เวลาเริ่มปิดคิว"
                    value={leaveStartTime}
                    onChange={(val) => setLeaveStartTime(val)}
                    isDark={isDark}
                  />

                  <Thai24HourSelect
                    label="เวลาสิ้นสุด"
                    value={leaveEndTime}
                    onChange={(val) => setLeaveEndTime(val)}
                    isDark={isDark}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
                  เหตุผล / หมายเหตุ
                </label>
                <input
                  type="text"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="เช่น ลาป่วย, ธุระส่วนตัว, อบรมเทคนิคตัดผม"
                  required
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-all btn-tactile flex items-center justify-center gap-2"
              >
                <UserX className="w-4 h-4" />
                <span>บันทึกปิดคิว / บล็อกเวลา ({formatThaiTimeRange(leaveStartTime, leaveEndTime)})</span>
              </button>
            </form>
          </div>

          {/* List of blocked/leaves (7 cols) */}
          <div className={`lg:col-span-7 ${theme.bgCard} rounded-2xl p-5 sm:p-6 space-y-4`}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${borderSubtle}`}>
              <div>
                <h3 className={`text-base font-bold ${headingText}`}>
                  รายการปิดคิว & วันหยุดช่าง ({visibleQueues.length} รายการ)
                </h3>
                <p className={`text-xs ${mutedText} mt-0.5`}>
                  วันที่: <span className="font-bold text-rose-500">{formatThaiDateFull(filterDate)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  setFilterDate(todayStr);
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold btn-tactile ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                📍 วันนี้
              </button>
            </div>

            <div className="space-y-3">
              {visibleQueues.length === 0 ? (
                <div className={`py-12 text-center rounded-xl border ${
                  isDark ? 'text-zinc-500 bg-zinc-950/40 border-zinc-800/60' : 'text-slate-400 bg-slate-50 border-slate-200'
                }`}>
                  <UserX className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">ไม่มีรายการลาหรือบล็อกคิวในวันนี้</p>
                  <p className="text-xs text-slate-500 mt-1">ช่างทุกคนพร้อมให้บริการตามปกติครับ 💈</p>
                </div>
              ) : (
                visibleQueues.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-rose-500/25 bg-rose-500/10 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 font-bold text-xs">
                          {item.barberName}
                        </span>
                        <span className={`font-mono text-xs font-bold ${headingText}`}>
                          {formatThaiTimeRange(item.startTime, item.endTime)}
                        </span>
                      </div>
                      <p className={`text-xs mt-1.5 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                        เหตุผล: <strong className="text-rose-600">{item.leaveReason || item.serviceType}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => deleteQueueBooking(item.id)}
                      className={`p-2 rounded-lg transition-colors btn-tactile ${
                        isDark ? 'bg-zinc-900 hover:bg-rose-600 text-zinc-400 hover:text-white' : 'bg-white hover:bg-rose-600 hover:text-white text-slate-600 border border-slate-200'
                      }`}
                      title="ยกเลิกการปิดคิว"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

