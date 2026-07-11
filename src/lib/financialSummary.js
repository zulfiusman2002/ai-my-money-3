import { supabase } from './supabase';
import { getMonthlyIncome } from './income';

export const currentMonth = () => new Date().toISOString().slice(0, 7);

export async function resolveFinancialMonth(userId, requestedMonth = currentMonth()) {
  const { data: requested } = await supabase.from('expenses')
    .select('id, month').eq('user_id', userId).eq('month', requestedMonth).limit(1);
  if (requested?.length) return { month: requestedMonth, isFallback: false };

  const { data: latest } = await supabase.from('expenses')
    .select('month').eq('user_id', userId).order('month', { ascending: false }).limit(1);
  return latest?.[0]?.month
    ? { month: latest[0].month, isFallback: latest[0].month !== requestedMonth }
    : { month: requestedMonth, isFallback: false };
}

export async function getFinancialSummary(userId, requestedMonth = currentMonth(), { fallback = true } = {}) {
  const resolved = fallback ? await resolveFinancialMonth(userId, requestedMonth) : { month: requestedMonth, isFallback: false };
  const month = resolved.month;
  const [income, exp, alloc] = await Promise.all([
    getMonthlyIncome(userId, month),
    supabase.from('expenses').select('*').eq('user_id', userId).eq('month', month),
    supabase.from('savings_allocations').select('*').eq('user_id', userId).eq('month', month),
  ]);
  const expenses = exp.data || [];
  const allocations = alloc.data || [];
  const byType = { fixed: 0, variable: 0, 'one-time': 0 };
  const byCategory = {};
  for (const e of expenses) {
    const amount = Number(e.amount || 0);
    byType[e.type] = (byType[e.type] || 0) + amount;
    byCategory[e.category || 'other'] = (byCategory[e.category || 'other'] || 0) + amount;
  }
  const totalExpenses = Object.values(byType).reduce((a, v) => a + v, 0);
  const totalIncome = Number(income.total || 0);
  const netSavings = totalIncome - totalExpenses;
  const allocatedSavings = allocations.reduce((a, x) => a + Number(x.amount || 0), 0);
  return {
    requestedMonth, month, isFallback: resolved.isFallback,
    incomeRows: income.rows, incomeSource: income.source,
    expenses, allocations, byType, byCategory,
    totalIncome, totalExpenses, netSavings,
    savingsRate: totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0,
    allocatedSavings, unallocatedSavings: netSavings - allocatedSavings,
  };
}
