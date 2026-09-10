import { SaleBill, ShopExpense } from '../types';

export interface BillingCycleDay {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number; // Day of month 1-31
  cycleDayIndex: number; // Sequential index 1, 2, 3...
  dayName: string; // e.g. "จ.", "อ."
  dayFullDateTh: string; // e.g. "26 ก.ค."
  yearTh: number; // e.g. 2569
  monthThShort: string; // e.g. "ก.ค.", "ส.ค."
  isPrevMonth: boolean;
}

export interface BillingCycleInfo {
  selectedMonth: string; // YYYY-MM
  cutoffDay: number; // 0 = end of month, 1..30
  isEndOfMonth: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  nextCycleStartDate: string; // YYYY-MM-DD
  monthNameTh: string; // e.g. "สิงหาคม"
  yearTh: number; // e.g. 2569
  monthOnlyLabel: string; // e.g. "รอบบิลเดือนสิงหาคม 2569"
  label: string; // e.g. "26 ก.ค. - 25 ส.ค. 2569" or "1 - 31 ส.ค. 2569"
  fullLabel: string; // e.g. "รอบบิลประจำเดือน สิงหาคม 2569 (26 ก.ค. - 25 ส.ค. 2569)"
  cycleSummaryBadge: string; // e.g. "รอบบิล: 26 ก.ค. 69 - 25 ส.ค. 69 (ตัดรอบทุกวันที่ 25)"
  cutoffDescription: string; // e.g. "ตัดรอบทุกวันที่ 25 (เริ่มรอบใหม่วันที่ 26)"
  days: BillingCycleDay[];
}

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const THAI_MONTHS_LONG = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

// Cache for billing cycle info by month + cutoff to eliminate repeated heavy calculations
const cycleCache = new Map<string, BillingCycleInfo>();

/**
 * Calculates the complete billing cycle date range, days breakdown, and descriptive labels
 * @param selectedMonth "YYYY-MM" (e.g. "2026-08")
 * @param cutoffDay 0 = End of Month (1 - 30/31), 1..30 = Specific Day of Month (e.g. 25 -> 26th of prev month to 25th of current month)
 */
export function getBillingCycleInfo(selectedMonth: string, cutoffDay: number = 0): BillingCycleInfo {
  if (!selectedMonth || !selectedMonth.includes('-')) {
    const today = new Date();
    selectedMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }

  const cacheKey = `${selectedMonth}__${cutoffDay || 0}`;
  const cached = cycleCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  const isEndOfMonth = !cutoffDay || cutoffDay === 0 || cutoffDay >= 31;
  const effectiveCutoff = isEndOfMonth ? 0 : Math.min(30, Math.max(1, cutoffDay));

  const monthNameTh = THAI_MONTHS_LONG[month - 1] || '';
  const monthShortTh = THAI_MONTHS_SHORT[month - 1] || '';
  const yearTh = year + 543;

  let result: BillingCycleInfo;

  if (isEndOfMonth) {
    // 1. Standard Month (1st to Last day of month)
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${selectedMonth}-01`;
    const endDate = `${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`;

    const nextMonthYear = month === 12 ? year + 1 : year;
    const nextMonthNum = month === 12 ? 1 : month + 1;
    const nextCycleStartDate = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01`;

    const label = `1 - ${daysInMonth} ${monthShortTh} ${yearTh}`;
    const fullLabel = `รอบบิลเดือน${monthNameTh} ${yearTh} (1 - ${daysInMonth} ${monthShortTh})`;
    const cycleSummaryBadge = `รอบบิล: 1 - ${daysInMonth} ${monthShortTh} ${String(yearTh).slice(-2)} (ตัดรอบสิ้นเดือน)`;
    const cutoffDescription = 'ตัดรอบทุกสิ้นเดือน (เริ่มรอบใหม่วันที่ 1 ของเดือนถัดไป)';

    const days: BillingCycleDay[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayPadded = String(d).padStart(2, '0');
      const dateStr = `${selectedMonth}-${dayPadded}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      days.push({
        dateStr,
        dayNumber: d,
        cycleDayIndex: d,
        dayName: THAI_DAYS_SHORT[dayOfWeek],
        dayFullDateTh: `${d} ${monthShortTh}`,
        yearTh,
        monthThShort: monthShortTh,
        isPrevMonth: false,
      });
    }

    const monthOnlyLabel = `รอบบิลเดือน${monthNameTh} ${yearTh}`;

    result = {
      selectedMonth,
      cutoffDay: 0,
      isEndOfMonth: true,
      startDate,
      endDate,
      nextCycleStartDate,
      monthNameTh,
      yearTh,
      monthOnlyLabel,
      label,
      fullLabel,
      cycleSummaryBadge,
      cutoffDescription,
      days,
    };
  } else {
    // 2. Custom Cutoff Day (e.g. 25):
    // Previous month calculates start day (e.g. 26 of prev month)
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
    const prevMonthShortTh = THAI_MONTHS_SHORT[prevMonth - 1] || '';

    const startDay = Math.min(effectiveCutoff + 1, daysInPrevMonth);
    const startDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;

    const daysInCurrMonth = new Date(year, month, 0).getDate();
    const endDay = Math.min(effectiveCutoff, daysInCurrMonth);
    const endDate = `${selectedMonth}-${String(endDay).padStart(2, '0')}`;

    // Next cycle begins on the day after cutoff
    const nextStartDay = Math.min(effectiveCutoff + 1, daysInCurrMonth);
    const nextCycleStartDate = `${year}-${String(month).padStart(2, '0')}-${String(nextStartDay).padStart(2, '0')}`;

    const startThFormatted = `${startDay} ${prevMonthShortTh}`;
    const endThFormatted = `${endDay} ${monthShortTh}`;
    const nextStartThFormatted = `${nextStartDay} ${monthShortTh}`;

    const label = `${startThFormatted} - ${endThFormatted} ${yearTh}`;
    const fullLabel = `รอบบิลเดือน${monthNameTh} ${yearTh} (${startThFormatted} - ${endThFormatted})`;
    const cycleSummaryBadge = `รอบบิล: ${startThFormatted} - ${endThFormatted} ${String(yearTh).slice(-2)} (ตัดรอบทุกวันที่ ${effectiveCutoff})`;
    const cutoffDescription = `ตัดรอบทุกวันที่ ${effectiveCutoff} (เริ่มรอบใหม่วันที่ ${nextStartThFormatted})`;

    const days: BillingCycleDay[] = [];
    let index = 1;

    // Previous month slice
    for (let d = startDay; d <= daysInPrevMonth; d++) {
      const dStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(prevYear, prevMonth - 1, d).getDay();
      days.push({
        dateStr: dStr,
        dayNumber: d,
        cycleDayIndex: index++,
        dayName: THAI_DAYS_SHORT[dayOfWeek],
        dayFullDateTh: `${d} ${prevMonthShortTh}`,
        yearTh: prevYear + 543,
        monthThShort: prevMonthShortTh,
        isPrevMonth: true,
      });
    }

    // Current month slice
    for (let d = 1; d <= endDay; d++) {
      const dStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      days.push({
        dateStr: dStr,
        dayNumber: d,
        cycleDayIndex: index++,
        dayName: THAI_DAYS_SHORT[dayOfWeek],
        dayFullDateTh: `${d} ${monthShortTh}`,
        yearTh,
        monthThShort: monthShortTh,
        isPrevMonth: false,
      });
    }

    const monthOnlyLabel = `รอบบิลเดือน${monthNameTh} ${yearTh}`;

    result = {
      selectedMonth,
      cutoffDay: effectiveCutoff,
      isEndOfMonth: false,
      startDate,
      endDate,
      nextCycleStartDate,
      monthNameTh,
      yearTh,
      monthOnlyLabel,
      label,
      fullLabel,
      cycleSummaryBadge,
      cutoffDescription,
      days,
    };
  }

  cycleCache.set(cacheKey, result);
  return result;
}

/**
 * Checks if a specific date string (YYYY-MM-DD) falls within the selected billing cycle
 */
export function isDateInBillingCycle(dateStr: string, selectedMonth: string, cutoffDay: number = 0): boolean {
  if (!dateStr) return false;
  const cycle = getBillingCycleInfo(selectedMonth, cutoffDay);
  return dateStr >= cycle.startDate && dateStr <= cycle.endDate;
}

/**
 * Filter list of SaleBills for a specific monthly billing cycle
 */
export function filterBillsByBillingCycle(bills: SaleBill[], selectedMonth: string, cutoffDay: number = 0): SaleBill[] {
  const cycle = getBillingCycleInfo(selectedMonth, cutoffDay);
  return bills.filter((b) => b.dateStr >= cycle.startDate && b.dateStr <= cycle.endDate);
}

/**
 * Filter list of ShopExpenses for a specific monthly billing cycle
 */
export function filterExpensesByBillingCycle(expenses: ShopExpense[], selectedMonth: string, cutoffDay: number = 0): ShopExpense[] {
  const cycle = getBillingCycleInfo(selectedMonth, cutoffDay);
  return expenses.filter((e) => e.dateStr >= cycle.startDate && e.dateStr <= cycle.endDate);
}

/**
 * Generates options list for month dropdown with localized Thai month names and cycle date ranges
 */
export function getBillingCycleMonthOptions(count: number = 18, cutoffDay: number = 0): Array<{ value: string; label: string; rangeLabel: string }> {
  const options: Array<{ value: string; label: string; rangeLabel: string }> = [];
  const now = new Date();

  // Include current month + past months + 2 future months
  for (let i = -2; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${yStr}-${mStr}`;
    const cycle = getBillingCycleInfo(monthKey, cutoffDay);

    const monthTh = `${THAI_MONTHS_LONG[d.getMonth()]} ${d.getFullYear() + 543}`;
    options.push({
      value: monthKey,
      label: monthTh,
      rangeLabel: cycle.label,
    });
  }

  return options;
}
