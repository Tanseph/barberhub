import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Coins,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Copy,
  Calendar,
  Plus,
  Minus,
  Banknote,
  ChevronDown,
  ChevronUp,
  History,
  TrendingUp,
  TrendingDown,
  Trash2,
  Check,
  LayoutDashboard,
  Wallet,
  ArrowRight,
  FileSpreadsheet,
  Calculator,
  Sparkles,
  Layers,
  RefreshCw,
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
    setActiveTab,
    currentShopId,
  } = useApp();

  const todayStr = getTodayDateStr();
  const yesterdayStr = getYesterdayDateStr();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const draftStorageKey = `barber_drawer_draft_${currentShopId || 'default'}_${selectedDate}`;

  // Denomination counts state (เรียงตรงยาวลงมา)
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

  // Manual total override option (for those who want to type total directly)
  const [useManualTotal, setUseManualTotal] = useState(false);
  const [manualTotalInput, setManualTotalInput] = useState('');

  // Opening float state (เอาออกมาข้างนอก ให้กรอกได้ตรงๆ ทันที ไม่ต้องมีไล่ยอดอัตโนมัติ)
  const openingFloat = getOpeningFloatForDate(selectedDate);
  const [floatInput, setFloatInput] = useState<string>(() => String(openingFloat));

  // Sync floatInput when selectedDate changes
  useEffect(() => {
    setFloatInput(String(getOpeningFloatForDate(selectedDate)));
  }, [selectedDate, getOpeningFloatForDate]);

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
  }, [selectedDate, currentShopId, draftStorageKey]);

  const updateCountsAndDraft = (newCounts: DenominationCount) => {
    setCounts(newCounts);
    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(newCounts));
    } catch {}
  };

  const handleFloatChange = (valStr: string) => {
    setFloatInput(valStr);
    const cleanStr = valStr.replace(/,/g, '');
    const num = parseFloat(cleanStr);
    setOpeningFloatForDate(selectedDate, isNaN(num) || num < 0 ? 0 : num);
  };

  const handleApplyPresetFloat = (amount: number) => {
    sounds.playClick();
    setFloatInput(String(amount));
    setOpeningFloatForDate(selectedDate, amount);
  };

  // Collapsible sections
  const [showBreakdownDetails, setShowBreakdownDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [operatorNote, setOperatorNote] = useState('');
  const [countedBy, setCountedBy] = useState<string>(() => settings.bookingRecorders?.[0] || 'เจ้าของร้าน');

  const isDark = theme.isDark ?? true;
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';

  // 1. Calculations from data
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

  // Full Day Metrics (เชื่อมกับแดชบอร์ดและหน้ารายจ่าย เพื่อการทำบัญชีที่ถูกต้อง)
  const totalDaySales = useMemo(() => {
    return dayBills.reduce((sum, b) => sum + b.grossTotal, 0);
  }, [dayBills]);

  const transferSalesTotal = useMemo(() => {
    return dayBills.reduce((sum, b) => sum + (b.transferAmount || 0), 0);
  }, [dayBills]);

  const totalDayExpenses = useMemo(() => {
    return dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [dayExpenses]);

  const transferExpensesTotal = useMemo(() => {
    return dayExpenses.filter((e) => e.paymentMethod === 'transfer').reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [dayExpenses]);

  // Sum of denominations
  const breakdownTotal = useMemo(() => {
    return DENOM_LIST.reduce((sum, item) => sum + (counts[item.key] || 0) * item.value, 0);
  }, [counts]);

  // Total count of notes and coins
  const totalItemsCount = useMemo(() => {
    return DENOM_LIST.reduce((sum, item) => sum + (counts[item.key] || 0), 0);
  }, [counts]);

  // Banknotes breakdown
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
    const updated = {
      ...counts,
      [key]: Math.max(0, (counts[key] || 0) + delta),
    };
    updateCountsAndDraft(updated);
  };

  const handleQuickAdd = (key: keyof DenominationCount, addQty: number) => {
    sounds.playCash();
    if (useManualTotal) setUseManualTotal(false);
    const updated = {
      ...counts,
      [key]: (counts[key] || 0) + addQty,
    };
    updateCountsAndDraft(updated);
  };

  const handleSetQty = (key: keyof DenominationCount, val: string) => {
    if (useManualTotal) setUseManualTotal(false);
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
    setManualTotalInput('');
    setUseManualTotal(false);
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
      openingFloat,
      cashSales: cashSalesTotal,
      cashExpenses: cashExpensesTotal,
      expectedTotal,
      actualCounted,
      difference,
      denominations: counts,
      countedBy: countedBy.trim() || 'เจ้าของร้าน',
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

    const noteLines = notesBreakdown.filter((d) => d.qty > 0)
      .map((d) => `  • ${d.label}: ${d.qty} ใบ (= ฿${d.total.toLocaleString()})`)
      .join('\n');
    const coinLines = coinsBreakdown.filter((d) => d.qty > 0)
      .map((d) => `  • ${d.label}: ${d.qty} เหรียญ (= ฿${d.total.toLocaleString()})`)
      .join('\n');

    const text = `💈 [สรุปเงินสดในเก๊ะ] ${settings.shopName || 'BarberPOS'}
📅 วันที่: ${thaiDate}
━━━━━━━━━━━━━━━━━━━
💵 เงินทอนเปิดเก๊ะ: ฿${openingFloat.toLocaleString()}
🟢 ขายสดที่เข้ามาวันนี้ (${cashBills.length} บิล): +฿${cashSalesTotal.toLocaleString()}
🔴 จ่ายสดที่หยิบออก (${cashExpenses.length} รายการ): -฿${cashExpensesTotal.toLocaleString()}
━━━━━━━━━━━━━━━━━━━
📌 ยอดตามระบบที่ต้องมี: ฿${expectedTotal.toLocaleString()}
🪙 ยอดที่นับได้ในเก๊ะ ณ ปัจจุบัน: ฿${actualCounted.toLocaleString()}
📊 เงินที่เข้ามาวันนี้: ${diffStatus}
━━━━━━━━━━━━━━━━━━━
📑 จำนวนเงินในเก๊ะปัจจุบัน:
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

      {/* ACCOUNTING & DATA CONNECTIONS BAR (เชื่อมโยงข้อมูลแดชบอร์ดและรายจ่าย เพื่อทำบัญชีให้ถูกต้อง) */}
      <div className={`p-3 rounded-2xl border ${cardBg} shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5`}>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] font-bold text-zinc-400">เชื่อมต่อทำบัญชี:</span>
          <span className="font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            ขายรวมวันนี้: ฿{totalDaySales.toLocaleString()}
          </span>
          <span className="font-semibold px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            รายจ่ายรวม: ฿{totalDayExpenses.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab('dashboard');
            }}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            title="ดูสรุปยอดขาย กำไร และรายงานงบบัญชีในแดชบอร์ด"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>ไปที่แดชบอร์ด</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab('expenses');
            }}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            title="ไปบันทึกรายจ่ายเงินสดที่หยิบออกจากเก๊ะ"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>บันทึกรายจ่าย</span>
          </button>
        </div>
      </div>

      {/* 2. OPENING FLOAT INPUT CARD (กรอกเงินทอนในเก๊ะเริ่มต้นวัน เอาออกมาข้างนอก ไม่ต้องมีไล่ยอดอัตโนมัติ) */}
      <div className={`p-4 rounded-2xl border ${cardBg} shadow-xs space-y-3`}>
        <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-bold shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-sm sm:text-base font-bold ${headingText}`}>
                  เงินทอนในเก๊ะเริ่มต้นวัน
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {selectedDate === todayStr ? 'ประจำวันนี้' : formatThaiDateFull(selectedDate)}
                </span>
              </div>
              <p className={`text-[11px] ${mutedText}`}>
                กรอกเงินทอนที่ใส่ไว้ในเก๊ะตอนเริ่มวัน (กรอกยอดเอง ไม่ไล่ยอดอัตโนมัติ)
              </p>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
            <span className="text-[11px] text-zinc-400 mr-0.5">ยอดด่วน:</span>
            {[0, 500, 1000, 1500, 2000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleApplyPresetFloat(preset)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  openingFloat === preset
                    ? 'bg-amber-500 text-zinc-950 shadow-xs'
                    : isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/80'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                ฿{preset.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Input field */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-black font-mono text-amber-500">
              ฿
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={floatInput}
              onChange={(e) => handleFloatChange(e.target.value)}
              placeholder="0"
              className={`w-full pl-8 pr-12 py-2.5 rounded-xl font-mono text-lg font-black border transition-all ${
                isDark
                  ? 'bg-zinc-950 border-zinc-700 text-amber-400 focus:border-amber-500'
                  : 'bg-slate-50 border-slate-300 text-amber-600 focus:border-amber-500'
              } focus:outline-none focus:ring-2 focus:ring-amber-500/20`}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
              บาท
            </span>
          </div>

          {openingFloat > 0 && (
            <button
              type="button"
              onClick={() => handleApplyPresetFloat(0)}
              className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                isDark
                  ? 'border-zinc-700 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
                  : 'border-slate-300 text-slate-500 hover:text-rose-600 hover:bg-rose-50'
              }`}
              title="ตั้งเงินทอนเป็น 0"
            >
              รีเซ็ตเป็น 0
            </button>
          )}
        </div>
      </div>

      {/* 3. แถบสรุปจำนวนเงินในเก๊ะ ณ ปัจจุบัน (CURRENT CASH IN DRAWER BREAKDOWN) */}
      <div className={`p-4 rounded-2xl border ${cardBg} shadow-xs space-y-3.5`}>
        <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`text-sm sm:text-base font-bold ${headingText} flex items-center gap-1.5`}>
                <span>จำนวนเงินในเก๊ะ ณ ปัจจุบัน</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Real-time Drawer Cash
                </span>
              </h2>
              <p className={`text-[11px] ${mutedText}`}>
                แสดงรายการธนบัตรและเหรียญที่ตรวจนับได้ในเก๊ะ ณ ตอนนี้ ว่ามีแบงค์และเหรียญอะไรเท่าไหร่บ้าง
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-400 block font-medium">รวมเงินในเก๊ะ</span>
            <span className={`text-lg sm:text-xl font-mono font-black ${hasCounted ? 'text-amber-500' : 'text-zinc-500'}`}>
              ฿{actualCounted.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Top 3 Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className={`p-2.5 sm:p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'} text-center space-y-0.5`}>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 block font-medium">🪙 รวมเงินในเก๊ะ</span>
            <span className={`text-base sm:text-lg font-mono font-black block ${hasCounted ? 'text-amber-500' : 'text-zinc-500'}`}>
              ฿{actualCounted.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-500 block font-mono">
              {totalItemsCount} รายการ
            </span>
          </div>

          <div className={`p-2.5 sm:p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'} text-center space-y-0.5`}>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 block font-medium">💵 ธนบัตรรวม</span>
            <span className={`text-base sm:text-lg font-mono font-black block ${totalNotesAmount > 0 ? 'text-emerald-500' : 'text-zinc-500'}`}>
              ฿{totalNotesAmount.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-500 block font-mono">
              {totalNotesQty} ใบ
            </span>
          </div>

          <div className={`p-2.5 sm:p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'} text-center space-y-0.5`}>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 block font-medium">🪙 เหรียญรวม</span>
            <span className={`text-base sm:text-lg font-mono font-black block ${totalCoinsAmount > 0 ? 'text-amber-500' : 'text-zinc-500'}`}>
              ฿{totalCoinsAmount.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-500 block font-mono">
              {totalCoinsQty} เหรียญ
            </span>
          </div>
        </div>

        {/* Visual Grid: Banknotes Breakdown (5 Denominations) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-500" />
              <span>ธนบัตรในเก๊ะ ({totalNotesQty} ใบ = ฿{totalNotesAmount.toLocaleString()})</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">5 ชนิด</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {notesBreakdown.map((item) => {
              const hasQty = item.qty > 0;
              return (
                <div
                  key={item.key}
                  className={`p-2 rounded-xl border transition-all text-center space-y-1 ${
                    hasQty
                      ? isDark
                        ? 'bg-zinc-800/80 border-amber-500/40 shadow-xs'
                        : 'bg-white border-amber-400/60 shadow-xs'
                      : isDark
                      ? 'bg-zinc-950/40 border-zinc-800/80 opacity-60'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black border ${item.badgeBg} ${item.badgeText}`}>
                      ฿{item.value}
                    </span>
                    <span className={`text-[10px] font-mono font-bold ${hasQty ? headingText : 'text-zinc-500'}`}>
                      {item.qty} ใบ
                    </span>
                  </div>
                  <div className={`text-xs sm:text-sm font-mono font-black truncate ${hasQty ? item.textColor : 'text-zinc-500'}`}>
                    ฿{item.total.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Grid: Coins Breakdown (4 Denominations) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>เหรียญในเก๊ะ ({totalCoinsQty} เหรียญ = ฿{totalCoinsAmount.toLocaleString()})</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">4 ชนิด</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {coinsBreakdown.map((item) => {
              const hasQty = item.qty > 0;
              return (
                <div
                  key={item.key}
                  className={`p-2 rounded-xl border transition-all text-center space-y-1 ${
                    hasQty
                      ? isDark
                        ? 'bg-zinc-800/80 border-amber-500/40 shadow-xs'
                        : 'bg-white border-amber-400/60 shadow-xs'
                      : isDark
                      ? 'bg-zinc-950/40 border-zinc-800/80 opacity-60'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black border ${item.badgeBg} ${item.badgeText}`}>
                      ฿{item.value}
                    </span>
                    <span className={`text-[10px] font-mono font-bold ${hasQty ? headingText : 'text-zinc-500'}`}>
                      {item.qty} เหรียญ
                    </span>
                  </div>
                  <div className={`text-xs sm:text-sm font-mono font-black truncate ${hasQty ? item.textColor : 'text-zinc-500'}`}>
                    ฿{item.total.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. CALCULATION & RECONCILIATION SUMMARY (ตรวจสอบ: เงินที่เข้ามาวันนี้ ตรงไหม?) */}
      <div className={`p-4 rounded-2xl border ${cardBg} shadow-xs space-y-3.5`}>
        <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-500" />
            <h2 className={`text-xs font-bold uppercase tracking-wider ${headingText}`}>
              ตรวจสอบ: เงินที่เข้ามาวันนี้ ตรงไหม? (Cash Inflow & Reconciliation)
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-emerald-500">
            คำนวณผลลัพธ์ทันทีแบบเรียลไทม์
          </span>
        </div>

        {/* 2 Big Comparison Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Column A: Expected Cash in Drawer */}
          <div className={`p-3.5 rounded-xl border ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          } space-y-1.5`}>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>ยอดที่ควรมีในเก๊ะ (ตามระบบ)</span>
              <span className="text-[10px] font-mono text-amber-500 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                เงินทอน + ยอดขายสด
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-500">
              ฿{expectedTotal.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 space-y-0.5 font-mono pt-1 border-t border-dashed border-zinc-700/60">
              <div className="flex items-center justify-between">
                <span className="font-sans">💵 เงินทอนเริ่มต้นวัน:</span>
                <span>฿{openingFloat.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-500 font-bold">
                <span className="font-sans">🟢 ยอดขายสดที่เข้ามาวันนี้ ({cashBills.length} บิล):</span>
                <span>+฿{cashSalesTotal.toLocaleString()}</span>
              </div>
              {cashExpensesTotal > 0 && (
                <div className="flex items-center justify-between text-rose-500">
                  <span className="font-sans">🔴 รายจ่ายสดที่หยิบออก:</span>
                  <span>-฿{cashExpensesTotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Column B: Actual Counted Cash */}
          <div className={`p-3.5 rounded-xl border ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          } space-y-1.5`}>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>ยอดเงินสดที่นับได้ในเก๊ะ</span>
              {hasCounted && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-zinc-400 hover:text-rose-500 underline"
                >
                  ล้างค่าที่นับ
                </button>
              )}
            </div>
            <div className={`text-2xl sm:text-3xl font-mono font-black ${
              hasCounted ? headingText : 'text-zinc-500'
            }`}>
              ฿{actualCounted.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 space-y-0.5 pt-1 border-t border-dashed border-zinc-700/60">
              <div className="flex items-center justify-between">
                <span>วิธีนับ:</span>
                <span className="font-semibold text-zinc-300">
                  {useManualTotal ? 'กรอกยอดรวมเอง' : `นับแยกใบ/เหรียญ (${totalItemsCount} รายการ)`}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>ธนบัตร: ฿{totalNotesAmount.toLocaleString()} ({totalNotesQty} ใบ)</span>
                <span>เหรียญ: ฿{totalCoinsAmount.toLocaleString()} ({totalCoinsQty} เหรียญ)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Result Banner: ตรงไหม ขาด หรือ เกิน */}
        <div className="pt-0.5">
          {!hasCounted ? (
            <div className={`p-3.5 rounded-xl border text-center text-xs font-semibold ${
              isDark ? 'bg-zinc-800/40 border-zinc-700/60 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            } flex items-center justify-center gap-2`}>
              <RotateCcw className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>ใส่จำนวนเงินในเก๊ะด้านล่าง — ระบบจะคำนวณออกมาทันทีว่า เงินที่เข้ามาวันนี้ ตรง ขาด หรือ เกิน</span>
            </div>
          ) : isBalanced ? (
            <div className="p-4 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" />
                <div>
                  <div className="text-base sm:text-lg font-black flex items-center gap-2">
                    <span>✅ เงินที่เข้ามาวันนี้ ตรงเป๊ะ 100%!</span>
                  </div>
                  <div className="text-xs opacity-90">
                    เงินในเก๊ะมี ฿{actualCounted.toLocaleString()} ตรงกับเงินทอน + ยอดขายสดที่เข้ามารวม ฿{expectedTotal.toLocaleString()} พอดี ไม่มีเงินขาดหรือเกิน
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs block text-emerald-500/80 font-bold">ผลต่าง</span>
                <span className="text-xl sm:text-2xl font-mono font-black text-emerald-500">
                  ฿0
                </span>
              </div>
            </div>
          ) : isSurplus ? (
            <div className="p-4 rounded-xl bg-sky-500/15 border-2 border-sky-500/40 text-sky-600 dark:text-sky-400 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-7 h-7 text-sky-500 shrink-0" />
                <div>
                  <div className="text-base sm:text-lg font-black flex items-center gap-2">
                    <span>📈 เงินในเก๊ะเกิน +฿{difference.toLocaleString()} บาท</span>
                  </div>
                  <div className="text-xs opacity-90">
                    เงินในเก๊ะมี ฿{actualCounted.toLocaleString()} มากกว่ายอดขายรวมเงินทอนที่ควรมี (฿{expectedTotal.toLocaleString()}) ตรวจสอบว่าอาจมีเงินสดที่ไม่ได้เปิดบิล หรือทอนเงินผิด
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs block text-sky-500/80 font-bold">เงินเกิน</span>
                <span className="text-xl sm:text-2xl font-mono font-black text-sky-500">
                  +฿{difference.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-600 dark:text-rose-400 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-7 h-7 text-rose-500 shrink-0" />
                <div>
                  <div className="text-base sm:text-lg font-black flex items-center gap-2">
                    <span>📉 เงินในเก๊ะขาด -฿{Math.abs(difference).toLocaleString()} บาท</span>
                  </div>
                  <div className="text-xs opacity-90">
                    เงินในเก๊ะมี ฿{actualCounted.toLocaleString()} แต่น้อยกว่ายอดขายรวมเงินทอนที่ควรมี (฿{expectedTotal.toLocaleString()}) ตรวจสอบว่าทอนเงินเกิน หรือมีรายจ่ายสดที่ไม่ได้ลงบันทึก
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs block text-rose-500/80 font-bold">เงินขาด</span>
                <span className="text-xl sm:text-2xl font-mono font-black text-rose-500">
                  -฿{Math.abs(difference).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. DENOMINATION LIST: ARRANGED VERTICALLY STRAIGHT DOWN (แถบนับเงินสดแยกใบ/เหรียญ) */}
      <div className={`p-4 rounded-2xl border ${cardBg} shadow-xs space-y-2.5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800/80 gap-2">
          <div className="flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-amber-500" />
            <h2 className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
              แถบนับเงินสดแยกใบ / เหรียญ (เรียงจากมากไปน้อย)
            </h2>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {dayHistory.length > 0 && (
              <button
                type="button"
                onClick={handleLoadLatestRecord}
                className="text-[11px] font-bold text-sky-500 hover:underline flex items-center gap-1"
                title="ดึงข้อมูลการนับครั้งล่าสุดที่บันทึกไว้ในวันนี้"
              >
                <RefreshCw className="w-3 h-3" />
                <span>ดึงค่านับล่าสุด ({dayHistory[0]?.timeStr} น.)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-bold text-rose-400 hover:underline"
            >
              ล้างเป็น 0
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
              className="text-amber-500 hover:underline text-xs font-bold"
            >
              {useManualTotal ? '← กลับไปนับแยกใบ/เหรียญ' : 'หรือกรอกยอดรวมเอง'}
            </button>
          </div>
        </div>

        {/* Manual Total Input if toggled */}
        {useManualTotal && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <label className="text-xs font-bold text-amber-500 block">
              กรอกจำนวนเงินสดทั้งหมดในเก๊ะโดยตรง:
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-zinc-400">฿</span>
              <input
                type="number"
                min="0"
                placeholder="กรอกยอดรวม เช่น 2500"
                value={manualTotalInput}
                onChange={(e) => setManualTotalInput(e.target.value)}
                autoFocus
                className={`w-full pl-8 pr-12 py-2 rounded-lg font-mono font-bold text-lg border ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                } focus:outline-none focus:border-amber-500`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-bold">บาท</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              เมื่อพิมพ์จำนวนเงิน ระบบจะคำนวณเปรียบเทียบกับยอดขายและเงินทอนทันทีด้านบน
            </p>
          </div>
        )}

        {/* Vertical Straight List */}
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
            {/* ตารางกระทบยอดทางบัญชี (Reconciliation Summary for Accurate Accounting) */}
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'} space-y-1.5 text-xs`}>
              <div className="flex items-center justify-between font-bold pb-1.5 border-b border-zinc-200 dark:border-zinc-800 text-zinc-400">
                <span className="flex items-center gap-1.5 text-amber-500">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>สรุปการกระทบยอดบัญชีเงินสดประจำวัน</span>
                </span>
                <span className="text-[10px] font-mono">เชื่อมโยง แดชบอร์ด & รายจ่าย</span>
              </div>

              <div className="space-y-1 pt-1 font-mono text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span className="font-sans">1. เงินทอนเปิดเก๊ะ:</span>
                  <span>฿{openingFloat.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-500">
                  <span className="font-sans">2. ยอดขายสดหน้าร้านตาม POS (+):</span>
                  <span>+฿{cashSalesTotal.toLocaleString()} ({cashBills.length} บิล)</span>
                </div>
                <div className="flex justify-between text-rose-500">
                  <span className="font-sans">3. รายจ่ายร้านที่จ่ายสดจากเก๊ะ (-):</span>
                  <span>-฿{cashExpensesTotal.toLocaleString()} ({cashExpenses.length} รายการ)</span>
                </div>
                <div className="flex justify-between font-bold text-amber-500 pt-1 border-t border-dashed border-zinc-700">
                  <span className="font-sans">4. เงินสดคงเหลือตามระบบที่ต้องมี (Book Cash):</span>
                  <span>฿{expectedTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-zinc-200">
                  <span className="font-sans">5. เงินสดที่ตรวจนับได้จริงในเก๊ะ (Physical Cash):</span>
                  <span>฿{actualCounted.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between font-bold pt-1 border-t border-zinc-700 ${
                  !hasCounted
                    ? 'text-zinc-500'
                    : isBalanced
                    ? 'text-emerald-500'
                    : isSurplus
                    ? 'text-sky-400'
                    : 'text-rose-400'
                }`}>
                  <span className="font-sans">6. ผลต่างกระทบยอดทางบัญชี:</span>
                  <span>
                    {!hasCounted
                      ? 'รอตรวจนับ'
                      : isBalanced
                      ? '✅ ตรงตามระบบ 100%'
                      : isSurplus
                      ? `📈 เงินสดเกินบัญชี +฿${difference.toLocaleString()} (บันทึกรายได้เบ็ดเตล็ด)`
                      : `📉 เงินสดขาดบัญชี -฿${Math.abs(difference).toLocaleString()} (บันทึกค่าใช้จ่ายขาดเงินสด)`}
                  </span>
                </div>
              </div>
            </div>

            {/* Cash Bills */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-500">
                  บิลขายเงินสด (+฿{cashSalesTotal.toLocaleString()})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setActiveTab('dashboard');
                  }}
                  className="text-[11px] font-bold text-sky-500 hover:underline flex items-center gap-0.5"
                >
                  <span>ดูบิลทั้งหมดในแดชบอร์ด ({dayBills.length} บิล)</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
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
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-rose-500">
                  รายจ่ายเงินสด (-฿{cashExpensesTotal.toLocaleString()})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setActiveTab('expenses');
                  }}
                  className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-0.5"
                >
                  <span>+ บันทึกรายจ่ายเงินสด</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
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
