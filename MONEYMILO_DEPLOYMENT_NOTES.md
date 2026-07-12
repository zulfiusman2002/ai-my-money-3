# MoneyMilo 1.0 — Deployment Notes

## 1. Supabase authentication URLs

In **Supabase → Authentication → URL Configuration** use:

```text
Site URL
https://moneymilo.netlify.app

Redirect URLs
https://moneymilo.netlify.app
https://moneymilo.netlify.app/**
```

The wildcard covers `/auth/confirmed`, `/welcome`, `/onboarding` and application routes. Keep localhost URLs only for deliberate local development.

## 2. Database

MoneyMilo 1.0 introduces no migration beyond:

```text
supabase/phase-4-1.sql
```

Run that file only when the adaptive household/business profile migration has not already been applied.

## 3. Netlify

Keep:

```text
Base directory: blank
Package directory: blank
Build command: npm install && npm run build
Publish directory: dist
Functions directory: netlify/functions
```

Keep the existing Supabase and Anthropic environment variables. Do not put service-role or Anthropic secrets in GitHub.

## 4. Deploy

Upload the contents of the `MoneyMilo-1.0` folder to the GitHub repository root. Then use:

```text
Netlify → Deploys → Trigger deploy → Clear cache and deploy site
```

## 5. Required live test

After deployment, create one fresh test account and complete email verification, onboarding, one budget month, one investment update, one goal, one lesson and one Ask Milo question. Use `MONEYMILO_1_0_QA_CHECKLIST.md` for the full test.
