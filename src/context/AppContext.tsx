import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Barber,
  BillCommission,
  BillProductItem,
  PaymentMethod,
  ProductItem,
  QueueBooking,
  QueueStatus,
  SaleBill,
  ShopExpense,
  ShopSettings,
  TabType,
  ThemeConfig,
  ThemeKey,
  UserAccount,
  UserAccountStatus,
  UserRole,
} from '../types';
import {
  CLEAN_SETTINGS,
  INITIAL_BARBERS,
  INITIAL_BILLS,
  INITIAL_EXPENSES,
  INITIAL_PRODUCTS,
  INITIAL_QUEUES,
  INITIAL_SETTINGS,
} from '../data/mockInitialData';
import { THEMES } from '../utils/theme';
import { sounds } from '../utils/sound';
import {
  getShopIdFromEmail,
  saveShopSettingsToCloud,
  saveDocumentToCloud,
  deleteDocumentFromCloud,
  subscribeToShopData,
  testConnection,
  isSuperAdmin,
  saveUserAccountToCloud,
  deleteUserAccountFromCloud,
  subscribeToAllUsers,
  subscribeToUserAccount,
  getUserAccountFromCloud,
} from '../lib/firebase';

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  icon?: string;
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  icon?: string;
  onConfirm: () => void;
}

export type CloudSyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface AppContextType {
  // Auth & Cloud Multi-tenant
  currentUserEmail: string | null;
  currentShopId: string | null;
  login: (email: string) => void;
  logout: () => void;
  cloudSyncStatus: CloudSyncStatus;

  // SaaS User & Admin Approval Management
  currentUserAccount: UserAccount | null;
  isCurrentUserAdmin: boolean;
  allUserAccounts: UserAccount[];
  isAdminPanelOpen: boolean;
  openAdminPanel: () => void;
  closeAdminPanel: () => void;
  approveUserAccount: (
    email: string,
    options?: {
      notes?: string;
      startDate?: string;
      expireDate?: string;
      activeDays?: number;
      planName?: string;
    }
  ) => Promise<void>;
  updateUserAccount: (
    email: string,
    updates: Partial<UserAccount>
  ) => Promise<void>;
  blockUserAccount: (email: string, notes?: string) => Promise<void>;
  deleteUserAccount: (email: string) => Promise<void>;
  createUserAccountManually: (
    email: string,
    role?: UserRole,
    status?: UserAccountStatus,
    notes?: string,
    options?: {
      startDate?: string;
      expireDate?: string;
      activeDays?: number;
      planName?: string;
    }
  ) => Promise<void>;
  refreshUserStatus: () => void;

  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  theme: ThemeConfig;
  setThemeKey: (key: ThemeKey) => void;
  settings: ShopSettings;
  updateSettings: (newSettings: Partial<ShopSettings>) => void;

  barbers: Barber[];
  addBarber: (barber: Omit<Barber, 'id'>) => Barber;
  updateBarber: (id: string, updates: Partial<Barber>) => void;
  deleteBarber: (id: string) => void;

  products: ProductItem[];
  addProduct: (product: Omit<ProductItem, 'id'>) => ProductItem;
  updateProduct: (id: string, updates: Partial<ProductItem>) => void;
  deleteProduct: (id: string) => void;

  bills: SaleBill[];
  addSaleBill: (
    billData: Omit<SaleBill, 'id' | 'billNumber' | 'commission'> & {
      commission?: BillCommission;
      headCount?: number;
    }
  ) => SaleBill;
  updateSaleBill: (id: string, billData: Partial<SaleBill>) => void;
  deleteSaleBill: (id: string) => void;
  mergeSaleBills: (billIds: string[], groupName?: string, masterBillId?: string) => void;
  unmergeSaleBills: (groupIdOrBillId: string) => void;

  expenses: ShopExpense[];
  addExpense: (expenseData: Omit<ShopExpense, 'id' | 'expenseNumber'>) => ShopExpense;
  updateExpense: (id: string, updates: Partial<ShopExpense>) => void;
  deleteExpense: (id: string) => void;

  queues: QueueBooking[];
  addQueueBooking: (queueData: Omit<QueueBooking, 'id' | 'queueNumber' | 'createdAt'>) => QueueBooking;
  updateQueueBooking: (id: string, updates: Partial<QueueBooking>) => void;
  deleteQueueBooking: (id: string) => void;
  changeQueueStatus: (id: string, status: QueueStatus) => void;

  // Modals & UI helpers
  toasts: ToastMessage[];
  showToast: (
    title: string,
    message: string,
    type?: 'success' | 'info' | 'warning' | 'error',
    icon?: string
  ) => void;
  removeToast: (id: string) => void;

  confirmDialog: ConfirmDialogState;
  openConfirm: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
    icon?: string;
    onConfirm: () => void;
  }) => void;
  closeConfirm: () => void;

  // Selected Bill for Receipt or Editing
  selectedBillForReceipt: SaleBill | null;
  openReceiptModal: (bill: SaleBill) => void;
  closeReceiptModal: () => void;

  editingBill: SaleBill | null;
  openEditBillModal: (bill: SaleBill) => void;
  closeEditBillModal: () => void;

  // Quick action to start POS bill from Queue
  pendingQueueToPos: QueueBooking | null;
  startPosFromQueue: (queue: QueueBooking) => void;
  clearPendingQueueToPos: () => void;

  // Commission calculator helper
  calculateCommission: (
    barberId: string,
    haircutFee: number,
    chemicalFee: number,
    products: BillProductItem[],
    tipFee: number,
    totalDiscountAmount?: number
  ) => BillCommission;

  resetAllDataToSample: () => void;
  factoryReset: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const GLOBAL_EMAIL_KEY = 'barber_pos_current_email';

function getTenantStorageKeys(shopId: string) {
  return {
    SETTINGS: `barber_pos_${shopId}_settings_v2`,
    BARBERS: `barber_pos_${shopId}_barbers_v2`,
    PRODUCTS: `barber_pos_${shopId}_products_v2`,
    BILLS: `barber_pos_${shopId}_bills_v2`,
    EXPENSES: `barber_pos_${shopId}_expenses_v2`,
    QUEUES: `barber_pos_${shopId}_queues_v2`,
  };
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Current logged in email
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem(GLOBAL_EMAIL_KEY) || null;
    } catch {
      return null;
    }
  });

  const currentShopId = currentUserEmail ? getShopIdFromEmail(currentUserEmail) : null;
  const storageKeys = currentShopId ? getTenantStorageKeys(currentShopId) : null;

  // Cloud Sync status
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('synced');

  // 1. Settings & Theme
  const [settings, setSettings] = useState<ShopSettings>(() => {
    if (storageKeys) {
      try {
        const saved = localStorage.getItem(storageKeys.SETTINGS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!parsed.voucherPresetAmounts || parsed.voucherPresetAmounts.length === 0) {
            parsed.voucherPresetAmounts = [50, 100, 200, 300, 500];
          }
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return CLEAN_SETTINGS;
  });

  const [activeTab, setActiveTabState] = useState<TabType>('pos');

  const theme: ThemeConfig = THEMES[settings.themeId] || THEMES['clean-minimal'] || THEMES['professional-polish'];

  // 2. Barbers
  const [barbers, setBarbers] = useState<Barber[]>(() => {
    if (storageKeys) {
      try {
        const saved = localStorage.getItem(storageKeys.BARBERS);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // 3. Products
  const [products, setProducts] = useState<ProductItem[]>(() => {
    if (storageKeys) {
      try {
        const saved = localStorage.getItem(storageKeys.PRODUCTS);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // 4. Bills
  const [bills, setBills] = useState<SaleBill[]>(() => {
    if (storageKeys) {
      try {
        const saved = localStorage.getItem(storageKeys.BILLS);
        if (saved) {
          const parsed: SaleBill[] = JSON.parse(saved);
          const normalized = parsed.map((b) => ({
            ...b,
            headCount: b.haircutFee > 0 ? (typeof b.headCount === 'number' && b.headCount > 0 ? b.headCount : 1) : 0,
          }));
          return normalized.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0) || b.billNumber.localeCompare(a.billNumber));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // 5. Expenses
  const [expenses, setExpenses] = useState<ShopExpense[]>(() => {
    if (storageKeys) {
      try {
        const saved = localStorage.getItem(storageKeys.EXPENSES);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // 6. Queues
  const [queues, setQueues] = useState<QueueBooking[]>(() => {
    if (storageKeys) {
      try {
        const saved = localStorage.getItem(storageKeys.QUEUES);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // User Account & Admin SaaS state
  const [currentUserAccount, setCurrentUserAccount] = useState<UserAccount | null>(null);
  const [allUserAccounts, setAllUserAccounts] = useState<UserAccount[]>([]);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);
  const prevUserAccountStatusRef = useRef<UserAccountStatus | null>(null);

  // STRICT RULE: Only Kunakorn.k66@gmail.com has access to the Admin system
  const isCurrentUserAdmin = Boolean(
    isSuperAdmin(currentUserEmail)
  );

  const openAdminPanel = useCallback(() => {
    sounds.playClick();
    setIsAdminPanelOpen(true);
  }, []);

  const closeAdminPanel = useCallback(() => {
    setIsAdminPanelOpen(false);
  }, []);

  // UI state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [selectedBillForReceipt, setSelectedBillForReceipt] = useState<SaleBill | null>(null);
  const [editingBill, setEditingBill] = useState<SaleBill | null>(null);
  const [pendingQueueToPos, setPendingQueueToPos] = useState<QueueBooking | null>(null);

  // Toast functions
  const showToast = useCallback(
    (
      title: string,
      message: string,
      type: 'success' | 'info' | 'warning' | 'error' = 'success',
      icon?: string
    ) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, title, message, type, icon }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // When email changes, reload from local storage or cloud
  const loadTenantData = useCallback((email: string) => {
    const shopId = getShopIdFromEmail(email);
    const keys = getTenantStorageKeys(shopId);

    try {
      const savedSettings = localStorage.getItem(keys.SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (!parsed.voucherPresetAmounts || parsed.voucherPresetAmounts.length === 0) {
          parsed.voucherPresetAmounts = [50, 100, 200, 300, 500];
        }
        setSettings(parsed);
      } else {
        setSettings(CLEAN_SETTINGS);
      }

      const savedBarbers = localStorage.getItem(keys.BARBERS);
      setBarbers(savedBarbers ? JSON.parse(savedBarbers) : []);

      const savedProducts = localStorage.getItem(keys.PRODUCTS);
      setProducts(savedProducts ? JSON.parse(savedProducts) : []);

      const savedBills = localStorage.getItem(keys.BILLS);
      setBills(
        savedBills
          ? (JSON.parse(savedBills) as SaleBill[]).sort(
              (a, b) => (b.timestamp || 0) - (a.timestamp || 0) || b.billNumber.localeCompare(a.billNumber)
            )
          : []
      );

      const savedExpenses = localStorage.getItem(keys.EXPENSES);
      setExpenses(savedExpenses ? JSON.parse(savedExpenses) : []);

      const savedQueues = localStorage.getItem(keys.QUEUES);
      setQueues(savedQueues ? JSON.parse(savedQueues) : []);
    } catch (e) {
      console.error('Error loading tenant data from localStorage', e);
    }
  }, []);

  // User Account Management methods for Admin
  const approveUserAccount = useCallback(
    async (
      email: string,
      options?: {
        notes?: string;
        startDate?: string;
        expireDate?: string;
        activeDays?: number;
        planName?: string;
      }
    ) => {
      const targetEmail = email.trim().toLowerCase();
      const shopId = getShopIdFromEmail(targetEmail);
      const existing = allUserAccounts.find((u) => u.email.toLowerCase() === targetEmail);

      const updatedUser: UserAccount = {
        email: targetEmail,
        shopId,
        status: 'approved',
        role: existing?.role || 'user',
        registeredAt: existing?.registeredAt || Date.now(),
        lastLoginAt: existing?.lastLoginAt || Date.now(),
        shopName: existing?.shopName || 'Unknow Barber shop',
        notes: options?.notes !== undefined ? options.notes : existing?.notes || '',
        startDate: options?.startDate !== undefined ? options.startDate : existing?.startDate || '',
        expireDate: options?.expireDate !== undefined ? options.expireDate : existing?.expireDate || '',
        activeDays: options?.activeDays !== undefined ? options.activeDays : existing?.activeDays,
        planName: options?.planName !== undefined ? options.planName : existing?.planName || 'แพ็กเกจรายเดือน',
      };

      await saveUserAccountToCloud(updatedUser);
      setAllUserAccounts((prev) => {
        const filtered = prev.filter((u) => u.email.toLowerCase() !== targetEmail);
        return [updatedUser, ...filtered];
      });

      if (currentUserEmail?.toLowerCase() === targetEmail) {
        setCurrentUserAccount(updatedUser);
      }
    },
    [allUserAccounts, currentUserEmail]
  );

  const updateUserAccount = useCallback(
    async (email: string, updates: Partial<UserAccount>) => {
      const targetEmail = email.trim().toLowerCase();
      const shopId = getShopIdFromEmail(targetEmail);
      const existing = allUserAccounts.find((u) => u.email.toLowerCase() === targetEmail);

      const updatedUser: UserAccount = {
        email: targetEmail,
        shopId,
        status: updates.status || existing?.status || 'approved',
        role: updates.role || existing?.role || 'user',
        registeredAt: existing?.registeredAt || Date.now(),
        lastLoginAt: existing?.lastLoginAt || Date.now(),
        shopName: updates.shopName || existing?.shopName || 'Unknow Barber shop',
        notes: updates.notes !== undefined ? updates.notes : existing?.notes || '',
        startDate: updates.startDate !== undefined ? updates.startDate : existing?.startDate || '',
        expireDate: updates.expireDate !== undefined ? updates.expireDate : existing?.expireDate || '',
        activeDays: updates.activeDays !== undefined ? updates.activeDays : existing?.activeDays,
        planName: updates.planName || existing?.planName || 'แพ็กเกจรายเดือน',
        ...updates,
      };

      await saveUserAccountToCloud(updatedUser);
      setAllUserAccounts((prev) => {
        const filtered = prev.filter((u) => u.email.toLowerCase() !== targetEmail);
        return [updatedUser, ...filtered];
      });

      if (currentUserEmail?.toLowerCase() === targetEmail) {
        setCurrentUserAccount(updatedUser);
      }
    },
    [allUserAccounts, currentUserEmail]
  );

  const blockUserAccount = useCallback(async (email: string, notes?: string) => {
    const targetEmail = email.trim().toLowerCase();
    const shopId = getShopIdFromEmail(targetEmail);
    const existing = allUserAccounts.find((u) => u.email.toLowerCase() === targetEmail);

    const updatedUser: UserAccount = {
      email: targetEmail,
      shopId,
      status: 'blocked',
      role: existing?.role || 'user',
      registeredAt: existing?.registeredAt || Date.now(),
      lastLoginAt: existing?.lastLoginAt || Date.now(),
      shopName: existing?.shopName || 'Unknow Barber shop',
      notes: notes !== undefined ? notes : existing?.notes || '',
      startDate: existing?.startDate || '',
      expireDate: existing?.expireDate || '',
      activeDays: existing?.activeDays,
      planName: existing?.planName || '',
    };

    await saveUserAccountToCloud(updatedUser);
    setAllUserAccounts((prev) => {
      const filtered = prev.filter((u) => u.email.toLowerCase() !== targetEmail);
      return [updatedUser, ...filtered];
    });

    if (currentUserEmail?.toLowerCase() === targetEmail) {
      setCurrentUserAccount(updatedUser);
    }
  }, [allUserAccounts, currentUserEmail]);

  const deleteUserAccount = useCallback(async (email: string) => {
    const targetEmail = email.trim().toLowerCase();
    await deleteUserAccountFromCloud(targetEmail);
    setAllUserAccounts((prev) => prev.filter((u) => u.email.toLowerCase() !== targetEmail));

    if (currentUserEmail?.toLowerCase() === targetEmail) {
      logout();
    }
  }, [currentUserEmail]);

  const createUserAccountManually = useCallback(
    async (
      email: string,
      role: UserRole = 'user',
      status: UserAccountStatus = 'approved',
      notes: string = '',
      options?: {
        startDate?: string;
        expireDate?: string;
        activeDays?: number;
        planName?: string;
      }
    ) => {
      const targetEmail = email.trim().toLowerCase();
      const shopId = getShopIdFromEmail(targetEmail);
      const isSuper = isSuperAdmin(targetEmail);

      const newUser: UserAccount = {
        email: targetEmail,
        shopId,
        status: isSuper ? 'approved' : status,
        role: isSuper ? 'admin' : role,
        registeredAt: Date.now(),
        lastLoginAt: Date.now(),
        shopName: 'Unknow Barber shop',
        notes,
        startDate: options?.startDate || '',
        expireDate: options?.expireDate || '',
        activeDays: options?.activeDays,
        planName: options?.planName || 'แพ็กเกจรายเดือน',
      };

      await saveUserAccountToCloud(newUser);
      setAllUserAccounts((prev) => {
        const filtered = prev.filter((u) => u.email.toLowerCase() !== targetEmail);
        return [newUser, ...filtered];
      });
    },
    []
  );

  const refreshUserStatus = useCallback(() => {
    if (!currentUserEmail) return;
    const isSuper = isSuperAdmin(currentUserEmail);
    if (isSuper) {
      setCurrentUserAccount({
        email: currentUserEmail,
        shopId: getShopIdFromEmail(currentUserEmail),
        status: 'approved',
        role: 'admin',
        registeredAt: Date.now(),
        lastLoginAt: Date.now(),
        shopName: 'Unknow Barber shop',
      });
    }
  }, [currentUserEmail]);

  // Login handler
  const login = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    localStorage.setItem(GLOBAL_EMAIL_KEY, cleanEmail);
    setCurrentUserEmail(cleanEmail);
    loadTenantData(cleanEmail);
    prevUserAccountStatusRef.current = null;

    // Check if account already exists in cloud to avoid overwriting approval status on multi-device logins
    getUserAccountFromCloud(cleanEmail)
      .then((cloudAcc) => {
        if (cloudAcc) {
          setCurrentUserAccount(cloudAcc);
          prevUserAccountStatusRef.current = cloudAcc.status;
          saveUserAccountToCloud({ ...cloudAcc, lastLoginAt: Date.now() }).catch(console.error);
        } else {
          const initialAcc: UserAccount = {
            email: cleanEmail,
            shopId: getShopIdFromEmail(cleanEmail),
            status: 'approved',
            role: 'user',
            registeredAt: Date.now(),
            lastLoginAt: Date.now(),
            shopName: 'Unknow Barber shop',
            planName: 'แพ็กเกจมาตรฐาน',
          };
          setCurrentUserAccount(initialAcc);
          prevUserAccountStatusRef.current = initialAcc.status;
          saveUserAccountToCloud(initialAcc).catch(console.error);
        }
      })
      .catch(console.error);

    showToast('เข้าสู่ระบบแล้ว', `เชื่อมต่อบัญชี ${cleanEmail} 💈`, 'info', '🚀');
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem(GLOBAL_EMAIL_KEY);
    setCurrentUserEmail(null);
    setCurrentUserAccount(null);
    prevUserAccountStatusRef.current = null;
    setIsAdminPanelOpen(false);
    setSettings(CLEAN_SETTINGS);
    setBarbers([]);
    setProducts([]);
    setBills([]);
    setExpenses([]);
    setQueues([]);
    setPendingQueueToPos(null);
    setSelectedBillForReceipt(null);
    setEditingBill(null);
    sounds.playDelete();
    showToast('ออกจากระบบแล้ว', 'สลับบัญชีหรือป้อนอีเมลใหม่เพื่อเข้าใช้งาน', 'info', '👋');
  };

  // User Account Real-time Listener & Cloud Multi-tenant Sync
  useEffect(() => {
    if (!currentUserEmail) return;

    // 1. Subscribe to current user's account approval status in real-time
    const unsubUser = subscribeToUserAccount(currentUserEmail, (acc) => {
      if (acc) {
        // Real-time automatic entrance when approved: detect transition from pending to approved
        if (prevUserAccountStatusRef.current === 'pending' && acc.status === 'approved') {
          sounds.playSuccess();
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch {}
          showToast(
            'ได้รับการอนุมัติเรียบร้อยแล้ว 🎉',
            'แอดมินอนุมัติสิทธิ์การใช้งานแล้ว นำท่านเข้าสู่โปรแกรม BarberPOS ทันที!',
            'success',
            '🚀'
          );
        }
        prevUserAccountStatusRef.current = acc.status;
        setCurrentUserAccount(acc);
      } else {
        const isSuper = isSuperAdmin(currentUserEmail);
        const newAcc: UserAccount = {
          email: currentUserEmail,
          shopId: getShopIdFromEmail(currentUserEmail),
          status: isSuper ? 'approved' : 'pending',
          role: isSuper ? 'admin' : 'user',
          registeredAt: Date.now(),
          lastLoginAt: Date.now(),
          shopName: 'Unknow Barber shop',
          planName: 'แพ็กเกจรายเดือน',
        };
        saveUserAccountToCloud(newAcc).catch(console.error);
        prevUserAccountStatusRef.current = newAcc.status;
        setCurrentUserAccount(newAcc);
      }
    });

    // 2. If Super Admin (Kunakorn.k66@gmail.com), listen to all registered users
    let unsubAllUsers: (() => void) | null = null;
    if (isSuperAdmin(currentUserEmail)) {
      unsubAllUsers = subscribeToAllUsers((users) => {
        setAllUserAccounts(users);
      });
    }

    return () => {
      unsubUser();
      if (unsubAllUsers) unsubAllUsers();
    };
  }, [currentUserEmail]);

  // Cloud Firestore Sync Listener
  const isInitialCloudSyncRef = useRef(false);

  useEffect(() => {
    if (!currentUserEmail || !currentShopId) return;

    // Test connection initially
    testConnection().then((connected) => {
      setCloudSyncStatus(connected ? 'synced' : 'offline');
    });

    // Subscribe to cloud Firestore changes
    setCloudSyncStatus('syncing');
    const unsubs = subscribeToShopData(currentShopId, {
      onSettings: (cloudSettings) => {
        if (cloudSettings) {
          setSettings(cloudSettings);
          const keys = getTenantStorageKeys(currentShopId);
          localStorage.setItem(keys.SETTINGS, JSON.stringify(cloudSettings));
        }
      },
      onBarbers: (cloudBarbers) => {
        setBarbers(cloudBarbers || []);
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.BARBERS, JSON.stringify(cloudBarbers || []));
      },
      onProducts: (cloudProducts) => {
        setProducts(cloudProducts || []);
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.PRODUCTS, JSON.stringify(cloudProducts || []));
      },
      onBills: (cloudBills) => {
        const normalized = (cloudBills || []).map((b) => ({
          ...b,
          headCount: b.haircutFee > 0 ? (typeof b.headCount === 'number' && b.headCount > 0 ? b.headCount : 1) : 0,
        }));
        setBills(normalized);
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.BILLS, JSON.stringify(normalized));
      },
      onExpenses: (cloudExpenses) => {
        setExpenses(cloudExpenses || []);
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.EXPENSES, JSON.stringify(cloudExpenses || []));
      },
      onQueues: (cloudQueues) => {
        setQueues(cloudQueues || []);
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.QUEUES, JSON.stringify(cloudQueues || []));
      },
    });

    setCloudSyncStatus('synced');

    return () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
    };
  }, [currentUserEmail, currentShopId]);

  // Persist settings locally and to cloud
  const updateSettings = (newSettings: Partial<ShopSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (currentShopId && currentUserEmail) {
        const keys = getTenantStorageKeys(currentShopId);
        try {
          localStorage.setItem(keys.SETTINGS, JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        saveShopSettingsToCloud(currentShopId, currentUserEmail, updated).catch(console.error);
      }
      return updated;
    });
    showToast('บันทึกการตั้งค่าแล้ว', 'อัปเดตข้อมูลและธีมของร้านเรียบร้อย ✨', 'success', '⚙️');
  };

  const setThemeKey = (key: ThemeKey) => {
    updateSettings({ themeId: key });
  };

  const setActiveTab = (tab: TabType) => {
    sounds.playClick();
    setActiveTabState(tab);
  };

  // Barbers operations
  const addBarber = (barberData: Omit<Barber, 'id'>) => {
    const newBarber: Barber = {
      ...barberData,
      id: `barber-${Date.now()}`,
    };
    setBarbers((prev) => {
      const next = [...prev, newBarber];
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.BARBERS, JSON.stringify(next));
        saveDocumentToCloud(currentShopId, 'barbers', newBarber).catch(console.error);
      }
      return next;
    });
    sounds.playSuccess();
    showToast('เพิ่มช่างใหม่สำเร็จ', `ยินดีต้อนรับ ${newBarber.nickname} เข้าสู่ทีม! ✂️💈`, 'success', '🎉');
    return newBarber;
  };

  const updateBarber = (id: string, updates: Partial<Barber>) => {
    setBarbers((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.BARBERS, JSON.stringify(next));
        const updatedBarber = next.find((b) => b.id === id);
        if (updatedBarber) {
          saveDocumentToCloud(currentShopId, 'barbers', updatedBarber).catch(console.error);
        }
      }
      return next;
    });
    sounds.playSuccess();
    showToast('อัปเดตข้อมูลช่างแล้ว', 'บันทึกการแก้ไขโปรไฟล์และส่วนแบ่งเรียบร้อย ✂️', 'success', '👍');
  };

  const deleteBarber = (id: string) => {
    const target = barbers.find((b) => b.id === id);
    setBarbers((prev) => {
      const next = prev.filter((b) => b.id !== id);
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.BARBERS, JSON.stringify(next));
        deleteDocumentFromCloud(currentShopId, 'barbers', id).catch(console.error);
      }
      return next;
    });
    sounds.playDelete();
    showToast('ลบช่างเรียบร้อย', `ลบข้อมูล ${target?.nickname || 'ช่าง'} ออกจากระบบแล้ว`, 'info', '🗑️');
  };

  // Products operations
  const addProduct = (productData: Omit<ProductItem, 'id'>) => {
    const newProd: ProductItem = {
      ...productData,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => {
      const next = [...prev, newProd];
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.PRODUCTS, JSON.stringify(next));
        saveDocumentToCloud(currentShopId, 'products', newProd).catch(console.error);
      }
      return next;
    });
    sounds.playSuccess();
    showToast('เพิ่มสินค้าสำเร็จ', `เพิ่ม ${newProd.name} ในแคตตาล็อกแล้ว 🧴`, 'success', '✨');
    return newProd;
  };

  const updateProduct = (id: string, updates: Partial<ProductItem>) => {
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.PRODUCTS, JSON.stringify(next));
        const updatedProd = next.find((p) => p.id === id);
        if (updatedProd) {
          saveDocumentToCloud(currentShopId, 'products', updatedProd).catch(console.error);
        }
      }
      return next;
    });
    sounds.playSuccess();
    showToast('แก้ไขสินค้าสำเร็จ', 'อัปเดตราคาและสต็อกสินค้าเรียบร้อย 📦', 'success', '👍');
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.PRODUCTS, JSON.stringify(next));
        deleteDocumentFromCloud(currentShopId, 'products', id).catch(console.error);
      }
      return next;
    });
    sounds.playDelete();
    showToast('ลบสินค้าแล้ว', `นำ ${target?.name || 'สินค้า'} ออกจากระบบแล้ว`, 'info', '🗑️');
  };

  // Commission calculation formula
  const calculateCommission = (
    barberId: string,
    haircutFee: number,
    chemicalFee: number,
    productsList: BillProductItem[],
    tipFee: number,
    totalDiscountAmount?: number
  ): BillCommission => {
    const barber = barbers.find((b) => b.id === barberId);
    const haircutRate = barber?.haircutCommissionRate ?? settings.defaultHaircutCommission;
    const chemicalRate = barber?.chemicalCommissionRate ?? settings.defaultChemicalCommission;
    const productRate = barber?.productCommissionRate ?? settings.defaultProductCommission;
    const tipRate = barber?.tipRate ?? settings.defaultTipPolicy;

    const totalProductFee = productsList.reduce((sum, p) => sum + p.total, 0);

    // Barber receives commission on FULL fees (ช่างได้ส่วนแบ่งเต็มเท่าเดิม ไม่โดนหัก)
    const barberHaircutEarned = (haircutFee * haircutRate) / 100;
    const barberChemicalEarned = (chemicalFee * chemicalRate) / 100;
    const barberProductEarned = (totalProductFee * productRate) / 100;
    // ยอดทิปส่งมอบให้ช่าง 100% ไม่นับรวมเป็นรายได้ร้าน
    const barberTipEarned = tipFee;

    const barberServicesCommission = barberHaircutEarned + barberChemicalEarned + barberProductEarned;
    const barberTotalEarned = barberServicesCommission + barberTipEarned;

    // รายได้ร้านมาจากค่าบริการและสินค้าเท่านั้น (ไม่รวมยอดทิป)
    const shopServicesTotal = haircutFee + chemicalFee + totalProductFee;
    const discount = totalDiscountAmount || 0;
    const shopGrossAfterDiscount = Math.max(0, shopServicesTotal - discount);

    // ทางร้านรับผิดชอบส่วนลดเอง (หักออกจากส่วนของร้าน)
    const shopNetEarned = shopGrossAfterDiscount - barberServicesCommission;

    return {
      barberHaircutEarned,
      barberChemicalEarned,
      barberProductEarned,
      barberTipEarned,
      barberTotalEarned,
      shopNetEarned,
    };
  };

  // Add Sale Bill with Head Count
  const addSaleBill = (
    billData: Omit<SaleBill, 'id' | 'billNumber' | 'commission'> & {
      commission?: BillCommission;
      headCount?: number;
    }
  ): SaleBill => {
    const today = new Date();
    let dateCode = `${String(today.getFullYear()).slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(
      today.getDate()
    ).padStart(2, '0')}`;
    if (billData.dateStr) {
      const parts = billData.dateStr.split('-');
      if (parts.length === 3) {
        dateCode = `${parts[0].slice(-2)}${parts[1]}${parts[2]}`;
      }
    }
    let maxSeq = 0;
    for (const b of bills) {
      if (b.billNumber && b.billNumber.startsWith(`B${dateCode}-`)) {
        const parts = b.billNumber.split('-');
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
    const seq = String(maxSeq + 1).padStart(3, '0');
    const billNumber = `B${dateCode}-${seq}`;

    const calculatedCommission =
      billData.commission ||
      calculateCommission(
        billData.barberId,
        billData.haircutFee,
        billData.chemicalFee,
        billData.products,
        billData.tipFee,
        billData.totalDiscountAmount
      );

    let billTimestamp = billData.timestamp;
    if (!billTimestamp || isNaN(billTimestamp) || billTimestamp <= 0) {
      if (billData.dateStr && billData.timeStr) {
        const [y, m, d] = billData.dateStr.split('-').map(Number);
        const clean = billData.timeStr.replace(/[^\d:.]/g, '').replace('.', ':');
        const [hh, mm] = clean.split(':').map(Number);
        const parsedT = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0).getTime();
        billTimestamp = isNaN(parsedT) ? Date.now() : parsedT;
      } else {
        billTimestamp = Date.now();
      }
    }

    const calculatedHeadCount = billData.haircutFee > 0
      ? (typeof billData.headCount === 'number' && billData.headCount > 0 ? billData.headCount : 1)
      : 0;

    const newBill: SaleBill = {
      ...billData,
      id: `bill-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      billNumber,
      timestamp: billTimestamp,
      headCount: calculatedHeadCount,
      commission: calculatedCommission,
    };

    // Deduct stock for sold products
    if (newBill.products && newBill.products.length > 0) {
      setProducts((prev) => {
        const next = prev.map((p) => {
          const soldItem = newBill.products.find((sp) => sp.productId === p.id);
          if (soldItem) {
            const updatedStock = Math.max(0, p.stock - soldItem.quantity);
            const updatedProduct = { ...p, stock: updatedStock };
            if (currentShopId) {
              saveDocumentToCloud(currentShopId, 'products', updatedProduct).catch(console.error);
            }
            return updatedProduct;
          }
          return p;
        });
        if (currentShopId) {
          const keys = getTenantStorageKeys(currentShopId);
          localStorage.setItem(keys.PRODUCTS, JSON.stringify(next));
        }
        return next;
      });
    }

    // Auto complete queue if associated
    if (newBill.queueId) {
      changeQueueStatus(newBill.queueId, 'completed');
    }

    setBills((prev) => {
      const next = [newBill, ...prev];
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.BILLS, JSON.stringify(next));
        saveDocumentToCloud(currentShopId, 'bills', newBill).catch(console.error);
      }
      return next;
    });

    sounds.playCash();
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.75 },
      });
    } catch {}

    const headText = (newBill.headCount && newBill.headCount > 0)
      ? ` (${newBill.headCount} หัว)`
      : (newBill.haircutFee === 0 ? ' (ซื้อสินค้า • ไม่นับหัว 🛍️)' : '');
    showToast(
      'บันทึกยอดขายสำเร็จ 🎉',
      `บิล ${billNumber} ยอด ${settings.currencySymbol}${newBill.grossTotal.toLocaleString()}${headText}`,
      'success',
      '💰'
    );

    return newBill;
  };

  const updateSaleBill = (id: string, updates: Partial<SaleBill>) => {
    setBills((prev) => {
      const next = prev.map((bill) => {
        if (bill.id === id) {
          const updated = { ...bill, ...updates };
          // Ensure headCount is 0 if no haircut fee
          if (updated.haircutFee === 0) {
            updated.headCount = 0;
          } else if (updates.headCount !== undefined) {
            updated.headCount = Math.max(1, updates.headCount);
          } else if (!updated.headCount || updated.headCount < 1) {
            updated.headCount = 1;
          }
          if (updates.dateStr || updates.timeStr) {
            const newDate = updates.dateStr || bill.dateStr;
            const newTime = updates.timeStr || bill.timeStr;
            if (newDate && newTime && !updates.timestamp) {
              const [y, m, d] = newDate.split('-').map(Number);
              const clean = newTime.replace(/[^\d:.]/g, '').replace('.', ':');
              const [hh, mm] = clean.split(':').map(Number);
              const parsedT = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0).getTime();
              if (!isNaN(parsedT) && parsedT > 0) {
                updated.timestamp = parsedT;
              }
            }
          }
          if (!updates.commission) {
            updated.commission = calculateCommission(
              updated.barberId,
              updated.haircutFee,
              updated.chemicalFee,
              updated.products || [],
              updated.tipFee,
              updated.totalDiscountAmount
            );
          }
          if (currentShopId) {
            saveDocumentToCloud(currentShopId, 'bills', updated).catch(console.error);
          }
          return updated;
        }
        return bill;
      });
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.BILLS, JSON.stringify(next));
      }
      return next;
    });
    sounds.playSuccess();
    showToast('แก้ไขข้อมูลบิลแล้ว', 'อัปเดตรายละเอียดบิลยอดขายเรียบร้อย 📄', 'success', '👍');
  };

  const deleteSaleBill = (id: string) => {
    const target = bills.find((b) => b.id === id);
    setBills((prev) => {
      const next = prev.filter((b) => b.id !== id);
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.BILLS, JSON.stringify(next));
        deleteDocumentFromCloud(currentShopId, 'bills', id).catch(console.error);
      }
      return next;
    });
    sounds.playDelete();
    showToast('ลบบิลเรียบร้อย', `ยกเลิกบิล ${target?.billNumber || ''} เรียบร้อยแล้ว`, 'info', '🗑️');
  };

  // Merge / Group multiple bills together (รวมบิลชำระด้วยกัน)
  const mergeSaleBills = (billIds: string[], customGroupName?: string, masterBillId?: string) => {
    if (billIds.length < 2) {
      showToast('ไม่สามารถรวมบิลได้', 'กรุณาเลือกอย่างน้อย 2 บิลเพื่อรวมรายการ', 'warning', '⚠️');
      return;
    }

    const targetBills = bills.filter((b) => billIds.includes(b.id));
    if (targetBills.length < 2) return;

    const groupId = `grp_${Date.now()}`;
    const totalAmount = targetBills.reduce((sum, b) => sum + b.grossTotal, 0);
    const count = targetBills.length;
    const defaultLabel = `${count} รายการนี้ รวมกัน`;
    const finalGroupName = customGroupName?.trim() || defaultLabel;
    const primaryId = masterBillId || targetBills[0].id;

    setBills((prev) => {
      const next = prev.map((bill) => {
        if (billIds.includes(bill.id)) {
          const updated: SaleBill = {
            ...bill,
            mergedGroupId: groupId,
            mergedGroupName: finalGroupName,
            isMergeMaster: bill.id === primaryId,
            mergedBillCount: count,
            mergedTotalAmount: totalAmount,
          };
          if (currentShopId) {
            saveDocumentToCloud(currentShopId, 'bills', updated).catch(console.error);
          }
          return updated;
        }
        return bill;
      });

      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.BILLS, JSON.stringify(next));
      }
      return next;
    });

    sounds.playSuccess();
    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    } catch {}
    showToast(
      'รวมบิลสำเร็จ 🎉',
      `รวม ${count} รายการ ยอดชำระรวม ${settings.currencySymbol}${totalAmount.toLocaleString()}`,
      'success',
      '🔗'
    );
  };

  // Unmerge / Separate grouped bills (ยกเลิกการรวมบิล)
  const unmergeSaleBills = (groupIdOrBillId: string) => {
    const targetBill = bills.find((b) => b.id === groupIdOrBillId || b.mergedGroupId === groupIdOrBillId);
    const targetGroupId = targetBill?.mergedGroupId || groupIdOrBillId;

    setBills((prev) => {
      const next = prev.map((bill) => {
        if (bill.mergedGroupId === targetGroupId || bill.id === groupIdOrBillId) {
          const updated: SaleBill = {
            ...bill,
            mergedGroupId: undefined,
            mergedGroupName: undefined,
            isMergeMaster: undefined,
            mergedBillCount: undefined,
            mergedTotalAmount: undefined,
          };
          if (currentShopId) {
            saveDocumentToCloud(currentShopId, 'bills', updated).catch(console.error);
          }
          return updated;
        }
        return bill;
      });

      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.BILLS, JSON.stringify(next));
      }
      return next;
    });

    sounds.playDelete();
    showToast('ยกเลิกการรวมบิลแล้ว', 'แยกรายการบิลกลับเป็นบิลเดี่ยวตามปกติเรียบร้อย', 'info', '✂️');
  };

  // Expenses operations
  const addExpense = (expenseData: Omit<ShopExpense, 'id' | 'expenseNumber'>): ShopExpense => {
    const today = new Date();
    const dateCode = `${String(today.getFullYear()).slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(
      today.getDate()
    ).padStart(2, '0')}`;
    const expToday = expenses.filter((e) => e.expenseNumber.startsWith(`EXP${dateCode}`));
    const seq = String(expToday.length + 1).padStart(3, '0');
    const expenseNumber = `EXP${dateCode}-${seq}`;

    const newExpense: ShopExpense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      expenseNumber,
    };

    setExpenses((prev) => {
      const next = [newExpense, ...prev];
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.EXPENSES, JSON.stringify(next));
        saveDocumentToCloud(currentShopId, 'expenses', newExpense).catch(console.error);
      }
      return next;
    });

    sounds.playSuccess();
    showToast(
      'บันทึกรายจ่ายสำเร็จ',
      `${newExpense.title} (${settings.currencySymbol}${newExpense.amount.toLocaleString()}) เรียบร้อย 🧾`,
      'success',
      '💸'
    );

    return newExpense;
  };

  const updateExpense = (id: string, updates: Partial<ShopExpense>) => {
    setExpenses((prev) => {
      const next = prev.map((exp) => {
        if (exp.id === id) {
          const updated = { ...exp, ...updates };
          if (currentShopId) {
            saveDocumentToCloud(currentShopId, 'expenses', updated).catch(console.error);
          }
          return updated;
        }
        return exp;
      });
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.EXPENSES, JSON.stringify(next));
      }
      return next;
    });
    sounds.playSuccess();
    showToast('แก้ไขรายจ่ายสำเร็จ', 'อัปเดตรายการรายจ่ายของร้านเรียบร้อย ✏️', 'success', '👍');
  };

  const deleteExpense = (id: string) => {
    const target = expenses.find((e) => e.id === id);
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.EXPENSES, JSON.stringify(next));
        deleteDocumentFromCloud(currentShopId, 'expenses', id).catch(console.error);
      }
      return next;
    });
    sounds.playDelete();
    showToast('ลบรายการรายจ่ายแล้ว', `ลบ ${target?.title || 'รายการ'} เรียบร้อย`, 'info', '🗑️');
  };

  // Queue bookings operations
  const addQueueBooking = (
    queueData: Omit<QueueBooking, 'id' | 'queueNumber' | 'createdAt'>
  ): QueueBooking => {
    const today = new Date();
    const dateCode = `${String(today.getFullYear()).slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(
      today.getDate()
    ).padStart(2, '0')}`;
    const qToday = queues.filter((q) => q.queueNumber.startsWith(`Q${dateCode}`));
    const seq = String(qToday.length + 1).padStart(3, '0');
    const queueNumber = `Q${dateCode}-${seq}`;

    const newQueue: QueueBooking = {
      ...queueData,
      id: `queue-${Date.now()}`,
      queueNumber,
      createdAt: Date.now(),
    };

    setQueues((prev) => {
      const next = [newQueue, ...prev];
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.QUEUES, JSON.stringify(next));
        saveDocumentToCloud(currentShopId, 'queues', newQueue).catch(console.error);
      }
      return next;
    });

    sounds.playSuccess();
    showToast(
      'เพิ่มคิวสำเร็จ 💈',
      `คิว ${queueNumber} คุณ ${newQueue.customerName} (${newQueue.startTime} - ${newQueue.endTime})`,
      'success',
      '📅'
    );

    return newQueue;
  };

  const updateQueueBooking = (id: string, updates: Partial<QueueBooking>) => {
    setQueues((prev) => {
      const next = prev.map((q) => {
        if (q.id === id) {
          const updated = { ...q, ...updates };
          if (currentShopId) {
            saveDocumentToCloud(currentShopId, 'queues', updated).catch(console.error);
          }
          return updated;
        }
        return q;
      });
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.QUEUES, JSON.stringify(next));
      }
      return next;
    });
    sounds.playSuccess();
    showToast('อัปเดตคิวแล้ว', 'บันทึกการแก้ไขคิวจองเรียบร้อย ✨', 'success', '👍');
  };

  const deleteQueueBooking = (id: string) => {
    const target = queues.find((q) => q.id === id);
    setQueues((prev) => {
      const next = prev.filter((q) => q.id !== id);
      if (currentShopId) {
        const keys = getTenantStorageKeys(currentShopId);
        localStorage.setItem(keys.QUEUES, JSON.stringify(next));
        deleteDocumentFromCloud(currentShopId, 'queues', id).catch(console.error);
      }
      return next;
    });
    sounds.playDelete();
    showToast('ลบคิวเรียบร้อย', `ลบคิว ${target?.queueNumber || ''} ออกจากตารางแล้ว`, 'info', '🗑️');
  };

  const changeQueueStatus = (id: string, status: QueueStatus) => {
    updateQueueBooking(id, { status });
  };

  // Modals & UI controls
  const openConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
    icon?: string;
    onConfirm: () => void;
  }) => {
    setConfirmDialog({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      confirmColor: options.confirmColor,
      icon: options.icon,
      onConfirm: options.onConfirm,
    });
  };

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  };

  const openReceiptModal = (bill: SaleBill) => {
    setSelectedBillForReceipt(bill);
  };

  const closeReceiptModal = () => {
    setSelectedBillForReceipt(null);
  };

  const openEditBillModal = (bill: SaleBill) => {
    setEditingBill(bill);
  };

  const closeEditBillModal = () => {
    setEditingBill(null);
  };

  const startPosFromQueue = (queue: QueueBooking) => {
    setPendingQueueToPos(queue);
    setActiveTabState('pos');
    sounds.playClick();
    showToast(
      'ดึงข้อมูลคิวเข้า POS',
      `พร้อมเปิดบิลให้คุณ ${queue.customerName} (${queue.queueNumber})`,
      'info',
      '💈'
    );
  };

  const clearPendingQueueToPos = () => {
    setPendingQueueToPos(null);
  };

  const resetAllDataToSample = () => {
    if (currentShopId) {
      const keys = getTenantStorageKeys(currentShopId);
      localStorage.removeItem(keys.SETTINGS);
      localStorage.removeItem(keys.BARBERS);
      localStorage.removeItem(keys.PRODUCTS);
      localStorage.removeItem(keys.BILLS);
      localStorage.removeItem(keys.EXPENSES);
      localStorage.removeItem(keys.QUEUES);
    }

    setSettings(INITIAL_SETTINGS);
    setBarbers(INITIAL_BARBERS);
    setProducts(INITIAL_PRODUCTS);
    setBills(INITIAL_BILLS);
    setExpenses(INITIAL_EXPENSES);
    setQueues(INITIAL_QUEUES);

    sounds.playSuccess();
    closeConfirm();
    showToast('รีเซ็ตข้อมูลตัวอย่างสำเร็จ', 'ข้อมูลระบบถูกรีเซ็ตเป็นชุดเริ่มต้นพร้อมใช้งานเรียบร้อย 🔄', 'success', '✨');
  };

  const factoryReset = () => {
    if (currentShopId) {
      const keys = getTenantStorageKeys(currentShopId);
      localStorage.removeItem(keys.SETTINGS);
      localStorage.removeItem(keys.BARBERS);
      localStorage.removeItem(keys.PRODUCTS);
      localStorage.removeItem(keys.BILLS);
      localStorage.removeItem(keys.EXPENSES);
      localStorage.removeItem(keys.QUEUES);
    }

    const cleanSettings: ShopSettings = {
      shopName: 'ร้านตัดผมของฉัน',
      shopPhone: '',
      shopAddress: '',
      shopPromptPay: '',
      logoUrl: '',
      currencySymbol: '฿',
      defaultHaircutCommission: 50,
      defaultChemicalCommission: 50,
      defaultProductCommission: 10,
      defaultTipPolicy: 100,
      queueSlotDuration: 45,
      themeId: 'professional-polish',
      receiptFooterMsg: '',
    };

    const starterBarber: Barber[] = [
      {
        id: `barber-${Date.now()}`,
        name: 'ช่างประจำร้าน',
        nickname: 'ช่างประจำร้าน',
        avatar: '💈',
        phone: '',
        color: '#f59e0b',
        haircutCommissionRate: 50,
        chemicalCommissionRate: 50,
        productCommissionRate: 10,
        tipRate: 100,
        active: true,
        notes: '',
      },
    ];

    setSettings(cleanSettings);
    setBarbers(starterBarber);
    setProducts([]);
    setBills([]);
    setExpenses([]);
    setQueues([]);
    setPendingQueueToPos(null);
    setSelectedBillForReceipt(null);
    setEditingBill(null);
    closeConfirm();
    setActiveTabState('pos');

    sounds.playDelete();
    showToast('รีเซ็ตโรงงาน (Factory Reset) สำเร็จ', 'ล้างข้อมูลทั้งหมดในระบบออกเรียบร้อย เหมือนเปิดใช้งานครั้งแรก 🧹', 'info', '🔄');
  };

  return (
    <AppContext.Provider
      value={{
        currentUserEmail,
        currentShopId,
        login,
        logout,
        cloudSyncStatus,
        currentUserAccount,
        isCurrentUserAdmin,
        allUserAccounts,
        isAdminPanelOpen,
        openAdminPanel,
        closeAdminPanel,
        approveUserAccount,
        updateUserAccount,
        blockUserAccount,
        deleteUserAccount,
        createUserAccountManually,
        refreshUserStatus,
        activeTab,
        setActiveTab,
        theme,
        setThemeKey,
        settings,
        updateSettings,
        barbers,
        addBarber,
        updateBarber,
        deleteBarber,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        bills,
        addSaleBill,
        updateSaleBill,
        deleteSaleBill,
        mergeSaleBills,
        unmergeSaleBills,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        queues,
        addQueueBooking,
        updateQueueBooking,
        deleteQueueBooking,
        changeQueueStatus,
        toasts,
        showToast,
        removeToast,
        confirmDialog,
        openConfirm,
        closeConfirm,
        selectedBillForReceipt,
        openReceiptModal,
        closeReceiptModal,
        editingBill,
        openEditBillModal,
        closeEditBillModal,
        pendingQueueToPos,
        startPosFromQueue,
        clearPendingQueueToPos,
        calculateCommission,
        resetAllDataToSample,
        factoryReset,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
