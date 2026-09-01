import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_UNITS,
  formatCurrencyLBP,
  formatCurrencyUSD,
  updateBudgetCategory
} from '../services/budgetService';

describe('Budget Service & Categories', () => {
  it('should define all 13 standard farm expense categories from Excel sheet', () => {
    expect(DEFAULT_EXPENSE_CATEGORIES.length).toBe(13);
    const names = DEFAULT_EXPENSE_CATEGORIES.map((c) => c.nameAr);
    expect(names).toContain('ايجار مزرعة');
    expect(names).toContain('طبابة');
    expect(names).toContain('علف');
    expect(names).toContain('فصة');
    expect(names).toContain('تبن');
    expect(names).toContain('نشارة');
    expect(names).toContain('عامل');
    expect(names).toContain('موتير');
  });

  it('should define all 11 standard farm income categories from Excel sheet', () => {
    expect(DEFAULT_INCOME_CATEGORIES.length).toBe(11);
    const names = DEFAULT_INCOME_CATEGORIES.map((c) => c.nameAr);
    expect(names).toContain('حليب');
    expect(names).toContain('لبن');
    expect(names).toContain('لبنة');
    expect(names).toContain('جبنة');
    expect(names).toContain('مبيع سواعير');
    expect(names).toContain('مدخول جهاد');
    expect(names).toContain('زبل');
  });

  it('should format USD currency correctly', () => {
    expect(formatCurrencyUSD(125.5)).toBe('$125.50');
    expect(formatCurrencyUSD(0)).toBe('$0.00');
    expect(formatCurrencyUSD(1000)).toBe('$1,000.00');
  });

  it('should format LBP currency correctly', () => {
    expect(formatCurrencyLBP(5000000)).toBe('5,000,000 L.L.');
    expect(formatCurrencyLBP(0)).toBe('0 L.L.');
  });

  it('should handle category rename validation errors gracefully', async () => {
    const res1 = await updateBudgetCategory('', 'NewName');
    expect(res1.error).toBeTruthy();

    const res2 = await updateBudgetCategory('OldName', '');
    expect(res2.error).toBeTruthy();
  });
});

