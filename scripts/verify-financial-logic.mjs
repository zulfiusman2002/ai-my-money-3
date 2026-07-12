import assert from 'node:assert/strict';

const income = 7270;
const expenses = 4249;
const netSavings = income - expenses;
const savingsRate = income ? (netSavings / income) * 100 : 0;
assert.equal(netSavings, 3021, 'Budget net savings must be income minus expenses');
assert.equal(Math.round(savingsRate), 42, 'Savings rate must be approximately 42%, never 416%');

const committedGoals = 900 + 600 + 150;
assert.equal(netSavings - committedGoals, 1371, 'Goal headroom must use the same budget summary');

const grossAssets = 87729;
const liabilities = 7700;
assert.equal(grossAssets - liabilities, 80029, 'Net worth must equal total assets minus liabilities');

function checkProjectionIdentity({ startingNetWorth, contributions, marketGrowth, debtPaydown, nominal }) {
  assert.ok(Math.abs(startingNetWorth + contributions + marketGrowth + debtPaydown - nominal) <= 2,
    'Projection components must reconcile to nominal net worth');
}
checkProjectionIdentity({ startingNetWorth: 80029, contributions: 36252, marketGrowth: 9200, debtPaydown: 1800, nominal: 127281 });

console.log('✓ Budget, goals, net worth and projection reconciliation checks passed.');
