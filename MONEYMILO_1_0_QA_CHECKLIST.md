# MoneyMilo 1.0 — Live QA Checklist

Use a fresh email address and test on both a laptop and phone.

## 1. Authentication

- Create account.
- Confirm that the app shows the dedicated verification screen.
- Open the Supabase email and verify.
- Confirm return to MoneyMilo and successful sign-in.
- Test resend verification and an incorrect password.

## 2. Onboarding

- Test “Just me” with one salary.
- Test household with two earners and one person with a second job.
- Test business-only revenue and operating expenses.
- Test combined household/business and confirm totals remain separate.
- Refresh midway and confirm draft restoration.
- Complete onboarding and confirm the dashboard opens.

## 3. Budget and calculations

- Add/edit income in the current month.
- Confirm editing does not create a duplicate source.
- Add fixed, variable and one-time expenses.
- Confirm income − expenses = estimated remainder.
- Confirm savings rate matches remainder ÷ income.
- Edit a previous month and copy recurring costs once.

## 4. Investments and wealth

- Add one portfolio manually.
- Upload one test screenshot and review extracted values before saving.
- Add property/gold/cash and one liability.
- Confirm Investments, Net Worth and Dashboard totals reconcile.

## 5. Goals and Projector

- Create a goal with a target date and monthly contribution.
- Change monthly headroom and confirm goal/projector outputs respond.
- Confirm household and business scopes do not mix.

## 6. Learn and Ask Milo

- Open Learn and confirm one obvious next lesson.
- Complete a lesson and quiz; confirm XP/progress updates.
- Ask Milo an affordability question and a net-worth question.
- Confirm answers show assumptions, actions and data gaps.

## 7. Responsive and failure states

- Test 390px phone, tablet and laptop widths.
- Confirm charts show labels/tooltips and do not overflow.
- Test with no investment data and no historical expense data.
- Temporarily disconnect network and confirm recoverable error states.

## Release decision

MoneyMilo 1.0 is ready for closed beta when all critical authentication, onboarding and calculation checks pass. Cosmetic issues can be logged separately; incorrect totals, duplicate records or broken authentication block release.
