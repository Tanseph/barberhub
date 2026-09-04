import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SaleBill, PaymentMethod } from '../types';
import {
  LayoutDashboard,
  DollarSign,
  CreditCard,
  Banknote,
  Scissors,
  Receipt,
  User,
  Eye,
  Edit,
  Trash2,
  Search,
  FileSpreadsheet,
  BarChart3,
  PieChart,
  FileText,
  Download,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  TrendingUp,
  CalendarDays,
  Filter,
  Link2,
  Users,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { sounds } from '../utils/sound';
import { ModalAccountingReport } from './ModalAccountingReport';
import { ModalDayBills } from './ModalDayBills';
import { ModalMergeBills } from './ModalMergeBills';
import { MonthlyRevenueChart } from './MonthlyRevenueChart';
import {
  getBillingCycleInfo,
  filterBillsByBillingCycle,
  filterExpensesByBillingCycle,
  isDateInBillingCycle,
} from '../utils/billingCycle';

// Helper: Format Thai Date with Day of Week
const formatThaiDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const dateObj = new Date(y, m - 1, d);
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  const weekdayName = dateObj.toLocaleDateString('th-TH', { weekday: 'short' });
  const thaiYear = y + 543;
  return `${weekdayName}. ${d} ${thaiMonths[m - 1]} ${thaiYear}`;
};

// Helper: Shift date string YYYY-MM-DD by delta days (+1, -1, etc.)
const shiftDateStr = (dateStr: string, deltaDays: number): string => {
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

// Helper: Shift month string YYYY-MM by delta months
const shiftMonthStr = (monthStr: string, deltaMonths: number): string => {
  try {
    const [y, m] = monthStr.split('-').map(Number);
    const date = new Date(y, m - 1 + deltaMonths, 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    return `${newY}-${newM}`;
  } catch {
    return monthStr;
  }
};

export const TabDashboard: React.FC = () => {
  const {
    bills,
    expenses,
    barbers,
    settings,
    theme,
    updateSaleBill,
    deleteSaleBill,
    openReceiptModal,
    openEditBillModal,
    openConfirm,
    showToast,
  } = useApp();

  const isDark = theme.isDark ?? true;

  // View state: daily vs monthly
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  // Sub-tab view inside dashboard for easy organization:
  // 'ledger' (Bills / Daily Table), 'barbers' (Barber Payroll), 'analytics' (Charts), 'accounting' (Statement)
  const [activeSection, setActiveSection] = useState<'ledger' | 'barbers' | 'analytics' | 'accounting'>('ledger');

  // Dates filters
  const today = new Date();
  const defaultDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const defaultMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState<string>(defaultDateStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonthStr);

  // Merge modal state
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeTargetBillId, setMergeTargetBillId] = useState<string | undefined>(undefined);
  const [mergeTargetGroupId, setMergeTargetGroupId] = useState<string | undefined>(undefined);

  const handleOpenMerge = (billId?: string, groupId?: string) => {
    setMergeTargetBillId(billId);
    setMergeTargetGroupId(groupId);
    setIsMergeModalOpen(true);
  };

  // Accounting statement modal state
  const [isAccountingModalOpen, setIsAccountingModalOpen] = useState(false);

  // Day detail modal state (for monthly view drilldown)
  const [inspectDayDate, setInspectDayDate] = useState<string | null>(null);

  // Monthly table filter: show all days (1 to end of month) or only active days with transactions
  const [monthlyShowOnlyActive, setMonthlyShowOnlyActive] = useState<boolean>(false);

  // Search & filter in daily bills table
  const [billSearch, setBillSearch] = useState<string>('');
  const [barberFilter, setBarberFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Billing cycle calculations
  const cutoffDay = settings.billingCycleCutoffDay ?? 0;
  const billingCycleInfo = useMemo(() => getBillingCycleInfo(selectedMonth, cutoffDay), [selectedMonth, cutoffDay]);

  // Filtered bills for the current selected period (Daily vs Monthly)
  const allPeriodBills = useMemo(() => {
    return bills.filter((b) =>
      viewMode === 'daily'
        ? b.dateStr === selectedDate
        : isDateInBillingCycle(b.dateStr, selectedMonth, cutoffDay)
    );
  }, [bills, viewMode, selectedDate, selectedMonth, cutoffDay]);

  // Filtered shop expenses for the current selected period
  const allPeriodExpenses = useMemo(() => {
    return expenses.filter((e) =>
      viewMode === 'daily'
        ? e.dateStr === selectedDate
        : isDateInBillingCycle(e.dateStr, selectedMonth, cutoffDay)
    );
  }, [expenses, viewMode, selectedDate, selectedMonth, cutoffDay]);

  // Today specific calculations
  const todayBills = useMemo(() => {
    return bills.filter((b) => b.dateStr === defaultDateStr);
  }, [bills, defaultDateStr]);
  const todayHeads = todayBills.length;
  const todayGross = todayBills.reduce((s, b) => s + b.grossTotal, 0);

  // Financial calculations for the selected period
  const totalHaircutRev = allPeriodBills.reduce((s, b) => s + b.haircutFee, 0);
  const totalChemicalRev = allPeriodBills.reduce((s, b) => s + b.chemicalFee, 0);
  const totalProductsRev = allPeriodBills.reduce((s, b) => s + b.totalProductsFee, 0);
  const totalTipsRev = allPeriodBills.reduce((s, b) => s + b.tipFee, 0);
  const totalGrossRevenue = allPeriodBills.reduce((s, b) => s + b.grossTotal, 0);

  const totalTransfer = allPeriodBills.reduce((s, b) => s + b.transferAmount, 0);
  const totalCash = allPeriodBills.reduce((s, b) => s + b.cashAmount, 0);

  const periodHeads = allPeriodBills.length;
  const totalHaircuts = allPeriodBills.filter((b) => b.haircutFee > 0).length;
  const totalChemicals = allPeriodBills.filter((b) => b.chemicalFee > 0).length;
  const periodTransferBills = allPeriodBills.filter((b) => b.paymentMethod === 'transfer' || (b.paymentMethod === 'split' && b.transferAmount > 0)).length;
  const periodCashBills = allPeriodBills.filter((b) => b.paymentMethod === 'cash' || (b.paymentMethod === 'split' && b.cashAmount > 0)).length;

  const totalHaircutComm = allPeriodBills.reduce((s, b) => s + b.commission.barberHaircutEarned, 0);
  const totalChemicalComm = allPeriodBills.reduce((s, b) => s + b.commission.barberChemicalEarned, 0);
  const totalProductsComm = allPeriodBills.reduce((s, b) => s + b.commission.barberProductEarned, 0);
  const totalTipsPayout = allPeriodBills.reduce((s, b) => s + b.commission.barberTipEarned, 0);
  const totalBarberPayout = allPeriodBills.reduce((s, b) => s + b.commission.barberTotalEarned, 0);

  const totalShopExpenses = allPeriodExpenses.reduce((s, e) => s + e.amount, 0);
  const totalShopNet = allPeriodBills.reduce((s, b) => s + b.commission.shopNetEarned, 0);
  const finalShopNetAfterExpenses = totalShopNet - totalShopExpenses;
  const shopProfitMargin = totalGrossRevenue > 0 ? ((finalShopNetAfterExpenses / totalGrossRevenue) * 100).toFixed(1) : '0';
  const avgTicketValue = allPeriodBills.length > 0 ? Math.round(totalGrossRevenue / allPeriodBills.length) : 0;

  // Transfer vs Cash percentages
  const transferPercent = totalGrossRevenue > 0 ? Math.round((totalTransfer / totalGrossRevenue) * 100) : 0;
  const cashPercent = totalGrossRevenue > 0 ? 100 - transferPercent : 0;

  // Filtered bills for the daily ledger table (with search & filters applied)
  // บิลล่าสุดอยู่บนสุด, บิลแรกสุดของวันอยู่ล่างสุด
  const filteredDailyBills = useMemo(() => {
    return allPeriodBills
      .filter((b) => {
        if (barberFilter !== 'all' && b.barberId !== barberFilter) return false;
        if (paymentFilter !== 'all' && b.paymentMethod !== paymentFilter) return false;
        if (billSearch.trim()) {
          const query = billSearch.toLowerCase();
          const matchesBillNum = b.billNumber.toLowerCase().includes(query);
          const matchesCust = b.customerName.toLowerCase().includes(query);
          const matchesPhone = b.customerPhone?.toLowerCase().includes(query);
          const matchesBarber = b.barberName.toLowerCase().includes(query);
          const matchesNotes = b.notes?.toLowerCase().includes(query);
          return Boolean(matchesBillNum || matchesCust || matchesPhone || matchesBarber || matchesNotes);
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;
        if (timeB !== timeA) return timeB - timeA;
        return b.billNumber.localeCompare(a.billNumber);
      });
  }, [allPeriodBills, barberFilter, paymentFilter, billSearch]);

  // Monthly breakdown day by day
  const monthlyDaysSummary = useMemo(() => {
    if (viewMode !== 'monthly') return [];

    return billingCycleInfo.days.map((day) => {
      const dayBills = bills.filter((b) => b.dateStr === day.dateStr);
      const dayExpensesList = expenses.filter((e) => e.dateStr === day.dateStr);

      const billCount = dayBills.length;
      const headsCount = dayBills.length;
      const haircutCount = dayBills.filter((b) => b.haircutFee > 0).length;
      const transferBillCount = dayBills.filter((b) => b.paymentMethod === 'transfer' || (b.paymentMethod === 'split' && b.transferAmount > 0)).length;
      const cashBillCount = dayBills.filter((b) => b.paymentMethod === 'cash' || (b.paymentMethod === 'split' && b.cashAmount > 0)).length;
      const transferAmount = dayBills.reduce((s, b) => s + b.transferAmount, 0);
      const cashAmount = dayBills.reduce((s, b) => s + b.cashAmount, 0);
      const grossRevenue = dayBills.reduce((s, b) => s + b.grossTotal, 0);
      const barberPayroll = dayBills.reduce((s, b) => s + b.commission.barberTotalEarned, 0);
      const shopExpenseAmount = dayExpensesList.reduce((s, e) => s + e.amount, 0);
      const totalExpensesVal = barberPayroll + shopExpenseAmount;
      const shopCommissionGross = dayBills.reduce((s, b) => s + b.commission.shopNetEarned, 0);
      const shopNet = shopCommissionGross - shopExpenseAmount;

      return {
        dayNumber: day.dayNumber,
        cycleDayIndex: day.cycleDayIndex,
        isPrevMonth: day.isPrevMonth,
        dateStr: day.dateStr,
        dayName: day.dayName,
        dayFullDateTh: day.dayFullDateTh,
        billCount,
        headsCount,
        haircutCount,
        transferBillCount,
        cashBillCount,
        expenseCount: dayExpensesList.length,
        transferAmount,
        cashAmount,
        grossRevenue,
        barberPayroll,
        shopExpenseAmount,
        totalExpenses: totalExpensesVal,
        shopNet,
      };
    });
  }, [viewMode, billingCycleInfo, bills, expenses]);

  const filteredMonthlyDays = useMemo(() => {
    if (!monthlyShowOnlyActive) return monthlyDaysSummary;
    return monthlyDaysSummary.filter((d) => d.billCount > 0 || d.expenseCount > 0);
  }, [monthlyDaysSummary, monthlyShowOnlyActive]);

  // Per-barber summary
  const barberSummaries = useMemo(() => {
    return barbers.map((barber) => {
      const barberBills = allPeriodBills.filter((b) => b.barberId === barber.id);

      const haircutRevenue = barberBills.reduce((sum, b) => sum + b.haircutFee, 0);
      const chemicalRevenue = barberBills.reduce((sum, b) => sum + b.chemicalFee, 0);
      const productRevenue = barberBills.reduce((sum, b) => sum + b.totalProductsFee, 0);
      const tipRevenue = barberBills.reduce((sum, b) => sum + b.tipFee, 0);
      const gross = barberBills.reduce((sum, b) => sum + b.grossTotal, 0);

      const haircutEarned = barberBills.reduce((sum, b) => sum + b.commission.barberHaircutEarned, 0);
      const chemicalEarned = barberBills.reduce((sum, b) => sum + b.commission.barberChemicalEarned, 0);
      const productEarned = barberBills.reduce((sum, b) => sum + b.commission.barberProductEarned, 0);
      const tipEarned = barberBills.reduce((sum, b) => sum + b.commission.barberTipEarned, 0);
      const totalEarned = haircutEarned + chemicalEarned + productEarned + tipEarned;
      const shopEarned = gross - totalEarned;
      const headsCut = barberBills.filter((b) => b.haircutFee > 0).length;

      return {
        barber,
        billCount: barberBills.length,
        headsCut,
        haircutRevenue,
        chemicalRevenue,
        productRevenue,
        tipRevenue,
        gross,
        haircutEarned,
        chemicalEarned,
        productEarned,
        tipEarned,
        totalEarned,
        shopEarned,
      };
    });
  }, [barbers, allPeriodBills]);

  // Quick switch payment method handler
  const handleQuickPaymentSwitch = (bill: SaleBill, newMethod: PaymentMethod) => {
    if (bill.paymentMethod === newMethod) return;

    let newCash = 0;
    let newTransfer = 0;

    if (newMethod === 'cash') {
      newCash = bill.grossTotal;
      newTransfer = 0;
    } else if (newMethod === 'transfer') {
      newCash = 0;
      newTransfer = bill.grossTotal;
    } else if (newMethod === 'split') {
      newCash = Math.round(bill.grossTotal / 2);
      newTransfer = bill.grossTotal - newCash;
    }

    updateSaleBill(bill.id, {
      paymentMethod: newMethod,
      cashAmount: newCash,
      transferAmount: newTransfer,
    });

    const methodNameTh =
      newMethod === 'cash' ? 'เงินสด (💵)' : newMethod === 'transfer' ? 'โอนเงิน (📱)' : 'สลับ (สด+โอน 🔀)';

    showToast(
      'สลับวิธีชำระเงินเรียบร้อย 🔄',
      `บิล ${bill.billNumber} เปลี่ยนเป็น "${methodNameTh}" เรียบร้อย`,
      'success',
      '💳'
    );
  };

  // Delete bill handler
  const handleDeleteClick = (bill: SaleBill) => {
    openConfirm({
      title: 'ต้องการลบบิลนี้ใช่หรือไม่? 🗑️',
      message: `คุณกำลังจะลบบิลเลขที่ "${bill.billNumber}" (ลูกค้า: ${bill.customerName}, ยอดเงิน: ${settings.currencySymbol}${bill.grossTotal.toLocaleString()})\n\nเมื่อลบแล้ว ยอดขาย สถิติ และส่วนแบ่งของช่างจะถูกคำนวณใหม่ทันที`,
      confirmText: 'ลบบิลนี้เลย',
      cancelText: 'เก็บไว้ก่อน',
      confirmColor: 'bg-rose-600 hover:bg-rose-500',
      icon: '✂️',
      onConfirm: () => {
        deleteSaleBill(bill.id);
      },
    });
  };

  // Switch to daily view from day drilldown
  const handleSwitchToDailyView = (targetDateStr: string) => {
    setSelectedDate(targetDateStr);
    setViewMode('daily');
    setActiveSection('ledger');
    showToast('สลับดูแดชบอร์ดรายวัน 📅', `เปิดหน้ารายการประจำวันที่ ${targetDateStr}`, 'info', '📅');
  };

  // Export CSV
  const handleExportCSV = () => {
    sounds.playClick();
    if (viewMode === 'monthly') {
      const headers = [
        'วันที่',
        'วัน',
        'จำนวนบิล',
        'ยอดเงินโอน',
        'ยอดเงินสด',
        'รายรับรวม (Gross)',
        'รายจ่ายรวม (จ่ายช่าง)',
        'รายรับสุทธิร้าน (Net)',
      ];

      const rows = monthlyDaysSummary.map((d) => [
        d.dateStr,
        d.dayName,
        d.billCount,
        d.transferAmount,
        d.cashAmount,
        d.grossRevenue,
        d.totalExpenses,
        d.shopNet,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Monthly_Daily_Summary_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = [
        'เลขที่บิล',
        'วันที่',
        'เวลา',
        'ลูกค้า',
        'เบอร์โทร',
        'ช่าง',
        'ค่าตัดผม',
        'ค่าเคมี',
        'ค่าสินค้า',
        'ค่าทิป',
        'ยอดรวมบิล',
        'วิธีชำระเงิน',
        'ยอดเงินสด',
        'ยอดเงินโอน',
        'ส่วนแบ่งช่าง',
        'ส่วนของร้าน',
        'หมายเหตุ',
      ];

      const rows = allPeriodBills.map((b) => [
        b.billNumber,
        b.dateStr,
        b.timeStr,
        `"${b.customerName.replace(/"/g, '""')}"`,
        b.customerPhone || '',
        `"${b.barberName.replace(/"/g, '""')}"`,
        b.haircutFee,
        b.chemicalFee,
        b.totalProductsFee,
        b.tipFee,
        b.grossTotal,
        b.paymentMethod === 'transfer' ? 'เงินโอน' : b.paymentMethod === 'cash' ? 'เงินสด' : 'สลับ (สด+โอน)',
        b.cashAmount,
        b.transferAmount,
        b.commission.barberTotalEarned,
        b.commission.shopNetEarned,
        `"${(b.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Accounting_Ledger_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Hourly chart bars
  const chartBars = useMemo(() => {
    if (viewMode === 'daily') {
      const slots = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00'];
      return slots.map((timeLabel) => {
        const nextHour = parseInt(timeLabel) + 2;
        const matching = allPeriodBills.filter((b) => {
          const hour = parseInt(b.timeStr.split(':')[0]);
          return hour >= parseInt(timeLabel) && hour < nextHour;
        });
        const total = matching.reduce((sum, b) => sum + b.grossTotal, 0);
        return { label: timeLabel, total, count: matching.length };
      });
    } else {
      return monthlyDaysSummary
        .map((d) => ({
          label: `${d.dayNumber}`,
          dateStr: d.dateStr,
          total: d.grossRevenue,
          count: d.billCount,
        }))
        .filter((d, i) => i < 15 || d.total > 0);
    }
  }, [viewMode, allPeriodBills, monthlyDaysSummary]);

  const maxChartVal = Math.max(...chartBars.map((c) => c.total), 1000);

  // Styling helpers
  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';
  const borderSubtle = isDark ? 'border-zinc-800' : 'border-slate-200';
  const tableHeaderBg = isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-slate-50 text-slate-600 border-slate-200';
  const tableRowBg = isDark ? 'bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/50' : 'bg-white text-slate-800 hover:bg-slate-50/80';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
      {/* 1. TOP HEADER & CONTROL BAR */}
      <div className={`${theme.bgCard} rounded-2xl p-4 sm:p-5 border ${borderSubtle} shadow-xs`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Header Title */}
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <h2 className={`text-base sm:text-lg font-bold ${headingText}`}>
                สรุปยอดขาย & แดชบอร์ดร้าน
              </h2>
            </div>
            <p className={`text-xs ${mutedText} mt-1`}>
              {viewMode === 'daily'
                ? `สรุปยอดประจำวัน: ${formatThaiDateDisplay(selectedDate)}`
                : `รอบบิล: ${billingCycleInfo.fullLabel} (${billingCycleInfo.cutoffDescription})`}
            </p>
          </div>

          {/* Quick Actions & Date Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* View Mode Toggle: Daily vs Monthly */}
            <div className={`flex rounded-xl p-1 border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'}`}>
              <button
                onClick={() => {
                  sounds.playClick();
                  setViewMode('daily');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all btn-tactile ${
                  viewMode === 'daily'
                    ? isDark ? 'bg-amber-500 text-zinc-950 shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📅 รายวัน
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  setViewMode('monthly');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all btn-tactile ${
                  viewMode === 'monthly'
                    ? isDark ? 'bg-amber-500 text-zinc-950 shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📊 รายเดือน
              </button>
            </div>

            {/* Date Pickers with fast Steppers (◀ / ▶) */}
            {viewMode === 'daily' ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setSelectedDate(shiftDateStr(selectedDate, -1));
                  }}
                  title="วันก่อนหน้า"
                  className={`p-1.5 rounded-xl border text-xs font-bold transition-all btn-tactile ${
                    isDark ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      sounds.playClick();
                      setSelectedDate(e.target.value);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border focus:outline-none ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-amber-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-slate-800'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setSelectedDate(shiftDateStr(selectedDate, 1));
                  }}
                  title="วันถัดไป"
                  className={`p-1.5 rounded-xl border text-xs font-bold transition-all btn-tactile ${
                    isDark ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setSelectedDate(defaultDateStr);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border btn-tactile ${
                    selectedDate === defaultDateStr
                      ? isDark
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                      : isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  วันนี้
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setSelectedMonth(shiftMonthStr(selectedMonth, -1));
                  }}
                  title="เดือนก่อนหน้า"
                  className={`p-1.5 rounded-xl border text-xs font-bold transition-all btn-tactile ${
                    isDark ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    if (e.target.value) {
                      sounds.playClick();
                      setSelectedMonth(e.target.value);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border focus:outline-none ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-amber-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-slate-800'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setSelectedMonth(shiftMonthStr(selectedMonth, 1));
                  }}
                  title="เดือนถัดไป"
                  className={`p-1.5 rounded-xl border text-xs font-bold transition-all btn-tactile ${
                    isDark ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setSelectedMonth(defaultMonthStr);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border btn-tactile ${
                    selectedMonth === defaultMonthStr
                      ? isDark
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                      : isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  เดือนนี้
                </button>
              </div>
            )}

            {/* Quick Export / Accounting Report Button */}
            <div className="flex items-center gap-1.5 ml-auto lg:ml-0">
              <button
                onClick={handleExportCSV}
                title="ดาวน์โหลดไฟล์ CSV สำหรับ Excel"
                className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all btn-tactile ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">CSV</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  setIsAccountingModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all btn-tactile"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>สรุปบัญชี (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FOUR HIGH-IMPACT HERO KPI CARDS (CLEAN & INTUITIVE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: ยอดขายรวม (Gross Sales) */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-zinc-900/90 border-amber-500/25' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold ${mutedText}`}>
              💰 ยอดขายรวมทั้งหมด
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600">
              {viewMode === 'daily' ? 'รายวัน' : 'รอบบิล'}
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-600 tracking-tight">
            {settings.currencySymbol}{totalGrossRevenue.toLocaleString()}
          </div>

          {/* Transfer vs Cash Visual Progress bar */}
          <div className="mt-3 pt-2.5 border-t border-zinc-800/40 dark:border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-sky-600 font-bold flex items-center gap-1">
                📱 โอน ฿{totalTransfer.toLocaleString()} ({transferPercent}%)
              </span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                💵 สด ฿{totalCash.toLocaleString()} ({cashPercent}%)
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-800/30 overflow-hidden flex">
              <div style={{ width: `${transferPercent}%` }} className="bg-sky-500 h-full" />
              <div style={{ width: `${cashPercent}%` }} className="bg-emerald-500 h-full" />
            </div>
          </div>
        </div>

        {/* Card 2: กำไรสุทธิร้าน (Shop Net Income) */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-zinc-900/90 border-purple-500/25' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold ${mutedText}`}>
              🏢 กำไรสุทธิส่วนของร้าน
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-purple-500/15 text-purple-600">
              กำไร {shopProfitMargin}%
            </span>
          </div>

          <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
            finalShopNetAfterExpenses >= 0 ? 'text-purple-600' : 'text-rose-500'
          }`}>
            {settings.currencySymbol}{finalShopNetAfterExpenses.toLocaleString()}
          </div>

          <div className={`mt-3 pt-2.5 border-t border-zinc-800/40 dark:border-zinc-800/80 flex items-center justify-between text-[11px] ${mutedText}`}>
            <span>ก่อนหัก คชจ. ร้าน: ฿{totalShopNet.toLocaleString()}</span>
            {totalShopExpenses > 0 && (
              <span className="text-rose-500 font-mono">คชจ. -฿{totalShopExpenses.toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Card 3: รวมจ่ายช่าง (Barber Payroll) */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-zinc-900/90 border-rose-500/25' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold ${mutedText}`}>
              ✂️ จ่ายส่วนแบ่งช่าง (Payroll)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-500">
              {barbers.length} ช่าง
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-500 tracking-tight">
            {settings.currencySymbol}{totalBarberPayout.toLocaleString()}
          </div>

          <div className={`mt-3 pt-2.5 border-t border-zinc-800/40 dark:border-zinc-800/80 flex items-center justify-between text-[11px] ${mutedText}`}>
            <span>ส่วนแบ่งตัด/เคมี/ของ: ฿{(totalHaircutComm + totalChemicalComm + totalProductsComm).toLocaleString()}</span>
            {totalTipsPayout > 0 && (
              <span className="text-amber-600 font-mono">ทิป ฿{totalTipsPayout.toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Card 4: จำนวนลูกค้า (Customer Count) */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-zinc-900/90 border-sky-500/25' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold ${mutedText}`}>
              💈 จำนวนลูกค้า & บิล
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-500/15 text-sky-600">
              เฉลี่ย ฿{avgTicketValue}/บิล
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-black font-mono text-sky-600 tracking-tight">
            {periodHeads} <span className="text-sm font-normal text-zinc-400">หัว</span>
            <span className={`text-xs font-medium ${mutedText} ml-2 font-sans`}>({allPeriodBills.length} บิล)</span>
          </div>

          <div className={`mt-3 pt-2.5 border-t border-zinc-800/40 dark:border-zinc-800/80 flex items-center justify-between text-[11px] ${mutedText}`}>
            <span>ตัดผม: <strong className="text-zinc-200">{totalHaircuts}</strong> หัว</span>
            <span>เคมี/ทำสี: <strong className="text-zinc-200">{totalChemicals}</strong> รายการ</span>
          </div>
        </div>
      </div>

      {/* 3. SECTION SELECTOR TABS (CLEAN NAVIGATION) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            setActiveSection('ledger');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all btn-tactile flex items-center gap-1.5 border shrink-0 ${
            activeSection === 'ledger'
              ? isDark
                ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                : 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : isDark
              ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>{viewMode === 'daily' ? `รายการบิล (${filteredDailyBills.length})` : 'ตารางสรุปรายวัน'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            setActiveSection('barbers');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all btn-tactile flex items-center gap-1.5 border shrink-0 ${
            activeSection === 'barbers'
              ? isDark
                ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                : 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : isDark
              ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>สรุปรายได้ช่าง ({barbers.length} คน)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            setActiveSection('analytics');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all btn-tactile flex items-center gap-1.5 border shrink-0 ${
            activeSection === 'analytics'
              ? isDark
                ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                : 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : isDark
              ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>กราฟยอดขาย & สถิติ</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            setActiveSection('accounting');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all btn-tactile flex items-center gap-1.5 border shrink-0 ${
            activeSection === 'accounting'
              ? isDark
                ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                : 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : isDark
              ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>งบสรุปทางบัญชี</span>
        </button>
      </div>

      {/* 4. MAIN CONTENT PANELS (BASED ON ACTIVE SUB-TAB) */}

      {/* TAB A: BILLS / DAILY LEDGER */}
      {activeSection === 'ledger' && (
        <>
          {viewMode === 'monthly' ? (
            /* MONTHLY VIEW: ตารางสรุปรายวันประจำรอบบิล */
            <div className={`${theme.bgCard} rounded-2xl p-4 sm:p-5 border ${borderSubtle} space-y-4`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className={`text-sm sm:text-base font-bold ${headingText} flex items-center gap-2`}>
                    <CalendarDays className="w-4 h-4 text-amber-600" />
                    <span>สรุปรายรับ-จ่ายรายวันในรอบบิล ({billingCycleInfo.fullLabel})</span>
                  </h3>
                  <p className={`text-xs ${mutedText}`}>
                    ช่วงวันที่ {billingCycleInfo.startDate} ถึง {billingCycleInfo.endDate} • กดปุ่ม "ดูรายการ" เพื่อดูรายละเอียดของวันนั้น
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setMonthlyShowOnlyActive(!monthlyShowOnlyActive);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all btn-tactile ${
                    monthlyShowOnlyActive
                      ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                      : isDark
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{monthlyShowOnlyActive ? 'เฉพาะวันที่มีรายการ' : 'แสดงทุกวัน'}</span>
                </button>
              </div>

              <div className={`overflow-x-auto rounded-xl border ${borderSubtle}`}>
                <table className="w-full text-left text-xs">
                  <thead className={`border-b font-semibold ${tableHeaderBg}`}>
                    <tr>
                      <th className="py-3 px-3">วันที่</th>
                      <th className="py-3 px-2 text-center">ลูกค้า</th>
                      <th className="py-3 px-3 text-right text-sky-600">โอน (📱)</th>
                      <th className="py-3 px-3 text-right text-emerald-600">เงินสด (💵)</th>
                      <th className="py-3 px-3 text-right font-bold text-amber-600">ยอดรวม</th>
                      <th className="py-3 px-3 text-right text-rose-500">จ่ายช่าง</th>
                      <th className="py-3 px-3 text-right text-purple-600 font-bold">กำไรร้าน</th>
                      <th className="py-3 px-3 text-center">ดูรายการ</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-200/80'}`}>
                    {filteredMonthlyDays.map((day) => {
                      const hasActivity = day.billCount > 0 || day.expenseCount > 0;
                      const isDayToday = day.dateStr === defaultDateStr;

                      return (
                        <tr
                          key={day.dateStr}
                          className={`${tableRowBg} ${isDayToday ? (isDark ? 'bg-amber-500/10' : 'bg-amber-50/70') : ''}`}
                        >
                          <td className="py-2.5 px-3 font-semibold">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                                isDayToday
                                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                                  : isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {day.dayNumber}
                              </span>
                              <span className={headingText}>
                                {day.dayFullDateTh}
                              </span>
                              {isDayToday && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 font-bold">
                                  วันนี้
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-2 text-center font-mono font-bold">
                            {day.headsCount > 0 ? (
                              <span className="text-amber-500">{day.headsCount} หัว</span>
                            ) : (
                              <span className="text-zinc-500">-</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-sky-600">
                            {day.transferAmount > 0 ? `${settings.currencySymbol}${day.transferAmount.toLocaleString()}` : '-'}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                            {day.cashAmount > 0 ? `${settings.currencySymbol}${day.cashAmount.toLocaleString()}` : '-'}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                            {day.grossRevenue > 0 ? `${settings.currencySymbol}${day.grossRevenue.toLocaleString()}` : '-'}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-rose-500">
                            {day.barberPayroll > 0 ? `${settings.currencySymbol}${day.barberPayroll.toLocaleString()}` : '-'}
                          </td>

                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${day.shopNet < 0 ? 'text-rose-500' : 'text-purple-600'}`}>
                            {hasActivity ? `${settings.currencySymbol}${day.shopNet.toLocaleString()}` : '-'}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            {hasActivity ? (
                              <button
                                type="button"
                                onClick={() => {
                                  sounds.playClick();
                                  setInspectDayDate(day.dateStr);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all btn-tactile inline-flex items-center gap-1 ${
                                  isDark
                                    ? 'bg-zinc-800 hover:bg-amber-500/20 text-zinc-200 hover:text-amber-400 border border-zinc-700'
                                    : 'bg-slate-100 hover:bg-amber-50 text-slate-800 hover:text-amber-800 border border-slate-200'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{day.billCount} บิล</span>
                              </button>
                            ) : (
                              <span className="text-zinc-500 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* DAILY VIEW: รายการบิลของวันนั้น */
            <div className={`${theme.bgCard} rounded-2xl p-4 sm:p-5 border ${borderSubtle} space-y-4`}>
              {/* Table Toolbar: Search, Filters, Merge */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <h3 className={`text-sm sm:text-base font-bold ${headingText} flex items-center gap-2`}>
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <span>รายการบิลประจำวันที่ {formatThaiDateDisplay(selectedDate)}</span>
                  </h3>
                  <p className={`text-xs ${mutedText}`}>
                    บันทึกทั้งหมด {filteredDailyBills.length} บิล • สามารถกดสลับเงินสด/โอนด่วน แก้ไข หรือลบบิลได้
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => handleOpenMerge()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors btn-tactile"
                    title="รวมบิลชำระด้วยกัน"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>รวมบิล</span>
                  </button>

                  <div className="relative flex-1 sm:w-44">
                    <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${mutedText}`} />
                    <input
                      type="text"
                      placeholder="ค้นหาบิล / ลูกค้า..."
                      value={billSearch}
                      onChange={(e) => setBillSearch(e.target.value)}
                      className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200 focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <select
                    value={barberFilter}
                    onChange={(e) => setBarberFilter(e.target.value)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="all">ช่างทุกคน</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nickname}
                      </option>
                    ))}
                  </select>

                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="all">ทุกช่องทางชำระ</option>
                    <option value="transfer">📱 เงินโอน</option>
                    <option value="cash">💵 เงินสด</option>
                    <option value="split">🔀 ผสม (สด+โอน)</option>
                  </select>
                </div>
              </div>

              {/* Bills List Table */}
              <div className={`overflow-x-auto rounded-xl border ${borderSubtle}`}>
                <table className="w-full text-left text-xs">
                  <thead className={`border-b font-semibold ${tableHeaderBg}`}>
                    <tr>
                      <th className="py-3 px-3">บิล / เวลา</th>
                      <th className="py-3 px-3">ลูกค้า</th>
                      <th className="py-3 px-3">ช่าง</th>
                      <th className="py-3 px-3 text-right">ตัดผม</th>
                      <th className="py-3 px-3 text-right">เคมี</th>
                      <th className="py-3 px-3 text-right">สินค้า</th>
                      <th className="py-3 px-3 text-right">ทิป</th>
                      <th className="py-3 px-3 text-right font-bold text-amber-600">ยอดรวม</th>
                      <th className="py-3 px-3 text-center">วิธีชำระ (สลับด่วน)</th>
                      <th className="py-3 px-3 text-right text-rose-500">จ่ายช่าง</th>
                      <th className="py-3 px-3 text-right text-purple-600">กำไรร้าน</th>
                      <th className="py-3 px-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-200/80'}`}>
                    {filteredDailyBills.length === 0 ? (
                      <tr>
                        <td colSpan={12} className={`py-8 text-center ${mutedText}`}>
                          ไม่พบบันทึกบิลในวันที่ {selectedDate}
                        </td>
                      </tr>
                    ) : (
                      filteredDailyBills.map((bill) => (
                        <tr key={bill.id} className={tableRowBg}>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-amber-600 block">{bill.billNumber}</span>
                            <span className={`text-[10px] ${mutedText}`}>{bill.timeStr} น.</span>
                          </td>

                          <td className={`py-2.5 px-3 font-semibold ${headingText}`}>
                            <span>{bill.customerName}</span>
                            {bill.mergedGroupId && (
                              <div className="mt-0.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                                  <Link2 className="w-2.5 h-2.5" />
                                  <span>{bill.mergedGroupName || 'รวมบิล'}</span>
                                </span>
                              </div>
                            )}
                          </td>

                          <td className={`py-2.5 px-3 font-medium ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                            {bill.barberName}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono">
                            {bill.haircutFee > 0 ? `${settings.currencySymbol}${bill.haircutFee.toLocaleString()}` : '-'}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono">
                            {bill.chemicalFee > 0 ? `${settings.currencySymbol}${bill.chemicalFee.toLocaleString()}` : '-'}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono">
                            {bill.totalProductsFee > 0 ? `${settings.currencySymbol}${bill.totalProductsFee.toLocaleString()}` : '-'}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-amber-600">
                            {bill.tipFee > 0 ? `${settings.currencySymbol}${bill.tipFee.toLocaleString()}` : '-'}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                            {settings.currencySymbol}{bill.grossTotal.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1 p-0.5 rounded-lg border border-zinc-700/60 bg-zinc-950/60">
                              <button
                                type="button"
                                onClick={() => handleQuickPaymentSwitch(bill, 'transfer')}
                                title="สลับเป็นเงินโอน (📱)"
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                  bill.paymentMethod === 'transfer'
                                    ? 'bg-sky-500 text-white shadow-xs'
                                    : 'text-zinc-400 hover:text-sky-400'
                                }`}
                              >
                                📱 โอน
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPaymentSwitch(bill, 'cash')}
                                title="สลับเป็นเงินสด (💵)"
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                  bill.paymentMethod === 'cash'
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : 'text-zinc-400 hover:text-emerald-400'
                                }`}
                              >
                                💵 สด
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickPaymentSwitch(bill, 'split')}
                                title="สลับเป็นสด+โอน (🔀)"
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                  bill.paymentMethod === 'split'
                                    ? 'bg-purple-500 text-white shadow-xs'
                                    : 'text-zinc-400 hover:text-purple-400'
                                }`}
                              >
                                🔀 ผสม
                              </button>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-rose-500 font-semibold">
                            {settings.currencySymbol}{bill.commission.barberTotalEarned.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-purple-600 font-semibold">
                            {settings.currencySymbol}{bill.commission.shopNetEarned.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openReceiptModal(bill)}
                                title="ดูสลิป"
                                className={`p-1.5 rounded-lg transition-colors btn-tactile ${
                                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEditBillModal(bill)}
                                title="แก้ไข"
                                className={`p-1.5 rounded-lg transition-colors btn-tactile ${
                                  isDark ? 'bg-zinc-800 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-400' : 'bg-slate-100 hover:bg-amber-100 text-slate-700'
                                }`}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(bill)}
                                title="ลบ"
                                className={`p-1.5 rounded-lg transition-colors btn-tactile ${
                                  isDark ? 'bg-zinc-800 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400' : 'bg-slate-100 hover:bg-rose-100 text-slate-700'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB B: BARBER EARNINGS & PAYROLL */}
      {activeSection === 'barbers' && (
        <div className={`${theme.bgCard} rounded-2xl p-4 sm:p-5 border ${borderSubtle} space-y-4`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className={`text-sm sm:text-base font-bold ${headingText} flex items-center gap-2`}>
                <User className="w-4 h-4 text-amber-600" />
                <span>สรุปผลงานและรายได้ช่าง ({viewMode === 'daily' ? `วันที่ ${selectedDate}` : `รอบบิล ${selectedMonth}`})</span>
              </h3>
              <p className={`text-xs ${mutedText}`}>
                ยอดรวมจ่ายช่างทั้งหมด: <strong className="text-rose-500 font-mono font-bold">{settings.currencySymbol}{totalBarberPayout.toLocaleString()}</strong>
              </p>
            </div>
          </div>

          <div className={`overflow-x-auto rounded-xl border ${borderSubtle}`}>
            <table className="w-full text-left text-xs">
              <thead className={`border-b font-semibold ${tableHeaderBg}`}>
                <tr>
                  <th className="py-3 px-4">ช่าง</th>
                  <th className="py-3 px-3 text-center">จำนวนหัว</th>
                  <th className="py-3 px-3 text-right">ตัดผม (ได้)</th>
                  <th className="py-3 px-3 text-right">เคมี (ได้)</th>
                  <th className="py-3 px-3 text-right">สินค้า (ได้)</th>
                  <th className="py-3 px-3 text-right">ทิป</th>
                  <th className="py-3 px-3 text-right font-bold text-rose-500">รวมช่างรับ (Payroll)</th>
                  <th className="py-3 px-4 text-right font-bold text-purple-600">ร้านได้รับสุทธิ</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-200/80'}`}>
                {barberSummaries.map(({ barber, headsCut, haircutEarned, chemicalEarned, productEarned, tipEarned, totalEarned, shopEarned }) => (
                  <tr key={barber.id} className={tableRowBg}>
                    <td className="py-3 px-4 font-semibold">
                      <span>{barber.nickname}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-500">{headsCut} หัว</td>
                    <td className="py-3 px-3 text-right font-mono">{settings.currencySymbol}{haircutEarned.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono">{settings.currencySymbol}{chemicalEarned.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono">{settings.currencySymbol}{productEarned.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-600">{settings.currencySymbol}{tipEarned.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-500 bg-rose-500/5">
                      {settings.currencySymbol}{totalEarned.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-600">
                      {settings.currencySymbol}{shopEarned.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {/* Grand Total Row */}
                <tr className={`font-bold border-t-2 ${
                  isDark ? 'bg-zinc-950 text-zinc-100 border-zinc-700' : 'bg-slate-100 text-slate-900 border-slate-300'
                }`}>
                  <td className="py-3 px-4">รวมทุกช่าง ({barberSummaries.length} ท่าน)</td>
                  <td className="py-3 px-3 text-center font-mono text-amber-500">{totalHaircuts} หัว</td>
                  <td className="py-3 px-3 text-right font-mono">{settings.currencySymbol}{totalHaircutComm.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono">{settings.currencySymbol}{totalChemicalComm.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono">{settings.currencySymbol}{totalProductsComm.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono text-amber-600">{settings.currencySymbol}{totalTipsPayout.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono text-rose-500 text-sm">
                    {settings.currencySymbol}{totalBarberPayout.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-purple-600 text-sm">
                    {settings.currencySymbol}{totalShopNet.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB C: ANALYTICS & CHARTS */}
      {activeSection === 'analytics' && (
        <div className="space-y-5">
          <MonthlyRevenueChart
            bills={bills}
            expenses={expenses}
            barbers={barbers}
            settings={settings}
            selectedMonth={selectedMonth}
            isDark={isDark}
          />

          <div className={`${theme.bgCard} rounded-2xl p-4 sm:p-5 border ${borderSubtle}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <h3 className={`text-sm sm:text-base font-bold ${headingText}`}>
                  {viewMode === 'daily' ? `ยอดขายตามช่วงเวลา (${selectedDate})` : `ยอดขายรายวัน (${selectedMonth})`}
                </h3>
              </div>
              <span className={`text-xs font-mono ${mutedText}`}>
                สูงสุด ฿{maxChartVal.toLocaleString()}
              </span>
            </div>

            <div className={`h-44 flex items-end gap-2 pt-6 pb-2 px-2 border-b ${borderSubtle}`}>
              {chartBars.map((bar, idx) => {
                const heightPercent = Math.max(8, (bar.total / maxChartVal) * 100);
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative"
                  >
                    <div className={`absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none font-mono ${
                      isDark ? 'bg-zinc-950 border border-zinc-700 text-zinc-100' : 'bg-slate-900 text-white'
                    }`}>
                      ฿{bar.total.toLocaleString()} ({bar.count} บิล)
                    </div>

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                        bar.total > 0
                          ? isDark
                            ? 'bg-gradient-to-t from-amber-500 to-amber-400 shadow-xs'
                            : 'bg-slate-900 shadow-xs'
                          : isDark ? 'bg-zinc-800/40' : 'bg-slate-200/60'
                      }`}
                    />
                    <span className={`text-[10px] ${mutedText} mt-2 font-mono truncate w-full text-center`}>
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB D: FINANCIAL & ACCOUNTING STATEMENT */}
      {activeSection === 'accounting' && (
        <div className={`${theme.bgCard} rounded-2xl p-4 sm:p-5 border ${borderSubtle} space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm sm:text-base font-bold ${headingText} flex items-center gap-2`}>
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>งบสรุปรายการทางบัญชี & กำไรสุทธิ ({viewMode === 'daily' ? `ประจำวัน ${selectedDate}` : `รอบบิล ${selectedMonth}`})</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box 1: รายได้ */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className="text-xs font-bold text-amber-600 mb-2 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>1. รายได้จากการดำเนินงาน</span>
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className={mutedText}>ค่าบริการตัดผม:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalHaircutRev.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={mutedText}>ค่าบริการเคมี/ทำสี:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalChemicalRev.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={mutedText}>ขายสินค้า:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalProductsRev.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>เงินทิป:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalTipsRev.toLocaleString()}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-between font-bold text-amber-600">
                  <span>ยอดขายรวมทั้งหมด:</span>
                  <span className="font-mono">{settings.currencySymbol}{totalGrossRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Box 2: รายจ่าย */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className="text-xs font-bold text-rose-500 mb-2 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" />
                <span>2. ต้นทุนส่วนแบ่งช่าง & รายจ่าย</span>
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className={mutedText}>ส่วนแบ่งตัดผมช่าง:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalHaircutComm.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={mutedText}>ส่วนแบ่งเคมีช่าง:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalChemicalComm.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={mutedText}>ส่วนแบ่งสินค้าช่าง:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalProductsComm.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>ทิปส่งมอบช่าง:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalTipsPayout.toLocaleString()}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-between font-bold text-rose-500">
                  <span>รวมจ่ายช่างทั้งหมด:</span>
                  <span className="font-mono">{settings.currencySymbol}{totalBarberPayout.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Box 3: สรุปสุทธิ */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className="text-xs font-bold text-purple-600 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>3. สรุปเงินสด/โอน & กำไรสุทธิ</span>
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className={mutedText}>เงินสดในเก๊ะ (💵):</span>
                  <span className="font-mono font-semibold text-emerald-600">{settings.currencySymbol}{totalCash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={mutedText}>เงินโอนเข้าบัญชี (📱):</span>
                  <span className="font-mono font-semibold text-sky-600">{settings.currencySymbol}{totalTransfer.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={mutedText}>อัตรากำไรขั้นต้น:</span>
                  <span className="font-mono font-semibold text-purple-600">{shopProfitMargin}%</span>
                </div>
                <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-between font-bold text-purple-600">
                  <span>กำไรสุทธิร้าน:</span>
                  <span className="font-mono">{settings.currencySymbol}{finalShopNetAfterExpenses.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNTING STATEMENT MODAL */}
      <ModalAccountingReport
        isOpen={isAccountingModalOpen}
        onClose={() => setIsAccountingModalOpen(false)}
        viewMode={viewMode}
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        periodBills={allPeriodBills}
        barberSummaries={barberSummaries}
      />

      {/* DAY BILLS DETAIL DRILLDOWN MODAL */}
      {inspectDayDate && (
        <ModalDayBills
          isOpen={Boolean(inspectDayDate)}
          onClose={() => setInspectDayDate(null)}
          dateStr={inspectDayDate}
          onSwitchToDailyView={handleSwitchToDailyView}
        />
      )}

      {/* MERGE BILLS MODAL */}
      {isMergeModalOpen && (
        <ModalMergeBills
          isOpen={isMergeModalOpen}
          onClose={() => {
            setIsMergeModalOpen(false);
            setMergeTargetBillId(undefined);
            setMergeTargetGroupId(undefined);
          }}
          selectedDate={selectedDate}
          initialSelectedBillId={mergeTargetBillId}
          initialGroupId={mergeTargetGroupId}
        />
      )}
    </div>
  );
};
