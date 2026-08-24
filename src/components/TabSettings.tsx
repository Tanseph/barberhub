import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Barber, ProductItem, ThemeKey } from '../types';
import { THEMES } from '../utils/theme';
import {
  Store,
  Upload,
  Percent,
  Users,
  ShoppingBag,
  Palette,
  RotateCcw,
  Save,
  Plus,
  Edit,
  Trash2,
  Check,
  Scissors,
  X,
  AlertTriangle,
  ShieldCheck,
  Crown,
  Clock,
  Mail,
  LogOut,
  Calendar,
  Shield,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';
import { sounds } from '../utils/sound';
import { AdminUserManagementSection } from './AdminUserManagementSection';

export const TabSettings: React.FC = () => {
  const {
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
    setThemeKey,
    theme,
    openConfirm,
    resetAllDataToSample,
    factoryReset,
    currentUserEmail,
    currentUserAccount,
    logout,
    isCurrentUserAdmin,
    allUserAccounts,
    openAdminPanel,
    setActiveTab,
    showToast,
  } = useApp();

  const isDark = theme.isDark ?? true;
  const pendingApprovalsCount = allUserAccounts.filter((u) => u.status === 'pending').length;

  // PIN Lock State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);

  // Change PIN Form State
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeError, setPinChangeError] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState('');

  // Shop Info Form State
  const [shopName, setShopName] = useState(settings.shopName);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');

  // Commission Defaults
  const [defaultHaircutCommission, setDefaultHaircutCommission] = useState(
    settings.defaultHaircutCommission
  );
  const [defaultChemicalCommission, setDefaultChemicalCommission] = useState(
    settings.defaultChemicalCommission
  );
  const [defaultProductCommission, setDefaultProductCommission] = useState(
    settings.defaultProductCommission
  );
  const [queueSlotDuration, setQueueSlotDuration] = useState(
    settings.queueSlotDuration
  );

  // Barber Modal State (Add or Edit)
  const [barberModalOpen, setBarberModalOpen] = useState(false);
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null);
  const [barberName, setBarberName] = useState('');
  const [barberNickname, setBarberNickname] = useState('');
  const [barberPhone, setBarberPhone] = useState('');

  // Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState<string>('');
  const [prodStock, setProdStock] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unlock check
  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const correctPin = settings.settingsPin || '1234';

    if (pinInput.trim() === correctPin.trim()) {
      sounds.playSuccess();
      setIsUnlocked(true);
      setPinError('');
      setPinInput('');
    } else {
      sounds.playClick();
      setPinError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      setPinInput('');
    }
  };

  const handleKeypadPress = (digit: string) => {
    sounds.playClick();
    if (pinInput.length < 10) {
      const nextVal = pinInput + digit;
      setPinInput(nextVal);
      setPinError('');
    }
  };

  const handleKeypadBackspace = () => {
    sounds.playClick();
    setPinInput((prev) => prev.slice(0, -1));
    setPinError('');
  };

  const handleKeypadClear = () => {
    sounds.playClick();
    setPinInput('');
    setPinError('');
  };

  // Change PIN handler
  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError('');
    setPinChangeSuccess('');

    const correctCurrentPin = settings.settingsPin || '1234';
    if (currentPinInput.trim() !== correctCurrentPin.trim()) {
      setPinChangeError('รหัสผ่านปัจจุบันไม่ถูกต้อง');
      return;
    }

    if (!newPinInput.trim()) {
      setPinChangeError('กรุณาระบุรหัสผ่านใหม่');
      return;
    }

    if (newPinInput.trim().length < 4) {
      setPinChangeError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setPinChangeError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    updateSettings({ settingsPin: newPinInput.trim() });
    sounds.playSuccess();
    setPinChangeSuccess('เปลี่ยนรหัสผ่านเข้าหน้าตั้งค่าเรียบร้อยแล้ว');
    showToast('เปลี่ยนรหัสผ่านสำเร็จ 🔐', 'รหัสผ่านใหม่มีผลใช้งานทันที', 'success');
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
  };

  // Handle Logo file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLogoUrl(result);
        updateSettings({ logoUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Shop General Settings
  const handleSaveShopSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      shopName: shopName.trim(),
      logoUrl,
      defaultHaircutCommission: Number(defaultHaircutCommission) || 50,
      defaultChemicalCommission: Number(defaultChemicalCommission) || 50,
      defaultProductCommission: Number(defaultProductCommission) || 10,
      queueSlotDuration: Number(queueSlotDuration) || 45,
    });
  };

  // Open Barber Add Modal
  const handleOpenAddBarber = () => {
    setEditingBarberId(null);
    setBarberName('');
    setBarberNickname('');
    setBarberPhone('');
    setBarberModalOpen(true);
  };

  // Open Barber Edit Modal
  const handleOpenEditBarber = (b: Barber) => {
    setEditingBarberId(b.id);
    setBarberName(b.name);
    setBarberNickname(b.nickname);
    setBarberPhone(b.phone || '');
    setBarberModalOpen(true);
  };

  // Save Barber (Create or Edit)
  const handleSaveBarber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberNickname.trim()) return;

    if (editingBarberId) {
      updateBarber(editingBarberId, {
        name: barberName.trim() || barberNickname.trim(),
        nickname: barberNickname.trim(),
        avatar: '💈',
        phone: barberPhone.trim(),
        haircutCommissionRate: settings.defaultHaircutCommission,
        chemicalCommissionRate: settings.defaultChemicalCommission,
        productCommissionRate: settings.defaultProductCommission,
      });
    } else {
      addBarber({
        name: barberName.trim() || `ช่าง${barberNickname.trim()}`,
        nickname: barberNickname.trim(),
        avatar: '💈',
        phone: barberPhone.trim(),
        color: '#f59e0b',
        haircutCommissionRate: settings.defaultHaircutCommission,
        chemicalCommissionRate: settings.defaultChemicalCommission,
        productCommissionRate: settings.defaultProductCommission,
        tipRate: 100,
        active: true,
        notes: '',
      });
    }
    setBarberModalOpen(false);
  };

  // Delete Barber Confirmation
  const handleDeleteBarberClick = (b: Barber) => {
    if (barbers.length <= 1) {
      alert('ต้องมีช่างในระบบอย่างน้อย 1 คนครับ');
      return;
    }
    openConfirm({
      title: 'ต้องการลบช่างคนนี้ใช่หรือไม่? ✂️',
      message: `คุณกำลังจะลบข้อมูลของ "${b.name}" (${b.nickname}) ออกจากระบบ`,
      confirmText: 'ลบช่างเลย',
      cancelText: 'ยกเลิก',
      confirmColor: 'bg-rose-600 hover:bg-rose-500',
      icon: '🗑️',
      onConfirm: () => deleteBarber(b.id),
    });
  };

  // Open Product Add / Edit
  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setProdName('');
    setProdPrice('');
    setProdStock('');
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: ProductItem) => {
    setEditingProductId(p.id);
    setProdName(p.name);
    setProdPrice(p.price ? String(p.price) : '');
    setProdStock(p.stock !== undefined ? String(p.stock) : '');
    setProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    const priceNum = parseFloat(prodPrice) || 0;
    const stockNum = parseInt(prodStock, 10) || 0;

    if (editingProductId) {
      updateProduct(editingProductId, {
        name: prodName.trim(),
        category: 'ทั่วไป',
        price: priceNum,
        stock: stockNum,
        unit: 'ชิ้น',
      });
    } else {
      addProduct({
        name: prodName.trim(),
        category: 'ทั่วไป',
        price: priceNum,
        stock: stockNum,
        unit: 'ชิ้น',
      });
    }
    setProductModalOpen(false);
  };

  // Delete Product Confirmation Popup
  const handleDeleteProductClick = (p: ProductItem) => {
    openConfirm({
      title: 'ต้องการลบสินค้านี้ใช่หรือไม่? 🧴',
      message: `คุณกำลังจะลบรายการสินค้า "${p.name}" (ราคา ฿${p.price.toLocaleString()}) ออกจากระบบ`,
      confirmText: 'ลบสินค้าเลย',
      cancelText: 'ยกเลิก',
      confirmColor: 'bg-rose-600 hover:bg-rose-500',
      icon: '🗑️',
      onConfirm: () => deleteProduct(p.id),
    });
  };

  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';
  const borderSubtle = isDark ? 'border-zinc-800' : 'border-slate-200';
  const inputClass = isDark
    ? 'w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm focus:border-amber-500 focus:outline-none'
    : 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:border-slate-800 focus:outline-none';

  // PIN Gate Screen
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 sm:py-16">
        <div
          className={`rounded-3xl border p-6 sm:p-8 shadow-2xl backdrop-blur-xl ${
            isDark
              ? 'bg-zinc-900/95 border-zinc-800 shadow-black/60 text-zinc-100'
              : 'bg-white border-slate-200 shadow-slate-200/80 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 shadow-lg ${
                isDark
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-amber-500/10'
                  : 'bg-amber-500/15 border border-amber-500/30 text-amber-600 shadow-amber-500/10'
              }`}
            >
              <Lock className="w-8 h-8 stroke-[2.2]" />
            </div>
            <h2 className="text-xl font-black tracking-tight mb-1">
              ระบบความปลอดภัยหน้าตั้งค่า
            </h2>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              กรุณาระบุรหัสผ่านเพื่อเข้าสู่หน้าตั้งค่าและจัดการข้อมูลร้าน
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                รหัสผ่านเข้าหน้าตั้งค่า
              </label>
              <div
                className={`relative flex items-center rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-700 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20'
                    : 'bg-slate-50 border-slate-300 focus-within:border-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-800/10'
                }`}
              >
                <div className="pl-4 pr-2 text-zinc-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPinInput ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError('');
                  }}
                  placeholder="กรุณากรอกรหัสผ่าน"
                  autoFocus
                  className={`w-full py-3.5 pr-10 bg-transparent text-center text-lg font-mono tracking-widest font-bold focus:outline-none ${
                    isDark ? 'text-zinc-100 placeholder:text-zinc-600 placeholder:text-sm' : 'text-slate-900 placeholder:text-slate-400 placeholder:text-sm'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPinInput(!showPinInput)}
                  className="absolute right-3 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
                >
                  {showPinInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {pinError && (
                <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold text-center animate-shake">
                  {pinError}
                </div>
              )}
            </div>

            {/* Visual Numeric Keypad for Mobile / POS Tablet Touchscreens */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className={`py-3 rounded-xl font-mono text-base font-bold transition-all btn-tactile ${
                    isDark
                      ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-xs'
                  }`}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadClear}
                className={`py-3 rounded-xl text-xs font-bold transition-all btn-tactile ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                ล้าง
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className={`py-3 rounded-xl font-mono text-base font-bold transition-all btn-tactile ${
                  isDark
                    ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-xs'
                }`}
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className={`py-3 rounded-xl text-xs font-bold transition-all btn-tactile flex items-center justify-center ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                ⌫ ลบ
              </button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all btn-tactile shadow-md ${
                  isDark
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <Unlock className="w-4 h-4 stroke-[2.2]" />
                <span>ยืนยันรหัสผ่านเพื่อปลดล็อก</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveTab('pos');
                }}
                className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border ${
                  isDark
                    ? 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ยกเลิก / กลับหน้าร้าน (POS)</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Current User Account & Subscription Info (ย้ายมาจากแถบด้านบน) */}
      {currentUserEmail && (
        <div
          className={`p-5 sm:p-6 rounded-2xl border transition-all ${
            isDark
              ? 'bg-zinc-900/90 border-zinc-800'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-inner shrink-0 ${
                  isCurrentUserAdmin
                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-500'
                    : 'bg-sky-500/20 border-sky-500/30 text-sky-500'
                }`}
              >
                {isCurrentUserAdmin ? <Crown className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center flex-wrap gap-2">
                  <span className={`text-sm sm:text-base font-mono font-bold truncate ${headingText}`}>
                    {currentUserEmail}
                  </span>
                  {isCurrentUserAdmin ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-zinc-950">
                      👑 Super Admin
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      ✅ สมาชิกที่ได้รับอนุมัติ
                    </span>
                  )}
                </div>

                <div className={`flex items-center flex-wrap gap-x-4 gap-y-1 text-xs ${mutedText} mt-1`}>
                  {currentUserAccount?.startDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      เริ่ม: {currentUserAccount.startDate}
                    </span>
                  )}
                  {currentUserAccount?.expireDate && (
                    <span className="flex items-center gap-1 font-semibold text-amber-500">
                      <Clock className="w-3.5 h-3.5" />
                      หมดอายุ: {currentUserAccount.expireDate}
                    </span>
                  )}
                  {currentUserAccount?.activeDays !== undefined && (
                    <span className="flex items-center gap-1 font-mono">
                      (คงเหลือ {currentUserAccount.activeDays} วัน)
                    </span>
                  )}
                  {!currentUserAccount?.expireDate && !isCurrentUserAdmin && (
                    <span className="text-zinc-400">แพ็กเกจ: ไม่จำกัดระยะเวลา (ตลอดชีพ)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setIsUnlocked(false);
                  showToast('ล็อกหน้าตั้งค่าแล้ว 🔒', 'ต้องระบุรหัสผ่านเมื่อต้องการเข้าใช้งานอีกครั้ง', 'info');
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isDark
                    ? 'bg-zinc-800/80 hover:bg-zinc-700 text-amber-400 border-zinc-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                }`}
                title="ล็อกหน้าตั้งค่าทันที"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>ล็อกหน้าตั้งค่า</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  openConfirm({
                    title: 'ออกจากระบบ / สลับบัญชี',
                    message: `คุณต้องการออกจากระบบบัญชี ${currentUserEmail} หรือไม่?`,
                    confirmText: 'ออกจากระบบ',
                    confirmColor: 'bg-rose-600 hover:bg-rose-700 text-white',
                    onConfirm: logout,
                  });
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isDark
                    ? 'bg-zinc-800/80 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-400 border-zinc-700 text-zinc-300'
                    : 'bg-slate-100 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 border-slate-200 text-slate-700'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากระบบ / สลับบัญชี</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SaaS Admin Management Section (For Super Admin Kunakorn.k66@gmail.com) */}
      {isCurrentUserAdmin && <AdminUserManagementSection />}

      {/* 1. SHOP IDENTITY & LOGO */}
      <form onSubmit={handleSaveShopSettings} className="space-y-6">
        <div className={`${theme.bgCard} rounded-2xl p-5 sm:p-6 space-y-5 transition-all`}>
          <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle}`}>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-600" />
              <h3 className={`text-base font-bold ${headingText}`}>
                1. ข้อมูลร้าน & โลโก้ (Shop Profile)
              </h3>
            </div>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs btn-tactile"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกข้อมูลร้าน</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Logo Upload Section */}
            <div className={`md:col-span-4 flex flex-col items-center justify-center p-5 rounded-xl border text-center ${
              isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`relative w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden mb-3 group ${
                isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-300'
              }`}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Shop Logo" className="w-full h-full object-cover" />
                ) : (
                  <Scissors className="w-10 h-10 text-slate-400 group-hover:scale-110 transition-transform" />
                )}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-xs text-white font-medium"
                >
                  คลิกเพื่อเปลี่ยน
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors btn-tactile flex items-center gap-1 ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>อัปโหลดโลโก้</span>
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl('');
                      updateSettings({ logoUrl: '' });
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDark ? 'bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400' : 'bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200'
                    }`}
                    title="ลบโลโก้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className={`text-[10px] ${mutedText} mt-2`}>
                รองรับไฟล์ PNG, JPG (ขนาดที่แนะนำ 500x500 px)
              </p>
            </div>

            {/* Shop Fields */}
            <div className="md:col-span-8 flex flex-col justify-center space-y-4">
              <div>
                <label className={`block text-xs font-semibold ${mutedText} mb-1.5`}>
                  ชื่อร้านตัดผม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  required
                  placeholder="เช่น GENTLEMAN BARBER & CO."
                  className={inputClass}
                />
                <p className={`text-xs ${mutedText} mt-1.5`}>
                  ชื่อร้านจะปรากฏบนแถบด้านบนสุด หัวใบเสร็จ และระบบรายงานสรุปยอดขาย
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. DEFAULT COMMISSION & QUEUE DURATION SETTINGS */}
        <div className={`${theme.bgCard} rounded-2xl p-5 sm:p-6 space-y-5 transition-all`}>
          <div className={`flex items-center gap-2 pb-3 border-b ${borderSubtle}`}>
            <Percent className="w-5 h-5 text-emerald-600" />
            <h3 className={`text-base font-bold ${headingText}`}>
              2. ตั้งค่าส่วนแบ่งช่างเริ่มต้น & เวลาจองคิว
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Haircut Commission */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
              <label className={`block text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'} mb-2`}>
                💈 ส่วนแบ่งค่าตัดผม (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={defaultHaircutCommission}
                  onChange={(e) => setDefaultHaircutCommission(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border text-emerald-600 font-bold font-mono text-base focus:outline-none text-right ${
                    isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'
                  }`}
                />
                <span className={`${mutedText} font-bold`}>%</span>
              </div>
              <p className={`text-[10px] ${mutedText} mt-1.5`}>เช่น 50% = ช่างได้รับครึ่งหนึ่ง</p>
            </div>

            {/* Chemical Commission */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
              <label className={`block text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'} mb-2`}>
                🧪 ส่วนแบ่งค่าเคมี (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={defaultChemicalCommission}
                  onChange={(e) => setDefaultChemicalCommission(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border text-sky-600 font-bold font-mono text-base focus:outline-none text-right ${
                    isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'
                  }`}
                />
                <span className={`${mutedText} font-bold`}>%</span>
              </div>
              <p className={`text-[10px] ${mutedText} mt-1.5`}>เช่น ยืด ดัด ทำสีผม 50-60%</p>
            </div>

            {/* Product Commission */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
              <label className={`block text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'} mb-2`}>
                🧴 ส่วนแบ่งขายสินค้า (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={defaultProductCommission}
                  onChange={(e) => setDefaultProductCommission(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border text-purple-600 font-bold font-mono text-base focus:outline-none text-right ${
                    isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'
                  }`}
                />
                <span className={`${mutedText} font-bold`}>%</span>
              </div>
              <p className={`text-[10px] ${mutedText} mt-1.5`}>เช่น 10-15% จากยอดขายสินค้า</p>
            </div>

            {/* Queue Slot Duration */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
              <label className={`block text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'} mb-2`}>
                ⏱️ เวลาต่อ 1 คิว (นาที)
              </label>
              <select
                value={queueSlotDuration}
                onChange={(e) => setQueueSlotDuration(Number(e.target.value))}
                className={`w-full px-3 py-2 rounded-lg border font-bold font-mono text-sm focus:outline-none ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-amber-400' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <option value={30}>30 นาที (คิวรวดเร็ว)</option>
                <option value={45}>45 นาที (มาตรฐานบาร์เบอร์)</option>
                <option value={60}>60 นาที (1 ชั่วโมงเต็ม)</option>
                <option value={90}>90 นาที (บริการพรีเมียม)</option>
              </select>
              <p className={`text-[10px] ${mutedText} mt-1.5`}>คำนวณเวลาจองคิวอัตโนมัติ</p>
            </div>
          </div>
        </div>
      </form>

      {/* 3. BARBER MANAGEMENT */}
      <div className={`${theme.bgCard} rounded-2xl p-5 sm:p-6 space-y-4 transition-all`}>
        <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle}`}>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <h3 className={`text-base font-bold ${headingText}`}>
              3. รายชื่อช่างตัดผมในร้าน ({barbers.length} คน)
            </h3>
          </div>
          <button
            type="button"
            onClick={handleOpenAddBarber}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs btn-tactile"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มช่างใหม่</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {barbers.map((b) => (
            <div
              key={b.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                isDark ? 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={`text-base font-bold ${headingText}`}>{b.nickname}</h4>
                  </div>
                </div>

                <div className={`mt-3 py-2 border-t space-y-1 text-xs ${borderSubtle}`}>
                  <div className="flex justify-between">
                    <span className={mutedText}>สถานะช่าง:</span>
                    <span className="font-semibold text-emerald-600">พร้อมให้บริการ</span>
                  </div>
                  {b.phone && (
                    <div className={`flex justify-between text-xs ${mutedText} pt-1`}>
                      <span>เบอร์โทร:</span>
                      <span className="font-mono text-zinc-300">{b.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`mt-3 pt-2.5 border-t ${borderSubtle} flex items-center justify-end gap-2`}>
                <button
                  type="button"
                  onClick={() => handleOpenEditBarber(b)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 btn-tactile ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Edit className="w-3 h-3" />
                  <span>แก้ไข</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBarberClick(b)}
                  className={`p-1.5 rounded-lg transition-colors btn-tactile ${
                    isDark ? 'bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400' : 'bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200'
                  }`}
                  title="ลบช่าง"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. PRODUCT INVENTORY MANAGEMENT */}
      <div className={`${theme.bgCard} rounded-2xl p-5 sm:p-6 space-y-4 transition-all`}>
        <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle}`}>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-purple-600" />
            <h3 className={`text-base font-bold ${headingText}`}>
              4. รายการสินค้าและราคา ({products.length} รายการ)
            </h3>
          </div>
          <button
            type="button"
            onClick={handleOpenAddProduct}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs btn-tactile"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มสินค้าใหม่</span>
          </button>
        </div>

        <div className={`overflow-x-auto rounded-xl border ${borderSubtle}`}>
          <table className="w-full text-left text-xs">
            <thead className={`border-b font-semibold ${
              isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4">ชื่อสินค้า</th>
                <th className="py-3 px-3 text-right">ราคาจำหน่าย</th>
                <th className="py-3 px-3 text-center">คงเหลือในสต็อก</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${borderSubtle} ${
              isDark ? 'bg-zinc-900/60 text-zinc-200' : 'bg-white text-slate-800'
            }`}>
              {products.map((p) => (
                <tr key={p.id} className={isDark ? 'hover:bg-zinc-800/40 transition-colors' : 'hover:bg-slate-50 transition-colors'}>
                  <td className={`py-3 px-4 font-semibold ${headingText}`}>{p.name}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-purple-600">
                    {settings.currencySymbol}{p.price.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    <span className={`px-2.5 py-1 rounded font-bold ${
                      isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditProduct(p)}
                        className={`p-1.5 rounded-lg transition-colors btn-tactile ${
                          isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        title="แก้ไขสินค้า"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProductClick(p)}
                        className={`p-1.5 rounded-lg transition-colors btn-tactile ${
                          isDark ? 'bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400' : 'bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                        }`}
                        title="ลบสินค้า"
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
      </div>

      {/* 5. THEME CUSTOMIZATION STUDIO (WHITE EDITIONS) */}
      <div className={`${theme.bgCard} rounded-2xl p-5 sm:p-6 space-y-5 transition-all`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${borderSubtle}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold ${headingText}`}>
                  5. สตูดิโอธีมสีสว่าง & สไตล์โปรแกรม (White Edition Themes)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  8 สไตล์โทนขาว
                </span>
              </div>
              <p className={`text-xs ${mutedText}`}>
                เลือกเฉดสีโทนสว่างและสะอาดตา (Light/White Mode) เพื่อเปลี่ยนบรรยากาศของระบบตามเอกลักษณ์ของร้าน
              </p>
            </div>
          </div>
        </div>

        {/* 8 Curated Light Themes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(
            [
              'clean-minimal',
              'warm-amber-gold',
              'royal-sapphire',
              'nordic-sage',
              'rose-elegance',
              'vintage-terracotta',
              'violet-luxury',
              'japanese-zen',
            ] as ThemeKey[]
          ).map((themeKeyId) => {
            const t = THEMES[themeKeyId];
            if (!t) return null;
            const isCurrent = settings.themeId === t.id || (settings.themeId === 'professional-polish' && t.id === 'clean-minimal');

            return (
              <div
                key={t.id}
                onClick={() => {
                  sounds.playClick();
                  setThemeKey(t.id);
                  showToast('เปลี่ยนธีมร้านค้าแล้ว 🎨', `ใช้งานธีม "${t.name}" เรียบร้อย`, 'success', '✨');
                }}
                className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 btn-tactile ${
                  isCurrent
                    ? 'border-slate-900 bg-white shadow-md ring-2 ring-slate-900/10'
                    : 'border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  {/* Header Row: Swatch & Name */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full border-2 border-white shadow-xs shrink-0"
                        style={{ backgroundColor: t.colorSwatch }}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {t.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {t.nameEn}
                        </p>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white flex items-center gap-1 shrink-0 shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>ใช้อยู่</span>
                      </span>
                    )}
                  </div>

                  {/* Badge */}
                  <div className="mb-2.5">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                      {t.badge}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">
                    {t.description}
                  </p>
                </div>

                {/* Color Palette Preview Ribbon */}
                <div className="pt-2.5 border-t border-slate-200/80">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                    <span>ตัวอย่างสีธีม</span>
                    <span className="font-mono text-[10px] text-slate-400">Light UI</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-6 rounded-lg p-1 bg-slate-100 border border-slate-200/80">
                    <div
                      className="rounded shadow-2xs"
                      style={{ backgroundColor: t.colorSwatch }}
                      title="สีหลัก (Primary Accent)"
                    />
                    <div
                      className="rounded bg-white border border-slate-200/80 shadow-2xs"
                      title="การ์ดพื้นหลัง (Surface White)"
                    />
                    <div
                      className="rounded shadow-2xs"
                      style={{ backgroundColor: `${t.colorSwatch}25` }}
                      title="สีอ่อน (Soft Badge)"
                    />
                    <div
                      className="rounded shadow-2xs"
                      style={{ backgroundColor: '#0f172a' }}
                      title="ตัวอักษรเข้มชัด (Dark Typography)"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. SETTINGS PIN CODE MANAGEMENT */}
      <div className={`${theme.bgCard} rounded-2xl p-5 sm:p-6 space-y-4 transition-all`}>
        <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle}`}>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className={`text-base font-bold ${headingText}`}>
                6. ความปลอดภัย & รหัสผ่านหน้าตั้งค่า (Settings PIN Code)
              </h3>
              <p className={`text-xs ${mutedText}`}>
                กำหนดรหัสผ่านสำหรับเข้าหน้าตั้งค่าร้าน เพื่อป้องกันไม่ให้บุคคลภายนอกหรือพนักงานแก้ไขข้อมูลร้านค้า
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleChangePinSubmit} className="space-y-4 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${headingText}`}>
                รหัสผ่านปัจจุบัน <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={currentPinInput}
                onChange={(e) => setCurrentPinInput(e.target.value)}
                placeholder="กรอกรหัสปัจจุบัน"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${headingText}`}>
                รหัสผ่านใหม่ <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                placeholder="รหัสใหม่ (อย่างน้อย 4 ตัว)"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${headingText}`}>
                ยืนยันรหัสใหม่ <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={confirmPinInput}
                onChange={(e) => setConfirmPinInput(e.target.value)}
                placeholder="ยืนยันรหัสใหม่อีกครั้ง"
                className={inputClass}
                required
              />
            </div>
          </div>

          {pinChangeError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
              ⚠️ {pinChangeError}
            </div>
          )}

          {pinChangeSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>{pinChangeSuccess}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all btn-tactile ${
                isDark
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>บันทึกรหัสผ่านใหม่</span>
            </button>
          </div>
        </form>
      </div>

      {/* 7. SYSTEM RESET & FACTORY RESET */}
      <div className="space-y-4">
        {/* Factory Reset (Wipe All Data) */}
        <div className={`p-5 sm:p-6 rounded-2xl border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isDark
            ? 'bg-rose-950/20 border-rose-500/40 text-zinc-100'
            : 'bg-rose-50/80 border-rose-200 text-slate-900 shadow-xs'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold text-rose-600 dark:text-rose-400">
                ล้างข้อมูลระบบทั้งหมด (Reset Factory)
              </h4>
            </div>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-600'} pl-10 leading-relaxed max-w-2xl`}>
              ลบข้อมูลทั้งหมดในโปรแกรมออกอย่างถาวร (รวมถึงบิลขาย ประวัติรายได้ คิวจอง ช่าง สินค้า และการตั้งค่าร้านทั้งหมด) เพื่อให้ระบบสะอาดเหมือนโปรแกรมใหม่แกะกล่อง
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              openConfirm({
                title: '⚠️ ยืนยันการ Reset Factory (ล้างข้อมูลทั้งหมด)?',
                message: 'ข้อมูลบิลขายทั้งหมด, รายการสินค้า, ข้อมูลช่าง, ตารางคิว และการตั้งค่าจะถูกลบออกอย่างถาวร ระบบจะกลับไปเป็นเหมือนเพิ่งติดตั้งโปรแกรมใหม่ คุณแน่ใจหรือไม่?',
                confirmText: 'ยืนยัน Reset Factory',
                cancelText: 'ยกเลิก',
                confirmColor: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md',
                icon: '💥',
                onConfirm: factoryReset,
              });
            }}
            className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg btn-tactile shrink-0 flex items-center gap-2 self-end sm:self-center"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset Factory (ลบข้อมูลทั้งหมด)</span>
          </button>
        </div>

        {/* Demo Data Reset */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div>
            <h5 className={`text-xs font-bold flex items-center gap-1.5 ${headingText}`}>
              <RotateCcw className={`w-3.5 h-3.5 ${mutedText}`} />
              <span>โหลดข้อมูลตัวอย่างเริ่มต้น (Reset to Demo / Sample Data)</span>
            </h5>
            <p className={`text-[11px] ${mutedText} mt-0.5`}>
              หากต้องการดูตัวอย่างการใช้งาน สามารถโหลดชุดข้อมูลจำลอง (ช่าง 4 คน, สินค้า 6 รายการ, บิลตัวอย่าง)
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              openConfirm({
                title: 'ยืนยันการโหลดข้อมูลตัวอย่าง? 🔄',
                message: 'ระบบจะคืนค่าข้อมูลตัวอย่างเริ่มต้นทั้งหมด ซึ่งรวมถึงช่าง สินค้า และบิลตัวอย่าง',
                confirmText: 'โหลดข้อมูลตัวอย่าง',
                cancelText: 'ยกเลิก',
                confirmColor: 'bg-zinc-700 hover:bg-zinc-600 text-white',
                icon: '🔄',
                onConfirm: resetAllDataToSample,
              });
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors btn-tactile shrink-0 ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
            }`}
          >
            โหลดข้อมูลตัวอย่าง
          </button>
        </div>
      </div>

      {/* BARBER ADD/EDIT MODAL */}
      {barberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-6 border ${
            isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle}`}>
              <h3 className={`text-base font-bold ${headingText}`}>
                {editingBarberId ? 'แก้ไขข้อมูลช่าง' : 'เพิ่มช่างตัดผมคนใหม่ ✂️'}
              </h3>
              <button
                onClick={() => setBarberModalOpen(false)}
                className={mutedText}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBarber} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold ${mutedText} mb-1`}>
                  ชื่อเล่นช่าง <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={barberNickname}
                  onChange={(e) => setBarberNickname(e.target.value)}
                  placeholder="เช่น ช่างเอก, ช่างนนท์"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold ${mutedText} mb-1`}>
                  ชื่อเต็ม / นามสกุล
                </label>
                <input
                  type="text"
                  value={barberName}
                  onChange={(e) => setBarberName(e.target.value)}
                  placeholder="เช่น เอกชัย สมบูรณ์ดี"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold ${mutedText} mb-1`}>
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="text"
                  value={barberPhone}
                  onChange={(e) => setBarberPhone(e.target.value)}
                  placeholder="08x-xxx-xxxx"
                  className={`${inputClass} font-mono`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBarberModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 btn-tactile"
                >
                  บันทึกข้อมูลช่าง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT ADD/EDIT MODAL */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-6 border ${
            isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle}`}>
              <h3 className={`text-base font-bold ${headingText}`}>
                {editingProductId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่ในร้าน 🧴'}
              </h3>
              <button
                onClick={() => setProductModalOpen(false)}
                className={mutedText}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold ${mutedText} mb-1`}>
                  ชื่อสินค้า <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="เช่น โพเมดสูตรน้ำ Matte Clay"
                  required
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold ${mutedText} mb-1`}>
                    ราคาจำหน่าย ({settings.currencySymbol}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder=""
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    required
                    className={`${inputClass} font-mono font-bold text-purple-600 text-right`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold ${mutedText} mb-1`}>
                    จำนวนสต็อกคงเหลือ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder=""
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    required
                    className={`${inputClass} font-mono text-right`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 btn-tactile"
                >
                  บันทึกสินค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
