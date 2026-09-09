import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Sparkles,
  CreditCard,
  Banknote,
  Eye,
  ChevronRight,
  BarChart2,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { SaleBill, ShopExpense, Barber, ShopSettings } from '../types';
import { sounds } from '../utils/sound';

interface DailyTrend30DaysChartProps {
  bills: SaleBill[];
  expenses: ShopExpense[];
  barbers: Barber[];
  settings: ShopSettings;
  isDark: boolean;
  selectedDate?: string;
  onInspectDay?: (dateStr: string) => void;
}

type TrendMetricMode = 'revenueAndTrend' | 'financialBreakdown' | 'paymentChannels' | 'customerVolume';
type TrendTimeRange = 7 | 14 | 30;

const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];
const THAI_DAYS_LONG = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์',
];

export const DailyTrend30DaysChart: React.FC<DailyTrend30DaysChartProps> = ({
  bills,
  expenses,
  barbers,
  settings,
  isDark,
  selectedDate,
  onInspectDay,
}) => {
  const [metricMode, setMetricMode] = useState<TrendMetricMode>('revenueAndTrend');
  const [timeRange, setTimeRange] = useState<TrendTimeRange>(30);
  const [showTable, setShowTable] = useState<boolean>(false);

  // Reference anchor date: defaults to today
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [anchorDate, setAnchorDate] = useState<string>(selectedDate || todayStr);

  // Group bills and expenses by dateStr for ultra-fast O(1) lookups
  const billsByDate = useMemo(() => {
    const map: Record<string, SaleBill[]> = {};
    for (let i = 0; i < bills.length; i++) {
      const b = bills[i];
      if (!map[b.dateStr]) map[b.dateStr] = [];
      map[b.dateStr].push(b);
    }
    return map;
  }, [bills]);

  const expensesByDate = useMemo(() => {
    const map: Record<string, ShopExpense[]> = {};
    for (let i = 0; i < expenses.length; i++) {
      const e = expenses[i];
      if (!map[e.dateStr]) map[e.dateStr] = [];
      map[e.dateStr].push(e);
    }
    return map;
  }, [expenses]);

  // Generate date points for the past N days ending at anchorDate
  const daysData = useMemo(() => {
    let anchor: Date;
    try {
      const [y, m, d] = anchorDate.split('-').map(Number);
      anchor = new Date(y, m - 1, d);
      if (isNaN(anchor.getTime())) {
        anchor = new Date();
      }
    } catch {
      anchor = new Date();
    }

    const rawList: Array<{
      dateStr: string;
      label: string;
      shortDate: string;
      fullDateTh: string;
      dayOfWeekTh: string;
      isWeekend: boolean;
      shopRevenue: number;
      haircutRev: number;
      chemicalRev: number;
      productsRev: number;
      discounts: number;
      tipsRev: number;
      barberPayout: number;
      expenseAmount: number;
      shopNetProfit: number;
      transferAmount: number;
      cashAmount: number;
      customerPayments: number;
      billCount: number;
      haircutCount: number;
      movingAvg7: number;
    }> = [];

    // Collect days from earliest to latest (chronological)
    for (let i = timeRange - 1; i >= 0; i--) {
      const target = new Date(anchor);
      target.setDate(target.getDate() - i);

      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, '0');
      const d = String(target.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const dayIdx = target.getDay();
      const dayOfWeekTh = THAI_DAYS_SHORT[dayIdx];
      const isWeekend = dayIdx === 0 || dayIdx === 6;
      const shortDate = `${target.getDate()} ${THAI_MONTHS_SHORT[target.getMonth()]}`;
      const fullDateTh = `${THAI_DAYS_LONG[dayIdx]}ที่ ${target.getDate()} ${THAI_MONTHS_SHORT[target.getMonth()]} ${y + 543}`;

      const dayBills = billsByDate[dateStr] || [];
      const dayExpenses = expensesByDate[dateStr] || [];

      let haircutRev = 0;
      let chemicalRev = 0;
      let productsRev = 0;
      let discounts = 0;
      let tipsRev = 0;
      let barberPayout = 0;
      let transferAmount = 0;
      let cashAmount = 0;
      let customerPayments = 0;
      let shopCommissionGross = 0;
      let haircutCount = 0;

      for (let j = 0; j < dayBills.length; j++) {
        const b = dayBills[j];
        haircutRev += b.haircutFee;
        chemicalRev += b.chemicalFee;
        productsRev += b.totalProductsFee;
        discounts += b.totalDiscountAmount || 0;
        tipsRev += b.tipFee;
        barberPayout += b.commission.barberTotalEarned; // Includes 100% tip payout
        shopCommissionGross += b.commission.shopNetEarned;
        transferAmount += b.transferAmount;
        cashAmount += b.cashAmount;
        customerPayments += b.grossTotal;
        if (b.haircutFee > 0) {
          haircutCount += (b.headCount && b.headCount > 0 ? b.headCount : 1);
        }
      }

      // Shop Revenue = Services + Products - Discounts (strictly excluding tips)
      const shopRevenue = Math.max(0, (haircutRev + chemicalRev + productsRev) - discounts);

      let expenseAmount = 0;
      for (let k = 0; k < dayExpenses.length; k++) {
        expenseAmount += dayExpenses[k].amount;
      }

      const shopNetProfit = shopCommissionGross - expenseAmount;

      rawList.push({
        dateStr,
        label: `${dayOfWeekTh} ${target.getDate()}`,
        shortDate,
        fullDateTh,
        dayOfWeekTh,
        isWeekend,
        shopRevenue,
        haircutRev,
        chemicalRev,
        productsRev,
        discounts,
        tipsRev,
        barberPayout,
        expenseAmount,
        shopNetProfit,
        transferAmount,
        cashAmount,
        customerPayments,
        billCount: dayBills.length,
        haircutCount,
        movingAvg7: 0, // Computed below
      });
    }

    // Compute 7-day moving average for smoothing trend analysis
    for (let i = 0; i < rawList.length; i++) {
      const windowStart = Math.max(0, i - 6);
      const windowSlice = rawList.slice(windowStart, i + 1);
      const windowSum = windowSlice.reduce((sum, item) => sum + item.shopRevenue, 0);
      rawList[i].movingAvg7 = Math.round(windowSum / windowSlice.length);
    }

    return rawList;
  }, [anchorDate, timeRange, billsByDate, expensesByDate]);

  // Overall statistics for the selected time range
  const summary = useMemo(() => {
    const totalShopRevenue = daysData.reduce((s, d) => s + d.shopRevenue, 0);
    const avgDailyRevenue = daysData.length > 0 ? Math.round(totalShopRevenue / daysData.length) : 0;
    const totalNetProfit = daysData.reduce((s, d) => s + d.shopNetProfit, 0);
    const totalBarberPayout = daysData.reduce((s, d) => s + d.barberPayout, 0);
    const totalBills = daysData.reduce((s, d) => s + d.billCount, 0);
    const avgBillsPerDay = daysData.length > 0 ? (totalBills / daysData.length).toFixed(1) : '0';
    const totalTransfer = daysData.reduce((s, d) => s + d.transferAmount, 0);
    const totalCash = daysData.reduce((s, d) => s + d.cashAmount, 0);
    const totalTips = daysData.reduce((s, d) => s + d.tipsRev, 0);
    const totalExpenses = daysData.reduce((s, d) => s + d.expenseAmount, 0);

    const profitMargin = totalShopRevenue > 0 ? ((totalNetProfit / totalShopRevenue) * 100).toFixed(1) : '0';

    // Find peak sales day
    let peakDay: typeof daysData[0] | null = null;
    let maxRev = -1;
    for (let i = 0; i < daysData.length; i++) {
      if (daysData[i].shopRevenue > maxRev) {
        maxRev = daysData[i].shopRevenue;
        peakDay = daysData[i];
      }
    }

    // Growth comparison: compare first half vs second half of the selected range
    const halfLen = Math.floor(daysData.length / 2);
    const firstHalfRev = daysData.slice(0, halfLen).reduce((s, d) => s + d.shopRevenue, 0);
    const secondHalfRev = daysData.slice(halfLen).reduce((s, d) => s + d.shopRevenue, 0);

    let growthPercent: number | null = null;
    if (firstHalfRev > 0) {
      growthPercent = parseFloat((((secondHalfRev - firstHalfRev) / firstHalfRev) * 100).toFixed(1));
    }

    const activeDaysCount = daysData.filter((d) => d.shopRevenue > 0 || d.billCount > 0).length;

    return {
      totalShopRevenue,
      avgDailyRevenue,
      totalNetProfit,
      profitMargin,
      totalBarberPayout,
      totalBills,
      avgBillsPerDay,
      totalTransfer,
      totalCash,
      totalTips,
      totalExpenses,
      peakDay,
      growthPercent,
      activeDaysCount,
    };
  }, [daysData]);

  // Max value for chart Y-axis scaling
  const maxVal = useMemo(() => {
    let highest = 1000;
    daysData.forEach((d) => {
      highest = Math.max(
        highest,
        d.shopRevenue,
        d.movingAvg7,
        metricMode === 'financialBreakdown' ? d.barberPayout : 0,
        metricMode === 'paymentChannels' ? Math.max(d.transferAmount, d.cashAmount) : 0
      );
    });
    return Math.ceil(highest * 1.15);
  }, [daysData, metricMode]);

  // Color schemes based on dark/light mode
  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-zinc-900/90' : 'bg-white';
  const borderSubtle = isDark ? 'border-zinc-800' : 'border-slate-200';
  const gridStroke = isDark ? '#27272a' : '#e2e8f0';
  const axisColor = isDark ? '#a1a1aa' : '#64748b';

  return (
    <div className={`${cardBg} rounded-2xl p-4 sm:p-6 border ${borderSubtle} shadow-xs space-y-5 transition-all`}>
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className={`text-base sm:text-lg font-bold ${headingText} flex items-center gap-2`}>
              <span>แนวโน้มยอดขายรายวัน</span>
              <span className="text-amber-500 font-mono">ย้อนหลัง {timeRange} วัน</span>
            </h3>

            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              {daysData[0]?.shortDate} - {daysData[daysData.length - 1]?.shortDate}
            </span>
          </div>
          <p className={`text-xs ${mutedText}`}>
            กราฟเส้นแสดงทิศทางรายได้ร้าน (ไม่รวมทิปช่าง) และค่าเฉลี่ยเคลื่อนที่ 7 วัน เพื่อวิเคราะห์อัตราการเติบโต
          </p>
        </div>

        {/* Action Controls: Time Range & Anchor Date */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-950/40 dark:bg-zinc-950 border border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setTimeRange(7);
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                timeRange === 7
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 วัน
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setTimeRange(14);
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                timeRange === 14
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              14 วัน
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setTimeRange(30);
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeRange === 30
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 วัน
            </button>
          </div>

          {/* Anchor Date Picker */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={anchorDate}
              onChange={(e) => {
                if (e.target.value) {
                  sounds.playClick();
                  setAnchorDate(e.target.value);
                }
              }}
              title="เลือกวันที่สิ้นสุดของช่วงเวลา"
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-semibold border focus:outline-none ${
                isDark
                  ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-amber-500'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-slate-800'
              }`}
            />
            {anchorDate !== todayStr && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setAnchorDate(todayStr);
                }}
                className={`px-2 py-1 rounded-lg text-xs font-semibold border btn-tactile ${
                  isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                วันนี้
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. SUMMARY KPI METRIC CARDS (30-DAY STATS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Shop Revenue */}
        <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-amber-500/25' : 'bg-amber-50/50 border-amber-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`${mutedText} font-semibold flex items-center gap-1`}>
              <DollarSign className="w-3.5 h-3.5 text-amber-500" />
              <span>ยอดขาย {timeRange} วัน</span>
            </span>
            {summary.growthPercent !== null && (
              <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full flex items-center gap-0.5 ${
                summary.growthPercent >= 0
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'bg-rose-500/15 text-rose-500'
              }`}>
                {summary.growthPercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(summary.growthPercent)}%
              </span>
            )}
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-amber-500 tracking-tight">
            {settings.currencySymbol}{summary.totalShopRevenue.toLocaleString()}
          </div>
          <div className={`text-[11px] ${mutedText} mt-1 font-mono`}>
            เฉลี่ย <strong>{settings.currencySymbol}{summary.avgDailyRevenue.toLocaleString()}</strong>/วัน
          </div>
        </div>

        {/* Card 2: Peak Revenue Day */}
        <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`${mutedText} font-semibold flex items-center gap-1`}>
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>วันขายดีที่สุด</span>
            </span>
            <span className="text-[10px] text-amber-500 font-bold">PEAK</span>
          </div>
          <div className={`text-base sm:text-lg font-black font-mono ${headingText}`}>
            {summary.peakDay && summary.peakDay.shopRevenue > 0
              ? `${settings.currencySymbol}${summary.peakDay.shopRevenue.toLocaleString()}`
              : '฿0'}
          </div>
          <div className={`text-[11px] ${mutedText} mt-1 truncate`}>
            {summary.peakDay && summary.peakDay.shopRevenue > 0
              ? `${summary.peakDay.label} (${summary.peakDay.billCount} บิล)`
              : 'ยังไม่มีข้อมูล'}
          </div>
        </div>

        {/* Card 3: Total Net Profit */}
        <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`${mutedText} font-semibold flex items-center gap-1`}>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>กำไรสุทธิร้าน</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-purple-400">
              {summary.profitMargin}%
            </span>
          </div>
          <div className={`text-base sm:text-lg font-black font-mono ${
            summary.totalNetProfit >= 0 ? 'text-purple-400' : 'text-rose-500'
          }`}>
            {settings.currencySymbol}{summary.totalNetProfit.toLocaleString()}
          </div>
          <div className={`text-[11px] ${mutedText} mt-1 font-mono`}>
            จ่ายช่าง ฿{summary.totalBarberPayout.toLocaleString()}
          </div>
        </div>

        {/* Card 4: Customer Bills Volume */}
        <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`${mutedText} font-semibold flex items-center gap-1`}>
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>ลูกค้า / บิล</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {summary.activeDaysCount}/{timeRange} วัน
            </span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-cyan-400">
            {summary.totalBills.toLocaleString()} บิล
          </div>
          <div className={`text-[11px] ${mutedText} mt-1 font-mono`}>
            เฉลี่ย <strong>{summary.avgBillsPerDay}</strong> บิล/วัน
          </div>
        </div>

        {/* Card 5: Payment Channels */}
        <div className={`p-3.5 rounded-xl border col-span-2 sm:col-span-1 ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`${mutedText} font-semibold flex items-center gap-1`}>
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              <span>โอน vs เงินสด</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono font-bold mt-1">
            <span className="text-blue-500 flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              ฿{summary.totalTransfer.toLocaleString()}
            </span>
            <span className="text-emerald-500 flex items-center gap-1">
              <Banknote className="w-3 h-3" />
              ฿{summary.totalCash.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden flex">
            <div
              style={{
                width: `${summary.totalTransfer + summary.totalCash > 0
                  ? (summary.totalTransfer / (summary.totalTransfer + summary.totalCash)) * 100
                  : 50}%`,
              }}
              className="bg-blue-500 h-full"
            />
            <div
              style={{
                width: `${summary.totalTransfer + summary.totalCash > 0
                  ? (summary.totalCash / (summary.totalTransfer + summary.totalCash)) * 100
                  : 50}%`,
              }}
              className="bg-emerald-500 h-full"
            />
          </div>
        </div>
      </div>

      {/* 3. METRIC MODE TOGGLES */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-zinc-800/60">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMetricMode('revenueAndTrend');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all btn-tactile flex items-center gap-1.5 border shrink-0 ${
              metricMode === 'revenueAndTrend'
                ? isDark
                  ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                  : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : isDark
                ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>รายได้ร้าน & เส้นเฉลี่ย 7 วัน</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMetricMode('financialBreakdown');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all btn-tactile flex items-center gap-1.5 border shrink-0 ${
              metricMode === 'financialBreakdown'
                ? isDark
                  ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                  : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : isDark
                ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>รายได้ vs กำไรสุทธิ vs ค่าแรงช่าง</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMetricMode('paymentChannels');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all btn-tactile flex items-center gap-1.5 border shrink-0 ${
              metricMode === 'paymentChannels'
                ? isDark
                  ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                  : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : isDark
                ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>โอน vs เงินสด</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMetricMode('customerVolume');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all btn-tactile flex items-center gap-1.5 border shrink-0 ${
              metricMode === 'customerVolume'
                ? isDark
                  ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                  : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : isDark
                ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>จำนวนลูกค้า (บิล)</span>
          </button>
        </div>

        {/* Toggle detailed table view */}
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            setShowTable(!showTable);
          }}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all btn-tactile shrink-0 ${
            showTable
              ? isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-slate-200 border-slate-300 text-slate-800'
              : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200' : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>{showTable ? 'ซ่อนตารางรายวัน' : 'ดูตารางแจกแจงรายวัน'}</span>
        </button>
      </div>

      {/* 4. MAIN INTERACTIVE RECHARTS LINE CHART */}
      <div className="w-full h-72 sm:h-96 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={daysData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="trendRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="trendProfitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.6} />

            <XAxis
              dataKey="label"
              stroke={axisColor}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: gridStroke }}
              interval={timeRange === 30 ? 2 : 0}
            />

            <YAxis
              yAxisId="left"
              stroke={axisColor}
              fontSize={11}
              domain={[0, maxVal]}
              tickFormatter={(v) => `฿${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
              tickLine={false}
              axisLine={false}
            />

            {metricMode === 'customerVolume' && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#06b6d4"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v} บิล`}
              />
            )}

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as typeof daysData[0];
                  return (
                    <div className={`p-3.5 rounded-xl shadow-2xl border text-xs min-w-[220px] font-sans ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      <div className="flex items-center justify-between border-b pb-2 mb-2 border-zinc-800 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          <span>{data.fullDateTh}</span>
                        </span>
                        {data.isWeekend && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                            วันหยุด
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 font-mono">
                        <div className="flex justify-between items-center text-amber-500 font-bold">
                          <span>💰 ยอดขายร้าน:</span>
                          <span>฿{data.shopRevenue.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between items-center text-emerald-400 text-[11px]">
                          <span>📈 ค่าเฉลี่ย 7 วัน:</span>
                          <span>฿{data.movingAvg7.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between items-center text-purple-400 text-[11px]">
                          <span>💎 กำไรสุทธิร้าน:</span>
                          <span>฿{data.shopNetProfit.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between items-center text-rose-400 text-[11px]">
                          <span>✂️ จ่ายส่วนแบ่งช่าง:</span>
                          <span>฿{data.barberPayout.toLocaleString()}</span>
                        </div>

                        {data.tipsRev > 0 && (
                          <div className="flex justify-between items-center text-amber-400/80 text-[11px]">
                            <span>* ทิปช่าง (ส่งมอบ):</span>
                            <span>฿{data.tipsRev.toLocaleString()}</span>
                          </div>
                        )}

                        <div className="pt-1.5 mt-1 border-t border-zinc-800 flex justify-between text-[11px]">
                          <span className={mutedText}>💳 โอน: ฿{data.transferAmount.toLocaleString()}</span>
                          <span className={mutedText}>💵 สด: ฿{data.cashAmount.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between text-[11px] text-cyan-400 font-bold pt-0.5">
                          <span>👥 จำนวนลูกค้า:</span>
                          <span>{data.billCount} บิล ({data.haircutCount} ตัดผม)</span>
                        </div>
                      </div>

                      {onInspectDay && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-800 text-[10px] text-amber-500 text-center font-bold">
                          คลิกที่จุดเพื่อดูรายละเอียดบิลประจำวันนี้
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            />

            {/* Reference Line: 30-Day Average Daily Sales */}
            <ReferenceLine
              yAxisId="left"
              y={summary.avgDailyRevenue}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: `เฉลี่ย ฿${summary.avgDailyRevenue.toLocaleString()}`,
                fill: isDark ? '#fbbf24' : '#b45309',
                fontSize: 10,
                position: 'right',
              }}
            />

            {/* MODE 1: REVENUE AND 7-DAY MOVING AVERAGE TREND */}
            {metricMode === 'revenueAndTrend' && (
              <>
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="shopRevenue"
                  name="ยอดขายร้าน (฿)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#trendRevenueGradient)"
                  dot={{ r: 3, fill: '#f59e0b', strokeWidth: 1.5, stroke: isDark ? '#18181b' : '#ffffff' }}
                  activeDot={{
                    r: 6,
                    fill: '#f59e0b',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    onClick: (_, payload) => {
                      if (onInspectDay && payload && (payload as any).payload) {
                        sounds.playClick();
                        onInspectDay((payload as any).payload.dateStr);
                      }
                    },
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="movingAvg7"
                  name="เส้นเฉลี่ยเคลื่อนที่ 7 วัน (7D MA)"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </>
            )}

            {/* MODE 2: FINANCIAL BREAKDOWN (REVENUE VS NET PROFIT VS BARBER PAYOUT) */}
            {metricMode === 'financialBreakdown' && (
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="shopRevenue"
                  name="ยอดขายร้าน (฿)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#f59e0b' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="shopNetProfit"
                  name="กำไรสุทธิร้าน (฿)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#8b5cf6' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="barberPayout"
                  name="ค่าแรงช่างรวมทิป (฿)"
                  stroke="#ef4444"
                  strokeWidth={1.8}
                  dot={{ r: 2.5, fill: '#ef4444' }}
                />
              </>
            )}

            {/* MODE 3: PAYMENT CHANNELS (TRANSFER VS CASH) */}
            {metricMode === 'paymentChannels' && (
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="transferAmount"
                  name="ยอดเงินโอน (฿)"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#3b82f6' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cashAmount"
                  name="ยอดเงินสด (฿)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                />
              </>
            )}

            {/* MODE 4: CUSTOMER VOLUME */}
            {metricMode === 'customerVolume' && (
              <>
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="shopRevenue"
                  name="ยอดขายร้าน (฿)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#trendRevenueGradient)"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="billCount"
                  name="จำนวนบิล/ลูกค้า (คน)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#06b6d4' }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 5. QUICK INSIGHT BANNER */}
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
        isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            {summary.growthPercent !== null ? (
              summary.growthPercent >= 0 ? (
                <>
                  แนวโน้มรายได้ช่วงครึ่งหลังเติบโตขึ้น <strong className="text-emerald-500 font-mono">+{summary.growthPercent}%</strong> เมื่อเทียบกับช่วงครึ่งแรก
                </>
              ) : (
                <>
                  แนวโน้มรายได้ช่วงครึ่งหลังลดลง <strong className="text-rose-500 font-mono">{summary.growthPercent}%</strong> เมื่อเทียบกับช่วงครึ่งแรก
                </>
              )
            ) : (
              <>ยอดขายเฉลี่ยรายวันอยู่ที่ <strong>{settings.currencySymbol}{summary.avgDailyRevenue.toLocaleString()}</strong> ต่อวัน</>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>ยอดขายร้าน</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>เส้นแนวโน้ม 7 วัน</span>
          </span>
        </div>
      </div>

      {/* 6. COLLAPSIBLE DAILY DETAIL BREAKDOWN TABLE */}
      {showTable && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className={`text-xs font-bold ${headingText} flex items-center gap-1.5`}>
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>ตารางแจกแจงรายวันย้อนหลัง {timeRange} วัน ({daysData[0]?.shortDate} - {daysData[daysData.length - 1]?.shortDate})</span>
            </h4>
            <span className={`text-[11px] ${mutedText}`}>
              คลิกที่แถวเพื่อดูรายการบิลของวันนั้น
            </span>
          </div>

          <div className={`overflow-x-auto rounded-xl border ${borderSubtle}`}>
            <table className="w-full text-xs text-left">
              <thead className={isDark ? 'bg-zinc-950 text-zinc-400 border-b border-zinc-800' : 'bg-slate-100 text-slate-600 border-b border-slate-200'}>
                <tr>
                  <th className="py-2.5 px-3 font-semibold">วันที่</th>
                  <th className="py-2.5 px-3 font-semibold text-right">ยอดขายร้าน</th>
                  <th className="py-2.5 px-3 font-semibold text-right">โอน</th>
                  <th className="py-2.5 px-3 font-semibold text-right">เงินสด</th>
                  <th className="py-2.5 px-3 font-semibold text-right">จ่ายช่าง</th>
                  <th className="py-2.5 px-3 font-semibold text-right">กำไรสุทธิ</th>
                  <th className="py-2.5 px-3 font-semibold text-center">บิล</th>
                  <th className="py-2.5 px-3 font-semibold text-center">ดูบิล</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {/* Render days in reverse order (newest date first) for easy reading */}
                {[...daysData].reverse().map((day) => {
                  const isPeak = summary.peakDay && summary.peakDay.dateStr === day.dateStr && day.shopRevenue > 0;
                  return (
                    <tr
                      key={day.dateStr}
                      onClick={() => {
                        if (onInspectDay && day.billCount > 0) {
                          sounds.playClick();
                          onInspectDay(day.dateStr);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-slate-50'
                      } ${isPeak ? (isDark ? 'bg-amber-500/10' : 'bg-amber-50/80') : ''}`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-medium ${day.isWeekend ? 'text-amber-500 font-bold' : ''}`}>
                            {day.label}
                          </span>
                          {isPeak && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500 text-zinc-950">
                              สูงสุด
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-500">
                        {settings.currencySymbol}{day.shopRevenue.toLocaleString()}
                      </td>

                      <td className="py-2 px-3 text-right font-mono text-blue-400">
                        {day.transferAmount > 0 ? `${settings.currencySymbol}${day.transferAmount.toLocaleString()}` : '-'}
                      </td>

                      <td className="py-2 px-3 text-right font-mono text-emerald-400">
                        {day.cashAmount > 0 ? `${settings.currencySymbol}${day.cashAmount.toLocaleString()}` : '-'}
                      </td>

                      <td className="py-2 px-3 text-right font-mono text-rose-400">
                        {day.barberPayout > 0 ? `${settings.currencySymbol}${day.barberPayout.toLocaleString()}` : '-'}
                      </td>

                      <td className={`py-2 px-3 text-right font-mono font-semibold ${
                        day.shopNetProfit > 0 ? 'text-purple-400' : day.shopNetProfit < 0 ? 'text-rose-500' : mutedText
                      }`}>
                        {settings.currencySymbol}{day.shopNetProfit.toLocaleString()}
                      </td>

                      <td className="py-2 px-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          day.billCount > 0
                            ? 'bg-cyan-500/15 text-cyan-400'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {day.billCount}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-center">
                        {day.billCount > 0 ? (
                          <button
                            type="button"
                            className="p-1 rounded-lg text-amber-500 hover:bg-amber-500/20 transition-all"
                            title="ดูรายละเอียดบิล"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
