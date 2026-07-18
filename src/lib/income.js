import { supabase } from './supabase';

const rowScope = (row) => row?.scope || 'household';
const safeAmount = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

// Month-aware income. Household and business records stay separate so
// business revenue cannot inflate personal affordability calculations.
export async function getMonthlyIncome(userId, month, scope = 'household') {
  const recordsResponse = await supabase.from('income_records')
    .select('*').eq('user_id', userId).eq('month', month).order('amount', { ascending: false });
  if (recordsResponse.error) throw new Error(`Could not load monthly income: ${recordsResponse.error.message}`);
  const records = (recordsResponse.data || []).filter((r) => rowScope(r) === scope);
  if (records.length) {
    return { rows: records, total: records.reduce((a, r) => a + safeAmount(r.amount), 0), source: 'records', scope };
  }

  const standardResponse = await supabase.from('income_sources')
    .select('*').eq('user_id', userId).eq('is_active', true).order('amount', { ascending: false });
  if (standardResponse.error) throw new Error(`Could not load income sources: ${standardResponse.error.message}`);
  const standard = (standardResponse.data || []).filter((r) => rowScope(r) === scope);
  return { rows: standard, total: standard.reduce((a, r) => a + safeAmount(r.amount), 0), source: 'standard', scope };
}

// Copy standard income into one month's records for a single financial scope.
export async function materialiseIncome(userId, month, scope = 'household') {
  const [standardResponse, existingResponse] = await Promise.all([
    supabase.from('income_sources').select('*').eq('user_id', userId).eq('is_active', true),
    supabase.from('income_records').select('*').eq('user_id', userId).eq('month', month),
  ]);
  if (standardResponse.error) throw new Error(`Could not load standard income: ${standardResponse.error.message}`);
  if (existingResponse.error) throw new Error(`Could not load monthly income: ${existingResponse.error.message}`);
  const standard = (standardResponse.data || []).filter((s) => rowScope(s) === scope);
  const existing = (existingResponse.data || []).filter((r) => rowScope(r) === scope);
  if (!standard.length) return existing;
  const present = new Set(existing.map((r) => r.source_id).filter(Boolean));
  const rows = standard.filter((s) => !present.has(s.id)).map((s) => ({
    user_id: userId, month, name: s.name, amount: safeAmount(s.amount), type: s.type,
    source_id: s.id, scope, entity_id: s.entity_id || null,
  }));
  if (!rows.length) return existing;
  const { data, error } = await supabase.from('income_records').insert(rows).select();
  if (error && error.code !== '23505') throw error;
  return [...existing, ...(data || [])];
}
