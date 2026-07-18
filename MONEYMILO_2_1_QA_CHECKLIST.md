# MoneyMilo 2.1 — Live QA Checklist

Test with the existing demo profile and one fresh test account. Use a laptop and a phone.

## 1. Deployment and authentication

- Confirm the landing page loads at `https://moneymilo.netlify.app`.
- Sign in with an existing account.
- Create a fresh account, verify the email and complete onboarding.
- Confirm the active Netlify environment variables remain present.

## 2. Milo Vision

- Open the Dashboard and confirm Milo Vision appears once for the day.
- Move through all four briefing screens.
- Confirm the Money Pulse, net worth, movement, win, watch-out and next action match the Dashboard.
- Use the action button and confirm it opens Goals.
- Close the presentation, refresh and confirm it does not automatically reopen the same day.
- Select **Present my day** and confirm it reopens manually.
- Test Escape and arrow keys on laptop.
- Test the full-screen mobile layout.

## 3. Ask Milo

- Test one question in each mode: decision, comparison, explanation and plan.
- Confirm the answer displays a verdict and visual summary rather than JSON or raw Markdown.
- Confirm figures match the stored MoneyMilo data.
- Confirm the progress ring is only shown when Claude returns a defensible percentage.
- Test an older saved answer and confirm a visual summary is derived from its metrics.
- Test action buttons and follow-up questions.
- Confirm interrupted JSON still recovers into structured cards.

## 4. Learn with Milo

- Confirm the Academy command bar shows the next lesson and why it was chosen.
- Start the lesson from the command bar.
- Move through concept, example, reflection and quiz.
- Complete the quiz and confirm XP, streak and course progress update.
- Confirm the next lesson action appears after completion.

## 5. Onboarding

- Test individual, two-person household, business-only and combined household/business profiles.
- Confirm the **Milo asks** prompt matches the current adaptive step.
- Confirm the prompt is visible on mobile.
- Confirm household and business totals remain separate.

## 6. Responsive and accessibility

- Test widths around 390px, 768px, 1280px and 1600px.
- Confirm landing cards, Milo Vision, AI visual answers and Academy command bar do not overflow.
- Enable reduced motion in the operating system and confirm the main new animations are disabled.
- Test keyboard focus for briefing controls and Ask Milo response modes.

## Release blocker rules

Block release for:

- Incorrect financial figures
- Raw JSON visible to users
- Broken authentication or onboarding
- Household and business double counting
- Milo Vision trapping the user or preventing navigation
- Mobile overflow that hides core controls

Minor animation or spacing issues can be logged separately.
