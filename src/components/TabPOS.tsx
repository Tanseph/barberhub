import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BillProductItem, PaymentMethod } from '../types';
import {
  Scissors,
  User,
  Users,
  ShoppingBag,
  Check,
  Plus,
  Minus,
  Trash2,
  Clock,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Sparkles,
  FlaskConical,
  FileText,
  Receipt,
  Calculator,
  Percent,
  Calendar,
  Gift,
  Tag,
} from 'lucide-react';
import { sounds } from '../utils/sound';
import {
  RealtimeDatePicker,
  getTodayDateStr,
  formatThaiDateShort,
  formatThaiDateWithWeekday,
  getDayDifference,
} from './RealtimeDatePicker';

export const TabPOS: React.FC = () => {
  const {
    barbers,
    products,
    addSaleBill,
    settings,
    theme,
    pendingQueueToPos,
    clearPendingQueueToPos,
    openReceiptModal,
    calculateCommission,
  } = useApp();

  const isDark = theme.isDark ?? true;

  // Sale Date & Time State (Real-time by default, editable for retroactive entries)
  const [saleDate, setSaleDate] = useState<string>(() => getTodayDateStr());
  const [saleTime, setSaleTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [isLiveClock, setIsLiveClock] = useState<boolean>(true);

  // Form State
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    barbers[0]?.id || ''
  );
  const [customerName, setCustomerName] = useState<string>('');
  const [haircutFee, setHaircutFee] = useState<string>('');
  const [headCount, setHeadCount] = useState<number>(1);
  const [chemicalFee, setChemicalFee] = useState<string>('');
  const [tipFee, setTipFee] = useState<string>('');

  useEffect(() => {
    if ((!selectedBarberId || !barbers.find((b) => b.id === selectedBarberId)) && barbers.length > 0) {
      setSelectedBarberId(barbers[0].id);
    }
  }, [barbers, selectedBarberId]);

  // Product Dropdown State
  const [selectedProductDropdownId, setSelectedProductDropdownId] = useState<string>('');
  const [productQtyToAdd, setProductQtyToAdd] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<BillProductItem[]>([]);

  // Promotion & Gift Voucher State
  const [hasHaircutPromo10, setHasHaircutPromo10] = useState<boolean>(false);
  const [selectedPresetVoucher, setSelectedPresetVoucher] = useState<number | null>(null);

  // Notes & Payment State
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [cashInputStr, setCashInputStr] = useState<string>('');
  const [transferInputStr, setTransferInputStr] = useState<string>('');
  const [activeQueueId, setActiveQueueId] = useState<string | undefined>(undefined);

  // Real-time clock: continuously ticks live time
  const [liveDate, setLiveDate] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setLiveDate(now);
      if (isLiveClock) {
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        setSaleTime(`${hh}:${mm}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isLiveClock]);

  // Sync when coming from Queue tab
  useEffect(() => {
    if (pendingQueueToPos) {
      setSelectedBarberId(pendingQueueToPos.barberId);
      setCustomerName(pendingQueueToPos.customerName);
      setActiveQueueId(pendingQueueToPos.id);
    }
  }, [pendingQueueToPos]);

  // Current selected barber
  const currentBarber = barbers.find((b) => b.id === selectedBarberId) || barbers[0];

  // Numeric values
  const numHaircut = parseFloat(haircutFee) || 0;
  const numChemical = parseFloat(chemicalFee) || 0;
  const numTip = parseFloat(tipFee) || 0;

  // Total products amount
  const totalProductsFee = selectedProducts.reduce((sum, p) => sum + p.total, 0);

  // Subtotal before any discounts
  const subtotalBeforeDiscount = numHaircut + numChemical + totalProductsFee + numTip;

  // 1. Haircut 10% Discount (ร้านรับผิดชอบเอง ช่างได้คอมมิชชั่นเต็ม)
  const haircutDiscountAmount = hasHaircutPromo10 && numHaircut > 0
    ? Math.round(numHaircut * 0.1)
    : 0;

  // 2. Gift Voucher Discount (ร้านรับผิดชอบเอง ช่างได้คอมมิชชั่นเต็ม)
  const voucherOptions =
    settings.voucherPresetAmounts && settings.voucherPresetAmounts.length > 0
      ? settings.voucherPresetAmounts
      : [50, 100, 200, 300, 500];
  const effectiveVoucherAmount = selectedPresetVoucher ? selectedPresetVoucher : 0;

  // Total discounts
  const rawTotalDiscount = haircutDiscountAmount + effectiveVoucherAmount;
  const totalDiscountAmount = Math.min(subtotalBeforeDiscount, rawTotalDiscount);

  // Net gross total payable by customer
  const grossTotal = Math.max(0, subtotalBeforeDiscount - totalDiscountAmount);

  // Auto-balance split payments
  useEffect(() => {
    if (paymentMethod === 'cash') {
      setCashAmount(grossTotal);
      setTransferAmount(0);
      setCashInputStr(grossTotal > 0 ? String(grossTotal) : '');
      setTransferInputStr('');
    } else if (paymentMethod === 'transfer') {
      setCashAmount(0);
      setTransferAmount(grossTotal);
      setCashInputStr('');
      setTransferInputStr(grossTotal > 0 ? String(grossTotal) : '');
    } else if (paymentMethod === 'split') {
      // If user hasn't typed anything yet or both are empty, initialize cash as 0 or blank, transfer as remaining
      if (cashInputStr === '' && transferInputStr === '') {
        setCashAmount(0);
        setTransferAmount(grossTotal);
        setCashInputStr('');
        setTransferInputStr(grossTotal > 0 ? String(grossTotal) : '');
      } else if (cashInputStr !== '') {
        const cVal = parseFloat(cashInputStr);
        const validC = isNaN(cVal) ? 0 : Math.max(0, cVal);
        const rem = Math.max(0, grossTotal - validC);
        setCashAmount(validC);
        setTransferAmount(rem);
        setTransferInputStr(rem > 0 ? String(rem) : (grossTotal > 0 && validC >= grossTotal ? '0' : ''));
      } else if (transferInputStr !== '') {
        const tVal = parseFloat(transferInputStr);
        const validT = isNaN(tVal) ? 0 : Math.max(0, tVal);
        const rem = Math.max(0, grossTotal - validT);
        setTransferAmount(validT);
        setCashAmount(rem);
        setCashInputStr(rem > 0 ? String(rem) : (grossTotal > 0 && validT >= grossTotal ? '0' : ''));
      }
    }
  }, [grossTotal, paymentMethod]);

  const handleCashInputChange = (valStr: string) => {
    setCashInputStr(valStr);
    if (valStr === '') {
      setCashAmount(0);
      setTransferAmount(grossTotal);
      setTransferInputStr(grossTotal > 0 ? String(grossTotal) : '');
      return;
    }
    const valNum = parseFloat(valStr);
    if (isNaN(valNum)) {
      setCashAmount(0);
      setTransferAmount(grossTotal);
      setTransferInputStr(grossTotal > 0 ? String(grossTotal) : '');
      return;
    }
    const clamped = Math.max(0, valNum);
    setCashAmount(clamped);
    const rem = Math.max(0, grossTotal - clamped);
    setTransferAmount(rem);
    setTransferInputStr(rem > 0 ? String(rem) : '0');
  };

  const handleTransferInputChange = (valStr: string) => {
    setTransferInputStr(valStr);
    if (valStr === '') {
      setTransferAmount(0);
      setCashAmount(grossTotal);
      setCashInputStr(grossTotal > 0 ? String(grossTotal) : '');
      return;
    }
    const valNum = parseFloat(valStr);
    if (isNaN(valNum)) {
      setTransferAmount(0);
      setCashAmount(grossTotal);
      setCashInputStr(grossTotal > 0 ? String(grossTotal) : '');
      return;
    }
    const clamped = Math.max(0, valNum);
    setTransferAmount(clamped);
    const rem = Math.max(0, grossTotal - clamped);
    setCashAmount(rem);
    setCashInputStr(rem > 0 ? String(rem) : '0');
  };

  // Realtime commission estimate (ช่างได้ส่วนแบ่งเต็ม 100% ไม่โดนหัก, ร้านรับผิดชอบส่วนลดเอง)
  const commissionPreview = calculateCommission(
    selectedBarberId,
    numHaircut,
    numChemical,
    selectedProducts,
    numTip,
    totalDiscountAmount
  );

  // Product actions
  const handleAddProductFromDropdown = () => {
    if (!selectedProductDropdownId) return;
    const prod = products.find((p) => p.id === selectedProductDropdownId);
    if (!prod) return;

    sounds.playClick();
    const parsedQty = parseInt(productQtyToAdd, 10);
    const qty = isNaN(parsedQty) || parsedQty <= 0 ? 1 : parsedQty;

    setSelectedProducts((prev) => {
      const existing = prev.find((p) => p.productId === prod.id);
      if (existing) {
        return prev.map((p) =>
          p.productId === prod.id
            ? { ...p, quantity: p.quantity + qty, total: (p.quantity + qty) * p.price }
            : p
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          name: prod.name,
          price: prod.price,
          quantity: qty,
          total: qty * prod.price,
        },
      ];
    });

    setSelectedProductDropdownId('');
    setProductQtyToAdd('');
  };

  const handleUpdateProductQty = (productId: string, delta: number) => {
    sounds.playClick();
    setSelectedProducts((prev) =>
      prev
        .map((p) => {
          if (p.productId === productId) {
            const newQty = p.quantity + delta;
            if (newQty <= 0) return null;
            return { ...p, quantity: newQty, total: newQty * p.price };
          }
          return p;
        })
        .filter(Boolean) as BillProductItem[]
    );
  };

  const handleRemoveProduct = (productId: string) => {
    sounds.playDelete();
    setSelectedProducts((prev) => prev.filter((p) => p.productId !== productId));
  };

  // Submit sale bill
  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();

    const cName = customerName.trim() || 'ลูกค้าทั่วไป (Walk-in)';
    const dateStr = saleDate;
    const timeStr = saleTime.trim() || liveDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    let finalCash = cashAmount;
    let finalTransfer = transferAmount;

    if (paymentMethod === 'cash') {
      finalCash = grossTotal;
      finalTransfer = 0;
    } else if (paymentMethod === 'transfer') {
      finalCash = 0;
      finalTransfer = grossTotal;
    }

    let finalTimestamp = Date.now();
    try {
      const cleanTime = timeStr.replace('.', ':');
      const timeParts = cleanTime.split(':');
      const padH = String(parseInt(timeParts[0] || '0', 10)).padStart(2, '0');
      const padM = String(parseInt(timeParts[1] || '0', 10)).padStart(2, '0');
      const parsed = new Date(`${dateStr}T${padH}:${padM}:00`).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        finalTimestamp = parsed;
      }
    } catch {}

    const savedBill = addSaleBill({
      timestamp: finalTimestamp,
      dateStr,
      timeStr,
      barberId: selectedBarberId,
      barberName: currentBarber?.nickname || 'ช่างประจำร้าน',
      customerName: cName,
      headCount: numHaircut > 0 ? Math.max(1, headCount) : 0,
      haircutFee: numHaircut,
      chemicalFee: numChemical,
      tipFee: numTip,
      products: selectedProducts,
      totalProductsFee,
      hasHaircutDiscount10: hasHaircutPromo10 && numHaircut > 0,
      haircutDiscountAmount: hasHaircutPromo10 ? haircutDiscountAmount : 0,
      voucherCode: effectiveVoucherAmount > 0 ? `Voucher ${settings.currencySymbol}${effectiveVoucherAmount}` : undefined,
      voucherDiscountAmount: effectiveVoucherAmount > 0 ? effectiveVoucherAmount : 0,
      totalDiscountAmount,
      subtotalBeforeDiscount,
      grossTotal,
      paymentMethod,
      cashAmount: finalCash,
      transferAmount: finalTransfer,
      commission: commissionPreview,
      notes: notes.trim() || undefined,
      queueId: activeQueueId,
    });

    // Reset Form
    setCustomerName('');
    setHaircutFee('');
    setHeadCount(1);
    setChemicalFee('');
    setTipFee('');
    setSelectedProductDropdownId('');
    setProductQtyToAdd('');
    setSelectedProducts([]);
    setHasHaircutPromo10(false);
    setSelectedPresetVoucher(null);
    setNotes('');
    setActiveQueueId(undefined);
    clearPendingQueueToPos();
    setPaymentMethod('transfer');
    setCashAmount(0);
    setTransferAmount(0);
    setCashInputStr('');
    setTransferInputStr('');
  };

  // Style helpers
  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';
  const borderSubtle = isDark ? 'border-zinc-800' : 'border-slate-200';
  const cardBg = isDark ? 'bg-zinc-900/90' : 'bg-white';
  const inputBg = isDark
    ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus-within:border-amber-500'
    : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-slate-800 focus-within:bg-white';

  const todayStr = getTodayDateStr();
  const isToday = saleDate === todayStr;
  const diffDays = getDayDifference(saleDate, todayStr);
  const isPast = diffDays < 0;

  return (
    <div className="max-w-6xl mx-auto px-2.5 sm:px-4 py-3 sm:py-5 animate-fadeIn">
      {/* Linked Queue Notification */}
      {pendingQueueToPos && (
        <div
          className={`mb-3.5 p-3 sm:p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center text-lg shrink-0 font-bold">
              💈
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                กำลังเปิดบิลจากคิว: {pendingQueueToPos.queueNumber}
              </p>
              <p className={`text-xs sm:text-sm font-semibold truncate ${headingText}`}>
                คุณ {pendingQueueToPos.customerName} ({pendingQueueToPos.serviceType || 'บริการตัดผม'})
                {pendingQueueToPos.startTime && (
                  <span className="ml-1.5 font-mono text-[11px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    {pendingQueueToPos.startTime.replace(':', '.')}{pendingQueueToPos.endTime ? ` - ${pendingQueueToPos.endTime.replace(':', '.')}` : ''} น.
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearPendingQueueToPos}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors btn-tactile shrink-0 ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
            }`}
          >
            ยกเลิก
          </button>
        </div>
      )}

      {/* POS FORM: Compact 2-Column Responsive Layout */}
      <form onSubmit={handleSubmitSale}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start">
          
          {/* LEFT COLUMN: Service & Bill Items (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-3.5">
            
            {/* 1. BARBER & CUSTOMER (Unified & Compact) */}
            <div className={`${cardBg} rounded-2xl p-3.5 sm:p-4 border ${borderSubtle} shadow-sm transition-all space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-amber-500" />
                  <label className={`text-xs sm:text-sm font-bold ${headingText}`}>
                    เลือกช่างผู้ให้บริการ <span className="text-rose-500">*</span>
                  </label>
                </div>
                <span className={`text-xs ${mutedText}`}>
                  ช่าง: <strong className={isDark ? 'text-amber-400' : 'text-slate-900'}>{currentBarber?.nickname || 'ยังไม่เลือก'}</strong>
                </span>
              </div>

              {barbers.length === 0 ? (
                <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <p className="text-xs font-semibold">ยังไม่มีรายชื่อช่างในระบบ</p>
                  <p className="text-[11px] mt-0.5">สามารถไปเพิ่มรายชื่อช่างได้ที่เมนู <strong>"ตั้งค่าร้าน"</strong></p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {barbers.map((barber) => {
                    const isSelected = selectedBarberId === barber.id;
                    return (
                      <button
                        type="button"
                        key={barber.id}
                        onClick={() => {
                          sounds.playClick();
                          setSelectedBarberId(barber.id);
                        }}
                        className={`relative flex items-center justify-between px-2.5 py-2 rounded-xl border text-left transition-all btn-tactile ${
                          isSelected
                            ? isDark
                              ? 'border-amber-500 bg-amber-500/15 shadow-xs shadow-amber-500/10'
                              : 'border-slate-900 bg-slate-900 text-white shadow-xs'
                            : isDark
                            ? 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/60 hover:border-zinc-700'
                            : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs sm:text-sm font-bold truncate ${isSelected && !isDark ? 'text-white' : headingText}`}>
                            {barber.avatar ? `${barber.avatar} ` : ''}{barber.nickname}
                          </p>
                        </div>
                        {isSelected && (
                          <div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ml-1 ${
                              !isDark && isSelected ? 'bg-amber-400 text-slate-900' : 'bg-amber-500 text-zinc-950'
                            }`}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Customer Name input inline in same card */}
              <div className="pt-2 border-t border-dashed border-zinc-800/60 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-1">
                  <label className={`text-xs font-bold ${headingText} flex items-center gap-1.5`}>
                    <User className="w-3.5 h-3.5 text-sky-500" />
                    <span>ชื่อลูกค้า / ผู้รับบริการ</span>
                  </label>
                  <span className={`text-[10px] ${mutedText}`}>
                    (เว้นว่างได้ = Walk-in)
                  </span>
                </div>
                <div className={`flex items-center rounded-xl border transition-all ${inputBg}`}>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="ระบุชื่อลูกค้า (หรือเว้นว่างเป็น Walk-in)"
                    className={`w-full px-3 py-1.5 bg-transparent text-xs sm:text-sm ${headingText} focus:outline-none`}
                  />
                  {customerName && (
                    <button
                      type="button"
                      onClick={() => setCustomerName('')}
                      className="px-2.5 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      ล้าง
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. FEES (HAIRCUT, CHEMICAL, TIP - 3 COMPACT COLUMNS) */}
            <div className={`${cardBg} rounded-2xl p-3.5 sm:p-4 border ${borderSubtle} shadow-sm space-y-2.5`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${mutedText} flex items-center gap-1.5`}>
                  <Receipt className="w-3.5 h-3.5 text-amber-500" />
                  <span>ค่าบริการ & ทิป</span>
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {/* Haircut Fee */}
                <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    <span className="flex items-center gap-1 truncate">
                      <Scissors className="w-3 h-3 shrink-0" />
                      <span className="truncate">ค่าตัดผม</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">฿</span>
                  </label>
                  <div className={`flex items-center rounded-lg border transition-all ${inputBg}`}>
                    <span className="pl-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">฿</span>
                    <input
                      type="number"
                      min="0"
                      value={haircutFee}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHaircutFee(val);
                        if (parseFloat(val) > 0 && headCount === 0) {
                          setHeadCount(1);
                        } else if (!val || parseFloat(val) === 0) {
                          setHeadCount(0);
                        }
                      }}
                      placeholder="0"
                      className="w-full px-2 py-1.5 bg-transparent font-mono font-bold text-sm sm:text-base text-emerald-600 dark:text-emerald-400 focus:outline-none"
                    />
                  </div>

                  {/* Head count control */}
                  {numHaircut > 0 && (
                    <div className="mt-1.5 pt-1 border-t border-dashed border-zinc-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400 font-medium">จำนวน:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((cnt) => (
                          <button
                            type="button"
                            key={cnt}
                            onClick={() => {
                              sounds.playClick();
                              setHeadCount(cnt);
                            }}
                            className={`px-1.5 py-0.5 rounded font-mono font-bold transition-all ${
                              headCount === cnt
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : isDark
                                ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                                : 'bg-slate-200 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {cnt}หัว
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chemical Fee */}
                <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400 mb-1">
                    <span className="flex items-center gap-1 truncate">
                      <FlaskConical className="w-3 h-3 shrink-0" />
                      <span className="truncate">ค่าเคมี/ดัด</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">฿</span>
                  </label>
                  <div className={`flex items-center rounded-lg border transition-all ${inputBg}`}>
                    <span className="pl-2 text-xs font-bold text-sky-600 dark:text-sky-400">฿</span>
                    <input
                      type="number"
                      min="0"
                      value={chemicalFee}
                      onChange={(e) => setChemicalFee(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 bg-transparent font-mono font-bold text-sm sm:text-base text-sky-600 dark:text-sky-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tip Fee */}
                <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">
                    <span className="flex items-center gap-1 truncate">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span className="truncate">ทิปช่าง</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">฿</span>
                  </label>
                  <div className={`flex items-center rounded-lg border transition-all ${inputBg}`}>
                    <span className="pl-2 text-xs font-bold text-amber-600 dark:text-amber-400">฿</span>
                    <input
                      type="number"
                      min="0"
                      value={tipFee}
                      onChange={(e) => setTipFee(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 bg-transparent font-mono font-bold text-sm sm:text-base text-amber-600 dark:text-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. PRODUCTS IN SHOP */}
            <div className={`${cardBg} rounded-2xl p-3.5 sm:p-4 border ${borderSubtle} shadow-sm space-y-2.5`}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>สินค้าภายในร้าน (ถ้ามี)</span>
                </label>
                {selectedProducts.length > 0 && (
                  <span className="text-[11px] font-mono font-bold text-indigo-500">
                    {selectedProducts.length} รายการ (฿{totalProductsFee.toLocaleString()})
                  </span>
                )}
              </div>

              {/* Product selector row - compact */}
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <select
                    value={selectedProductDropdownId}
                    onChange={(e) => setSelectedProductDropdownId(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-indigo-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                    }`}
                  >
                    <option value="">-- เลือกรายการสินค้า --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {settings.currencySymbol}{p.price.toLocaleString()} (เหลือ {p.stock})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qty and Add Button */}
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={productQtyToAdd}
                  onChange={(e) => setProductQtyToAdd(e.target.value)}
                  className={`w-14 px-2 py-1.5 rounded-xl text-center font-mono font-bold text-xs border focus:outline-none shrink-0 ${
                    isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-slate-800'
                  }`}
                />
                <button
                  type="button"
                  disabled={!selectedProductDropdownId}
                  onClick={handleAddProductFromDropdown}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all btn-tactile flex items-center gap-1 shrink-0 ${
                    selectedProductDropdownId
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                      : 'bg-zinc-700/40 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>เพิ่ม</span>
                </button>
              </div>

              {/* Selected Products List */}
              {selectedProducts.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {selectedProducts.map((item) => (
                    <div
                      key={item.productId}
                      className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border ${
                        isDark ? 'bg-zinc-950/70 border-zinc-800 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <span className="font-medium truncate max-w-[150px] sm:max-w-none">{item.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className={`flex items-center gap-0.5 rounded-md p-0.5 border ${
                          isDark ? 'border-zinc-700 bg-zinc-800' : 'border-slate-200 bg-white'
                        }`}>
                          <button
                            type="button"
                            onClick={() => handleUpdateProductQty(item.productId, -1)}
                            className="p-0.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold px-1 text-[11px]">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateProductQty(item.productId, 1)}
                            className="p-0.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 w-14 text-right">
                          ฿{item.total.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(item.productId)}
                          className="p-0.5 text-zinc-400 hover:text-rose-500"
                          title="ลบสินค้า"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. PROMOTIONS & VOUCHERS (COMPACT) */}
            <div className={`${cardBg} rounded-2xl p-3.5 sm:p-4 border ${borderSubtle} shadow-sm space-y-2.5`}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                  <Tag className="w-3.5 h-3.5" />
                  <span>โปรโมชั่น & บัตรของขวัญ</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  🛡️ ร้านออกส่วนลด • ช่างได้ส่วนแบ่งเต็ม
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Promo 10% Haircut */}
                <div
                  onClick={() => {
                    sounds.playClick();
                    setHasHaircutPromo10(!hasHaircutPromo10);
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between select-none ${
                    hasHaircutPromo10
                      ? isDark
                        ? 'border-emerald-500/60 bg-emerald-500/10 shadow-xs'
                        : 'border-emerald-500 bg-emerald-50 shadow-xs'
                      : isDark
                      ? 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                      : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={hasHaircutPromo10}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-emerald-600 accent-emerald-500 pointer-events-none"
                    />
                    <div>
                      <p className={`text-xs font-bold flex items-center gap-1 ${headingText}`}>
                        <Percent className="w-3 h-3 text-emerald-500" />
                        <span>ลด 10% ค่าตัดผม</span>
                      </p>
                      <p className={`text-[10px] ${mutedText}`}>ร้านรับผิดชอบส่วนลด</p>
                    </div>
                  </div>
                  {hasHaircutPromo10 && haircutDiscountAmount > 0 && (
                    <span className="text-xs font-mono font-bold text-emerald-500 dark:text-emerald-400 shrink-0">
                      -฿{haircutDiscountAmount.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Gift Voucher selection */}
                <div className={`p-2.5 rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-slate-200 bg-slate-50/60'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold flex items-center gap-1 ${headingText}`}>
                      <Gift className="w-3 h-3 text-indigo-500" />
                      <span>Gift Voucher</span>
                    </span>
                    {effectiveVoucherAmount > 0 && (
                      <span className="text-[11px] font-bold text-indigo-500 font-mono">
                        -฿{effectiveVoucherAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setSelectedPresetVoucher(null);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                        selectedPresetVoucher === null
                          ? isDark
                            ? 'bg-zinc-800 text-zinc-200 border border-zinc-600 font-bold'
                            : 'bg-slate-200 text-slate-900 border border-slate-300 font-bold'
                          : isDark
                          ? 'bg-zinc-950/60 text-zinc-500 border border-zinc-800'
                          : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >
                      ไม่ใช้
                    </button>
                    {voucherOptions.map((val) => {
                      const isSel = selectedPresetVoucher === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setSelectedPresetVoucher(isSel ? null : val);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all ${
                            isSel
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : isDark
                              ? 'bg-zinc-800/90 text-zinc-300 border border-zinc-700/70 hover:bg-zinc-700'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          ฿{val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Combined Discounts Summary pill if any discount */}
              {totalDiscountAmount > 0 && (
                <div className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                  isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                }`}>
                  <span className={headingText}>
                    ส่วนลดรวมที่ร้านออกให้: <strong className="text-amber-500 font-mono">-{settings.currencySymbol}{totalDiscountAmount.toLocaleString()}</strong>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    ช่างรับคอมฯ เต็ม ฿{commissionPreview.barberTotalEarned.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Payment, Date/Time, Notes & Checkout (5 cols on lg - Sticky) */}
          <div className="lg:col-span-5 space-y-3.5 lg:sticky lg:top-4">
            
            {/* 5. PAYMENT METHOD & SPLIT */}
            <div className={`${cardBg} rounded-2xl p-3.5 sm:p-4 border ${borderSubtle} shadow-sm space-y-3`}>
              <div className="flex items-center justify-between">
                <label className={`flex items-center gap-1.5 text-xs font-bold ${headingText}`}>
                  <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                  <span>ช่องทางการชำระเงิน <span className="text-rose-500">*</span></span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {([
                  { id: 'transfer', label: '📱 เงินโอน', desc: 'ธนาคาร/QR' },
                  { id: 'cash', label: '💵 เงินสด', desc: 'เงินสดในลิ้นชัก' },
                  { id: 'split', label: '🔀 สลับ', desc: 'สด + โอน' },
                ] as const).map((m) => {
                  const isSel = paymentMethod === m.id;
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => {
                        sounds.playClick();
                        setPaymentMethod(m.id);
                      }}
                      className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all btn-tactile flex flex-col items-center justify-center ${
                        isSel
                          ? isDark
                            ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold shadow-xs'
                            : 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs'
                          : isDark
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold">{m.label}</span>
                      <span className={`text-[10px] ${isSel ? (isDark ? 'text-zinc-900' : 'text-slate-300') : mutedText}`}>
                        {m.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Split Breakdown */}
              {paymentMethod === 'split' && (
                <div className={`p-2.5 rounded-xl border space-y-2 animate-fadeIn ${
                  isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${mutedText}`}>แบ่งชำระ 2 ช่องทาง:</span>
                    <span className="font-mono text-[11px] text-amber-500 font-bold">
                      ยอดรวม ฿{grossTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                        💵 รับสด (บาท)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={grossTotal}
                        placeholder="0"
                        value={cashInputStr}
                        onChange={(e) => handleCashInputChange(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-mono font-bold border focus:outline-none ${inputBg}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-sky-600 dark:text-sky-400 mb-0.5">
                        📱 รับโอน (บาท)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={grossTotal}
                        placeholder="0"
                        value={transferInputStr}
                        onChange={(e) => handleTransferInputChange(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-mono font-bold border focus:outline-none ${inputBg}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. DATE/TIME PICKER & NOTES */}
            <div className={`${cardBg} rounded-2xl p-3.5 sm:p-4 border ${borderSubtle} shadow-sm space-y-2.5`}>
              <RealtimeDatePicker
                value={saleDate}
                onChange={(newDate) => {
                  setSaleDate(newDate);
                  if (newDate === getTodayDateStr()) {
                    setIsLiveClock(true);
                  }
                }}
                label="วันที่และเวลาทำรายการ"
                isDark={isDark}
                showYesterday={true}
                showTime={true}
                timeValue={saleTime}
                onTimeChange={(newTime) => {
                  setSaleTime(newTime);
                  setIsLiveClock(false);
                }}
                subtitle="ขึ้นเป็นวันและเวลาปัจจุบันโดยอัตโนมัติ (แก้ไขเพื่อบันทึกย้อนหลังได้)"
              />

              {isPast && (
                <div
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                    isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-100/80 border-amber-300 text-amber-900'
                  }`}
                >
                  <span className="truncate">
                    ⏪ ย้อนหลัง: <strong>{formatThaiDateShort(saleDate)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setSaleDate(getTodayDateStr());
                      setIsLiveClock(true);
                    }}
                    className={`px-2 py-0.5 rounded-lg font-bold text-[11px] shrink-0 ${
                      isDark ? 'bg-amber-500 text-zinc-950' : 'bg-slate-900 text-white'
                    }`}
                  >
                    📍 วันนี้
                  </button>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className={`flex items-center gap-1.5 text-xs font-bold ${headingText} mb-1`}>
                  <FileText className="w-3 h-3 text-zinc-400" />
                  <span>หมายเหตุ (ถ้ามี)</span>
                </label>
                <div className={`flex items-center rounded-xl border transition-all ${inputBg}`}>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder=""
                    className={`w-full px-3 py-1.5 bg-transparent text-xs ${headingText} focus:outline-none`}
                  />
                </div>
              </div>
            </div>

            {/* 7. TOTAL & SUBMIT (CHECKOUT TERMINAL) */}
            <div className={`rounded-2xl p-4 sm:p-4.5 border shadow-lg transition-all ${
              isDark
                ? 'bg-zinc-900 border-amber-500/40 shadow-black/40'
                : 'bg-white border-slate-300 shadow-slate-200/80'
            }`}>
              <div className="space-y-2.5">
                {/* Total amount */}
                <div className="flex items-baseline justify-between">
                  <span className={`text-xs uppercase tracking-wider font-bold ${mutedText}`}>
                    ยอดสุทธิที่ต้องชำระ:
                  </span>
                  <div className="flex items-baseline gap-2">
                    {totalDiscountAmount > 0 && (
                      <span className={`text-xs font-mono line-through ${mutedText}`}>
                        ฿{subtotalBeforeDiscount.toLocaleString()}
                      </span>
                    )}
                    <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-500 dark:text-emerald-400 tracking-tight">
                      {settings.currencySymbol}{grossTotal.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Sub-breakdown items */}
                <div className={`text-[11px] ${mutedText} border-t pt-1.5 ${isDark ? 'border-zinc-800' : 'border-slate-100'} flex flex-wrap gap-x-2 gap-y-0.5`}>
                  <span>ตัดผม ฿{numHaircut.toLocaleString()}</span>
                  {numChemical > 0 && <span>• เคมี ฿{numChemical.toLocaleString()}</span>}
                  {totalProductsFee > 0 && <span>• สินค้า ฿{totalProductsFee.toLocaleString()}</span>}
                  {numTip > 0 && <span className="text-amber-500 font-bold">• ทิป ฿{numTip.toLocaleString()}</span>}
                </div>

                {/* Haircut head count badge */}
                {numHaircut > 0 && (
                  <div className="pt-0.5">
                    <div className="flex items-center justify-between text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Scissors className="w-3 h-3" />
                        <span>บริการตัดผม</span>
                      </span>
                      <span className="font-mono font-bold">{Math.max(1, headCount)} หัว</span>
                    </div>
                  </div>
                )}

                {/* Commission Transparency Box */}
                <div className={`text-[11px] font-medium p-2 rounded-xl border flex items-center justify-between gap-2 ${
                  isDark ? 'bg-zinc-950/70 border-zinc-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className={mutedText}>ช่าง {currentBarber?.nickname}: </span>
                    <strong className="text-emerald-500 dark:text-emerald-400 font-mono font-bold">฿{commissionPreview.barberTotalEarned.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className={mutedText}>ร้านสุทธิ: </span>
                    <strong className="text-amber-500 font-mono font-bold">฿{commissionPreview.shopNetEarned.toLocaleString()}</strong>
                  </div>
                </div>

                {/* Big Submit Button */}
                <button
                  type="submit"
                  disabled={grossTotal <= 0}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 btn-tactile ${
                    grossTotal > 0
                      ? isDark
                        ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/25'
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                  }`}
                >
                  <Receipt className="w-4 h-4 stroke-[2.2]" />
                  <span>บันทึกยอดขาย {grossTotal > 0 ? `(${settings.currencySymbol}${grossTotal.toLocaleString()})` : ''}</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </form>
    </div>
  );
};
