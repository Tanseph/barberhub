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
  Percent,
  CalendarDays,
  ChevronRight,
  Filter,
  Link2,
  Unlink,
} from 'lucide-react';
import { sounds } from '../utils/sound';
import { ModalAccountingReport } from './ModalAccountingReport';
import { ModalDayBills } from './ModalDayBills';
import { ModalMergeBills } from './ModalMergeBills';
import { MonthlyRevenueChart } from './MonthlyRevenueChart';

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

  // Filtered bills for the current selected period (Daily vs Monthly)
  const allPeriodBills = useMemo(() => {
    return bills.filter((b) =>
      viewMode === 'daily'
        ? b.dateStr === selectedDate
        : b.dateStr.startsWith(selectedMonth)
    );
  }, [bills, viewMode, selectedDate, selectedMonth]);

  // Today specific calculations
  const todayBills = useMemo(() => {
    return bills.filter((b) => b.dateStr === defaultDateStr);
  }, [bills, defaultDateStr]);
  const todayHeads = todayBills.length;
  const todayHaircuts = todayBills.filter((b) => b.haircutFee > 0).length;
  const todayTransferBills = todayBills.filter((b) => b.paymentMethod === 'transfer' || (b.paymentMethod === 'split' && b.transferAmount > 0)).length;
  const todayCashBills = todayBills.filter((b) => b.paymentMethod === 'cash' || (b.paymentMethod === 'split' && b.cashAmount > 0)).length;
  const todayGross = todayBills.reduce((s, b) => s + b.grossTotal, 0);
  const todayTransferAmount = todayBills.reduce((s, b) => s + b.transferAmount, 0);
  const todayCashAmount = todayBills.reduce((s, b) => s + b.cashAmount, 0);

  // Selected Month specific calculations
  const monthBills = useMemo(() => {
    return bills.filter((b) => b.dateStr.startsWith(selectedMonth));
  }, [bills, selectedMonth]);
  const monthHeads = monthBills.length;
  const monthHaircuts = monthBills.filter((b) => b.haircutFee > 0).length;
  const monthTransferBills = monthBills.filter((b) => b.paymentMethod === 'transfer' || (b.paymentMethod === 'split' && b.transferAmount > 0)).length;
  const monthCashBills = monthBills.filter((b) => b.paymentMethod === 'cash' || (b.paymentMethod === 'split' && b.cashAmount > 0)).length;
  const monthGross = monthBills.reduce((s, b) => s + b.grossTotal, 0);
  const monthTransferAmount = monthBills.reduce((s, b) => s + b.transferAmount, 0);
  const monthCashAmount = monthBills.reduce((s, b) => s + b.cashAmount, 0);

  // Count distinct active days in the month
  const monthActiveDays = useMemo(() => {
    const uniqueDays = new Set(monthBills.map((b) => b.dateStr));
    return uniqueDays.size;
  }, [monthBills]);
  const monthAvgHeadsPerDay = monthActiveDays > 0 ? (monthHeads / monthActiveDays).toFixed(1) : '0';

  // Filtered shop expenses for the current selected period
  const allPeriodExpenses = useMemo(() => {
    return expenses.filter((e) =>
      viewMode === 'daily'
        ? e.dateStr === selectedDate
        : e.dateStr.startsWith(selectedMonth)
    );
  }, [expenses, viewMode, selectedDate, selectedMonth]);

  // Filtered bills for the daily ledger table (with search & filters applied)
  const filteredDailyBills = useMemo(() => {
    return allPeriodBills.filter((b) => {
      // Barber filter
      if (barberFilter !== 'all' && b.barberId !== barberFilter) return false;

      // Payment filter
      if (paymentFilter !== 'all' && b.paymentMethod !== paymentFilter) return false;

      // Search keyword
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
    });
  }, [allPeriodBills, barberFilter, paymentFilter, billSearch]);

  // Monthly breakdown day by day (from Day 1 to End of Month)
  const monthlyDaysSummary = useMemo(() => {
    if (viewMode !== 'monthly') return [];

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStrPadded = String(d).padStart(2, '0');
      const dateStr = `${selectedMonth}-${dayStrPadded}`;
      const dateObj = new Date(`${dateStr}T00:00:00`);
      
      const dayName = dateObj.toLocaleDateString('th-TH', { weekday: 'short' });
      const dayFullDateTh = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

      const dayBills = bills.filter((b) => b.dateStr === dateStr);
      const dayExpensesList = expenses.filter((e) => e.dateStr === dateStr);

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
      const totalExpenses = barberPayroll + shopExpenseAmount;
      const shopCommissionGross = dayBills.reduce((s, b) => s + b.commission.shopNetEarned, 0);
      const shopNet = shopCommissionGross - shopExpenseAmount;

      result.push({
        dayNumber: d,
        dateStr,
        dayName,
        dayFullDateTh,
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
        totalExpenses,
        shopNet,
      });
    }

    return result;
  }, [viewMode, selectedMonth, bills, expenses]);

  // Filtered monthly days if toggle active
  const filteredMonthlyDays = useMemo(() => {
    if (!monthlyShowOnlyActive) return monthlyDaysSummary;
    return monthlyDaysSummary.filter((d) => d.billCount > 0);
  }, [monthlyDaysSummary, monthlyShowOnlyActive]);

  // Accounting Totals & Financial Breakdown for current selected period
  const totalHaircutRev = allPeriodBills.reduce((s, b) => s + b.haircutFee, 0);
  const totalChemicalRev = allPeriodBills.reduce((s, b) => s + b.chemicalFee, 0);
  const totalProductsRev = allPeriodBills.reduce((s, b) => s + b.totalProductsFee, 0);
  const totalTipsRev = allPeriodBills.reduce((s, b) => s + b.tipFee, 0);
  const totalGrossRevenue = allPeriodBills.reduce((s, b) => s + b.grossTotal, 0);

  const totalHaircutComm = allPeriodBills.reduce((s, b) => s + b.commission.barberHaircutEarned, 0);
  const totalChemicalComm = allPeriodBills.reduce((s, b) => s + b.commission.barberChemicalEarned, 0);
  const totalProductsComm = allPeriodBills.reduce((s, b) => s + b.commission.barberProductEarned, 0);
  const totalTipsPayout = allPeriodBills.reduce((s, b) => s + b.commission.barberTipEarned, 0);
  const totalBarberPayout = allPeriodBills.reduce((s, b) => s + b.commission.barberTotalEarned, 0);

  const totalShopNet = allPeriodBills.reduce((s, b) => s + b.commission.shopNetEarned, 0);
  const shopProfitMargin = totalGrossRevenue > 0 ? ((totalShopNet / totalGrossRevenue) * 100).toFixed(1) : '0';

  const totalTransfer = allPeriodBills.reduce((s, b) => s + b.transferAmount, 0);
  const totalCash = allPeriodBills.reduce((s, b) => s + b.cashAmount, 0);
  const totalHaircuts = allPeriodBills.filter((b) => b.haircutFee > 0).length;
  const totalChemicals = allPeriodBills.filter((b) => b.chemicalFee > 0).length;
  const avgTicketValue = allPeriodBills.length > 0 ? Math.round(totalGrossRevenue / allPeriodBills.length) : 0;

  // Period heads and bill breakdown
  const periodHeads = allPeriodBills.length;
  const periodTransferBills = allPeriodBills.filter((b) => b.paymentMethod === 'transfer' || (b.paymentMethod === 'split' && b.transferAmount > 0)).length;
  const periodPureTransferBills = allPeriodBills.filter((b) => b.paymentMethod === 'transfer').length;
  const periodCashBills = allPeriodBills.filter((b) => b.paymentMethod === 'cash' || (b.paymentMethod === 'split' && b.cashAmount > 0)).length;
  const periodPureCashBills = allPeriodBills.filter((b) => b.paymentMethod === 'cash').length;
  const periodSplitBills = allPeriodBills.filter((b) => b.paymentMethod === 'split').length;

  // Per-barber detailed breakdown
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

  // Quick switch payment method handler (โอนเงิน / เงินสด / สลับ)
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

  // Delete bill handler with modal
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

  // Preset Date Controls
  const setDatePreset = (preset: 'today' | 'yesterday' | 'thisMonth' | 'lastMonth') => {
    sounds.playClick();
    const d = new Date();
    if (preset === 'today') {
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setSelectedDate(str);
      setViewMode('daily');
    } else if (preset === 'yesterday') {
      d.setDate(d.getDate() - 1);
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setSelectedDate(str);
      setViewMode('daily');
    } else if (preset === 'thisMonth') {
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(str);
      setViewMode('monthly');
    } else if (preset === 'lastMonth') {
      d.setMonth(d.getMonth() - 1);
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(str);
      setViewMode('monthly');
    }
  };

  // Switch to daily view from day drilldown
  const handleSwitchToDailyView = (targetDateStr: string) => {
    setSelectedDate(targetDateStr);
    setViewMode('daily');
    showToast('สลับดูแดชบอร์ดรายวัน 📅', `เปิดหน้ารายการประจำวันที่ ${targetDateStr}`, 'info', '📅');
  };

  // Export CSV
  const handleExportCSV = () => {
    sounds.playClick();
    if (viewMode === 'monthly') {
      // Export Monthly Day-by-Day Ledger
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
      // Export Daily Bills Ledger
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

  // Chart Data
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
  const inputClass = isDark
    ? 'px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs font-mono focus:border-amber-500 focus:outline-none'
    : 'px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:bg-white focus:border-slate-800 focus:outline-none';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. TOP CONTROL BAR & PERIOD SELECTOR */}
      <div className={`${theme.bgCard} rounded-2xl p-5 sm:p-6 transition-all duration-200 border ${borderSubtle}`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Header Title */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard className="w-5 h-5 text-amber-600" />
              <h2 className={`text-lg font-bold ${headingText}`}>
                แดชบอร์ด & ระบบบัญชีร้านตัดผม (Accounting & POS Financial Ledger)
              </h2>
            </div>
            <p className={`text-xs ${mutedText}`}>
              กระทบยอดรายได้-ต้นทุนค่าแรงช่าง-กำไรสุทธิ แยกเงินสด/เงินโอน ตรวจสอบและแก้ไขบิลสำหรับนักบัญชีและเจ้าของร้าน
            </p>
          </div>

          {/* Quick Actions & Date Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* View Mode Toggle */}
            <div className={`flex rounded-xl p-1 border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'}`}>
              <button
                onClick={() => {
                  sounds.playClick();
                  setViewMode('daily');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all btn-tactile ${
                  viewMode === 'daily'
                    ? isDark ? 'bg-amber-500 text-zinc-950 shadow-md' : 'bg-white text-slate-900 shadow-xs'
                    : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📅 รายวัน (Daily)
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  setViewMode('monthly');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all btn-tactile ${
                  viewMode === 'monthly'
                    ? isDark ? 'bg-amber-500 text-zinc-950 shadow-md' : 'bg-white text-slate-900 shadow-xs'
                    : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📊 รายเดือน (Monthly)
              </button>
            </div>

            {/* Date Pickers */}
            {viewMode === 'daily' ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    sounds.playClick();
                    setSelectedDate(e.target.value);
                  }}
                  className={inputClass}
                />
                <button
                  onClick={() => setDatePreset('today')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors btn-tactile ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  วันนี้
                </button>
                <button
                  onClick={() => setDatePreset('yesterday')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors btn-tactile ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  เมื่อวาน
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    sounds.playClick();
                    setSelectedMonth(e.target.value);
                  }}
                  className={inputClass}
                />
                <button
                  onClick={() => setDatePreset('thisMonth')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors btn-tactile ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  เดือนนี้
                </button>
                <button
                  onClick={() => setDatePreset('lastMonth')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors btn-tactile ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  เดือนก่อน
                </button>
              </div>
            )}

            {/* Print & CSV Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                title="ส่งออกไฟล์ Excel/CSV สำหรับลงบัญชี"
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all btn-tactile ${
                  isDark ? 'bg-zinc-950 border-zinc-700 hover:bg-zinc-800 text-zinc-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">CSV บัญชี</span>
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  setIsAccountingModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all btn-tactile"
                title="เปิดใบบันทึกสรุปรายงานทางบัญชี และดาวน์โหลด PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📄 สรุปบัญชี / ดาวน์โหลด PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FOUR CORE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: ยอดขายรวม & จำนวนหัว (Gross Revenue & Total Heads) */}
        <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden group ${
          isDark ? 'bg-zinc-900/90 border-amber-500/30' : 'bg-white border-slate-200/90'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
              1. ยอดขายรวม (Gross Sales)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-600 tracking-tight">
            {settings.currencySymbol}{totalGrossRevenue.toLocaleString()}
          </div>
          <div className={`mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t ${
            isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>จำนวนบริการ: <strong className={`${headingText} font-mono font-bold`}>{periodHeads} หัว</strong></span>
            <span className="text-amber-600 font-mono font-semibold">เฉลี่ย ฿{avgTicketValue.toLocaleString()}/บิล</span>
          </div>
        </div>

        {/* Card 2: เงินโอนเข้าบัญชีธนาคาร & จำนวนบิลโอน (Bank Transfer) */}
        <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden group ${
          isDark ? 'bg-zinc-900/90 border-sky-500/30' : 'bg-white border-slate-200/90'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
              2. เงินโอนเข้าบัญชี (Transfer)
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-sky-600 tracking-tight">
            {settings.currencySymbol}{totalTransfer.toLocaleString()}
          </div>
          <div className={`mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t ${
            isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>ยอดโอน: <strong className="text-sky-600 font-mono font-bold">{periodTransferBills} บิล</strong></span>
            <span className="text-sky-600 font-bold font-mono">
              {totalGrossRevenue > 0 ? ((totalTransfer / totalGrossRevenue) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>

        {/* Card 3: เงินสดในลิ้นชัก & จำนวนบิลเงินสด (Cash in Drawer) */}
        <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden group ${
          isDark ? 'bg-zinc-900/90 border-emerald-500/30' : 'bg-white border-slate-200/90'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
              3. เงินสดในเก๊ะ (Cash in Drawer)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 tracking-tight">
            {settings.currencySymbol}{totalCash.toLocaleString()}
          </div>
          <div className={`mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t ${
            isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>ยอดเงินสด: <strong className="text-emerald-600 font-mono font-bold">{periodCashBills} บิล</strong></span>
            <span className="text-emerald-600 font-bold font-mono">
              {totalGrossRevenue > 0 ? ((totalCash / totalGrossRevenue) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>

        {/* Card 4: รายได้สุทธิส่วนของร้าน (Shop Net Income) */}
        <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden group ${
          isDark ? 'bg-zinc-900/90 border-purple-500/30' : 'bg-white border-slate-200/90'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
              4. รายได้สุทธิร้าน (Shop Net Margin)
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-purple-600 tracking-tight">
            {settings.currencySymbol}{totalShopNet.toLocaleString()}
          </div>
          <div className={`mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t ${
            isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>อัตรากำไรขั้นต้น:</span>
            <span className="text-purple-600 font-bold font-mono">{shopProfitMargin}%</span>
          </div>
        </div>
      </div>

      {/* QUICK HIGHLIGHT STRIP: สรุปจำนวนหัวต่อวัน ต่อเดือน & ยอดโอนกี่บิล ยอดเงินสดกี่บิล */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-zinc-800/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-amber-500" />
            <h3 className={`text-xs sm:text-sm font-bold ${headingText}`}>
              สรุปจำนวนหัวลูกค้า & ช่องทางชำระเงิน (Headcount & Payment Overview)
            </h3>
          </div>
          <span className={`text-[11px] ${mutedText} font-mono`}>
            {viewMode === 'daily' ? `ข้อมูลวันที่ ${selectedDate}` : `ข้อมูลเดือน ${selectedMonth}`}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Box A: จำนวนหัวต่อวัน */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-bold ${mutedText}`}>✂️ จำนวนหัว ต่อวัน</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold">
                {viewMode === 'daily' && selectedDate === defaultDateStr ? 'วันนี้' : 'รายวัน'}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-500">
              {viewMode === 'daily' ? periodHeads : todayHeads} <span className="text-xs font-normal text-zinc-400">หัว</span>
            </div>
            <div className={`text-[11px] ${mutedText} mt-1 pt-1.5 border-t ${borderSubtle} flex justify-between`}>
              <span>ตัดผม: <strong>{viewMode === 'daily' ? totalHaircuts : todayHaircuts} หัว</strong></span>
              <span>วันนี้: <strong>{todayHeads} หัว</strong></span>
            </div>
          </div>

          {/* Box B: จำนวนหัว ต่อเดือน */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-bold ${mutedText}`}>💈 จำนวนหัว ต่อเดือน</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 font-semibold">
                {selectedMonth}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-purple-500">
              {monthHeads} <span className="text-xs font-normal text-zinc-400">หัว</span>
            </div>
            <div className={`text-[11px] ${mutedText} mt-1 pt-1.5 border-t ${borderSubtle} flex justify-between`}>
              <span>เฉลี่ย/วัน: <strong>{monthAvgHeadsPerDay} หัว</strong></span>
              <span>ตัดผม: <strong>{monthHaircuts} หัว</strong></span>
            </div>
          </div>

          {/* Box C: จำนวนยอดโอนกี่บิล */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-bold ${mutedText}`}>📱 ยอดโอน (Transfer)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 font-bold">
                {periodTransferBills} บิล
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-sky-500">
              {settings.currencySymbol}{totalTransfer.toLocaleString()}
            </div>
            <div className={`text-[11px] ${mutedText} mt-1 pt-1.5 border-t ${borderSubtle} flex justify-between`}>
              <span>โอนล้วน: <strong>{periodPureTransferBills} บิล</strong></span>
              {periodSplitBills > 0 && <span>ผสม: <strong>{periodSplitBills} บิล</strong></span>}
            </div>
          </div>

          {/* Box D: จำนวนยอดเงินสดกี่บิล */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-bold ${mutedText}`}>💵 ยอดเงินสด (Cash)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                {periodCashBills} บิล
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-500">
              {settings.currencySymbol}{totalCash.toLocaleString()}
            </div>
            <div className={`text-[11px] ${mutedText} mt-1 pt-1.5 border-t ${borderSubtle} flex justify-between`}>
              <span>สดล้วน: <strong>{periodPureCashBills} บิล</strong></span>
              {periodSplitBills > 0 && <span>ผสม: <strong>{periodSplitBills} บิล</strong></span>}
            </div>
          </div>
        </div>
      </div>

      {/* RECHARTS MONTHLY SALES & REVENUE VISUALIZATION */}
      <MonthlyRevenueChart
        bills={bills}
        expenses={expenses}
        barbers={barbers}
        settings={settings}
        selectedMonth={selectedMonth}
        isDark={isDark}
      />

      {/* 3. EXECUTIVE ACCOUNTING BREAKDOWN BOX (งบสรุปสำหรับนักบัญชี) */}
      <div className={`${theme.bgCard} rounded-2xl p-5 sm:p-6 transition-all duration-200 border ${borderSubtle}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-zinc-800/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className={`text-base font-bold ${headingText}`}>
              งบสรุปรายการทางบัญชี & กระทบยอดรายรับ ({viewMode === 'daily' ? `ประจำวัน ${selectedDate}` : `ประจำเดือน ${selectedMonth}`})
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-semibold">
            สถานะบัญชี: ลงตัวครบถ้วน ✓
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Section 1: รายได้จากการดำเนินงาน */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>1. รายได้จากการดำเนินงาน</span>
              </h4>
              <span className="text-[10px] font-mono text-zinc-400">Operating Revenue</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className={mutedText}>• ค่าบริการตัดผม ({totalHaircuts} หัว):</span>
                <span className={`font-mono font-semibold ${headingText}`}>{settings.currencySymbol}{totalHaircutRev.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={mutedText}>• ค่าบริการเคมี/ทำสี ({totalChemicals} ครั้ง):</span>
                <span className={`font-mono font-semibold ${headingText}`}>{settings.currencySymbol}{totalChemicalRev.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={mutedText}>• รายได้จากการขายสินค้าปลีก:</span>
                <span className={`font-mono font-semibold ${headingText}`}>{settings.currencySymbol}{totalProductsRev.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-amber-600">
                <span>• เงินทิปผ่านมือช่าง:</span>
                <span className="font-mono font-semibold">{settings.currencySymbol}{totalTipsRev.toLocaleString()}</span>
              </div>
              <div className="pt-2.5 mt-2 border-t border-zinc-800 flex justify-between items-center font-bold text-sm text-amber-600">
                <span>ยอดขายรวมทั้งหมด:</span>
                <span className="font-mono">{settings.currencySymbol}{totalGrossRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Section 2: ต้นทุนค่าจ้างส่วนแบ่งช่าง */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" />
                <span>2. ต้นทุนส่วนแบ่งช่าง (Payroll)</span>
              </h4>
              <span className="text-[10px] font-mono text-zinc-400">Commission Expense</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className={mutedText}>• ส่วนแบ่งตัดผมช่าง:</span>
                <span className={`font-mono font-semibold ${headingText}`}>{settings.currencySymbol}{totalHaircutComm.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={mutedText}>• ส่วนแบ่งเคมีช่าง:</span>
                <span className={`font-mono font-semibold ${headingText}`}>{settings.currencySymbol}{totalChemicalComm.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={mutedText}>• ส่วนแบ่งสินค้าช่าง:</span>
                <span className={`font-mono font-semibold ${headingText}`}>{settings.currencySymbol}{totalProductsComm.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-amber-600">
                <span>• ทิปส่งมอบช่าง 100%:</span>
                <span className="font-mono font-semibold">{settings.currencySymbol}{totalTipsPayout.toLocaleString()}</span>
              </div>
              <div className="pt-2.5 mt-2 border-t border-zinc-800 flex justify-between items-center font-bold text-sm text-rose-500">
                <span>รวมจ่ายช่างทั้งหมด:</span>
                <span className="font-mono">{settings.currencySymbol}{totalBarberPayout.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Section 3: สรุปกำไร & กระทบยอดเงินสด/เงินโอน */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>3. กำไรสุทธิ & กระทบยอด</span>
              </h4>
              <span className="text-[10px] font-mono text-zinc-400">Net Profit & Settlement</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className={mutedText}>• ยอดเงินสดในเก๊ะ (นับจริง):</span>
                <span className="font-mono font-semibold text-emerald-600">{settings.currencySymbol}{totalCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={mutedText}>• ยอดเงินโอนเข้าบัญชี (ตรวจ Statement):</span>
                <span className="font-mono font-semibold text-sky-600">{settings.currencySymbol}{totalTransfer.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={mutedText}>• จำนวนรายการทั้งหมด:</span>
                <span className={`font-mono font-semibold ${headingText}`}>{allPeriodBills.length} บิล</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={mutedText}>• อัตรากำไรขั้นต้นร้าน:</span>
                <span className="font-mono font-semibold text-purple-600">{shopProfitMargin}%</span>
              </div>
              <div className="pt-2.5 mt-2 border-t border-zinc-800 flex justify-between items-center font-bold text-sm text-purple-600">
                <span>รายได้สุทธิส่วนของร้าน:</span>
                <span className="font-mono">{settings.currencySymbol}{totalShopNet.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BARBER COMMISSION PAYROLL TABLE */}
      <div className={`${theme.bgCard} rounded-2xl p-5 sm:p-6 transition-all duration-200 border ${borderSubtle}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-600" />
            <h3 className={`text-base font-bold ${headingText}`}>
              ตารางแจกแจงรายได้และค่าคอมมิชชั่นช่าง (Barber Payroll Ledger)
            </h3>
          </div>
          <span className={`text-xs ${mutedText}`}>
            ยอดรวมที่ต้องจ่ายช่าง: <strong className="text-emerald-600 font-mono text-sm font-bold">{settings.currencySymbol}{totalBarberPayout.toLocaleString()}</strong>
          </span>
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
                <th className="py-3 px-3 text-right font-bold text-emerald-600">รวมช่างรับ (Payroll)</th>
                <th className="py-3 px-4 text-right font-bold text-amber-600">ร้านได้รับสุทธิ</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-200/80'}`}>
              {barberSummaries.map(({ barber, headsCut, haircutEarned, chemicalEarned, productEarned, tipEarned, totalEarned, shopEarned }) => (
                <tr key={barber.id} className={tableRowBg}>
                  <td className="py-3 px-4 font-semibold">
                    <span>{barber.nickname}</span>
                    <span className={`text-[10px] ${mutedText} hidden sm:inline ml-1.5`}>({barber.name})</span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono">{headsCut}</td>
                  <td className="py-3 px-3 text-right font-mono">{settings.currencySymbol}{haircutEarned.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono">{settings.currencySymbol}{chemicalEarned.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono">{settings.currencySymbol}{productEarned.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono text-amber-600">{settings.currencySymbol}{tipEarned.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 bg-emerald-500/5">
                    {settings.currencySymbol}{totalEarned.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                    {settings.currencySymbol}{shopEarned.toLocaleString()}
                  </td>
                </tr>
              ))}
              {/* Grand Total Row */}
              <tr className={`font-bold border-t-2 ${
                isDark ? 'bg-zinc-950 text-zinc-100 border-zinc-700' : 'bg-slate-100 text-slate-900 border-slate-300'
              }`}>
                <td className="py-3 px-4">รวมทุกช่าง ({barberSummaries.length} ท่าน)</td>
                <td className="py-3 px-3 text-center font-mono">{totalHaircuts}</td>
                <td className="py-3 px-3 text-right font-mono">{settings.currencySymbol}{totalHaircutComm.toLocaleString()}</td>
                <td className="py-3 px-3 text-right font-mono">{settings.currencySymbol}{totalChemicalComm.toLocaleString()}</td>
                <td className="py-3 px-3 text-right font-mono">{settings.currencySymbol}{totalProductsComm.toLocaleString()}</td>
                <td className="py-3 px-3 text-right font-mono text-amber-600">{settings.currencySymbol}{totalTipsPayout.toLocaleString()}</td>
                <td className="py-3 px-3 text-right font-mono text-emerald-600 text-sm">
                  {settings.currencySymbol}{totalBarberPayout.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-mono text-amber-600 text-sm">
                  {settings.currencySymbol}{totalShopNet.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MAIN LEDGER VIEW (MONTHLY DAILY BREAKDOWN vs DAILY BILLS TABLE) */}
      {viewMode === 'monthly' ? (
        /* ------------------------------------------------------------- */
        /* MONTHLY VIEW: ตารางสรุปรายวันประจำเดือน (วันที่ 1 ถึงสิ้นเดือน) */
        /* ------------------------------------------------------------- */
        <div className={`${theme.bgCard} rounded-2xl p-5 sm:p-6 transition-all duration-200 border ${borderSubtle}`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-amber-600" />
                <h3 className={`text-base font-bold ${headingText}`}>
                  ตารางสรุปรายวันประจำเดือน ({selectedMonth} • วันที่ 1 ถึงสิ้นเดือน)
                </h3>
              </div>
              <p className={`text-xs ${mutedText} mt-0.5`}>
                สรุปจำนวนบิล ยอดเงินโอน ยอดเงินสด รายรับรวม และรายจ่ายจ่ายช่างของแต่ละวัน • กดดูรายการย้อนหลังของวันนั้นได้ทันที
              </p>
            </div>

            {/* Filter active days toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sounds.playClick();
                  setMonthlyShowOnlyActive(!monthlyShowOnlyActive);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all btn-tactile ${
                  monthlyShowOnlyActive
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs font-bold'
                    : isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{monthlyShowOnlyActive ? 'แสดงเฉพาะวันที่มีรายการ (Active)' : 'แสดงครบทุกวัน (1 - สิ้นเดือน)'}</span>
              </button>
            </div>
          </div>

          {/* Monthly Daily Breakdown Table */}
          <div className={`overflow-x-auto rounded-xl border ${borderSubtle}`}>
            <table className="w-full text-left text-xs">
              <thead className={`border-b font-semibold ${tableHeaderBg}`}>
                <tr>
                  <th className="py-3 px-4">วันที่ / วันในสัปดาห์</th>
                  <th className="py-3 px-2 text-center">จำนวนหัว / บิล</th>
                  <th className="py-3 px-2 text-center">บิลโอน / บิลสด</th>
                  <th className="py-3 px-3 text-right text-sky-600">ยอดเงินโอน (📱)</th>
                  <th className="py-3 px-3 text-right text-emerald-600">ยอดเงินสด (💵)</th>
                  <th className="py-3 px-3 text-right font-bold text-amber-600">รายรับรวม (Gross)</th>
                  <th className="py-3 px-3 text-right text-rose-500">จ่ายช่าง (Payroll)</th>
                  <th className="py-3 px-3 text-right text-pink-500">รายจ่ายร้าน (Exp)</th>
                  <th className="py-3 px-3 text-right text-rose-600 font-bold">รายจ่ายรวม</th>
                  <th className="py-3 px-3 text-right text-purple-600 font-bold">กำไรสุทธิร้าน (Net)</th>
                  <th className="py-3 px-4 text-center">ดูรายการย้อนหลัง</th>
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
                      {/* Date */}
                      <td className="py-3 px-4 font-semibold">
                        <div className="flex items-center gap-2">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                            isDayToday
                              ? 'bg-amber-500 text-zinc-950 shadow-xs'
                              : isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {day.dayNumber}
                          </span>
                          <div>
                            <span className={headingText}>
                              {day.dayFullDateTh} ({day.dayName})
                            </span>
                            {isDayToday && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 font-bold">
                                วันนี้
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Heads & Bills Count */}
                      <td className="py-3 px-2 text-center font-mono">
                        {hasActivity ? (
                          <div className="flex flex-col items-center gap-0.5">
                            {day.billCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-600" title={`${day.headsCount} หัว (${day.billCount} บิล)`}>
                                ✂️ {day.headsCount} หัว
                              </span>
                            )}
                            {day.expenseCount > 0 && (
                              <span className="text-[10px] text-rose-500 font-medium" title={`${day.expenseCount} รายการรายจ่าย`}>
                                {day.expenseCount} จ่าย
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>

                      {/* Transfer Bills vs Cash Bills */}
                      <td className="py-3 px-2 text-center font-mono text-[11px]">
                        {day.billCount > 0 ? (
                          <div className="flex items-center justify-center gap-1 font-semibold">
                            <span className="text-sky-600 bg-sky-500/10 px-1 py-0.5 rounded" title={`โอน ${day.transferBillCount} บิล`}>
                              📱 {day.transferBillCount}
                            </span>
                            <span className="text-emerald-600 bg-emerald-500/10 px-1 py-0.5 rounded" title={`สด ${day.cashBillCount} บิล`}>
                              💵 {day.cashBillCount}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>

                      {/* Transfer Amount */}
                      <td className="py-3 px-3 text-right font-mono text-sky-600 font-medium">
                        {day.transferAmount > 0 ? `${settings.currencySymbol}${day.transferAmount.toLocaleString()}` : '-'}
                      </td>

                      {/* Cash Amount */}
                      <td className="py-3 px-3 text-right font-mono text-emerald-600 font-medium">
                        {day.cashAmount > 0 ? `${settings.currencySymbol}${day.cashAmount.toLocaleString()}` : '-'}
                      </td>

                      {/* Gross Revenue */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-600 text-sm">
                        {day.grossRevenue > 0 ? `${settings.currencySymbol}${day.grossRevenue.toLocaleString()}` : '-'}
                      </td>

                      {/* Barber Commission */}
                      <td className="py-3 px-3 text-right font-mono text-rose-500 font-medium">
                        {day.barberPayroll > 0 ? `${settings.currencySymbol}${day.barberPayroll.toLocaleString()}` : '-'}
                      </td>

                      {/* Shop Expense */}
                      <td className="py-3 px-3 text-right font-mono text-pink-500 font-medium">
                        {day.shopExpenseAmount > 0 ? `${settings.currencySymbol}${day.shopExpenseAmount.toLocaleString()}` : '-'}
                      </td>

                      {/* Total Expenses Combined */}
                      <td className="py-3 px-3 text-right font-mono text-rose-600 font-bold">
                        {day.totalExpenses > 0 ? `${settings.currencySymbol}${day.totalExpenses.toLocaleString()}` : '-'}
                      </td>

                      {/* Shop Net Margin */}
                      <td className={`py-3 px-3 text-right font-mono font-bold ${day.shopNet < 0 ? 'text-rose-500' : 'text-purple-600'}`}>
                        {hasActivity ? `${settings.currencySymbol}${day.shopNet.toLocaleString()}` : '-'}
                      </td>

                      {/* Action Button: Click to inspect this day */}
                      <td className="py-3 px-4 text-center">
                        {hasActivity ? (
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              setInspectDayDate(day.dateStr);
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all btn-tactile inline-flex items-center gap-1.5 ${
                              isDark
                                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ดูรายการ ({day.billCount + day.expenseCount})</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-500">ไม่มีรายการ</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Monthly Grand Total Summary Row */}
                <tr className={`font-bold border-t-2 text-xs ${
                  isDark ? 'bg-zinc-950 text-zinc-100 border-zinc-700' : 'bg-slate-100 text-slate-900 border-slate-300'
                }`}>
                  <td className="py-3.5 px-4 font-black">
                    รวมทั้งเดือน ({selectedMonth})
                  </td>
                  <td className="py-3.5 px-2 text-center font-mono font-black text-amber-500">
                    ✂️ {monthHeads} หัว ({allPeriodBills.length} บิล)
                  </td>
                  <td className="py-3.5 px-2 text-center font-mono font-bold">
                    <span className="text-sky-600">📱 {periodTransferBills}</span> / <span className="text-emerald-600">💵 {periodCashBills}</span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-sky-600">
                    {settings.currencySymbol}{totalTransfer.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-600">
                    {settings.currencySymbol}{totalCash.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-amber-500 text-sm font-black">
                    {settings.currencySymbol}{totalGrossRevenue.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-rose-500 text-sm">
                    {settings.currencySymbol}{totalBarberPayout.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-pink-500 text-sm">
                    {settings.currencySymbol}{allPeriodExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-rose-600 text-sm font-bold">
                    {settings.currencySymbol}{(totalBarberPayout + allPeriodExpenses.reduce((s, e) => s + e.amount, 0)).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-purple-600 text-sm font-black">
                    {settings.currencySymbol}{(totalShopNet - allPeriodExpenses.reduce((s, e) => s + e.amount, 0)).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setIsAccountingModalOpen(true);
                      }}
                      className="text-xs text-amber-600 font-bold hover:underline"
                    >
                      📄 ใบสรุปบัญชี
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* DAILY VIEW: หน้ารายการบิลของวันนั้น (Invoices Ledger Table)   */
        /* ------------------------------------------------------------- */
        <div className={`${theme.bgCard} rounded-2xl p-5 sm:p-6 transition-all duration-200 border ${borderSubtle}`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <h3 className={`text-base font-bold ${headingText}`}>
                  รายการบิลที่บันทึก (ประจำวันที่ {selectedDate})
                </h3>
              </div>
              <p className={`text-xs ${mutedText} mt-0.5`}>
                มีบันทึกทั้งหมด {filteredDailyBills.length} บิล • สามารถสลับวิธีชำระเงินด่วน (เผื่อบันทึกผิด), แก้ไขข้อมูล, และลบบิลได้
              </p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Button: Group/Merge Bills */}
              <button
                type="button"
                onClick={() => handleOpenMerge()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors btn-tactile"
                title="รวมบิลชำระด้วยกัน (เลือกหลายรายการ)"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>รวมบิล</span>
              </button>

              {/* Search Input */}
              <div className="relative flex-1 sm:w-44">
                <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${mutedText}`} />
                <input
                  type="text"
                  placeholder="ค้นหาบิล / ลูกค้า..."
                  value={billSearch}
                  onChange={(e) => setBillSearch(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200 focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-800'
                  }`}
                />
              </div>

              {/* Barber Filter */}
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

              {/* Payment Method Filter */}
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
                <option value="split">🔀 สลับ (สด+โอน)</option>
              </select>
            </div>
          </div>

          {/* Bills Table */}
          <div className={`overflow-x-auto rounded-xl border ${borderSubtle}`}>
            <table className="w-full text-left text-xs">
              <thead className={`border-b font-semibold ${tableHeaderBg}`}>
                <tr>
                  <th className="py-3 px-3">เลขที่บิล / เวลา</th>
                  <th className="py-3 px-3">ลูกค้า</th>
                  <th className="py-3 px-3">ช่าง</th>
                  <th className="py-3 px-3 text-right">ตัดผม</th>
                  <th className="py-3 px-3 text-right">เคมี</th>
                  <th className="py-3 px-3 text-right">สินค้า</th>
                  <th className="py-3 px-3 text-right">ทิป</th>
                  <th className="py-3 px-3 text-right font-bold text-amber-600">ยอดรวม</th>
                  <th className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ArrowRightLeft className="w-3 h-3 text-sky-500" />
                      <span>วิธีชำระ (สลับได้)</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right text-emerald-600">จ่ายช่าง</th>
                  <th className="py-3 px-3 text-right text-purple-600">ร้านได้รับ</th>
                  <th className="py-3 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-200/80'}`}>
                {filteredDailyBills.length === 0 ? (
                  <tr>
                    <td colSpan={12} className={`py-8 text-center ${mutedText}`}>
                      ไม่พบบันทึกบิลในวันที่ {selectedDate} (สามารถเลือกวันที่อื่นได้)
                    </td>
                  </tr>
                ) : (
                  filteredDailyBills.map((bill) => (
                    <tr key={bill.id} className={tableRowBg}>
                      {/* Bill number & Time */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-amber-600 block">{bill.billNumber}</span>
                        <span className={`text-[10px] ${mutedText}`}>
                          {bill.timeStr} น.
                        </span>
                      </td>

                      {/* Customer */}
                      <td className={`py-3 px-3 font-semibold ${headingText}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{bill.customerName}</span>
                        </div>
                        {bill.customerPhone && (
                          <span className={`block text-[10px] ${mutedText} font-mono`}>{bill.customerPhone}</span>
                        )}
                        {/* Merged Bill Badge & Indicator */}
                        {bill.mergedGroupId && (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                              <Link2 className="w-2.5 h-2.5" />
                              <span>{bill.mergedGroupName || `${bill.mergedBillCount || 3} รายการนี้ รวมกัน`}</span>
                            </span>
                            {bill.mergedTotalAmount && (
                              <span className={`text-[10px] ${mutedText} font-mono font-medium`}>
                                (ยอดรวม {settings.currencySymbol}{bill.mergedTotalAmount.toLocaleString()})
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Barber */}
                      <td className={`py-3 px-3 font-medium ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                        {bill.barberName}
                      </td>

                      {/* Haircut Fee */}
                      <td className="py-3 px-3 text-right font-mono">
                        {bill.haircutFee > 0 ? `${settings.currencySymbol}${bill.haircutFee.toLocaleString()}` : '-'}
                      </td>

                      {/* Chemical Fee */}
                      <td className="py-3 px-3 text-right font-mono">
                        {bill.chemicalFee > 0 ? `${settings.currencySymbol}${bill.chemicalFee.toLocaleString()}` : '-'}
                      </td>

                      {/* Products Fee */}
                      <td className="py-3 px-3 text-right font-mono">
                        {bill.totalProductsFee > 0 ? `${settings.currencySymbol}${bill.totalProductsFee.toLocaleString()}` : '-'}
                      </td>

                      {/* Tip Fee */}
                      <td className="py-3 px-3 text-right font-mono text-amber-600 font-medium">
                        {bill.tipFee > 0 ? `${settings.currencySymbol}${bill.tipFee.toLocaleString()}` : '-'}
                      </td>

                      {/* Gross Total */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-600 text-sm">
                        {settings.currencySymbol}{bill.grossTotal.toLocaleString()}
                      </td>

                      {/* Quick Payment Switch Button / Dropdown */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 p-0.5 rounded-lg border border-zinc-700/60 bg-zinc-950/60 dark:bg-zinc-950">
                          {/* Option: Transfer */}
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
                          {/* Option: Cash */}
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
                          {/* Option: Split */}
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
                        {bill.paymentMethod === 'split' && (
                          <div className="text-[9px] font-mono text-zinc-400 mt-0.5">
                            สด {bill.cashAmount} / โอน {bill.transferAmount}
                          </div>
                        )}
                      </td>

                      {/* Barber Earned */}
                      <td className="py-3 px-3 text-right font-mono text-emerald-600 font-semibold">
                        {settings.currencySymbol}{bill.commission.barberTotalEarned.toLocaleString()}
                      </td>

                      {/* Shop Net */}
                      <td className="py-3 px-3 text-right font-mono text-purple-600 font-semibold">
                        {settings.currencySymbol}{bill.commission.shopNetEarned.toLocaleString()}
                      </td>

                      {/* Actions: View Receipt, Edit Bill, Delete Bill */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Merge / Manage Merge Bill */}
                          <button
                            onClick={() => handleOpenMerge(bill.id, bill.mergedGroupId)}
                            title={bill.mergedGroupId ? 'แก้ไข/จัดการกลุ่มรวมบิลนี้' : 'รวมบิลกับรายการอื่น'}
                            className={`p-1.5 rounded-lg transition-colors btn-tactile ${
                              bill.mergedGroupId
                                ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                                : isDark
                                ? 'bg-zinc-800 hover:bg-indigo-500/20 text-zinc-300 hover:text-indigo-400'
                                : 'bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700'
                            }`}
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                          {/* View Receipt */}
                          <button
                            onClick={() => openReceiptModal(bill)}
                            title="ดูสลิปใบเสร็จ"
                            className={`p-1.5 rounded-lg transition-colors btn-tactile ${
                              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {/* Edit Bill */}
                          <button
                            onClick={() => openEditBillModal(bill)}
                            title="แก้ไขข้อมูลบิล"
                            className={`p-1.5 rounded-lg transition-colors btn-tactile ${
                              isDark ? 'bg-zinc-800 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-400' : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-700'
                            }`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {/* Delete Bill */}
                          <button
                            onClick={() => handleDeleteClick(bill)}
                            title="ลบบิล"
                            className={`p-1.5 rounded-lg transition-colors btn-tactile ${
                              isDark ? 'bg-zinc-800 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400' : 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700'
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

      {/* 6. CHARTS & HOURLY TRENDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Trend Bar Chart */}
        <div className={`lg:col-span-8 ${theme.bgCard} rounded-2xl p-5 sm:p-6 transition-all duration-200 border ${borderSubtle}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-600" />
              <h3 className={`text-base font-bold ${headingText}`}>
                {viewMode === 'daily' ? `ยอดขายตามช่วงเวลา (${selectedDate})` : `ยอดขายรายวันในเดือน (${selectedMonth})`}
              </h3>
            </div>
            <span className={`text-xs font-mono ${mutedText}`}>
              สูงสุด {settings.currencySymbol}{maxChartVal.toLocaleString()}
            </span>
          </div>

          <div className={`h-48 flex items-end gap-2 pt-6 pb-2 px-2 border-b ${borderSubtle}`}>
            {chartBars.map((bar, idx) => {
              const heightPercent = Math.max(8, (bar.total / maxChartVal) * 100);
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative"
                >
                  {/* Tooltip */}
                  <div className={`absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] py-1 px-2 rounded shadow-xl whitespace-nowrap z-20 pointer-events-none font-mono ${
                    isDark ? 'bg-zinc-950 border border-zinc-700 text-zinc-100' : 'bg-slate-900 text-white'
                  }`}>
                    {settings.currencySymbol}{bar.total.toLocaleString()} ({bar.count} บิล)
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                      bar.total > 0
                        ? isDark
                          ? 'bg-gradient-to-t from-amber-500 to-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 shadow-sm'
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

        {/* Payment Channels Split Visual */}
        <div className={`lg:col-span-4 ${theme.bgCard} rounded-2xl p-5 sm:p-6 space-y-4 transition-all duration-200 border ${borderSubtle}`}>
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-sky-600" />
            <h3 className={`text-base font-bold ${headingText}`}>
              สัดส่วนช่องทางชำระเงิน
            </h3>
          </div>

          <div className="space-y-3">
            <div className={`h-4 w-full rounded-full overflow-hidden flex border ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div
                style={{ width: `${totalGrossRevenue > 0 ? (totalTransfer / totalGrossRevenue) * 100 : 50}%` }}
                className="bg-sky-500 h-full transition-all duration-500"
                title="โอนเงิน"
              />
              <div
                style={{ width: `${totalGrossRevenue > 0 ? (totalCash / totalGrossRevenue) * 100 : 50}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title="เงินสด"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl border ${
                isDark ? 'bg-zinc-950/80 border-sky-500/20' : 'bg-sky-50/50 border-sky-200'
              }`}>
                <div className="flex items-center gap-1.5 text-sky-600 font-semibold mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span>โอนเงิน</span>
                </div>
                <p className={`font-mono text-sm font-bold ${headingText}`}>
                  {settings.currencySymbol}{totalTransfer.toLocaleString()}
                </p>
                <p className={`text-[10px] ${mutedText}`}>
                  {totalGrossRevenue > 0 ? ((totalTransfer / totalGrossRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>

              <div className={`p-2.5 rounded-xl border ${
                isDark ? 'bg-zinc-950/80 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200'
              }`}>
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>เงินสด</span>
                </div>
                <p className={`font-mono text-sm font-bold ${headingText}`}>
                  {settings.currencySymbol}{totalCash.toLocaleString()}
                </p>
                <p className={`text-[10px] ${mutedText}`}>
                  {totalGrossRevenue > 0 ? ((totalCash / totalGrossRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
