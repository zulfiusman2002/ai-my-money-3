# MoneyMilo V4 — Milo Becomes the Product

## Release objective

V4 turns Milo from a decorative mascot into a contextual product layer. The financial modules and database model remain intact; the upgrade focuses on character consistency, module-specific guidance, motion and recurring engagement.

## Official Milo character system

V4 uses the same white rabbit face and visual proportions throughout the product. Attire, tools, colour treatment and behaviour change by role:

- **Core Milo** — dashboard and weekly check-in
- **Builder Milo** — budget
- **Investor Milo** — investments
- **Goals Milo** — goals and milestones
- **Scientist Milo** — net-worth analysis
- **Future Milo** — wealth projection
- **AI Milo** — connected financial questions
- **Professor Milo** — learning experience

All production character assets are clean PNGs with transparent backgrounds. The MoneyMilo navigation, loading state and PWA icons now use Milo rather than a letter-based mark.

## Contextual Milo experiences

### Dashboard
- Rebuilt the daily briefing around animated Core Milo.
- Added interactive **One win / One watch-out / One next action** cards.
- Added a compact weekly check-in using current cash flow, net worth and priority-goal data.

### Budget
- Added Builder Milo with live income, spending and available-cash facts.
- Builder Milo can open expense entry or trigger the existing AI budget review.

### Investments
- Added Investor Milo with largest allocation, portfolio count and update-freshness context.
- Milo can open the manual/screenshot update flow or take the user to Ask Milo.

### Goals
- Added Goals Milo with live savings, committed contributions and headroom.
- Milo reacts differently when the goal plan is funded versus overcommitted.

### Net Worth
- Added Scientist Milo to separate valuation movement, liabilities and cash-flow interpretation.
- Live facts show assets, liabilities and the selected-range movement.

### Projector
- Added Future Milo with the 20-year base scenario, monthly system, assumed return and next wealth milestone.
- Milo can switch the projection between nominal values and today’s money.

### Ask Milo
- Added a connected-intelligence hero showing Budget, Wealth and Goals as linked sources.
- AI Milo now visibly enters a thinking motion while reviews or chat responses are loading.

### Learn
- Professor Milo now points during lessons and celebrates completed lessons.
- Lesson cards, answer selection, progress and completion states have dedicated motion.

### Settings
- Added a **Your MoneyMilo team** roster so users can see the eight roles and their purpose.

## Motion system

V4 includes CSS-based motion without adding a heavy animation dependency:

- idle breathing / floating
- wave
- pointing
- thinking
- celebration bounce and sparkles
- glow and orbit effects
- contextual card entrance
- staggered metric reveal
- lesson-card and answer feedback
- graph/card lift interactions

The existing `prefers-reduced-motion` rule remains active, so operating-system accessibility settings reduce motion automatically.

## Technical impact

- Version updated to `4.0.0`.
- No Supabase schema migration.
- No new environment variables.
- No changes to the Anthropic request contract.
- Existing financial calculations, screenshot analysis and database workflows are preserved.
- No new runtime animation package is required.

## Validation completed

- `npm run build` passed.
- `npm run verify` passed.
- Budget, goals, net-worth and projection reconciliation checks passed.
- All Netlify functions passed `node --check`.
- No credentials are embedded in the source package.

## Deployment

Upload the contents of the `MoneyMilo-V4` directory to the root of the existing GitHub repository. Keep the current Netlify settings:

- Base directory: blank
- Package directory: blank
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

Then run **Clear cache and deploy site** in Netlify.
