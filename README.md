# MoneyMilo 1.0

MoneyMilo is a responsive personal-finance companion for household and business money. It combines budgeting, investments, wider assets, liabilities, goals, net-worth tracking, projections, personalised learning and connected Ask Milo guidance.

## MoneyMilo 1.0 release focus

This release consolidates the V4.2 visual product into a stable 1.0 codebase rather than adding another version layer.

- Clear signup, verification and sign-in journey.
- Adaptive onboarding for individuals, couples, households, businesses and combined profiles.
- Draft-safe onboarding that can be resumed.
- Shared month and financial-scope calculations across the core modules.
- Explicit data-period, update and fallback indicators.
- Transparent Money Pulse guidance score.
- More reliable income editing without duplicate monthly sources.
- Structured Ask Milo answers and persistent session chat.
- Clear Professor Milo course progression and module completion.
- Stronger loading, empty, retry and failure states.
- Responsive desktop, tablet and phone experience with one consistent Milo identity.

See `MONEYMILO_1_0_RELEASE_NOTES.md` and `MONEYMILO_1_0_QA_CHECKLIST.md`.

## Stack

- React 18 and Vite
- Recharts
- Netlify and Netlify Functions
- Supabase database, authentication and storage
- Anthropic Messages API through server functions

## Database

MoneyMilo 1.0 requires no new migration beyond the existing adaptive-profile migration:

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

## Verify locally

```bash
npm install
npm run verify
```

The verification command checks release structure, embedded-secret patterns, Budget/Goals/Net Worth/Projector reconciliation and the production Vite build.

## Deploy

Replace the files at the root of the existing GitHub repository, then use:

```text
Netlify → Deploys → Trigger deploy → Clear cache and deploy site
```
