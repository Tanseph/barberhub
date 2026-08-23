import React, { useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, Printer, Share2, Scissors, Check } from 'lucide-react';

export const ModalReceipt: React.FC = () => {
  const { selectedBillForReceipt, closeReceiptModal, settings, showToast, theme } = useApp();
  const printRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);
  const isDark = theme.isDark ?? true;

  if (!selectedBillForReceipt) return null;

  const bill = selectedBillForReceipt;

  const handlePrint = () => {
    try {
      window.print();
    } catch {
      showToast('การพิมพ์สลิป', 'กรุณาแคปเจอร์หน้าจอหรือเปิดในหน้าต่างใหม่เพื่อสั่งพิมพ์', 'info');
    }
  };

  const handleCopySummary = () => {
    const text = `💈 ${settings.shopName} 💈
ใบเสร็จเลขที่: ${bill.billNumber}
วันที่: ${bill.dateStr} เวลา: ${bill.timeStr}
ช่าง: ${bill.barberName}
ลูกค้า: ${bill.customerName}
-------------------------
${bill.haircutFee > 0 ? `ค่าตัดผม: ${settings.currencySymbol}${bill.haircutFee.toLocaleString()}\n` : ''}${
      bill.chemicalFee > 0 ? `ค่าเคมี: ${settings.currencySymbol}${bill.chemicalFee.toLocaleString()}\n` : ''
    }${
      bill.products.length > 0
        ? `สินค้า:\n${bill.products.map((p) => ` - ${p.name} x${p.quantity}: ${settings.currencySymbol}${p.total.toLocaleString()}`).join('\n')}\n`
        : ''
    }${bill.tipFee > 0 ? `ทิป: ${settings.currencySymbol}${bill.tipFee.toLocaleString()}\n` : ''}-------------------------
ยอดรวมทั้งสิ้น: ${settings.currencySymbol}${bill.grossTotal.toLocaleString()}
ชำระโดย: ${
      bill.paymentMethod === 'transfer'
        ? 'เงินโอน 📱'
        : bill.paymentMethod === 'cash'
        ? 'เงินสด 💵'
        : `สลับ (สด ${settings.currencySymbol}${bill.cashAmount} / โอน ${settings.currencySymbol}${bill.transferAmount})`
    }${settings.receiptFooterMsg ? `\n-------------------------\n${settings.receiptFooterMsg}` : ''}`;

    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            showToast('คัดลอกใบเสร็จแล้ว', 'คัดลอกข้อความสรุปบิลไปยังคลิปบอร์ดเรียบร้อย 📋', 'success', '✨');
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => {
            fallbackCopyText(text);
          });
      } else {
        fallbackCopyText(text);
      }
    } catch {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (str: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = str;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      showToast('คัดลอกใบเสร็จแล้ว', 'คัดลอกข้อความสรุปบิลเรียบร้อย 📋', 'success', '✨');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('ข้อความสรุปบิล', textFallbackPreview(str), 'info');
    }
  };

  const textFallbackPreview = (str: string) => str.slice(0, 80) + '...';

  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const borderSubtle = isDark ? 'border-zinc-800' : 'border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className={`rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-6 border ${
        isDark ? 'bg-zinc-900 border-zinc-700/80' : 'bg-white border-slate-200'
      }`}>
        {/* Header bar */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className={`flex items-center gap-2 font-semibold text-sm ${headingText}`}>
            <Scissors className="w-4 h-4 text-amber-600" />
            <span>ใบเสร็จรับเงิน / สลิปดิจิทัล</span>
          </div>
          <button
            onClick={closeReceiptModal}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper Body */}
        <div className={`p-6 overflow-y-auto max-h-[70vh] ${
          isDark ? 'bg-zinc-900' : 'bg-slate-100'
        }`}>
          <div
            ref={printRef}
            className="bg-white text-slate-900 p-6 rounded-xl border border-slate-200 shadow-xs font-mono text-sm leading-relaxed"
          >
            {/* Shop Header */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-xl font-bold">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                ) : (
                  '💈'
                )}
              </div>
              <h2 className="font-bold text-base tracking-wider text-slate-900 uppercase">
                {settings.shopName}
              </h2>
              {settings.shopAddress && (
                <p className="text-xs text-slate-500 mt-1 max-w-[260px] mx-auto leading-normal">
                  {settings.shopAddress}
                </p>
              )}
              {settings.shopPhone && (
                <p className="text-xs text-slate-500 mt-0.5">โทร: {settings.shopPhone}</p>
              )}
            </div>

            {/* Bill Meta */}
            <div className="py-3 border-b border-dashed border-slate-300 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>เลขที่บิล:</span>
                <span className="font-bold text-slate-900">{bill.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>วันที่-เวลา:</span>
                <span>{bill.dateStr} | {bill.timeStr} น.</span>
              </div>
              <div className="flex justify-between">
                <span>ช่างผู้ให้บริการ:</span>
                <span className="font-semibold text-slate-900">{bill.barberName}</span>
              </div>
              <div className="flex justify-between">
                <span>คุณลูกค้า:</span>
                <span className="font-semibold text-slate-900">{bill.customerName}</span>
              </div>
              {bill.mergedGroupId && (
                <div className="flex justify-between text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                  <span>สถานะการรวมบิล:</span>
                  <span>{bill.mergedGroupName || `${bill.mergedBillCount || 3} รายการนี้ รวมกัน`}</span>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-700 pb-1 border-b border-slate-100">
                <span>รายการ</span>
                <span>จำนวนเงิน</span>
              </div>

              {bill.haircutFee > 0 && (
                <div className="flex justify-between">
                  <span>ค่าบริการตัดผม</span>
                  <span className="font-medium">{settings.currencySymbol}{bill.haircutFee.toLocaleString()}</span>
                </div>
              )}

              {bill.chemicalFee > 0 && (
                <div className="flex justify-between">
                  <span>ค่าบริการเคมี / ทรีทเม้นท์</span>
                  <span className="font-medium">{settings.currencySymbol}{bill.chemicalFee.toLocaleString()}</span>
                </div>
              )}

              {bill.products.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="pr-2">
                    {item.name} <span className="text-slate-500">x{item.quantity}</span>
                  </span>
                  <span className="font-medium shrink-0">{settings.currencySymbol}{item.total.toLocaleString()}</span>
                </div>
              ))}

              {bill.tipFee > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>ทิปพิเศษช่าง ⭐</span>
                  <span className="font-medium">{settings.currencySymbol}{bill.tipFee.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Total Section */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-xs">
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1">
                <span>ยอดรวมทั้งสิ้น</span>
                <span className="text-emerald-700">{settings.currencySymbol}{bill.grossTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-slate-600 pt-1">
                <span>การชำระเงิน:</span>
                <span className="font-medium text-slate-800">
                  {bill.paymentMethod === 'transfer' && '📱 โอนเงินผ่านบัญชี'}
                  {bill.paymentMethod === 'cash' && '💵 เงินสด'}
                  {bill.paymentMethod === 'split' && `🔀 สลับ (สด ${settings.currencySymbol}${bill.cashAmount} / โอน ${settings.currencySymbol}${bill.transferAmount})`}
                </span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-4 text-center text-xs text-slate-500 space-y-1">
              {settings.receiptFooterMsg && (
                <p className="font-medium text-slate-700">{settings.receiptFooterMsg}</p>
              )}
              <p className="text-[10px] text-slate-400 pt-1">POWERED BY BARBERPOS PRO SYSTEM</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`p-4 border-t flex items-center justify-between gap-3 ${
          isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={handleCopySummary}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors btn-tactile ${
              isDark ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-slate-500" />}
            <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกส่งไลน์'}</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition-all shadow-xs btn-tactile"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์สลิป</span>
          </button>
        </div>
      </div>
    </div>
  );
};
