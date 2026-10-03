import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Barber, BarberSalaryType, SaleBill, ShopExpense } from '../types';
import { getBillingCycleInfo, BillingCycleInfo } from '../utils/billingCycle';
import { thaiBahtText } from '../utils/thaiBaht';
import { sounds } from '../utils/sound';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import {
  Printer,
  Download,
  Calendar,
  User,
  Users,
  Scissors,
  DollarSign,
  FileText,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Plus,
  Minus,
  Edit3,
  CheckCircle2,
  Phone,
  Store,
  Wallet,
  ShoppingBag,
  Gift,
  HelpCircle,
  Award,
  ShieldCheck,
  Target,
  Check,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export interface ExtraAdjustmentItem {
  id: string;
  name: string;
  amount: number;
}

export interface BarberAdjustment {
  salaryType?: BarberSalaryType;
  baseSalary: number; // ฐานเงินเดือนการันตี (เช่น 15,000) หรือเงินเดือนประจำ
  positionAllowance?: number; // ค่าตำแหน่ง
  customEarningName?: string; // ชื่อรายการเงินพิเศษ (เช่น ค่าปิดร้าน, ค่าเดินทาง, OT)
  customEarningAmount?: number; // จำนวนเงินพิเศษ
  bonus: number;
  allowance: number;
  manualAdvance: number;
  otherDeductions: number;
  socialSecurity: number;
  notes: string;
  // โหมดกรอกตัวเลขเอง (Manual Mode)
  isManualMode?: boolean;
  manualBaseSalary?: number;
  manualCommission?: number;
  manualTip?: number;
  extraEarnings?: ExtraAdjustmentItem[]; // ค่าอื่นๆ เพิ่มเข้ามานอกเหนือจากที่มี
  extraDeductions?: ExtraAdjustmentItem[]; // รายการหักอื่นๆ เพิ่มเติม
}

export const TabPayslip: React.FC = () => {
  const {
    bills,
    expenses,
    barbers,
    settings,
    theme,
    updateBarber,
    showToast,
    currentShopId,
  } = useApp();

  const isDark = theme.isDark ?? true;

  // Selected Billing Month (YYYY-MM)
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Selected Barber: 'all' or barber.id
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    barbers.length > 0 ? barbers[0].id : 'all'
  );

  // Sub-view: 'slip' (single slip) or 'summary' (all barbers payroll summary)
  const [activeView, setActiveView] = useState<'slip' | 'summary'>('slip');

  // Loading state for PDF generation
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Modal for editing adjustments (Base salary, Bonus, Deductions)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);

  // Tenant-safe storage key for payslip adjustments
  const adjStorageKey = `barber_payslip_adj_${currentShopId || settings.shopName || 'default'}`;

  // Adjustments storage in localStorage per (period + barberId)
  const [adjustments, setAdjustments] = useState<Record<string, BarberAdjustment>>(() => {
    try {
      const saved = localStorage.getItem(adjStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Re-sync adjustments if shop changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(adjStorageKey);
      setAdjustments(saved ? JSON.parse(saved) : {});
    } catch {
      setAdjustments({});
    }
  }, [adjStorageKey]);

  const getAdjustmentKey = (barberId: string, monthStr: string) => `${monthStr}_${barberId}`;

  const getBarberAdjustment = (barberId: string, monthStr: string): BarberAdjustment => {
    const key = getAdjustmentKey(barberId, monthStr);
    const b = barbers.find((x) => x.id === barberId);
    const saved = adjustments[key];
    if (saved) {
      return {
        ...saved,
        isManualMode: !!saved.isManualMode,
        manualBaseSalary: saved.manualBaseSalary !== undefined ? saved.manualBaseSalary : (saved.baseSalary ?? b?.baseSalary ?? 0),
        manualCommission: saved.manualCommission !== undefined ? saved.manualCommission : 0,
        manualTip: saved.manualTip !== undefined ? saved.manualTip : 0,
        extraEarnings: saved.extraEarnings || [],
        extraDeductions: saved.extraDeductions || [],
      };
    }
    return {
      salaryType: b?.salaryType || 'guarantee_min',
      baseSalary: b?.baseSalary !== undefined ? b.baseSalary : 15000,
      positionAllowance: b?.positionAllowance || 0,
      customEarningName: b?.customEarningName || '',
      customEarningAmount: b?.customEarningAmount || 0,
      bonus: 0,
      allowance: 0,
      manualAdvance: 0,
      otherDeductions: 0,
      socialSecurity: 0,
      notes: '',
      isManualMode: false,
      manualBaseSalary: b?.baseSalary !== undefined ? b.baseSalary : 15000,
      manualCommission: 0,
      manualTip: 0,
      extraEarnings: [],
      extraDeductions: [],
    };
  };

  const saveAdjustment = (barberId: string, monthStr: string, data: BarberAdjustment) => {
    const key = getAdjustmentKey(barberId, monthStr);
    const next = { ...adjustments, [key]: data };
    setAdjustments(next);
    try {
      localStorage.setItem(adjStorageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Temp state for editing adjustments modal
  const [tempIsManualMode, setTempIsManualMode] = useState<boolean>(false);
  const [tempSalaryType, setTempSalaryType] = useState<BarberSalaryType>('guarantee_min');
  const [tempBaseSalary, setTempBaseSalary] = useState<string>('15000');
  const [tempManualBaseSalary, setTempManualBaseSalary] = useState<string>('0');
  const [tempManualCommission, setTempManualCommission] = useState<string>('0');
  const [tempManualTip, setTempManualTip] = useState<string>('0');
  const [tempPositionAllowance, setTempPositionAllowance] = useState<string>('0');
  const [tempCustomEarningName, setTempCustomEarningName] = useState<string>('');
  const [tempCustomEarningAmount, setTempCustomEarningAmount] = useState<string>('0');
  const [tempBonus, setTempBonus] = useState<string>('0');
  const [tempAllowance, setTempAllowance] = useState<string>('0');
  const [tempManualAdvance, setTempManualAdvance] = useState<string>('0');
  const [tempOtherDeductions, setTempOtherDeductions] = useState<string>('0');
  const [tempSocialSecurity, setTempSocialSecurity] = useState<string>('0');
  const [tempNotes, setTempNotes] = useState<string>('');
  const [tempSaveAsDefault, setTempSaveAsDefault] = useState<boolean>(true);

  // Extra dynamic earnings and deductions (ค่าอื่นๆ เพิ่มเติม)
  const [tempExtraEarnings, setTempExtraEarnings] = useState<ExtraAdjustmentItem[]>([]);
  const [tempExtraDeductions, setTempExtraDeductions] = useState<ExtraAdjustmentItem[]>([]);

  // Helpers for extra items
  const handleAddExtraEarning = () => {
    sounds.playClick();
    setTempExtraEarnings((prev) => [
      ...prev,
      { id: `earn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, name: '', amount: 0 },
    ]);
  };

  const handleUpdateExtraEarning = (id: string, field: 'name' | 'amount', value: string | number) => {
    setTempExtraEarnings((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'amount') {
          return { ...item, amount: Number(value) || 0 };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleRemoveExtraEarning = (id: string) => {
    sounds.playClick();
    setTempExtraEarnings((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddExtraDeduction = () => {
    sounds.playClick();
    setTempExtraDeductions((prev) => [
      ...prev,
      { id: `ded_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, name: '', amount: 0 },
    ]);
  };

  const handleUpdateExtraDeduction = (id: string, field: 'name' | 'amount', value: string | number) => {
    setTempExtraDeductions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'amount') {
          return { ...item, amount: Number(value) || 0 };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleRemoveExtraDeduction = (id: string) => {
    sounds.playClick();
    setTempExtraDeductions((prev) => prev.filter((item) => item.id !== id));
  };

  // Month navigation helpers
  const handleShiftMonth = (delta: number) => {
    sounds.playClick();
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  // Current billing cycle info based on shop cutoff day
  const cycleInfo: BillingCycleInfo = useMemo(() => {
    return getBillingCycleInfo(selectedMonth, settings.billingCycleCutoffDay ?? 0);
  }, [selectedMonth, settings.billingCycleCutoffDay]);

  // Filter bills & expenses within the active billing cycle
  const periodBills = useMemo(() => {
    return bills.filter(
      (b) => b.dateStr >= cycleInfo.startDate && b.dateStr <= cycleInfo.endDate
    );
  }, [bills, cycleInfo]);

  const periodExpenses = useMemo(() => {
    return expenses.filter(
      (e) => e.dateStr >= cycleInfo.startDate && e.dateStr <= cycleInfo.endDate
    );
  }, [expenses, cycleInfo]);

  // Aggregate stats per barber with minimum guaranteed salary logic
  const barberPayrollList = useMemo(() => {
    return barbers.map((barber) => {
      const barberBills = periodBills.filter((b) => b.barberId === barber.id);

      const haircutCount = barberBills.reduce((s, b) => s + (b.haircutFee > 0 ? (b.headCount && b.headCount > 0 ? b.headCount : 1) : 0), 0);
      const haircutGross = barberBills.reduce((s, b) => s + b.haircutFee, 0);
      const haircutCommission = barberBills.reduce(
        (s, b) => s + (b.commission?.barberHaircutEarned ?? 0),
        0
      );

      const chemicalCount = barberBills.filter((b) => b.chemicalFee > 0).length;
      const chemicalGross = barberBills.reduce((s, b) => s + b.chemicalFee, 0);
      const chemicalCommission = barberBills.reduce(
        (s, b) => s + (b.commission?.barberChemicalEarned ?? 0),
        0
      );

      const productGross = barberBills.reduce((s, b) => s + b.totalProductsFee, 0);
      const productCommission = barberBills.reduce(
        (s, b) => s + (b.commission?.barberProductEarned ?? 0),
        0
      );
      const productItemsSold = barberBills.reduce(
        (sum, b) => sum + (b.products?.reduce((pSum, p) => pSum + p.quantity, 0) ?? 0),
        0
      );

      const tipTotal = barberBills.reduce(
        (s, b) => s + (b.commission?.barberTipEarned ?? b.tipFee ?? 0),
        0
      );

      const totalRevenueGenerated = haircutGross + chemicalGross + productGross;
      const totalCommission = haircutCommission + chemicalCommission + productCommission;
      const totalCommissionWithTips = totalCommission + tipTotal;

      // Auto-detect advance payments from expenses in this period
      const advanceExpenses = periodExpenses.filter((e) => {
        if (e.category !== 'advance_wages') return false;
        const pLower = (e.payee || '').toLowerCase();
        const nLower = (e.notes || '').toLowerCase();
        const tLower = (e.title || '').toLowerCase();
        const nick = barber.nickname.toLowerCase();
        const name = barber.name.toLowerCase();
        return (
          pLower.includes(nick) ||
          pLower.includes(name) ||
          nLower.includes(nick) ||
          nLower.includes(name) ||
          tLower.includes(nick) ||
          tLower.includes(name)
        );
      });
      const autoAdvanceTotal = advanceExpenses.reduce((s, e) => s + e.amount, 0);

      // Load custom adjustments or barber settings
      const adj = getBarberAdjustment(barber.id, selectedMonth);
      const effectiveAdvance = adj.manualAdvance > 0 ? adj.manualAdvance : autoAdvanceTotal;

      const salaryType: BarberSalaryType = adj.salaryType || barber.salaryType || 'guarantee_min';
      const baseSalary = adj.baseSalary !== undefined && adj.baseSalary >= 0
        ? adj.baseSalary
        : (barber.baseSalary !== undefined ? barber.baseSalary : 15000);

      // ==========================================
      // กฎการคิดเงินเดือน (Salary & Commission Logic):
      // รองรับทั้งโหมดอัตโนมัติ (Auto) และโหมดกรอกเอง (Manual)
      // ==========================================
      let effectiveBaseSalary = 0; // ฐานเงินเดือน
      let commissionAboveBase = 0; // ค่าคอมมิชชั่น (ส่วนที่เกินมาจากฐานเงินเดือน)
      let workEarnings = 0; // รวมรายได้ผลงาน/เงินเดือน
      let guaranteeTopUp = 0; // เงินชดเชยที่ร้านเติมให้ครบฐาน (ถ้ามี)
      let isGuaranteeApplied = false; // ยอดคอมมิชชั่นไม่ถึงฐาน ร้านต้องเติมให้
      let effectiveTip = tipTotal;

      const isManualMode = !!adj.isManualMode;

      if (isManualMode) {
        // ในโหมด Manual ใช้ตัวเลขที่กรอกเองโดยตรง
        effectiveBaseSalary = adj.manualBaseSalary !== undefined ? adj.manualBaseSalary : (baseSalary || 0);
        commissionAboveBase = adj.manualCommission !== undefined ? adj.manualCommission : 0;
        effectiveTip = adj.manualTip !== undefined ? adj.manualTip : tipTotal;
        workEarnings = effectiveBaseSalary + commissionAboveBase;
        guaranteeTopUp = 0;
        isGuaranteeApplied = false;
      } else if (salaryType === 'guarantee_min') {
        effectiveBaseSalary = baseSalary;
        if (baseSalary > 0) {
          if (totalCommission > baseSalary) {
            // ทำยอดเกินฐานเงินเดือน: ได้ฐานเงินเดือน + ส่วนเกินเป็นค่าคอมมิชชั่น
            commissionAboveBase = totalCommission - baseSalary;
            workEarnings = totalCommission; // เท่ากับ baseSalary + commissionAboveBase
            guaranteeTopUp = 0;
            isGuaranteeApplied = false;
          } else {
            // ทำยอดไม่ถึงหรือเท่ากับฐานเงินเดือน: ได้รับฐานเงินเดือนเต็มการันตี, ค่าคอมส่วนเกินเป็น 0
            commissionAboveBase = 0;
            workEarnings = baseSalary;
            guaranteeTopUp = baseSalary - totalCommission;
            isGuaranteeApplied = totalCommission < baseSalary;
          }
        } else {
          // ฐานเงินเดือนเป็น 0 (คิดเป็นคอมมิชชั่นล้วน)
          effectiveBaseSalary = 0;
          commissionAboveBase = totalCommission;
          workEarnings = totalCommission;
          guaranteeTopUp = 0;
          isGuaranteeApplied = false;
        }
      } else if (salaryType === 'fixed_plus_commission') {
        // เงินเดือนประจำคงที่ + คอมมิชชั่นผลงานทั้งหมด
        effectiveBaseSalary = baseSalary;
        commissionAboveBase = totalCommission;
        workEarnings = baseSalary + totalCommission;
        guaranteeTopUp = 0;
        isGuaranteeApplied = false;
      } else {
        // คอมมิชชั่นล้วน (commission_only)
        effectiveBaseSalary = 0;
        commissionAboveBase = totalCommission;
        workEarnings = totalCommission;
        guaranteeTopUp = 0;
        isGuaranteeApplied = false;
      }

      // Extra dynamic earnings (ค่าอื่นๆ เพิ่มเข้ามานอกเหนือจากที่มี)
      const extraEarnings: ExtraAdjustmentItem[] = adj.extraEarnings || [];
      const sumExtraEarnings = extraEarnings.reduce((s, x) => s + (Number(x.amount) || 0), 0);

      // Extra dynamic deductions (รายการหักอื่นๆ เพิ่มเติม)
      const extraDeductions: ExtraAdjustmentItem[] = adj.extraDeductions || [];
      const sumExtraDeductions = extraDeductions.reduce((s, x) => s + (Number(x.amount) || 0), 0);

      // รายได้รวมทั้งหมด (Total Earnings)
      const bonus = adj.bonus || 0;
      const allowance = adj.allowance || 0;
      const positionAllowance = adj.positionAllowance !== undefined
        ? adj.positionAllowance
        : (barber.positionAllowance || 0);
      const customEarningName = adj.customEarningName !== undefined
        ? adj.customEarningName
        : (barber.customEarningName || '');
      const customEarningAmount = adj.customEarningAmount !== undefined
        ? adj.customEarningAmount
        : (barber.customEarningAmount || 0);

      const totalEarnings = workEarnings + effectiveTip + bonus + allowance + positionAllowance + customEarningAmount + sumExtraEarnings;

      // รายการหัก (Deductions)
      const otherDeductions = adj.otherDeductions || 0;
      const socialSecurity = adj.socialSecurity || 0;
      const totalDeductions = effectiveAdvance + otherDeductions + socialSecurity + sumExtraDeductions;

      // สุทธิ (Net Pay)
      const netPay = Math.max(0, totalEarnings - totalDeductions);

      return {
        barber,
        salaryType,
        baseSalary,
        isManualMode,
        effectiveBaseSalary,
        commissionAboveBase,
        positionAllowance,
        customEarningName,
        customEarningAmount,
        extraEarnings,
        extraDeductions,
        sumExtraEarnings,
        sumExtraDeductions,
        billCount: barberBills.length,
        haircutCount,
        haircutGross,
        haircutCommission,
        chemicalCount,
        chemicalGross,
        chemicalCommission,
        productGross,
        productCommission,
        productItemsSold,
        tipTotal: effectiveTip,
        rawTipTotal: tipTotal,
        totalRevenueGenerated,
        totalCommission,
        totalCommissionWithTips,
        workEarnings,
        guaranteeTopUp,
        isGuaranteeApplied,
        advanceExpenses,
        autoAdvanceTotal,
        effectiveAdvance,
        bonus,
        allowance,
        otherDeductions,
        socialSecurity,
        totalEarnings,
        totalDeductions,
        netPay,
        notes: adj.notes,
      };
    });
  }, [barbers, periodBills, periodExpenses, selectedMonth, adjustments]);

  // Currently active barber data for single slip view
  const currentBarberData = useMemo(() => {
    if (selectedBarberId === 'all') {
      return barberPayrollList[0] || null;
    }
    return barberPayrollList.find((b) => b.barber.id === selectedBarberId) || barberPayrollList[0] || null;
  }, [barberPayrollList, selectedBarberId]);

  // Overall totals for summary KPI
  const overallStats = useMemo(() => {
    return barberPayrollList.reduce(
      (acc, curr) => ({
        totalNetPay: acc.totalNetPay + curr.netPay,
        totalRevenue: acc.totalRevenue + curr.totalRevenueGenerated,
        totalCommissionWithTips: acc.totalCommissionWithTips + curr.totalCommissionWithTips,
        totalHaircuts: acc.totalHaircuts + curr.haircutCount,
        totalAdvances: acc.totalAdvances + curr.effectiveAdvance,
        totalGuaranteeTopUp: acc.totalGuaranteeTopUp + curr.guaranteeTopUp,
        totalBaseSalary: acc.totalBaseSalary + curr.effectiveBaseSalary,
        totalCommissionAboveBase: acc.totalCommissionAboveBase + curr.commissionAboveBase,
      }),
      {
        totalNetPay: 0,
        totalRevenue: 0,
        totalCommissionWithTips: 0,
        totalHaircuts: 0,
        totalAdvances: 0,
        totalGuaranteeTopUp: 0,
        totalBaseSalary: 0,
        totalCommissionAboveBase: 0,
      }
    );
  }, [barberPayrollList]);

  // Open adjustment edit modal
  const handleOpenEditAdjustments = (barber: Barber, forceManualMode?: boolean) => {
    sounds.playClick();
    setEditingBarber(barber);
    const adj = getBarberAdjustment(barber.id, selectedMonth);
    const currentPayroll = barberPayrollList.find((p) => p.barber.id === barber.id);

    const isManual = forceManualMode !== undefined ? forceManualMode : !!adj.isManualMode;
    setTempIsManualMode(isManual);

    setTempSalaryType(adj.salaryType || barber.salaryType || 'guarantee_min');
    setTempBaseSalary(String(adj.baseSalary !== undefined ? adj.baseSalary : (barber.baseSalary ?? 15000)));

    const initialManualBase = adj.manualBaseSalary !== undefined
      ? adj.manualBaseSalary
      : (currentPayroll?.effectiveBaseSalary ?? (barber.baseSalary ?? 15000));
    const initialManualComm = adj.manualCommission !== undefined
      ? adj.manualCommission
      : (currentPayroll?.commissionAboveBase ?? 0);
    const initialManualTip = adj.manualTip !== undefined
      ? adj.manualTip
      : (currentPayroll?.tipTotal ?? 0);

    setTempManualBaseSalary(String(initialManualBase));
    setTempManualCommission(String(initialManualComm));
    setTempManualTip(String(initialManualTip));

    setTempPositionAllowance(String(adj.positionAllowance !== undefined ? adj.positionAllowance : (barber.positionAllowance || 0)));
    setTempCustomEarningName(adj.customEarningName !== undefined ? adj.customEarningName : (barber.customEarningName || ''));
    setTempCustomEarningAmount(String(adj.customEarningAmount !== undefined ? adj.customEarningAmount : (barber.customEarningAmount || 0)));
    setTempBonus(String(adj.bonus || 0));
    setTempAllowance(String(adj.allowance || 0));
    setTempManualAdvance(String(adj.manualAdvance || 0));
    setTempOtherDeductions(String(adj.otherDeductions || 0));
    setTempSocialSecurity(String(adj.socialSecurity || 0));
    setTempNotes(adj.notes || '');
    setTempSaveAsDefault(!isManual);

    // Load extra earnings & deductions
    setTempExtraEarnings(adj.extraEarnings ? [...adj.extraEarnings] : []);
    setTempExtraDeductions(adj.extraDeductions ? [...adj.extraDeductions] : []);

    setIsEditModalOpen(true);
  };

  // Copy values from Auto calculation into Manual fields
  const handleCopyFromAuto = () => {
    if (!editingBarber) return;
    sounds.playSuccess();
    const currentPayroll = barberPayrollList.find((p) => p.barber.id === editingBarber.id);
    if (!currentPayroll) return;

    setTempManualBaseSalary(String(currentPayroll.effectiveBaseSalary));
    setTempManualCommission(String(currentPayroll.commissionAboveBase));
    setTempManualTip(String(currentPayroll.tipTotal));
    setTempPositionAllowance(String(currentPayroll.positionAllowance));
    setTempBonus(String(currentPayroll.bonus));
    setTempAllowance(String(currentPayroll.allowance));
    setTempManualAdvance(String(currentPayroll.effectiveAdvance));
    setTempSocialSecurity(String(currentPayroll.socialSecurity));
    setTempOtherDeductions(String(currentPayroll.otherDeductions));

    showToast(
      'คัดลอกตัวเลขจากระบบเรียบร้อย ⚡',
      'ดึงยอดฐานเงินเดือน, ค่าคอมมิชชั่น, ทิป และรายการหักมาใส่ให้พร้อมแก้ไข',
      'info'
    );
  };

  // Switch barber back to Auto mode from UI
  const handleSwitchToAuto = (barberId: string) => {
    sounds.playSuccess();
    const currentAdj = getBarberAdjustment(barberId, selectedMonth);
    saveAdjustment(barberId, selectedMonth, {
      ...currentAdj,
      isManualMode: false,
    });
    showToast(
      'สลับเป็นโหมดคำนวณอัตโนมัติเรียบร้อย 🔄',
      'ระบบจะคำนวณเงินเดือนจากยอดบิลจริงในรอบเดือนนี้',
      'success'
    );
  };

  const handleSaveAdjustments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarber) return;
    sounds.playSuccess();

    const newBaseSalary = parseFloat(tempBaseSalary) || 0;
    const newManualBase = parseFloat(tempManualBaseSalary) || 0;
    const newManualComm = parseFloat(tempManualCommission) || 0;
    const newManualTip = parseFloat(tempManualTip) || 0;
    const newPositionAllowance = parseFloat(tempPositionAllowance) || 0;
    const newCustomAmount = parseFloat(tempCustomEarningAmount) || 0;
    const newCustomName = tempCustomEarningName.trim();

    // Clean extra earnings and deductions
    const cleanExtraEarnings = tempExtraEarnings
      .filter((item) => item.name.trim() !== '' || item.amount > 0)
      .map((item) => ({ ...item, name: item.name.trim(), amount: Number(item.amount) || 0 }));

    const cleanExtraDeductions = tempExtraDeductions
      .filter((item) => item.name.trim() !== '' || item.amount > 0)
      .map((item) => ({ ...item, name: item.name.trim(), amount: Number(item.amount) || 0 }));

    // Save adjustment for this month
    saveAdjustment(editingBarber.id, selectedMonth, {
      salaryType: tempSalaryType,
      baseSalary: newBaseSalary,
      positionAllowance: newPositionAllowance,
      customEarningName: newCustomName,
      customEarningAmount: newCustomAmount,
      bonus: parseFloat(tempBonus) || 0,
      allowance: parseFloat(tempAllowance) || 0,
      manualAdvance: parseFloat(tempManualAdvance) || 0,
      otherDeductions: parseFloat(tempOtherDeductions) || 0,
      socialSecurity: parseFloat(tempSocialSecurity) || 0,
      notes: tempNotes.trim(),
      isManualMode: tempIsManualMode,
      manualBaseSalary: newManualBase,
      manualCommission: newManualComm,
      manualTip: newManualTip,
      extraEarnings: cleanExtraEarnings,
      extraDeductions: cleanExtraDeductions,
    });

    // Optionally update barber default profile if not in manual mode
    if (tempSaveAsDefault && !tempIsManualMode) {
      updateBarber(editingBarber.id, {
        salaryType: tempSalaryType,
        baseSalary: newBaseSalary,
        positionAllowance: newPositionAllowance,
        customEarningName: newCustomName,
        customEarningAmount: newCustomAmount,
      });
    }

    setIsEditModalOpen(false);
    showToast(
      tempIsManualMode ? 'บันทึกโหมด Manual สำเร็จ ✍️' : 'บันทึกรายการปรับเงินเรียบร้อย 📝',
      `อัปเดตสลิปของช่าง ${editingBarber.nickname} (${
        tempIsManualMode
          ? 'โหมดกำหนดตัวเลขเอง'
          : tempSalaryType === 'guarantee_min'
          ? `การันตี ฿${newBaseSalary.toLocaleString()}`
          : tempSalaryType === 'commission_only'
          ? 'คอมมิชชั่น 100%'
          : 'เงินเดือน+คอมมิชชั่น'
      }) เรียบร้อยแล้ว`,
      'success'
    );
  };

  // Print function
  const handlePrint = () => {
    sounds.playClick();
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.warn('Direct print warning:', err);
    }
  };

  // Generate PDF via html-to-image / html2canvas + jspdf
  const handleDownloadPdf = async (barberName: string) => {
    const element = document.getElementById('printable-payslip');
    if (!element) {
      showToast('ไม่พบเอกสารสำหรับดาวน์โหลด', 'กรุณาลองใหม่อีกครั้ง', 'warning');
      return;
    }

    try {
      sounds.playClick();
      setIsGeneratingPdf(true);
      showToast('กำลังประมวลผลไฟล์ PDF... 📄', 'กรุณารอสักครู่ ระบบกำลังจัดทำ Download Report PDF', 'info');

      // Ensure fonts and rendering are fully painted
      await new Promise((r) => setTimeout(r, 200));

      let imgData = '';
      try {
        imgData = await toPng(element, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
        });
      } catch (imgErr) {
        console.warn('toPng error, falling back to html2canvas', imgErr);
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        imgData = canvas.toDataURL('image/png');
      }

      if (!imgData) {
        throw new Error('Image data generation failed');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 210; // A4 width mm
      const pdfPageHeight = 297; // A4 height mm

      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, Math.min(imgHeight, pdfPageHeight));
      heightLeft -= pdfPageHeight;

      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfPageHeight;
      }

      const cleanName = barberName.replace(/[^a-zA-Z0-9ก-๙]/g, '_');
      const filename = `สลิปเงินเดือน_${cleanName}_${selectedMonth}.pdf`;
      pdf.save(filename);

      sounds.playSuccess();
      showToast('ดาวน์โหลดไฟล์ PDF สำเร็จ! ✅', `บันทึกไฟล์ "${filename}" เรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('เกิดข้อผิดพลาดในการสร้าง PDF', 'กรุณาลองใหม่อีกครั้ง หรือใช้ปุ่มพิมพ์สลิป', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // UI styling tokens
  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';
  const borderSubtle = isDark ? 'border-zinc-800' : 'border-slate-200';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
      {/* 1. TOP HEADER & PERIOD CONTROLS */}
      <div className={`${theme.bgCard} rounded-2xl p-4 sm:p-5 border ${borderSubtle} shadow-xs no-print`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Title & Info */}
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold ${headingText}`}>
                  สลิปเงินเดือน & ใบจ่ายค่าจ้างช่างตัดผม (Payslip)
                </h2>
                <p className={`text-xs ${mutedText} mt-0.5`}>
                  {cycleInfo.fullLabel} • ตัดรอบตามการตั้งค่าร้าน ({cycleInfo.cutoffDescription})
                </p>
              </div>
            </div>
          </div>

          {/* Month Stepper & View Switcher */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            {/* View Switcher: Slip vs All Barbers Summary */}
            <div className={`flex rounded-xl p-1 border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'}`}>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveView('slip');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all btn-tactile ${
                  activeView === 'slip'
                    ? isDark
                      ? 'bg-amber-500 text-zinc-950 shadow-xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>สลิปรายคน</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveView('summary');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all btn-tactile ${
                  activeView === 'summary'
                    ? isDark
                      ? 'bg-amber-500 text-zinc-950 shadow-xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>สรุปทุกคน ({barbers.length})</span>
              </button>
            </div>

            {/* Month Stepper */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleShiftMonth(-1)}
                title="เดือนก่อนหน้า"
                className={`p-1.5 rounded-xl border text-xs font-bold transition-all btn-tactile ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    if (e.target.value) {
                      sounds.playClick();
                      setSelectedMonth(e.target.value);
                    }
                  }}
                  className={`pl-8 pr-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-all ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-amber-500'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-slate-800'
                  }`}
                />
                <Calendar className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${mutedText}`} />
              </div>

              <button
                type="button"
                onClick={() => handleShiftMonth(1)}
                title="เดือนถัดไป"
                className={`p-1.5 rounded-xl border text-xs font-bold transition-all btn-tactile ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {selectedMonth !== currentMonthStr && (
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setSelectedMonth(currentMonthStr);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all btn-tactile ${
                    isDark
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  เดือนนี้
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-800/40">
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-semibold ${mutedText} block mb-0.5`}>
              รวมค่าจ้าง & คอมมิชชั่นช่างสุทธิ
            </span>
            <span className="text-base sm:text-lg font-mono font-black text-emerald-500">
              {settings.currencySymbol}{overallStats.totalNetPay.toLocaleString()}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-semibold ${mutedText} block mb-0.5`}>
              ยอดสร้างรายได้รวมของช่าง
            </span>
            <span className="text-base sm:text-lg font-mono font-bold text-amber-500">
              {settings.currencySymbol}{overallStats.totalRevenue.toLocaleString()}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-semibold ${mutedText} block mb-0.5`}>
              จำนวนงานตัดผมรวมทุกช่าง
            </span>
            <span className="text-base sm:text-lg font-mono font-bold text-sky-500">
              {overallStats.totalHaircuts.toLocaleString()} หัว
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[11px] font-semibold ${mutedText} block mb-0.5`}>
              ยอดหักเบิกล่วงหน้ารวม
            </span>
            <span className="text-base sm:text-lg font-mono font-bold text-rose-500">
              {settings.currencySymbol}{overallStats.totalAdvances.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. BARBER SELECTOR TABS (for single slip view) */}
      {activeView === 'slip' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-print">
          {barberPayrollList.map((item) => {
            const isSelected = item.barber.id === currentBarberData?.barber.id;
            return (
              <button
                key={item.barber.id}
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setSelectedBarberId(item.barber.id);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border btn-tactile ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-sm'
                    : isDark
                    ? 'bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 border-zinc-800'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200 shadow-2xs'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white"
                  style={{ backgroundColor: item.barber.color || '#f59e0b' }}
                >
                  {item.barber.nickname.charAt(0)}
                </div>
                <span>ช่าง {item.barber.nickname}</span>
                <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md ${
                  isSelected ? 'bg-zinc-950/20 text-zinc-950' : isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  {settings.currencySymbol}{item.netPay.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. MAIN CONTENT: SINGLE SLIP VIEW OR SUMMARY TABLE */}
      {activeView === 'slip' && currentBarberData && (
        <div className="space-y-4">
          {/* Action Toolbar above slip (Download PDF & Print Buttons) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border no-print transition-all bg-zinc-900/50 dark:bg-zinc-900/70 border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-sm"
                style={{ backgroundColor: currentBarberData.barber.color || '#f59e0b' }}
              >
                {currentBarberData.barber.nickname.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-sm sm:text-base font-bold ${headingText}`}>
                    สลิปเงินเดือน: ช่าง {currentBarberData.barber.name} ({currentBarberData.barber.nickname})
                  </h3>
                  {currentBarberData.isManualMode ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center gap-1">
                      <Edit3 className="w-3 h-3" />
                      <span>โหมด Manual (กำหนดตัวเลขเอง)</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      คำนวณอัตโนมัติ
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    ยอดสุทธิ {settings.currencySymbol}{currentBarberData.netPay.toLocaleString()}
                  </span>
                </div>
                <p className={`text-xs ${mutedText} mt-0.5`}>
                  รอบบิล: {cycleInfo.label} ({cycleInfo.cutoffDescription})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              {/* Manual Mode / Edit Buttons */}
              {currentBarberData.isManualMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenEditAdjustments(currentBarberData.barber, true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all btn-tactile bg-violet-600 hover:bg-violet-500 text-white border-violet-500 shadow-xs"
                    title="แก้ไขตัวเลขและรายการในโหมด Manual"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>แก้ไขตัวเลข (Manual)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchToAuto(currentBarberData.barber.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all btn-tactile ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                    title="ยกเลิกโหมด Manual และกลับไปใช้การคำนวณอัตโนมัติตามบิล"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>สลับเป็น Auto</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenEditAdjustments(currentBarberData.barber, true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all btn-tactile bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 border-violet-500/40"
                    title="เปิดโหมดกรอกตัวเลขเอง (Manual Mode) และเพิ่มค่าใช้จ่าย/รายได้อื่นๆ"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-violet-400" />
                    <span>โหมด Manual (กรอกตัวเลขเอง)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditAdjustments(currentBarberData.barber, false)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all btn-tactile ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
                    }`}
                    title="ปรับฐานเงินเดือน, ค่าตำแหน่ง, โบนัส หรือรายการพิเศษ"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>ตั้งค่าเงินเดือน/โบนัส</span>
                  </button>
                </>
              )}

              {/* Download Report PDF Button */}
              <button
                type="button"
                onClick={() => handleDownloadPdf(currentBarberData.barber.nickname)}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 btn-tactile disabled:opacity-50"
                title="ดาวน์โหลดเป็นไฟล์ PDF คุณภาพสูง"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'กำลังเตรียม PDF...' : 'Download Report PDF'}</span>
              </button>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all shadow-md shadow-amber-500/20 btn-tactile"
                title="สั่งพิมพ์สลิปเงินเดือนออกเครื่องพิมพ์"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์สลิป</span>
              </button>
            </div>
          </div>

          {/* OFFICIAL PAYSLIP DOCUMENT (Rendered on screen & Printable on A4) */}
          <div className="flex justify-center">
            <div
              id="printable-payslip"
              className="w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6 font-sans transition-all"
              style={{ minHeight: '800px' }}
            >
              {/* Slip Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b-2 border-slate-800">
                <div className="flex items-center gap-3.5">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Shop Logo"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
                      <Scissors className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                      {settings.shopName}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      ใบเสร็จรับเงินเดือนและส่วนแบ่งค่าบริการ (Salary & Commission Payslip)
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      เลขที่เอกสาร: PS-{selectedMonth.replace('-', '')}-{currentBarberData.barber.id.slice(-4).toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
                  <div className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 inline-block font-bold text-amber-800 text-[11px]">
                    รอบประจำเดือน: {cycleInfo.label}
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    วันที่ออกเอกสาร: {today.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    ระบบตัดรอบ: {cycleInfo.cutoffDescription}
                  </p>
                </div>
              </div>

              {/* Barber Employee Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-medium">ชื่อ-นามสกุลพนักงาน</span>
                  <span className="font-bold text-slate-900 text-sm">{currentBarberData.barber.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-medium">ชื่อเล่น</span>
                  <span className="font-bold text-slate-800 text-sm">
                    ช่าง{currentBarberData.barber.nickname}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-medium">ตำแหน่ง</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {currentBarberData.barber.positionTitle || 'ช่างตัดผม'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-medium">โครงสร้างผลตอบแทน</span>
                  {currentBarberData.salaryType === 'guarantee_min' ? (
                    <div className="mt-0.5">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded text-[11px]">
                        <Target className="w-3 h-3 text-amber-700" />
                        <span>ฐานการันตี {settings.currencySymbol}{currentBarberData.baseSalary.toLocaleString()}</span>
                      </span>
                    </div>
                  ) : currentBarberData.salaryType === 'fixed_plus_commission' ? (
                    <div className="mt-0.5">
                      <span className="inline-flex items-center gap-1 font-bold text-sky-800 bg-sky-100/80 border border-sky-300 px-2 py-0.5 rounded text-[11px]">
                        <ShieldCheck className="w-3 h-3 text-sky-700" />
                        <span>เงินเดือน {settings.currencySymbol}{currentBarberData.baseSalary.toLocaleString()} + คอมฯ</span>
                      </span>
                    </div>
                  ) : (
                    <div className="mt-0.5">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-200/80 border border-slate-300 px-2 py-0.5 rounded text-[11px]">
                        <Scissors className="w-3 h-3 text-slate-600" />
                        <span>คอมมิชชั่นผลงาน 100%</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dual Column: Earnings Table & Deductions Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. รายการได้ */}
                <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="bg-emerald-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>1. รายการได้</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">จำนวนเงิน</span>
                    </div>

                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-slate-100">
                        {/* 1. ฐานเงินเดือน */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <div className="text-slate-800 font-medium">ฐานเงินเดือน</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {settings.currencySymbol}{currentBarberData.effectiveBaseSalary.toLocaleString()}
                          </td>
                        </tr>

                        {/* 2. ค่าคอมมิชชั่น */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <div className="text-slate-800 font-medium">ค่าคอมมิชชั่น</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {settings.currencySymbol}{currentBarberData.commissionAboveBase.toLocaleString()}
                          </td>
                        </tr>

                        {/* 3. ค่าตำแหน่ง */}
                        {currentBarberData.positionAllowance > 0 && (
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3">
                              <div className="text-slate-800 font-medium">ค่าตำแหน่ง</div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                              +{settings.currencySymbol}{currentBarberData.positionAllowance.toLocaleString()}
                            </td>
                          </tr>
                        )}

                        {/* 4. รายการเงินพิเศษ */}
                        {currentBarberData.customEarningAmount > 0 && (
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3">
                              <div className="text-slate-800 font-medium">
                                {currentBarberData.customEarningName || 'เงินพิเศษ'}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                              +{settings.currencySymbol}{currentBarberData.customEarningAmount.toLocaleString()}
                            </td>
                          </tr>
                        )}

                        {/* 5. เงินทิป */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <div className="text-slate-800 font-medium">เงินทิป</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {settings.currencySymbol}{currentBarberData.tipTotal.toLocaleString()}
                          </td>
                        </tr>

                        {/* 6. เบี้ยขยัน / โบนัส */}
                        {currentBarberData.bonus > 0 && (
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3">
                              <div className="text-slate-800 font-medium">เบี้ยขยัน / โบนัส</div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                              +{settings.currencySymbol}{currentBarberData.bonus.toLocaleString()}
                            </td>
                          </tr>
                        )}

                        {/* 7. เงินช่วยเหลือ */}
                        {currentBarberData.allowance > 0 && (
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3">
                              <div className="text-slate-800 font-medium">เงินช่วยเหลือ</div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                              +{settings.currencySymbol}{currentBarberData.allowance.toLocaleString()}
                            </td>
                          </tr>
                        )}

                        {/* 8. รายการได้อื่นๆ เพิ่มเติม */}
                        {currentBarberData.extraEarnings?.map((extra) => (
                          extra.amount > 0 && (
                            <tr key={extra.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3">
                                <div className="text-slate-800 font-medium">{extra.name || 'รายได้เพิ่มเติม'}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                                +{settings.currencySymbol}{extra.amount.toLocaleString()}
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-emerald-50/70 p-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-xs text-emerald-950">รวมรายได้ทั้งหมด</span>
                    <span className="font-mono font-black text-sm text-emerald-700">
                      {settings.currencySymbol}{currentBarberData.totalEarnings.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 2. รายการหัก */}
                <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="bg-rose-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                        <Minus className="w-3.5 h-3.5 text-rose-600" />
                        <span>2. รายการหัก</span>
                      </span>
                      <span className="text-[10px] text-rose-700 font-semibold">จำนวนเงิน</span>
                    </div>

                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <div className="text-slate-800 font-medium">หักเงินเบิกล่วงหน้า</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                            {currentBarberData.effectiveAdvance > 0
                              ? `-${settings.currencySymbol}${currentBarberData.effectiveAdvance.toLocaleString()}`
                              : '0'}
                          </td>
                        </tr>

                        {currentBarberData.socialSecurity > 0 && (
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-800 font-medium">ประกันสังคม</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                              -{settings.currencySymbol}{currentBarberData.socialSecurity.toLocaleString()}
                            </td>
                          </tr>
                        )}

                        {currentBarberData.otherDeductions > 0 && (
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-800 font-medium">ค่าปรับ / หักอื่นๆ</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                              -{settings.currencySymbol}{currentBarberData.otherDeductions.toLocaleString()}
                            </td>
                          </tr>
                        )}

                        {/* รายการหักอื่นๆ เพิ่มเติม */}
                        {currentBarberData.extraDeductions?.map((extra) => (
                          extra.amount > 0 && (
                            <tr key={extra.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3">
                                <div className="text-slate-800 font-medium">{extra.name || 'รายการหักเพิ่มเติม'}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                                -{settings.currencySymbol}{extra.amount.toLocaleString()}
                              </td>
                            </tr>
                          )
                        ))}

                        {/* Blank rows if deductions list is short */}
                        {currentBarberData.effectiveAdvance === 0 &&
                          currentBarberData.socialSecurity === 0 &&
                          currentBarberData.otherDeductions === 0 &&
                          (currentBarberData.extraDeductions?.filter((e) => e.amount > 0).length ?? 0) === 0 && (
                            <tr>
                              <td colSpan={2} className="py-8 text-center text-slate-400 text-xs italic">
                                ไม่มีรายการหักในรอบบิลนี้
                              </td>
                            </tr>
                          )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-rose-50/70 p-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-xs text-rose-950">รวมรายการหัก</span>
                    <span className="font-mono font-black text-sm text-rose-700">
                      {settings.currencySymbol}{currentBarberData.totalDeductions.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Big Grand Net Pay Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-amber-500/10 border-2 border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 block">
                    ยอดเงินสุทธิที่ได้รับ (NET PAYABLE AMOUNT)
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    (ตัวหนังสือ: <span className="font-bold text-slate-800 underline decoration-emerald-500">{thaiBahtText(currentBarberData.netPay)}</span>)
                  </p>
                  {currentBarberData.notes && (
                    <p className="text-[11px] text-slate-600 mt-1 italic">
                      หมายเหตุ: {currentBarberData.notes}
                    </p>
                  )}
                </div>

                <div className="text-right self-end sm:self-auto">
                  <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-600 tracking-tight">
                    {settings.currencySymbol}{currentBarberData.netPay.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">ชำระแล้ว / พร้อมจ่าย</span>
                </div>
              </div>

              {/* Signatures & Approval Footer */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
                <div className="text-center space-y-8">
                  <span className="text-slate-500 block font-medium">ลงชื่อผู้จ่ายเงิน (ทางร้าน / นายจ้าง)</span>
                  <div className="border-b border-slate-400 w-3/4 mx-auto" />
                  <p className="text-slate-600 text-[11px]">
                    (......................................................)<br />
                    วันที่: ...... / ...... / ............
                  </p>
                </div>

                <div className="text-center space-y-8">
                  <span className="text-slate-500 block font-medium">ลงชื่อผู้รับเงิน (พนักงาน / ช่าง)</span>
                  <div className="border-b border-slate-400 w-3/4 mx-auto" />
                  <p className="text-slate-600 text-[11px]">
                    ( {currentBarberData.barber.name} )<br />
                    วันที่: ...... / ...... / ............
                  </p>
                </div>
              </div>

              {/* Security & System stamp */}
              <div className="pt-3 text-center border-t border-slate-100 text-[9px] text-slate-400 font-mono flex items-center justify-between">
                <span>ออกโดยระบบ {settings.shopName} POS PRO</span>
                <span>พิมพ์เมื่อ {today.toLocaleDateString('th-TH')} {today.toLocaleTimeString('th-TH')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. ALL BARBERS PAYROLL SUMMARY TABLE (Summary View) */}
      {activeView === 'summary' && (
        <div className={`${theme.bgCard} rounded-2xl p-5 border ${borderSubtle} space-y-4 shadow-xs`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/40">
            <div>
              <h3 className={`text-base font-bold ${headingText}`}>
                ตารางสรุปจ่ายเงินเดือน & ส่วนแบ่งช่างทั้งหมด ({barbers.length} คน)
              </h3>
              <p className={`text-xs ${mutedText} mt-0.5`}>
                รอบบิล: {cycleInfo.fullLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all shadow-xs btn-tactile"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ตารางสรุป</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-800/50">
            <table className="w-full text-left text-xs">
              <thead className={isDark ? 'bg-zinc-950 text-zinc-400 border-b border-zinc-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'}>
                <tr>
                  <th className="py-3 px-3.5">ช่าง</th>
                  <th className="py-3 px-2 text-center">โครงสร้าง</th>
                  <th className="py-3 px-2 text-center">งานตัดผม</th>
                  <th className="py-3 px-2.5 text-right font-bold text-amber-500">ฐานเงินเดือน</th>
                  <th className="py-3 px-2.5 text-right">ยอดผลงานจริง</th>
                  <th className="py-3 px-3 text-right font-bold text-indigo-400">ค่าคอมฯ (ส่วนเกินฐาน)</th>
                  <th className="py-3 px-2 text-right">ทิป</th>
                  <th className="py-3 px-2 text-right">เบิกล่วงหน้า</th>
                  <th className="py-3 px-3 text-right font-bold text-emerald-500">สุทธิต้องจ่าย</th>
                  <th className="py-3 px-3 text-center no-print">จัดการ</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${borderSubtle}`}>
                {barberPayrollList.map((item) => (
                  <tr
                    key={item.barber.id}
                    className={isDark ? 'hover:bg-zinc-800/40 transition-colors' : 'hover:bg-slate-50 transition-colors'}
                  >
                    <td className="py-3 px-3.5 font-bold">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                          style={{ backgroundColor: item.barber.color || '#f59e0b' }}
                        >
                          {item.barber.nickname.charAt(0)}
                        </div>
                        <div>
                          <span className={headingText}>ช่าง {item.barber.nickname}</span>
                          <span className={`block text-[10px] ${mutedText}`}>{item.barber.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {item.isManualMode ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30">
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>กำหนดเอง (Manual)</span>
                        </span>
                      ) : item.salaryType === 'guarantee_min' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
                          <Target className="w-2.5 h-2.5" />
                          <span>การันตี {settings.currencySymbol}{item.baseSalary.toLocaleString()}</span>
                        </span>
                      ) : item.salaryType === 'fixed_plus_commission' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>เงินเดือน {settings.currencySymbol}{item.baseSalary.toLocaleString()}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-700/50">
                          <Scissors className="w-2.5 h-2.5" />
                          <span>คอมฯ 100%</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-semibold">
                      {item.haircutCount} หัว
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono font-bold text-amber-500">
                      {item.effectiveBaseSalary > 0 ? (
                        `${settings.currencySymbol}${item.effectiveBaseSalary.toLocaleString()}`
                      ) : (
                        <span className={mutedText}>-</span>
                      )}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono">
                      <div className="font-semibold text-slate-700 dark:text-zinc-200">
                        {settings.currencySymbol}{item.totalCommission.toLocaleString()}
                      </div>
                      <div className={`text-[10px] ${mutedText}`}>
                        ยอดบิล {settings.currencySymbol}{item.totalRevenueGenerated.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {item.salaryType === 'guarantee_min' ? (
                        item.commissionAboveBase > 0 ? (
                          <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            +{settings.currencySymbol}{item.commissionAboveBase.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-normal text-[11px] bg-zinc-800/40 px-1.5 py-0.5 rounded">
                            {settings.currencySymbol}0
                          </span>
                        )
                      ) : (
                        <span className="text-indigo-400 font-bold">
                          +{settings.currencySymbol}{item.commissionAboveBase.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-emerald-500">
                      {item.tipTotal > 0 ? `${settings.currencySymbol}${item.tipTotal.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-rose-500">
                      {item.effectiveAdvance > 0 ? `-${settings.currencySymbol}${item.effectiveAdvance.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-sm text-emerald-500">
                      {settings.currencySymbol}{item.netPay.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center no-print">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setSelectedBarberId(item.barber.id);
                            setActiveView('slip');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all btn-tactile ${
                            isDark
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                          }`}
                          title="ดูสลิปของช่างคนนี้"
                        >
                          ดูสลิป 📄
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditAdjustments(item.barber)}
                          className={`p-1 rounded-lg border transition-all btn-tactile ${
                            isDark
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border-zinc-700'
                              : 'bg-white hover:bg-slate-100 text-amber-600 border-slate-200'
                          }`}
                          title="ปรับเงินเดือน / โบนัส"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className={isDark ? 'bg-zinc-950 font-bold text-zinc-200 border-t border-zinc-800' : 'bg-slate-100 font-bold text-slate-800 border-t border-slate-300'}>
                <tr>
                  <td className="py-3 px-3.5 font-bold">รวมทั้งหมด ({barbers.length} คน)</td>
                  <td className="py-3 px-2 text-center font-mono text-[10px] text-zinc-400">
                    -
                  </td>
                  <td className="py-3 px-2 text-center font-mono">{overallStats.totalHaircuts} หัว</td>
                  <td className="py-3 px-2.5 text-right font-mono text-amber-500 font-bold">
                    {settings.currencySymbol}{overallStats.totalBaseSalary.toLocaleString()}
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono text-slate-700 dark:text-zinc-300 font-semibold">
                    {settings.currencySymbol}{barberPayrollList.reduce((s, b) => s + b.totalCommission, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-indigo-400 font-bold">
                    +{settings.currencySymbol}{overallStats.totalCommissionAboveBase.toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-emerald-500">
                    {settings.currencySymbol}{barberPayrollList.reduce((s, b) => s + b.tipTotal, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-rose-500">
                    -{settings.currencySymbol}{overallStats.totalAdvances.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-sm text-emerald-500">
                    {settings.currencySymbol}{overallStats.totalNetPay.toLocaleString()}
                  </td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL: EDIT ADJUSTMENTS (Salary Type, Base/Guarantee, Bonus, Deductions) */}
      {isEditModalOpen && editingBarber && (() => {
        const currentPayroll = barberPayrollList.find((p) => p.barber.id === editingBarber.id);
        const actualCommission = currentPayroll?.totalCommission ?? 0;
        const enteredBase = parseFloat(tempBaseSalary) || 0;

        // Calculate preview for Auto Mode
        let previewBaseSalary = 0;
        let previewCommissionAbove = 0;
        let previewWorkEarn = 0;
        let previewExplanation = '';

        if (tempSalaryType === 'guarantee_min') {
          previewBaseSalary = enteredBase;
          if (enteredBase > 0) {
            if (actualCommission > enteredBase) {
              previewCommissionAbove = actualCommission - enteredBase;
              previewWorkEarn = actualCommission;
              previewExplanation = `ฐานเงินเดือน ${settings.currencySymbol}${enteredBase.toLocaleString()} + ค่าคอมมิชชั่นส่วนที่เกินฐาน ${settings.currencySymbol}${previewCommissionAbove.toLocaleString()} ➜ รวม ${settings.currencySymbol}${previewWorkEarn.toLocaleString()}`;
            } else {
              previewCommissionAbove = 0;
              previewWorkEarn = enteredBase;
              const topUp = enteredBase - actualCommission;
              previewExplanation = `ยอดผลงานบริการ ${settings.currencySymbol}${actualCommission.toLocaleString()} ไม่ถึงฐาน ➜ ร้านจ่ายฐานเงินเดือน ${settings.currencySymbol}${enteredBase.toLocaleString()} เต็มจำนวน (ชดเชย +${settings.currencySymbol}${topUp.toLocaleString()}, ค่าคอมฯ ส่วนเกิน = ${settings.currencySymbol}0)`;
            }
          } else {
            previewWorkEarn = actualCommission;
            previewCommissionAbove = actualCommission;
            previewExplanation = `ไม่มีฐานเงินเดือน ➜ ได้รับตามยอดคอมมิชชั่นจริง ${settings.currencySymbol}${actualCommission.toLocaleString()}`;
          }
        } else if (tempSalaryType === 'fixed_plus_commission') {
          previewBaseSalary = enteredBase;
          previewCommissionAbove = actualCommission;
          previewWorkEarn = enteredBase + actualCommission;
          previewExplanation = `เงินเดือนประจำคงที่ ${settings.currencySymbol}${enteredBase.toLocaleString()} + ค่าคอมมิชชั่น ${settings.currencySymbol}${actualCommission.toLocaleString()} ➜ รวม ${settings.currencySymbol}${previewWorkEarn.toLocaleString()}`;
        } else {
          previewBaseSalary = 0;
          previewCommissionAbove = actualCommission;
          previewWorkEarn = actualCommission;
          previewExplanation = `คอมมิชชั่นล้วน 100% ➜ ได้รับตามยอดที่ทำได้จริง ${settings.currencySymbol}${actualCommission.toLocaleString()}`;
        }

        // Preview numbers for Manual Mode
        const manualBaseNum = parseFloat(tempManualBaseSalary) || 0;
        const manualCommNum = parseFloat(tempManualCommission) || 0;
        const manualTipNum = parseFloat(tempManualTip) || 0;
        const posAllowanceNum = parseFloat(tempPositionAllowance) || 0;
        const bonusNum = parseFloat(tempBonus) || 0;
        const allowanceNum = parseFloat(tempAllowance) || 0;
        const customEarnNum = parseFloat(tempCustomEarningAmount) || 0;
        const extraEarnSum = tempExtraEarnings.reduce((s, x) => s + (Number(x.amount) || 0), 0);

        const manualAdvanceNum = parseFloat(tempManualAdvance) || 0;
        const socialSecurityNum = parseFloat(tempSocialSecurity) || 0;
        const otherDeductionsNum = parseFloat(tempOtherDeductions) || 0;
        const extraDedSum = tempExtraDeductions.reduce((s, x) => s + (Number(x.amount) || 0), 0);

        const manualTotalEarnings =
          manualBaseNum +
          manualCommNum +
          manualTipNum +
          posAllowanceNum +
          bonusNum +
          allowanceNum +
          customEarnNum +
          extraEarnSum;
        const manualTotalDeductions = manualAdvanceNum + socialSecurityNum + otherDeductionsNum + extraDedSum;
        const manualNetPay = Math.max(0, manualTotalEarnings - manualTotalDeductions);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className={`rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-6 border ${
              isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              {/* Modal Header */}
              <div className={`flex items-center justify-between px-5 py-4 border-b ${borderSubtle}`}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-xs"
                    style={{ backgroundColor: editingBarber.color || '#f59e0b' }}
                  >
                    {editingBarber.nickname.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm flex items-center gap-1.5">
                      <span>จัดการเงินเดือน: ช่าง {editingBarber.nickname}</span>
                      {tempIsManualMode ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30">
                          โหมด Manual
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                          โหมด Auto
                        </span>
                      )}
                    </h3>
                    <span className={`text-[10px] ${mutedText} block`}>
                      รอบประจำเดือน {cycleInfo.label}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                    isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                >
                  ✕
                </button>
              </div>

              {/* Mode Selector Tabs (Auto vs Manual) */}
              <div className="p-3 bg-zinc-950/40 border-b border-zinc-800/60">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setTempIsManualMode(false);
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all btn-tactile ${
                      !tempIsManualMode
                        ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold shadow-xs'
                        : isDark
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ คำนวณอัตโนมัติ (Auto)</span>
                    </div>
                    <div className="text-[10px] opacity-85 mt-0.5">
                      คิดจากยอดบิลจริงตามสูตรการันตี
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setTempIsManualMode(true);
                      setTempSaveAsDefault(false);
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all btn-tactile ${
                      tempIsManualMode
                        ? 'bg-violet-600 text-white border-violet-500 font-bold shadow-xs'
                        : isDark
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>✍️ โหมด Manual (กรอกเอง)</span>
                    </div>
                    <div className="text-[10px] opacity-85 mt-0.5">
                      กรอกตัวเลขเอง + เพิ่มค่าอื่นๆ ได้อิสระ
                    </div>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveAdjustments} className="p-4 sm:p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                {/* ======================================================== */}
                {/* TAB 1: MANUAL MODE */}
                {/* ======================================================== */}
                {tempIsManualMode ? (
                  <div className="space-y-4">
                    {/* Auto-fill helper box */}
                    <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div>
                        <div className="font-bold text-violet-400 flex items-center gap-1.5 text-xs">
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>โหมดกรอกตัวเลขเอง (Manual Mode)</span>
                        </div>
                        <p className={`text-[11px] ${mutedText} mt-0.5`}>
                          คุณสามารถพิมพ์ตัวเลขทุกช่องได้เองตามต้องการ พร้อมเพิ่มรายการได้/หักอื่นๆ ได้
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyFromAuto}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-xs shrink-0 flex items-center gap-1.5 btn-tactile"
                        title="ดึงตัวเลขจากการคำนวณจริงตามบิลมาใส่ในช่องกรอก เพื่อใช้เป็นจุดเริ่มต้นแก้ไข"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>ดึงตัวเลขจาก Auto</span>
                      </button>
                    </div>

                    {/* Primary Manual Income Fields */}
                    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>รายการได้หลัก (ฐานเงินเดือน & คอมมิชชั่น & ทิป)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* ฐานเงินเดือน */}
                        <div className="space-y-1">
                          <label className="font-semibold block text-slate-700 dark:text-zinc-300 text-[11px]">
                            ฐานเงินเดือน ({settings.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={tempManualBaseSalary}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setTempManualBaseSalary(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-sm focus:outline-none ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-amber-400' : 'bg-white border-slate-300 text-amber-600'
                            }`}
                          />
                        </div>

                        {/* ค่าคอมมิชชั่น */}
                        <div className="space-y-1">
                          <label className="font-semibold block text-slate-700 dark:text-zinc-300 text-[11px]">
                            ค่าคอมมิชชั่น ({settings.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={tempManualCommission}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setTempManualCommission(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-sm focus:outline-none ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-indigo-400' : 'bg-white border-slate-300 text-indigo-600'
                            }`}
                          />
                        </div>

                        {/* เงินทิป */}
                        <div className="space-y-1">
                          <label className="font-semibold block text-slate-700 dark:text-zinc-300 text-[11px]">
                            เงินทิป ({settings.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={tempManualTip}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setTempManualTip(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-sm focus:outline-none ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Secondary allowances */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="space-y-1">
                          <label className={`font-medium block ${mutedText} text-[11px]`}>
                            ค่าตำแหน่ง ({settings.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempPositionAllowance}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setTempPositionAllowance(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className={`font-medium block ${mutedText} text-[11px]`}>
                            เบี้ยขยัน / โบนัส ({settings.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempBonus}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setTempBonus(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className={`font-medium block ${mutedText} text-[11px]`}>
                            เงินช่วยเหลือ ({settings.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempAllowance}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setTempAllowance(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* DYNAMIC EXTRA EARNINGS (ค่าอื่นๆ เพิ่มเข้ามานอกเหนือจากที่มี) */}
                    <div className="p-3.5 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-emerald-500 flex items-center gap-1.5 text-xs">
                            <Plus className="w-3.5 h-3.5" />
                            <span>ค่าอื่นๆ เพิ่มเข้ามานอกเหนือจากที่มี (รายการได้เพิ่มเติม)</span>
                          </span>
                          <span className={`text-[10px] ${mutedText} block`}>
                            เพิ่มได้ไม่จำกัด เช่น ค่าปิดร้าน, ค่าเดินทาง, ค่าสอนงาน, OT
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddExtraEarning}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-all shadow-xs btn-tactile"
                        >
                          <Plus className="w-3 h-3" />
                          <span>เพิ่มรายการได้</span>
                        </button>
                      </div>

                      {tempExtraEarnings.length === 0 ? (
                        <div className="py-2.5 text-center text-[11px] text-zinc-400 italic">
                          ยังไม่มีรายการได้เพิ่มเติม (กด &quot;เพิ่มรายการได้&quot; เพื่อเพิ่มรายการใหม่)
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1">
                          {tempExtraEarnings.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateExtraEarning(item.id, 'name', e.target.value)}
                                placeholder={`ชื่อรายการที่ ${idx + 1} เช่น ค่าปิดร้าน, OT`}
                                className={`flex-1 px-3 py-2 rounded-xl border focus:outline-none text-xs ${
                                  isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                                }`}
                              />
                              <div className="w-32 relative">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.amount === 0 ? '' : item.amount}
                                  placeholder="0"
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => handleUpdateExtraEarning(item.id, 'amount', e.target.value)}
                                  className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-xs text-right focus:outline-none ${
                                    isDark ? 'bg-zinc-950 border-zinc-700 text-emerald-400' : 'bg-white border-slate-200 text-emerald-600'
                                  }`}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveExtraEarning(item.id)}
                                className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-colors btn-tactile"
                                title="ลบรายการนี้"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Primary Deductions */}
                    <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                      <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 text-xs">
                        <Minus className="w-3.5 h-3.5" />
                        <span>รายการหักหลัก</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <label className="font-semibold block text-slate-700 dark:text-zinc-300 text-[11px]">
                            หักเงินเบิกล่วงหน้า ({settings.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempManualAdvance}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setTempManualAdvance(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-sm focus:outline-none ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-rose-400' : 'bg-white border-slate-300 text-rose-600'
                            }`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold block text-slate-700 dark:text-zinc-300 text-[11px]">
                            ประกันสังคม ({settings.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempSocialSecurity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setTempSocialSecurity(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-sm focus:outline-none ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-rose-400' : 'bg-white border-slate-300 text-rose-600'
                            }`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold block text-slate-700 dark:text-zinc-300 text-[11px]">
                            ค่าปรับ / หักอื่นๆ ({settings.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempOtherDeductions}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setTempOtherDeductions(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-sm focus:outline-none ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-rose-400' : 'bg-white border-slate-300 text-rose-600'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* DYNAMIC EXTRA DEDUCTIONS (รายการหักอื่นๆ เพิ่มเติม) */}
                    <div className="p-3.5 rounded-xl border border-dashed border-rose-500/40 bg-rose-500/5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-rose-500 flex items-center gap-1.5 text-xs">
                            <Plus className="w-3.5 h-3.5" />
                            <span>รายการหักอื่นๆ เพิ่มเติม</span>
                          </span>
                          <span className={`text-[10px] ${mutedText} block`}>
                            เพิ่มได้ไม่จำกัด เช่น ค่าของเสียหาย, หักมาสาย, เงินออมร้าน
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddExtraDeduction}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 transition-all shadow-xs btn-tactile"
                        >
                          <Plus className="w-3 h-3" />
                          <span>เพิ่มรายการหัก</span>
                        </button>
                      </div>

                      {tempExtraDeductions.length === 0 ? (
                        <div className="py-2.5 text-center text-[11px] text-zinc-400 italic">
                          ยังไม่มีรายการหักเพิ่มเติม
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1">
                          {tempExtraDeductions.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateExtraDeduction(item.id, 'name', e.target.value)}
                                placeholder={`ชื่อรายการหักที่ ${idx + 1} เช่น ค่าของเสียหาย`}
                                className={`flex-1 px-3 py-2 rounded-xl border focus:outline-none text-xs ${
                                  isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                                }`}
                              />
                              <div className="w-32 relative">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.amount === 0 ? '' : item.amount}
                                  placeholder="0"
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => handleUpdateExtraDeduction(item.id, 'amount', e.target.value)}
                                  className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-xs text-right focus:outline-none ${
                                    isDark ? 'bg-zinc-950 border-zinc-700 text-rose-400' : 'bg-white border-slate-200 text-rose-600'
                                  }`}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveExtraDeduction(item.id)}
                                className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-colors btn-tactile"
                                title="ลบรายการนี้"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Live Summary Box for Manual Mode */}
                    <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-violet-400 block text-xs">
                          สรุปยอดเงินเดือน (โหมด Manual)
                        </span>
                        <span className={`text-[11px] ${mutedText}`}>
                          รวมได้ {settings.currencySymbol}{manualTotalEarnings.toLocaleString()} - รวมหัก {settings.currencySymbol}{manualTotalDeductions.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block font-semibold">ยอดสุทธิต้องจ่าย</span>
                        <span className="text-base sm:text-lg font-mono font-black text-emerald-400">
                          {settings.currencySymbol}{manualNetPay.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ======================================================== */
                  /* TAB 2: AUTO MODE (Calculation based on Bills) */
                  /* ======================================================== */
                  <div className="space-y-4">
                    {/* 1. Salary Type Selector */}
                    <div className="space-y-1.5">
                      <label className="font-bold block text-slate-700 dark:text-zinc-200">
                        รูปแบบการคิดเงินเดือน (Salary Structure)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setTempSalaryType('guarantee_min');
                            if (parseFloat(tempBaseSalary) === 0) setTempBaseSalary('15000');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all btn-tactile ${
                            tempSalaryType === 'guarantee_min'
                              ? 'border-amber-500 bg-amber-500/15 text-amber-500 shadow-xs'
                              : isDark
                              ? 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5" />
                            <span>การันตีขั้นต่ำ</span>
                          </div>
                          <div className="text-[10px] opacity-80 mt-1">
                            ไม่ถึงได้ฐาน เกินได้ตามจริง
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setTempSalaryType('commission_only');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all btn-tactile ${
                            tempSalaryType === 'commission_only'
                              ? 'border-amber-500 bg-amber-500/15 text-amber-500 shadow-xs'
                              : isDark
                              ? 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <Scissors className="w-3.5 h-3.5" />
                            <span>คอมมิชชั่นล้วน</span>
                          </div>
                          <div className="text-[10px] opacity-80 mt-1">
                            รับตามผลงาน 100%
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setTempSalaryType('fixed_plus_commission');
                            if (parseFloat(tempBaseSalary) === 0) setTempBaseSalary('15000');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all btn-tactile ${
                            tempSalaryType === 'fixed_plus_commission'
                              ? 'border-sky-500 bg-sky-500/15 text-sky-400 shadow-xs'
                              : isDark
                              ? 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>เงินเดือน+คอมฯ</span>
                          </div>
                          <div className="text-[10px] opacity-80 mt-1">
                            เงินเดือนประจำ + คอมฯ
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* 2. Base Salary / Guarantee Amount input + Presets */}
                    {tempSalaryType !== 'commission_only' && (
                      <div className="space-y-1.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-amber-600 dark:text-amber-400">
                            {tempSalaryType === 'guarantee_min'
                              ? 'ฐานเงินเดือนการันตีขั้นต่ำ'
                              : 'เงินเดือนประจำคงที่'} ({settings.currencySymbol})
                          </label>
                          <span className="text-[10px] text-zinc-400">
                            เลือกด่วนหรือพิมพ์จำนวนเงิน
                          </span>
                        </div>

                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={tempBaseSalary}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setTempBaseSalary(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-base focus:outline-none ${
                            isDark ? 'bg-zinc-950 border-zinc-700 text-amber-400' : 'bg-white border-slate-300 text-amber-600'
                          }`}
                        />

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {['10000', '12000', '15000', '18000', '20000'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                setTempBaseSalary(preset);
                              }}
                              className={`px-2 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-all btn-tactile ${
                                tempBaseSalary === preset
                                  ? 'bg-amber-500 text-zinc-950 border-amber-500'
                                  : isDark
                                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {settings.currencySymbol}{Number(preset).toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Live Preview of Guarantee Calculation */}
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>จำลองผลลัพธ์การคำนวณจริงเดือนนี้</span>
                        </span>
                        <span className="font-mono text-xs">
                          คอมมิชชั่นสะสม: {settings.currencySymbol}{actualCommission.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-zinc-300 dark:text-zinc-300 text-[11px] leading-relaxed">
                        {previewExplanation}
                      </p>
                    </div>

                    {/* 4. Bonus & Allowances */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold block text-emerald-600 dark:text-emerald-400">
                          เบี้ยขยัน / โบนัส ({settings.currencySymbol})
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={tempBonus}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setTempBonus(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none ${
                            isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold block text-emerald-600 dark:text-emerald-400">
                          ค่าตำแหน่ง ({settings.currencySymbol})
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={tempPositionAllowance}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setTempPositionAllowance(e.target.value)}
                          placeholder="เช่น 1,000 หรือ 2,000"
                          className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none ${
                            isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>

                    {/* 4.1 Custom Extra Allowance */}
                    <div className="p-3 rounded-xl border space-y-2 bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800">
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                        <span>เงินพิเศษ / รายการรายได้เพิ่มเติม</span>
                        <span className="text-[10px] text-zinc-400">ระบุชื่อและยอดเงิน</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className={`block text-[11px] ${mutedText}`}>
                            ชื่อรายการเงินพิเศษ
                          </label>
                          <input
                            type="text"
                            value={tempCustomEarningName}
                            onChange={(e) => setTempCustomEarningName(e.target.value)}
                            placeholder="เช่น ค่าปิดร้าน, ค่าเดินทาง, OT"
                            className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className={`block text-[11px] ${mutedText}`}>
                            จำนวนเงิน ({settings.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempCustomEarningAmount}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setTempCustomEarningAmount(e.target.value)}
                            placeholder="0"
                            className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold block text-emerald-600 dark:text-emerald-400">
                        ค่าครองชีพ / อื่นๆ ({settings.currencySymbol})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={tempAllowance}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setTempAllowance(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none ${
                          isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>

                    {/* DYNAMIC EXTRA EARNINGS (also accessible in Auto mode) */}
                    <div className="p-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-emerald-500 flex items-center gap-1.5 text-xs">
                            <Plus className="w-3.5 h-3.5" />
                            <span>ค่าอื่นๆ เพิ่มเข้ามานอกเหนือจากที่มี</span>
                          </span>
                          <span className={`text-[10px] ${mutedText} block`}>
                            เพิ่มรายการได้หลายรายการได้อิสระ
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddExtraEarning}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-all shadow-xs btn-tactile"
                        >
                          <Plus className="w-3 h-3" />
                          <span>เพิ่มรายการได้</span>
                        </button>
                      </div>

                      {tempExtraEarnings.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateExtraEarning(item.id, 'name', e.target.value)}
                            placeholder={`ชื่อรายการ เช่น ค่าสอนงาน`}
                            className={`flex-1 px-3 py-1.5 rounded-xl border focus:outline-none text-xs ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                          <div className="w-28 relative">
                            <input
                              type="number"
                              min="0"
                              value={item.amount === 0 ? '' : item.amount}
                              placeholder="0"
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleUpdateExtraEarning(item.id, 'amount', e.target.value)}
                              className={`w-full px-3 py-1.5 rounded-xl border font-mono font-bold text-xs text-right focus:outline-none ${
                                isDark ? 'bg-zinc-950 border-zinc-700 text-emerald-400' : 'bg-white border-slate-200 text-emerald-600'
                              }`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExtraEarning(item.id)}
                            className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-colors btn-tactile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* 5. Deductions */}
                    <div className="border-t border-zinc-800/40 pt-3 space-y-3">
                      <div className="space-y-1">
                        <label className="font-semibold block text-rose-600 dark:text-rose-400">
                          หักเงินเบิกล่วงหน้า (ระบุเองเพื่อแทนที่ค่าตรวจพบอัตโนมัติ) ({settings.currencySymbol})
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={tempManualAdvance}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setTempManualAdvance(e.target.value)}
                          placeholder="0 = ใช้ยอดเบิกตามระบบบันทึกรายจ่าย"
                          className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none ${
                            isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold block text-rose-600 dark:text-rose-400">
                            ประกันสังคม ({settings.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempSocialSecurity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setTempSocialSecurity(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold block text-rose-600 dark:text-rose-400">
                            ค่าปรับ / หักอื่นๆ ({settings.currencySymbol})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={tempOtherDeductions}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setTempOtherDeductions(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none ${
                              isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>

                      {/* DYNAMIC EXTRA DEDUCTIONS (in Auto mode) */}
                      <div className="p-3 rounded-xl border border-dashed border-rose-500/40 bg-rose-500/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-rose-500 flex items-center gap-1.5 text-xs">
                              <Plus className="w-3.5 h-3.5" />
                              <span>รายการหักอื่นๆ เพิ่มเติม</span>
                            </span>
                            <span className={`text-[10px] ${mutedText} block`}>
                              เพิ่มรายการหักนอกเหนือจากที่มี
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddExtraDeduction}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 transition-all shadow-xs btn-tactile"
                          >
                            <Plus className="w-3 h-3" />
                            <span>เพิ่มรายการหัก</span>
                          </button>
                        </div>

                        {tempExtraDeductions.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateExtraDeduction(item.id, 'name', e.target.value)}
                              placeholder={`ชื่อรายการหัก`}
                              className={`flex-1 px-3 py-1.5 rounded-xl border focus:outline-none text-xs ${
                                isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                              }`}
                            />
                            <div className="w-28 relative">
                              <input
                                type="number"
                                min="0"
                                value={item.amount === 0 ? '' : item.amount}
                                placeholder="0"
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleUpdateExtraDeduction(item.id, 'amount', e.target.value)}
                                className={`w-full px-3 py-1.5 rounded-xl border font-mono font-bold text-xs text-right focus:outline-none ${
                                  isDark ? 'bg-zinc-950 border-zinc-700 text-rose-400' : 'bg-white border-slate-200 text-rose-600'
                                }`}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveExtraDeduction(item.id)}
                              className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-colors btn-tactile"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Checkbox to save as default profile in Auto Mode */}
                    <label className="flex items-center gap-2 cursor-pointer pt-1 text-[11px] select-none">
                      <input
                        type="checkbox"
                        checked={tempSaveAsDefault}
                        onChange={(e) => setTempSaveAsDefault(e.target.checked)}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500 w-4 h-4"
                      />
                      <span className="text-zinc-300 dark:text-zinc-300 font-medium">
                        บันทึกฐานเงินเดือนและรูปแบบนี้เป็นค่าเริ่มต้นในโปรไฟล์ช่าง {editingBarber.nickname} ด้วย
                      </span>
                    </label>
                  </div>
                )}

                {/* Common Notes field */}
                <div className="space-y-1 pt-1">
                  <label className={`font-semibold block ${mutedText}`}>
                    หมายเหตุเพิ่มเติมบนสลิป
                  </label>
                  <input
                    type="text"
                    value={tempNotes}
                    onChange={(e) => setTempNotes(e.target.value)}
                    placeholder="เช่น ปรับยอดเงินพิเศษประจำเดือน, โบนัสพิเศษ"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800/40">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className={`px-4 py-2 rounded-xl font-bold transition-all ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 rounded-xl font-bold transition-all shadow-md btn-tactile ${
                      tempIsManualMode
                        ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/30'
                        : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/30'
                    }`}
                  >
                    {tempIsManualMode ? 'บันทึกโหมด Manual' : 'บันทึกข้อมูล'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
