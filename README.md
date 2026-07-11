# MoneyMilo V4.2

MoneyMilo is a connected personal wealth and learning companion covering household and business budgets, investments, wider assets, liabilities, goals, projections, AI guidance and personalised financial education.

V4.2 is the visual-correction release. It keeps the V4.1 adaptive household/business data model and replaces the narrow dashboard composition with a briefing-first, wide desktop experience.

## V4.2 highlights

- Milo’s daily briefing is the first dashboard experience.
- Wide desktop canvas with larger typography, navigation and product branding.
- Net worth, assets and liabilities are shown together with visible axes, legends and exact-value tooltips.
- Money Pulse includes a clearer metric breakdown and a contextual Milo interpretation.
- All Milo assets are tightly cropped so the character—not transparent padding—is scaled.
- Goals use visual progress rings, clearer amounts and a larger Goals Milo.
- Learn makes the next lesson unmistakable and gives Professor Milo the dominant teaching role.
- Budget, Net Worth and Projector charts have larger canvases and stronger visual hierarchy.
- Phone, tablet and desktop layouts remain responsive.

See `MONEYMILO_V4_2_RELEASE_NOTES.md` for the complete release notes.

## Stack

- React 18 and Vite
- Recharts
- Netlify and Netlify Functions
- Supabase database, authentication and storage
- Anthropic Messages API through server functions

## Existing deployment

V4.2 requires no migration beyond the V4.1 adaptive-profile migration. If `supabase/phase-4-1.sql` was already run for V4.1, do not run it again.

Keep the existing Netlify environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
ANTHROPIC_MODEL_FAST
ANTHROPIC_MODEL_FULL
```

Deploy by replacing the files in the root of the existing GitHub repository, then use **Netlify → Deploys → Trigger deploy → Clear cache and deploy site**.

## Validation

```bash
npm install
npm run verify
```

The verification script reconciles Budget, Goals, Net Worth and Projector calculations before running a production Vite build.
