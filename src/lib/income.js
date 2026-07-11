import { supabase } from './supabase';

const rowScope = (row) => row?.scope || 'household';

// Month-aware income. Household and business records are deliberately kept
// separate so business revenue cannot inflate personal affordability.
export async function getMonthlyIncome(userId, month, scope = 'household') {
  const { data: allRecords } = await supabase.from('income_records')
    .select('*').eq('user_id', userId).eq('month', month).order('amount', { ascending: false });
  const records = (allRecords || []).filter((r) => rowScope(r) === scope);
  if (records.length) {
    return { rows: records, total: records.reduce((a, r) => a + Number(r.amount), 0), source: 'records', scope };
  }
  const { data: allStandard } = await supabase.from('income_sources')
    .select('*').eq('user_id', userId).eq('is_active', true).order('amount', { ascending: false });
  const standard = (allStandard || []).filter((r) => rowScope(r) === scope);
  return { rows: standard, total: standard.reduce((a, r) => a + Number(r.amount), 0), source: 'standard', scope };
}

// Copy standard income into a month's records for one financial scope.
export async function materialiseIncome(userId, month, scope = 'household') {
  const [{ data: allStandard }, { data: allExisting }] = await Promise.all([
    supabase.from('income_sources').select('*').eq('user_id', userId).eq('is_active', true),
    supabase.from('income_records').select('*').eq('user_id', userId).eq('month', month),
  ]);
  const standard = (allStandard || []).filter((s) => rowScope(s) === scope);
  const existing = (allExisting || []).filter((r) => rowScope(r) === scope);
  if (!standard.length) return existing;
  const present = new Set(existing.map((r) => r.source_id).filter(Boolean));
  const rows = standard.filter((s) => !present.has(s.id)).map((s) => ({
    user_id: userId, month, name: s.name, amount: s.amount, type: s.type,
    source_id: s.id, scope, entity_id: s.entity_id || null,
  }));
  if (!rows.length) return existing;
  const { data, error } = await supabase.from('income_records').insert(rows).select();
  if (error && error.code !== '23505') throw error;
  return [...existing, ...(data || [])];
}
