# Architecture decisions

Short notes on *why* the code looks the way it does. Implementation detail lives in the code;
this file exists so a reviewer can follow the reasoning without reading every module.

## 1. The model observes, the backend decides

An LLM asked for a "lighting score out of 100" will happily produce one, and it will be
unreproducible. So the vision prompt never asks for a score. It asks for countable, describable
facts: how many windows are visible, how open the glazing is, how bright the scene reads, how many
fixtures appear, how evenly light is distributed.

`app/services/scoring.py` turns those observations into numbers with plain arithmetic and lookup
tables. The consequences:

- The same observations always produce the same score.
- Every score can be explained to the user field by field.
- The scoring rules are unit-testable without calling any API.
- Changing the weighting is a config change, not a prompt change.

## 2. Deterministic validation sits after every generative step

The budget chain asks for three packages within ₹5,000 / ₹20,000 / ₹50,000. Models mis-add.
`app/services/budget.py` therefore re-sorts items by priority, drops anything that would breach
the ceiling, recomputes the total and the remainder, and substitutes a baseline package if the
model returned nothing usable. The API contract — three tiers, never over budget — is guaranteed by
code, not by prompt compliance.

## 3. Degradation is layered, not all-or-nothing

Only one step genuinely requires the vision API: producing a *new* analysis. Everything downstream
degrades independently.

| Step | If the AI call fails |
|---|---|
| Room analysis | Hard failure with an actionable `503` — never a fabricated result |
| Improvement plan | Falls back to the model's own `suggested_improvements` |
| Budget packages | Falls back to validated baseline packages |
| Makeover prompt | Falls back to a deterministic per-style prompt |
| Image generation | Falls back to the Design Mockup (the default state) |
| Report narrative | Falls back to a narrative composed from stored scores |

Login, dashboard, history, saved analyses, mockups and report downloads keep working with the AI
service completely down.

## 4. Cost control is structural

- Saved analyses are read from PostgreSQL. Opening one never re-runs the model.
- Makeover concepts are cached per `(analysis, style)` and only regenerated with `force: true`.
- Image generation happens only on explicit user action.
- Rate limits cap the per-user call volume on every AI-touching endpoint.

## 5. Prompts are files, not string literals

`app/ai/prompts/*.txt` keeps prompt text reviewable and diffable, and stops route handlers from
accumulating AI logic. Route handlers call services; services call chains; chains own prompts.

## 6. Images are re-encoded, not merely checked

`validate_and_normalise` does not trust the declared MIME type or the extension. Pillow decodes the
bytes, `verify()` rejects truncated files, and the image is re-encoded to JPEG. Re-encoding drops
EXIF metadata and any payload appended after the image data, which is a cheap and effective defence
against polyglot uploads. Three derivatives are produced: a stored original, a downscaled copy for
the model (smaller payload, lower latency, lower cost) and a thumbnail for list views.

## 7. Protected images need a fetch, not an `<img src>`

Analysis images are ownership-checked, so they require an `Authorization` header — which a plain
`<img>` tag cannot send. `useProtectedImage` fetches the blob, creates an object URL and revokes it
on unmount. The alternative, signed public URLs, would have made report and image links guessable.

## 8. Design tokens over utility soup

Colour, radius, shadow, typography and motion values live in CSS custom properties
(`src/index.css`) and are surfaced through the Tailwind theme. Components reference
`bg-surface` or `text-muted`, never a hex value, which is what makes the dark theme a single
variable block rather than a per-component effort.

## 9. Motion has a budget

Animation is limited to opacity and transform (compositor-friendly), uses one shared easing curve,
fires scroll reveals once, and is fully disabled by `prefers-reduced-motion` both globally in CSS
and per-component via Motion's `useReducedMotion`.

## 10. Server state and client state are separated

TanStack Query owns anything that came from the API, including caching and invalidation. React
context owns only auth session state. Component state owns UI concerns. Redux would have added a
third pattern for no benefit at this size.
