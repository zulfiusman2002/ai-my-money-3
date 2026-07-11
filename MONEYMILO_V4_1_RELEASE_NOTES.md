# MoneyMilo V4.1 — Adaptive Money Profiles

## What this release fixes

### Dashboard hierarchy
- Milo’s personalised daily briefing is now the first dashboard experience.
- Net worth and Money Pulse follow the briefing instead of competing with it.
- The dashboard wealth chart now includes a visible legend and interaction guidance.

### Clearer graphs
- Net Worth includes an explicit value-based legend for net worth, assets and liabilities.
- Chart areas are larger on laptop and desktop displays.
- Budget and Net Worth legends, labels and tooltip visibility have been strengthened.
- Business Budget uses an operating-cost mix rather than a personal savings-allocation chart.

### Milo and branding
- Milo characters are substantially larger in module coaching cards.
- Sidebar, mobile and onboarding MoneyMilo logos are larger.
- Goals Milo has more canvas space and no longer appears as a tiny clipped decoration.

### Learn with Milo
- Learn now opens with an unmistakable **Next lesson** screen.
- Professor Milo introduces the selected lesson and explains why it was chosen.
- The screen shows lesson length, step count and the exact learning flow before the lesson begins.
- The curriculum remains visible below as a course path.

## Adaptive onboarding

The rigid employment questionnaire has been replaced by a reusable financial-profile model.

Users can choose:
- Just me
- Me and my partner
- My household
- My business
- Household and business

### Multiple people and multiple jobs
- Add any number of household members.
- Assign each income source to the person who receives it.
- Add multiple salaries, second jobs, freelance work, rental income, dividends, benefits, bonuses and other income.
- Weekly, fortnightly, quarterly and annual amounts are converted into monthly estimates.

### Business profiles
- Add business revenue and business operating expenses.
- Keep household and business totals separate.
- Salary, drawings and dividends taken from a business can be recorded as household income without double-counting business revenue.
- Business Budget can be viewed independently through the Household / Business switch.

### Adaptive expenses
Household suggestions include rent or mortgage, council tax, utilities, groceries, transport, childcare, insurance, debt, subscriptions, family support and health.

Business suggestions include rent, payroll, contractors, software, inventory, equipment, marketing, professional services, travel, insurance, taxes and business debt.

Each cost supports:
- Owner or financial scope
- Amount and frequency
- Fixed, variable or one-time behaviour
- Required, flexible or optional importance

### Monthly position and review
- Household and business positions are calculated separately.
- “Income minus regular expenses” is described as an estimated remainder, not automatically as savings.
- A final review screen shows the complete starting picture before the dashboard is created.

## Required Supabase migration

Run the following file in Supabase SQL Editor before testing a new signup:

`supabase/phase-4-1.sql`

It adds:
- `financial_entities`
- Household / business scope fields
- Income ownership and income-kind fields
- Expense frequency and importance fields
- Liability ownership and scope fields

The migration is idempotent and preserves existing data by treating old records as household records.

## Validation
- `npm run build` passed.
- `npm run verify` passed.
- Netlify function syntax checks passed.
- No credentials are included in the package.
