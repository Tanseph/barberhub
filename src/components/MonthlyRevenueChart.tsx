import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Calendar,
  DollarSign,
  Scissors,
  Sparkles,
  ArrowUpRight,
  UserCheck,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { SaleBill, ShopExpense, Barber, ShopSettings } from '../types';

interface MonthlyRevenueChartProps {
  bills: SaleBill[];
  expenses: ShopExpense[];
  barbers: Barber[];
  settings: ShopSettings;
  selectedMonth: string; // e.g., '2026-08'
  isDark: boolean;
}

type ChartViewType = 'dailyTrend' | 'monthly12' | 'servicePie' | 'barberPerformance';

export const MonthlyRevenueChart: React.FC<MonthlyRevenueChartProps> = ({
  bills,
  expenses,
  barbers,
  settings,
  selectedMonth,
  isDark,
}) => {
  const [chartView, setChartView] = useState<ChartViewType>('dailyTrend');
  const [metricMode, setMetricMode] = useState<'grossAndNet' | 'paymentSplit'>('grossAndNet');

  // Theme colors
  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-zinc-900/90' : 'bg-white';
  const borderSubtle = isDark ? 'border-zinc-800' : 'border-slate-200';
  const gridStroke = isDark ? '#27272a' : '#e2e8f0';
  const axisColor = isDark ? '#a1a1aa' : '#64748b';

  // 1. Data for Daily breakdown in the selected month
  const dailyData = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayPadded = String(d).padStart(2, '0');
      const dateStr = `${selectedMonth}-${dayPadded}`;
      const dayBills = bills.filter((b) => b.dateStr === dateStr);
      const dayExpenses = expenses.filter((e) => e.dateStr === dateStr);

      const gross = dayBills.reduce((s, b) => s + b.grossTotal, 0);
      const barberPayroll = dayBills.reduce((s, b) => s + b.commission.barberTotalEarned, 0);
      const expenseAmount = dayExpenses.reduce((s, e) => s + e.amount, 0);
      const shopNet = dayBills.reduce((s, b) => s + b.commission.shopNetEarned, 0) - expenseAmount;
      const transfer = dayBills.reduce((s, b) => s + b.transferAmount, 0);
      const cash = dayBills.reduce((s, b) => s + b.cashAmount, 0);
      const haircut = dayBills.reduce((s, b) => s + b.haircutFee, 0);
      const chemical = dayBills.reduce((s, b) => s + b.chemicalFee, 0);
      const product = dayBills.reduce((s, b) => s + b.totalProductsFee, 0);

      data.push({
        day: `วันที่ ${d}`,
        dayNum: d,
        dateStr,
        gross,
        shopNet: Math.max(0, shopNet),
        barberPayroll,
        expenseAmount,
        transfer,
        cash,
        haircut,
        chemical,
        product,
        billCount: dayBills.length,
      });
    }
    return data;
  }, [bills, expenses, selectedMonth]);

  // 2. Data for 6-12 Months historical trend
  const multiMonthData = useMemo(() => {
    const [currYear, currMonth] = selectedMonth.split('-').map(Number);
    const months = [];
    
    // Generate past 6 months leading up to selected month
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currYear, currMonth - 1 - i, 1);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const mKey = `${yStr}-${mStr}`;
      
      const monthBills = bills.filter((b) => b.dateStr.startsWith(mKey));
      const monthExpenses = expenses.filter((e) => e.dateStr.startsWith(mKey));

      const gross = monthBills.reduce((s, b) => s + b.grossTotal, 0);
      const barberPayroll = monthBills.reduce((s, b) => s + b.commission.barberTotalEarned, 0);
      const expenseAmount = monthExpenses.reduce((s, e) => s + e.amount, 0);
      const shopNet = monthBills.reduce((s, b) => s + b.commission.shopNetEarned, 0) - expenseAmount;
      const transfer = monthBills.reduce((s, b) => s + b.transferAmount, 0);
      const cash = monthBills.reduce((s, b) => s + b.cashAmount, 0);

      const monthLabel = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });

      months.push({
        monthKey: mKey,
        monthLabel,
        gross,
        shopNet: Math.max(0, shopNet),
        barberPayroll,
        expenseAmount,
        transfer,
        cash,
        billsCount: monthBills.length,
        isCurrent: mKey === selectedMonth,
      });
    }
    return months;
  }, [bills, expenses, selectedMonth]);

  // 3. Data for Service Breakdown in selected month
  const servicePieData = useMemo(() => {
    const monthBills = bills.filter((b) => b.dateStr.startsWith(selectedMonth));
    const haircut = monthBills.reduce((s, b) => s + b.haircutFee, 0);
    const chemical = monthBills.reduce((s, b) => s + b.chemicalFee, 0);
    const product = monthBills.reduce((s, b) => s + b.totalProductsFee, 0);
    const tip = monthBills.reduce((s, b) => s + b.tipFee, 0);

    const total = haircut + chemical + product + tip;
    if (total === 0) return [];

    return [
      { name: 'บริการตัดผม', value: haircut, color: '#f59e0b', percent: ((haircut / total) * 100).toFixed(1) },
      { name: 'บริการเคมี/ดัด/ทำสี', value: chemical, color: '#8b5cf6', percent: ((chemical / total) * 100).toFixed(1) },
      { name: 'ขายสินค้า/โพเมด', value: product, color: '#06b6d4', percent: ((product / total) * 100).toFixed(1) },
      { name: 'ทิปช่าง', value: tip, color: '#10b981', percent: ((tip / total) * 100).toFixed(1) },
    ].filter((item) => item.value > 0);
  }, [bills, selectedMonth]);

  // 4. Data for Barber Performance in selected month
  const barberPerformanceData = useMemo(() => {
    const monthBills = bills.filter((b) => b.dateStr.startsWith(selectedMonth));
    return barbers.map((barber) => {
      const bBills = monthBills.filter((b) => b.barberId === barber.id);
      const gross = bBills.reduce((s, b) => s + b.grossTotal, 0);
      const earned = bBills.reduce((s, b) => s + b.commission.barberTotalEarned, 0);
      const shopEarned = bBills.reduce((s, b) => s + b.commission.shopNetEarned, 0);
      const heads = bBills.filter((b) => b.haircutFee > 0).length;

      return {
        name: barber.nickname,
        fullName: barber.name,
        avatar: barber.avatar,
        gross,
        earned,
        shopEarned,
        heads,
        bills: bBills.length,
      };
    }).sort((a, b) => b.gross - a.gross);
  }, [barbers, bills, selectedMonth]);

  // Stats calculation
  const bestDay = useMemo(() => {
    const activeDays = dailyData.filter((d) => d.gross > 0);
    if (activeDays.length === 0) return null;
    return activeDays.reduce((prev, curr) => (curr.gross > prev.gross ? curr : prev), activeDays[0]);
  }, [dailyData]);

  const activeDaysCount = useMemo(() => dailyData.filter((d) => d.gross > 0).length, [dailyData]);
  const monthTotalGross = useMemo(() => dailyData.reduce((s, d) => s + d.gross, 0), [dailyData]);
  const monthDailyAvg = activeDaysCount > 0 ? Math.round(monthTotalGross / activeDaysCount) : 0;

  // Custom Tooltip Formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-3.5 rounded-xl shadow-xl border text-xs space-y-1.5 z-50 ${
            isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-100' : 'bg-slate-900 border-slate-700 text-white'
          }`}
        >
          <p className="font-bold border-b border-zinc-700/60 pb-1 text-amber-400">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-zinc-300">{entry.name}:</span>
              </div>
              <span className="font-mono font-bold text-white">
                {settings.currencySymbol}
                {Number(entry.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`${cardBg} rounded-2xl p-5 sm:p-6 transition-all duration-200 border ${borderSubtle} shadow-sm space-y-5`}>
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            <h3 className={`text-base font-bold ${headingText}`}>
              กราฟวิเคราะห์ยอดขายและรายได้ (Interactive Revenue Charts)
            </h3>
          </div>
          <p className={`text-xs ${mutedText}`}>
            แสดงภาพรวมยอดขาย กำไรสุทธิ สัดส่วนช่องทางชำระเงิน และผลงานช่างประจำเดือน {selectedMonth}
          </p>
        </div>

        {/* Chart View Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-zinc-950/40 dark:bg-zinc-950 border border-zinc-800">
          <button
            type="button"
            onClick={() => setChartView('dailyTrend')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              chartView === 'dailyTrend'
                ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>รายวันในเดือน</span>
          </button>

          <button
            type="button"
            onClick={() => setChartView('monthly12')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              chartView === 'monthly12'
                ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>แนวโน้ม 6 เดือน</span>
          </button>

          <button
            type="button"
            onClick={() => setChartView('servicePie')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              chartView === 'servicePie'
                ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>สัดส่วนบริการ</span>
          </button>

          <button
            type="button"
            onClick={() => setChartView('barberPerformance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              chartView === 'barberPerformance'
                ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>ผลงานช่าง</span>
          </button>
        </div>
      </div>

      {/* Quick Insight KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${mutedText} block`}>ยอดขายเดือนนี้</span>
          <span className="text-base font-bold text-amber-500 font-mono">
            {settings.currencySymbol}{monthTotalGross.toLocaleString()}
          </span>
        </div>
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${mutedText} block`}>เฉลี่ยต่อวันขาย</span>
          <span className="text-base font-bold text-emerald-500 font-mono">
            {settings.currencySymbol}{monthDailyAvg.toLocaleString()}
          </span>
        </div>
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${mutedText} block`}>วันที่ขายดีที่สุด</span>
          <span className="text-base font-bold text-sky-500 font-mono">
            {bestDay ? `${bestDay.day} (${settings.currencySymbol}${bestDay.gross.toLocaleString()})` : '-'}
          </span>
        </div>
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${mutedText} block`}>วันเปิดให้บริการ</span>
          <span className="text-base font-bold text-purple-500 font-mono">
            {activeDaysCount} วัน
          </span>
        </div>
      </div>

      {/* Sub-toggle for Daily View (Gross/Net vs Payment Channels) */}
      {chartView === 'dailyTrend' && (
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-2">
            <span className={mutedText}>โหมดการแสดงผล:</span>
            <div className="inline-flex rounded-lg p-0.5 border border-zinc-800 bg-zinc-950/50">
              <button
                type="button"
                onClick={() => setMetricMode('grossAndNet')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  metricMode === 'grossAndNet'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : isDark ? 'text-zinc-400' : 'text-slate-600'
                }`}
              >
                ยอดขาย & กำไรสุทธิ
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('paymentSplit')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  metricMode === 'paymentSplit'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : isDark ? 'text-zinc-400' : 'text-slate-600'
                }`}
              >
                โอนเงิน (📱) vs เงินสด (💵)
              </button>
            </div>
          </div>
          <span className={`text-[11px] ${mutedText} hidden sm:inline`}>
            * กราฟอัปเดตแบบเรียลไทม์ตามข้อมูลบิลในระบบ
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CHART RENDERING CANVAS (Recharts Responsive Container)       */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full h-80 pt-2">
        {/* VIEW 1: Daily Trend in the selected month */}
        {chartView === 'dailyTrend' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="transferGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="dayNum"
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `${val}`}
              />
              <YAxis
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `${val >= 1000 ? `${val / 1000}k` : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                formatter={(value) => <span className={headingText}>{value}</span>}
              />

              {metricMode === 'grossAndNet' ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="gross"
                    name="ยอดขายรวม (Gross)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#grossGradient)"
                  />
                  <Bar
                    dataKey="shopNet"
                    name="กำไรสุทธิร้าน (Net)"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={16}
                  />
                  <Line
                    type="monotone"
                    dataKey="barberPayroll"
                    name="จ่ายส่วนแบ่งช่าง (Payroll)"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </>
              ) : (
                <>
                  <Bar
                    dataKey="transfer"
                    name="ยอดเงินโอน (📱)"
                    fill="#0ea5e9"
                    radius={[4, 4, 0, 0]}
                    stackId="payment"
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="cash"
                    name="ยอดเงินสด (💵)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    stackId="payment"
                    maxBarSize={20}
                  />
                  <Line
                    type="monotone"
                    dataKey="gross"
                    name="ยอดขายรวม"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* VIEW 2: 6 Months Historical Trend */}
        {chartView === 'monthly12' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={multiMonthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="multiMonthGross" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="monthLabel" stroke={axisColor} fontSize={11} tickLine={false} />
              <YAxis
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `${val >= 1000 ? `${val / 1000}k` : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                formatter={(value) => <span className={headingText}>{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="gross"
                name="ยอดขายรวม (Gross)"
                stroke="#f59e0b"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#multiMonthGross)"
              />
              <Bar
                dataKey="shopNet"
                name="กำไรสุทธิร้าน (Net)"
                fill="#8b5cf6"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
              <Line
                type="monotone"
                dataKey="barberPayroll"
                name="ส่วนแบ่งช่าง (Payroll)"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* VIEW 3: Service Share Pie Chart */}
        {chartView === 'servicePie' && (
          <div className="h-full flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="w-full sm:w-1/2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={servicePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {servicePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${settings.currencySymbol}${Number(val).toLocaleString()}`, 'ยอดเงิน']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Legend Details */}
            <div className="w-full sm:w-1/2 space-y-2 text-xs">
              {servicePieData.map((item) => (
                <div
                  key={item.name}
                  className={`p-2 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className={`font-semibold ${headingText}`}>{item.name}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-amber-500 mr-2">
                      {settings.currencySymbol}{item.value.toLocaleString()}
                    </span>
                    <span className={`text-[10px] ${mutedText}`}>({item.percent}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 4: Barber Performance Bar Chart */}
        {chartView === 'barberPerformance' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={barberPerformanceData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis
                type="number"
                stroke={axisColor}
                fontSize={11}
                tickFormatter={(val) => `${val >= 1000 ? `${val / 1000}k` : val}`}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke={axisColor}
                fontSize={12}
                tickLine={false}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                formatter={(value) => <span className={headingText}>{value}</span>}
              />
              <Bar
                dataKey="gross"
                name="ยอดขายที่ทำได้ (Gross)"
                fill="#f59e0b"
                radius={[0, 6, 6, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="earned"
                name="ส่วนแบ่งที่ช่างได้รับ"
                fill="#10b981"
                radius={[0, 6, 6, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="shopEarned"
                name="ส่วนแบ่งที่ร้านได้รับ"
                fill="#8b5cf6"
                radius={[0, 6, 6, 0]}
                maxBarSize={20}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
