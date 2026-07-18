import { supabase } from './supabase';
import { getMonthlyIncome } from './income';

export const currentMonth = () => new Date().toISOString().slice(0, 7);
export const defaultFinancialScope = (profile) => profile?.profile_scope === 'business' ? 'business' : 'household';
const rowScope = (row) => row?.scope || 'household';
const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

function throwIfError(response, label) {
  if (response?.error) throw new Error(`${label}: ${response.error.message}`);
  return response?.data || [];
}

export async function resolveFinancialMonth(userId, requestedMonth = currentMonth(), scope = 'household') {
  const requestedResponse = await supabase.from('expenses')
    .select('id, month, scope').eq('user_id', userId).eq('month', requestedMonth);
  const requested = throwIfError(requestedResponse, 'Could not read the requested budget month');
  if (requested.some((r) => rowScope(r) === scope)) return { month: requestedMonth, isFallback: false };

  const latestResponse = await supabase.from('expenses')
    .select('month, scope').eq('user_id', userId).order('month', { ascending: false });
  const latest = throwIfError(latestResponse, 'Could not find the latest complete budget month');
  const match = latest.find((r) => rowScope(r) === scope);
  return match?.month
    ? { month: match.month, isFallback: match.month !== requestedMonth }
    : { month: requestedMonth, isFallback: false };
}

export async function getFinancialSummary(userId, requestedMonth = currentMonth(), { fallback = true, scope = 'household' } = {}) {
  const resolved = fallback ? await resolveFinancialMonth(userId, requestedMonth, scope) : { month: requestedMonth, isFallback: false };
  const month = resolved.month;
  const [income, expResponse, allocResponse] = await Promise.all([
    getMonthlyIncome(userId, month, scope),
    supabase.from('expenses').select('*').eq('user_id', userId).eq('month', month),
    scope === 'household'
      ? supabase.from('savings_allocations').select('*').eq('user_id', userId).eq('month', month)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const expRows = throwIfError(expResponse, 'Could not load expenses');
  const allocRows = throwIfError(allocResponse, 'Could not load savings allocations');
  const expenses = expRows.filter((r) => rowScope(r) === scope);
  const allocations = allocRows;
  const byType = { fixed: 0, variable: 0, 'one-time': 0 };
  const byCategory = {};
  for (const e of expenses) {
    const amount = Math.max(0, safeNumber(e.amount));
    const type = e.type || 'variable';
    byType[type] = (byType[type] || 0) + amount;
    const category = e.category || 'other';
    byCategory[category] = (byCategory[category] || 0) + amount;
  }
  const totalExpenses = Object.values(byType).reduce((a, v) => a + safeNumber(v), 0);
  const totalIncome = Math.max(0, safeNumber(income.total));
  const netSavings = totalIncome - totalExpenses;
  const allocatedSavings = allocations.reduce((a, x) => a + Math.max(0, safeNumber(x.amount)), 0);
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const completeness = {
    hasIncome: totalIncome > 0,
    hasExpenses: expenses.length > 0,
    hasAllocations: allocations.length > 0,
    status: totalIncome > 0 && expenses.length > 0 ? 'complete' : totalIncome > 0 || expenses.length > 0 ? 'partial' : 'empty',
  };
  return {
    requestedMonth, month, isFallback: resolved.isFallback, scope,
    incomeRows: income.rows || [], incomeSource: income.source,
    expenses, allocations, byType, byCategory,
    totalIncome, totalExpenses, netSavings,
    savingsRate,
    allocatedSavings, unallocatedSavings: netSavings - allocatedSavings,
    completeness,
  };
}
