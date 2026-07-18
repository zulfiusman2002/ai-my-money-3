# MoneyMilo 2.1 — Premium Intelligence

## Release goal

MoneyMilo 2.1 builds on the connected financial brain introduced in 2.0. The focus is not another finance module. It makes the existing product feel more memorable, visual and easier to use across the public website, Dashboard, Ask Milo, Learn and onboarding.

## Milo Vision

The Dashboard now includes a full-screen, animated daily briefing experience:

- Personal greeting and Money Pulse
- Current net worth and movement since the previous snapshot
- One positive signal and one item to watch
- One clear next action linked to the relevant module
- Keyboard navigation, mobile layout and reduced-motion support

Milo Vision opens once per day for each signed-in user and can be replayed from the Dashboard using **Present my day**.

## Ask Milo visual answers

Ask Milo can now return an optional visual summary alongside the existing verdict, figures, goal impacts and actions.

The visual response supports:

- Score
- Affordability
- Goal progress
- Comparison
- Cash-flow views

It can show a main figure, a comparison or impact figure, an evidence-based progress ring and a short explanation. Older saved answers that do not contain the new visual object still receive a derived visual summary from their existing metrics.

The composer also adds four response modes:

- Make a decision
- Compare options
- Explain clearly
- Build a plan

The selected mode is supplied to Claude as response context without changing the user-visible question.

## Learn with Professor Milo

The Academy now has a persistent learning command bar that clearly shows:

- The current or next lesson
- Why Professor Milo selected it
- Course or lesson progress
- The next action to take

This reinforces the course journey without replacing the existing lesson cards, quiz, XP, streak and curriculum path.

## Onboarding clarity

A conversational **Milo asks** panel is now shown in the onboarding workspace. It mirrors the adaptive interview prompt and remains visible on mobile, where the large desktop Milo panel is hidden.

The underlying individual, household and business profile model remains unchanged.

## Public website

The landing page was rebuilt as a stronger product story:

- New connected-finance hero
- Animated Milo and product preview cards
- MoneyMilo OS explanation
- Connected-module visual
- AI Milo, Professor Milo and Future Milo product sections
- Stronger signup call to action
- Responsive phone, tablet and desktop layouts

## Motion and accessibility

- New Milo Vision transitions and character motion
- Visual answer animation and progress states
- Improved page entry motion
- Responsive layouts for the new experiences
- `prefers-reduced-motion` support for the major new animations

## AI, database and environment

MoneyMilo 2.1 does **not** include or alter any secret.

The following existing Netlify variables remain unchanged:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL_FAST`
- `ANTHROPIC_MODEL_FULL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No new Supabase migration is required beyond `supabase/phase-4-1.sql` when that migration has already been applied.

## Validation completed

- Budget, Goals, Net Worth and Projector reconciliation tests passed
- Connected financial brain and adaptive lesson tests passed
- Complete and interrupted AI response formatting tests passed
- New AI visual-object test passed
- Release structure and embedded-secret checks passed
- Every Netlify function and shared JavaScript file passed syntax validation
- Production Vite build passed
- Production dependency audit returned zero known vulnerabilities

## Important live checks

A local build cannot verify production Supabase data, email authentication, Anthropic entitlement or Netlify runtime configuration. Complete the supplied live QA checklist after deployment.
