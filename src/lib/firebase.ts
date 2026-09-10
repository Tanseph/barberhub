import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Barber,
  ProductItem,
  SaleBill,
  ShopExpense,
  QueueBooking,
  ShopSettings,
  UserAccount,
} from '../types';

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Skill Standard Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export const SUPER_ADMIN_EMAILS = ['kunakorn.k66@gmail.com'];

export function getUserIdFromEmail(email: string): string {
  const sanitized = email
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  return `user_${sanitized}`;
}

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// Helper to sanitize objects for Firestore (remove undefined fields and invalid values like NaN or Infinity)
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'number') {
    return (isNaN(obj) || !isFinite(obj) ? 0 : obj) as unknown as T;
  }
  if (typeof obj === 'string' || typeof obj === 'boolean') {
    return obj;
  }
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
          cleaned[key] = 0;
        } else {
          cleaned[key] = cleanFirestoreData(value);
        }
      }
    }
    return cleaned as T;
  }
  return obj;
}

// User Account Cloud Functions
export async function getUserAccountFromCloud(email: string): Promise<UserAccount | null> {
  const userId = getUserIdFromEmail(email);
  const docPath = `system_users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'system_users', userId));
    if (snap.exists()) {
      return snap.data() as UserAccount;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, docPath);
    return null;
  }
}

export async function saveUserAccountToCloud(user: UserAccount) {
  const userId = getUserIdFromEmail(user.email);
  const docPath = `system_users/${userId}`;
  try {
    const sanitized = cleanFirestoreData(user);
    await setDoc(doc(db, 'system_users', userId), sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export async function deleteUserAccountFromCloud(email: string) {
  const userId = getUserIdFromEmail(email);
  const docPath = `system_users/${userId}`;
  try {
    await deleteDoc(doc(db, 'system_users', userId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

export function subscribeToAllUsers(callback: (users: UserAccount[]) => void): Unsubscribe {
  try {
    return onSnapshot(
      collection(db, 'system_users'),
      (snap) => {
        const list: UserAccount[] = [];
        snap.forEach((d) => list.push(d.data() as UserAccount));
        callback(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'system_users')
    );
  } catch (e) {
    console.error('Error listening to system_users', e);
    return () => {};
  }
}

export function subscribeToUserAccount(
  email: string,
  callback: (user: UserAccount | null) => void
): Unsubscribe {
  const userId = getUserIdFromEmail(email);
  try {
    return onSnapshot(
      doc(db, 'system_users', userId),
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as UserAccount);
        } else {
          callback(null);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `system_users/${userId}`)
    );
  } catch (e) {
    console.error('Error listening to user doc', e);
    return () => {};
  }
}

// Connection test
export async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, using local cache fallback.');
    }
    return false;
  }
}

// Generate a safe shop ID from an email
export function getShopIdFromEmail(email: string): string {
  const sanitized = email
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  return `shop_${sanitized}`;
}

// Cloud sync services for tenant shop
export interface CloudShopData {
  settings?: ShopSettings;
  barbers?: Barber[];
  products?: ProductItem[];
  bills?: SaleBill[];
  expenses?: ShopExpense[];
  queues?: QueueBooking[];
}

export async function saveShopSettingsToCloud(shopId: string, email: string, settings: ShopSettings) {
  const docPath = `shops/${shopId}`;
  try {
    const payload = cleanFirestoreData({
      id: shopId,
      email,
      shopName: settings.shopName || 'BarberPOS',
      settings,
      updatedAt: Date.now(),
    });
    await setDoc(doc(db, 'shops', shopId), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export async function saveDocumentToCloud<T extends { id: string }>(
  shopId: string,
  subCollection: 'barbers' | 'products' | 'bills' | 'expenses' | 'queues',
  item: T
) {
  const docPath = `shops/${shopId}/${subCollection}/${item.id}`;
  try {
    const sanitized = cleanFirestoreData(item);
    await setDoc(doc(db, 'shops', shopId, subCollection, item.id), sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export async function deleteDocumentFromCloud(
  shopId: string,
  subCollection: 'barbers' | 'products' | 'bills' | 'expenses' | 'queues',
  itemId: string
) {
  const docPath = `shops/${shopId}/${subCollection}/${itemId}`;
  try {
    await deleteDoc(doc(db, 'shops', shopId, subCollection, itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

export async function clearAllShopDataInCloud(shopId: string, currentBarbers: Barber[]) {
  try {
    // Keep clean starter data
    const starterBarbers = currentBarbers.map((b) => cleanFirestoreData(b));
    for (const b of starterBarbers) {
      await setDoc(doc(db, 'shops', shopId, 'barbers', b.id), b);
    }
  } catch (e) {
    console.error('Error clearing cloud shop data', e);
  }
}

// Real-time listener for entire shop workspace
export function subscribeToShopData(
  shopId: string,
  callbacks: {
    onSettings?: (settings: ShopSettings) => void;
    onBarbers?: (barbers: Barber[]) => void;
    onProducts?: (products: ProductItem[]) => void;
    onBills?: (bills: SaleBill[]) => void;
    onExpenses?: (expenses: ShopExpense[]) => void;
    onQueues?: (queues: QueueBooking[]) => void;
  }
): Unsubscribe[] {
  const unsubs: Unsubscribe[] = [];

  // 1. Settings
  try {
    const unsubSettings = onSnapshot(
      doc(db, 'shops', shopId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.settings && callbacks.onSettings) {
            callbacks.onSettings(data.settings as ShopSettings);
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `shops/${shopId}`)
    );
    unsubs.push(unsubSettings);
  } catch (e) {
    console.error('Error listening to shop settings', e);
  }

  // 2. Barbers
  try {
    const unsubBarbers = onSnapshot(
      collection(db, 'shops', shopId, 'barbers'),
      (snap) => {
        if (callbacks.onBarbers) {
          const items: Barber[] = [];
          snap.forEach((d) => items.push(d.data() as Barber));
          callbacks.onBarbers(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `shops/${shopId}/barbers`)
    );
    unsubs.push(unsubBarbers);
  } catch (e) {
    console.error('Error listening to barbers', e);
  }

  // 3. Products
  try {
    const unsubProducts = onSnapshot(
      collection(db, 'shops', shopId, 'products'),
      (snap) => {
        if (callbacks.onProducts) {
          const items: ProductItem[] = [];
          snap.forEach((d) => items.push(d.data() as ProductItem));
          callbacks.onProducts(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `shops/${shopId}/products`)
    );
    unsubs.push(unsubProducts);
  } catch (e) {
    console.error('Error listening to products', e);
  }

  // 4. Bills
  try {
    const unsubBills = onSnapshot(
      collection(db, 'shops', shopId, 'bills'),
      (snap) => {
        if (callbacks.onBills) {
          const items: SaleBill[] = [];
          snap.forEach((d) => items.push(d.data() as SaleBill));
          items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0) || b.billNumber.localeCompare(a.billNumber));
          callbacks.onBills(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `shops/${shopId}/bills`)
    );
    unsubs.push(unsubBills);
  } catch (e) {
    console.error('Error listening to bills', e);
  }

  // 5. Expenses
  try {
    const unsubExpenses = onSnapshot(
      collection(db, 'shops', shopId, 'expenses'),
      (snap) => {
        if (callbacks.onExpenses) {
          const items: ShopExpense[] = [];
          snap.forEach((d) => items.push(d.data() as ShopExpense));
          callbacks.onExpenses(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `shops/${shopId}/expenses`)
    );
    unsubs.push(unsubExpenses);
  } catch (e) {
    console.error('Error listening to expenses', e);
  }

  // 6. Queues
  try {
    const unsubQueues = onSnapshot(
      collection(db, 'shops', shopId, 'queues'),
      (snap) => {
        if (callbacks.onQueues) {
          const items: QueueBooking[] = [];
          snap.forEach((d) => items.push(d.data() as QueueBooking));
          callbacks.onQueues(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `shops/${shopId}/queues`)
    );
    unsubs.push(unsubQueues);
  } catch (e) {
    console.error('Error listening to queues', e);
  }

  return unsubs;
}
