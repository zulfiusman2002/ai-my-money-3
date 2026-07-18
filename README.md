# MoneyMilo 2.1 — Premium Intelligence

MoneyMilo is a responsive personal-finance companion for household and business money. It combines budgeting, investments, wider assets, liabilities, goals, net-worth tracking, projections, personalised learning and Ask Milo guidance.

## MoneyMilo 2.1 release focus

MoneyMilo 2.1 connects the existing product modules through one deterministic financial brain.

- One shared financial model for Budget, Goals, Investments, Net Worth, Projector, Learn and Ask Milo.
- Transparent Money Pulse score with visible component scores.
- Connected priorities that link directly to the module where action is needed.
- Adaptive Professor Milo lesson recommendations based on current financial patterns.
- Dashboard daily briefing and weekly review generated from the same connected model.
- Goal headroom and connected-impact explanations.
- Projector presets based on the latest monthly surplus and goal commitments.
- Money Timeline combining wealth snapshots, learning progress and Ask Milo analyses.
- Structured Ask Milo responses with actionable module links and lightweight conversation memory.
- Automatic refresh of connected insights after relevant data changes.

See `MONEYMILO_2_0_RELEASE_NOTES.md` and `MONEYMILO_2_0_QA_CHECKLIST.md`.

## Stack

- React 18 and Vite
- Recharts
- Netlify and Netlify Functions
- Supabase database, authentication and storage
- Anthropic Messages API through server functions

## Database

MoneyMilo 2.1 requires no new migration beyond the existing adaptive-profile migration:

```text
supabase/phase-4-1.sql
```

Do not run it again when it has already been applied successfully.

## Environment variables

Keep the existing Netlify variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
ANTHROPIC_MODEL_FAST
ANTHROPIC_MODEL_FULL
```

MoneyMilo 2.1 does not change or embed the Claude API key.

## Verify locally

```bash
npm install
npm run verify
```

The verification command checks financial reconciliation, the connected financial brain, AI response recovery, release structure, secret patterns and the production Vite build.

## Deploy

Replace the files at the root of the existing GitHub repository, then use:

```text
Netlify → Deploys → Trigger deploy → Clear cache and deploy site
```
