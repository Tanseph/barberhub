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
  Pencil,
  Search,
  Scissors,
  X,
  LayoutGrid,
  ListFilter,
} from 'lucide-react';
import { sounds } from '../utils/sound';
import { ModalEditQueue } from './ModalEditQueue';

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

// Helper: Format YYYY-MM-DD to full Thai Date with day of week (e.g. "วันอังคารที่ 1 กันยายน 2569")
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

// Real-time Date Picker Component: Fast, intuitive, real-time synchronized with easy single-click change
const RealtimeDatePicker: React.FC<{
  value: string; // "YYYY-MM-DD"
  onChange: (val: string) => void;
  label?: string;
  isDark?: boolean;
}> = ({ value, onChange, label, isDark }) => {
  const todayStr = getTodayDateStr();
  const tomorrowStr = getTomorrowDateStr();
  const isToday = value === todayStr;
  const isTomorrow = value === tomorrowStr;

  return (
    <div className="space-y-2.5">
      {/* Header with status badge */}
      <div className="flex items-center justify-between">
        <label className={`text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'} flex items-center gap-1.5`}>
          <Calendar className="w-4 h-4 text-amber-600" />
          <span>{label || 'วันที่จอง'}</span>
        </label>
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
            isToday
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : isTomorrow
              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
              : isDark
              ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />}
          <span>{isToday ? '🔴 วันนี้ (Real-time)' : isTomorrow ? '🗓️ พรุ่งนี้' : formatThaiDateShort(value)}</span>
        </span>
      </div>

      {/* Main Date Input with Prev/Next Steppers */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={value <= todayStr}
          onClick={() => {
            const prev = shiftDateStr(value, -1);
            if (prev >= todayStr) {
              sounds.playClick();
              onChange(prev);
            }
          }}
          title={value <= todayStr ? 'ไม่สามารถเลือกวันที่ผ่านมาได้ (ระบบเคลียร์คิวที่พ้นวันแล้ว)' : 'วันก่อนหน้า (-1 วัน)'}
          className={`px-2.5 py-2.5 rounded-xl border text-xs font-bold transition-all btn-tactile ${
            value <= todayStr
              ? 'opacity-30 cursor-not-allowed border-transparent text-slate-400 dark:text-zinc-600'
              : isDark
              ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-2xs'
          }`}
        >
          ◀
        </button>

        <div className="relative flex-1">
          <input
            type="date"
            min={todayStr}
            value={value}
            onChange={(e) => {
              if (e.target.value) {
                sounds.playClick();
                onChange(e.target.value);
              }
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-mono border focus:outline-none transition-all ${
              isDark
                ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-amber-500'
                : 'bg-white border-slate-200 text-slate-900 focus:border-slate-800 shadow-2xs'
            }`}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onChange(shiftDateStr(value, 1));
          }}
          title="วันถัดไป (+1 วัน)"
          className={`px-2.5 py-2.5 rounded-xl border text-xs font-bold transition-all btn-tactile ${
            isDark
              ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-2xs'
          }`}
        >
          ▶
        </button>
      </div>

      {/* Quick Jump Buttons: วันนี้ / พรุ่งนี้ */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onChange(todayStr);
          }}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all btn-tactile flex items-center justify-center gap-1.5 border ${
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

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onChange(tomorrowStr);
          }}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all btn-tactile flex items-center justify-center gap-1.5 border ${
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
      </div>

      {/* Full localized Thai Date label */}
      <div
        className={`p-2.5 rounded-xl border flex items-center gap-2 ${
          isDark ? 'bg-zinc-900/50 border-zinc-800/80 text-zinc-300' : 'bg-slate-100/70 border-slate-200 text-slate-700'
        }`}
      >
        <CalendarDays className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-xs font-bold truncate">
          {formatThaiDateWithWeekday(value)}
        </span>
      </div>
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
    clearPastQueues,
    syncAutoQueueStatuses,
    startPosFromQueue,
    settings,
    theme,
    openConfirm,
  } = useApp();

  const isDark = theme.isDark ?? false;

  // Real-time synchronization of queue statuses according to current time
  useEffect(() => {
    syncAutoQueueStatuses();
    const interval = setInterval(() => {
      syncAutoQueueStatuses();
    }, 5000);
    return () => clearInterval(interval);
  }, [syncAutoQueueStatuses]);

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [queueViewMode, setQueueViewMode] = useState<'boxes' | 'list'>('boxes');
  const [editingQueue, setEditingQueue] = useState<QueueBooking | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Automatically clear past queues when mounting TabQueue
  useEffect(() => {
    clearPastQueues();
  }, [clearPastQueues]);

  // Keep filterDate strictly on or after today (past queues are purged from the system)
  useEffect(() => {
    const todayStr = getTodayDateStr();
    if (filterDate !== 'all' && filterDate < todayStr) {
      setFilterDate(todayStr);
    }
  }, [filterDate]);

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
    const query = searchQuery.trim().toLowerCase();
    return queues
      .filter((q) => {
        if (subTab === 'leave') {
          return q.isLeaveOrBlocked && (filterDate === 'all' || q.date === filterDate);
        }
        const matchDate = filterDate === 'all' || q.date === filterDate;
        const matchBarber = filterBarber === 'all' || q.barberId === filterBarber;
        const matchStatus = filterStatus === 'all' || q.status === filterStatus;
        const matchSearch =
          !query ||
          q.customerName.toLowerCase().includes(query) ||
          (q.customerPhone && q.customerPhone.includes(query)) ||
          q.queueNumber.toLowerCase().includes(query) ||
          q.barberName.toLowerCase().includes(query);
        return matchDate && matchBarber && matchStatus && matchSearch && !q.isLeaveOrBlocked;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [queues, subTab, filterDate, filterBarber, filterStatus, searchQuery]);

  // Statistics for selected date
  const queueStats = useMemo(() => {
    const dayQueues = queues.filter(
      (q) => !q.isLeaveOrBlocked && (filterDate === 'all' || q.date === filterDate)
    );
    return {
      total: dayQueues.length,
      waiting: dayQueues.filter((q) => q.status === 'waiting').length,
      inProgress: dayQueues.filter((q) => q.status === 'in_progress').length,
      completed: dayQueues.filter((q) => q.status === 'completed').length,
      cancelled: dayQueues.filter((q) => q.status === 'cancelled').length,
    };
  }, [queues, filterDate]);

  // Group queues by barber for Barber Boxes view
  const barberQueueGroups = useMemo(() => {
    const targetBarbers = filterBarber === 'all'
      ? barbers.filter((b) => b.active)
      : barbers.filter((b) => b.id === filterBarber);

    const groups = targetBarbers.map((b) => {
      const bQueues = visibleQueues.filter((q) => q.barberId === b.id);
      const waiting = bQueues.filter((q) => q.status === 'waiting').length;
      const inProgress = bQueues.filter((q) => q.status === 'in_progress').length;
      const completed = bQueues.filter((q) => q.status === 'completed').length;
      const cancelled = bQueues.filter((q) => q.status === 'cancelled').length;

      return {
        barber: b,
        queues: bQueues,
        stats: {
          total: bQueues.length,
          waiting,
          inProgress,
          completed,
          cancelled,
        },
      };
    });

    // If viewing all barbers, check if there are queues unassigned or with non-active/deleted barbers
    if (filterBarber === 'all') {
      const knownBarberIds = new Set(targetBarbers.map((b) => b.id));
      const otherQueues = visibleQueues.filter((q) => !knownBarberIds.has(q.barberId));
      if (otherQueues.length > 0) {
        groups.push({
          barber: {
            id: 'unassigned',
            name: 'ไม่ระบุช่าง / ช่างทั่วไป',
            nickname: 'ช่างทั่วไป',
            avatar: '💈',
            color: '#64748b',
            haircutCommissionRate: 50,
            chemicalCommissionRate: 50,
            productCommissionRate: 10,
            tipRate: 100,
            active: true,
          },
          queues: otherQueues,
          stats: {
            total: otherQueues.length,
            waiting: otherQueues.filter((q) => q.status === 'waiting').length,
            inProgress: otherQueues.filter((q) => q.status === 'in_progress').length,
            completed: otherQueues.filter((q) => q.status === 'completed').length,
            cancelled: otherQueues.filter((q) => q.status === 'cancelled').length,
          },
        });
      }
    }

    return groups;
  }, [barbers, visibleQueues, filterBarber]);

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

  // Render individual queue item card
  const renderQueueCard = (q: QueueBooking, showBarberTag: boolean = true) => {
    const isCompleted = q.status === 'completed';
    const isInProgress = q.status === 'in_progress';
    const isWaiting = q.status === 'waiting';
    const isCancelled = q.status === 'cancelled';

    return (
      <div
        key={q.id}
        className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-150 ${
          isInProgress
            ? isDark
              ? 'border-l-4 border-l-sky-500 border-zinc-800 bg-sky-500/10 shadow-xs'
              : 'border-l-4 border-l-sky-500 border-slate-200 bg-sky-50/80 shadow-xs'
            : isWaiting
            ? isDark
              ? 'border-l-4 border-l-amber-500 border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
              : 'border-l-4 border-l-amber-500 border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
            : isCompleted
            ? isDark
              ? 'border-l-4 border-l-emerald-500/60 border-zinc-800/80 bg-zinc-950/40 opacity-75'
              : 'border-l-4 border-l-emerald-500/60 border-slate-200 bg-slate-50/70 opacity-80'
            : isDark
            ? 'border-l-4 border-l-rose-500/60 border-zinc-800/60 bg-zinc-950/30 opacity-60'
            : 'border-l-4 border-l-rose-500/60 border-slate-200 bg-slate-50/50 opacity-60'
        }`}
      >
        {/* Top Row: Q-Number, Time Range, Customer, Phone, Barber, Status */}
        <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5">
          {/* Left Group */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span
              className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs shrink-0 ${
                isDark ? 'bg-zinc-800 text-amber-400 border border-zinc-700' : 'bg-slate-900 text-white'
              }`}
            >
              {q.queueNumber}
            </span>

            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{formatThaiTimeRange(q.startTime, q.endTime)}</span>
            </span>

            <span className={`font-bold text-xs sm:text-sm ${headingText} truncate max-w-[130px] sm:max-w-[180px]`}>
              {q.customerName}
            </span>

            {q.customerPhone && q.customerPhone !== '-' && (
              <span
                className={`text-[11px] font-mono ${mutedText} flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                  isDark ? 'bg-zinc-900' : 'bg-slate-100'
                }`}
              >
                <Phone className="w-2.5 h-2.5 text-slate-400" />
                <span>{q.customerPhone}</span>
              </span>
            )}
          </div>

          {/* Right Group: Barber & Status */}
          <div className="flex items-center gap-1.5 shrink-0">
            {showBarberTag && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <Scissors className="w-2.5 h-2.5 text-amber-500" />
                <span>{q.barberName}</span>
              </span>
            )}

            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                isWaiting
                  ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                  : isInProgress
                  ? 'bg-sky-500/15 text-sky-600 border border-sky-500/30 animate-pulse'
                  : isCompleted
                  ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
              }`}
            >
              {isWaiting && '🕒 รอตัด'}
              {isInProgress && '✂️ กำลังตัด'}
              {isCompleted && '✅ เสร็จแล้ว'}
              {isCancelled && '❌ ยกเลิก'}
            </span>
          </div>
        </div>

        {/* Bottom Row: Service Info, Notes & Action Buttons */}
        <div
          className={`mt-2 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
            isDark ? 'border-zinc-800/80' : 'border-slate-100'
          }`}
        >
          {/* Service & Notes */}
          <div className="flex items-center gap-2 text-[11px] min-w-0 flex-1">
            <span className={`${mutedText} truncate`}>{q.serviceType}</span>
            {q.notes && (
              <span
                className={`italic truncate max-w-[170px] px-1.5 py-0.5 rounded ${
                  isDark ? 'text-amber-400/90 bg-amber-500/10' : 'text-amber-700 bg-amber-50'
                }`}
                title={q.notes}
              >
                📝 {q.notes}
              </span>
            )}
          </div>

          {/* Actions Group */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isWaiting && (
              <button
                type="button"
                onClick={() => changeQueueStatus(q.id, 'in_progress')}
                className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500 hover:text-white text-sky-600 text-[11px] font-bold transition-colors btn-tactile"
                title="เริ่มตัดผม"
              >
                เริ่มตัด ✂️
              </button>
            )}
            {isInProgress && (
              <button
                type="button"
                onClick={() => changeQueueStatus(q.id, 'completed')}
                className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 hover:text-white text-emerald-600 text-[11px] font-bold transition-colors btn-tactile"
                title="ตัดผมเสร็จสิ้น"
              >
                เสร็จแล้ว ✅
              </button>
            )}

            {/* Open in POS Button */}
            <button
              type="button"
              onClick={() => startPosFromQueue(q)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-2xs transition-all btn-tactile"
              title="เปิดบิลคิดเงินที่ POS"
            >
              <Receipt className="w-3 h-3" />
              <span>คิดเงิน POS</span>
            </button>

            {/* Edit Queue Button */}
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setEditingQueue(q);
                setIsEditModalOpen(true);
              }}
              className={`p-1.5 rounded-lg border text-[11px] transition-colors btn-tactile ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300 hover:text-white'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-2xs'
              }`}
              title="แก้ไขข้อมูลคิวนี้"
            >
              <Pencil className="w-3 h-3" />
            </button>

            {/* Delete Queue Button */}
            <button
              type="button"
              onClick={() => handleDeleteQueue(q)}
              className={`p-1.5 rounded-lg border text-[11px] transition-colors btn-tactile ${
                isDark
                  ? 'bg-zinc-800 hover:bg-rose-500/20 border-zinc-700 text-zinc-400 hover:text-rose-400'
                  : 'bg-white hover:bg-rose-50 border-slate-200 text-slate-400 hover:text-rose-600 shadow-2xs'
              }`}
              title="ยกเลิก/ลบคิว"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

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
          <div id="queue-booking-form" className={`lg:col-span-5 xl:col-span-5 ${theme.bgCard} rounded-2xl p-5 sm:p-6 space-y-4`}>
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
                {/* วันที่จอง */}
                <RealtimeDatePicker
                  value={bookingDate}
                  onChange={(newD) => {
                    setBookingDate(newD);
                    setFilterDate(newD);
                  }}
                  label="วันที่จอง"
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
            <div className={`space-y-3 pb-3 border-b ${borderSubtle}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className={`text-base font-bold ${headingText} flex items-center gap-2 flex-wrap`}>
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>ตารางรายการจองคิว ({visibleQueues.length} คิว)</span>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      title="เมื่อพ้นวัน ระบบจะล้างข้อมูลคิวของวันที่ผ่านมาออกให้หมดโดยอัตโนมัติ ไม่ตกค้างในระบบ"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      เคลียร์คิวพ้นวันอัตโนมัติ
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                      title="สถานะคิวเปลี่ยนตามเวลาจริงอัตโนมัติ: ยังไม่ถึงเวลา = รอตัด, ถึงเวลา = กำลังตัด, หมดเวลา = เสร็จแล้ว"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                      สถานะอัตโนมัติตามเวลา
                    </span>
                  </h3>
                  <p className={`text-xs ${mutedText} mt-0.5`}>
                    วันที่: <span className="font-bold text-amber-600">{formatThaiDateFull(filterDate)}</span>
                  </p>
                </div>

                {/* View Mode Switcher & Quick Status Stats Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-wrap">
                  {/* View Mode Toggle: Barber Boxes vs List */}
                  <div className={`flex items-center rounded-xl p-0.5 border shrink-0 ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setQueueViewMode('boxes');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all btn-tactile ${
                        queueViewMode === 'boxes'
                          ? isDark
                            ? 'bg-amber-500 text-zinc-950 shadow-md'
                            : 'bg-white text-slate-900 shadow-xs'
                          : isDark
                          ? 'text-zinc-400 hover:text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="แยก Box รายช่าง: แสดงคิวแยกกล่องเป็นคนๆ เพื่อดูง่ายๆ ว่าช่างคนนี้มีกี่คิว"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>แยก Box รายช่าง</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setQueueViewMode('list');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all btn-tactile ${
                        queueViewMode === 'list'
                          ? isDark
                            ? 'bg-amber-500 text-zinc-950 shadow-md'
                            : 'bg-white text-slate-900 shadow-xs'
                          : isDark
                          ? 'text-zinc-400 hover:text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="รายการรวม: ดูรายการคิวทั้งหมดเรียงตามลำดับเวลา"
                    >
                      <ListFilter className="w-3.5 h-3.5" />
                      <span>รายการรวม</span>
                    </button>
                  </div>

                  {/* Quick Status Stats Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      ทั้งหมด: <strong>{queueStats.total}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-amber-500/10 border-amber-500/20 text-amber-600">
                      รอตัด: <strong>{queueStats.waiting}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-sky-500/10 border-sky-500/20 text-sky-600">
                      กำลังตัด: <strong>{queueStats.inProgress}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-emerald-500/10 border-emerald-500/20 text-emerald-600">
                      เสร็จแล้ว: <strong>{queueStats.completed}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter controls & Search */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Date Controls */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={filterDate !== 'all' && filterDate <= getTodayDateStr()}
                      onClick={() => {
                        const current = filterDate === 'all' ? getTodayDateStr() : filterDate;
                        const prev = shiftDateStr(current, -1);
                        if (prev >= getTodayDateStr()) {
                          sounds.playClick();
                          setFilterDate(prev);
                        }
                      }}
                      title={filterDate !== 'all' && filterDate <= getTodayDateStr() ? 'ไม่สามารถดูคิวย้อนหลังได้ (ระบบเคลียร์คิวที่พ้นวันออกแล้ว)' : 'วันก่อนหน้า'}
                      className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition-all btn-tactile ${
                        filterDate !== 'all' && filterDate <= getTodayDateStr()
                          ? 'opacity-30 cursor-not-allowed border-transparent text-slate-400 dark:text-zinc-600'
                          : isDark
                          ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      ◀
                    </button>

                    <input
                      type="date"
                      min={getTodayDateStr()}
                      value={filterDate === 'all' ? '' : filterDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          sounds.playClick();
                          setFilterDate(e.target.value);
                        }
                      }}
                      className={`px-2 py-1 rounded-lg border text-xs font-mono font-bold focus:outline-none ${
                        isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        const current = filterDate === 'all' ? getTodayDateStr() : filterDate;
                        setFilterDate(shiftDateStr(current, 1));
                      }}
                      title="วันถัดไป"
                      className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition-all btn-tactile ${
                        isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      ▶
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setFilterDate(getTodayDateStr());
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold btn-tactile ${
                      filterDate === getTodayDateStr()
                        ? isDark
                          ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                          : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : isDark
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    📍 วันนี้
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setFilterDate(getTomorrowDateStr());
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold btn-tactile ${
                      filterDate === getTomorrowDateStr()
                        ? isDark
                          ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                          : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : isDark
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    🗓️ พรุ่งนี้
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setFilterDate('all');
                    }}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-bold btn-tactile ${
                      filterDate === 'all'
                        ? isDark
                          ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                          : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : isDark
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ทุกวัน
                  </button>
                </div>

                {/* Dropdowns & Search */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={filterBarber}
                    onChange={(e) => setFilterBarber(e.target.value)}
                    className={`px-2 py-1.5 rounded-lg border text-xs focus:outline-none ${
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
                    className={`px-2 py-1.5 rounded-lg border text-xs focus:outline-none ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="all">ทุกสถานะ</option>
                    <option value="waiting">🕒 รอตัด</option>
                    <option value="in_progress">✂️ กำลังตัด</option>
                    <option value="completed">✅ เสร็จแล้ว</option>
                    <option value="cancelled">❌ ยกเลิก</option>
                  </select>

                  {/* Search input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อ/เบอร์..."
                      className={`w-32 sm:w-36 pl-7 pr-6 py-1.5 rounded-lg border text-xs focus:outline-none ${
                        isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Queue Content: Barber Boxes View or Compact List View */}
            {visibleQueues.length === 0 && (!barberQueueGroups.some((g) => g.queues.length > 0)) ? (
              <div className={`py-12 text-center rounded-xl border ${
                isDark ? 'text-zinc-500 bg-zinc-950/40 border-zinc-800/60' : 'text-slate-400 bg-slate-50 border-slate-200'
              }`}>
                <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">ยังไม่มีรายการจองคิวในวันที่เลือก</p>
                <p className="text-xs text-slate-500 mt-1">สามารถสร้างคิวใหม่ได้จากแบบฟอร์มด้านซ้าย</p>
              </div>
            ) : queueViewMode === 'boxes' ? (
              /* Barber Boxes View */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[72vh] overflow-y-auto pr-1">
                {barberQueueGroups.map((group) => {
                  return (
                    <div
                      key={group.barber.id}
                      className={`rounded-2xl border transition-all ${
                        isDark
                          ? 'bg-zinc-900/90 border-zinc-800 shadow-sm'
                          : 'bg-white border-slate-200 shadow-xs'
                      } flex flex-col overflow-hidden`}
                    >
                      {/* Barber Box Header */}
                      <div
                        className={`p-3.5 border-b flex items-center justify-between gap-2.5 ${
                          isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50/90 border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-xs"
                            style={{ backgroundColor: group.barber.color || '#d97706' }}
                          >
                            {group.barber.avatar && group.barber.avatar.length <= 4 ? (
                              <span className="text-base">{group.barber.avatar}</span>
                            ) : (
                              <span>{group.barber.nickname ? group.barber.nickname.slice(0, 2) : group.barber.name.slice(0, 2)}</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className={`text-sm font-bold ${headingText} truncate`}>
                                {group.barber.name}
                              </h4>
                              {group.barber.nickname && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                  ({group.barber.nickname})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-semibold text-slate-500 flex-wrap">
                              <span className="text-amber-600">รอตัด: {group.stats.waiting}</span>
                              <span>•</span>
                              <span className="text-sky-600">กำลังตัด: {group.stats.inProgress}</span>
                              <span>•</span>
                              <span className="text-emerald-600">เสร็จแล้ว: {group.stats.completed}</span>
                            </div>
                          </div>
                        </div>

                        {/* Queue Count & Quick Action */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border flex items-center gap-1 ${
                              group.stats.total > 0
                                ? isDark
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                                : isDark
                                ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            <Scissors className="w-3 h-3 text-amber-500" />
                            <span>{group.stats.total} คิว</span>
                          </span>

                          {group.barber.id !== 'unassigned' && (
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                setSelectedBarberId(group.barber.id);
                                const el = document.getElementById('queue-booking-form');
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition-all btn-tactile ${
                                isDark
                                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-2xs'
                              }`}
                              title={`จองคิวให้ช่าง ${group.barber.nickname || group.barber.name}`}
                            >
                              <Plus className="w-3.5 h-3.5 text-amber-500" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Queue List in this Barber's Box */}
                      <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[460px]">
                        {group.queues.length === 0 ? (
                          <div className={`py-6 px-3 text-center rounded-xl border border-dashed ${
                            isDark ? 'border-zinc-800 text-zinc-500 bg-zinc-950/20' : 'border-slate-200 text-slate-400 bg-slate-50/50'
                          }`}>
                            <p className="text-xs">ยังไม่มีคิวจองสำหรับช่าง{group.barber.nickname || group.barber.name}ในวันที่เลือก</p>
                            {group.barber.id !== 'unassigned' && (
                              <button
                                type="button"
                                onClick={() => {
                                  sounds.playClick();
                                  setSelectedBarberId(group.barber.id);
                                  const el = document.getElementById('queue-booking-form');
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                className="mt-2 text-[11px] font-bold text-amber-600 hover:text-amber-500 inline-flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>คลิกเพื่อลงคิวให้ช่างนี้</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          group.queues.map((q) => renderQueueCard(q, false))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Flat Compact List View */
              <div className="space-y-2 max-h-[72vh] overflow-y-auto pr-1">
                {visibleQueues.map((q) => renderQueueCard(q, true))}
              </div>
            )}
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
                <RealtimeDatePicker
                  value={leaveDate}
                  onChange={(newD) => {
                    setLeaveDate(newD);
                    setFilterDate(newD);
                  }}
                  label="วันที่ลา / ปิดคิว"
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
                  วันที่: <span className="font-bold text-rose-500">{formatThaiDateWithWeekday(filterDate)}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={filterDate !== 'all' && filterDate <= getTodayDateStr()}
                    onClick={() => {
                      const current = filterDate === 'all' ? getTodayDateStr() : filterDate;
                      const prev = shiftDateStr(current, -1);
                      if (prev >= getTodayDateStr()) {
                        sounds.playClick();
                        setFilterDate(prev);
                      }
                    }}
                    title={filterDate !== 'all' && filterDate <= getTodayDateStr() ? 'ไม่สามารถดูคิวย้อนหลังได้ (ระบบเคลียร์คิวที่พ้นวันออกแล้ว)' : 'วันก่อนหน้า'}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition-all btn-tactile ${
                      filterDate !== 'all' && filterDate <= getTodayDateStr()
                        ? 'opacity-30 cursor-not-allowed border-transparent text-slate-400 dark:text-zinc-600'
                        : isDark
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ◀
                  </button>

                  <input
                    type="date"
                    min={getTodayDateStr()}
                    value={filterDate === 'all' ? '' : filterDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        sounds.playClick();
                        setFilterDate(e.target.value);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold focus:outline-none ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      const current = filterDate === 'all' ? getTodayDateStr() : filterDate;
                      setFilterDate(shiftDateStr(current, 1));
                    }}
                    title="วันถัดไป"
                    className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition-all btn-tactile ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ▶
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setFilterDate(getTodayDateStr());
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold btn-tactile ${
                    filterDate === getTodayDateStr()
                      ? isDark
                        ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                        : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : isDark
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  📍 วันนี้
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setFilterDate(getTomorrowDateStr());
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold btn-tactile ${
                    filterDate === getTomorrowDateStr()
                      ? isDark
                        ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                        : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : isDark
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  🗓️ พรุ่งนี้
                </button>
              </div>
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

      {/* Modal for editing a queue booking */}
      <ModalEditQueue
        queue={editingQueue}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingQueue(null);
        }}
      />
    </div>
  );
};

