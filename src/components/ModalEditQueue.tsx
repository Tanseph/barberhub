import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { QueueBooking, QueueStatus } from '../types';
import {
  X,
  Save,
  Clock,
  User,
  Phone,
  Scissors,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { sounds } from '../utils/sound';

interface ModalEditQueueProps {
  queue: QueueBooking | null;
  isOpen: boolean;
  onClose: () => void;
}

// 24-Hour Time slots with :00 and :30
const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 23; h++) {
  const hh = String(h).padStart(2, '0');
  TIME_OPTIONS.push(`${hh}:00`);
  TIME_OPTIONS.push(`${hh}:30`);
}
for (let h = 0; h < 6; h++) {
  const hh = String(h).padStart(2, '0');
  TIME_OPTIONS.push(`${hh}:00`);
  TIME_OPTIONS.push(`${hh}:30`);
}

const formatThaiTime = (timeStr?: string): string => {
  if (!timeStr) return '-';
  return `${timeStr.trim().replace(':', '.')} น.`;
};

const COMMON_SERVICES = [
  'บริการตัดผม/ทั่วไป',
  'ตัดผม + สระไดร์',
  'ดัดผม / ยืดวอลลุ่ม',
  'ทำสีผมแฟชั่น',
  'โกนหนวด / กันหน้า / เซ็ตผม',
  'บริการครบวงจร (Full Course)',
];

export const ModalEditQueue: React.FC<ModalEditQueueProps> = ({
  queue,
  isOpen,
  onClose,
}) => {
  const { barbers, updateQueueBooking, settings, theme, showToast } = useApp();
  const isDark = theme.isDark ?? false;

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [barberId, setBarberId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:30');
  const [serviceType, setServiceType] = useState('บริการตัดผม/ทั่วไป');
  const [status, setStatus] = useState<QueueStatus>('waiting');
  const [notes, setNotes] = useState('');

  // Sync state when queue changes
  useEffect(() => {
    if (queue) {
      setCustomerName(queue.customerName || '');
      setCustomerPhone(queue.customerPhone === '-' ? '' : queue.customerPhone || '');
      setBarberId(queue.barberId || (barbers[0]?.id || ''));
      setDate(queue.date || '');
      setStartTime(queue.startTime || '10:00');
      setEndTime(queue.endTime || '10:30');
      setServiceType(queue.serviceType || 'บริการตัดผม/ทั่วไป');
      setStatus(queue.status || 'waiting');
      setNotes(queue.notes || '');
    }
  }, [queue, isOpen, barbers]);

  if (!isOpen || !queue) return null;

  // Auto-calculate end time when start time changes
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    try {
      const [h, m] = newStart.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const duration = settings.queueSlotDuration || 30;
        const totalMinutes = h * 60 + m + duration;
        const endH = Math.floor(totalMinutes / 60) % 24;
        const endM = totalMinutes % 60;
        const cleanM = endM >= 30 ? 30 : 0;
        setEndTime(`${String(endH).padStart(2, '0')}:${String(cleanM).padStart(2, '0')}`);
      }
    } catch {
      // ignore
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showToast('กรุณาระบุชื่อลูกค้า', 'ข้อมูลชื่อลูกค้าจำเป็นสำหรับการจองคิว', 'warning');
      return;
    }

    const selectedBarber = barbers.find((b) => b.id === barberId);
    const barberName = selectedBarber ? (selectedBarber.nickname || selectedBarber.name) : queue.barberName;

    updateQueueBooking(queue.id, {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || '-',
      barberId,
      barberName,
      date,
      startTime,
      endTime,
      serviceType: serviceType.trim() || 'บริการตัดผม/ทั่วไป',
      status,
      notes: notes.trim(),
    });

    sounds.playSuccess();
    showToast(
      'อัปเดตข้อมูลคิวสำเร็จ 💈',
      `คิว ${queue.queueNumber} คุณ ${customerName.trim()} (${formatThaiTime(startTime)} - ${formatThaiTime(endTime)})`,
      'success'
    );
    onClose();
  };

  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';
  const inputClass = `w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-colors focus:outline-none ${
    isDark
      ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-amber-500'
      : 'bg-white border-slate-200 text-slate-900 focus:border-slate-800 shadow-2xs'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 sm:px-5 py-3.5 border-b flex items-center justify-between ${
            isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-900 text-white'
              }`}
            >
              {queue.queueNumber}
            </span>
            <div>
              <h3 className={`text-sm sm:text-base font-bold ${headingText}`}>
                แก้ไขข้อมูลคิวจอง
              </h3>
              <p className={`text-[11px] ${mutedText}`}>
                สร้างเมื่อ {new Date(queue.createdAt).toLocaleDateString('th-TH')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold ${mutedText} mb-1 flex items-center gap-1`}>
                <User className="w-3.5 h-3.5 text-amber-500" />
                <span>ชื่อลูกค้า <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="ระบุชื่อลูกค้า"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold ${mutedText} mb-1 flex items-center gap-1`}>
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                <span>เบอร์โทรศัพท์</span>
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="เช่น 081-234-5678 (ไม่บังคับ)"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          {/* Barber Selection */}
          <div>
            <label className={`block text-xs font-semibold ${mutedText} mb-1 flex items-center gap-1`}>
              <Scissors className="w-3.5 h-3.5 text-amber-500" />
              <span>ช่างประจำคิว <span className="text-rose-500">*</span></span>
            </label>
            <select
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className={inputClass}
              required
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.avatar ? `${b.avatar} ` : ''}{b.nickname} ({b.name})
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time (Real-time Thai 24h) */}
          <div className={`p-3 rounded-xl border space-y-3 ${
            isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-slate-50/70 border-slate-200'
          }`}>
            <div>
              <label className={`block text-xs font-semibold ${mutedText} mb-1 flex items-center gap-1`}>
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>วันที่จองคิว</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className={`${inputClass} font-mono font-bold`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-semibold ${mutedText} mb-1 flex items-center gap-1`}>
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>เวลาเริ่ม ({formatThaiTime(startTime)})</span>
                </label>
                <select
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className={`${inputClass} font-mono font-bold`}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {formatThaiTime(t)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold ${mutedText} mb-1 flex items-center gap-1`}>
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>เวลาสิ้นสุด ({formatThaiTime(endTime)})</span>
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`${inputClass} font-mono font-bold`}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {formatThaiTime(t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Service Type */}
          <div>
            <label className={`block text-xs font-semibold ${mutedText} mb-1`}>
              ประเภทบริการ
            </label>
            <input
              type="text"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              placeholder="เช่น บริการตัดผม/ทั่วไป"
              className={inputClass}
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {COMMON_SERVICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setServiceType(s)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                    serviceType === s
                      ? isDark
                        ? 'bg-amber-500 text-zinc-950 font-bold'
                        : 'bg-slate-900 text-white font-bold'
                      : isDark
                      ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
              สถานะคิว
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'waiting', label: '🕒 รอตัด', color: 'border-amber-500 bg-amber-500/15 text-amber-500' },
                { id: 'in_progress', label: '✂️ กำลังตัด', color: 'border-sky-500 bg-sky-500/15 text-sky-500' },
                { id: 'completed', label: '✅ เสร็จสิ้น', color: 'border-emerald-500 bg-emerald-500/15 text-emerald-500' },
                { id: 'cancelled', label: '❌ ยกเลิก', color: 'border-rose-500 bg-rose-500/15 text-rose-500' },
              ].map((st) => {
                const isSel = status === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatus(st.id as QueueStatus)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                      isSel
                        ? `${st.color} font-bold shadow-xs ring-1 ring-offset-0`
                        : isDark
                        ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-xs font-semibold ${mutedText} mb-1 flex items-center gap-1`}>
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span>หมายเหตุเพิ่มเติม</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น ลูกค้าขอช่างคนเดิม, สระก่อนตัด, รีบไปธุระ"
              className={inputClass}
            />
          </div>

          {/* Action Footer */}
          <div className={`pt-3 border-t flex items-center justify-end gap-2.5 ${
            isDark ? 'border-zinc-800' : 'border-slate-100'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all flex items-center gap-1.5 btn-tactile"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการแก้ไข</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
