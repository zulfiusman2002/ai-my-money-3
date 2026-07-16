import assert from 'node:assert/strict';
import { buildFinancialBrain } from '../shared/financialBrain.js';

const I = {
  base:'GBP', sym:'£', f:(n)=>`£${Math.round(Number(n||0)).toLocaleString('en-GB')}`,
  budget:{ totalIncome:7270,totalExpenses:4249,netSavings:3021,savingsRate:41.55,fixedRatio:45.7,savingsAllocated:2100,topExpenses:[] },
  portfolio:{ totalInvested:36849,classMix:[{type:'uk_stocks',pct:52.5},{type:'mutual_funds',pct:40.4}],staleClasses:[],topHolding:null },
  assets:{ totalAssets:50880,emergencyMonths:2.68,emergencyFund:11400 },
  liabilities:{ totalLiabilities:7700 }, netWorth:80029,
  goals:[
    {name:'First UK home deposit',monthly:900,onTrack:false},
    {name:'Emergency fund',monthly:600,onTrack:true},
    {name:'Japan trip',monthly:150,onTrack:false},
  ],
  learning:{lessonsDone:3,streak:{current_streak:3,total_xp:380}},
  triggers:[{code:'goals_behind',module:7,why:'two goals are behind'}], mom:{netWorth:0},
};
const brain=buildFinancialBrain(I,{now:new Date('2026-07-16T12:00:00Z')});
assert.equal(brain.monthly.goalHeadroom,1371,'Goal headroom must use the connected surplus and commitments');
assert.equal(brain.goals.behind,2,'Goal state must flow into the central brain');
assert.equal(brain.lesson.moduleId,7,'Learning recommendation must use the connected trigger');
assert.ok(brain.score>=0&&brain.score<=100,'Money Pulse must stay between 0 and 100');
assert.ok(brain.priorities.length>0,'Connected brain must produce actionable priorities');
console.log('✓ MoneyMilo 2.0 financial brain, goal linkage and adaptive-learning checks passed.');
