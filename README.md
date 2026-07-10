# MoneyMilo

MoneyMilo is an AI-powered personal wealth and learning app. It connects budgeting, investments, property, gold, pensions, liabilities, goals, projections and personalised finance lessons in one mobile-first experience led by Milo.

## What changed in this build

- Complete MoneyMilo visual rebrand with a soft, Apple-inspired design system.
- Milo mascot variants for the dashboard, Ask Milo, Learn and Goals.
- Mobile navigation simplified to five primary destinations plus a More sheet.
- Dashboard redesigned around cash flow, savings, wealth, goals and Milo's briefing.
- Learn redesigned with real loading skeletons, lesson progression, XP and Milo guidance.
- AI Advisor redesigned as **Ask Milo**, with structured reviews and conversational guidance.
- Shared monthly financial summary logic prevents an empty current month from incorrectly showing 100% savings.
- Goals, Projector, Learn, Dashboard and backend AI context now use the latest complete budget month when required.
- Net-worth history appends the current live calculation when stored snapshots are stale or incomplete.
- Wealth labels now clearly distinguish total assets, liabilities and net worth.
- Public diagnostic AI endpoints removed so they cannot be abused to consume API credits.

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

No new database migration is required for this MoneyMilo UI build.

## Local validation

```bash
npm install
npm run build
```

For local functions and Vite together:

```bash
npx netlify dev
```

## Important product note

The shared financial summary intentionally falls back to the latest month containing expenses when the current month has not yet been populated. The interface displays a notice whenever this happens. This prevents misleading outputs such as zero expenses, a 100% savings rate, inflated goal headroom and incorrect learning recommendations.
