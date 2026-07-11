# MoneyMilo

**V3 — Premium Experience**

MoneyMilo is a connected personal wealth and learning companion covering budgets, investments, wider assets, liabilities, goals, projections, AI guidance and personalised financial education.

See `MONEYMILO_V3_RELEASE_NOTES.md` for the V3 changes.

MoneyMilo is an AI-powered personal wealth and learning app. It connects budgeting, investments, property, gold, pensions, liabilities, goals, projections and personalised finance lessons in one mobile-first experience led by Milo.

## Product foundation

- Fully responsive phone, tablet and desktop layouts instead of a narrow mobile canvas on laptops.
- Three branded first-run screens: Meet Milo, Ask Milo and Learn with Professor Milo.
- Interactive, labelled net-worth chart with assets, liabilities, range controls and current-value markers.
- Six-month Budget analytics, savings allocation and an improved money-flow view.
- Investment trend, allocation, change and stale-data summaries.
- Richer Goals cards with Milo coaching and live scenario impact.
- A clearer Wealth Projector with scenario curves, milestones and reconciled wealth-building components.
- Learn rebuilt as the hero experience: Professor Milo, one-concept-at-a-time cards, quiz, XP, streaks and a learning path.
- Shared month and calculation logic across Dashboard, Budget, Goals, Projector, Learn and AI context.
- Automated reconciliation checks available through `npm run verify`.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Recharts |
| Hosting | Netlify |
| Server functions | Netlify Functions |
| Database, authentication and storage | Supabase |
| AI | Anthropic Messages API, called only from server functions |

## Security model

- The Anthropic API key and Supabase service-role key are never placed in browser code.
- The browser sends its Supabase session token to `/api/*`.
- Server functions verify the user before loading that user's financial context.
- Supabase Row Level Security remains the primary database protection.
- AI output is educational guidance, not regulated financial advice.

## Fresh setup

Run the SQL files in this order:

```text
supabase/schema.sql
supabase/phase-1-5.sql
supabase/phase-1-6.sql
supabase/phase-2-1.sql
supabase/phase-2-1-1.sql
```

For the demo account:

1. Create a confirmed Supabase Auth user.
2. Copy its UUID.
3. Replace `DEMO_USER_ID` in `supabase/seed-demo.sql`.
4. Run the seed file.

## Environment variables

Set these in Netlify:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
ANTHROPIC_MODEL_FAST=claude-haiku-4-5-20251001
ANTHROPIC_MODEL_FULL=claude-haiku-4-5-20251001
```

`ANTHROPIC_MODEL_FULL` may be changed to a larger model only when that model is available to the Anthropic workspace.

## Deploying over the current app

1. Replace the existing GitHub project files with this build.
2. Keep the existing Netlify environment variables.
3. Commit to the connected production branch.
4. Netlify should deploy automatically. Otherwise use **Trigger deploy → Clear cache and deploy site**.

No new database migration is required for this MoneyMilo V2 build.

## Local validation

```bash
npm install
npm run verify
```

For local functions and Vite together:

```bash
npx netlify dev
```

## Important product note

The shared financial summary intentionally falls back to the latest month containing expenses when the current month has not yet been populated. The interface displays a notice whenever this happens. This prevents misleading outputs such as zero expenses, a 100% savings rate, inflated goal headroom and incorrect learning recommendations.
