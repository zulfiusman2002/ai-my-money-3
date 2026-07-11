# MoneyMilo V2.1 — onboarding, auth and responsive correction

## Fixed

- Signup no longer drops a new user back onto a confusing login page.
- Added a dedicated verification-email screen, resend action and confirmation return route.
- Added clearer login messages for unverified accounts.
- Added dynamic confirmation redirects based on the active site origin.
- Rebuilt the onboarding questionnaire in the MoneyMilo lavender visual system.
- Primary income source is now read-only and optional income sources cannot be duplicated.
- Savings now shows Milo's estimate from income minus recurring costs, with an optional override.
- Added clearer historical-month editing language and a prominent Add Expense action.
- Investment updates now support either screenshot extraction or manual entry.
- Replaced letter-based brand marks and PWA icons with the Milo character.
- Replaced the broken Professor Milo image treatment with a clean cropped asset and intentional card presentation.
- Expanded desktop layouts and chart sizes for large screens.
- Improved Budget visualisations, Net Worth monthly-change visualisation and Projector chart sizing.
- Added a Settings action to replay the three-screen Milo introduction.

## Required Supabase configuration

Update Authentication → URL Configuration:

- Site URL: `https://moneymilo.netlify.app`
- Redirect URL: `https://moneymilo.netlify.app/auth/confirmed`

## Verification

- `npm run verify` passes.
- Budget, goal headroom, net worth and projector reconciliation checks pass.
- Production Vite build passes.
- Netlify function syntax checks pass.
