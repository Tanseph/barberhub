import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SaleBill } from '../types';
import { X, Link2, Unlink, Check, CheckSquare, Square, Users, Receipt, AlertCircle } from 'lucide-react';

interface ModalMergeBillsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  initialSelectedBillId?: string;
  initialGroupId?: string;
}

export const ModalMergeBills: React.FC<ModalMergeBillsProps> = ({
  isOpen,
  onClose,
  selectedDate,
  initialSelectedBillId,
  initialGroupId,
}) => {
  const { bills, mergeSaleBills, unmergeSaleBills, settings, theme } = useApp();
  const isDark = theme.isDark ?? true;

  // Bills of the selected date
  const dayBills = useMemo(() => {
    return bills.filter((b) => b.dateStr === selectedDate);
  }, [bills, selectedDate]);

  // Selected bill IDs to merge
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [customGroupName, setCustomGroupName] = useState<string>('');
  const [primaryBillId, setPrimaryBillId] = useState<string>('');

  // Initial load
  useEffect(() => {
    if (!isOpen) return;

    if (initialGroupId) {
      // Find all bills already in this group
      const groupBills = dayBills.filter((b) => b.mergedGroupId === initialGroupId);
      const ids = groupBills.map((b) => b.id);
      setSelectedBillIds(ids);
      const master = groupBills.find((b) => b.isMergeMaster) || groupBills[0];
      setPrimaryBillId(master?.id || ids[0] || '');
      setCustomGroupName(master?.mergedGroupName || `${ids.length} รายการนี้ รวมกัน`);
    } else if (initialSelectedBillId) {
      const initialBill = dayBills.find((b) => b.id === initialSelectedBillId);
      if (initialBill?.mergedGroupId) {
        // Already merged
        const groupBills = dayBills.filter((b) => b.mergedGroupId === initialBill.mergedGroupId);
        const ids = groupBills.map((b) => b.id);
        setSelectedBillIds(ids);
        const master = groupBills.find((b) => b.isMergeMaster) || groupBills[0];
        setPrimaryBillId(master?.id || ids[0] || '');
        setCustomGroupName(master?.mergedGroupName || `${ids.length} รายการนี้ รวมกัน`);
      } else {
        // Start fresh with this bill and others with matching customer name if any
        setSelectedBillIds([initialSelectedBillId]);
        setPrimaryBillId(initialSelectedBillId);
        setCustomGroupName(
          initialBill?.customerName
            ? `รวมชำระ (${initialBill.customerName})`
            : 'รายการนี้ รวมกัน'
        );
      }
    } else {
      setSelectedBillIds([]);
      setPrimaryBillId('');
      setCustomGroupName('');
    }
  }, [isOpen, initialGroupId, initialSelectedBillId, dayBills]);

  if (!isOpen) return null;

  const toggleSelectBill = (id: string) => {
    setSelectedBillIds((prev) => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter((bId) => bId !== id);
      } else {
        next = [...prev, id];
      }

      // Update default group name if user hasn't typed a custom one
      if (next.length > 0) {
        if (!primaryBillId || !next.includes(primaryBillId)) {
          setPrimaryBillId(next[0]);
        }
      }
      return next;
    });
  };

  const selectedBills = dayBills.filter((b) => selectedBillIds.includes(b.id));
  const combinedTotal = selectedBills.reduce((s, b) => s + b.grossTotal, 0);
  const isExistingGroup = Boolean(
    initialGroupId ||
      (initialSelectedBillId &&
        dayBills.find((b) => b.id === initialSelectedBillId)?.mergedGroupId)
  );

  const handleSaveMerge = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBillIds.length < 2) return;

    const label = customGroupName.trim() || `${selectedBillIds.length} รายการนี้ รวมกัน`;
    mergeSaleBills(selectedBillIds, label, primaryBillId || selectedBillIds[0]);
    onClose();
  };

  const handleUnmerge = () => {
    if (initialGroupId) {
      unmergeSaleBills(initialGroupId);
    } else if (initialSelectedBillId) {
      unmergeSaleBills(initialSelectedBillId);
    }
    onClose();
  };

  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';
  const borderSubtle = isDark ? 'border-zinc-800' : 'border-slate-200';
  const inputClass = isDark
    ? 'w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none'
    : 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:border-slate-800 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className={`rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-6 border animate-scaleUp ${
          isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${headingText}`}>
                {isExistingGroup ? 'แก้ไขการรวมบิล' : 'รวมบิลชำระด้วยกัน (หลายรายการ)'}
              </h3>
              <p className={`text-xs ${mutedText} mt-0.5`}>
                ประจำวันที่ {selectedDate} • เลือกรายการบิลที่ต้องการรวมเข้าด้วยกัน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveMerge} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Instruction */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
              isDark
                ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-300'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>ระบบรวมบิล:</strong> ยังคงแสดงทุกรายการบิลแยกกันในหน้าสรุปยอดบิลตามเดิม
              แต่จะมีป้ายกำกับข้อความระบุชัดเจนว่า <strong>"3 รายการนี้ รวมกัน"</strong> และแสดงยอดรวมชำระร่วมกัน
            </div>
          </div>

          {/* Group Name / Label */}
          <div>
            <label className={`block text-xs font-semibold ${headingText} mb-1.5`}>
              ข้อความกำกับการรวมบิล (คำที่ให้แสดงในตาราง)
            </label>
            <input
              type="text"
              value={customGroupName}
              onChange={(e) => setCustomGroupName(e.target.value)}
              placeholder={`เช่น "${selectedBillIds.length || 3} รายการนี้ รวมกัน" หรือ "รวมชำระ 3 ท่าน (คุณภัทรเดช)"`}
              className={inputClass}
            />
          </div>

          {/* Bill Selection List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-bold ${headingText}`}>
                เลือกรายการบิลในวันที่ {selectedDate} ({selectedBillIds.length}/{dayBills.length} บิล)
              </label>
              <span className="text-[11px] text-amber-500 font-semibold">
                * ต้องเลือกอย่างน้อย 2 รายการ
              </span>
            </div>

            <div
              className={`rounded-xl border divide-y overflow-hidden max-h-60 overflow-y-auto ${
                isDark
                  ? 'bg-zinc-950/60 border-zinc-800 divide-zinc-800/80'
                  : 'bg-slate-50 border-slate-200 divide-slate-200'
              }`}
            >
              {dayBills.length === 0 ? (
                <div className={`p-6 text-center text-xs ${mutedText}`}>
                  ไม่มีรายการบิลในวันที่เลือก
                </div>
              ) : (
                dayBills.map((bill) => {
                  const isSelected = selectedBillIds.includes(bill.id);
                  const isAlreadyOtherGroup =
                    bill.mergedGroupId &&
                    (!initialGroupId || bill.mergedGroupId !== initialGroupId);

                  return (
                    <div
                      key={bill.id}
                      onClick={() => toggleSelectBill(bill.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? isDark
                            ? 'bg-indigo-500/10 text-zinc-100'
                            : 'bg-indigo-50 text-slate-900'
                          : isDark
                          ? 'hover:bg-zinc-900/60 text-zinc-300'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-indigo-500">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 fill-indigo-500/20" />
                          ) : (
                            <Square className="w-4 h-4 opacity-50" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-amber-500 text-xs">
                              {bill.billNumber}
                            </span>
                            <span className="font-semibold text-xs">{bill.customerName}</span>
                            <span className={`text-[10px] ${mutedText}`}>({bill.barberName})</span>
                            {isAlreadyOtherGroup && !isSelected && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                                🔗 รวมกับกลุ่มอื่นอยู่
                              </span>
                            )}
                          </div>
                          <div className={`text-[11px] ${mutedText} mt-0.5 flex items-center gap-2`}>
                            <span>เวลา {bill.timeStr} น.</span>
                            {bill.haircutFee > 0 && <span>ตัดผม {bill.haircutFee}฿</span>}
                            {bill.chemicalFee > 0 && <span>เคมี {bill.chemicalFee}฿</span>}
                            {bill.totalProductsFee > 0 && <span>สินค้า {bill.totalProductsFee}฿</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-amber-500 text-sm">
                          {settings.currencySymbol}
                          {bill.grossTotal.toLocaleString()}
                        </div>
                        <span className={`text-[10px] ${mutedText}`}>
                          {bill.paymentMethod === 'transfer'
                            ? '📱 โอน'
                            : bill.paymentMethod === 'cash'
                            ? '💵 สด'
                            : '🔀 ผสม'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Combined Total Summary Card */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              selectedBillIds.length >= 2
                ? 'bg-amber-500/10 border-amber-500/30'
                : isDark
                ? 'bg-zinc-950 border-zinc-800'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <div>
              <span className={`text-xs font-bold ${headingText} block`}>
                ยอดรวมชำระร่วมกัน ({selectedBillIds.length} รายการ)
              </span>
              <span className={`text-[11px] ${mutedText}`}>
                {customGroupName || `${selectedBillIds.length} รายการนี้ รวมกัน`}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-amber-600 font-mono">
                {settings.currencySymbol}
                {combinedTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className={`flex items-center justify-between pt-3 border-t ${borderSubtle}`}>
            {isExistingGroup ? (
              <button
                type="button"
                onClick={handleUnmerge}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-semibold transition-colors"
              >
                <Unlink className="w-4 h-4" />
                <span>ยกเลิกการรวมบิล (แยกเป็นเดี่ยว)</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                  isDark
                    ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={selectedBillIds.length < 2}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  selectedBillIds.length >= 2
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>บันทึกการรวมบิล</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
