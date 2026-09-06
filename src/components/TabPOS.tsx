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
      const parsed = new Date(`${dateStr}T${timeStr.replace('.', ':')}:00`).getTime();
      if (!isNaN(parsed)) {
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 animate-fadeIn">
      {/* Linked Queue Notification */}
      {pendingQueueToPos && (
        <div
          className={`mb-5 p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center text-xl shrink-0 font-bold">
              💈
            </div>
            <div>
              <p className="text-[11px] text-amber-600 font-bold uppercase tracking-wider">
                กำลังเปิดบิลจากคิว: {pendingQueueToPos.queueNumber}
              </p>
              <p className={`text-sm font-semibold ${headingText}`}>
                คุณ {pendingQueueToPos.customerName} ({pendingQueueToPos.serviceType || 'บริการตัดผม'})
                {pendingQueueToPos.startTime && (
                  <span className="ml-2 font-mono text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
                    เวลา {pendingQueueToPos.startTime.replace(':', '.')}{pendingQueueToPos.endTime ? ` - ${pendingQueueToPos.endTime.replace(':', '.')}` : ''} น.
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearPendingQueueToPos}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors btn-tactile ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
            }`}
          >
            ยกเลิกการเชื่อมคิว
          </button>
        </div>
      )}

      {/* POS FORM */}
      <form onSubmit={handleSubmitSale} className="space-y-5">
        {/* 1. BARBER SELECTOR */}
        <div className={`${cardBg} rounded-2xl p-5 border ${borderSubtle} shadow-sm transition-all`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-500" />
              <label className={`text-xs sm:text-sm font-bold ${headingText}`}>
                เลือกช่างผู้ให้บริการ <span className="text-rose-500">*</span>
              </label>
            </div>
            <span className={`text-xs ${mutedText}`}>
              ช่างที่เลือก: <strong className={isDark ? 'text-amber-400' : 'text-slate-900'}>{currentBarber?.nickname || 'ยังไม่ได้เลือก'}</strong>
            </span>
          </div>

          {barbers.length === 0 ? (
            <div className={`p-4 rounded-xl border text-center ${isDark ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <p className="text-xs font-semibold">ยังไม่มีรายชื่อช่างในระบบ</p>
              <p className="text-[11px] mt-1">สามารถไปเพิ่มรายชื่อช่างได้ที่เมนู <strong>"ตั้งค่าร้าน"</strong></p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                    className={`relative flex items-center justify-between p-3 rounded-xl border text-left transition-all btn-tactile ${
                      isSelected
                        ? isDark
                          ? 'border-amber-500 bg-amber-500/15 shadow-sm shadow-amber-500/10'
                          : 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : isDark
                        ? 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/60 hover:border-zinc-700'
                        : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold truncate ${isSelected && !isDark ? 'text-white' : headingText}`}>
                        {barber.avatar ? `${barber.avatar} ` : ''}{barber.nickname}
                      </p>
                    </div>
                    {isSelected && (
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
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
        </div>

        {/* 2. CUSTOMER INFO */}
        <div className={`${cardBg} rounded-2xl p-5 border ${borderSubtle} shadow-sm`}>
          <div>
            <label className={`flex items-center justify-between text-xs font-bold ${headingText} mb-1.5`}>
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-500" />
                <span>ชื่อลูกค้า / ผู้รับบริการ</span>
              </span>
              <span className={`text-[10px] font-normal ${mutedText}`}>
                (บันทึกแยกทีละท่าน สามารถไปกดรวมบิลชำระด้วยกันได้ที่หน้าสรุปยอดบิล)
              </span>
            </label>
            <div className={`flex items-center rounded-xl border transition-all ${inputBg}`}>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="กรุณาระบุชื่อลูกค้า"
                className={`w-full px-3.5 py-2.5 bg-transparent text-sm ${headingText} focus:outline-none`}
              />
              {customerName && (
                <button
                  type="button"
                  onClick={() => setCustomerName('')}
                  className="px-3 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. FEES CONTAINER (HAIRCUT, CHEMICAL, TIP) */}
        <div className={`${cardBg} rounded-2xl p-5 border ${borderSubtle} shadow-sm space-y-4`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
            ค่าบริการและทิป
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Haircut Fee */}
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
              <label className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>ค่าตัดผม</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">บาท</span>
              </label>
              <div className={`flex items-center rounded-xl border transition-all ${inputBg}`}>
                <input
                  type="number"
                  min="0"
                  value={haircutFee}
                  onChange={(e) => setHaircutFee(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Chemical Fee */}
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
              <label className="flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>ค่าบริการเคมี</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">บาท</span>
              </label>
              <div className={`flex items-center rounded-xl border transition-all ${inputBg}`}>
                <input
                  type="number"
                  min="0"
                  value={chemicalFee}
                  onChange={(e) => setChemicalFee(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent font-mono font-bold text-sm text-sky-600 dark:text-sky-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Tip Fee */}
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
              <label className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ทิป</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">บาท</span>
              </label>
              <div className={`flex items-center rounded-xl border transition-all ${inputBg}`}>
                <input
                  type="number"
                  min="0"
                  value={tipFee}
                  onChange={(e) => setTipFee(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent font-mono font-bold text-sm text-amber-600 dark:text-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. PRODUCTS IN SHOP */}
        <div className={`${cardBg} rounded-2xl p-5 border ${borderSubtle} shadow-sm space-y-3`}>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>สินค้าภายในร้าน (ถ้ามี)</span>
            </label>
            <span className="text-[10px] font-mono text-zinc-400">Products</span>
          </div>

          {/* Product selector row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1">
              <select
                value={selectedProductDropdownId}
                onChange={(e) => setSelectedProductDropdownId(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                }`}
              >
                <option value="">-- เลือกรายการสินค้าในร้าน --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {settings.currencySymbol}{p.price.toLocaleString()} (คงเหลือ {p.stock})
                  </option>
                ))}
              </select>
            </div>

            {/* Qty and Add Button */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className={`text-xs font-medium ${mutedText} shrink-0`}>จำนวน:</span>
              <input
                type="number"
                min="1"
                placeholder=""
                value={productQtyToAdd}
                onChange={(e) => setProductQtyToAdd(e.target.value)}
                className={`w-16 px-2.5 py-2 rounded-xl text-center font-mono font-bold text-xs sm:text-sm border focus:outline-none ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-slate-800'
                }`}
              />
              <button
                type="button"
                disabled={!selectedProductDropdownId}
                onClick={handleAddProductFromDropdown}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all btn-tactile flex items-center gap-1.5 shrink-0 ${
                  selectedProductDropdownId
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                    : 'bg-zinc-700/40 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มสินค้า</span>
              </button>
            </div>
          </div>

          {/* Selected Products List */}
          {selectedProducts.length > 0 && (
            <div className={`p-3.5 rounded-xl border space-y-2.5 ${
              isDark ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between items-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <span>รายการสินค้าที่เลือก ({selectedProducts.length} รายการ):</span>
                <span className="font-mono">{settings.currencySymbol}{totalProductsFee.toLocaleString()}</span>
              </div>
              <div className="space-y-1.5">
                {selectedProducts.map((item) => (
                  <div
                    key={item.productId}
                    className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <span className="font-medium truncate max-w-[200px] sm:max-w-none">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1 rounded-md p-0.5 border ${
                        isDark ? 'border-zinc-700 bg-zinc-800' : 'border-slate-200 bg-slate-50'
                      }`}>
                        <button
                          type="button"
                          onClick={() => handleUpdateProductQty(item.productId, -1)}
                          className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold px-1.5">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateProductQty(item.productId, 1)}
                          className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 w-16 text-right">
                        {settings.currencySymbol}{item.total.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(item.productId)}
                        className="p-1 text-zinc-400 hover:text-rose-500"
                        title="ลบสินค้า"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. PROMOTIONS & GIFT VOUCHERS (SHOP ABSORBS DISCOUNT, BARBER RECEIVES FULL COMMISSION) */}
        <div className={`${cardBg} rounded-2xl p-5 border ${borderSubtle} shadow-sm space-y-4`}>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-amber-500">
              <Tag className="w-4 h-4 text-amber-500" />
              <span>โปรโมชั่นและบัตรของขวัญ (ทางร้านรับผิดชอบเอง • ช่างได้ส่วนแบ่งเต็ม)</span>
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              🛡️ ช่างได้ส่วนแบ่งเต็ม 100%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Haircut 10% Promotion Box */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                hasHaircutPromo10
                  ? isDark
                    ? 'border-emerald-500/60 bg-emerald-500/10 shadow-sm'
                    : 'border-emerald-500 bg-emerald-50/80 shadow-xs'
                  : isDark
                  ? 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasHaircutPromo10}
                  onChange={(e) => {
                    sounds.playClick();
                    setHasHaircutPromo10(e.target.checked);
                  }}
                  className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-400 cursor-pointer accent-emerald-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${headingText}`}>
                      <Percent className="w-3.5 h-3.5 text-emerald-500" />
                      <span>โปรโมชั่นลด 10% ค่าตัดผม</span>
                    </span>
                    {hasHaircutPromo10 && haircutDiscountAmount > 0 && (
                      <span className="text-xs font-mono font-bold text-emerald-500 dark:text-emerald-400">
                        -{settings.currencySymbol}{haircutDiscountAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] mt-1 ${mutedText}`}>
                    ลดเฉพาะค่าตัดผม 10% ให้ลูกค้า (ร้านออกให้ ช่างได้เต็ม)
                  </p>

                  {numHaircut > 0 ? (
                    <div className={`mt-2 pt-2 border-t text-[11px] space-y-1 ${
                      isDark ? 'border-zinc-800' : 'border-slate-200'
                    }`}>
                      <div className="flex justify-between">
                        <span className={mutedText}>ราคาตัดผมปกติ:</span>
                        <span className="font-mono">{settings.currencySymbol}{numHaircut.toLocaleString()}</span>
                      </div>
                      {hasHaircutPromo10 && (
                        <>
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                            <span>ส่วนลด 10% (ร้านรับผิดชอบ):</span>
                            <span className="font-mono">-{settings.currencySymbol}{haircutDiscountAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span className={headingText}>ลูกค้าจ่ายค่าตัดผมเพียง:</span>
                            <span className="font-mono text-emerald-500">
                              {settings.currencySymbol}{(numHaircut - haircutDiscountAmount).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 mt-1">
                            ✂️ ช่างยังได้รับค่าคอมมิชชั่นเต็มจากยอด {settings.currencySymbol}{numHaircut.toLocaleString()} ตามปกติ
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-400 mt-1.5 italic">
                      * ระบุราคาค่าตัดผมด้านบนเพื่อใช้งานโปรโมชั่น
                    </p>
                  )}
                </div>
              </label>
            </div>

            {/* 2. Gift Voucher Selection (ตั้งค่าจากในตั้งค่า มีแค่ให้เลือกกี่บาท หรือไม่ใช้) */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                effectiveVoucherAmount > 0
                  ? isDark
                    ? 'border-indigo-500/60 bg-indigo-500/10 shadow-sm'
                    : 'border-indigo-400 bg-indigo-50/80 shadow-xs'
                  : isDark
                  ? 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${headingText}`}>
                  <Gift className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Gift Voucher (บัตรของขวัญ / คูปองเงินสด)</span>
                </span>
                {effectiveVoucherAmount > 0 && (
                  <span className="text-[11px] font-bold text-indigo-500 font-mono">
                    ลด -{settings.currencySymbol}{effectiveVoucherAmount.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Selector buttons only: ไม่ใช้ or configured amounts */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Option: Do not use voucher */}
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setSelectedPresetVoucher(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all btn-tactile ${
                      selectedPresetVoucher === null
                        ? isDark
                          ? 'bg-zinc-800 text-zinc-200 border border-zinc-600 font-bold shadow-xs'
                          : 'bg-slate-200 text-slate-900 border border-slate-300 font-bold shadow-xs'
                        : isDark
                        ? 'bg-zinc-950/60 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                        : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-200'
                    }`}
                  >
                    ✕ ไม่ใช้ Voucher
                  </button>

                  {/* Configured preset amounts from Settings */}
                  {voucherOptions.map((val) => {
                    const isSelected = selectedPresetVoucher === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          if (isSelected) {
                            setSelectedPresetVoucher(null);
                          } else {
                            setSelectedPresetVoucher(val);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all btn-tactile ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/40'
                            : isDark
                            ? 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/70'
                            : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        {settings.currencySymbol}{val.toLocaleString()}
                      </button>
                    );
                  })}
                </div>

                {effectiveVoucherAmount > 0 ? (
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1.5 rounded-md border border-indigo-500/20 mt-1 flex items-center justify-between">
                    <span>🎁 ใช้ Gift Voucher ลด {settings.currencySymbol}{effectiveVoucherAmount.toLocaleString()} (ทางร้านรับผิดชอบเอง ช่างได้ส่วนแบ่งเต็ม)</span>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setSelectedPresetVoucher(null);
                      }}
                      className="text-rose-500 hover:underline font-semibold ml-2"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <p className={`text-[10px] ${mutedText} pt-0.5`}>
                    กดเลือกมูลค่า Voucher ที่ลูกค้าต้องการใช้ หรือกด 'ไม่ใช้ Voucher' (สามารถกำหนดมูลค่าได้ที่เมนู "ตั้งค่าร้าน")
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Combined Discounts Summary */}
          {totalDiscountAmount > 0 && (
            <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
              isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className={headingText}>
                  รวมส่วนลดที่ร้านออกให้: <strong className="text-amber-500 font-mono text-sm">-{settings.currencySymbol}{totalDiscountAmount.toLocaleString()}</strong>
                  <span className={`text-[11px] ${mutedText} ml-2`}>
                    (ตัดผม 10%: -{settings.currencySymbol}{haircutDiscountAmount} | Voucher: -{settings.currencySymbol}{effectiveVoucherAmount})
                  </span>
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                ✂️ ช่างรับคอมมิชชั่นเต็ม {settings.currencySymbol}{commissionPreview.barberTotalEarned.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* 6. NOTES (BLANK FIELD AS REQUESTED), DATE/TIME & PAYMENT METHOD */}
        <div className={`${cardBg} rounded-2xl p-5 border ${borderSubtle} shadow-sm space-y-5`}>
          {/* Notes: Empty blank field with no placeholder */}
          <div>
            <label className={`flex items-center gap-1.5 text-xs font-bold ${headingText} mb-1.5`}>
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>หมายเหตุ</span>
            </label>
            <div className={`flex items-center rounded-xl border transition-all ${inputBg}`}>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder=""
                className={`w-full px-3.5 py-2.5 bg-transparent text-sm ${headingText} focus:outline-none`}
              />
            </div>
          </div>

          {/* Date & Time Picker (Placed directly below Notes) */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isPast
                ? isDark
                  ? 'border-amber-500/50 bg-amber-500/5 shadow-md shadow-amber-500/5'
                  : 'border-amber-300 bg-amber-50/70 shadow-xs'
                : isDark
                ? 'border-zinc-800 bg-zinc-950/40'
                : 'border-slate-200 bg-slate-50/60'
            }`}
          >
            <RealtimeDatePicker
              value={saleDate}
              onChange={(newDate) => {
                setSaleDate(newDate);
                if (newDate === getTodayDateStr()) {
                  setIsLiveClock(true);
                }
              }}
              label="วันที่และเวลาทำรายการ / เปิดบิล"
              isDark={isDark}
              showYesterday={true}
              showTime={true}
              timeValue={saleTime}
              onTimeChange={(newTime) => {
                setSaleTime(newTime);
                setIsLiveClock(false);
              }}
              subtitle="ระบบขึ้นเป็นวันที่และเวลาปัจจุบันแบบ Real-time โดยอัตโนมัติ (สามารถเปลี่ยนเพื่อบันทึกย้อนหลังได้)"
            />

            {isPast && (
              <div
                className={`mt-3 p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn ${
                  isDark
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-amber-100/80 border-amber-300 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>
                    กำลังบันทึกยอดขายย้อนหลังสำหรับ <strong>{formatThaiDateWithWeekday(saleDate)}</strong> (ยอดจะถูกคำนวณและสรุปในวันที่นี้)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setSaleDate(getTodayDateStr());
                    setIsLiveClock(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs btn-tactile shrink-0 ${
                    isDark
                      ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-sm'
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                  }`}
                >
                  📍 กลับสู่วันนี้ (Real-time)
                </button>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`flex items-center gap-1.5 text-xs font-bold ${headingText}`}>
                <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                <span>ช่องทางการชำระเงิน <span className="text-rose-500">*</span></span>
              </label>
              <span className={`text-[11px] font-medium ${isPast ? 'text-amber-500 font-bold' : mutedText}`}>
                {isPast ? '⏪ ย้อนหลัง: ' : ''}วันที่ {formatThaiDateShort(saleDate)} เวลา {saleTime} น.
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {([
                { id: 'transfer', label: '📱 เงินโอน', icon: CreditCard, desc: 'โอนผ่านธนาคาร' },
                { id: 'cash', label: '💵 เงินสด', icon: Banknote, desc: 'รับเงินสด' },
                { id: 'split', label: '🔀 สลับ (สด+โอน)', icon: ArrowRightLeft, desc: 'แบ่งชำระ 2 ช่องทาง' },
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
                    className={`p-3 rounded-xl border text-center transition-all btn-tactile flex flex-col items-center justify-center gap-0.5 ${
                      isSel
                        ? isDark
                          ? 'bg-amber-500 text-zinc-950 border-amber-500 font-bold shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 text-white border-slate-900 font-bold shadow-sm'
                        : isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold">{m.label}</span>
                    <span className={`text-[10px] ${
                      isSel ? (isDark ? 'text-zinc-900' : 'text-slate-300') : mutedText
                    }`}>
                      {m.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Split Breakdown */}
            {paymentMethod === 'split' && (
              <div className={`mt-3 p-4 rounded-xl border space-y-3 animate-fadeIn ${
                isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${mutedText}`}>แบ่งชำระ 2 ช่องทาง:</span>
                  <span className="font-mono text-[11px] text-amber-500 font-bold">
                    รวมทั้งสิ้น {settings.currencySymbol}{grossTotal.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      💵 รับเงินสด (บาท)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={grossTotal}
                      placeholder="0"
                      value={cashInputStr}
                      onChange={(e) => handleCashInputChange(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-sm font-mono font-bold border focus:outline-none ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-sky-600 dark:text-sky-400 mb-1">
                      📱 รับเงินโอน (บาท)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={grossTotal}
                      placeholder="0"
                      value={transferInputStr}
                      onChange={(e) => handleTransferInputChange(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-sm font-mono font-bold border focus:outline-none ${inputBg}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 7. TOTAL & SUBMIT BAR */}
        <div className={`rounded-2xl p-5 border shadow-xl transition-all ${
          isDark
            ? 'bg-zinc-900 border-amber-500/40 shadow-black/60'
            : 'bg-white border-slate-300 shadow-slate-200/80'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left summary */}
            <div className="space-y-1 text-center sm:text-left w-full sm:w-auto">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className={`text-xs uppercase tracking-wider font-bold ${mutedText}`}>
                  ยอดสุทธิที่ลูกค้าชำระ:
                </span>
                {totalDiscountAmount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                    🏷️ ส่วนลดรวม {settings.currencySymbol}{totalDiscountAmount.toLocaleString()}
                  </span>
                )}
                {isPast && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                    ⏪ ย้อนหลัง ({formatThaiDateShort(saleDate)})
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-center sm:justify-start gap-2">
                <p className="text-3xl sm:text-4xl font-black font-mono text-emerald-500 dark:text-emerald-400 tracking-tight">
                  {settings.currencySymbol}{grossTotal.toLocaleString()}
                </p>
                {totalDiscountAmount > 0 && (
                  <span className={`text-sm font-mono line-through ${mutedText}`}>
                    {settings.currencySymbol}{subtotalBeforeDiscount.toLocaleString()}
                  </span>
                )}
              </div>
              <p className={`text-[11px] ${mutedText}`}>
                ตัดผม {settings.currencySymbol}{numHaircut.toLocaleString()}
                {haircutDiscountAmount > 0 && ` (ลด 10% เหลือ ${numHaircut - haircutDiscountAmount})`}
                {numChemical > 0 && ` | เคมี ${settings.currencySymbol}${numChemical.toLocaleString()}`}
                {totalProductsFee > 0 && ` | สินค้า ${settings.currencySymbol}${totalProductsFee.toLocaleString()}`}
                {effectiveVoucherAmount > 0 && ` | Voucher -${settings.currencySymbol}${effectiveVoucherAmount.toLocaleString()}`}
                {numTip > 0 && ` | ทิป ${settings.currencySymbol}${numTip.toLocaleString()}`}
              </p>
              {/* Commission Transparency Box */}
              <div className={`text-[11px] font-medium pt-0.5 flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 ${
                isDark ? 'text-zinc-300' : 'text-slate-700'
              }`}>
                <span>
                  ✂️ <strong>{currentBarber?.nickname || 'ช่าง'}:</strong> ได้รับ <strong className="text-emerald-500 dark:text-emerald-400 font-mono font-bold">{settings.currencySymbol}{commissionPreview.barberTotalEarned.toLocaleString()}</strong>
                  {commissionPreview.barberTipEarned > 0 && <span className="text-[10px] text-amber-500 ml-1">(รวมทิป ฿{commissionPreview.barberTipEarned.toLocaleString()})</span>}
                </span>
                <span className={mutedText}>•</span>
                <span>
                  🏢 <strong>ร้านสุทธิ:</strong> <strong className="font-mono font-bold text-amber-500">{settings.currencySymbol}{commissionPreview.shopNetEarned.toLocaleString()}</strong>
                  {totalDiscountAmount > 0 && <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-1">(ร้านออกส่วนลดให้)</span>}
                </span>
              </div>
              <p className={`text-[11px] font-medium flex items-center justify-center sm:justify-start gap-1.5 ${isPast ? 'text-amber-500 font-bold' : mutedText}`}>
                <span>📅 บันทึกเข้าวันที่:</span>
                <strong className={isPast ? 'text-amber-400 underline underline-offset-2' : headingText}>
                  {formatThaiDateWithWeekday(saleDate)}
                </strong>
                <span>เวลา {saleTime} น.</span>
              </p>
            </div>

            {/* Right button */}
            <button
              type="submit"
              disabled={grossTotal <= 0}
              className={`w-full sm:w-auto min-w-[200px] py-4 px-6 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 btn-tactile ${
                grossTotal > 0
                  ? isDark
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/25'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
              }`}
            >
              <Receipt className="w-5 h-5 stroke-[2.2]" />
              <span>บันทึกยอดขาย</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
