import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Coins,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Copy,
  Calendar,
  Sparkles,
  Plus,
  Minus,
  Banknote,
  ChevronDown,
  ChevronUp,
  History,
  TrendingUp,
  TrendingDown,
  Trash2,
  Edit2,
  Check,
  ArrowDownRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DenominationCount } from '../types';
import { sounds } from '../utils/sound';
import {
  getTodayDateStr,
  getYesterdayDateStr,
  formatThaiDateFull,
  formatThaiDateWithWeekday,
} from './RealtimeDatePicker';

interface DenomRow {
  key: keyof DenominationCount;
  value: number;
  label: string;
  unit: string;
  type: 'note' | 'coin';
  badgeBg: string;
  badgeText: string;
  textColor: string;
}

// 9 Denominations arranged vertically straight down
const DENOM_LIST: DenomRow[] = [
  {
    key: 'b1000',
    value: 1000,
    label: 'ธนบัตร 1,000 บาท',
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
    deleteCashDrawerRecord,
    getOpeningFloatForDate,
    setOpeningFloatForDate,
    showToast,
    openReceiptModal,
  } = useApp();

  const todayStr = getTodayDateStr();
  const yesterdayStr = getYesterdayDateStr();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Denomination counts state (เรียงตรงยาวลงมา)
  const [counts, setCounts] = useState<DenominationCount>(INITIAL_COUNTS);

  // Manual total override option (for those who want to type total directly)
  const [useManualTotal, setUseManualTotal] = useState(false);
  const [manualTotalInput, setManualTotalInput] = useState('');

  // Opening float inline editing
  const [isEditingFloat, setIsEditingFloat] = useState(false);
  const [floatInput, setFloatInput] = useState<string>('');

  // Collapsible sections
  const [showBreakdownDetails, setShowBreakdownDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [operatorNote, setOperatorNote] = useState('');

  const isDark = theme.isDark ?? true;
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';

  // 1. Calculations from data
  const openingFloat = getOpeningFloatForDate(selectedDate);

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

  // Cash Expenses for selected date
  const dayExpenses = useMemo(() => {
    return expenses.filter((e) => e.dateStr === selectedDate);
  }, [expenses, selectedDate]);

  const cashExpenses = useMemo(() => {
    return dayExpenses.filter((e) => e.paymentMethod === 'cash');
  }, [dayExpenses]);

  const cashExpensesTotal = useMemo(() => {
    return cashExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [cashExpenses]);

  // Expected cash in drawer according to system
  const expectedTotal = Math.max(0, openingFloat + cashSalesTotal - cashExpensesTotal);

  // Sum of denominations
  const breakdownTotal = useMemo(() => {
    return DENOM_LIST.reduce((sum, item) => sum + (counts[item.key] || 0) * item.value, 0);
  }, [counts]);

  // Total count of notes and coins
  const totalItemsCount = useMemo(() => {
    return DENOM_LIST.reduce((sum, item) => sum + (counts[item.key] || 0), 0);
  }, [counts]);

  // Actual counted amount (breakdown or manual override)
  const actualCounted = useMemo(() => {
    if (useManualTotal) {
      const val = parseFloat(manualTotalInput.replace(/,/g, ''));
      return isNaN(val) || val < 0 ? 0 : val;
    }
    return breakdownTotal;
  }, [useManualTotal, manualTotalInput, breakdownTotal]);

  const hasCounted = useManualTotal ? manualTotalInput.trim() !== '' : breakdownTotal > 0;
  const difference = hasCounted ? actualCounted - expectedTotal : 0;
  const isBalanced = hasCounted && difference === 0;
  const isShort = hasCounted && difference < 0;
  const isSurplus = hasCounted && difference > 0;

  // History for selected date
  const dayHistory = useMemo(() => {
    return cashDrawerRecords.filter((r) => r.dateStr === selectedDate);
  }, [cashDrawerRecords, selectedDate]);

  // Denomination counter updates
  const handleUpdateQty = (key: keyof DenominationCount, delta: number) => {
    sounds.playCash();
    if (useManualTotal) setUseManualTotal(false);
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta),
    }));
  };

  const handleSetQty = (key: keyof DenominationCount, val: string) => {
    if (useManualTotal) setUseManualTotal(false);
    const num = parseInt(val, 10);
    setCounts((prev) => ({
      ...prev,
      [key]: isNaN(num) || num < 0 ? 0 : num,
    }));
  };

  const handleClearAll = () => {
    sounds.playDelete();
    setCounts(INITIAL_COUNTS);
    setManualTotalInput('');
    setUseManualTotal(false);
    showToast('ล้างการนับแล้ว', 'รีเซ็ตจำนวนธนบัตรและเหรียญทั้งหมดเป็น 0', 'info', '🔄');
  };

  // Auto-fill from expected amount
  const handleFillExpected = () => {
    sounds.playCash();
    let rem = expectedTotal;
    const autoCounts: DenominationCount = { ...INITIAL_COUNTS };
    for (const item of DENOM_LIST) {
      if (rem >= item.value) {
        autoCounts[item.key] = Math.floor(rem / item.value);
        rem = rem % item.value;
      }
    }
    setCounts(autoCounts);
    setUseManualTotal(false);
    showToast('ใส่ตามยอดระบบ ฿' + expectedTotal.toLocaleString(), 'จัดชุดธนบัตรและเหรียญตามยอดในระบบให้เรียบร้อย', 'success', '✨');
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
      openingFloat,
      cashSales: cashSalesTotal,
      cashExpenses: cashExpensesTotal,
      expectedTotal,
      actualCounted,
      difference,
      denominations: counts,
      countedBy: 'เจ้าของร้าน',
      notes: operatorNote.trim() || undefined,
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

    const denomLines = DENOM_LIST.filter((d) => (counts[d.key] || 0) > 0)
      .map((d) => `  • ${d.label}: ${counts[d.key]} ${d.unit} (= ฿${(counts[d.key] * d.value).toLocaleString()})`)
      .join('\n');

    const text = `💈 [สรุปเงินสดในเก๊ะ] ${settings.shopName || 'BarberPOS'}
📅 วันที่: ${thaiDate}
━━━━━━━━━━━━━━━━━━━
💵 เงินทอนเปิดเก๊ะ: ฿${openingFloat.toLocaleString()}
🟢 ขายสด (${cashBills.length} บิล): +฿${cashSalesTotal.toLocaleString()}
🔴 จ่ายสด (${cashExpenses.length} รายการ): -฿${cashExpensesTotal.toLocaleString()}
━━━━━━━━━━━━━━━━━━━
📌 ยอดตามระบบควรมี: ฿${expectedTotal.toLocaleString()}
🪙 ยอดที่นับได้จริง: ฿${actualCounted.toLocaleString()}
📊 ผลต่าง: ${diffStatus}
━━━━━━━━━━━━━━━━━━━
${denomLines ? `📑 รายการนับแยกใบ/เหรียญ:\n${denomLines}\n━━━━━━━━━━━━━━━━━━━\n` : ''}เวลาบันทึก: ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('คัดลอกสรุปเรียบร้อย 📋', 'นำไปวางส่ง LINE ได้ทันที', 'success', '💬');
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-3.5">
      {/* 1. TOP HEADER & DATE SELECTOR */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border ${cardBg} flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-base sm:text-lg font-bold ${headingText} flex items-center gap-1.5`}>
              นับเงินสดในเก๊ะ
            </h1>
            <p className={`text-[11px] ${mutedText}`}>
              นับธนบัตรและเหรียญทีละรายการ เรียงแนวตรงยาวลงมา
            </p>
          </div>
        </div>

        {/* Date Selector */}
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

      {/* 2. CASH RECEIVED TODAY / SELECTED DATE (เงินสดที่ได้รับในวันนั้นๆ) */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDark
          ? 'bg-gradient-to-r from-emerald-950/30 via-zinc-900 to-zinc-900 border-emerald-500/30'
          : 'bg-gradient-to-r from-emerald-50/80 via-white to-white border-emerald-200'
      } shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center font-bold shrink-0">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {selectedDate === todayStr ? 'เงินสดที่ได้รับวันนี้ (บิลขาย)' : `เงินสดที่ได้รับวันที่ ${formatThaiDateFull(selectedDate)}`}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {cashBills.length} บิล
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              +฿{cashSalesTotal.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-500/20 text-xs">
          <div className="text-zinc-400 text-[11px]">
            เงินทอนเริ่มต้น: <strong className="text-zinc-300 font-mono">฿{openingFloat.toLocaleString()}</strong>
            {cashExpensesTotal > 0 && (
              <span className="text-rose-400 ml-1.5">
                | จ่ายออก: -฿{cashExpensesTotal.toLocaleString()}
              </span>
            )}
          </div>
          <div className="text-xs text-amber-500 font-semibold mt-0.5">
            รวมเงินสดที่ต้องมีในเก๊ะ: <strong className="text-base font-mono font-bold">฿{expectedTotal.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* 3. SUMMARY DASHBOARD: 3 CLEAR FIGURES */}
      <div className={`p-4 rounded-2xl border ${cardBg} shadow-xs space-y-3`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800">
          {/* Col 1: System Expected */}
          <div className="space-y-0.5 sm:pr-3">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
              <span>ยอดตามระบบควรมี</span>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setFloatInput(String(openingFloat));
                  setIsEditingFloat(true);
                }}
                className="text-amber-500 hover:underline flex items-center gap-0.5 text-[10px]"
              >
                <span>ทอน ฿{openingFloat.toLocaleString()}</span>
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="text-2xl font-mono font-bold text-amber-500">
              ฿{expectedTotal.toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-400 space-x-1 truncate">
              <span>ทอน {openingFloat}</span>
              <span>+ ขาย {cashSalesTotal}</span>
              <span>- จ่าย {cashExpensesTotal}</span>
            </div>
          </div>

          {/* Col 2: Actual Counted */}
          <div className="pt-2 sm:pt-0 sm:px-3 space-y-0.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
              <span>ยอดนับได้จริง</span>
              {hasCounted && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[10px] text-zinc-400 hover:text-rose-500"
                >
                  ล้างค่า
                </button>
              )}
            </div>
            <div className={`text-2xl font-mono font-bold ${hasCounted ? headingText : 'text-zinc-400'}`}>
              ฿{actualCounted.toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-400">
              {useManualTotal ? 'กรอกยอดรวมเอง' : `นับแล้ว ${totalItemsCount} รายการ`}
            </div>
          </div>

          {/* Col 3: Difference */}
          <div className="pt-2 sm:pt-0 sm:pl-3 space-y-0.5">
            <span className="text-[11px] font-medium text-zinc-400 block">ผลต่างตรวจนับ</span>
            {!hasCounted ? (
              <div className="text-xl font-bold text-zinc-400">รอตรวจนับ</div>
            ) : isBalanced ? (
              <div className="text-xl font-bold text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-5 h-5" />
                <span>ตรงเป๊ะ 100%</span>
              </div>
            ) : isSurplus ? (
              <div className="text-xl font-mono font-bold text-sky-500 flex items-center gap-1">
                <TrendingUp className="w-5 h-5" />
                <span>+฿{difference.toLocaleString()}</span>
              </div>
            ) : (
              <div className="text-xl font-mono font-bold text-rose-500 flex items-center gap-1">
                <TrendingDown className="w-5 h-5" />
                <span>-฿{Math.abs(difference).toLocaleString()}</span>
              </div>
            )}
            <p className="text-[10px] text-zinc-400 truncate">
              {!hasCounted
                ? 'กรอกจำนวนด้านล่าง'
                : isBalanced
                ? 'ยอดเงินตรงกับระบบพอดี'
                : isSurplus
                ? 'เงินในเก๊ะมากกว่าระบบ'
                : 'เงินในเก๊ะน้อยกว่าระบบ'}
            </p>
          </div>
        </div>

        {/* Inline Edit Float */}
        {isEditingFloat && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-500">เงินทอนเปิดเก๊ะ:</span>
              <div className="flex items-center gap-1">
                <span>฿</span>
                <input
                  type="number"
                  value={floatInput}
                  onChange={(e) => setFloatInput(e.target.value)}
                  className={`w-20 px-2 py-0.5 rounded font-mono font-bold border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[500, 1000, 1500, 2000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFloatInput(String(preset))}
                  className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px]"
                >
                  {preset}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(floatInput);
                  setOpeningFloatForDate(selectedDate, isNaN(val) ? 0 : val);
                  setIsEditingFloat(false);
                  sounds.playClick();
                }}
                className="px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold ml-1 text-xs"
              >
                ตกลง
              </button>
              <button
                type="button"
                onClick={() => setIsEditingFloat(false)}
                className="px-2 py-0.5 text-zinc-400 hover:text-zinc-200 text-xs"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* Quick Toolbar */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleFillExpected}
            className="text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>ใส่ยอดตามระบบอัตโนมัติ (฿{expectedTotal.toLocaleString()})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setUseManualTotal(!useManualTotal);
              if (!useManualTotal && actualCounted > 0) {
                setManualTotalInput(String(actualCounted));
              }
            }}
            className="text-zinc-400 hover:text-zinc-200 underline text-[11px]"
          >
            {useManualTotal ? '← กลับไปนับแยกใบ/เหรียญ' : 'หรือกรอกยอดรวมเอง'}
          </button>
        </div>

        {/* Manual Total Input (if toggled) */}
        {useManualTotal && (
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
            <span className="text-xs font-bold text-amber-500 shrink-0">ยอดรวมในเก๊ะ:</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">฿</span>
              <input
                type="number"
                min="0"
                placeholder="กรอกยอดรวม เช่น 1500"
                value={manualTotalInput}
                onChange={(e) => setManualTotalInput(e.target.value)}
                className={`w-full pl-7 pr-3 py-1.5 rounded-lg font-mono font-bold text-base border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'} focus:outline-none focus:border-amber-500`}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. DENOMINATION LIST: ARRANGED VERTICALLY STRAIGHT DOWN (เรียงแนวตรงยาวลงมา) */}
      <div className={`p-4 rounded-2xl border ${cardBg} shadow-xs space-y-2`}>
        <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-amber-500" />
            <h2 className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
              นับเงินสดแยกใบ / เหรียญ (เรียงจากมากไปน้อย)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            รวม: <strong className={headingText}>฿{breakdownTotal.toLocaleString()}</strong> ({totalItemsCount} รายการ)
          </span>
        </div>

        {/* Vertical Straight List */}
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
          {DENOM_LIST.map((item) => {
            const qty = counts[item.key] || 0;
            const subtotal = qty * item.value;

            return (
              <div
                key={item.key}
                className={`py-2.5 px-2 flex items-center justify-between gap-2 rounded-xl transition-all ${
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

                {/* Middle: Stepper Counter Controls [-] [Input] [+] */}
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
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Right: Subtotal Amount */}
                <div className="text-right min-w-[75px] sm:min-w-[90px]">
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

      {/* 4. COLLAPSIBLE ACCORDION: BILLS & EXPENSES (ที่มาของเงินสด) */}
      <div className={`rounded-2xl border ${cardBg} overflow-hidden shadow-xs`}>
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            setShowBreakdownDetails(!showBreakdownDetails);
          }}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-zinc-800/20 transition-all"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
            <Receipt className="w-4 h-4 text-emerald-500" />
            <span>ที่มาของเงิน: บิลขายสด ({cashBills.length} บิล) & รายจ่ายสด ({cashExpenses.length} รายการ)</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <span>{showBreakdownDetails ? 'ซ่อน' : 'แสดง'}</span>
            {showBreakdownDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showBreakdownDetails && (
          <div className="p-3.5 pt-0 border-t border-zinc-200 dark:border-zinc-800/80 space-y-3">
            {/* Cash Bills */}
            <div>
              <span className="text-xs font-bold text-emerald-500 block mb-1.5">
                บิลขายเงินสด (+฿{cashSalesTotal.toLocaleString()})
              </span>
              {cashBills.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">ไม่มีบิลขายเงินสดในวันนี้</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {cashBills.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => openReceiptModal(b)}
                      className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer border hover:border-emerald-500/40 transition-all ${
                        isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-400">#{b.billNumber || b.id.slice(-4)}</span>
                        <span className="font-semibold">{b.customerName || 'ลูกค้าทั่วไป'}</span>
                        <span className="text-[10px] text-zinc-400">({b.timeStr})</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-500">
                        +฿{(b.paymentMethod === 'cash' ? (b.cashAmount > 0 ? b.cashAmount : b.grossTotal) : (b.cashAmount || 0)).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cash Expenses */}
            <div>
              <span className="text-xs font-bold text-rose-500 block mb-1.5">
                รายจ่ายเงินสด (-฿{cashExpensesTotal.toLocaleString()})
              </span>
              {cashExpenses.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">ไม่มีรายจ่ายเงินสดในวันนี้</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {cashExpenses.map((e) => (
                    <div
                      key={e.id}
                      className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                        isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{e.title}</span>
                        <span className="text-[10px] text-zinc-400">({e.category})</span>
                      </div>
                      <span className="font-mono font-bold text-rose-500">
                        -฿{(e.amount || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. COLLAPSIBLE ACCORDION: HISTORY */}
      {dayHistory.length > 0 && (
        <div className={`rounded-2xl border ${cardBg} overflow-hidden shadow-xs`}>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setShowHistory(!showHistory);
            }}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-zinc-800/20 transition-all"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
              <History className="w-4 h-4 text-amber-500" />
              <span>ประวัติการตรวจนับที่บันทึกแล้วในวันนี้ ({dayHistory.length} ครั้ง)</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <span>{showHistory ? 'ซ่อน' : 'แสดง'}</span>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showHistory && (
            <div className="p-3.5 pt-0 border-t border-zinc-200 dark:border-zinc-800/80 space-y-2">
              {dayHistory.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-500">{rec.timeStr} น.</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          rec.status === 'balanced'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : rec.status === 'surplus'
                            ? 'bg-sky-500/10 text-sky-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {rec.status === 'balanced'
                          ? 'ตรงเป๊ะ'
                          : rec.status === 'surplus'
                          ? `เกิน +฿${rec.difference.toLocaleString()}`
                          : `ขาด -฿${Math.abs(rec.difference).toLocaleString()}`}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      นับได้: ฿{rec.actualCounted.toLocaleString()} (ระบบ: ฿{rec.expectedTotal.toLocaleString()})
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteCashDrawerRecord(rec.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                    title="ลบรายการนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
