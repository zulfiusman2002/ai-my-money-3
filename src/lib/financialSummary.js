import { supabase } from './supabase';
import { getMonthlyIncome } from './income';

export const currentMonth = () => new Date().toISOString().slice(0, 7);
export const defaultFinancialScope = (profile) => profile?.profile_scope === 'business' ? 'business' : 'household';
const rowScope = (row) => row?.scope || 'household';

export async function resolveFinancialMonth(userId, requestedMonth = currentMonth(), scope = 'household') {
  const { data: requested } = await supabase.from('expenses')
    .select('id, month, scope').eq('user_id', userId).eq('month', requestedMonth);
  if ((requested || []).some((r) => rowScope(r) === scope)) return { month: requestedMonth, isFallback: false };

  const { data: latest } = await supabase.from('expenses')
    .select('month, scope').eq('user_id', userId).order('month', { ascending: false });
  const match = (latest || []).find((r) => rowScope(r) === scope);
  return match?.month
    ? { month: match.month, isFallback: match.month !== requestedMonth }
    : { month: requestedMonth, isFallback: false };
}

export async function getFinancialSummary(userId, requestedMonth = currentMonth(), { fallback = true, scope = 'household' } = {}) {
  const resolved = fallback ? await resolveFinancialMonth(userId, requestedMonth, scope) : { month: requestedMonth, isFallback: false };
  const month = resolved.month;
  const [income, exp, alloc] = await Promise.all([
    getMonthlyIncome(userId, month, scope),
    supabase.from('expenses').select('*').eq('user_id', userId).eq('month', month),
    scope === 'household'
      ? supabase.from('savings_allocations').select('*').eq('user_id', userId).eq('month', month)
      : Promise.resolve({ data: [] }),
  ]);
  const expenses = (exp.data || []).filter((r) => rowScope(r) === scope);
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
    requestedMonth, month, isFallback: resolved.isFallback, scope,
    incomeRows: income.rows, incomeSource: income.source,
    expenses, allocations, byType, byCategory,
    totalIncome, totalExpenses, netSavings,
    savingsRate: totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0,
    allocatedSavings, unallocatedSavings: netSavings - allocatedSavings,
  };
}
