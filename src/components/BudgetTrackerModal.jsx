import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  TrendingDown,
  TrendingUp,
  Calendar,
  Search,
  Trash2,
  Edit2,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  AlertCircle,
  X,
  CheckCircle2,
  Home,
  Truck,
  Package,
  Stethoscope,
  Users,
  Wheat,
  Leaf,
  Layers,
  ShoppingBag,
  Zap,
  Droplets,
  Wifi,
  Milk,
  UserCheck,
  Sparkles,
  Circle,
  Disc,
  Box,
  Shield,
  User,
  Settings2,
  DollarSign
} from 'lucide-react';
import {
  getBudgetEntries,
  addBudgetEntry,
  updateBudgetEntry,
  deleteBudgetEntry,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_UNITS,
  formatCurrencyLBP,
  formatCurrencyUSD
} from '../services/budgetService';

export function getCategoryIcon(categoryName, isIncome = false, size = 15) {
  const list = isIncome ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
  const match = list.find((c) => c.nameAr === categoryName || c.nameEn === categoryName);
  const iconName = match?.icon;

  switch (iconName) {
    case 'Home': return <Home size={size} />;
    case 'Truck': return <Truck size={size} />;
    case 'Package': return <Package size={size} />;
    case 'Stethoscope': return <Stethoscope size={size} />;
    case 'Users': return <Users size={size} />;
    case 'Wheat': return <Wheat size={size} />;
    case 'Leaf':
    case 'Feather': return <Leaf size={size} />;
    case 'Layers': return <Layers size={size} />;
    case 'ShoppingBag': return <ShoppingBag size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'Droplets': return <Droplets size={size} />;
    case 'Wifi': return <Wifi size={size} />;
    case 'Milk': return <Milk size={size} />;
    case 'UserCheck': return <UserCheck size={size} />;
    case 'Coffee': return <Milk size={size} />;
    case 'Sparkles': return <Sparkles size={size} />;
    case 'Circle': return <Circle size={size} />;
    case 'Disc': return <Disc size={size} />;
    case 'Box': return <Box size={size} />;
    case 'Shield': return <Shield size={size} />;
    case 'TrendingUp': return <TrendingUp size={size} />;
    case 'User': return <User size={size} />;
    default: return isIncome ? <TrendingUp size={size} /> : <ShoppingBag size={size} />;
  }
}

export function getCategoryEnglishName(categoryName, isIncome = false) {
  const list = isIncome ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
  const match = list.find((c) => c.nameAr === categoryName || c.nameEn === categoryName);
  return match ? match.nameEn : categoryName;
}

export default function BudgetTrackerModal({
  onClose,
  session = null,
  isDemoMode = false,
  requireAdmin = (fn) => fn(),
  showToast = () => {}
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'expense' | 'income'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Currency View Mode: 'split' (separate USD and LBP as entered) vs 'all_usd' (all converted to USD)
  const [currencyMode, setCurrencyMode] = useState('split');

  // Exchange rate (Default: 90,000 L.L. per 1 USD)
  const [exchangeRate, setExchangeRate] = useState(() => {
    const saved = localStorage.getItem('farm_budget_exchange_rate');
    return saved ? parseFloat(saved) || 90000 : 90000;
  });
  const [showRateModal, setShowRateModal] = useState(false);
  const [customRateInput, setCustomRateInput] = useState(String(exchangeRate));

  // Pull-to-dismiss gesture state
  const [pullY, setPullY] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = 0;
    }
  };

  const handleTouchMove = (e) => {
    if (touchStartY.current > 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;
      if (diff > 0) {
        setPullY(Math.min(diff * 0.45, 120));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullY > 65) {
      handleAnimatedClose();
    } else {
      setPullY(0);
    }
    touchStartY.current = 0;
  };

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };
  
  // Month selector - format: 'YYYY-MM' or 'ALL'
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Add / Edit Entry Form Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    entry_type: 'expense',
    date: new Date().toISOString().split('T')[0],
    category: DEFAULT_EXPENSE_CATEGORIES[0].nameAr,
    custom_category: '',
    usd_amount: '',
    lbp_amount: '',
    unit: 'USD',
    comments: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Confirm Modal
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load entries from Supabase
  const loadEntries = async () => {
    setLoading(true);
    const data = await getBudgetEntries();
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    loadEntries();
  }, []);

  // Compute available months from data
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    monthsSet.add(currentMonthStr);
    entries.forEach((e) => {
      if (e.date) {
        monthsSet.add(e.date.substring(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [entries, currentMonthStr]);

  // Format month name for display
  const formatMonthName = (monthStr) => {
    if (monthStr === 'ALL') return 'All Time';
    const [y, m] = monthStr.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedMonth !== 'ALL') {
        if (!e.date || !e.date.startsWith(selectedMonth)) return false;
      }
      if (activeTab !== 'all' && e.entry_type !== activeTab) {
        return false;
      }
      if (selectedCategory !== 'ALL' && e.category !== selectedCategory) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const cat = (e.category || '').toLowerCase();
        const comments = (e.comments || '').toLowerCase();
        const date = (e.date || '').toLowerCase();
        const engName = getCategoryEnglishName(e.category, e.entry_type === 'income').toLowerCase();
        return cat.includes(query) || comments.includes(query) || date.includes(query) || engName.includes(query);
      }
      return true;
    });
  }, [entries, selectedMonth, activeTab, selectedCategory, searchTerm]);

  // Totals calculation (Both Separate raw USD/LBP and Converted USD)
  const totals = useMemo(() => {
    let incomeUSD = 0;
    let incomeLBP = 0;
    let expenseUSD = 0;
    let expenseLBP = 0;

    const monthEntries = selectedMonth === 'ALL' 
      ? entries 
      : entries.filter((e) => e.date && e.date.startsWith(selectedMonth));

    monthEntries.forEach((e) => {
      const usd = parseFloat(e.usd_amount) || 0;
      const lbp = parseFloat(e.lbp_amount) || 0;
      if (e.entry_type === 'income') {
        incomeUSD += usd;
        incomeLBP += lbp;
      } else {
        expenseUSD += usd;
        expenseLBP += lbp;
      }
    });

    // Separate calculations
    const netUSD = incomeUSD - expenseUSD;
    const netLBP = incomeLBP - expenseLBP;

    // Converted to all USD @ rate
    const rate = exchangeRate > 0 ? exchangeRate : 90000;
    const convertedIncomeAllUSD = incomeUSD + (incomeLBP / rate);
    const convertedExpenseAllUSD = expenseUSD + (expenseLBP / rate);
    const convertedNetAllUSD = convertedIncomeAllUSD - convertedExpenseAllUSD;

    return {
      incomeUSD,
      incomeLBP,
      expenseUSD,
      expenseLBP,
      netUSD,
      netLBP,
      convertedIncomeAllUSD,
      convertedExpenseAllUSD,
      convertedNetAllUSD,
      count: monthEntries.length
    };
  }, [entries, selectedMonth, exchangeRate]);

  // Tab counts that remain stable when toggling tabs
  const tabCounts = useMemo(() => {
    const baseList = selectedMonth === 'ALL'
      ? entries
      : entries.filter((e) => e.date && e.date.startsWith(selectedMonth));

    return {
      all: baseList.length,
      expense: baseList.filter((e) => e.entry_type === 'expense').length,
      income: baseList.filter((e) => e.entry_type === 'income').length
    };
  }, [entries, selectedMonth]);

  // Open Form for Create
  const handleOpenCreate = (defaultType = null, defaultCategory = null) => {
    const determinedType = defaultType || (activeTab === 'income' ? 'income' : 'expense');
    
    let determinedCategory = defaultCategory;
    if (!determinedCategory && selectedCategory !== 'ALL') {
      determinedCategory = selectedCategory;
    }
    if (!determinedCategory) {
      determinedCategory = determinedType === 'income' 
        ? DEFAULT_INCOME_CATEGORIES[0].nameAr 
        : DEFAULT_EXPENSE_CATEGORIES[0].nameAr;
    }

    setEditingEntry(null);
    setFormData({
      entry_type: determinedType,
      date: new Date().toISOString().split('T')[0],
      category: determinedCategory,
      custom_category: '',
      usd_amount: '',
      lbp_amount: '',
      unit: 'USD',
      comments: ''
    });
    setFormError('');
    setShowFormModal(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (entry) => {
    setEditingEntry(entry);
    const isPredefined = (entry.entry_type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES)
      .some((c) => c.nameAr === entry.category);

    setFormData({
      entry_type: entry.entry_type || 'expense',
      date: entry.date || new Date().toISOString().split('T')[0],
      category: isPredefined ? entry.category : 'غيرها',
      custom_category: isPredefined ? '' : entry.category,
      usd_amount: entry.usd_amount ? String(entry.usd_amount) : '',
      lbp_amount: entry.lbp_amount ? String(entry.lbp_amount) : '',
      unit: entry.unit || 'USD',
      comments: entry.comments || ''
    });
    setFormError('');
    setShowFormModal(true);
  };

  // Save entry (Create or Update)
  const handleSaveForm = async (e) => {
    e.preventDefault();
    setFormError('');

    const usd = parseFloat(formData.usd_amount) || 0;
    const lbp = parseFloat(formData.lbp_amount) || 0;

    if (usd <= 0 && lbp <= 0) {
      setFormError('Please enter an amount in USD or LBP.');
      return;
    }

    const finalCategory = (formData.category === 'غيرها' && formData.custom_category.trim())
      ? formData.custom_category.trim()
      : formData.category;

    const executeSave = async () => {
      setFormSubmitting(true);
      try {
        const payload = {
          entry_type: formData.entry_type,
          date: formData.date,
          category: finalCategory,
          usd_amount: usd,
          lbp_amount: lbp,
          unit: formData.unit || (usd > 0 ? 'USD' : 'LBP'),
          comments: formData.comments
        };

        if (editingEntry) {
          const { data, error } = await updateBudgetEntry(editingEntry.id, payload);
          if (error) throw error;
          setEntries((prev) => prev.map((item) => (item.id === editingEntry.id ? data : item)));
          showToast('Entry updated successfully.');
        } else {
          const { data, error } = await addBudgetEntry(payload);
          if (error) throw error;
          setEntries((prev) => [data, ...prev]);
          showToast('Entry added successfully.');
        }

        setShowFormModal(false);
        setEditingEntry(null);
      } catch (err) {
        setFormError(err.message || 'Failed to save entry. Please try again.');
      } finally {
        setFormSubmitting(false);
      }
    };

    requireAdmin(executeSave);
  };

  // Delete Entry
  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    setDeleteLoading(true);
    try {
      const { error } = await deleteBudgetEntry(entryToDelete.id);
      if (error) throw error;
      setEntries((prev) => prev.filter((item) => item.id !== entryToDelete.id));
      showToast('Entry deleted.');
      setEntryToDelete(null);
    } catch (err) {
      showToast('Failed to delete: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Save exchange rate
  const handleSaveRate = (e) => {
    e.preventDefault();
    const rate = parseFloat(customRateInput);
    if (rate > 0) {
      setExchangeRate(rate);
      localStorage.setItem('farm_budget_exchange_rate', String(rate));
      showToast(`Exchange rate updated: 1 USD = ${rate.toLocaleString()} L.L.`);
      setShowRateModal(false);
    }
  };

  const activeCategoryList = useMemo(() => {
    if (activeTab === 'expense') return DEFAULT_EXPENSE_CATEGORIES;
    if (activeTab === 'income') return DEFAULT_INCOME_CATEGORIES;
    return [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
  }, [activeTab]);

  return (
    <>
      <style>{`
        .budget-tracker-page .ar-text,
        .budget-tracker-page [lang="ar"],
        .budget-tracker-page .arabic-category {
          font-family: 'Tajawal', system-ui, -apple-system, sans-serif !important;
        }
      `}</style>

      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`full-page-animate budget-tracker-page ${isClosing ? 'full-page-close-animate' : ''}`}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#ffffff',
          zIndex: 100,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          transform: pullY > 0 ? `translateY(${pullY}px)` : undefined,
          transition: pullY === 0 ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
        }}
      >
        {/* PULL DOWN HANDLE BAR */}
        <div style={{ padding: '8px 0 2px 0', display: 'flex', justifyContent: 'center', background: '#ffffff', cursor: 'grab' }}>
          <div style={{ width: '42px', height: '5px', borderRadius: '9999px', background: '#cbd5e1' }} />
        </div>

        {/* FULL PAGE HEADER */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: '#ffffff',
            borderBottom: '1px solid var(--border-color)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            zIndex: 10
          }}
        >
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleAnimatedClose}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }}
          >
            <ArrowLeft size={16} /> Back to Settings
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleOpenCreate()}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '36px', padding: '0 14px' }}
            >
              <Plus size={15} />
              <span>Add Entry</span>
            </button>
          </div>
        </div>

        {/* FULL PAGE CONTENT HUB */}
        <div
          style={{
            maxWidth: '600px',
            width: '100%',
            margin: '0 auto',
            padding: '16px 16px 80px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {/* TITLE & PERIOD BAR */}
          <div
            className="card"
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  background: 'var(--primary-light)',
                  border: '1px solid var(--primary-border)',
                  padding: '9px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Wallet size={22} color="var(--primary)" />
              </div>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, lineHeight: 1.2 }}>
                  Farm Budget & Ledger
                </h2>
                <span className="ar-text" style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  سجل المصاريف والمدخول
                </span>
              </div>
            </div>

            {/* MONTH PICKER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="var(--primary)" />
              <select
                className="form-input"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '4px 10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  minWidth: '135px',
                  height: '34px'
                }}
              >
                <option value="ALL">All Time</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthName(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CURRENCY VIEW MODE TOGGLE (Separate USD/LBP vs All in USD) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '4px 2px'
            }}
          >
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setCurrencyMode('split')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: currencyMode === 'split' ? '#ffffff' : 'transparent',
                  color: currencyMode === 'split' ? 'var(--text-main)' : 'var(--text-muted)',
                  boxShadow: currencyMode === 'split' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Separate ($ & L.L.)
              </button>
              <button
                type="button"
                onClick={() => setCurrencyMode('all_usd')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: currencyMode === 'all_usd' ? '#ffffff' : 'transparent',
                  color: currencyMode === 'all_usd' ? 'var(--primary-dark)' : 'var(--text-muted)',
                  boxShadow: currencyMode === 'all_usd' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                All in USD ($)
              </button>
            </div>

            {/* EXCHANGE RATE PILL BUTTON */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setCustomRateInput(String(exchangeRate));
                setShowRateModal(true);
              }}
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '4px 8px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: '#ffffff'
              }}
              title="Set USD / LBP Exchange Rate"
            >
              <Settings2 size={12} color="var(--primary)" />
              <span>1$ = {exchangeRate >= 1000 ? `${(exchangeRate / 1000).toFixed(0)}k` : exchangeRate}</span>
            </button>
          </div>

          {/* FINANCIAL SUMMARY METRIC CARDS */}
          {currencyMode === 'split' ? (
            /* SEPARATE USD AND LBP LIKE BEFORE */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* ROW 1: INCOME & EXPENSES */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* 1. INCOME CARD */}
                <div
                  className="card"
                  style={{
                    padding: '12px 14px',
                    background: '#ffffff',
                    border: '1px solid #bbf7d0',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#15803d' }}>
                      INCOME <span className="ar-text" style={{ fontSize: '11.5px' }}>(المدخول)</span>
                    </span>
                    <div style={{ background: '#dcfce7', padding: '4px', borderRadius: '7px' }}>
                      <ArrowDownLeft size={13} color="#16a34a" />
                    </div>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: '900', color: '#16a34a' }}>
                    {formatCurrencyUSD(totals.incomeUSD)}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {formatCurrencyLBP(totals.incomeLBP)}
                  </div>
                </div>

                {/* 2. EXPENSES CARD */}
                <div
                  className="card"
                  style={{
                    padding: '12px 14px',
                    background: '#ffffff',
                    border: '1px solid #fecaca',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#b91c1c' }}>
                      EXPENSES <span className="ar-text" style={{ fontSize: '11.5px' }}>(المصاريف)</span>
                    </span>
                    <div style={{ background: '#fee2e2', padding: '4px', borderRadius: '7px' }}>
                      <ArrowUpRight size={13} color="#dc2626" />
                    </div>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: '900', color: '#dc2626' }}>
                    {formatCurrencyUSD(totals.expenseUSD)}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {formatCurrencyLBP(totals.expenseLBP)}
                  </div>
                </div>
              </div>

              {/* 3. SEPARATE NET BALANCE / PROFIT CARD */}
              <div
                className="card"
                style={{
                  padding: '14px 16px',
                  background: (totals.netUSD >= 0 && totals.netLBP >= 0) ? '#f0fdf4' : (totals.netUSD < 0 && totals.netLBP < 0) ? '#fef2f2' : '#ffffff',
                  border: `1px solid ${(totals.netUSD >= 0 && totals.netLBP >= 0) ? 'var(--primary-border)' : (totals.netUSD < 0 && totals.netLBP < 0) ? '#fca5a5' : 'var(--border-color)'}`,
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: totals.netUSD >= 0 ? 'var(--primary-dark)' : '#dc2626' }}>
                    NET BALANCE <span className="ar-text">(صافي الميزانية)</span>
                  </span>
                  <div style={{ background: totals.netUSD >= 0 ? '#dcfce7' : '#fee2e2', padding: '4px', borderRadius: '7px' }}>
                    {totals.netUSD >= 0 ? (
                      <TrendingUp size={14} color="var(--primary)" />
                    ) : (
                      <TrendingDown size={14} color="#dc2626" />
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'baseline' }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', display: 'block' }}>USD Balance</span>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: totals.netUSD >= 0 ? 'var(--primary-dark)' : '#dc2626' }}>
                      {totals.netUSD < 0 ? '-' : '+'}{formatCurrencyUSD(Math.abs(totals.netUSD))}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', display: 'block' }}>LBP Balance</span>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: totals.netLBP >= 0 ? '#15803d' : '#dc2626' }}>
                      {totals.netLBP < 0 ? '-' : '+'}{formatCurrencyLBP(Math.abs(totals.netLBP))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ALL CONVERTED IN USD ($) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div
                  className="card"
                  style={{
                    padding: '12px 14px',
                    background: '#ffffff',
                    border: '1px solid #bbf7d0',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#15803d', display: 'block', marginBottom: '4px' }}>
                    TOTAL INCOME ($)
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#16a34a' }}>
                    {formatCurrencyUSD(totals.convertedIncomeAllUSD)}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Combined @ {exchangeRate.toLocaleString()} L.L.
                  </div>
                </div>

                <div
                  className="card"
                  style={{
                    padding: '12px 14px',
                    background: '#ffffff',
                    border: '1px solid #fecaca',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#b91c1c', display: 'block', marginBottom: '4px' }}>
                    TOTAL EXPENSES ($)
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#dc2626' }}>
                    {formatCurrencyUSD(totals.convertedExpenseAllUSD)}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Combined @ {exchangeRate.toLocaleString()} L.L.
                  </div>
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: '14px 16px',
                  background: totals.convertedNetAllUSD >= 0 ? '#f0fdf4' : '#fef2f2',
                  border: `1.5px solid ${totals.convertedNetAllUSD >= 0 ? 'var(--primary-border)' : '#fca5a5'}`,
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: totals.convertedNetAllUSD >= 0 ? 'var(--primary-dark)' : '#dc2626' }}>
                    {totals.convertedNetAllUSD >= 0 ? 'TOTAL NET PROFIT ($)' : 'TOTAL NET LOSS ($)'}
                  </span>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: totals.convertedNetAllUSD >= 0 ? 'var(--primary-dark)' : '#dc2626' }}>
                    {totals.convertedNetAllUSD < 0 ? '-' : '+'}{formatCurrencyUSD(Math.abs(totals.convertedNetAllUSD))}
                  </div>
                </div>
                <div style={{ background: totals.convertedNetAllUSD >= 0 ? '#dcfce7' : '#fee2e2', padding: '10px', borderRadius: '12px' }}>
                  {totals.convertedNetAllUSD >= 0 ? <TrendingUp size={22} color="var(--primary)" /> : <TrendingDown size={22} color="#dc2626" />}
                </div>
              </div>
            </div>
          )}

          {/* FILTER CONTROLS & TABS */}
          <div
            className="card"
            style={{
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {/* TYPE TABS */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setActiveTab('all'); }}
                style={{ flex: 1, padding: '7px', height: '34px' }}
              >
                All ({tabCounts.all})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setActiveTab('expense'); }}
                style={{
                  flex: 1,
                  padding: '7px',
                  height: '34px',
                  background: activeTab === 'expense' ? '#dc2626' : undefined,
                  borderColor: activeTab === 'expense' ? '#dc2626' : undefined
                }}
              >
                Expenses ({tabCounts.expense})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'income' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setActiveTab('income'); }}
                style={{
                  flex: 1,
                  padding: '7px',
                  height: '34px',
                  background: activeTab === 'income' ? '#16a34a' : undefined,
                  borderColor: activeTab === 'income' ? '#16a34a' : undefined
                }}
              >
                Income ({tabCounts.income})
              </button>
            </div>

            {/* SEARCH & CATEGORY FILTER */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '160px', position: 'relative' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search comments, category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '32px', height: '36px', fontSize: '12px' }}
                />
              </div>

              <select
                className="form-input"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ minWidth: '150px', height: '36px', fontSize: '12px', fontWeight: '600' }}
              >
                <option value="ALL">All Categories</option>
                {activeCategoryList.map((c, i) => (
                  <option key={c.id || i} value={c.nameAr}>
                    {c.nameEn} • {c.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TRANSACTIONS LIST */}
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading budget ledger...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div
              className="card"
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                border: '1px dashed var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <FileText size={32} color="var(--text-light)" />
              <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>No Transactions Found</strong>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '280px' }}>
                {selectedCategory !== 'ALL' 
                  ? `No records found under "${getCategoryEnglishName(selectedCategory)}".` 
                  : selectedMonth !== 'ALL' 
                  ? `No records logged for ${formatMonthName(selectedMonth)}.` 
                  : 'No transactions recorded yet.'}
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenCreate(activeTab === 'income' ? 'income' : 'expense', selectedCategory !== 'ALL' ? selectedCategory : null)}
                style={{ marginTop: '4px' }}
              >
                <Plus size={14} /> Add First Entry
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredEntries.map((entry) => {
                const isInc = entry.entry_type === 'income';
                const usd = parseFloat(entry.usd_amount) || 0;
                const lbp = parseFloat(entry.lbp_amount) || 0;
                const engName = getCategoryEnglishName(entry.category, isInc);

                return (
                  <div
                    key={entry.id}
                    className="card"
                    style={{
                      padding: '12px 14px',
                      background: '#ffffff',
                      borderLeft: `4px solid ${isInc ? '#16a34a' : '#dc2626'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* LEFT: Category Icon & Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          background: isInc ? '#ecfdf5' : '#fef2f2',
                          border: `1px solid ${isInc ? '#a7f3d0' : '#fecaca'}`,
                          color: isInc ? '#059669' : '#dc2626',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {getCategoryIcon(entry.category, isInc, 17)}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '13.5px', color: 'var(--text-main)', fontWeight: '700' }}>
                            {engName}
                          </strong>
                          <span className="ar-text" style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            ({entry.category})
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            • {entry.date}
                          </span>
                        </div>

                        {entry.comments && (
                          <p
                            className="ar-text"
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-muted)',
                              marginTop: '2px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {entry.comments}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* RIGHT: Amounts & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ textAlign: 'right' }}>
                        {usd > 0 && (
                          <div style={{ fontSize: '14px', fontWeight: '800', color: isInc ? '#16a34a' : '#dc2626' }}>
                            {isInc ? '+' : '-'}{formatCurrencyUSD(usd)}
                          </div>
                        )}
                        {lbp > 0 && (
                          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>
                            {isInc ? '+' : '-'}{formatCurrencyLBP(lbp)}
                          </div>
                        )}
                      </div>

                      {/* ACTIONS */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => handleOpenEdit(entry)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px', height: '30px', width: '30px', borderRadius: '8px' }}
                          title="Edit Transaction"
                        >
                          <Edit2 size={13} color="var(--text-muted)" />
                        </button>
                        <button
                          onClick={() => setEntryToDelete(entry)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px', height: '30px', width: '30px', borderRadius: '8px', color: '#dc2626' }}
                          title="Delete Transaction"
                        >
                          <Trash2 size={13} color="#dc2626" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RECTANGULAR NATURAL FLOATING ACTION BUTTON */}
        <button
          className="btn btn-primary"
          onClick={() => handleOpenCreate(null, selectedCategory !== 'ALL' ? selectedCategory : null)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 105,
            borderRadius: '12px',
            height: '42px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--primary-glow)',
            fontSize: '13px',
            fontWeight: '700'
          }}
          title="Add Transaction"
        >
          <Plus size={16} />
          <span>Add Entry</span>
        </button>
      </div>

      {/* ADD / EDIT TRANSACTION SUB-MODAL WITH QUICK-TAP CATEGORY CHIPS */}
      {showFormModal && (
        <div
          className="modal-overlay budget-tracker-page"
          onClick={() => setShowFormModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '480px',
              width: '100%',
              maxHeight: '90vh',
              borderRadius: '16px',
              background: '#ffffff',
              boxShadow: 'var(--shadow-lg)',
              overflowY: 'auto'
            }}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {editingEntry ? 'Edit Transaction' : 'Add Transaction'}
              </h3>
              <button className="close-btn" onClick={() => setShowFormModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '16px 20px' }}>
              <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 1. TYPE SELECTOR */}
                <div className="form-group">
                  <label className="form-label">Transaction Type</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${formData.entry_type === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        setFormData({
                          ...formData,
                          entry_type: 'expense',
                          category: DEFAULT_EXPENSE_CATEGORIES[0].nameAr
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: formData.entry_type === 'expense' ? '#dc2626' : undefined,
                        borderColor: formData.entry_type === 'expense' ? '#dc2626' : undefined
                      }}
                    >
                      Expense • <span className="ar-text">مصروف</span>
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${formData.entry_type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        setFormData({
                          ...formData,
                          entry_type: 'income',
                          category: DEFAULT_INCOME_CATEGORIES[0].nameAr
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: formData.entry_type === 'income' ? '#16a34a' : undefined,
                        borderColor: formData.entry_type === 'income' ? '#16a34a' : undefined
                      }}
                    >
                      Income • <span className="ar-text">مدخول</span>
                    </button>
                  </div>
                </div>

                {/* 2. DATE INPUT */}
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                {/* 3. VISUAL QUICK-TAP CATEGORY CHIPS (1-TAP SELECTION WITH ICONS) */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Category</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tap to select</span>
                  </label>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '8px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      padding: '2px'
                    }}
                  >
                    {(formData.entry_type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES).map((c) => {
                      const isSelected = formData.category === c.nameAr;
                      const isIncome = formData.entry_type === 'income';
                      const activeColor = isIncome ? '#059669' : '#dc2626';
                      const activeBg = isIncome ? '#ecfdf5' : '#fef2f2';

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: c.nameAr })}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: `1.5px solid ${isSelected ? activeColor : 'var(--border-color)'}`,
                            background: isSelected ? activeBg : '#ffffff',
                            color: isSelected ? activeColor : 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ color: isSelected ? activeColor : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                            {getCategoryIcon(c.nameAr, isIncome, 15)}
                          </div>
                          <div style={{ minWidth: 0, flex: 1, lineHeight: 1.2 }}>
                            <div style={{ fontSize: '12px', fontWeight: isSelected ? '800' : '600' }}>
                              {c.nameEn}
                            </div>
                            <div className="ar-text" style={{ fontSize: '11px', color: isSelected ? activeColor : 'var(--text-muted)', fontWeight: '600' }}>
                              {c.nameAr}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. CUSTOM CATEGORY IF 'غيرها' */}
                {formData.category === 'غيرها' && (
                  <div className="form-group">
                    <label className="form-label">Custom Category Name</label>
                    <input
                      type="text"
                      className="form-input ar-text"
                      placeholder="e.g. Maintenance, Tools..."
                      value={formData.custom_category}
                      onChange={(e) => setFormData({ ...formData, custom_category: e.target.value })}
                      required
                    />
                  </div>
                )}

                {/* 5. DUAL CURRENCY INPUTS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">USD Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      placeholder="0.00"
                      value={formData.usd_amount}
                      onChange={(e) => setFormData({ ...formData, usd_amount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">LBP Amount (L.L.)</label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      className="form-input"
                      placeholder="0"
                      value={formData.lbp_amount}
                      onChange={(e) => setFormData({ ...formData, lbp_amount: e.target.value })}
                    />
                  </div>
                </div>

                {/* 6. COMMENTS / NOTES */}
                <div className="form-group">
                  <label className="form-label">Comments / Notes</label>
                  <textarea
                    className="form-input ar-text"
                    rows="2"
                    placeholder="e.g. Supplier notes, details..."
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  />
                </div>

                {/* ERROR MESSAGE */}
                {formError && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fee2e2',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '12px',
                      color: '#dc2626',
                      fontWeight: '600'
                    }}
                  >
                    {formError}
                  </div>
                )}

                {/* SUBMIT BUTTONS */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowFormModal(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={formSubmitting}
                    style={{ flex: 2 }}
                  >
                    {formSubmitting ? 'Saving...' : editingEntry ? 'Update' : 'Save Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EXCHANGE RATE SETTINGS MODAL */}
      {showRateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowRateModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 210,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '380px', width: '100%', borderRadius: '16px', padding: '20px', background: '#ffffff', boxShadow: 'var(--shadow-lg)' }}
          >
            <div className="modal-header" style={{ padding: '0 0 12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings2 size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>Exchange Rate Settings</h3>
              </div>
              <button className="close-btn" onClick={() => setShowRateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRate} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
                Set the exchange rate used when viewing "All in USD ($)".
              </p>

              <div className="form-group">
                <label className="form-label">1 USD ($) =</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="500"
                    min="1000"
                    className="form-input"
                    value={customRateInput}
                    onChange={(e) => setCustomRateInput(e.target.value)}
                    required
                    style={{ paddingRight: '45px', fontWeight: '700' }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>
                    L.L.
                  </span>
                </div>
              </div>

              {/* QUICK PRESETS */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[89500, 90000, 95000, 100000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCustomRateInput(String(preset))}
                    style={{ flex: 1, fontSize: '11px', padding: '4px 6px', fontWeight: '600' }}
                  >
                    {preset / 1000}k
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRateModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Save Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {entryToDelete && (
        <div
          className="modal-overlay budget-tracker-page"
          onClick={() => setEntryToDelete(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '380px', width: '100%', borderRadius: '16px', padding: '20px', background: '#ffffff', boxShadow: 'var(--shadow-lg)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#dc2626' }}>
              <AlertCircle size={22} />
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Delete Transaction?</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Are you sure you want to delete this entry (<strong>{getCategoryEnglishName(entryToDelete.category, entryToDelete.entry_type === 'income')}</strong> • <span className="ar-text">{entryToDelete.category}</span> - {entryToDelete.date})?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setEntryToDelete(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => requireAdmin(handleConfirmDelete)}
                disabled={deleteLoading}
                style={{ flex: 1, background: '#dc2626', borderColor: '#dc2626' }}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
