const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));
const safe = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

function band(score) {
  if (score >= 85) return { label: 'Excellent', tone: 'positive' };
  if (score >= 70) return { label: 'Strong', tone: 'positive' };
  if (score >= 55) return { label: 'Building', tone: 'caution' };
  if (score >= 40) return { label: 'Needs focus', tone: 'caution' };
  return { label: 'Needs attention', tone: 'risk' };
}

function routeFor(code) {
  const routes = {
    negative_cashflow: '/app/budget',
    low_savings_rate: '/app/budget',
    high_fixed_costs: '/app/budget',
    unallocated_surplus: '/app/goals',
    goals_behind: '/app/goals',
    goal_overcommitment: '/app/goals',
    thin_emergency_fund: '/app/goals',
    high_debt: '/app/networth',
    stale_portfolio: '/app/investments',
    concentrated_portfolio: '/app/investments',
    missing_data: '/app/settings',
    learning_gap: '/app/learn',
  };
  return routes[code] || '/app/advisor';
}

function moduleFor(code) {
  const modules = {
    negative_cashflow: 'Budget', low_savings_rate: 'Budget', high_fixed_costs: 'Budget',
    unallocated_surplus: 'Goals', goals_behind: 'Goals', goal_overcommitment: 'Goals', thin_emergency_fund: 'Goals',
    high_debt: 'Net worth', stale_portfolio: 'Investments', concentrated_portfolio: 'Investments',
    missing_data: 'Settings', learning_gap: 'Learn',
  };
  return modules[code] || 'Ask Milo';
}

export function buildFinancialBrain(I, { now = new Date() } = {}) {
  const budget = I?.budget || {};
  const assets = I?.assets || {};
  const liabilities = I?.liabilities || {};
  const portfolio = I?.portfolio || {};
  const goals = I?.goals || [];
  const learning = I?.learning || {};
  const netWorth = safe(I?.netWorth);
  const gross = safe(portfolio.totalInvested) + safe(assets.totalAssets);
  const monthlyIncome = safe(budget.totalIncome);
  const monthlyExpenses = safe(budget.totalExpenses);
  const monthlySurplus = safe(budget.netSavings);
  const savingsRate = budget.savingsRate == null ? null : safe(budget.savingsRate);
  const emergencyMonths = assets.emergencyMonths == null ? null : safe(assets.emergencyMonths);
  const committedGoals = goals.reduce((sum, goal) => sum + safe(goal.monthly), 0);
  const goalHeadroom = monthlySurplus - committedGoals;
  const goalTrackable = goals.filter((goal) => goal.onTrack !== null);
  const goalsOnTrack = goalTrackable.filter((goal) => goal.onTrack === true).length;
  const goalTrackRate = goalTrackable.length ? goalsOnTrack / goalTrackable.length : (goals.length ? 0.5 : 1);
  const maxClassPct = Math.max(0, ...(portfolio.classMix || []).map((item) => safe(item.pct)));
  const staleCount = (portfolio.staleClasses || []).length;
  const debtBase = Math.max(gross, monthlyIncome * 12, 1);
  const debtRatio = safe(liabilities.totalLiabilities) / debtBase;
  const completeBudget = monthlyIncome > 0 && monthlyExpenses > 0;
  const dataSignals = [completeBudget, gross > 0, goals.length > 0, staleCount === 0];
  const dataConfidence = Math.round(dataSignals.filter(Boolean).length / dataSignals.length * 100);

  const scores = {
    cashflow: savingsRate == null ? 0 : clamp((savingsRate / 30) * 100),
    resilience: emergencyMonths == null ? 25 : clamp((emergencyMonths / 6) * 100),
    debt: clamp((1 - debtRatio / 0.5) * 100),
    goals: clamp(goalTrackRate * 100),
    diversification: portfolio.totalInvested > 0 ? clamp(100 - Math.max(0, maxClassPct - 30) * 2) : 45,
    data: dataConfidence,
    learning: clamp(((safe(learning.streak?.current_streak) / 7) * 60) + Math.min(40, safe(learning.lessonsDone) * 5)),
  };

  const score = Math.round(
    scores.cashflow * 0.25 +
    scores.resilience * 0.18 +
    scores.debt * 0.15 +
    scores.goals * 0.16 +
    scores.diversification * 0.11 +
    scores.data * 0.10 +
    scores.learning * 0.05
  );
  const scoreBand = band(score);

  const findings = [];
  const add = (code, severity, title, detail, value = '') => findings.push({ code, severity, title, detail, value, route: routeFor(code), module: moduleFor(code) });
  if (monthlySurplus < 0) add('negative_cashflow', 'risk', 'Monthly spending is above income', `Your recorded monthly position is ${I.f(Math.abs(monthlySurplus))} short.`, I.f(monthlySurplus));
  else if (savingsRate != null && savingsRate < 10) add('low_savings_rate', 'risk', 'Savings margin is thin', `Only ${savingsRate.toFixed(0)}% of income remains after recorded expenses.`, `${savingsRate.toFixed(0)}%`);
  if (budget.fixedRatio != null && budget.fixedRatio > 60) add('high_fixed_costs', 'warning', 'Fixed costs limit flexibility', `${budget.fixedRatio.toFixed(0)}% of income is committed before variable spending.`, `${budget.fixedRatio.toFixed(0)}%`);
  if (emergencyMonths != null && emergencyMonths < 3) add('thin_emergency_fund', 'warning', 'Emergency cover is below three months', `Current liquid emergency cover is approximately ${emergencyMonths.toFixed(1)} months.`, `${emergencyMonths.toFixed(1)} months`);
  if (debtRatio > 0.3) add('high_debt', 'warning', 'Debt is material to your balance sheet', `Liabilities equal about ${(debtRatio * 100).toFixed(0)}% of the larger of tracked assets or annual income.`, `${(debtRatio * 100).toFixed(0)}%`);
  if (goals.some((goal) => goal.onTrack === false)) add('goals_behind', 'warning', 'At least one goal is behind schedule', goals.filter((goal) => goal.onTrack === false).map((goal) => goal.name).slice(0, 2).join(' and '), `${goals.filter((goal) => goal.onTrack === false).length} behind`);
  if (goalHeadroom < 0) add('goal_overcommitment', 'risk', 'Goal contributions exceed monthly surplus', `Current goal commitments are ${I.f(Math.abs(goalHeadroom))} above the recorded monthly surplus.`, I.f(goalHeadroom));
  else if (goalHeadroom > Math.max(100, monthlySurplus * 0.2) && goals.length) add('unallocated_surplus', 'good', 'There is unassigned monthly headroom', `${I.f(goalHeadroom)} remains after current goal contributions.`, I.f(goalHeadroom));
  if (staleCount > 0) add('stale_portfolio', 'warning', 'Some investment values need refreshing', `${staleCount} investment ${staleCount === 1 ? 'category is' : 'categories are'} more than 45 days old.`, `${staleCount} stale`);
  if (portfolio.totalInvested > 0 && maxClassPct > 50) add('concentrated_portfolio', 'warning', 'Portfolio is concentrated by asset class', `The largest tracked investment class is ${maxClassPct.toFixed(0)}% of broker investments.`, `${maxClassPct.toFixed(0)}%`);
  if (!completeBudget || dataConfidence < 60) add('missing_data', 'info', 'Milo needs a more complete monthly picture', 'Add or refresh missing income, expenses, goals or investment values to improve connected insights.', `${dataConfidence}% complete`);
  if (!learning.lessonsDone || safe(learning.streak?.current_streak) === 0) add('learning_gap', 'info', 'Your learning path can reinforce the plan', 'Professor Milo has a short lesson selected from your current money patterns.', 'Next lesson ready');

  const sorted = [...findings].sort((a, b) => {
    const rank = { risk: 0, warning: 1, info: 2, good: 3 };
    return rank[a.severity] - rank[b.severity];
  });
  const priorities = sorted.slice(0, 3);
  if (!priorities.length) priorities.push({ code: 'steady', severity: 'good', title: 'Your connected plan is stable', detail: 'No major pressure point was detected in the latest recorded month.', value: `${score}/100`, route: '/app', module: 'Overview' });

  const wins = [];
  if (savingsRate != null && savingsRate >= 20) wins.push(`You retained ${savingsRate.toFixed(0)}% of income after recorded spending.`);
  if (emergencyMonths != null && emergencyMonths >= 3) wins.push(`Emergency cash covers about ${emergencyMonths.toFixed(1)} months of recorded spending.`);
  if (goalTrackable.length && goalsOnTrack === goalTrackable.length) wins.push('Every goal with a deadline is currently on track.');
  if (I.mom?.netWorth > 0) wins.push(`Net worth is ${I.f(I.mom.netWorth)} above the previous snapshot.`);
  if (!wins.length) wins.push('Your complete money picture is now connected in one model.');

  const watch = priorities.find((item) => item.severity === 'risk' || item.severity === 'warning') || priorities[0];
  const next = priorities.find((item) => item.code !== watch.code) || priorities[0];
  const briefing = {
    headline: scoreBand.label === 'Excellent' ? 'Your money system is working well.' : scoreBand.label === 'Strong' ? 'Your financial foundations are strong.' : 'Milo found one area worth improving.',
    summary: watch?.detail || 'Your recorded finances are connected and ready to review.',
    win: wins[0],
    watch: watch?.title || 'Keep your records current',
    action: next?.title || 'Review your connected plan',
  };

  const lessonTrigger = I.triggers?.[0] || null;
  const lesson = {
    moduleId: lessonTrigger?.module || (monthlySurplus < 0 ? 4 : goals.some((g) => g.onTrack === false) ? 7 : 1),
    reason: lessonTrigger?.why ? `Recommended because ${lessonTrigger.why}.` : priorities[0]?.detail || 'Recommended from your current connected financial picture.',
    code: lessonTrigger?.code || priorities[0]?.code || 'foundations',
  };

  const weekly = {
    title: `Your MoneyMilo check-in for ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
    win: wins[0],
    watch: watch?.detail || 'No urgent issue detected.',
    nextAction: next?.title || 'Keep your monthly data current.',
    score,
    scoreLabel: scoreBand.label,
  };

  return {
    version: '2.0',
    generatedAt: now.toISOString(),
    currency: I.base || 'GBP',
    symbol: I.sym || '',
    score,
    scoreLabel: scoreBand.label,
    scoreTone: scoreBand.tone,
    scores,
    dataConfidence,
    monthly: { income: monthlyIncome, expenses: monthlyExpenses, surplus: monthlySurplus, savingsRate, committedGoals, goalHeadroom },
    wealth: { gross, netWorth, liabilities: safe(liabilities.totalLiabilities), debtRatio, emergencyMonths, invested: safe(portfolio.totalInvested), maxClassPct, staleCount },
    goals: { total: goals.length, trackable: goalTrackable.length, onTrack: goalsOnTrack, behind: goals.filter((g) => g.onTrack === false).length },
    priorities,
    findings,
    briefing,
    weekly,
    lesson,
  };
}

export function buildBrainContext(brain, formatMoney = (value) => String(value)) {
  if (!brain) return '';
  return `MONEYMILO CONNECTED BRAIN:
Health score: ${brain.score}/100 (${brain.scoreLabel}); data confidence ${brain.dataConfidence}%.
Monthly income ${formatMoney(brain.monthly.income)}, expenses ${formatMoney(brain.monthly.expenses)}, surplus ${formatMoney(brain.monthly.surplus)}, goal commitments ${formatMoney(brain.monthly.committedGoals)}, goal headroom ${formatMoney(brain.monthly.goalHeadroom)}.
Wealth: net worth ${formatMoney(brain.wealth.netWorth)}, liabilities ${formatMoney(brain.wealth.liabilities)}, emergency cover ${brain.wealth.emergencyMonths == null ? 'unknown' : `${brain.wealth.emergencyMonths.toFixed(1)} months`}.
Goals: ${brain.goals.onTrack}/${brain.goals.trackable} deadline-based goals on track; ${brain.goals.behind} behind.
Current priorities: ${brain.priorities.map((item) => `${item.title} — ${item.detail}`).join(' | ')}.
Recommended learning: ${brain.lesson.reason}`;
}
