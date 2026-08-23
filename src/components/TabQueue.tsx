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

  const isDark = theme.isDark ?? true;

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
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Calculate end time helper based on slot duration minutes
  const calculateEndTime = (start: string, durationMinutes: number = settings.queueSlotDuration || 45): string => {
    try {
      const [h, m] = start.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return '10:45';
      const totalMinutes = h * 60 + m + (durationMinutes || 45);
      const endH = Math.floor(totalMinutes / 60) % 24;
      const endM = totalMinutes % 60;
      return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    } catch {
      return '10:45';
    }
  };

  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>(() => calculateEndTime('10:00', settings.queueSlotDuration || 45));
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Keep end time synced when slot duration setting changes
  useEffect(() => {
    if (startTime) {
      setEndTime(calculateEndTime(startTime, settings.queueSlotDuration || 45));
    }
  }, [settings.queueSlotDuration]);

  // Form State for Barber Leave / Blocked Slot
  const [leaveBarberId, setLeaveBarberId] = useState<string>(
    barbers[0]?.id || ''
  );
  const [leaveDate, setLeaveDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [leaveStartTime, setLeaveStartTime] = useState<string>('09:00');
  const [leaveEndTime, setLeaveEndTime] = useState<string>('19:00');
  const [leaveReason, setLeaveReason] = useState<string>('ลาพักร้อนประจำสัปดาห์');

  // Filter in Queue list
  const [filterDate, setFilterDate] = useState<string>(bookingDate);
  const [filterBarber, setFilterBarber] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Helper to calculate end time when start time changes based on queueSlotDuration
  const handleStartTimeChange = (start: string) => {
    setStartTime(start);
    const calculated = calculateEndTime(start, settings.queueSlotDuration || 45);
    setEndTime(calculated);
  };

  // Submit Queue Booking
  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const barberObj = barbers.find((b) => b.id === selectedBarberId) || barbers[0];

    addQueueBooking({
      barberId: selectedBarberId,
      barberName: barberObj ? barberObj.name : 'ช่างประจำร้าน',
      date: bookingDate,
      startTime,
      endTime,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || '-',
      serviceType: 'บริการตัดผม/ทั่วไป',
      notes: notes.trim() || undefined,
      status: 'waiting',
      isLeaveOrBlocked: false,
    });

    // Reset customer fields
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');

    // Advance start time by slot duration
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
      message: `คุณกำลังจะลบคิว ${queue.queueNumber} ของคุณ ${queue.customerName} (เวลา ${queue.startTime} - ${queue.endTime} น.)`,
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
                ระบบจัดการคิว & ตารางงานช่าง
              </h2>
            </div>
            <p className={`text-xs ${mutedText} mt-0.5`}>
              กำหนดเวลาจองคิวล่วงหน้า ({settings.queueSlotDuration} นาที/คิว) และบันทึกวันหยุดช่าง
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
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-600'
              }`}>
                {settings.queueSlotDuration} นาที/คิว
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
                            <p className="text-xs font-bold truncate">{b.nickname}</p>
                            <p className={`text-[10px] truncate ${isSel && !isDark ? 'text-slate-300' : mutedText}`}>
                              {b.name}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Date & Times */}
              <div className={`space-y-3 p-3.5 rounded-xl border ${
                isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <label className={`block text-xs font-semibold ${mutedText} mb-1`}>
                    วันที่จอง
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => {
                      setBookingDate(e.target.value);
                      setFilterDate(e.target.value);
                    }}
                    required
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`block text-[11px] font-semibold ${mutedText} mb-1`}>
                      เวลาเริ่มคิว
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      required
                      className={`${inputClass} font-mono font-bold text-emerald-600`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold ${mutedText} mb-1`}>
                      เวลาสิ้นสุด (อัตโนมัติ)
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className={`${inputClass} font-mono`}
                    />
                  </div>
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
                    placeholder="กรุณาระบุเบอร์โทรศัพท์ลูกค้า"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-xs font-semibold ${mutedText} mb-1`}>
                  หมายเหตุเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น มากับเพื่อน, ขอผ้าเย็น, ตรงเวลา"
                  className={inputClass}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${theme.primary} btn-tactile shadow-md`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกการจองคิว 💈</span>
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
                  วันที่: <span className={`font-mono font-semibold ${headingText}`}>{filterDate}</span>
                </p>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />

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
                        {/* Time & Queue Number */}
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                            isDark ? 'bg-zinc-900 border border-zinc-700 text-amber-400' : 'bg-slate-900 text-white'
                          }`}>
                            {q.queueNumber}
                          </span>
                          <span className={`font-mono text-sm font-bold ${headingText} flex items-center gap-1`}>
                            <Clock className={`w-3.5 h-3.5 ${mutedText}`} />
                            <span>{q.startTime} - {q.endTime} น.</span>
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
                      {b.nickname} - {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
                  วันที่ลา / ปิดคิว
                </label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => {
                    setLeaveDate(e.target.value);
                    setFilterDate(e.target.value);
                  }}
                  required
                  className={`${inputClass} font-mono`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
                    ตั้งแต่เวลา
                  </label>
                  <input
                    type="time"
                    value={leaveStartTime}
                    onChange={(e) => setLeaveStartTime(e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
                    ถึงเวลา
                  </label>
                  <input
                    type="time"
                    value={leaveEndTime}
                    onChange={(e) => setLeaveEndTime(e.target.value)}
                    className={`${inputClass} font-mono`}
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
                <span>บันทึกปิดคิว / บล็อกเวลา</span>
              </button>
            </form>
          </div>

          {/* List of blocked/leaves (7 cols) */}
          <div className={`lg:col-span-7 ${theme.bgCard} rounded-2xl p-5 sm:p-6 space-y-4`}>
            <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle}`}>
              <h3 className={`text-base font-bold ${headingText}`}>
                รายการปิดคิว & วันหยุดช่าง ({visibleQueues.length} รายการ)
              </h3>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
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
                        <span className={`font-mono text-xs ${headingText}`}>
                          {item.startTime} - {item.endTime} น.
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
