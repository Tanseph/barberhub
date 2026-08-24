import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMethod } from '../types';
import { X, Save, Link2, Unlink } from 'lucide-react';
import { ModalMergeBills } from './ModalMergeBills';

export const ModalEditBill: React.FC = () => {
  const {
    editingBill,
    closeEditBillModal,
    updateSaleBill,
    unmergeSaleBills,
    bills,
    barbers,
    settings,
    theme,
  } = useApp();

  const isDark = theme.isDark ?? true;

  const [barberId, setBarberId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [haircutFee, setHaircutFee] = useState<number>(0);
  const [chemicalFee, setChemicalFee] = useState<number>(0);
  const [tipFee, setTipFee] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  useEffect(() => {
    if (editingBill) {
      setBarberId(editingBill.barberId);
      setCustomerName(editingBill.customerName);
      setCustomerPhone(editingBill.customerPhone || '');
      setHaircutFee(editingBill.haircutFee);
      setChemicalFee(editingBill.chemicalFee);
      setTipFee(editingBill.tipFee);
      setPaymentMethod(editingBill.paymentMethod);
      setCashAmount(editingBill.cashAmount);
      setTransferAmount(editingBill.transferAmount);
      setNotes(editingBill.notes || '');
    }
  }, [editingBill]);

  if (!editingBill) return null;

  // Check if this bill is merged
  const currentBillInStore = bills.find((b) => b.id === editingBill.id) || editingBill;
  const mergedSiblings = currentBillInStore.mergedGroupId
    ? bills.filter((b) => b.mergedGroupId === currentBillInStore.mergedGroupId)
    : [];

  const productTotal = editingBill.totalProductsFee;
  const currentGross = (Number(haircutFee) || 0) + (Number(chemicalFee) || 0) + productTotal + (Number(tipFee) || 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const selectedBarber = barbers.find((b) => b.id === barberId);
    let finalCash = cashAmount;
    let finalTransfer = transferAmount;

    if (paymentMethod === 'cash') {
      finalCash = currentGross;
      finalTransfer = 0;
    } else if (paymentMethod === 'transfer') {
      finalCash = 0;
      finalTransfer = currentGross;
    }

    updateSaleBill(editingBill.id, {
      barberId,
      barberName: selectedBarber?.nickname || selectedBarber?.name || editingBill.barberName,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      haircutFee: Number(haircutFee) || 0,
      chemicalFee: Number(chemicalFee) || 0,
      tipFee: Number(tipFee) || 0,
      grossTotal: currentGross,
      paymentMethod,
      cashAmount: finalCash,
      transferAmount: finalTransfer,
      notes: notes.trim(),
    });

    closeEditBillModal();
  };

  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';
  const borderSubtle = isDark ? 'border-zinc-800' : 'border-slate-200';
  const inputClass = isDark
    ? 'w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none'
    : 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:border-slate-800 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className={`rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-6 border ${
        isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${headingText}`}>
              <span>แก้ไขรายการบิล: {editingBill.billNumber}</span>
            </h3>
            <p className={`text-xs ${mutedText} mt-0.5`}>
              วันที่ {editingBill.dateStr} เวลา {editingBill.timeStr} น.
            </p>
          </div>
          <button
            onClick={closeEditBillModal}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Barber Selection */}
          <div>
            <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
              ช่างผู้ให้บริการ
            </label>
            <select
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className={inputClass}
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.avatar ? `${b.avatar} ` : ''}{b.nickname}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
                ชื่อลูกค้า <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="กรุณาระบุชื่อลูกค้า"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
                เบอร์โทรศัพท์
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="กรุณาระบุเบอร์โทรศัพท์ลูกค้า"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          {/* Services & Fees */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
                ค่าตัดผม ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                value={haircutFee}
                onChange={(e) => setHaircutFee(Number(e.target.value))}
                className={`${inputClass} font-semibold text-emerald-600`}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
                ค่าเคมี ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                value={chemicalFee}
                onChange={(e) => setChemicalFee(Number(e.target.value))}
                className={`${inputClass} font-semibold text-sky-600`}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
                ค่าทิป ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                value={tipFee}
                onChange={(e) => setTipFee(Number(e.target.value))}
                className={`${inputClass} font-semibold text-amber-600`}
              />
            </div>
          </div>

          {/* Products Summary */}
          {editingBill.products.length > 0 && (
            <div className={`p-3 rounded-xl text-xs space-y-1.5 border ${
              isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`font-semibold ${mutedText} block mb-1`}>
                สินค้าในบิลนี้ (รวม {settings.currencySymbol}{productTotal.toLocaleString()}):
              </span>
              {editingBill.products.map((p, i) => (
                <div key={i} className={`flex justify-between ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  <span>
                    • {p.name} x{p.quantity}
                  </span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{p.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
              ช่องทางการชำระเงิน
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['transfer', 'cash', 'split'] as PaymentMethod[]).map((method) => {
                const isSel = paymentMethod === method;
                return (
                  <button
                    type="button"
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all btn-tactile ${
                      isSel
                        ? isDark
                          ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                          : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : isDark
                        ? 'bg-zinc-950 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {method === 'transfer' && '📱 โอนเงิน'}
                    {method === 'cash' && '💵 เงินสด'}
                    {method === 'split' && '🔀 สลับ (สด+โอน)'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split Payment inputs */}
          {paymentMethod === 'split' && (
            <div className={`p-3.5 rounded-xl border space-y-3 ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`flex items-center justify-between text-xs ${mutedText}`}>
                <span>ระบุยอดแยก:</span>
                <span>
                  ยอดรวมต้องเท่ากับ{' '}
                  <strong className="text-amber-600 font-mono">
                    {settings.currencySymbol}{currentGross.toLocaleString()}
                  </strong>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mb-1`}>
                    ยอดเงินสด (💵)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={currentGross}
                    placeholder="0"
                    value={cashAmount === 0 ? '' : cashAmount}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                      setCashAmount(val);
                      setTransferAmount(Math.max(0, currentGross - val));
                    }}
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-medium text-sky-600 dark:text-sky-400 mb-1`}>
                    ยอดเงินโอน (📱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={currentGross}
                    placeholder="0"
                    value={transferAmount === 0 ? '' : transferAmount}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                      setTransferAmount(val);
                      setCashAmount(Math.max(0, currentGross - val));
                    }}
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Merged Bills Grouping Control */}
          <div className={`p-4 rounded-xl border space-y-2.5 ${
            currentBillInStore.mergedGroupId
              ? isDark
                ? 'bg-indigo-950/20 border-indigo-500/30'
                : 'bg-indigo-50/70 border-indigo-200'
              : isDark
              ? 'bg-zinc-950/60 border-zinc-800'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className={`w-4 h-4 ${currentBillInStore.mergedGroupId ? 'text-indigo-500' : mutedText}`} />
                <span className={`text-xs font-bold ${headingText}`}>
                  การรวมบิลชำระด้วยกัน (รวมหลายรายการ)
                </span>
              </div>

              {currentBillInStore.mergedGroupId ? (
                <button
                  type="button"
                  onClick={() => unmergeSaleBills(editingBill.id)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-400 p-1 rounded transition-colors"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>แยกบิลออก</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsMergeModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-xs transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>+ รวมบิลกับรายการอื่น</span>
                </button>
              )}
            </div>

            {currentBillInStore.mergedGroupId ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    🔗 {currentBillInStore.mergedGroupName || `${mergedSiblings.length} รายการนี้ รวมกัน`}
                  </span>
                  <span className={`text-[11px] ${mutedText}`}>
                    (รวมทั้งหมด {mergedSiblings.length} บิล • ยอดชำระรวม {settings.currencySymbol}
                    {mergedSiblings.reduce((s, b) => s + b.grossTotal, 0).toLocaleString()})
                  </span>
                </div>
                <div className={`text-[11px] ${mutedText} flex items-center gap-1.5 flex-wrap`}>
                  <span>รายการที่รวมอยู่ด้วยกัน:</span>
                  {mergedSiblings.map((sb) => (
                    <span key={sb.id} className="font-mono font-medium text-amber-500">
                      {sb.billNumber} ({sb.customerName} {sb.grossTotal}฿)
                    </span>
                  ))}
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsMergeModalOpen(true)}
                    className="text-xs text-indigo-400 hover:underline font-semibold"
                  >
                    ✏️ แก้ไข/เพิ่มลดรายการในกลุ่มรวมบิลนี้
                  </button>
                </div>
              </div>
            ) : (
              <p className={`text-[11px] ${mutedText}`}>
                ยังไม่ได้รวมบิลกับรายการอื่น สามารถกดปุ่มเพื่อรวมบิลกับรายการของลูกค้าท่านอื่นหรือคนในครอบครัวประจำวันนี้ได้
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
              หมายเหตุเพิ่มเติม
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น ทรงผม, รายละเอียดพิเศษ"
              className={inputClass}
            />
          </div>

          {/* Total Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className={`text-xs font-bold ${headingText}`}>ยอดรวมบิลใหม่</span>
            <span className="text-lg font-black text-amber-600 font-mono">
              {settings.currencySymbol}{currentGross.toLocaleString()}
            </span>
          </div>

          {/* Actions */}
          <div className={`flex items-center justify-end gap-3 pt-2 border-t ${borderSubtle}`}>
            <button
              type="button"
              onClick={closeEditBillModal}
              className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors btn-tactile ${
                isDark ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-xs transition-all btn-tactile"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการแก้ไข</span>
            </button>
          </div>
        </form>
      </div>

      {/* Merge Modal Sub-Dialog */}
      {isMergeModalOpen && (
        <ModalMergeBills
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          selectedDate={editingBill.dateStr}
          initialSelectedBillId={editingBill.id}
          initialGroupId={currentBillInStore.mergedGroupId}
        />
      )}
    </div>
  );
};
