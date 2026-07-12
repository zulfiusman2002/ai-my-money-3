# MoneyMilo 1.0 — Release Notes

## Release purpose

MoneyMilo 1.0 consolidates the latest V4.2 product into one release and hardens the journeys already built. It does not introduce a new disconnected module or another roadmap direction.

## Authentication and first-time experience

- Signup normalises email addresses and clearly explains password requirements.
- New accounts are sent to a dedicated verification screen rather than an ambiguous return to sign-in.
- The verification screen preserves the signup email, supports correction and resending, and tells users not to create a duplicate account.
- The confirmation callback continues automatically when Supabase establishes a session, with a clear sign-in fallback when it does not.
- Redirects use the active MoneyMilo site origin, including `https://moneymilo.netlify.app` in production.

## Adaptive onboarding

- Supports individual, couple, household, business and combined household/business profiles.
- Supports multiple people, multiple income sources, business revenue, household expenses and business expenses.
- Personal and business money remain separate to reduce double-counting.
- Onboarding drafts are saved locally per authenticated user and restored after refresh or interruption.
- Users can start again, move back through completed steps and see that their draft is saved.
- Negative income, expense and debt values are blocked.
- The final review uses estimated remainder rather than treating every unspent pound as confirmed savings.

## Connected financial calculations

- Shared summary logic now handles missing, partial and complete months consistently.
- Income, expenses, net savings, savings rate and allocations use safe numeric handling.
- Household and business scopes are respected in Budget and Projector.
- Dashboard, Goals, Net Worth and Projector surface the actual period and fallback state being used.
- Net-worth live points use the same current calculation rather than duplicating the current month.

## Dashboard and guidance

- Milo's briefing remains the first dashboard experience.
- Money Pulse is explicitly described as a guidance score—not a credit score or investment rating.
- The score is broken into cash flow, liquidity, debt and goal-system components.
- Win, watch-out and next-action cards respond to available data, including stale investments, debt burden, unallocated remainder and incomplete spending records.
- Load failures show a clear retry state rather than silently rendering zeros.

## Budget

- Existing income-source names are static during monthly editing.
- Editing a standard income source updates the materialised monthly record rather than inserting a duplicate.
- Historical months remain editable and clearly identify the month being changed.
- Copying recurring expenses avoids duplicate records.
- Budget trend charts retain visible axes and a clear fixed/variable/one-time/savings legend.
- Supabase save and delete errors are surfaced to the user.

## Investments

- Screenshot and manual portfolio entry are both retained.
- Loading failures now have a retry state.
- The page clearly shows whether a portfolio snapshot exists and when the latest snapshot was updated.
- Snapshot freshness, portfolio movement, allocation and latest-per-type logic remain connected to wider wealth.

## Goals, Net Worth and Projector

- Goals are ordered by active status and target date.
- Goal and projector calculations use the resolved financial month and scope.
- Net Worth and Projector expose update-period information and recoverable load errors.
- Existing large-screen graph, legend, tooltip and Milo explanation improvements are preserved.

## Professor Milo Academy

- The next lesson remains the primary action.
- Course and module names are shown instead of internal IDs.
- Module completion is based on completed lessons within that module, not one global completion event.
- Every curriculum module shows completed lessons and progress.
- Quiz data is parsed safely and completion remains tied to XP and streak progression.

## Ask Milo

- The current conversation persists during the browser session.
- Answers are rendered into readable headings, paragraphs and action lists instead of one unstructured text block.
- Review results distinguish insights, priority actions, data gaps and disclaimers.
- Suggested questions focus on real decisions, affordability, goals, net-worth movement and portfolio concentration.
- Clear-chat and thinking states are included.

## Product reliability

- Added a global error boundary with refresh and overview recovery actions.
- Added route titles and scroll restoration.
- Added reusable data-period/update indicators.
- Added a release verifier for required files, version consistency and obvious embedded-secret patterns.
- Added MoneyMilo 1.0 identity in product settings and navigation.

## Database and deployment

No new SQL migration is introduced by MoneyMilo 1.0. The existing `supabase/phase-4-1.sql` migration is still required for adaptive household/business profiles. Do not rerun it when it was already applied.

Deploy the contents of the `MoneyMilo-1.0` folder to the repository root and clear the Netlify build cache once.

## Validation performed

- Financial reconciliation verification passed.
- Release structure and embedded-secret-pattern verification passed.
- Production Vite build passed.
- Every Netlify function passed `node --check`.
- Production dependency audit reported no known vulnerabilities.

A final live test is still required with the real Supabase project, a fresh verified account and representative household/business records because those external services cannot be fully exercised in an isolated build environment.
