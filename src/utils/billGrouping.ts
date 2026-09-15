import { SaleBill, PaymentMethod } from '../types';

export interface MergedBillGroup {
  type: 'merged';
  id: string; // groupId
  groupId: string;
  groupName: string;
  billNumber: string; // Combined display, e.g. "B2609-001, B2609-002"
  bills: SaleBill[];
  primaryBill: SaleBill;
  dateStr: string;
  timeStr: string;
  customerNames: string[];
  barberNames: string[];
  totalHaircutFee: number;
  totalChemicalFee: number;
  totalProductsFee: number;
  totalTipFee: number;
  totalDiscountAmount: number;
  subtotalBeforeDiscount: number;
  grossTotal: number; // Combined total! (ผลสรุปยอดชำระรวม)
  paymentMethod: PaymentMethod;
  cashAmount: number;
  transferAmount: number;
  totalBarberCommission: number;
  totalShopNet: number;
  headCount: number;
  totalProductsCount: number;
  hasHaircutDiscount10: boolean;
  totalHaircutDiscountAmount: number;
  totalVoucherDiscountAmount: number;
}

export interface SingleBillDisplay {
  type: 'single';
  bill: SaleBill;
}

export type DisplayBillItem = MergedBillGroup | SingleBillDisplay;

/**
 * Group bills by mergedGroupId so that merged bills appear as a single combined bill
 * with combined total (ผลสรุปยอดรวมชำระ) in the UI.
 */
export function groupBillsForDisplay(
  bills: SaleBill[],
  options?: {
    enabled?: boolean; // if false, returns all as single
  }
): DisplayBillItem[] {
  if (options?.enabled === false) {
    return bills.map((b) => ({ type: 'single', bill: b }));
  }

  const result: DisplayBillItem[] = [];
  const processedGroupIds = new Set<string>();

  for (const bill of bills) {
    if (!bill.mergedGroupId) {
      result.push({ type: 'single', bill });
      continue;
    }

    const groupId = bill.mergedGroupId;
    if (processedGroupIds.has(groupId)) {
      continue;
    }

    processedGroupIds.add(groupId);
    // Find all bills in this group (from the provided bills list)
    const groupBills = bills.filter((b) => b.mergedGroupId === groupId);

    if (groupBills.length <= 1) {
      // If only 1 bill in this filtered list belongs to the group, still render as single or group
      result.push({ type: 'single', bill });
      continue;
    }

    const primaryBill = groupBills.find((b) => b.isMergeMaster) || groupBills[0];
    const totalGross = groupBills.reduce((s, b) => s + b.grossTotal, 0);
    const totalHaircut = groupBills.reduce((s, b) => s + b.haircutFee, 0);
    const totalChemical = groupBills.reduce((s, b) => s + b.chemicalFee, 0);
    const totalProducts = groupBills.reduce((s, b) => s + b.totalProductsFee, 0);
    const totalTip = groupBills.reduce((s, b) => s + b.tipFee, 0);
    const totalDiscount = groupBills.reduce((s, b) => s + (b.totalDiscountAmount || 0), 0);
    const subtotalBefore = groupBills.reduce(
      (s, b) => s + (b.subtotalBeforeDiscount || (b.grossTotal + (b.totalDiscountAmount || 0))),
      0
    );
    const totalCash = groupBills.reduce((s, b) => s + b.cashAmount, 0);
    const totalTransfer = groupBills.reduce((s, b) => s + b.transferAmount, 0);
    const totalBarberCommission = groupBills.reduce((s, b) => s + b.commission.barberTotalEarned, 0);
    const totalShopNet = groupBills.reduce((s, b) => s + b.commission.shopNetEarned, 0);
    const headCount = groupBills.reduce(
      (s, b) => s + (b.haircutFee > 0 ? (b.headCount && b.headCount > 0 ? b.headCount : 1) : 0),
      0
    );
    const totalProductsCount = groupBills.reduce(
      (s, b) => s + b.products.reduce((ps, p) => ps + p.quantity, 0),
      0
    );
    const hasHaircutDiscount10 = groupBills.some((b) => b.hasHaircutDiscount10);
    const totalHaircutDiscountAmount = groupBills.reduce((s, b) => s + (b.haircutDiscountAmount || 0), 0);
    const totalVoucherDiscountAmount = groupBills.reduce((s, b) => s + (b.voucherDiscountAmount || 0), 0);

    // Determine unified payment method
    const allSamePayment = groupBills.every((b) => b.paymentMethod === groupBills[0].paymentMethod);
    const paymentMethod: PaymentMethod = allSamePayment ? groupBills[0].paymentMethod : 'split';

    const customerNames = Array.from(new Set(groupBills.map((b) => b.customerName)));
    const barberNames = Array.from(new Set(groupBills.map((b) => b.barberName)));

    const groupName =
      primaryBill.mergedGroupName ||
      `รวมชำระ ${groupBills.length} รายการ (${customerNames.slice(0, 2).join(', ')}${customerNames.length > 2 ? '...' : ''})`;

    result.push({
      type: 'merged',
      id: groupId,
      groupId,
      groupName,
      billNumber: groupBills.map((b) => b.billNumber).join(', '),
      bills: groupBills,
      primaryBill,
      dateStr: primaryBill.dateStr,
      timeStr: primaryBill.timeStr,
      customerNames,
      barberNames,
      totalHaircutFee: totalHaircut,
      totalChemicalFee: totalChemical,
      totalProductsFee: totalProducts,
      totalTipFee: totalTip,
      totalDiscountAmount: totalDiscount,
      subtotalBeforeDiscount: subtotalBefore,
      grossTotal: totalGross,
      paymentMethod,
      cashAmount: totalCash,
      transferAmount: totalTransfer,
      totalBarberCommission,
      totalShopNet,
      headCount,
      totalProductsCount,
      hasHaircutDiscount10,
      totalHaircutDiscountAmount,
      totalVoucherDiscountAmount,
    });
  }

  return result;
}

export interface BillTransactionMetrics {
  totalPaymentBills: number;
  transferBillCount: number;
  cashBillCount: number;
  splitBillCount: number;
  totalServicesCount: number;
  totalHeads: number;
  mergedGroupsCount: number;
}

/**
 * Calculate accounting and transaction counts for a set of bills,
 * respecting merged bills as single payment transactions.
 * e.g., 5 customer haircuts where father pays for child (merged) = 4 payment transactions, 4 transfer slips.
 */
export function calculateBillTransactionMetrics(bills: SaleBill[]): BillTransactionMetrics {
  const displayItems = groupBillsForDisplay(bills);
  const totalPaymentBills = displayItems.length;

  let transferBillCount = 0;
  let cashBillCount = 0;
  let splitBillCount = 0;
  let mergedGroupsCount = 0;

  for (const item of displayItems) {
    let method: PaymentMethod;
    let transferAmt = 0;
    let cashAmt = 0;

    if (item.type === 'merged') {
      mergedGroupsCount++;
      method = item.paymentMethod;
      transferAmt = item.transferAmount;
      cashAmt = item.cashAmount;
    } else {
      method = item.bill.paymentMethod;
      transferAmt = item.bill.transferAmount;
      cashAmt = item.bill.cashAmount;
    }

    if (method === 'transfer' || (method === 'split' && transferAmt > 0)) {
      transferBillCount++;
    }
    if (method === 'cash' || (method === 'split' && cashAmt > 0)) {
      cashBillCount++;
    }
    if (method === 'split') {
      splitBillCount++;
    }
  }

  const totalHeads = bills.reduce(
    (s, b) => s + (b.haircutFee > 0 ? (b.headCount && b.headCount > 0 ? b.headCount : 1) : 0),
    0
  );

  return {
    totalPaymentBills,
    transferBillCount,
    cashBillCount,
    splitBillCount,
    totalServicesCount: bills.length,
    totalHeads,
    mergedGroupsCount,
  };
}

export interface BillMergedInfo {
  isMerged: boolean;
  groupId?: string;
  groupName?: string;
  isMaster?: boolean;
  partnerBills: SaleBill[];
  partnerBillNumbers: string[];
  partnerCustomerNames: string[];
  allGroupBills: SaleBill[];
  groupTotalGross: number;
}

/**
 * Returns merged group info for a specific bill relative to a list of bills.
 * Enables displaying complete individual bills while clearly indicating
 * which bill is merged with which other bill(s).
 */
export function getBillMergedInfo(bill: SaleBill, allBills: SaleBill[]): BillMergedInfo {
  if (!bill.mergedGroupId) {
    return {
      isMerged: false,
      partnerBills: [],
      partnerBillNumbers: [],
      partnerCustomerNames: [],
      allGroupBills: [bill],
      groupTotalGross: bill.grossTotal,
    };
  }

  const allGroupBills = allBills.filter((b) => b.mergedGroupId === bill.mergedGroupId);
  const partnerBills = allGroupBills.filter((b) => b.id !== bill.id);

  if (allGroupBills.length <= 1) {
    return {
      isMerged: false,
      groupId: bill.mergedGroupId,
      groupName: bill.mergedGroupName,
      partnerBills: [],
      partnerBillNumbers: [],
      partnerCustomerNames: [],
      allGroupBills: [bill],
      groupTotalGross: bill.grossTotal,
    };
  }

  const groupTotalGross = allGroupBills.reduce((sum, b) => sum + b.grossTotal, 0);
  const primaryBill = allGroupBills.find((b) => b.isMergeMaster) || allGroupBills[0];

  return {
    isMerged: true,
    groupId: bill.mergedGroupId,
    groupName: bill.mergedGroupName || primaryBill.mergedGroupName || 'รวมชำระ',
    isMaster: bill.id === primaryBill.id,
    partnerBills,
    partnerBillNumbers: partnerBills.map((b) => b.billNumber),
    partnerCustomerNames: partnerBills.map((b) => b.customerName),
    allGroupBills,
    groupTotalGross,
  };
}
