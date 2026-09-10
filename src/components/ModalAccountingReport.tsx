import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { SaleBill, Barber } from '../types';
import { X, Printer, Download, FileText, CheckCircle2, FileDown, Loader2 } from 'lucide-react';
import { sounds } from '../utils/sound';
import { exportReportToPDF } from '../utils/pdfExport';
import { getBillingCycleInfo, isDateInBillingCycle } from '../utils/billingCycle';

interface ModalAccountingReportProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode: 'daily' | 'monthly';
  selectedDate: string;
  selectedMonth: string;
  periodBills: SaleBill[];
  barberSummaries: Array<{
    barber: Barber;
    billCount: number;
    headsCut: number;
    haircutRevenue: number;
    chemicalRevenue: number;
    productRevenue: number;
    tipRevenue: number;
    gross: number;
    haircutEarned: number;
    chemicalEarned: number;
    productEarned: number;
    tipEarned: number;
    totalEarned: number;
    shopEarned: number;
  }>;
}

export const ModalAccountingReport: React.FC<ModalAccountingReportProps> = ({
  isOpen,
  onClose,
  viewMode,
  selectedDate,
  selectedMonth,
  periodBills,
  barberSummaries,
}) => {
  const { settings, theme, expenses, showToast } = useApp();
  const isDark = theme.isDark ?? true;
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const cutoffDay = settings.billingCycleCutoffDay ?? 0;
  const billingCycleInfo = getBillingCycleInfo(selectedMonth, cutoffDay);

  // Filtered shop expenses for this period
  const periodExpenses = expenses.filter((e) =>
    viewMode === 'daily'
      ? e.dateStr === selectedDate
      : isDateInBillingCycle(e.dateStr, selectedMonth, cutoffDay)
  );

  // Financial calculations
  const totalHaircutRev = periodBills.reduce((s, b) => s + b.haircutFee, 0);
  const totalChemRev = periodBills.reduce((s, b) => s + b.chemicalFee, 0);
  const totalProdRev = periodBills.reduce((s, b) => s + b.totalProductsFee, 0);
  const totalTipRev = periodBills.reduce((s, b) => s + b.tipFee, 0);
  const totalDiscounts = periodBills.reduce((s, b) => s + (b.totalDiscountAmount || 0), 0);
  const totalHaircutDiscount = periodBills.reduce((s, b) => s + (b.haircutDiscountAmount || 0), 0);
  const totalVoucherDiscount = periodBills.reduce((s, b) => s + (b.voucherDiscountAmount || 0), 0);

  // รายได้ของร้าน (ไม่รวมยอดทิปช่าง เพราะส่งมอบช่าง 100%)
  const totalShopGrossRevenue = totalHaircutRev + totalChemRev + totalProdRev;
  const totalShopNetRevenue = Math.max(0, totalShopGrossRevenue - totalDiscounts);
  const totalCustomerPayments = periodBills.reduce((s, b) => s + b.grossTotal, 0);
  const totalGross = totalShopNetRevenue;

  const totalHaircutComm = periodBills.reduce((s, b) => s + b.commission.barberHaircutEarned, 0);
  const totalChemComm = periodBills.reduce((s, b) => s + b.commission.barberChemicalEarned, 0);
  const totalProdComm = periodBills.reduce((s, b) => s + b.commission.barberProductEarned, 0);
  const totalTipPayout = periodBills.reduce((s, b) => s + b.commission.barberTipEarned, 0);
  const totalBarberPayout = periodBills.reduce((s, b) => s + b.commission.barberTotalEarned, 0);

  const shopGrossProfit = periodBills.reduce((s, b) => s + b.commission.shopNetEarned, 0);
  const totalShopExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const finalBottomLineProfit = shopGrossProfit - totalShopExpenses;
  const shopMarginPercent = totalShopNetRevenue > 0 ? ((finalBottomLineProfit / totalShopNetRevenue) * 100).toFixed(1) : '0';

  const totalCash = periodBills.reduce((s, b) => s + b.cashAmount, 0);
  const totalTransfer = periodBills.reduce((s, b) => s + b.transferAmount, 0);
  const totalHeads = periodBills.reduce((s, b) => s + (b.haircutFee > 0 ? (b.headCount && b.headCount > 0 ? b.headCount : 1) : 0), 0);
  const totalBills = periodBills.length;
  const transferBillCount = periodBills.filter((b) => b.paymentMethod === 'transfer' || (b.paymentMethod === 'split' && b.transferAmount > 0)).length;
  const cashBillCount = periodBills.filter((b) => b.paymentMethod === 'cash' || (b.paymentMethod === 'split' && b.cashAmount > 0)).length;

  const hasAddress = Boolean(settings.shopAddress && settings.shopAddress.trim() !== '' && !settings.shopAddress.includes('ทองหล่อ'));
  const hasPhone = Boolean(settings.shopPhone && settings.shopPhone.trim() !== '' && !settings.shopPhone.includes('02-888-9999'));
  const hasPromptPay = Boolean(settings.shopPromptPay && settings.shopPromptPay.trim() !== '' && settings.shopPromptPay !== '0891234567');

  const cashExpenses = periodExpenses.filter((e) => e.paymentMethod === 'cash').reduce((s, e) => s + e.amount, 0);
  const transferExpenses = periodExpenses.filter((e) => e.paymentMethod === 'transfer').reduce((s, e) => s + e.amount, 0);
  const netCashInDrawer = totalCash - cashExpenses;

  const expensesByCategory = periodExpenses.reduce((acc, exp) => {
    const cat = exp.category || 'เบ็ดเตล็ด';
    if (!acc[cat]) {
      acc[cat] = { count: 0, total: 0 };
    }
    acc[cat].count += 1;
    acc[cat].total += exp.amount;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const expenseCategoryList = (Object.entries(expensesByCategory) as [string, { count: number; total: number }][]).sort((a, b) => b[1].total - a[1].total);

  const totalCustomerInflow = totalCash + totalTransfer;
  const transferInflowPct = totalCustomerInflow > 0 ? ((totalTransfer / totalCustomerInflow) * 100).toFixed(1) : '0';
  const cashInflowPct = totalCustomerInflow > 0 ? ((totalCash / totalCustomerInflow) * 100).toFixed(1) : '0';
  const haircutRevPct = totalShopGrossRevenue > 0 ? ((totalHaircutRev / totalShopGrossRevenue) * 100).toFixed(1) : '0';
  const chemRevPct = totalShopGrossRevenue > 0 ? ((totalChemRev / totalShopGrossRevenue) * 100).toFixed(1) : '0';
  const prodRevPct = totalShopGrossRevenue > 0 ? ((totalProdRev / totalShopGrossRevenue) * 100).toFixed(1) : '0';

  const avgTicket = totalBills > 0 ? Math.round(totalShopNetRevenue / totalBills) : 0;
  const avgHaircutPrice = totalHeads > 0 ? Math.round(totalHaircutRev / totalHeads) : 0;
  const avgBarberEarned = barberSummaries.length > 0 ? Math.round(totalBarberPayout / barberSummaries.length) : 0;

  const handlePrint = () => {
    sounds.playClick();
    window.print();
  };

  const handleDownloadPDF = async () => {
    sounds.playClick();
    try {
      setIsGeneratingPdf(true);
      showToast('กำลังจัดเตรียมไฟล์ PDF 📄', 'ระบบกำลังแปลงรายงานเป็นเอกสาร PDF ความละเอียดสูง...', 'info', '⏳');

      const success = await exportReportToPDF({
        settings,
        viewMode,
        selectedDate,
        selectedMonth,
        periodBills,
        periodExpenses,
        barberSummaries,
      });

      if (success) {
        showToast('ดาวน์โหลด PDF สำเร็จ 🎉', `บันทึกไฟล์รายงานเรียบร้อยแล้ว`, 'success', '📄');
      } else {
        showToast('กำลังเปิดหน้าต่างพิมพ์ 🖨️', 'กรุณากดพิมพ์และเลือก "Save as PDF" เพื่อบันทึกไฟล์', 'warning', '⚠️');
        window.print();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('กำลังเปิดหน้าต่างพิมพ์ 🖨️', 'กรุณากดพิมพ์และเลือก "Save as PDF"', 'warning', '⚠️');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportCSV = () => {
    sounds.playClick();

    if (viewMode === 'monthly') {
      const summaryRows = [
        ['รายงานสรุปบัญชีประจำงวด (Monthly Accounting Summary)'],
        [`รอบบิล: ${billingCycleInfo.monthOnlyLabel}`],
        [`ร้าน: ${settings.shopName}`],
        [`วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}`],
        [],
        ['1. สรุปรายรับจากการดำเนินงาน (Revenue Breakdown)'],
        ['หมวดหมู่', 'จำนวน', 'ยอดเงิน (บาท)', 'สัดส่วน (%)'],
        ['ค่าบริการตัดผม', `${totalHeads} หัว`, totalHaircutRev, `${haircutRevPct}%`],
        ['ค่าบริการเคมี / ทำสี', '-', totalChemRev, `${chemRevPct}%`],
        ['จำหน่ายสินค้า', '-', totalProdRev, `${prodRevPct}%`],
        ['รวมยอดขายก่อนหักส่วนลด', `${totalBills} บิล`, totalShopGrossRevenue, '100%'],
        ['หัก ส่วนลดที่ร้านออกให้', '-', -totalDiscounts, ''],
        ['รายได้ร้านสุทธิจากการดำเนินงาน', '-', totalShopNetRevenue, ''],
        ['* ทิปช่าง (ส่งมอบช่าง 100%)', '-', totalTipRev, 'เงินรับฝากส่งต่อช่าง'],
        [],
        ['2. สรุปช่องทางรับเงินและการกระทบยอดเงินสด (Inflow & Cash Reconciliation)'],
        ['ช่องทาง', 'จำนวนบิล', 'ยอดเงิน (บาท)', 'สัดส่วน (%)'],
        ['เงินโอนเข้าบัญชี', `${transferBillCount} บิล`, totalTransfer, `${transferInflowPct}%`],
        ['เงินสดรับเข้าลิ้นชัก', `${cashBillCount} บิล`, totalCash, `${cashInflowPct}%`],
        ['รวมยอดรับชำระทั้งหมด', `${totalBills} บิล`, totalCustomerInflow, '100%'],
        ['หัก รายจ่ายร้านที่จ่ายด้วยเงินสด', `${periodExpenses.filter((e) => e.paymentMethod === 'cash').length} รายการ`, -cashExpenses, ''],
        ['ยอดเงินสดคงเหลือสุทธิในลิ้นชัก', '-', netCashInDrawer, ''],
        [],
        ['3. สรุปส่วนแบ่งช่างรายบุคคล (Barber Commission Ledger)'],
        ['ชื่อช่าง', 'จำนวนหัว', 'ตัดผม', 'เคมี', 'สินค้า', 'ทิป (100%)', 'รวมเงินที่จ่ายช่าง'],
        ...barberSummaries.map((b) => [
          `"${b.barber.nickname}"`,
          b.headsCut,
          b.haircutEarned,
          b.chemicalEarned,
          b.productEarned,
          b.tipEarned,
          b.totalEarned,
        ]),
        ['รวมจ่ายส่วนแบ่งช่างทั้งหมด', totalHeads, totalHaircutComm, totalChemComm, totalProdComm, totalTipPayout, totalBarberPayout],
        [],
        ['4. สรุปค่าใช้จ่ายร้านค้าแยกตามหมวดหมู่ (Expenses by Category)'],
        ['หมวดหมู่', 'จำนวนรายการ', 'ยอดรวม (บาท)', 'สัดส่วน (%)'],
        ...expenseCategoryList.map(([cat, val]) => [
          `"${cat}"`,
          `${val.count} รายการ`,
          val.total,
          `${totalShopExpenses > 0 ? ((val.total / totalShopExpenses) * 100).toFixed(1) : 0}%`,
        ]),
        ['รวมค่าใช้จ่ายร้านค้าทั้งหมด', `${periodExpenses.length} รายการ`, totalShopExpenses, '100%'],
        [],
        ['5. สรุปผลการดำเนินงานสุทธิ (Bottom Line Financial Summary)'],
        ['รายการ', 'ยอดเงิน (บาท)'],
        ['ส่วนแบ่งกำไรขั้นต้นของร้าน', shopGrossProfit],
        ['หัก ค่าใช้จ่ายดำเนินงานร้านค้า', -totalShopExpenses],
        ['กำไรสุทธิคงเหลือของร้าน (Net Profit)', finalBottomLineProfit],
        ['อัตรากำไรสุทธิ (Net Margin %)', `${shopMarginPercent}%`],
        [],
        ['6. ดัชนีชี้วัดทางธุรกิจ (Monthly KPIs)'],
        ['ตัวชี้วัด', 'ค่าที่ได้'],
        ['ยอดขายเฉลี่ยต่อบิล (Avg Ticket)', `${avgTicket} บาท`],
        ['ราคาตัดผมเฉลี่ยต่อหัว', `${avgHaircutPrice} บาท`],
        ['รายได้เฉลี่ยต่อช่าง', `${avgBarberEarned} บาท`],
      ];

      const csvContent = '\uFEFF' + summaryRows.map((e) => e.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Monthly_Accounting_Report_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('ดาวน์โหลด CSV สำเร็จ 📑', 'ส่งออกข้อมูลสำหรับทำบัญชีรายเดือนเรียบร้อย', 'success', '📊');
      return;
    }

    const headers = [
      'เลขที่บิล',
      'วันที่',
      'เวลา',
      'ลูกค้า',
      'เบอร์โทร',
      'ช่าง',
      'ค่าตัดผม',
      'ค่าเคมี',
      'ค่าสินค้า',
      'ค่าทิป',
      'ส่วนลด 10% ตัดผม',
      'ส่วนลด Voucher',
      'ยอดสุทธิบิล',
      'วิธีชำระเงิน',
      'ยอดเงินสด',
      'ยอดเงินโอน',
      'ส่วนแบ่งช่าง',
      'ส่วนของร้าน',
      'สถานะรวมบิล',
      'หมายเหตุ',
    ];

    const rows = periodBills.map((b) => [
      b.billNumber,
      b.dateStr,
      b.timeStr,
      `"${b.customerName.replace(/"/g, '""')}"`,
      b.customerPhone || '',
      `"${b.barberName.replace(/"/g, '""')}"`,
      b.haircutFee,
      b.chemicalFee,
      b.totalProductsFee,
      b.tipFee,
      b.haircutDiscountAmount || 0,
      b.voucherDiscountAmount || 0,
      b.grossTotal,
      b.paymentMethod === 'transfer' ? 'เงินโอน' : b.paymentMethod === 'cash' ? 'เงินสด' : 'สลับ (สด+โอน)',
      b.cashAmount,
      b.transferAmount,
      b.commission.barberTotalEarned,
      b.commission.shopNetEarned,
      b.mergedGroupId ? `รวมบิลกลุ่ม #${b.mergedGroupId.slice(-4)}` : 'บิลเดี่ยว',
      `"${(b.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Accounting_Report_${selectedDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ดาวน์โหลด CSV สำเร็จ 📑', 'ส่งออกข้อมูลสำหรับทำบัญชีเรียบร้อย', 'success', '📊');
  };

  const reportPeriodTitle =
    viewMode === 'daily'
      ? `ประจำวันที่ ${selectedDate}`
      : billingCycleInfo.monthOnlyLabel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className={`rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-4 border print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none ${
        isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'
      }`}>
        {/* Header Bar - Hidden during print */}
        <div className={`flex items-center justify-between px-6 py-4 border-b print:hidden ${
          isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                ใบบันทึกสรุปรายงานทางบัญชี (Accounting Statement)
              </h3>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                {reportPeriodTitle} • {settings.shopName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all btn-tactile ${
                isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">CSV บัญชี</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all btn-tactile"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>ดาวน์โหลด PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all btn-tactile ${
                isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden sm:inline">พิมพ์ (Print)</span>
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors btn-tactile ${
                isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Statement Body (Official Accounting Format with light printable background) */}
        <div
          ref={reportRef}
          id="accounting-report-content"
          className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 space-y-6 bg-white text-slate-900 print:text-black"
        >
          {/* Shop Header */}
          <div className="border-b pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-slate-200 dark:border-zinc-800 print:border-black">
            <div>
              <div className="text-xl font-black tracking-tight">{settings.shopName}</div>
              {(hasAddress || hasPhone || hasPromptPay) && (
                <div className="text-xs text-slate-500 dark:text-zinc-400 print:text-gray-600 mt-1 space-y-0.5 font-mono">
                  {hasAddress && <div>ที่อยู่: {settings.shopAddress}</div>}
                  {hasPhone && <div>โทรศัพท์: {settings.shopPhone}</div>}
                  {hasPromptPay && <div>พร้อมเพย์: {settings.shopPromptPay}</div>}
                </div>
              )}
            </div>
            <div className="text-left sm:text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-lg uppercase tracking-wider print:border print:border-black">
                เอกสารสรุปบัญชีประจำงวด
              </span>
              <div className="text-sm font-bold">{reportPeriodTitle}</div>
              <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')} เวลา {new Date().toLocaleTimeString('th-TH')}
              </div>
            </div>
          </div>

          {/* Summary Strip: หัวลูกค้า & ช่องทางชำระเงิน */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 print:bg-white print:border-black text-xs">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">✂️ จำนวนหัวลูกค้า:</span>
              <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">{totalBills} หัว <span className="text-xs font-normal text-slate-500">(ตัดผม {totalHeads})</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">📱 ยอดเงินโอน ({transferBillCount} บิล):</span>
              <span className="text-base font-black font-mono text-sky-600 dark:text-sky-400">{settings.currencySymbol}{totalTransfer.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">💵 ยอดเงินสด ({cashBillCount} บิล):</span>
              <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">{settings.currencySymbol}{totalCash.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">💰 รายได้ร้านสุทธิ (ไม่รวมทิป):</span>
              <span className="text-base font-black font-mono text-purple-600 dark:text-purple-400">{settings.currencySymbol}{totalShopNetRevenue.toLocaleString()}</span>
            </div>
          </div>

          {/* 4 Columns Executive Financial Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Box 1: Operating Revenue */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 print:bg-white print:border-black">
              <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                1. รายได้จากการดำเนินงานของร้าน (ไม่รวมทิป)
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>• ค่าตัดผม:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalHaircutRev.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>• ค่าเคมี/สี:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalChemRev.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>• ขายสินค้า:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalProdRev.toLocaleString()}</span>
                </div>
                {totalDiscounts > 0 && (
                  <div className="flex justify-between text-rose-500 font-medium">
                    <span>• ส่วนลดร้านออกให้:</span>
                    <span className="font-mono font-semibold">-{settings.currencySymbol}{totalDiscounts.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 mt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-between font-bold text-sm text-amber-600 dark:text-amber-400">
                  <span>รายได้ร้านสุทธิ:</span>
                  <span className="font-mono">{settings.currencySymbol}{totalShopNetRevenue.toLocaleString()}</span>
                </div>
                <div className="pt-1.5 mt-1 border-t border-dashed border-slate-200 dark:border-zinc-800 flex justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                  <span>* เงินทิปช่าง (ส่งมอบช่าง ไม่นับเป็นรายได้ร้าน):</span>
                  <span className="font-mono font-semibold text-amber-500">{settings.currencySymbol}{totalTipRev.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Box 2: Cost of Services / Commissions */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 print:bg-white print:border-black">
              <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                2. จ่ายส่วนแบ่งช่าง (Payroll)
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>• ส่วนแบ่งตัดผม:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalHaircutComm.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>• ส่วนแบ่งเคมี:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalChemComm.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>• ส่วนแบ่งสินค้า:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalProdComm.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>• ทิปส่งมอบช่าง (100%):</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{totalTipPayout.toLocaleString()}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-between font-bold text-sm text-rose-500">
                  <span>รวมจ่ายช่าง:</span>
                  <span className="font-mono">{settings.currencySymbol}{totalBarberPayout.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Box 3: Shop Operational Expenses */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 print:bg-white print:border-black">
              <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                3. ค่าใช้จ่ายร้านค้า (Expenses)
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>• รายการจ่ายร้าน:</span>
                  <span className="font-mono font-semibold">{periodExpenses.length} รายการ</span>
                </div>
                <div className="flex justify-between">
                  <span>• จ่ายผ่านเงินโอน:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{periodExpenses.filter(e => e.paymentMethod === 'transfer').reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>• จ่ายผ่านเงินสด:</span>
                  <span className="font-mono font-semibold">{settings.currencySymbol}{periodExpenses.filter(e => e.paymentMethod === 'cash').reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>• ค่าเช่า/น้ำไฟ/ของ:</span>
                  <span className="font-mono font-semibold">ตามใบเสร็จ</span>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-between font-bold text-sm text-pink-500">
                  <span>รวมรายจ่ายร้าน:</span>
                  <span className="font-mono">{settings.currencySymbol}{totalShopExpenses.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Box 4: Final Net Profit */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 print:bg-white print:border-black">
              <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                4. กำไรสุทธิขั้นสุดท้าย
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>• ส่วนแบ่งร้าน (Gross):</span>
                  <span className="font-mono font-semibold text-amber-500">{settings.currencySymbol}{shopGrossProfit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>• หัก รายจ่ายร้านค้า:</span>
                  <span className="font-mono font-semibold text-rose-500">-{settings.currencySymbol}{totalShopExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>• เงินสดในลิ้นชัก:</span>
                  <span className="font-mono font-semibold text-emerald-500">{settings.currencySymbol}{totalCash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>• อัตรากำไรสุทธิ:</span>
                  <span className="font-mono font-semibold">{shopMarginPercent}%</span>
                </div>
                <div className={`pt-2 mt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-between font-bold text-sm ${finalBottomLineProfit < 0 ? 'text-rose-500' : 'text-purple-600 dark:text-purple-400'}`}>
                  <span>กำไรสุทธิร้าน:</span>
                  <span className="font-mono">{settings.currencySymbol}{finalBottomLineProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barber Payroll & Commission Table */}
          <div>
            <h4 className="text-sm font-bold mb-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>ตารางแจกแจงรายได้และส่วนแบ่งช่างรายบุคคล (Barber Commission Ledger)</span>
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 print:border-black">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 font-semibold print:bg-gray-100 print:border-black">
                  <tr>
                    <th className="py-2.5 px-3">ชื่อช่าง</th>
                    <th className="py-2.5 px-2 text-center">จำนวนหัว</th>
                    <th className="py-2.5 px-3 text-right">ตัดผม (ได้)</th>
                    <th className="py-2.5 px-3 text-right">เคมี (ได้)</th>
                    <th className="py-2.5 px-3 text-right">สินค้า (ได้)</th>
                    <th className="py-2.5 px-3 text-right">ทิป (ได้)</th>
                    <th className="py-2.5 px-3 text-right font-bold text-emerald-600">รวมรายได้ช่าง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 print:divide-black">
                  {barberSummaries.map(({ barber, headsCut, haircutEarned, chemicalEarned, productEarned, tipEarned, totalEarned }) => (
                    <tr key={barber.id}>
                      <td className="py-2.5 px-3 font-semibold">
                        {barber.nickname}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono">{headsCut}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{settings.currencySymbol}{haircutEarned.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{settings.currencySymbol}{chemicalEarned.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{settings.currencySymbol}{productEarned.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{settings.currencySymbol}{tipEarned.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                        {settings.currencySymbol}{totalEarned.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-slate-100 dark:bg-zinc-950 font-bold border-t-2 border-slate-300 dark:border-zinc-700 print:border-black print:bg-gray-100">
                    <td className="py-2.5 px-3">รวมทุกช่าง ({barberSummaries.length} ท่าน)</td>
                    <td className="py-2.5 px-2 text-center font-mono">{totalHeads}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{settings.currencySymbol}{totalHaircutComm.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{settings.currencySymbol}{totalChemComm.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{settings.currencySymbol}{totalProdComm.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{settings.currencySymbol}{totalTipPayout.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 text-sm">
                      {settings.currencySymbol}{totalBarberPayout.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Conditional: Monthly Accounting Breakdown vs Daily Bills Table */}
          {viewMode === 'monthly' ? (
            <div className="space-y-6">
              {/* Structure: Revenue & Inflows Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Revenue Breakdown */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 print:bg-white print:border-black">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 pb-2 mb-3 border-b border-slate-200 dark:border-zinc-800">
                    📊 สรุปโครงสร้างรายรับจากการขายและบริการ
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800/60">
                      <span>• บริการตัดผม ({totalHeads} หัว):</span>
                      <span className="font-mono font-semibold">{settings.currencySymbol}{totalHaircutRev.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({haircutRevPct}%)</span></span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800/60">
                      <span>• บริการเคมี / ทำสี / ดัด:</span>
                      <span className="font-mono font-semibold">{settings.currencySymbol}{totalChemRev.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({chemRevPct}%)</span></span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800/60">
                      <span>• จำหน่ายสินค้า / บำรุงผม:</span>
                      <span className="font-mono font-semibold">{settings.currencySymbol}{totalProdRev.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({prodRevPct}%)</span></span>
                    </div>
                    <div className="flex justify-between py-1.5 font-bold bg-slate-100/70 dark:bg-zinc-900/60 px-2 rounded-lg">
                      <span>รวมยอดขายก่อนหักส่วนลด:</span>
                      <span className="font-mono">{settings.currencySymbol}{totalShopGrossRevenue.toLocaleString()}</span>
                    </div>
                    {totalDiscounts > 0 && (
                      <div className="flex justify-between py-1 text-rose-500 font-semibold px-2">
                        <span>• ส่วนลดโปรโมชั่น/Voucher ร้านออกให้:</span>
                        <span className="font-mono">-{settings.currencySymbol}{totalDiscounts.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 rounded-lg border border-amber-500/20 text-sm">
                      <span>รายได้ร้านจากการดำเนินงานสุทธิ:</span>
                      <span className="font-mono">{settings.currencySymbol}{totalShopNetRevenue.toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-amber-600 dark:text-amber-500 italic pt-1">
                      * ทิปช่างส่งมอบ 100%: {settings.currencySymbol}{totalTipRev.toLocaleString()} (เงินรับฝากส่งมอบช่าง ไม่นับเป็นรายได้ร้าน)
                    </div>
                  </div>
                </div>

                {/* Right: Inflow & Cash Reconciliation */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 print:bg-white print:border-black">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 pb-2 mb-3 border-b border-slate-200 dark:border-zinc-800">
                    🏦 สรุปช่องทางรับเงิน & กระทบยอดเงินสด
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800/60 text-sky-600 dark:text-sky-400 font-medium">
                      <span>📱 เงินโอนเข้าบัญชี ({transferBillCount} บิล):</span>
                      <span className="font-mono font-bold">{settings.currencySymbol}{totalTransfer.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({transferInflowPct}%)</span></span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800/60 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>💵 เงินสดรับเข้าลิ้นชัก ({cashBillCount} บิล):</span>
                      <span className="font-mono font-bold">{settings.currencySymbol}{totalCash.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({cashInflowPct}%)</span></span>
                    </div>
                    <div className="flex justify-between py-1.5 font-bold bg-slate-100/70 dark:bg-zinc-900/60 px-2 rounded-lg">
                      <span>รวมยอดรับชำระจากลูกค้าทั้งหมด:</span>
                      <span className="font-mono">{settings.currencySymbol}{totalCustomerInflow.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 text-rose-500 font-medium px-2">
                      <span>• หัก รายจ่ายร้านที่จ่ายด้วยเงินสด:</span>
                      <span className="font-mono">-{settings.currencySymbol}{cashExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 rounded-lg border border-emerald-500/20 text-sm">
                      <span>ยอดเงินสดคงเหลือสุทธิในลิ้นชัก:</span>
                      <span className="font-mono">{settings.currencySymbol}{netCashInDrawer.toLocaleString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 pt-1">
                      (เงินสดรับ {settings.currencySymbol}{totalCash.toLocaleString()} หักรายจ่ายเงินสด {settings.currencySymbol}{cashExpenses.toLocaleString()})
                    </div>
                  </div>
                </div>
              </div>

              {/* Expense Categories Breakdown (Monthly View) */}
              {expenseCategoryList.length > 0 && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 print:bg-white print:border-black">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 pb-2 mb-3 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
                    <span>📑 สรุปค่าใช้จ่ายร้านค้าแยกตามหมวดหมู่ (Operating Expenses by Category)</span>
                    <span className="font-mono">รวมค่าใช้จ่าย: {settings.currencySymbol}{totalShopExpenses.toLocaleString()}</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 font-semibold">
                        <tr>
                          <th className="py-2 px-3">หมวดหมู่ค่าใช้จ่าย</th>
                          <th className="py-2 px-3 text-center">จำนวนรายการ</th>
                          <th className="py-2 px-3 text-right">ยอดรวม (บาท)</th>
                          <th className="py-2 px-3 text-right">สัดส่วน (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-zinc-800/70">
                        {expenseCategoryList.map(([cat, val]) => (
                          <tr key={cat}>
                            <td className="py-2 px-3 font-medium">{cat}</td>
                            <td className="py-2 px-3 text-center font-mono">{val.count} รายการ</td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-rose-500">
                              {settings.currencySymbol}{val.total.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500">
                              {totalShopExpenses > 0 ? ((val.total / totalShopExpenses) * 100).toFixed(1) : '0'}%
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold bg-slate-100/80 dark:bg-zinc-900/80 border-t-2 border-slate-300 dark:border-zinc-700">
                          <td className="py-2 px-3">รวมทุกหมวดหมู่ ({expenseCategoryList.length} หมวด)</td>
                          <td className="py-2 px-3 text-center font-mono">{periodExpenses.length} รายการ</td>
                          <td className="py-2 px-3 text-right font-mono text-rose-500 text-sm">
                            {settings.currencySymbol}{totalShopExpenses.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Monthly Business KPIs */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 print:bg-white print:border-black">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 pb-2 mb-3 border-b border-slate-200 dark:border-zinc-800">
                  📈 สถิติตัวชี้วัดการดำเนินงานทางธุรกิจ (Monthly KPIs)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-medium">ยอดขายเฉลี่ย / บิล:</span>
                    <span className="text-base font-black font-mono text-sky-600 dark:text-sky-400 mt-1 block">
                      {settings.currencySymbol}{avgTicket.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-medium">ราคาตัดผมเฉลี่ย / หัว:</span>
                    <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400 mt-1 block">
                      {settings.currencySymbol}{avgHaircutPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-medium">รายได้เฉลี่ย / ช่าง:</span>
                    <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                      {settings.currencySymbol}{avgBarberEarned.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-medium">อัตรากำไรสุทธิร้าน:</span>
                    <span className="text-base font-black font-mono text-purple-600 dark:text-purple-400 mt-1 block">
                      {shopMarginPercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* List of bills during this period (Daily View only) */
            <div>
              <h4 className="text-sm font-bold mb-2.5 flex items-center justify-between">
                <span>รายการบันทึกบิลประจำวัน ({periodBills.length} รายการ)</span>
                <span className="text-xs font-normal text-slate-500 font-mono">
                  เงินสด: {settings.currencySymbol}{totalCash.toLocaleString()} | เงินโอน: {settings.currencySymbol}{totalTransfer.toLocaleString()}
                </span>
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 print:border-black">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 font-semibold print:bg-gray-100 print:border-black">
                    <tr>
                      <th className="py-2 px-3">เลขที่บิล / เวลา</th>
                      <th className="py-2 px-3">ลูกค้า</th>
                      <th className="py-2 px-3">ช่าง</th>
                      <th className="py-2 px-3 text-right">ตัดผม</th>
                      <th className="py-2 px-3 text-right">เคมี</th>
                      <th className="py-2 px-3 text-right">สินค้า</th>
                      <th className="py-2 px-3 text-right">ทิป</th>
                      <th className="py-2 px-3 text-right font-bold">ยอดรวม</th>
                      <th className="py-2 px-3 text-center">ช่องทางชำระ</th>
                      <th className="py-2 px-3 text-right text-emerald-600">จ่ายช่าง</th>
                      <th className="py-2 px-3 text-right text-amber-600">ร้านได้รับ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 print:divide-black">
                    {periodBills.map((b) => (
                      <tr key={b.id}>
                        <td className="py-2 px-3 font-mono">
                          <span className="font-bold">{b.billNumber}</span>
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">{b.dateStr} {b.timeStr} น.</span>
                        </td>
                        <td className="py-2 px-3 font-medium">{b.customerName}</td>
                        <td className="py-2 px-3">{b.barberName}</td>
                        <td className="py-2 px-3 text-right font-mono">{b.haircutFee > 0 ? `${settings.currencySymbol}${b.haircutFee.toLocaleString()}` : '-'}</td>
                        <td className="py-2 px-3 text-right font-mono">{b.chemicalFee > 0 ? `${settings.currencySymbol}${b.chemicalFee.toLocaleString()}` : '-'}</td>
                        <td className="py-2 px-3 text-right font-mono">{b.totalProductsFee > 0 ? `${settings.currencySymbol}${b.totalProductsFee.toLocaleString()}` : '-'}</td>
                        <td className="py-2 px-3 text-right font-mono">{b.tipFee > 0 ? `${settings.currencySymbol}${b.tipFee.toLocaleString()}` : '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{settings.currencySymbol}{b.grossTotal.toLocaleString()}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-[10px] font-semibold">
                            {b.paymentMethod === 'transfer' && '📱 โอนเงิน'}
                            {b.paymentMethod === 'cash' && '💵 เงินสด'}
                            {b.paymentMethod === 'split' && `🔀 สด ${b.cashAmount}/โอน ${b.transferAmount}`}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold">{settings.currencySymbol}{b.commission.barberTotalEarned.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono text-amber-600 font-semibold">{settings.currencySymbol}{b.commission.shopNetEarned.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* List of shop expenses during this period */}
          {periodExpenses.length > 0 && (
            <div>
              <h4 className="text-sm font-bold mb-2.5 flex items-center justify-between text-pink-600 dark:text-pink-400">
                <span>รายการบันทึกรายจ่ายร้านค้าประจำงวด ({periodExpenses.length} รายการ)</span>
                <span className="text-xs font-normal text-slate-500 font-mono">
                  รวมรายจ่าย: {settings.currencySymbol}{totalShopExpenses.toLocaleString()}
                </span>
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 print:border-black">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 font-semibold print:bg-gray-100 print:border-black">
                    <tr>
                      <th className="py-2 px-3">วันที่ / เวลา</th>
                      <th className="py-2 px-3">รายการรายจ่าย</th>
                      <th className="py-2 px-3">หมวดหมู่</th>
                      <th className="py-2 px-3">ผู้รับเงิน / ร้านค้า</th>
                      <th className="py-2 px-3 text-center">วิธีชำระ</th>
                      <th className="py-2 px-3 text-right font-bold text-rose-500">จำนวนเงิน</th>
                      <th className="py-2 px-3">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 print:divide-black">
                    {periodExpenses.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2 px-3 font-mono">
                          <span>{e.dateStr}</span>
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">{e.timeStr || '-'} น.</span>
                        </td>
                        <td className="py-2 px-3 font-medium">{e.title}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-600 dark:text-pink-400 text-[10px] font-semibold">
                            {e.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 dark:text-zinc-400">{e.recipient || '-'}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-[10px]">
                            {e.paymentMethod === 'transfer' ? '📱 โอนเงิน' : '💵 เงินสด'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-500">
                          {settings.currencySymbol}{e.amount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">{e.notes || '-'}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 dark:bg-zinc-950 font-bold border-t-2 border-slate-300 dark:border-zinc-700 print:border-black">
                      <td colSpan={5} className="py-2 px-3 text-right font-bold">รวมรายจ่ายร้านค้าทั้งหมด:</td>
                      <td className="py-2 px-3 text-right font-mono text-rose-500 font-bold text-sm">
                        {settings.currencySymbol}{totalShopExpenses.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Signature Sign-off Box for Accountants & Shop Owners */}
          <div className="pt-8 border-t border-slate-300 dark:border-zinc-800 print:border-black grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-8">
              <div className="text-slate-500 dark:text-zinc-400 font-semibold">ลงชื่อ ................................................................ (ผู้จัดทำบัญชี / แคชเชียร์)</div>
              <div>วันที่ .......... / .......... / ................</div>
            </div>
            <div className="space-y-8">
              <div className="text-slate-500 dark:text-zinc-400 font-semibold">ลงชื่อ ................................................................ (ผู้ตรวจสอบ / เจ้าของร้าน)</div>
              <div>วันที่ .......... / .......... / ................</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
