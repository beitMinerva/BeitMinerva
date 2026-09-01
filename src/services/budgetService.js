import { supabase } from '../config/supabase';

export const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'rent', nameAr: 'ايجار مزرعة', nameEn: 'Farm Rent', icon: 'Home' },
  { id: 'transport', nameAr: 'نقل', nameEn: 'Transportation', icon: 'Truck' },
  { id: 'raw_materials', nameAr: 'مواد اولية', nameEn: 'Raw Materials', icon: 'Package' },
  { id: 'medical', nameAr: 'طبابة', nameEn: 'Medical & Vet', icon: 'Stethoscope' },
  { id: 'labor', nameAr: 'عامل', nameEn: 'Labor & Wages', icon: 'Users' },
  { id: 'straw', nameAr: 'تبن', nameEn: 'Straw / Hay', icon: 'Wheat' },
  { id: 'alfalfa', nameAr: 'فصة', nameEn: 'Alfalfa', icon: 'Feather' },
  { id: 'shavings', nameAr: 'نشارة', nameEn: 'Wood Shavings', icon: 'Layers' },
  { id: 'feed', nameAr: 'علف', nameEn: 'Feed & Grains', icon: 'ShoppingBag' },
  { id: 'generator', nameAr: 'موتير', nameEn: 'Generator & Fuel', icon: 'Zap' },
  { id: 'water', nameAr: 'مياه', nameEn: 'Water', icon: 'Droplets' },
  { id: 'internet', nameAr: 'انترنت', nameEn: 'Internet', icon: 'Wifi' },
  { id: 'other_exp', nameAr: 'غيرها', nameEn: 'Other Expense', icon: 'MoreHorizontal' }
];

export const DEFAULT_INCOME_CATEGORIES = [
  { id: 'milk', nameAr: 'حليب', nameEn: 'Milk', icon: 'Milk' },
  { id: 'jihad_income', nameAr: 'مدخول جهاد', nameEn: "Jihad's Income", icon: 'UserCheck' },
  { id: 'laban', nameAr: 'لبن', nameEn: 'Laban (Yogurt)', icon: 'Coffee' },
  { id: 'manure', nameAr: 'زبل', nameEn: 'Manure / Fertilizer', icon: 'Sparkles' },
  { id: 'labneh', nameAr: 'لبنة', nameEn: 'Labneh', icon: 'Circle' },
  { id: 'shanklish', nameAr: 'شنكليش', nameEn: 'Shanklish', icon: 'Disc' },
  { id: 'kishk', nameAr: 'كشك', nameEn: 'Kishk', icon: 'Box' },
  { id: 'cheese', nameAr: 'جبنة', nameEn: 'Cheese', icon: 'Shield' },
  { id: 'goat_sales', nameAr: 'مبيع سواعير', nameEn: 'Sale of Kids / Goats', icon: 'TrendingUp' },
  { id: 'souheil', nameAr: 'سهيل', nameEn: 'Souheil', icon: 'User' },
  { id: 'other_inc', nameAr: 'غيرها', nameEn: 'Other Income', icon: 'PlusCircle' }
];

export const DEFAULT_UNITS = ['USD', 'LBP'];

export async function getBudgetEntries() {
  try {
    const { data, error } = await supabase
      .from('farm_budget_entries')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase getBudgetEntries error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('getBudgetEntries exception:', err);
    return [];
  }
}

export async function addBudgetEntry(entry) {
  try {
    const payload = {
      entry_type: entry.entry_type || 'expense',
      date: entry.date || new Date().toISOString().split('T')[0],
      category: entry.category || 'غيرها',
      usd_amount: parseFloat(entry.usd_amount) || 0,
      lbp_amount: parseFloat(entry.lbp_amount) || 0,
      unit: entry.unit || (parseFloat(entry.usd_amount) > 0 ? 'USD' : 'LBP'),
      comments: entry.comments ? entry.comments.trim() : ''
    };

    const { data, error } = await supabase
      .from('farm_budget_entries')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('addBudgetEntry error:', err);
    return { data: null, error: err };
  }
}

export async function updateBudgetEntry(id, updates) {
  try {
    const payload = {
      ...updates,
      usd_amount: updates.usd_amount !== undefined ? parseFloat(updates.usd_amount) || 0 : undefined,
      lbp_amount: updates.lbp_amount !== undefined ? parseFloat(updates.lbp_amount) || 0 : undefined,
      updated_at: new Date().toISOString()
    };

    // Clean undefined keys
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    const { data, error } = await supabase
      .from('farm_budget_entries')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('updateBudgetEntry error:', err);
    return { data: null, error: err };
  }
}

export async function deleteBudgetEntry(id) {
  try {
    const { error } = await supabase
      .from('farm_budget_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('deleteBudgetEntry error:', err);
    return { error: err };
  }
}

export async function updateBudgetCategory(oldCategoryName, newCategoryName, entryType = null) {
  try {
    const trimmedOld = (oldCategoryName || '').trim();
    const trimmedNew = (newCategoryName || '').trim();
    if (!trimmedOld || !trimmedNew) {
      throw new Error('Category name cannot be empty');
    }

    let query = supabase
      .from('farm_budget_entries')
      .update({
        category: trimmedNew,
        updated_at: new Date().toISOString()
      })
      .eq('category', trimmedOld);

    if (entryType && entryType !== 'all') {
      query = query.eq('entry_type', entryType);
    }

    const { data, error } = await query.select();
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('updateBudgetCategory error:', err);
    return { data: null, error: err };
  }
}

export function formatCurrencyLBP(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(num) + ' L.L.';
}

export function formatCurrencyUSD(amount) {
  const num = Number(amount) || 0;
  return '$' + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

