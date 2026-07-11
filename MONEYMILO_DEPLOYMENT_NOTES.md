# MoneyMilo V2.1 deployment notes

## Supabase Auth URLs

Because the live Netlify address is now `https://moneymilo.netlify.app`, update Supabase:

- Authentication → URL Configuration → Site URL
  - `https://moneymilo.netlify.app`
- Add Redirect URL
  - `https://moneymilo.netlify.app/auth/confirmed`
- Keep localhost only if you still use local development.

The app now passes `emailRedirectTo` dynamically from `window.location.origin`, so future domain changes do not require a code edit, but the new URL must still be allowed in Supabase.

## Signup flow

- Users who receive an immediate session continue to the Milo introduction.
- Users requiring email confirmation see a dedicated “Verify your email” page.
- Confirmation links return to `/auth/confirmed`, then continue to the introduction.
- Login errors explain that new users must verify first and provide a resend option.

## Netlify

No new environment variables are required. Keep the existing Supabase and Anthropic variables.
