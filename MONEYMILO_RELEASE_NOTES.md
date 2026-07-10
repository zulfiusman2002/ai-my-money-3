# MoneyMilo UI v1 — Release notes

## Brand and experience
- Rebranded the app from AI My Money to MoneyMilo.
- Added a consistent Milo mascot system: Core Milo, AI Milo, Learn Milo and Goals Milo.
- Introduced a soft light palette using violet, lavender, mint, peach, blue, black and restrained gold.
- Added shared UI tokens, modern cards, gradients, shadows, buttons, navigation and loading states.

## Redesigned areas
- Public landing page
- App shell and responsive navigation
- Dashboard
- Learn
- Ask Milo
- Goals
- Investments headings and composition presentation
- Net Worth labels and live trend handling
- Budget and Projector page introductions and fallback notices

## Accuracy fixes
- Added a shared monthly financial summary helper.
- Uses the latest complete budget month when the selected/current month has no expenses.
- Applied the same month logic to Dashboard, Goals, Projector and server-side AI context.
- Prevented empty-month data from producing 100% savings and inflated goal headroom.
- Added a live current point to net-worth history when monthly snapshots are stale.
- Clarified total assets versus liabilities versus net worth.

## Reliability and security
- Production build passes.
- All Netlify function files pass Node syntax validation.
- Removed unauthenticated Anthropic diagnostic functions to prevent API-credit abuse.
- Existing Supabase schema and business logic are preserved.

## Not changed
- No database migration is required.
- Authentication, RLS policies, screenshot extraction and existing calculation tables remain intact.
