# MoneyMilo 2.0 — Deployment Notes

## 1. Supabase authentication URLs

In **Supabase → Authentication → URL Configuration** use:

```text
Site URL
https://moneymilo.netlify.app

Redirect URLs
https://moneymilo.netlify.app
https://moneymilo.netlify.app/**
```

## 2. Database

MoneyMilo 2.0 introduces no new migration beyond:

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

Keep the existing Supabase and Anthropic environment variables. The Claude key and model variable names are unchanged. Never put service-role or Anthropic secrets in GitHub.

## 4. Deploy

Upload the contents of the `MoneyMilo-2.0` folder to the GitHub repository root. Then use:

```text
Netlify → Deploys → Trigger deploy → Clear cache and deploy site
```

## 5. Required live test

After deployment, use a fresh or existing test account and complete the checks in `MONEYMILO_2_0_QA_CHECKLIST.md`. Pay particular attention to connected refreshes after editing Budget, Goals, Investments and Learn, plus the new Money Timeline and Ask Milo action buttons.
