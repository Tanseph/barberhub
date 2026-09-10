import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SaleBill, Barber, ShopExpense, ShopSettings } from '../types';
import { getBillingCycleInfo } from './billingCycle';

interface GenerateReportPdfParams {
  settings: ShopSettings;
  viewMode: 'daily' | 'monthly';
  selectedDate: string;
  selectedMonth: string;
  periodBills: SaleBill[];
  periodExpenses: ShopExpense[];
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

export async function exportReportToPDF({
  settings,
  viewMode,
  selectedDate,
  selectedMonth,
  periodBills,
  periodExpenses,
  barberSummaries,
}: GenerateReportPdfParams): Promise<boolean> {
  // Financial totals
  const totalHaircutRev = periodBills.reduce((s, b) => s + b.haircutFee, 0);
  const totalChemRev = periodBills.reduce((s, b) => s + b.chemicalFee, 0);
  const totalProdRev = periodBills.reduce((s, b) => s + b.totalProductsFee, 0);
  const totalTipRev = periodBills.reduce((s, b) => s + b.tipFee, 0);
  const totalDiscounts = periodBills.reduce((s, b) => s + (b.totalDiscountAmount || 0), 0);

  // รายได้ของร้าน (ไม่รวมยอดทิปช่าง)
  const totalShopSalesGross = totalHaircutRev + totalChemRev + totalProdRev;
  const totalShopNetRevenue = Math.max(0, totalShopSalesGross - totalDiscounts);
  const totalGross = totalShopNetRevenue;

  const totalHaircutComm = periodBills.reduce((s, b) => s + b.commission.barberHaircutEarned, 0);
  const totalChemComm = periodBills.reduce((s, b) => s + b.commission.barberChemicalEarned, 0);
  const totalProdComm = periodBills.reduce((s, b) => s + b.commission.barberProductEarned, 0);
  const totalTipPayout = periodBills.reduce((s, b) => s + b.commission.barberTipEarned, 0);
  const totalBarberPayout = periodBills.reduce((s, b) => s + b.commission.barberTotalEarned, 0);

  const shopGrossProfit = periodBills.reduce((s, b) => s + b.commission.shopNetEarned, 0);
  const totalShopExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const finalBottomLineProfit = shopGrossProfit - totalShopExpenses;
  const shopMarginPercent = totalGross > 0 ? ((finalBottomLineProfit / totalGross) * 100).toFixed(1) : '0';

  const totalCash = periodBills.reduce((s, b) => s + b.cashAmount, 0);
  const totalTransfer = periodBills.reduce((s, b) => s + b.transferAmount, 0);
  const totalHeads = periodBills.reduce((s, b) => s + (b.haircutFee > 0 ? (b.headCount && b.headCount > 0 ? b.headCount : 1) : 0), 0);
  const totalBills = periodBills.length;
  const transferBillCount = periodBills.filter((b) => b.paymentMethod === 'transfer' || (b.paymentMethod === 'split' && b.transferAmount > 0)).length;
  const cashBillCount = periodBills.filter((b) => b.paymentMethod === 'cash' || (b.paymentMethod === 'split' && b.cashAmount > 0)).length;

  const cutoffDay = settings.billingCycleCutoffDay ?? 0;
  const billingCycleInfo = getBillingCycleInfo(selectedMonth, cutoffDay);

  // For monthly view: show only the month name and year, without cutoff details
  const reportPeriodTitle =
    viewMode === 'daily'
      ? `ประจำวันที่ ${selectedDate}`
      : billingCycleInfo.monthOnlyLabel;

  const hasAddress = settings.shopAddress && settings.shopAddress.trim() !== '' && !settings.shopAddress.includes('ทองหล่อ');
  const hasPhone = settings.shopPhone && settings.shopPhone.trim() !== '' && !settings.shopPhone.includes('02-888-9999');
  const hasPromptPay = settings.shopPromptPay && settings.shopPromptPay.trim() !== '' && settings.shopPromptPay !== '0891234567';

  // Expense grouping by category for accounting
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

  const expenseCategoryList = Object.entries(expensesByCategory).sort((a, b) => b[1].total - a[1].total);

  const totalCustomerInflow = totalCash + totalTransfer;
  const transferInflowPct = totalCustomerInflow > 0 ? ((totalTransfer / totalCustomerInflow) * 100).toFixed(1) : '0';
  const cashInflowPct = totalCustomerInflow > 0 ? ((totalCash / totalCustomerInflow) * 100).toFixed(1) : '0';
  const haircutRevPct = totalShopSalesGross > 0 ? ((totalHaircutRev / totalShopSalesGross) * 100).toFixed(1) : '0';
  const chemRevPct = totalShopSalesGross > 0 ? ((totalChemRev / totalShopSalesGross) * 100).toFixed(1) : '0';
  const prodRevPct = totalShopSalesGross > 0 ? ((totalProdRev / totalShopSalesGross) * 100).toFixed(1) : '0';

  const avgTicket = totalBills > 0 ? Math.round(totalShopNetRevenue / totalBills) : 0;
  const avgHaircutPrice = totalHeads > 0 ? Math.round(totalHaircutRev / totalHeads) : 0;
  const avgBarberEarned = barberSummaries.length > 0 ? Math.round(totalBarberPayout / barberSummaries.length) : 0;

  // Create an offscreen, clean HTML container with pure inline RGB/HEX styles
  // to avoid Tailwind 4 oklch() color parsing bugs in html2canvas
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1000px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = "'Prompt', 'Sarabun', 'Segoe UI', Tahoma, sans-serif";
  container.style.padding = '32px';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  container.innerHTML = `
    <div style="background-color: #ffffff; color: #0f172a; font-size: 12px; line-height: 1.5;">
      <!-- Header -->
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 900; color: #0f172a;">${settings.shopName || 'BARBER POS'}</h1>
          ${
            hasAddress || hasPhone || hasPromptPay
              ? `
          <div style="font-size: 11px; color: #475569; font-family: monospace;">
            ${hasAddress ? `<div>ที่อยู่: ${settings.shopAddress}</div>` : ''}
            ${hasPhone ? `<div>โทรศัพท์: ${settings.shopPhone}</div>` : ''}
            ${hasPromptPay ? `<div>พร้อมเพย์: ${settings.shopPromptPay}</div>` : ''}
          </div>`
              : ''
          }
        </div>
        <div style="text-align: right;">
          <div style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 12px; margin-bottom: 6px; border: 1px solid #fde68a;">
            เอกสารสรุปรายงานทางบัญชี (Accounting Statement)
          </div>
          <div style="font-size: 14px; font-weight: bold; color: #0f172a;">${reportPeriodTitle}</div>
          <div style="font-size: 10px; color: #64748b; font-family: monospace;">
            วันที่จัดพิมพ์: ${new Date().toLocaleDateString('th-TH')} เวลา ${new Date().toLocaleTimeString('th-TH')}
          </div>
        </div>
      </div>

      <!-- Overview Quick Strip -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px;">
        <div>
          <div style="font-size: 10px; color: #64748b; font-weight: bold;">✂️ จำนวนหัวตัดผม:</div>
          <div style="font-size: 14px; font-weight: 900; font-family: monospace; color: #b45309;">${totalHeads} หัว <span style="font-size: 10px; font-weight: normal; color: #64748b;">(ทั้งหมด ${totalBills} บิล)</span></div>
        </div>
        <div>
          <div style="font-size: 10px; color: #64748b; font-weight: bold;">📱 ยอดโอน (${transferBillCount} บิล):</div>
          <div style="font-size: 14px; font-weight: 900; font-family: monospace; color: #0284c7;">฿${totalTransfer.toLocaleString()}</div>
        </div>
        <div>
          <div style="font-size: 10px; color: #64748b; font-weight: bold;">💵 ยอดเงินสด (${cashBillCount} บิล):</div>
          <div style="font-size: 14px; font-weight: 900; font-family: monospace; color: #059669;">฿${totalCash.toLocaleString()}</div>
        </div>
        <div>
          <div style="font-size: 10px; color: #64748b; font-weight: bold;">💰 ยอดขายสุทธิรวม:</div>
          <div style="font-size: 14px; font-weight: 900; font-family: monospace; color: #7e22ce;">฿${totalGross.toLocaleString()}</div>
        </div>
      </div>

      <!-- 4 Pillars Summary Grid -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
        <!-- 1. Gross Revenue -->
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
          <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">1. รายได้ร้าน (ไม่รวมทิป)</div>
          <div style="font-size: 11px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>• ค่าตัดผม:</span><strong style="font-family: monospace;">฿${totalHaircutRev.toLocaleString()}</strong></div>
          <div style="font-size: 11px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>• ค่าเคมี:</span><strong style="font-family: monospace;">฿${totalChemRev.toLocaleString()}</strong></div>
          <div style="font-size: 11px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>• ขายสินค้า:</span><strong style="font-family: monospace;">฿${totalProdRev.toLocaleString()}</strong></div>
          ${totalDiscounts > 0 ? `<div style="font-size: 11px; margin-bottom: 4px; display: flex; justify-content: space-between; color: #ef4444;"><span>• ส่วนลดร้านออกให้:</span><strong style="font-family: monospace;">-฿${totalDiscounts.toLocaleString()}</strong></div>` : ''}
          <div style="font-size: 10px; margin-bottom: 6px; display: flex; justify-content: space-between; color: #d97706; padding-top: 4px; border-top: 1px dashed #e2e8f0;"><span>* ทิปช่าง (ส่งมอบช่าง):</span><strong style="font-family: monospace;">฿${totalTipRev.toLocaleString()}</strong></div>
          <div style="border-top: 1px solid #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; color: #b45309;">
            <span>รายได้ร้านสุทธิ:</span>
            <span style="font-family: monospace;">฿${totalShopNetRevenue.toLocaleString()}</span>
          </div>
        </div>

        <!-- 2. Barber Payroll -->
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
          <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">2. จ่ายส่วนแบ่งช่าง</div>
          <div style="font-size: 11px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>• ตัดผม:</span><strong style="font-family: monospace;">฿${totalHaircutComm.toLocaleString()}</strong></div>
          <div style="font-size: 11px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>• เคมี:</span><strong style="font-family: monospace;">฿${totalChemComm.toLocaleString()}</strong></div>
          <div style="font-size: 11px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>• สินค้า:</span><strong style="font-family: monospace;">฿${totalProdComm.toLocaleString()}</strong></div>
          <div style="font-size: 11px; margin-bottom: 8px; display: flex; justify-content: space-between; color: #d97706;"><span>• ทิปส่งมอบ (100%):</span><strong style="font-family: monospace;">฿${totalTipPayout.toLocaleString()}</strong></div>
          <div style="border-top: 1px solid #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; color: #dc2626;">
            <span>รวมจ่ายช่าง:</span>
            <span style="font-family: monospace;">฿${totalBarberPayout.toLocaleString()}</span>
          </div>
        </div>

        <!-- 3. Expenses -->
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
          <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">3. รายจ่ายร้านค้า</div>
          <div style="font-size: 11px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>• รายการจ่าย:</span><strong style="font-family: monospace;">${periodExpenses.length} รายการ</strong></div>
          <div style="font-size: 11px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>• โอนเงิน:</span><strong style="font-family: monospace;">฿${periodExpenses.filter(e => e.paymentMethod === 'transfer').reduce((s, e) => s + e.amount, 0).toLocaleString()}</strong></div>
          <div style="font-size: 11px; margin-bottom: 8px; display: flex; justify-content: space-between;"><span>• เงินสด:</span><strong style="font-family: monospace;">฿${periodExpenses.filter(e => e.paymentMethod === 'cash').reduce((s, e) => s + e.amount, 0).toLocaleString()}</strong></div>
          <div style="border-top: 1px solid #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; color: #db2777;">
            <span>รวมรายจ่ายร้าน:</span>
            <span style="font-family: monospace;">฿${totalShopExpenses.toLocaleString()}</span>
          </div>
        </div>

        <!-- 4. Net Profit -->
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
          <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">4. กำไรสุทธิร้าน</div>
          <div style="font-size: 11px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>• ส่วนแบ่งร้าน:</span><strong style="font-family: monospace; color: #b45309;">฿${shopGrossProfit.toLocaleString()}</strong></div>
          <div style="font-size: 11px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>• หัก รายจ่ายร้าน:</span><strong style="font-family: monospace; color: #dc2626;">-฿${totalShopExpenses.toLocaleString()}</strong></div>
          <div style="font-size: 11px; margin-bottom: 8px; display: flex; justify-content: space-between;"><span>• เงินสดในลิ้นชัก:</span><strong style="font-family: monospace; color: #059669;">฿${totalCash.toLocaleString()}</strong></div>
          <div style="border-top: 1px solid #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; color: #7e22ce;">
            <span>กำไรสุทธิ (${shopMarginPercent}%):</span>
            <span style="font-family: monospace;">฿${finalBottomLineProfit.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <!-- Barber Payroll Breakdown Table -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 13px; font-weight: bold; margin: 0 0 8px 0; color: #0f172a; border-left: 4px solid #f59e0b; padding-left: 8px;">
          ตารางสรุปส่วนแบ่งช่างรายบุคคล (Barber Commission Ledger)
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
          <thead>
            <tr style="background-color: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #94a3b8;">
              <th style="padding: 6px 8px;">ชื่อช่าง</th>
              <th style="padding: 6px 8px; text-align: center;">จำนวนหัว</th>
              <th style="padding: 6px 8px; text-align: right;">ตัดผม (ได้)</th>
              <th style="padding: 6px 8px; text-align: right;">เคมี (ได้)</th>
              <th style="padding: 6px 8px; text-align: right;">สินค้า (ได้)</th>
              <th style="padding: 6px 8px; text-align: right;">ทิป (ได้)</th>
              <th style="padding: 6px 8px; text-align: right; color: #059669; font-weight: bold;">รวมรายได้ช่าง</th>
            </tr>
          </thead>
          <tbody>
            ${barberSummaries
              .map(
                (b) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 8px; font-weight: bold;">${b.barber.nickname}</td>
                <td style="padding: 6px 8px; text-align: center; font-family: monospace;">${b.headsCut}</td>
                <td style="padding: 6px 8px; text-align: right; font-family: monospace;">฿${b.haircutEarned.toLocaleString()}</td>
                <td style="padding: 6px 8px; text-align: right; font-family: monospace;">฿${b.chemicalEarned.toLocaleString()}</td>
                <td style="padding: 6px 8px; text-align: right; font-family: monospace;">฿${b.productEarned.toLocaleString()}</td>
                <td style="padding: 6px 8px; text-align: right; font-family: monospace;">฿${b.tipEarned.toLocaleString()}</td>
                <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; color: #059669;">฿${b.totalEarned.toLocaleString()}</td>
              </tr>
            `
              )
              .join('')}
            <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1;">
              <td style="padding: 6px 8px;">รวมทุกช่าง (${barberSummaries.length} ท่าน)</td>
              <td style="padding: 6px 8px; text-align: center; font-family: monospace;">${totalHeads}</td>
              <td style="padding: 6px 8px; text-align: right; font-family: monospace;">฿${totalHaircutComm.toLocaleString()}</td>
              <td style="padding: 6px 8px; text-align: right; font-family: monospace;">฿${totalChemComm.toLocaleString()}</td>
              <td style="padding: 6px 8px; text-align: right; font-family: monospace;">฿${totalProdComm.toLocaleString()}</td>
              <td style="padding: 6px 8px; text-align: right; font-family: monospace;">฿${totalTipPayout.toLocaleString()}</td>
              <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #059669; font-size: 12px;">฿${totalBarberPayout.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Monthly Accounting Structure: Revenue & Inflow Breakdown -->
      ${
        viewMode === 'monthly'
          ? `
      <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 16px; margin-bottom: 24px;">
        <!-- Left: Revenue Breakdown -->
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; background-color: #ffffff;">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
            📊 สรุปโครงสร้างรายรับจากการขายและบริการ
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 5px 0;">• บริการตัดผม (${totalHeads} หัว):</td>
                <td style="padding: 5px 0; text-align: right; font-family: monospace; font-weight: 600;">฿${totalHaircutRev.toLocaleString()}</td>
                <td style="padding: 5px 0 5px 8px; text-align: right; color: #64748b; font-size: 10px; width: 45px;">(${haircutRevPct}%)</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 5px 0;">• บริการเคมี / ทำสี / ทรีทเม้นท์:</td>
                <td style="padding: 5px 0; text-align: right; font-family: monospace; font-weight: 600;">฿${totalChemRev.toLocaleString()}</td>
                <td style="padding: 5px 0 5px 8px; text-align: right; color: #64748b; font-size: 10px;">(${chemRevPct}%)</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 5px 0;">• จำหน่ายสินค้า / ผลิตภัณฑ์ดูแลเส้นผม:</td>
                <td style="padding: 5px 0; text-align: right; font-family: monospace; font-weight: 600;">฿${totalProdRev.toLocaleString()}</td>
                <td style="padding: 5px 0 5px 8px; text-align: right; color: #64748b; font-size: 10px;">(${prodRevPct}%)</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9; background-color: #f8fafc;">
                <td style="padding: 5px 4px; font-weight: bold;">รวมยอดขายก่อนหักส่วนลด:</td>
                <td style="padding: 5px 0; text-align: right; font-family: monospace; font-weight: bold;">฿${totalShopSalesGross.toLocaleString()}</td>
                <td style="padding: 5px 0 5px 8px; text-align: right; color: #64748b; font-size: 10px;">(100%)</td>
              </tr>
              ${
                totalDiscounts > 0
                  ? `
              <tr style="border-bottom: 1px solid #f1f5f9; color: #ef4444;">
                <td style="padding: 5px 0;">• ส่วนลดโปรโมชั่น / คูปองเวาเชอร์:</td>
                <td style="padding: 5px 0; text-align: right; font-family: monospace; font-weight: 600;">-฿${totalDiscounts.toLocaleString()}</td>
                <td style="padding: 5px 0 5px 8px; text-align: right; font-size: 10px;"></td>
              </tr>`
                  : ''
              }
              <tr style="border-top: 2px solid #cbd5e1; font-weight: bold; background-color: #fefce8;">
                <td style="padding: 6px 4px; color: #854d0e;">รายได้ร้านจากการดำเนินงานสุทธิ:</td>
                <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 13px; color: #854d0e;">฿${totalShopNetRevenue.toLocaleString()}</td>
                <td></td>
              </tr>
              <tr>
                <td colspan="3" style="padding: 6px 0 0 0; font-size: 10px; color: #b45309; font-style: italic;">
                  * ทิปช่างส่งมอบ 100%: ฿${totalTipRev.toLocaleString()} (เป็นเงินรับฝากส่งต่อช่าง ไม่นับเป็นรายได้ร้าน)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Right: Inflow & Cash Reconciliation -->
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; background-color: #ffffff;">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
            🏦 สรุปช่องทางรับเงิน & กระทบยอดเงินสด
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 5px 0;">📱 เงินโอนเข้าบัญชี (${transferBillCount} บิล):</td>
                <td style="padding: 5px 0; text-align: right; font-family: monospace; font-weight: 600; color: #0284c7;">฿${totalTransfer.toLocaleString()}</td>
                <td style="padding: 5px 0 5px 8px; text-align: right; color: #64748b; font-size: 10px; width: 45px;">(${transferInflowPct}%)</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 5px 0;">💵 เงินสดรับเข้าลิ้นชัก (${cashBillCount} บิล):</td>
                <td style="padding: 5px 0; text-align: right; font-family: monospace; font-weight: 600; color: #059669;">฿${totalCash.toLocaleString()}</td>
                <td style="padding: 5px 0 5px 8px; text-align: right; color: #64748b; font-size: 10px;">(${cashInflowPct}%)</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9; background-color: #f8fafc;">
                <td style="padding: 5px 4px; font-weight: bold;">รวมยอดรับชำระจากลูกค้าทั้งหมด:</td>
                <td style="padding: 5px 0; text-align: right; font-family: monospace; font-weight: bold;">฿${totalCustomerInflow.toLocaleString()}</td>
                <td style="padding: 5px 0 5px 8px; text-align: right; color: #64748b; font-size: 10px;">(100%)</td>
              </tr>
              <tr style="border-top: 2px solid #e2e8f0; color: #dc2626;">
                <td style="padding: 5px 0;">• หัก ค่าใช้จ่ายร้านที่จ่ายเป็นเงินสด:</td>
                <td style="padding: 5px 0; text-align: right; font-family: monospace; font-weight: 600;">-฿${cashExpenses.toLocaleString()}</td>
                <td></td>
              </tr>
              <tr style="border-top: 1px solid #cbd5e1; font-weight: bold; background-color: #f0fdf4;">
                <td style="padding: 6px 4px; color: #166534;">ยอดเงินสดคงเหลือสุทธิในลิ้นชัก:</td>
                <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 13px; color: #166534;">฿${netCashInDrawer.toLocaleString()}</td>
                <td></td>
              </tr>
              <tr>
                <td colspan="3" style="padding: 6px 0 0 0; font-size: 10px; color: #475569;">
                  (คำนวณจากเงินสดรับ ฿${totalCash.toLocaleString()} หักรายจ่ายเงินสด ฿${cashExpenses.toLocaleString()})
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Expense Categories Breakdown (Monthly) -->
      ${
        expenseCategoryList.length > 0
          ? `
      <div style="margin-bottom: 24px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; background-color: #ffffff;">
        <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #db2777; border-bottom: 2px solid #fce7f3; padding-bottom: 6px; display: flex; justify-content: space-between;">
          <span>📑 สรุปค่าใช้จ่ายในการดำเนินงานแยกตามหมวดหมู่ (Operating Expenses by Category)</span>
          <span style="font-size: 11px; font-family: monospace;">รวมค่าใช้จ่าย: ฿${totalShopExpenses.toLocaleString()}</span>
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
          <thead>
            <tr style="background-color: #fdf2f8; border-top: 1px solid #fbcfe8; border-bottom: 2px solid #f472b6;">
              <th style="padding: 5px 8px;">หมวดหมู่ค่าใช้จ่าย</th>
              <th style="padding: 5px 8px; text-align: center;">จำนวนรายการ</th>
              <th style="padding: 5px 8px; text-align: right;">ยอดรวมเงิน (บาท)</th>
              <th style="padding: 5px 8px; text-align: right;">สัดส่วน (%)</th>
            </tr>
          </thead>
          <tbody>
            ${expenseCategoryList
              .map(
                ([cat, val]) => `
            <tr style="border-bottom: 1px solid #fce7f3;">
              <td style="padding: 5px 8px; font-weight: 500;">${cat}</td>
              <td style="padding: 5px 8px; text-align: center; font-family: monospace;">${val.count} รายการ</td>
              <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-weight: 600; color: #dc2626;">฿${val.total.toLocaleString()}</td>
              <td style="padding: 5px 8px; text-align: right; font-family: monospace; color: #64748b;">${totalShopExpenses > 0 ? ((val.total / totalShopExpenses) * 100).toFixed(1) : '0'}%</td>
            </tr>
            `
              )
              .join('')}
            <tr style="background-color: #fdf2f8; font-weight: bold; border-top: 2px solid #fbcfe8;">
              <td style="padding: 6px 8px;">รวมทุกหมวดหมู่ (${expenseCategoryList.length} หมวด)</td>
              <td style="padding: 6px 8px; text-align: center; font-family: monospace;">${periodExpenses.length} รายการ</td>
              <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #dc2626; font-size: 12px;">฿${totalShopExpenses.toLocaleString()}</td>
              <td style="padding: 6px 8px; text-align: right; font-family: monospace;">100%</td>
            </tr>
          </tbody>
        </table>
      </div>`
          : ''
      }

      <!-- Monthly KPIs Card -->
      <div style="margin-bottom: 24px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; background-color: #f8fafc;">
        <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          📈 สถิติตัวชี้วัดการดำเนินงานทางธุรกิจ (Monthly KPIs)
        </h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; text-align: center; font-size: 11px;">
          <div style="background-color: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div style="color: #64748b; font-size: 10px;">ยอดขายเฉลี่ย / บิล:</div>
            <div style="font-size: 13px; font-weight: bold; font-family: monospace; color: #0284c7; margin-top: 2px;">฿${avgTicket.toLocaleString()}</div>
          </div>
          <div style="background-color: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div style="color: #64748b; font-size: 10px;">ราคาตัดผมเฉลี่ย / หัว:</div>
            <div style="font-size: 13px; font-weight: bold; font-family: monospace; color: #b45309; margin-top: 2px;">฿${avgHaircutPrice.toLocaleString()}</div>
          </div>
          <div style="background-color: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div style="color: #64748b; font-size: 10px;">รายได้เฉลี่ย / ช่าง:</div>
            <div style="font-size: 13px; font-weight: bold; font-family: monospace; color: #059669; margin-top: 2px;">฿${avgBarberEarned.toLocaleString()}</div>
          </div>
          <div style="background-color: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div style="color: #64748b; font-size: 10px;">อัตรากำไรสุทธิร้าน:</div>
            <div style="font-size: 13px; font-weight: bold; font-family: monospace; color: #7e22ce; margin-top: 2px;">${shopMarginPercent}%</div>
          </div>
        </div>
      </div>
      `
          : `
      <!-- Sales Bills Ledger Table (Daily view only) -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 13px; font-weight: bold; margin: 0 0 8px 0; color: #0f172a; border-left: 4px solid #3b82f6; padding-left: 8px; display: flex; justify-content: space-between;">
          <span>รายการบิลขายประจำงวด (${periodBills.length} บิล)</span>
          <span style="font-size: 11px; font-weight: normal; color: #64748b; font-family: monospace;">
            เงินสด: ฿${totalCash.toLocaleString()} | เงินโอน: ฿${totalTransfer.toLocaleString()}
          </span>
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: left;">
          <thead>
            <tr style="background-color: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #94a3b8;">
              <th style="padding: 5px 6px;">เลขที่บิล / เวลา</th>
              <th style="padding: 5px 6px;">ลูกค้า</th>
              <th style="padding: 5px 6px;">ช่าง</th>
              <th style="padding: 5px 6px; text-align: right;">ตัดผม</th>
              <th style="padding: 5px 6px; text-align: right;">เคมี</th>
              <th style="padding: 5px 6px; text-align: right;">สินค้า</th>
              <th style="padding: 5px 6px; text-align: right;">ทิป</th>
              <th style="padding: 5px 6px; text-align: right; font-weight: bold;">ยอดรวม</th>
              <th style="padding: 5px 6px; text-align: center;">ชำระเงิน</th>
              <th style="padding: 5px 6px; text-align: right; color: #059669;">จ่ายช่าง</th>
              <th style="padding: 5px 6px; text-align: right; color: #b45309;">ร้านได้รับ</th>
              <th style="padding: 5px 6px;">สถานะบิล</th>
            </tr>
          </thead>
          <tbody>
            ${periodBills
              .map(
                (b) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 5px 6px; font-family: monospace;">
                  <strong>${b.billNumber}</strong>
                  <div style="font-size: 9px; color: #64748b;">${b.dateStr} ${b.timeStr} น.</div>
                </td>
                <td style="padding: 5px 6px; font-weight: 500;">${b.customerName}</td>
                <td style="padding: 5px 6px;">${b.barberName}</td>
                <td style="padding: 5px 6px; text-align: right; font-family: monospace;">${b.haircutFee > 0 ? `฿${b.haircutFee.toLocaleString()}${b.headCount && b.headCount > 1 ? ` (${b.headCount}หัว)` : ''}` : b.totalProductsFee > 0 ? '<span style="color: #b45309; font-size: 8px;">สินค้า (0หัว)</span>' : '-'}</td>
                <td style="padding: 5px 6px; text-align: right; font-family: monospace;">${b.chemicalFee > 0 ? `฿${b.chemicalFee.toLocaleString()}` : '-'}</td>
                <td style="padding: 5px 6px; text-align: right; font-family: monospace;">${b.totalProductsFee > 0 ? `฿${b.totalProductsFee.toLocaleString()}` : '-'}</td>
                <td style="padding: 5px 6px; text-align: right; font-family: monospace;">${b.tipFee > 0 ? `฿${b.tipFee.toLocaleString()}` : '-'}</td>
                <td style="padding: 5px 6px; text-align: right; font-family: monospace; font-weight: bold;">฿${b.grossTotal.toLocaleString()}</td>
                <td style="padding: 5px 6px; text-align: center; font-size: 9px;">
                  ${b.paymentMethod === 'transfer' ? 'โอนเงิน' : b.paymentMethod === 'cash' ? 'เงินสด' : `สด ${b.cashAmount}/โอน ${b.transferAmount}`}
                </td>
                <td style="padding: 5px 6px; text-align: right; font-family: monospace; color: #059669; font-weight: bold;">฿${b.commission.barberTotalEarned.toLocaleString()}</td>
                <td style="padding: 5px 6px; text-align: right; font-family: monospace; color: #b45309; font-weight: bold;">฿${b.commission.shopNetEarned.toLocaleString()}</td>
                <td style="padding: 5px 6px; font-size: 9px;">
                  ${b.mergedGroupId ? `<span style="background-color: #e0e7ff; color: #3730a3; padding: 2px 4px; border-radius: 4px;">รวมบิล #${b.mergedGroupId.slice(-4)}</span>` : '<span style="color: #64748b;">บิลเดี่ยว</span>'}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
      `
      }

      <!-- Shop Expenses Ledger Table (if any) -->
      ${
        periodExpenses.length > 0
          ? `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 13px; font-weight: bold; margin: 0 0 8px 0; color: #db2777; border-left: 4px solid #db2777; padding-left: 8px; display: flex; justify-content: space-between;">
            <span>รายการบันทึกรายจ่ายร้านค้า (${periodExpenses.length} รายการ)</span>
            <span style="font-size: 11px; font-weight: normal; color: #db2777; font-family: monospace;">
              รวมรายจ่าย: ฿${totalShopExpenses.toLocaleString()}
            </span>
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: left;">
            <thead>
              <tr style="background-color: #fdf2f8; border-top: 1px solid #fbcfe8; border-bottom: 2px solid #f472b6;">
                <th style="padding: 5px 6px;">วันที่ / เวลา</th>
                <th style="padding: 5px 6px;">รายการรายจ่าย</th>
                <th style="padding: 5px 6px;">หมวดหมู่</th>
                <th style="padding: 5px 6px;">ผู้เบิก / ร้านค้า</th>
                <th style="padding: 5px 6px; text-align: center;">วิธีจ่าย</th>
                <th style="padding: 5px 6px; text-align: right; color: #dc2626; font-weight: bold;">จำนวนเงิน</th>
                <th style="padding: 5px 6px;">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              ${periodExpenses
                .map(
                  (e) => `
                <tr style="border-bottom: 1px solid #fce7f3;">
                  <td style="padding: 5px 6px; font-family: monospace;">${e.dateStr} ${e.timeStr || ''} น.</td>
                  <td style="padding: 5px 6px; font-weight: 500;">${e.title}</td>
                  <td style="padding: 5px 6px;"><span style="background-color: #fdf2f8; color: #db2777; padding: 2px 5px; border-radius: 4px; font-size: 9px; font-weight: bold;">${e.category}</span></td>
                  <td style="padding: 5px 6px; color: #475569;">${e.payee || '-'}</td>
                  <td style="padding: 5px 6px; text-align: center; font-size: 9px;">${e.paymentMethod === 'transfer' ? 'โอนเงิน' : 'เงินสด'}</td>
                  <td style="padding: 5px 6px; text-align: right; font-family: monospace; color: #dc2626; font-weight: bold;">฿${e.amount.toLocaleString()}</td>
                  <td style="padding: 5px 6px; color: #64748b; font-size: 9px;">${e.notes || '-'}</td>
                </tr>
              `
                )
                .join('')}
              <tr style="background-color: #fdf2f8; font-weight: bold; border-top: 2px solid #fbcfe8;">
                <td colspan="5" style="padding: 6px 8px; text-align: right;">รวมรายจ่ายร้านค้าทั้งหมด:</td>
                <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #dc2626; font-size: 11px;">฿${totalShopExpenses.toLocaleString()}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      `
          : ''
      }

      <!-- Signatures -->
      <div style="border-top: 1px solid #cbd5e1; padding-top: 24px; margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; text-align: center; font-size: 11px;">
        <div>
          <div style="color: #64748b; margin-bottom: 28px;">ลงชื่อ ................................................................ (ผู้จัดทำบัญชี / แคชเชียร์)</div>
          <div>วันที่ .......... / .......... / ................</div>
        </div>
        <div>
          <div style="color: #64748b; margin-bottom: 28px;">ลงชื่อ ................................................................ (ผู้ตรวจสอบ / เจ้าของร้าน)</div>
          <div>วันที่ .......... / .......... / ................</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1000,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8;
    const printableWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * printableWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    const filename = `Accounting_Report_${viewMode === 'daily' ? selectedDate : selectedMonth}.pdf`;
    pdf.save(filename);
    document.body.removeChild(container);
    return true;
  } catch (error) {
    console.error('PDF generation error:', error);
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    return false;
  }
}
