import { handler as wrap, requireUser, json, computeIntelligence } from './_lib/core.js';
import { buildFinancialBrain } from '../../shared/financialBrain.js';

function monthLabel(value) {
  if (!value) return '';
  const date = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export const handler = wrap(async (event) => {
  const { user, db } = await requireUser(event);
  const I = await computeIntelligence(db, user.id);
  const brain = buildFinancialBrain(I);

  const [{ data: snapshots }, { data: recentProgress }, { data: recentAnalyses }] = await Promise.all([
    db.from('monthly_snapshots').select('month,total_income,total_expenses,total_savings,savings_rate,total_invested,total_assets,total_liabilities,net_worth,computed_at')
      .eq('user_id', user.id).order('month', { ascending: false }).limit(12),
    db.from('user_learning_progress').select('completed_at,xp_earned,quiz_correct,learn_lessons(title,learn_modules(title))')
      .eq('user_id', user.id).eq('completed', true).order('completed_at', { ascending: false }).limit(6),
    db.from('ai_analysis').select('analysis_type,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(4),
  ]);

  const timeline = [];
  for (const row of snapshots || []) {
    timeline.push({
      id: `snapshot-${row.month}`,
      date: row.computed_at || `${row.month}-28T12:00:00Z`,
      type: 'snapshot',
      title: `${monthLabel(row.month)} financial snapshot`,
      detail: `Net worth ${I.f(row.net_worth)} · saved ${I.f(row.total_savings)} · savings rate ${Number(row.savings_rate || 0).toFixed(0)}%`,
      value: Number(row.net_worth || 0),
      tone: Number(row.total_savings || 0) >= 0 ? 'positive' : 'risk',
      route: '/app/networth',
    });
  }
  for (const row of recentProgress || []) {
    timeline.push({
      id: `lesson-${row.completed_at}-${row.learn_lessons?.title || ''}`,
      date: row.completed_at,
      type: 'lesson',
      title: `Completed “${row.learn_lessons?.title || 'MoneyMilo lesson'}”`,
      detail: `${row.learn_lessons?.learn_modules?.title || 'MoneyMilo Academy'} · ${Number(row.xp_earned || 0)} XP earned`,
      tone: row.quiz_correct ? 'positive' : 'neutral',
      route: '/app/learn',
    });
  }
  for (const row of recentAnalyses || []) {
    timeline.push({
      id: `analysis-${row.created_at}-${row.analysis_type}`,
      date: row.created_at,
      type: 'analysis',
      title: row.analysis_type === 'chat' ? 'Asked Milo a money question' : `Completed ${String(row.analysis_type || 'financial').replaceAll('-', ' ')} review`,
      detail: 'Milo used the connected financial picture available at that time.',
      tone: 'info',
      route: '/app/advisor',
    });
  }

  timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
  return json(200, {
    brain,
    timeline: timeline.slice(0, 24),
    sourceMonth: I.month,
    triggerCount: I.triggers.length,
  });
});
