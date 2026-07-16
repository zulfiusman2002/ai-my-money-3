# MoneyMilo 2.0 — Live QA Checklist

Use this checklist after deploying to `https://moneymilo.netlify.app`.

## Authentication and onboarding

- [ ] Sign up with a fresh email.
- [ ] Verification email returns to the MoneyMilo domain.
- [ ] Complete individual onboarding.
- [ ] Confirm household/business onboarding still works when selected.
- [ ] Sign out and sign back in without losing onboarding data.

## Connected financial brain

- [ ] Dashboard loads a Money Pulse score and component scores.
- [ ] Daily briefing uses the latest complete budget month.
- [ ] Priority cards link to the correct module.
- [ ] Data-confidence value is plausible for the available records.
- [ ] The score is labelled as MoneyMilo guidance, not a credit score.

## Budget → connected refresh

- [ ] Add or edit income.
- [ ] Add or edit an expense.
- [ ] Return to Dashboard and confirm surplus/savings rate refresh.
- [ ] Confirm Money Pulse and priorities refresh without signing out.
- [ ] Confirm household/business scope remains correct.

## Goals → connected refresh

- [ ] Create or edit a goal.
- [ ] Confirm committed monthly amount and goal headroom update.
- [ ] Confirm the Goals connected-impact panel is visible.
- [ ] Confirm Dashboard priorities and Projector presets reflect the change.

## Investments and net worth

- [ ] Add or update an investment manually.
- [ ] Test screenshot analysis.
- [ ] Confirm portfolio freshness and allocation are updated.
- [ ] Confirm Net Worth and Money Pulse use the updated values.
- [ ] Confirm no asset or investment is counted twice.

## Projector

- [ ] Test Full surplus preset.
- [ ] Test After goals preset.
- [ ] Test Conservative preset.
- [ ] Confirm projections update and remain mathematically plausible.

## Learn with Milo

- [ ] Confirm the recommended lesson has a reason linked to current finances.
- [ ] Complete one lesson.
- [ ] Confirm XP/progress updates.
- [ ] Confirm the connected brain refreshes after completion.

## Ask Milo

- [ ] Ask: “Am I saving enough for my goals?”
- [ ] Confirm the output renders as structured cards, not raw JSON.
- [ ] Confirm key figures match Budget and Goals.
- [ ] Test an action button that opens a module.
- [ ] Test an action that asks Milo to show the impact.
- [ ] Ask a follow-up and confirm recent context is remembered.
- [ ] Confirm no API key or internal prompt is visible.

## Money Timeline

- [ ] Open Money Timeline from navigation.
- [ ] Confirm wealth snapshots are listed chronologically.
- [ ] Confirm lesson completions appear when present.
- [ ] Confirm recent Ask Milo analyses appear when present.
- [ ] Confirm the page works on desktop and phone.

## Responsive and failure states

- [ ] Test desktop at 100% browser zoom.
- [ ] Test tablet width.
- [ ] Test phone width and bottom/navigation behaviour.
- [ ] Test loading skeletons and empty states.
- [ ] Temporarily trigger a failed AI request and confirm a friendly error appears.
- [ ] Confirm animations respect reduced-motion settings.

## Release sign-off

- [ ] No calculation mismatch found across Dashboard, Budget, Goals, Net Worth and Projector.
- [ ] No raw JSON or Markdown syntax is displayed by Ask Milo.
- [ ] No console-blocking runtime errors.
- [ ] No broken Milo assets.
- [ ] No duplicate income, expenses, investments or assets after edits.
