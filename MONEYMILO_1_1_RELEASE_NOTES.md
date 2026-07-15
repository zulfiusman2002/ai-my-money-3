# MoneyMilo 1.1 — AI Experience

## Release goal

MoneyMilo 1.1 focuses on making Ask Milo answers readable, structured and useful. The underlying financial modules, Supabase schema and Anthropic environment variables remain unchanged.

## Ask Milo output redesign

AI chat answers now request a strict structured response from Claude and render it as a MoneyMilo-native experience rather than a large markdown text block.

A response can now include:

- A direct answer and clear verdict
- The exact figures Milo used
- Impact on named goals
- A concise explanation split into sections
- Prioritised next actions
- Assumptions and missing data
- Suggested follow-up questions
- Confidence level and disclaimer

The user no longer sees raw markdown asterisks or pipe-delimited tables. A defensive fallback renderer still formats legacy or non-JSON replies into headings, bullets and responsive tables.

## Chat UI improvements

- Full-width AI answer cards instead of a narrow purple text bubble
- Distinct user messages and Milo responses
- Larger AI Milo presence
- Animated connected-data thinking state
- Auto-growing multiline question box
- Enter to send and Shift+Enter for a new line
- Copy answer control
- Follow-up question chips
- Clearer empty-state prompts
- Visible Milo availability state
- Improved mobile answer layout

## Focused reviews

The existing Full Review, Budget, Portfolio, Goals, Net Worth, Risk, Savings and Changes analyses now have clearer loading, confidence, insight and action presentation.

## AI configuration

MoneyMilo 1.1 does not include or change the Anthropic API key. It continues to read these Netlify environment variables:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL_FAST`
- `ANTHROPIC_MODEL_FULL`

The chat function still uses the configured fast model for response speed. The existing fallback model identifier remains unchanged in the backend.

## Database and deployment

- No new Supabase migration
- No new environment variables
- Existing V4.1 adaptive-profile migration remains sufficient
- Existing Netlify build settings remain unchanged

## Validation

- Financial reconciliation verification passed
- Release structure and embedded-secret checks passed
- Production Vite build passed
- All Netlify functions passed Node syntax validation
