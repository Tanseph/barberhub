import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Coins,
  RotateCcw,
  CheckCircle2,
  Copy,
  Calendar,
  Plus,
  Minus,
  Banknote,
  TrendingUp,
  TrendingDown,
  Calculator,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DenominationCount } from '../types';
import { sounds } from '../utils/sound';
import {
  getTodayDateStr,
  getYesterdayDateStr,
  formatThaiDateWithWeekday,
} from './RealtimeDatePicker';

interface DenomRow {
  key: keyof DenominationCount;
  value: number;
  label: string;
  shortLabel: string;
  unit: string;
  type: 'note' | 'coin';
  badgeBg: string;
  badgeText: string;
  textColor: string;
}

// 9 Denominations arranged vertically
const DENOM_LIST: DenomRow[] = [
  {
    key: 'b1000',
    value: 1000,
    label: 'ธนบัตร 1,000 บาท',
    shortLabel: 'แบงก์ 1,000',
    unit: 'ใบ',
    type: 'note',
    badgeBg: 'bg-amber-500/10 border-amber-500/30',
    badgeText: 'text-amber-500 dark:text-amber-400',
    textColor: 'text-amber-500',
  },
  {
    key: 'b500',
    value: 500,
    label: 'ธนบัตร 500 บาท',
    shortLabel: 'แบงก์ 500',
    unit: 'ใบ',
    type: 'note',
    badgeBg: 'bg-purple-500/10 border-purple-500/30',
    badgeText: 'text-purple-500 dark:text-purple-400',
    textColor: 'text-purple-500',
  },
  {
    key: 'b100',
    value: 100,
    label: 'ธนบัตร 100 บาท',
    shortLabel: 'แบงก์ 100',
    unit: 'ใบ',
    type: 'note',
    badgeBg: 'bg-rose-500/10 border-rose-500/30',
    badgeText: 'text-rose-500 dark:text-rose-400',
    textColor: 'text-rose-500',
  },
  {
    key: 'b50',
    value: 50,
    label: 'ธนบัตร 50 บาท',
    shortLabel: 'แบงก์ 50',
    unit: 'ใบ',
    type: 'note',
    badgeBg: 'bg-sky-500/10 border-sky-500/30',
    badgeText: 'text-sky-500 dark:text-sky-400',
    textColor: 'text-sky-500',
  },
  {
    key: 'b20',
    value: 20,
    label: 'ธนบัตร 20 บาท',
    shortLabel: 'แบงก์ 20',
    unit: 'ใบ',
    type: 'note',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
    badgeText: 'text-emerald-500 dark:text-emerald-400',
    textColor: 'text-emerald-500',
  },
  {
    key: 'c10',
    value: 10,
    label: 'เหรียญ 10 บาท',
    shortLabel: 'เหรียญ 10',
    unit: 'เหรียญ',
    type: 'coin',
    badgeBg: 'bg-amber-600/10 border-amber-600/30',
    badgeText: 'text-amber-600 dark:text-amber-500',
    textColor: 'text-amber-600',
  },
  {
    key: 'c5',
    value: 5,
    label: 'เหรียญ 5 บาท',
    shortLabel: 'เหรียญ 5',
    unit: 'เหรียญ',
    type: 'coin',
    badgeBg: 'bg-zinc-500/10 border-zinc-500/30',
    badgeText: 'text-zinc-400 dark:text-zinc-300',
    textColor: 'text-zinc-400',
  },
  {
    key: 'c2',
    value: 2,
    label: 'เหรียญ 2 บาท',
    shortLabel: 'เหรียญ 2',
    unit: 'เหรียญ',
    type: 'coin',
    badgeBg: 'bg-yellow-600/10 border-yellow-600/30',
    badgeText: 'text-yellow-600 dark:text-yellow-500',
    textColor: 'text-yellow-600',
  },
  {
    key: 'c1',
    value: 1,
    label: 'เหรียญ 1 บาท',
    shortLabel: 'เหรียญ 1',
    unit: 'เหรียญ',
    type: 'coin',
    badgeBg: 'bg-slate-500/10 border-slate-500/30',
    badgeText: 'text-slate-400 dark:text-slate-300',
    textColor: 'text-slate-400',
  },
];

const INITIAL_COUNTS: DenominationCount = {
  b1000: 0,
  b500: 0,
  b100: 0,
  b50: 0,
  b20: 0,
  c10: 0,
  c5: 0,
  c2: 0,
  c1: 0,
};

export const TabCashDrawer: React.FC = () => {
  const {
    bills,
    expenses,
    settings,
    theme,
    cashDrawerRecords,
    addCashDrawerRecord,
    showToast,
    currentShopId,
  } = useApp();

  const todayStr = getTodayDateStr();
  const yesterdayStr = getYesterdayDateStr();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const draftStorageKey = `barber_drawer_draft_${currentShopId || 'default'}_${selectedDate}`;

  // Denomination counts state
  const [counts, setCounts] = useState<DenominationCount>(() => {
    try {
      const saved = localStorage.getItem(`barber_drawer_draft_${currentShopId || 'default'}_${todayStr}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return INITIAL_COUNTS;
  });

  // Load draft or latest record when selectedDate or currentShopId changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setCounts(parsed);
          return;
        }
      }
      const latestRecord = cashDrawerRecords.find((r) => r.dateStr === selectedDate);
      if (latestRecord && latestRecord.denominations) {
        setCounts(latestRecord.denominations);
        return;
      }
      setCounts(INITIAL_COUNTS);
    } catch {
      setCounts(INITIAL_COUNTS);
    }
  }, [selectedDate, currentShopId, draftStorageKey, cashDrawerRecords]);

  const updateCountsAndDraft = (newCounts: DenominationCount) => {
    setCounts(newCounts);
    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(newCounts));
    } catch {}
  };

  const isDark = theme.isDark ?? true;
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';

  // Cash Bills for selected date
  const dayBills = useMemo(() => {
    return bills.filter((b) => b.dateStr === selectedDate);
  }, [bills, selectedDate]);

  const cashBills = useMemo(() => {
    return dayBills.filter((b) => {
      if (b.paymentMethod === 'cash') return true;
      if (b.paymentMethod === 'split' && (b.cashAmount || 0) > 0) return true;
      return false;
    });
  }, [dayBills]);

  // Cash sales of that day
  const cashSalesTotal = useMemo(() => {
    return cashBills.reduce((sum, b) => {
      if (b.paymentMethod === 'cash') {
        return sum + (b.cashAmount > 0 ? b.cashAmount : b.grossTotal);
      }
      if (b.paymentMethod === 'split') {
        return sum + (b.cashAmount || 0);
      }
      return sum;
    }, 0);
  }, [cashBills]);

  // Cash Expenses for selected date (if any)
  const dayExpenses = useMemo(() => {
    return expenses.filter((e) => e.dateStr === selectedDate);
  }, [expenses, selectedDate]);

  const cashExpenses = useMemo(() => {
    return dayExpenses.filter((e) => e.paymentMethod === 'cash');
  }, [dayExpenses]);

  const cashExpensesTotal = useMemo(() => {
    return cashExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [cashExpenses]);

  // Expected cash from today's cash flow: Cash Sales - Cash Expenses
  const expectedTotal = Math.max(0, cashSalesTotal - cashExpensesTotal);

  // Sum of denominations currently in drawer (คำนวณออกมาเลยจากที่ใส่)
  const actualCounted = useMemo(() => {
    return DENOM_LIST.reduce((sum, item) => sum + (counts[item.key] || 0) * item.value, 0);
  }, [counts]);

  // Total count of notes and coins
  const totalItemsCount = useMemo(() => {
    return DENOM_LIST.reduce((sum, item) => sum + (counts[item.key] || 0), 0);
  }, [counts]);

  // Notes breakdown
  const notesBreakdown = useMemo(() => {
    return DENOM_LIST.filter((d) => d.type === 'note').map((d) => {
      const qty = counts[d.key] || 0;
      return {
        ...d,
        qty,
        total: qty * d.value,
      };
    });
  }, [counts]);

  // Coins breakdown
  const coinsBreakdown = useMemo(() => {
    return DENOM_LIST.filter((d) => d.type === 'coin').map((d) => {
      const qty = counts[d.key] || 0;
      return {
        ...d,
        qty,
        total: qty * d.value,
      };
    });
  }, [counts]);

  const totalNotesQty = useMemo(() => {
    return notesBreakdown.reduce((sum, item) => sum + item.qty, 0);
  }, [notesBreakdown]);

  const totalNotesAmount = useMemo(() => {
    return notesBreakdown.reduce((sum, item) => sum + item.total, 0);
  }, [notesBreakdown]);

  const totalCoinsQty = useMemo(() => {
    return coinsBreakdown.reduce((sum, item) => sum + item.qty, 0);
  }, [coinsBreakdown]);

  const totalCoinsAmount = useMemo(() => {
    return coinsBreakdown.reduce((sum, item) => sum + item.total, 0);
  }, [coinsBreakdown]);

  const hasCounted = actualCounted > 0 || totalItemsCount > 0;
  const difference = hasCounted ? actualCounted - expectedTotal : 0;
  const isBalanced = hasCounted && difference === 0;
  const isShort = hasCounted && difference < 0;
  const isSurplus = hasCounted && difference > 0;

  // History for selected date
  const dayHistory = useMemo(() => {
    return cashDrawerRecords.filter((r) => r.dateStr === selectedDate);
  }, [cashDrawerRecords, selectedDate]);

  // Counter updates
  const handleUpdateQty = (key: keyof DenominationCount, delta: number) => {
    sounds.playCash();
    const updated = {
      ...counts,
      [key]: Math.max(0, (counts[key] || 0) + delta),
    };
    updateCountsAndDraft(updated);
  };

  const handleQuickAdd = (key: keyof DenominationCount, addQty: number) => {
    sounds.playCash();
    const updated = {
      ...counts,
      [key]: (counts[key] || 0) + addQty,
    };
    updateCountsAndDraft(updated);
  };

  const handleSetQty = (key: keyof DenominationCount, val: string) => {
    const num = parseInt(val, 10);
    const updated = {
      ...counts,
      [key]: isNaN(num) || num < 0 ? 0 : num,
    };
    updateCountsAndDraft(updated);
  };

  const handleClearAll = () => {
    sounds.playDelete();
    updateCountsAndDraft(INITIAL_COUNTS);
    showToast('ล้างการนับแล้ว', 'รีเซ็ตจำนวนธนบัตรและเหรียญทั้งหมดเป็น 0', 'info', '🔄');
  };

  const handleLoadLatestRecord = () => {
    const latestRecord = dayHistory[0];
    if (latestRecord && latestRecord.denominations) {
      sounds.playSuccess();
      updateCountsAndDraft(latestRecord.denominations);
      showToast('ดึงข้อมูลการนับล่าสุดแล้ว 📋', `บันทึกเมื่อเวลา ${latestRecord.timeStr} น.`, 'success');
    } else {
      showToast('ไม่พบประวัติการนับ', 'ยังไม่มีประวัติการนับที่บันทึกไว้ในวันนี้', 'info');
    }
  };

  // Save Record
  const handleSaveRecord = () => {
    if (!hasCounted) {
      sounds.playDelete();
      showToast('กรุณานับเงินก่อน', 'ยังไม่ได้ระบุจำนวนเงินในเก๊ะ', 'warning', '⚠️');
      return;
    }

    addCashDrawerRecord({
      dateStr: selectedDate,
      openingFloat: 0,
      cashSales: cashSalesTotal,
      cashExpenses: cashExpensesTotal,
      expectedTotal,
      actualCounted,
      difference,
      denominations: counts,
      countedBy: settings.bookingRecorders?.[0] || 'เจ้าของร้าน',
      status: isBalanced ? 'balanced' : isSurplus ? 'surplus' : 'short',
    });

    if (isBalanced) {
      try {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      } catch {}
    }
  };

  // Copy LINE Summary
  const handleCopyLine = () => {
    sounds.playClick();
    const thaiDate = formatThaiDateWithWeekday(selectedDate);
    const diffStatus = !hasCounted
      ? 'ยังไม่ได้นับ'
      : isBalanced
      ? '✅ ตรงเป๊ะ 100%'
      : isSurplus
      ? `📈 เงินเกิน +฿${difference.toLocaleString()}`
      : `📉 เงินขาด -฿${Math.abs(difference).toLocaleString()}`;

    const noteLines = notesBreakdown.filter((d) => d.qty > 0)
      .map((d) => `  • ${d.shortLabel}: ${d.qty} ใบ (= ฿${d.total.toLocaleString()})`)
      .join('\n');
    const coinLines = coinsBreakdown.filter((d) => d.qty > 0)
      .map((d) => `  • ${d.shortLabel}: ${d.qty} เหรียญ (= ฿${d.total.toLocaleString()})`)
      .join('\n');

    const text = `💈 [สรุปเงินสดในเก๊ะ] ${settings.shopName || 'BarberPOS'}
📅 วันที่: ${thaiDate}
━━━━━━━━━━━━━━━━━━━
🟢 เงินสดรับจากยอดขายวันนี้ (${cashBills.length} บิล): ฿${cashSalesTotal.toLocaleString()}${cashExpensesTotal > 0 ? `\n🔴 รายจ่ายสดที่หยิบออก: -฿${cashExpensesTotal.toLocaleString()}` : ''}
📌 ยอดเงินสดในวันนั้นที่ต้องมี: ฿${expectedTotal.toLocaleString()}
🪙 ยอดเงินในเก๊ะตอนนี้: ฿${actualCounted.toLocaleString()}
📊 ผลลัพธ์: ${diffStatus}
━━━━━━━━━━━━━━━━━━━
📑 จำนวนเงินในเก๊ะ ณ ปัจจุบัน:
• ธนบัตรรวม ${totalNotesQty} ใบ: ฿${totalNotesAmount.toLocaleString()}
${noteLines || '  (ไม่มีธนบัตร)'}
• เหรียญรวม ${totalCoinsQty} เหรียญ: ฿${totalCoinsAmount.toLocaleString()}
${coinLines || '  (ไม่มีเหรียญ)'}
━━━━━━━━━━━━━━━━━━━
เวลาบันทึก: ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('คัดลอกสรุปเรียบร้อย 📋', 'นำไปวางส่ง LINE ได้ทันที', 'success', '💬');
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-3.5">
      {/* 1. DATE SELECTOR */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border ${cardBg} flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-base sm:text-lg font-bold ${headingText}`}>
              นับเงินสดในเก๊ะ
            </h1>
            <p className={`text-[11px] ${mutedText}`}>
              ใส่จำนวน แบงค์ และ เหรียญ เพื่อคำนวณกับยอดเงินสดในวันนั้น
            </p>
          </div>
        </div>

        {/* Date Switcher */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setSelectedDate(todayStr);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedDate === todayStr
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setSelectedDate(yesterdayStr);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedDate === yesterdayStr
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            เมื่อวาน
          </button>
          <div className={`flex items-center px-2 py-1 rounded-lg border text-xs ${isDark ? 'border-zinc-700 bg-zinc-800/80 text-zinc-200' : 'border-slate-300 bg-slate-50 text-slate-800'}`}>
            <Calendar className="w-3.5 h-3.5 text-zinc-400 mr-1" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent font-mono text-xs focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2. SUMMARY OF CURRENT CASH IN DRAWER & CALCULATION (คำนวณกับเงินสดในวันนั้น: รู้ว่าตอนนี้มีเงินในเก๊ะเท่าไหร่ ขาดหรือเกิน) */}
      <div className={`p-4 rounded-2xl border ${cardBg} shadow-xs space-y-3`}>
        <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-500" />
            <h2 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${headingText}`}>
              คำนวณเงินสดในวันนั้น & ตรวจสอบเงินในเก๊ะ
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-emerald-500">
            คำนวณอัตโนมัติ
          </span>
        </div>

        {/* 2 Big Comparison Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Column A: Expected Cash of That Day (ยอดขายเงินสดในวันนั้น) */}
          <div className={`p-3.5 rounded-xl border ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          } space-y-1`}>
            <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
              <span>เงินสดในวันนั้น (ตามระบบ)</span>
              <span className="text-[10px] font-mono text-amber-500 font-bold px-1.5 py-0.5 rounded bg-amber-500/10">
                {cashBills.length} บิลเงินสด
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-500">
              ฿{expectedTotal.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 space-y-0.5 font-mono pt-1 border-t border-dashed border-zinc-700/60">
              <div className="flex justify-between text-emerald-500 font-semibold">
                <span className="font-sans">🟢 ขายสดที่เข้ามา:</span>
                <span>+฿{cashSalesTotal.toLocaleString()}</span>
              </div>
              {cashExpensesTotal > 0 && (
                <div className="flex justify-between text-rose-500">
                  <span className="font-sans">🔴 รายจ่ายสดที่หยิบออก:</span>
                  <span>-฿{cashExpensesTotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Column B: Current Total Cash in Drawer (ตอนนี้มีเงินในเก๊ะเท่าไหร่ คำนวณจากที่ใส่) */}
          <div className={`p-3.5 rounded-xl border ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          } space-y-1`}>
            <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
              <span>ตอนนี้มีเงินในเก๊ะ</span>
              {hasCounted && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  ล้างเป็น 0
                </button>
              )}
            </div>
            <div className={`text-2xl sm:text-3xl font-mono font-black ${
              hasCounted ? headingText : 'text-zinc-500'
            }`}>
              ฿{actualCounted.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 space-y-0.5 font-mono pt-1 border-t border-dashed border-zinc-700/60">
              <div className="flex justify-between">
                <span className="font-sans">💵 ธนบัตรรวม ({totalNotesQty} ใบ):</span>
                <span>฿{totalNotesAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans">🪙 เหรียญรวม ({totalCoinsQty} เหรียญ):</span>
                <span>฿{totalCoinsAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Result Banner: สรุปว่าเงินตรงไหม ขาดหรือเกิน */}
        <div>
          {!hasCounted ? (
            <div className={`p-3 rounded-xl border text-center text-xs font-semibold ${
              isDark ? 'bg-zinc-800/40 border-zinc-700/60 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            } flex items-center justify-center gap-2`}>
              <RotateCcw className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>ใส่จำนวนเงิน แบงค์ และเหรียญด้านล่าง เพื่อคำนวณว่าเงินในเก๊ะตรงไหม ขาดหรือเกิน</span>
            </div>
          ) : isBalanced ? (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                <div>
                  <div className="text-sm sm:text-base font-black">
                    ✅ เงินในเก๊ะตรงเป๊ะ 100%
                  </div>
                  <div className="text-xs opacity-90">
                    เงินในเก๊ะ ฿{actualCounted.toLocaleString()} ตรงกับเงินสดที่เข้ามาวันนี้พอดี ไม่ขาดไม่เกิน
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] block font-bold text-emerald-500/80">ผลต่าง</span>
                <span className="text-lg sm:text-xl font-mono font-black text-emerald-500">
                  ฿0
                </span>
              </div>
            </div>
          ) : isSurplus ? (
            <div className="p-3.5 rounded-xl bg-sky-500/15 border-2 border-sky-500/40 text-sky-600 dark:text-sky-400 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-6 h-6 text-sky-500 shrink-0" />
                <div>
                  <div className="text-sm sm:text-base font-black">
                    📈 เงินในเก๊ะเกิน +฿{difference.toLocaleString()} บาท
                  </div>
                  <div className="text-xs opacity-90">
                    ในเก๊ะมี ฿{actualCounted.toLocaleString()} มากกว่ายอดเงินสดในวันนั้น (฿{expectedTotal.toLocaleString()})
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] block font-bold text-sky-500/80">เงินเกิน</span>
                <span className="text-lg sm:text-xl font-mono font-black text-sky-500">
                  +฿{difference.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-600 dark:text-rose-400 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <TrendingDown className="w-6 h-6 text-rose-500 shrink-0" />
                <div>
                  <div className="text-sm sm:text-base font-black">
                    📉 เงินในเก๊ะขาด -฿{Math.abs(difference).toLocaleString()} บาท
                  </div>
                  <div className="text-xs opacity-90">
                    ในเก๊ะมี ฿{actualCounted.toLocaleString()} แต่น้อยกว่ายอดเงินสดในวันนั้น (฿{expectedTotal.toLocaleString()})
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] block font-bold text-rose-500/80">เงินขาด</span>
                <span className="text-lg sm:text-xl font-mono font-black text-rose-500">
                  -฿{Math.abs(difference).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 3. SHOW DETAILED CURRENT BREAKDOWN OF NOTES & COINS IN DRAWER (ต้องมี จำนวนเงินในเก๊ะโชว์ ว่ามีแบงค์และเหรียญอะไรเท่าไหร่บ้างด้วย ณ ปัจจุบัน) */}
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/40 border-zinc-800/80' : 'bg-slate-50/80 border-slate-200'} space-y-2`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${headingText} flex items-center gap-1.5`}>
              <Banknote className="w-3.5 h-3.5 text-amber-500" />
              <span>จำนวนเงินในเก๊ะ ณ ปัจจุบัน (มีแบงค์และเหรียญอะไรบ้าง)</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-500">
              รวม ฿{actualCounted.toLocaleString()}
            </span>
          </div>

          {/* Breakdown Pills: Notes */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              ธนบัตร ({totalNotesQty} ใบ = ฿{totalNotesAmount.toLocaleString()})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {notesBreakdown.map((n) => (
                <div
                  key={n.key}
                  className={`px-2 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition-all ${
                    n.qty > 0
                      ? `${n.badgeBg} ${n.badgeText} font-bold`
                      : isDark
                      ? 'bg-zinc-800/30 border-zinc-800 text-zinc-500'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <span>{n.shortLabel}:</span>
                  <span className="font-black">{n.qty} ใบ</span>
                  {n.qty > 0 && <span className="text-[10px] opacity-80">(=฿{n.total.toLocaleString()})</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown Pills: Coins */}
          <div className="space-y-1 pt-1 border-t border-dashed border-zinc-700/40">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              เหรียญ ({totalCoinsQty} เหรียญ = ฿{totalCoinsAmount.toLocaleString()})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {coinsBreakdown.map((c) => (
                <div
                  key={c.key}
                  className={`px-2 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition-all ${
                    c.qty > 0
                      ? `${c.badgeBg} ${c.badgeText} font-bold`
                      : isDark
                      ? 'bg-zinc-800/30 border-zinc-800 text-zinc-500'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <span>{c.shortLabel}:</span>
                  <span className="font-black">{c.qty} เหรียญ</span>
                  {c.qty > 0 && <span className="text-[10px] opacity-80">(=฿{c.total.toLocaleString()})</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. INPUT QUANTITIES OF BANKNOTES & COINS (ใส่จำนวน เงิน แบงค์ เหรียญ ว่ามีอะไรเท่าไหร่บ้าง) */}
      <div className={`p-4 rounded-2xl border ${cardBg} shadow-xs space-y-2.5`}>
        <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-amber-500" />
            <h2 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${headingText}`}>
              ใส่จำนวน เงิน แบงค์ เหรียญ
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {dayHistory.length > 0 && (
              <button
                type="button"
                onClick={handleLoadLatestRecord}
                className="text-[11px] font-bold text-sky-500 hover:underline flex items-center gap-1"
                title="ดึงข้อมูลการนับครั้งล่าสุดที่บันทึกไว้ในวันนี้"
              >
                <RefreshCw className="w-3 h-3" />
                <span>ดึงค่านับล่าสุด</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-bold text-rose-400 hover:underline"
            >
              ล้างเป็น 0
            </button>
          </div>
        </div>

        {/* 9 Denomination Rows */}
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
          {DENOM_LIST.map((item) => {
            const qty = counts[item.key] || 0;
            const subtotal = qty * item.value;

            return (
              <div
                key={item.key}
                className={`py-2 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl transition-all ${
                  qty > 0
                    ? isDark
                      ? 'bg-zinc-800/40'
                      : 'bg-slate-50'
                    : 'hover:bg-zinc-800/20'
                }`}
              >
                {/* Left: Denomination Title & Badge */}
                <div className="flex items-center gap-2.5 min-w-[120px] sm:min-w-[150px]">
                  <span
                    className={`w-14 sm:w-16 text-center py-1 rounded-lg text-xs font-black font-mono border ${item.badgeBg} ${item.badgeText}`}
                  >
                    ฿{item.value.toLocaleString()}
                  </span>
                  <div>
                    <span className={`text-xs font-bold ${headingText} block`}>
                      {item.type === 'note' ? 'ธนบัตร' : 'เหรียญ'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block font-mono">
                      {item.unit}ละ {item.value} บ.
                    </span>
                  </div>
                </div>

                {/* Middle: Stepper Counter Controls [-] [Input] [+] and Quick Add Chips */}
                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.key, -1)}
                      disabled={qty <= 0}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                        qty > 0
                          ? isDark
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          : 'opacity-30 cursor-not-allowed bg-zinc-800/30 text-zinc-600'
                      }`}
                      title="ลด 1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <input
                      type="number"
                      min="0"
                      value={qty === 0 ? '' : qty}
                      onChange={(e) => handleSetQty(item.key, e.target.value)}
                      placeholder="0"
                      className={`w-14 sm:w-16 text-center py-1 rounded-lg text-sm sm:text-base font-mono font-black border transition-all ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-white focus:border-amber-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                      } focus:outline-none`}
                    />

                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.key, 1)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                        isDark
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      }`}
                      title="เพิ่ม 1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Add Chips: +1, +5, +10 */}
                  <div className="flex items-center gap-1 pl-1">
                    {[1, 5, 10].map((addNum) => (
                      <button
                        key={addNum}
                        type="button"
                        onClick={() => handleQuickAdd(item.key, addNum)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all border ${
                          isDark
                            ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                        title={`บวกเพิ่ม ${addNum} ${item.unit}`}
                      >
                        +{addNum}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Subtotal Amount */}
                <div className="text-right min-w-[75px] sm:min-w-[90px] self-end sm:self-auto">
                  <span
                    className={`text-sm sm:text-base font-mono font-bold block ${
                      qty > 0 ? item.textColor : 'text-zinc-400'
                    }`}
                  >
                    ฿{subtotal.toLocaleString()}
                  </span>
                  {qty > 0 ? (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {qty} {item.unit}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions: Save Button & LINE Share */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center gap-2">
          <button
            type="button"
            onClick={handleSaveRecord}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>บันทึกปิดเก๊ะประจำวัน (฿{actualCounted.toLocaleString()})</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLine}
            className={`w-full sm:w-auto py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5 text-emerald-500" />
            <span>คัดลอกส่ง LINE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
