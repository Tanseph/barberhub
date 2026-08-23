import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  XCircle,
  Trash2,
  UserPlus,
  Search,
  Clock,
  Mail,
  Sparkles,
  Calendar,
  X,
  Copy,
  Check,
  Building2,
  Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserAccount, UserAccountStatus, UserRole } from '../types';
import { sounds } from '../utils/sound';
import { ModalEditUserDays } from './ModalEditUserDays';

// Calculate days remaining
function getDaysRemaining(expireDateStr?: string): number | null {
  if (!expireDateStr) return null;
  try {
    const [year, month, day] = expireDateStr.split('-').map(Number);
    const exp = new Date(year, month - 1, day, 23, 59, 59);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function addDays(baseDateStr: string | undefined, daysToAdd: number): string {
  let base = new Date();
  if (baseDateStr) {
    try {
      const [year, month, day] = baseDateStr.split('-').map(Number);
      base = new Date(year, month - 1, day);
    } catch {
      base = new Date();
    }
  }
  base.setDate(base.getDate() + daysToAdd);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const ModalAdminManagement: React.FC = () => {
  const {
    isAdminPanelOpen,
    isCurrentUserAdmin,
    closeAdminPanel,
    allUserAccounts,
    approveUserAccount,
    updateUserAccount,
    blockUserAccount,
    deleteUserAccount,
    createUserAccountManually,
    theme,
    openConfirm,
    showToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [editingUserForDays, setEditingUserForDays] = useState<UserAccount | null>(null);

  // New user form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [newStatus, setNewStatus] = useState<UserAccountStatus>('approved');
  const [newNotes, setNewNotes] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newExpireDate, setNewExpireDate] = useState(addDays(new Date().toISOString().split('T')[0], 30));
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdminPanelOpen || !isCurrentUserAdmin) return null;

  const isDark = theme.isDark;
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const headingText = isDark ? 'text-zinc-100' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-500';

  // Metrics
  const totalUsers = allUserAccounts.length;
  const pendingUsers = allUserAccounts.filter((u) => u.status === 'pending');
  const approvedUsers = allUserAccounts.filter((u) => u.status === 'approved');
  const blockedUsers = allUserAccounts.filter((u) => u.status === 'blocked');

  // Filtered users
  const filteredUsers = allUserAccounts.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      u.email.toLowerCase().includes(term) ||
      (u.shopName && u.shopName.toLowerCase().includes(term)) ||
      (u.notes && u.notes.toLowerCase().includes(term));

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    return u.status === filterStatus;
  });

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    sounds.playClick();
    showToast('คัดลอกอีเมลแล้ว', email, 'info', '📋');
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleQuickAdd30Days = async (user: UserAccount) => {
    sounds.playClick();
    const todayStr = new Date().toISOString().split('T')[0];
    const currentExp = user.expireDate;
    const base = currentExp && currentExp >= todayStr ? currentExp : (user.startDate || todayStr);
    const newExp = addDays(base, 30);
    const daysRem = getDaysRemaining(newExp);

    await updateUserAccount(user.email, {
      startDate: user.startDate || todayStr,
      expireDate: newExp,
      activeDays: daysRem !== null && daysRem > 0 ? daysRem : undefined,
      status: 'approved',
    });

    sounds.playSuccess();
    showToast('บวกวันใช้งาน +30 วันสำเร็จ', `${user.email} หมดอายุวันที่ ${newExp}`, 'success', '⚡');
  };

  const handleApprove = async (user: UserAccount) => {
    sounds.playSuccess();
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultExp = user.expireDate || addDays(todayStr, 30);
    await approveUserAccount(user.email, {
      startDate: user.startDate || todayStr,
      expireDate: defaultExp,
    });
    showToast('อนุมัติผู้ใช้สำเร็จ', `${user.email} สามารถเข้าใช้งานระบบได้แล้ว (+30 วัน)`, 'success', '✅');
  };

  const handleBlock = async (user: UserAccount) => {
    sounds.playClick();
    openConfirm({
      title: 'ระงับการใช้งาน',
      message: `คุณต้องการระงับสิทธิ์ของ ${user.email} หรือไม่? ผู้ใช้จะไม่สามารถเข้าสู่ระบบและบันทึกข้อมูลได้`,
      confirmText: 'ระงับสิทธิ์',
      confirmColor: 'bg-rose-600 hover:bg-rose-700 text-white',
      onConfirm: async () => {
        await blockUserAccount(user.email);
        showToast('ระงับสิทธิ์สำเร็จ', `${user.email} ถูกระงับการใช้งาน`, 'warning', '🚫');
      },
    });
  };

  const handleDelete = (user: UserAccount) => {
    sounds.playDelete();
    openConfirm({
      title: 'ลบผู้ใช้ออกจากระบบ',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลบัญชีของ ${user.email}? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      confirmText: 'ลบออกจากระบบ',
      confirmColor: 'bg-rose-600 hover:bg-rose-700 text-white',
      onConfirm: async () => {
        await deleteUserAccount(user.email);
        showToast('ลบผู้ใช้สำเร็จ', `ลบ ${user.email} เรียบร้อยแล้ว`, 'info', '🗑️');
      },
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      showToast('อีเมลไม่ถูกต้อง', 'กรุณาระบุอีเมลที่ถูกต้อง', 'error', '⚠️');
      return;
    }

    setIsSubmitting(true);
    try {
      const daysRem = getDaysRemaining(newExpireDate);
      await createUserAccountManually(
        clean,
        newRole,
        newStatus,
        newNotes,
        {
          startDate: newStartDate,
          expireDate: newExpireDate,
          activeDays: daysRem !== null && daysRem > 0 ? daysRem : undefined,
        }
      );
      sounds.playSuccess();
      showToast('เพิ่มผู้ใช้งานสำเร็จ', `สร้างและเปิดสิทธิ์ให้ ${clean} เรียบร้อย`, 'success', '🎉');
      setNewEmail('');
      setNewShopName('');
      setNewNotes('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกผู้ใช้ได้', 'error', '❌');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${cardBg}`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between gap-4 ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-base sm:text-lg font-black tracking-tight ${headingText}`}>
                  จัดการสมาชิกและวันใช้งาน (Member & Subscription)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-zinc-950">
                  SUPER ADMIN
                </span>
              </div>
              <p className={`text-xs ${mutedText}`}>
                อนุมัติสิทธิ์, เพิ่มวันใช้งาน (+30 วัน), และกำหนดระยะเวลาการเป็นสมาชิก
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playClick();
                setShowAddForm(!showAddForm);
              }}
              className="px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-sm flex items-center gap-1.5 btn-tactile shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddForm ? 'ปิดแบบฟอร์ม' : 'เพิ่มอีเมลใหม่'}</span>
            </button>
            <button
              onClick={closeAdminPanel}
              className={`p-2 rounded-xl border transition-colors btn-tactile ${
                isDark ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add User Form Drawer */}
        {showAddForm && (
          <form
            onSubmit={handleCreateUser}
            className={`p-4 border-b animate-fadeIn space-y-3 ${
              isDark ? 'bg-zinc-950/80 border-amber-500/30' : 'bg-amber-50/50 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between pb-1 border-b border-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> เพิ่มอีเมลและเปิดสิทธิ์การใช้งาน
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                  Email ผู้ใช้งาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="เช่น barber.shop@gmail.com"
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${
                    isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                  วันที่เริ่มต้นใช้งาน
                </label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${
                    isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                  วันหมดอายุ (+30 วัน)
                </label>
                <input
                  type="date"
                  value={newExpireDate}
                  onChange={(e) => setNewExpireDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold text-amber-500 ${
                    isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className={`block text-[11px] font-bold mb-1 ${mutedText}`}>
                    สถานะ
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as UserAccountStatus)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="approved">✅ อนุมัติทันที (Active)</option>
                    <option value="pending">⏳ รอการอนุมัติ (Pending)</option>
                    <option value="blocked">🚫 ระงับการใช้งาน (Blocked)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? '...' : 'บันทึก'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Compact Toolbar: Search Bar + Filter Tabs */}
        <div className={`p-3 sm:p-4 border-b flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
          isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-slate-50/70 border-slate-200'
        }`}>
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาอีเมล, ร้านค้า..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-amber-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterStatus === 'all'
                  ? isDark
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'bg-slate-900 text-white shadow-sm'
                  : isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>ทั้งหมด ({totalUsers})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterStatus === 'pending'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : pendingUsers.length > 0
                  ? isDark
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                    : 'bg-amber-50 text-amber-900 border border-amber-300'
                  : isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>รออนุมัติ ({pendingUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterStatus === 'approved'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ใช้งานได้ ({approvedUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('blocked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterStatus === 'blocked'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>ระงับ ({blockedUsers.length})</span>
            </button>
          </div>
        </div>

        {/* High-Density Users Table / List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40 p-0">
          {filteredUsers.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Users className={`w-10 h-10 mx-auto ${mutedText} opacity-40`} />
              <p className={`text-sm font-semibold ${headingText}`}>ไม่พบข้อมูลสมาชิก</p>
              <p className={`text-xs ${mutedText}`}>ไม่มีสมาชิกตามเงื่อนไขที่เลือก หรือเพิ่มสิทธิ์อีเมลใหม่</p>
            </div>
          ) : (
            filteredUsers.map((user, idx) => {
              const isPending = user.status === 'pending';
              const isApproved = user.status === 'approved';
              const isBlockedStatus = user.status === 'blocked';
              const isAdmin = user.role === 'admin';
              const daysRemaining = getDaysRemaining(user.expireDate);
              const isExpired = daysRemaining !== null && daysRemaining <= 0;

              return (
                <div
                  key={user.email}
                  className={`p-3 sm:px-4 sm:py-2.5 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 sm:gap-3 ${
                    isPending
                      ? isDark
                        ? 'bg-amber-500/10 hover:bg-amber-500/15'
                        : 'bg-amber-50 hover:bg-amber-100/70'
                      : idx % 2 === 0
                      ? isDark
                        ? 'bg-zinc-900/40 hover:bg-zinc-800/50'
                        : 'bg-white hover:bg-slate-50'
                      : isDark
                      ? 'bg-zinc-950/40 hover:bg-zinc-800/50'
                      : 'bg-slate-50/60 hover:bg-slate-100/70'
                  }`}
                >
                  {/* Column 1: Member Email & Shop */}
                  <div className="min-w-0 flex-1 flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                      isAdmin
                        ? 'bg-amber-500 text-zinc-950'
                        : isPending
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : isBlockedStatus
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-sky-500/20 text-sky-400'
                    }`}>
                      {isAdmin ? '👑' : user.email.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-mono font-bold text-xs sm:text-sm truncate ${headingText}`}>
                          {user.email}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopyEmail(user.email)}
                          className={`p-0.5 rounded text-xs transition-colors ${
                            copiedEmail === user.email
                              ? 'text-emerald-500'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          title="คัดลอกอีเมล"
                        >
                          {copiedEmail === user.email ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>

                        {isAdmin && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-zinc-950">
                            Admin
                          </span>
                        )}

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.2 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                            isPending
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                              : isBlockedStatus
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isExpired
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isPending
                            ? '⏳ รออนุมัติ'
                            : isBlockedStatus
                            ? '🚫 ระงับสิทธิ์'
                            : isExpired
                            ? '⚠️ หมดอายุแล้ว'
                            : '✅ ปกติ (Active)'}
                        </span>
                      </div>

                      {/* Shop Name & Sub-details */}
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
                        {user.shopName && (
                          <span className="flex items-center gap-1 text-zinc-300 font-medium">
                            <Building2 className="w-3 h-3 text-zinc-500" />
                            {user.shopName}
                          </span>
                        )}
                        {user.notes && (
                          <span className="italic text-zinc-500 text-[10px]">
                            💬 {user.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Dates & Remaining Days */}
                  <div className="flex items-center flex-wrap gap-2 text-xs py-1 md:py-0">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] ${
                      isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className={mutedText}>เริ่ม:</span>
                      <span className={`font-semibold ${headingText}`}>
                        {user.startDate || new Date(user.registeredAt).toLocaleDateString('th-TH')}
                      </span>
                      <span className="text-zinc-500">→</span>
                      <span className={mutedText}>หมด:</span>
                      <span className={`font-bold ${user.expireDate ? (isExpired ? 'text-rose-400' : 'text-amber-400') : 'text-emerald-400'}`}>
                        {user.expireDate || 'ตลอดชีพ'}
                      </span>
                    </div>

                    {/* Days left pill */}
                    {(() => {
                      if (daysRemaining === null) {
                        return (
                          <span className="px-2 py-1 rounded-lg font-bold text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 whitespace-nowrap">
                            🌟 ตลอดชีพ
                          </span>
                        );
                      }
                      if (daysRemaining <= 0) {
                        return (
                          <span className="px-2 py-1 rounded-lg font-bold text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40 whitespace-nowrap animate-pulse">
                            ⛔ หมดอายุแล้ว
                          </span>
                        );
                      }
                      if (daysRemaining <= 7) {
                        return (
                          <span className="px-2 py-1 rounded-lg font-bold text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 whitespace-nowrap">
                            ⚡ เหลือ {daysRemaining} วัน
                          </span>
                        );
                      }
                      return (
                        <span className="px-2 py-1 rounded-lg font-bold text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                          ⚡ เหลือ {daysRemaining} วัน
                        </span>
                      );
                    })()}
                  </div>

                  {/* Column 3: Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 w-full md:w-auto justify-end shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-zinc-800/40">
                    {/* +30 Days Button */}
                    <button
                      type="button"
                      onClick={() => handleQuickAdd30Days(user)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-xs flex items-center gap-1 btn-tactile transition-all"
                      title="ต่ออายุเพิ่ม 30 วันทันที"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+30 วัน</span>
                    </button>

                    {/* Set Dates Button */}
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setEditingUserForDays(user);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-all btn-tactile ${
                        isDark
                          ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                          : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                      }`}
                      title="แก้ไขวันเริ่มต้นและวันหมดอายุ"
                    >
                      <Calendar className="w-3 h-3 text-sky-400" />
                      <span>ตั้งวัน</span>
                    </button>

                    {/* Approve button */}
                    {isPending && (
                      <button
                        onClick={() => handleApprove(user)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1 btn-tactile"
                        title="อนุมัติให้เข้าใช้งาน"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>อนุมัติ</span>
                      </button>
                    )}

                    {/* Block / Unblock Toggle */}
                    {isApproved ? (
                      <button
                        onClick={() => handleBlock(user)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors btn-tactile ${
                          isDark
                            ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                        title="ระงับสิทธิ์ชั่วคราว"
                      >
                        <span>ระงับ</span>
                      </button>
                    ) : isBlockedStatus ? (
                      <button
                        onClick={() => handleApprove(user)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 btn-tactile"
                        title="ปลดระงับสิทธิ์"
                      >
                        <span>ปลดระงับ</span>
                      </button>
                    ) : null}

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(user)}
                      className={`p-1.5 rounded-lg border transition-colors btn-tactile ${
                        isDark
                          ? 'border-zinc-800 hover:border-rose-500/50 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400'
                          : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                      }`}
                      title="ลบอีเมลออกจากระบบ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`p-3 sm:p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs ${
            isDark ? 'border-zinc-800 bg-zinc-950 text-zinc-500' : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ซิงก์ข้อมูลสมาชิกระบบ Cloud Real-time (แสดง {filteredUsers.length} บัญชี)</span>
          </div>
          <button
            onClick={closeAdminPanel}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs border ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Days configuration modal */}
      <ModalEditUserDays
        user={editingUserForDays}
        isOpen={!!editingUserForDays}
        onClose={() => setEditingUserForDays(null)}
        onSave={async (email, updates) => {
          await updateUserAccount(email, updates);
          showToast('บันทึกวันใช้งานสำเร็จ', `อัปเดตวันใช้งานของ ${email} เรียบร้อยแล้ว`, 'success', '📅');
        }}
        isDark={isDark}
      />
    </div>
  );
};
