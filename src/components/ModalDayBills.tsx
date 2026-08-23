import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SaleBill, PaymentMethod } from '../types';
import {
  X,
  Receipt,
  Search,
  ArrowRightLeft,
  Eye,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  CreditCard,
  Banknote,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { sounds } from '../utils/sound';

interface ModalDayBillsProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  onSwitchToDailyView: (dateStr: string) => void;
}

export const ModalDayBills: React.FC<ModalDayBillsProps> = ({
  isOpen,
  onClose,
  dateStr,
  onSwitchToDailyView,
}) => {
  const {
    bills,
    expenses,
    settings,
    theme,
    updateSaleBill,
    deleteSaleBill,
    deleteExpense,
    openReceiptModal,
    openEditBillModal,
    openConfirm,
    showToast,
  } = useApp();

  const isDark = theme.isDark ?? true;
  const [activeSubTab, setActiveSubTab] = useState<'bills' | 'expenses'>('bills');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const dayBills = bills.filter((b) => b.dateStr === dateStr);
  const dayExpenses = expenses.filter((e) => e.dateStr === dateStr);

  const filteredBills = dayBills.filter((b) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      b.billNumber.toLowerCase().includes(query) ||
      b.customerName.toLowerCase().includes(query) ||
      b.customerPhone?.toLowerCase().includes(query) ||
      b.barberName.toLowerCase().includes(query) ||
      b.notes?.toLowerCase().includes(query)
    );
  });

  const filteredExpenses = dayExpenses.filter((e) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(query) ||
      e.category.toLowerCase().includes(query) ||
      e.recipient?.toLowerCase().includes(query) ||
      e.notes?.toLowerCase().includes(query)
    );
  });

  const totalGross = dayBills.reduce((s, b) => s + b.grossTotal, 0);
  const totalTransfer = dayBills.reduce((s, b) => s + b.transferAmount, 0);
  const totalCash = dayBills.reduce((s, b) => s + b.cashAmount, 0);
  const totalBarberPayout = dayBills.reduce((s, b) => s + b.commission.barberTotalEarned, 0);
  const totalShopCommission = dayBills.reduce((s, b) => s + b.commission.shopNetEarned, 0);
  const totalDayExpenses = dayExpenses.reduce((s, e) => s + e.amount, 0);
  const totalFinalShopNet = totalShopCommission - totalDayExpenses;

  // Quick switch payment method
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

  // Delete bill
  const handleDeleteBill = (bill: SaleBill) => {
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

  const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className={`rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-4 border ${
        isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                รายการบิลย้อนหลัง {formattedDate}
              </h3>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                วันที่ {dateStr} • ทั้งหมด {dayBills.length} บิล
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playClick();
                onSwitchToDailyView(dateStr);
                onClose();
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all btn-tactile ${
                isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
              <span>เปิดแดชบอร์ดวันนี้</span>
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors ${
                isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Day Summary Cards */}
        <div className="p-6 border-b border-zinc-800/40 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/40">
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] text-zinc-400 block font-medium">รายรับรวม (Gross)</span>
            <span className="text-base sm:text-lg font-black font-mono text-amber-500">
              {settings.currencySymbol}{totalGross.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-500 block">ทั้งหมด {dayBills.length} บิล</span>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] text-zinc-400 block font-medium">ยอดเงินโอน / สด</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-sky-400 block">
              โอน: {settings.currencySymbol}{totalTransfer.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400 block">
              สด: {settings.currencySymbol}{totalCash.toLocaleString()}
            </span>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] text-zinc-400 block font-medium">จ่ายช่าง + รายจ่ายร้าน</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-rose-400 block">
              ช่าง: {settings.currencySymbol}{totalBarberPayout.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-pink-400 block">
              ร้าน: {settings.currencySymbol}{totalDayExpenses.toLocaleString()} ({dayExpenses.length} รายการ)
            </span>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] text-zinc-400 block font-medium">กำไรสุทธิร้าน (Net Profit)</span>
            <span className={`text-base sm:text-lg font-black font-mono ${totalFinalShopNet < 0 ? 'text-rose-500' : 'text-purple-400'}`}>
              {settings.currencySymbol}{totalFinalShopNet.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-500 block">
              (ส่วนแบ่งร้าน {settings.currencySymbol}{totalShopCommission.toLocaleString()} - รายจ่าย {settings.currencySymbol}{totalDayExpenses.toLocaleString()})
            </span>
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="px-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/60 border border-zinc-800 self-start">
            <button
              type="button"
              onClick={() => setActiveSubTab('bills')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'bills'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              📋 บิลขายประจำวัน ({dayBills.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('expenses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'expenses'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              💸 รายจ่ายร้านค้า ({dayExpenses.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder={activeSubTab === 'bills' ? 'ค้นหาบิล (ลูกค้า, เลขบิล, ช่าง)...' : 'ค้นหารายจ่าย (ชื่อ, หมวด)...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-200 focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-800'
              }`}
            />
          </div>
        </div>

        {/* Content Body: Bills Table or Expenses Table */}
        <div className="p-6 max-h-[55vh] overflow-y-auto">
          {activeSubTab === 'bills' ? (
            filteredBills.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-sm">
                {dayBills.length === 0 ? 'ไม่มีรายการบิลที่บันทึกในวันนี้' : 'ไม่พบข้อมูลที่ตรงกับการค้นหา'}
              </div>
            ) : (
              <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                <table className="w-full text-left text-xs">
                  <thead className={`border-b font-semibold ${isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    <tr>
                      <th className="py-2.5 px-3">เลขที่บิล / เวลา</th>
                      <th className="py-2.5 px-3">ลูกค้า</th>
                      <th className="py-2.5 px-3">ช่าง</th>
                      <th className="py-2.5 px-3 text-right">ตัดผม</th>
                      <th className="py-2.5 px-3 text-right">เคมี</th>
                      <th className="py-2.5 px-3 text-right">สินค้า</th>
                      <th className="py-2.5 px-3 text-right">ทิป</th>
                      <th className="py-2.5 px-3 text-right font-bold text-amber-500">ยอดรวม</th>
                      <th className="py-2.5 px-3 text-center">วิธีชำระ (สลับได้)</th>
                      <th className="py-2.5 px-3 text-right text-emerald-500">จ่ายช่าง</th>
                      <th className="py-2.5 px-3 text-right text-purple-400">ร้านสุทธิ</th>
                      <th className="py-2.5 px-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-200/80'}`}>
                    {filteredBills.map((bill) => (
                      <tr key={bill.id} className={isDark ? 'hover:bg-zinc-800/40 text-zinc-300' : 'hover:bg-slate-50 text-slate-800'}>
                        <td className="py-2.5 px-3 font-mono">
                          <span className="font-bold text-amber-500 block">{bill.billNumber}</span>
                          <span className="text-[10px] text-zinc-500">{bill.timeStr} น.</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          <div>{bill.customerName}</div>
                          {bill.mergedGroupId && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                              🔗 {bill.mergedGroupName || `${bill.mergedBillCount || 3} รายการนี้ รวมกัน`}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">{bill.barberName}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{bill.haircutFee > 0 ? `${settings.currencySymbol}${bill.haircutFee.toLocaleString()}` : '-'}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{bill.chemicalFee > 0 ? `${settings.currencySymbol}${bill.chemicalFee.toLocaleString()}` : '-'}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{bill.totalProductsFee > 0 ? `${settings.currencySymbol}${bill.totalProductsFee.toLocaleString()}` : '-'}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-500">{bill.tipFee > 0 ? `${settings.currencySymbol}${bill.tipFee.toLocaleString()}` : '-'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-500 text-sm">
                          {settings.currencySymbol}{bill.grossTotal.toLocaleString()}
                        </td>
                        {/* Payment switch */}
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
                                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                                  : 'text-zinc-400 hover:text-amber-400'
                              }`}
                            >
                              🔀
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-500 font-semibold">
                          {settings.currencySymbol}{bill.commission.barberTotalEarned.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-purple-400 font-semibold">
                          {settings.currencySymbol}{bill.commission.shopNetEarned.toLocaleString()}
                        </td>
                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                openReceiptModal(bill);
                              }}
                              className="p-1 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800"
                              title="ดูใบเสร็จ"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                openEditBillModal(bill);
                              }}
                              className="p-1 rounded text-zinc-400 hover:text-sky-400 hover:bg-zinc-800"
                              title="แก้ไขบิล"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBill(bill)}
                              className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-zinc-800"
                              title="ลบบิล"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* EXPENSES SUB-TAB */
            filteredExpenses.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-sm">
                {dayExpenses.length === 0 ? 'ไม่มีรายการรายจ่ายที่บันทึกในวันนี้' : 'ไม่พบรายจ่ายที่ตรงกับการค้นหา'}
              </div>
            ) : (
              <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                <table className="w-full text-left text-xs">
                  <thead className={`border-b font-semibold ${isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    <tr>
                      <th className="py-2.5 px-3">เวลา</th>
                      <th className="py-2.5 px-3">รายการรายจ่าย</th>
                      <th className="py-2.5 px-3">หมวดหมู่</th>
                      <th className="py-2.5 px-3">ผู้รับเงิน / ร้านค้า</th>
                      <th className="py-2.5 px-3 text-center">วิธีจ่าย</th>
                      <th className="py-2.5 px-3 text-right font-bold text-rose-500">จำนวนเงิน</th>
                      <th className="py-2.5 px-3">หมายเหตุ</th>
                      <th className="py-2.5 px-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-200/80'}`}>
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className={isDark ? 'hover:bg-zinc-800/40 text-zinc-300' : 'hover:bg-slate-50 text-slate-800'}>
                        <td className="py-2.5 px-3 font-mono text-zinc-400">{exp.timeStr || '-'} น.</td>
                        <td className="py-2.5 px-3 font-semibold">{exp.title}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-400">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400">{exp.recipient || '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-[10px] font-semibold">
                            {exp.paymentMethod === 'transfer' ? '📱 โอนเงิน' : '💵 เงินสด'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-500 text-sm">
                          {settings.currencySymbol}{exp.amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400 text-[11px]">{exp.notes || '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              openConfirm({
                                title: 'ลบรายการรายจ่ายนี้? 🗑️',
                                message: `ต้องการลบรายการรายจ่าย "${exp.title}" จำนวน ${settings.currencySymbol}${exp.amount.toLocaleString()} ใช่หรือไม่?`,
                                confirmText: 'ลบรายการ',
                                cancelText: 'ยกเลิก',
                                confirmColor: 'bg-rose-600 hover:bg-rose-500',
                                onConfirm: () => deleteExpense(exp.id),
                              });
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-zinc-800"
                            title="ลบรายจ่าย"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex justify-end ${
          isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl border text-xs font-semibold ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
