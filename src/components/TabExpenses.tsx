import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ExpenseCategory, ShopExpense } from '../types';
import { EXPENSE_CATEGORIES } from '../data/mockInitialData';
import {
  Wallet,
  Plus,
  Search,
  Calendar,
  Download,
  Edit2,
  Trash2,
  User,
  X,
  TrendingDown,
  FileText,
  Tag,
  Check,
  ChevronDown,
} from 'lucide-react';
import { sounds } from '../utils/sound';

export const TabExpenses: React.FC = () => {
  const { expenses, addExpense, updateExpense, deleteExpense, barbers, settings, theme, openConfirm, showToast } =
    useApp();

  const isDark = theme.isDark ?? true;

  // Date filters
  const today = new Date();
  const defaultDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
  const defaultMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [dateFilterMode, setDateFilterMode] = useState<'month' | 'today' | 'custom_date' | 'all'>('month');
  const [customDate, setCustomDate] = useState<string>(defaultDateStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonthStr);

  // Category & Search filter
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<ShopExpense | null>(null);

  // Form states (5 core fields only: หมวดหมู่, วันที่, จำนวนเงิน, ผู้เบิกเงิน, หมายเหตุเพิ่มเติม)
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('utilities');
  const [formDate, setFormDate] = useState<string>(defaultDateStr);
  const [formAmount, setFormAmount] = useState<string>('');
  const [formPayee, setFormPayee] = useState<string>('เจ้าของร้าน');
  const [formNotes, setFormNotes] = useState<string>('');

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Date filter
      if (dateFilterMode === 'today' && e.dateStr !== defaultDateStr) return false;
      if (dateFilterMode === 'month' && !e.dateStr.startsWith(selectedMonth)) return false;
      if (dateFilterMode === 'custom_date' && e.dateStr !== customDate) return false;

      // Category filter
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const catMeta = EXPENSE_CATEGORIES.find((c) => c.id === e.category);
        const matchesCategory = catMeta?.name.toLowerCase().includes(q) ?? false;
        const matchesTitle = e.title?.toLowerCase().includes(q) ?? false;
        const matchesNum = e.expenseNumber.toLowerCase().includes(q);
        const matchesPayee = e.payee?.toLowerCase().includes(q) ?? false;
        const matchesRecorded = e.recordedBy?.toLowerCase().includes(q) ?? false;
        const matchesNotes = e.notes?.toLowerCase().includes(q) ?? false;
        return matchesCategory || matchesTitle || matchesNum || matchesPayee || matchesRecorded || matchesNotes;
      }

      return true;
    });
  }, [
    expenses,
    dateFilterMode,
    defaultDateStr,
    selectedMonth,
    customDate,
    categoryFilter,
    searchQuery,
  ]);

  // Financial aggregates
  const totalAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  // Top category
  const topCategory = useMemo(() => {
    if (filteredExpenses.length === 0) return null;
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    let maxCat = '';
    let maxVal = 0;
    Object.entries(catMap).forEach(([cat, val]) => {
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat;
      }
    });
    const meta = EXPENSE_CATEGORIES.find((c) => c.id === maxCat);
    return {
      name: meta?.name.split('/')[0] || maxCat,
      icon: meta?.icon || '🏷️',
      amount: maxVal,
    };
  }, [filteredExpenses]);

  // Open modal for new expense
  const handleOpenAdd = () => {
    sounds.playClick();
    setEditingExpense(null);
    setFormCategory('utilities');
    setFormDate(defaultDateStr);
    setFormAmount('');
    setFormPayee('เจ้าของร้าน');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (expense: ShopExpense) => {
    sounds.playClick();
    setEditingExpense(expense);
    setFormCategory(expense.category);
    setFormDate(expense.dateStr);
    setFormAmount(expense.amount.toString());
    setFormPayee(expense.payee || expense.recordedBy || 'เจ้าของร้าน');
    setFormNotes(expense.notes || '');
    setIsModalOpen(true);
  };

  // Save form (5 fields only)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('จำนวนเงินไม่ถูกต้อง', 'กรุณาระบุจำนวนเงินที่มากกว่า 0', 'warning', '⚠️');
      return;
    }

    const catMeta = EXPENSE_CATEGORIES.find((c) => c.id === formCategory);
    const catTitle = catMeta ? catMeta.name.split('/')[0].trim() : 'ค่าใช้จ่ายร้าน';
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const payload = {
      category: formCategory,
      title: catTitle,
      amount: parsedAmount,
      paymentMethod: (editingExpense?.paymentMethod || 'cash') as 'cash' | 'transfer',
      dateStr: formDate,
      timeStr: editingExpense?.timeStr || currentTimeStr,
      payee: formPayee.trim() || 'เจ้าของร้าน',
      recordedBy: formPayee.trim() || 'เจ้าของร้าน',
      notes: formNotes.trim() || undefined,
      timestamp: new Date(`${formDate}T${editingExpense?.timeStr || currentTimeStr}:00`).getTime(),
    };

    if (editingExpense) {
      updateExpense(editingExpense.id, payload);
      showToast('บันทึกการแก้ไขสำเร็จ 📑', 'อัปเดตข้อมูลรายจ่ายเรียบร้อย', 'success', '✓');
    } else {
      addExpense(payload);
      showToast('บันทึกรายจ่ายสำเร็จ 💸', `บันทึก ${catTitle} ฿${parsedAmount.toLocaleString()} เรียบร้อย`, 'success', '✓');
    }

    setIsModalOpen(false);
  };

  // Delete expense
  const handleDelete = (expense: ShopExpense) => {
    const catMeta = EXPENSE_CATEGORIES.find((c) => c.id === expense.category);
    openConfirm({
      title: 'ลบรายการรายจ่ายนี้? 🗑️',
      message: `คุณต้องการลบ "${catMeta?.name.split('/')[0] || expense.title}" จำนวน ${settings.currencySymbol}${expense.amount.toLocaleString()} ออกจากระบบรายจ่ายใช่หรือไม่?`,
      confirmText: 'ลบรายการนี้',
      cancelText: 'ยกเลิก',
      confirmColor: 'bg-rose-600 hover:bg-rose-500',
      icon: '💸',
      onConfirm: () => {
        deleteExpense(expense.id);
      },
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    sounds.playClick();
    const headers = [
      'เลขที่รายการ',
      'วันที่',
      'หมวดหมู่',
      'จำนวนเงิน (บาท)',
      'ผู้เบิกเงิน',
      'หมายเหตุเพิ่มเติม',
    ];

    const rows = filteredExpenses.map((exp) => {
      const catMeta = EXPENSE_CATEGORIES.find((c) => c.id === exp.category);
      return [
        exp.expenseNumber,
        exp.dateStr,
        `"${catMeta?.name.split('/')[0] || exp.category}"`,
        exp.amount,
        `"${(exp.payee || exp.recordedBy || '').replace(/"/g, '""')}"`,
        `"${(exp.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Shop_Expenses_${dateFilterMode === 'month' ? selectedMonth : dateFilterMode === 'today' ? defaultDateStr : 'all'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ส่งออก CSV สำเร็จ 📑', 'สร้างไฟล์รายงานรายจ่ายเรียบร้อย', 'success', '📥');
  };

  // Active barbers for quick payee selection
  const payeeOptions = [
    'เจ้าของร้าน',
    ...barbers.filter((b) => b.active).map((b) => b.nickname || b.name),
  ];

  // Helper date formatting
  const formatThaiDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = parseInt(parts[2], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[0], 10);
        const thaiMonths = [
          'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
          'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
        ];
        return `${d} ${thaiMonths[m - 1]} ${y}`;
      }
    } catch {}
    return dateStr;
  };

  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const textMuted = isDark ? 'text-zinc-400' : 'text-slate-500';
  const textHeading = isDark ? 'text-zinc-100' : 'text-slate-900';
  const inputBg = isDark
    ? 'bg-zinc-950 border-zinc-700 text-zinc-100 placeholder-zinc-500'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* 1. Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${textHeading}`}>
            <Wallet className="w-5 h-5 text-rose-500" />
            <span>บันทึกรายจ่ายร้าน</span>
          </h2>
          <p className={`text-xs ${textMuted} mt-0.5`}>
            บันทึกค่าน้ำ ค่าไฟ ค่าเช่า อุปกรณ์ และค่าใช้จ่ายทั่วไปของร้าน
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors btn-tactile ${
              isDark
                ? 'bg-zinc-800/80 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>ส่งออก CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all btn-tactile"
          >
            <Plus className="w-4 h-4" />
            <span>+ บันทึกรายจ่าย</span>
          </button>
        </div>
      </div>

      {/* 2. Summary Overview Bar & Date Controls */}
      <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs ${cardBg} space-y-4`}>
        {/* Date Filter Selection Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3.5 dark:border-zinc-800 border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setDateFilterMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateFilterMode === 'month'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setDateFilterMode('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateFilterMode === 'today'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              วันนี้
            </button>
            <button
              onClick={() => setDateFilterMode('custom_date')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateFilterMode === 'custom_date'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ระบุวัน
            </button>
            <button
              onClick={() => setDateFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateFilterMode === 'all'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-2">
            {dateFilterMode === 'month' && (
              <div className="flex items-center gap-2">
                <span className={`text-xs ${textMuted}`}>เลือกเดือน:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            )}

            {dateFilterMode === 'custom_date' && (
              <div className="flex items-center gap-2">
                <span className={`text-xs ${textMuted}`}>เลือกวันที่:</span>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        {/* 3 High-Impact Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total Expense */}
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-rose-50/40 border-rose-100'}`}>
            <span className={`text-xs font-semibold ${textMuted}`}>ยอดรายจ่ายรวม</span>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {settings.currencySymbol}
              {totalAmount.toLocaleString()}
            </div>
          </div>

          {/* Record Count */}
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-xs font-semibold ${textMuted}`}>จำนวนรายการ</span>
            <div className={`text-xl font-bold font-mono ${textHeading} mt-1`}>
              {filteredExpenses.length} <span className="text-xs font-normal">รายการ</span>
            </div>
          </div>

          {/* Top Category */}
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-xs font-semibold ${textMuted}`}>หมวดหมู่สูงสุด</span>
            <div className="text-sm font-bold truncate mt-1 flex items-center gap-1.5">
              {topCategory ? (
                <>
                  <span>{topCategory.icon}</span>
                  <span className={`truncate ${textHeading}`}>{topCategory.name}</span>
                  <span className="text-xs font-mono text-rose-600 dark:text-rose-400">
                    ({settings.currencySymbol}{topCategory.amount.toLocaleString()})
                  </span>
                </>
              ) : (
                <span className={`text-xs font-normal ${textMuted}`}>-</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className={`p-3 rounded-2xl border shadow-xs ${cardBg} flex flex-col sm:flex-row items-center gap-2.5`}>
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input
            type="text"
            placeholder="ค้นหาหมวดหมู่, ผู้เบิกเงิน, หมายเหตุ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 ${inputBg}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="w-full sm:w-60">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 ${inputBg}`}
          >
            <option value="all">📂 ทุกหมวดหมู่รายจ่าย</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name.split('/')[0]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Streamlined Expense Table */}
      <div className={`rounded-2xl border shadow-xs overflow-hidden ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b font-semibold ${isDark ? 'bg-zinc-950/70 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              <tr>
                <th className="py-3 px-4">วันที่</th>
                <th className="py-3 px-4">หมวดหมู่</th>
                <th className="py-3 px-4">ผู้เบิกเงิน</th>
                <th className="py-3 px-4">หมายเหตุเพิ่มเติม</th>
                <th className="py-3 px-4 text-right">จำนวนเงิน</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-slate-100'}`}>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <p className={`text-sm font-semibold ${textHeading}`}>
                        ไม่พบรายการรายจ่าย
                      </p>
                      <p className={`text-xs ${textMuted}`}>
                        กดปุ่ม "+ บันทึกรายจ่าย" เพื่อเพิ่มรายการใหม่
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const catMeta = EXPENSE_CATEGORIES.find((c) => c.id === exp.category);
                  return (
                    <tr
                      key={exp.id}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-zinc-800/30' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className={`font-semibold ${textHeading}`}>
                          {formatThaiDate(exp.dateStr)}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {exp.expenseNumber}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border dark:border-zinc-700 border-slate-200 dark:bg-zinc-800 bg-slate-100">
                          <span>{catMeta?.icon || '🏷️'}</span>
                          <span className={textHeading}>{catMeta?.name.split('/')[0] || exp.title}</span>
                        </span>
                      </td>

                      {/* Payee */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1.5 ${textHeading}`}>
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{exp.payee || exp.recordedBy || 'เจ้าของร้าน'}</span>
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 max-w-xs">
                        {exp.notes ? (
                          <span className={`text-xs ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                            {exp.notes}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {settings.currencySymbol}
                        {exp.amount.toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(exp)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isDark
                                ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot className={`border-t font-semibold ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-left font-bold">
                    รวมทั้งสิ้น ({filteredExpenses.length} รายการ)
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-base text-rose-600 dark:text-rose-400">
                    {settings.currencySymbol}
                    {totalAmount.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 5. Minimalist Add/Edit Modal (5 fields only) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div
            className={`rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-4 border ${cardBg}`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-rose-500" />
                <h3 className={`text-base font-bold ${textHeading}`}>
                  {editingExpense ? 'แก้ไขบันทึกรายจ่าย' : 'บันทึกรายจ่ายใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-xl transition-colors ${textMuted} hover:text-white`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-4">
              {/* Field 1: หมวดหมู่ */}
              <div>
                <label className={`block text-xs font-bold ${textHeading} mb-1.5`}>
                  1. หมวดหมู่รายจ่าย <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 ${inputBg}`}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2 & 3: วันที่ และ จำนวนเงิน */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Field 2: วันที่ */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block text-xs font-bold ${textHeading}`}>
                      2. วันที่ <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormDate(defaultDateStr)}
                      className="text-[11px] text-rose-500 hover:underline font-semibold"
                    >
                      วันนี้
                    </button>
                  </div>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 ${inputBg}`}
                  />
                </div>

                {/* Field 3: จำนวนเงิน */}
                <div>
                  <label className={`block text-xs font-bold ${textHeading} mb-1.5`}>
                    3. จำนวนเงิน (บาท) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-rose-500">
                      ฿
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className={`w-full pl-8 pr-3 py-2.5 rounded-xl border text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 ${inputBg}`}
                    />
                  </div>
                </div>
              </div>

              {/* Field 4: ผู้เบิกเงิน */}
              <div>
                <label className={`block text-xs font-bold ${textHeading} mb-1.5`}>
                  4. ผู้เบิกเงิน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เจ้าของร้าน, ช่างเอก"
                  value={formPayee}
                  onChange={(e) => setFormPayee(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 mb-2 ${inputBg}`}
                />
                {/* Quick Payee Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[11px] ${textMuted}`}>เลือกด่วน:</span>
                  {payeeOptions.map((opt) => (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => setFormPayee(opt)}
                      className={`px-2 py-0.5 rounded-lg border text-[11px] transition-colors ${
                        formPayee === opt
                          ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold'
                          : isDark
                          ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 5: หมายเหตุเพิ่มเติม */}
              <div>
                <label className={`block text-xs font-bold ${textHeading} mb-1.5`}>
                  5. หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ค่าไฟรอบบิล ส.ค., ซื้อใบมีดโกน 5 กล่อง"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 ${inputBg}`}
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t dark:border-zinc-800 border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors btn-tactile ${
                    isDark
                      ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-all btn-tactile"
                >
                  {editingExpense ? 'บันทึกการแก้ไข' : 'บันทึกรายจ่าย'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
