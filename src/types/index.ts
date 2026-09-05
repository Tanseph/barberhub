export type PaymentMethod = 'transfer' | 'cash' | 'split';

export type TabType = 'pos' | 'dashboard' | 'queue' | 'expenses' | 'payslip' | 'settings';

export type QueueStatus = 'waiting' | 'in_progress' | 'completed' | 'cancelled';

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'stock_supplies'
  | 'chemicals_color'
  | 'tools_equipment'
  | 'disposables'
  | 'laundry_cleaning'
  | 'hospitality'
  | 'staff_meals'
  | 'advance_wages'
  | 'marketing_ads'
  | 'internet_software'
  | 'maintenance_repair'
  | 'decor_ambience'
  | 'shipping_delivery'
  | 'tax_accounting'
  | 'travel_fuel'
  | 'staff_wages'
  | 'marketing'
  | 'shipping'
  | 'other';

export interface ExpenseCategoryMeta {
  id: ExpenseCategory;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  textColor: string;
  borderColor: string;
}

export interface ShopExpense {
  id: string;
  expenseNumber: string; // e.g. EXP260818-001
  timestamp: number;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  category: ExpenseCategory;
  title: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer';
  payee?: string;
  recordedBy?: string;
  notes?: string;
  receiptImg?: string;
  referenceNo?: string;
}

export type BarberSalaryType = 'guarantee_min' | 'commission_only' | 'fixed_plus_commission';

export interface Barber {
  id: string;
  name: string;
  nickname: string;
  avatar: string; // URL or emoji/preset
  phone?: string;
  color: string; // hex or tailwind class
  haircutCommissionRate: number; // e.g. 50 (%)
  chemicalCommissionRate: number; // e.g. 50 (%)
  productCommissionRate: number; // e.g. 10 (%)
  tipRate: number; // e.g. 100 (%)
  active: boolean;
  salaryType?: BarberSalaryType; // รูปแบบเงินเดือน: การันตีขั้นต่ำ (ทำไม่ถึงได้ฐาน/ทำเกินได้ตามจริง) | คอมมิชชั่นล้วน | เงินเดือนประจำ+คอมมิชชั่น
  baseSalary?: number; // ฐานเงินเดือนการันตี เช่น 15,000 บาท
  notes?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  image?: string;
}

export interface BillProductItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface BillCommission {
  barberHaircutEarned: number;
  barberChemicalEarned: number;
  barberProductEarned: number;
  barberTipEarned: number;
  barberTotalEarned: number;
  shopNetEarned: number;
}

export interface BillHeadDetail {
  id: string;
  label: string; // e.g. "ท่านที่ 1 (พ่อ)", "ท่านที่ 2 (ลูกคนโต)", "ท่านที่ 3 (ลูกคนเล็ก)"
  haircutFee: number;
  chemicalFee: number;
  barberId?: string;
  barberName?: string;
  notes?: string;
}

export interface UserSession {
  email: string;
  shopId: string;
  loginTime: number;
}

export type UserAccountStatus = 'pending' | 'approved' | 'blocked';
export type UserRole = 'admin' | 'user';

export interface UserAccount {
  email: string;
  shopId: string;
  status: UserAccountStatus;
  role: UserRole;
  registeredAt: number; // timestamp ms
  lastLoginAt: number; // timestamp ms
  shopName?: string;
  notes?: string;
  planName?: string;
  startDate?: string; // YYYY-MM-DD (วันที่เริ่มใช้งาน)
  expireDate?: string; // YYYY-MM-DD (วันที่หมดอายุ)
  activeDays?: number; // จำนวนวันที่ได้รับสิทธิ์ทั้งหมด
}

export interface SaleBill {
  id: string;
  billNumber: string;
  timestamp: number; // ms
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  barberId: string;
  barberName: string;
  customerName: string;
  customerPhone?: string;
  headCount?: number; // legacy/optional
  haircutFee: number;
  chemicalFee: number;
  tipFee: number;
  products: BillProductItem[];
  totalProductsFee: number;
  // Promotion & Voucher Discounts (Shop absorbs discount, barber receives full commission)
  hasHaircutDiscount10?: boolean; // โปรโมชั่น ลด 10% ค่าตัดผม
  haircutDiscountAmount?: number; // ยอดลดค่าตัดผม 10%
  voucherCode?: string; // รหัส หรือชื่อ Gift Voucher
  voucherDiscountAmount?: number; // ยอดลด Gift Voucher
  totalDiscountAmount?: number; // รวมส่วนลดทั้งหมดที่ร้านออกให้
  subtotalBeforeDiscount?: number; // ยอดรวมก่อนหักส่วนลด
  grossTotal: number; // ยอดสุทธิที่ลูกค้าต้องชำระ
  paymentMethod: PaymentMethod;
  cashAmount: number;
  transferAmount: number;
  commission: BillCommission;
  notes?: string;
  queueId?: string; // if created from queue
  // Merged / Grouped Bills Properties
  mergedGroupId?: string; // Group identifier e.g. "grp-1712345678"
  mergedGroupName?: string; // Custom label or "3 รายการนี้ รวมกัน"
  isMergeMaster?: boolean; // Primary payer bill
  mergedBillCount?: number; // Total count of bills in group
  mergedTotalAmount?: number; // Combined total sum across the grouped bills
}

export interface QueueBooking {
  id: string;
  queueNumber: string;
  barberId: string;
  barberName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  customerName: string;
  customerPhone: string;
  serviceType: string;
  notes?: string;
  status: QueueStatus;
  isLeaveOrBlocked?: boolean;
  leaveReason?: string;
  createdBillId?: string;
  createdAt: number;
}

export type ThemeKey = 
  | 'clean-minimal'
  | 'warm-amber-gold'
  | 'royal-sapphire'
  | 'nordic-sage'
  | 'rose-elegance'
  | 'vintage-terracotta'
  | 'violet-luxury'
  | 'japanese-zen'
  | 'professional-polish'
  | 'luxury-gold' 
  | 'charcoal-classic' 
  | 'modern-sage' 
  | 'midnight-indigo' 
  | 'warm-amber' 
  | 'ruby-luxury';

export interface ThemeConfig {
  id: ThemeKey;
  name: string;
  nameEn: string;
  description: string;
  badge: string;
  isDark?: boolean;
  bgMain: string;
  bgCard: string;
  bgCardHover: string;
  borderSubtle: string;
  borderActive: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryText: string;
  accent: string;
  headerBg: string;
  tabActiveBg: string;
  tabActiveText: string;
  colorSwatch: string;
  inputBg?: string;
  textHeading?: string;
  textMuted?: string;
  cardInnerBg?: string;
}

export interface ShopSettings {
  shopName: string;
  shopPhone: string;
  shopAddress: string;
  shopPromptPay?: string;
  logoUrl: string;
  currencySymbol: string;
  defaultHaircutCommission: number; // 50%
  defaultChemicalCommission: number; // 50%
  defaultProductCommission: number; // 10%
  defaultTipPolicy: number; // 100%
  queueSlotDuration: number; // 30, 45, 60, 90 mins
  billingCycleCutoffDay?: number; // 0 = ตัดสิ้นเดือน (1-สิ้นเดือน), หรือ 1-30 = วันที่ตัดรอบ เช่น 25 (26 เดือนก่อน - 25 เดือนนี้)
  themeId: ThemeKey;
  receiptFooterMsg: string;
  settingsPin?: string; // Default '1234'
  voucherPresetAmounts?: number[]; // มูลค่า Gift Voucher ที่กำหนดไว้ในร้าน เช่น [50, 100, 200, 300, 500]
}
