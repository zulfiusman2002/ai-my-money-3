# MoneyMilo 2.0 — Connected Intelligence

## Release purpose

MoneyMilo 2.0 does not add another collection of unrelated finance screens. It connects the existing product into one financial model so the Dashboard, Budget, Goals, Investments, Net Worth, Projector, Learn and Ask Milo use the same current picture.

## New connected financial brain

A shared deterministic financial brain now calculates:

- Monthly income, expenses, surplus and savings rate
- Goal commitments and remaining monthly goal headroom
- Assets, liabilities, net worth and debt ratio
- Emergency-fund coverage
- Portfolio freshness and concentration
- Goal status
- Data completeness
- Learning activity

It then produces a transparent Money Pulse score and prioritised findings. The score is guidance only and is not a credit score or regulated recommendation.

### Money Pulse components

The score is built from visible components:

- Cash flow
- Financial resilience
- Debt position
- Goal progress
- Portfolio diversification
- Data completeness
- Learning activity

## Dashboard

- Uses the connected brain for the daily Milo briefing.
- Shows up to three current priorities with direct links to the relevant module.
- Expands Money Pulse from a single number into visible component scores.
- Generates the weekly MoneyMilo check-in from the same data model.
- Combines deterministic priorities with existing AI-powered “Milo noticed” insights.

## Budget

- Budget edits trigger an immediate connected-brain refresh.
- Builder Milo explains how the selected month affects Money Pulse, goal headroom and lesson recommendations.
- Household/business scope continues to be respected.

## Goals

- Uses connected monthly surplus and commitments to calculate goal headroom.
- Adds a clear connected-impact panel showing how Budget affects Goals, Projector and Learn.
- Goal updates refresh the shared financial brain.

## Investments

- Investment updates refresh the shared financial model.
- Investor Milo explains how portfolio freshness and concentration influence Net Worth, Projector, Money Pulse and learning recommendations.

## Projector

Adds connected scenario presets:

- **Full surplus** — uses the latest recorded monthly surplus.
- **After goals** — uses surplus remaining after active goal commitments.
- **Conservative** — applies a lower contribution assumption for stress testing.

## Learn with Milo

- Professor Milo now receives a deterministic lesson recommendation from current financial patterns.
- The Academy header includes the connected Money Pulse.
- Completing a lesson refreshes the financial brain.
- The learning recommendation can respond to cash-flow pressure, goals behind schedule, portfolio concentration, stale data and other current signals.

## Ask Milo

- Ask Milo receives the same connected financial-brain context as the rest of the app.
- Answers may include interactive actions that open the relevant module or ask Milo to show the impact.
- Lightweight recent Ask Milo analyses are included as contextual memory.
- Existing structured-answer formatting and interrupted-JSON recovery remain in place.
- No Claude key or model environment variable was changed.

## Money Timeline

A new Money Timeline page combines:

- Monthly wealth snapshots
- Learning progress
- Recent Ask Milo analyses

It provides a chronological view of meaningful financial activity rather than another static dashboard.

## Technical changes

- Added `shared/financialBrain.js`.
- Added authenticated `financial-brain` Netlify function.
- Added `BrainContext` to keep connected insights available across protected routes.
- Added global data-change refresh events after important writes.
- Made backend intelligence context month- and financial-scope-aware.
- Added `/app/timeline` route and navigation.
- Updated product version to `2.0.0`.

## Database and environment

- No new Supabase migration is required beyond `supabase/phase-4-1.sql` when already applied.
- No new environment variables are required.
- Existing Anthropic key and model variables remain unchanged.

## Verification completed

- Budget, Goals, Net Worth and Projector reconciliation passed.
- Connected financial-brain linkage and adaptive-learning checks passed.
- Complete and interrupted AI-format checks passed.
- Release structure and embedded-secret checks passed.
- Production Vite build passed.
- Netlify function syntax checks passed.
- Production dependency audit reported zero known vulnerabilities.

## Live validation still required

The authenticated production journey must be checked after deployment against live Supabase data. Use `MONEYMILO_2_0_QA_CHECKLIST.md`.
