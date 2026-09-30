# RoomStyle AI

**AI Room Style Detection & Interior Design Recommendation**

Photograph a room. Get back a design-style reading with the evidence behind it, a transparent
room-health score, prioritised improvements, three costed makeover packages, a before/after
visualization and a downloadable PDF consultancy report.

> **No custom machine-learning model is trained anywhere in this project.** RoomStyle AI calls a
> *pretrained* multimodal vision model through the Google GenAI SDK and keeps every number the user sees under
> deterministic backend control. That separation is the central architectural idea — see
> [Architecture](#architecture).

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Folder structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Quick start with Docker](#quick-start-with-docker)
- [Local development without Docker](#local-development-without-docker)
- [Environment variables](#environment-variables)
- [Google AI Studio and Gemini setup](#google-ai-studio-and-gemini-setup)
- [Optional image generation setup](#optional-image-generation-setup)
- [Database migrations](#database-migrations)
- [Seed and demo data](#seed-and-demo-data)
- [Tests](#tests)
- [Linting and formatting](#linting-and-formatting)
- [API documentation](#api-documentation)
- [Security notes](#security-notes)
- [Production notes](#production-notes)
- [Troubleshooting](#troubleshooting)
- [Scope and limitations](#scope-and-limitations)

---

## Overview

RoomStyle AI is an **interior design analysis assistant**. It is deliberately *not* an autonomous
architect and makes no professional engineering claims.

The user journey is:

```
Upload room → Understand room → Improve room → Visualize room → Download report
```

Everything the user sees is grounded in one photograph. Where the model cannot be certain, the
application says so rather than inventing detail.

---

## Features

### Analysis
- Email/password registration and login with JWT access + refresh tokens
- Upload by drag-and-drop, file picker or live device camera (rear camera preferred on mobile)
- Server-side image validation, EXIF stripping, normalisation and thumbnail generation
- Structured analysis: room type, primary style, confidence estimate, alternative styles, style
  evidence and explanation
- Furniture, materials, wall colour, flooring, dominant colour palette and warm/cool characterisation
- Every furniture and material entry labelled **observed** or **inferred**

### Scoring
- Lighting, ventilation and space-utilisation scores (0–100) computed by a deterministic,
  unit-tested Python formula — never by the model
- Weighted overall room-health score with configurable weights (default 35 / 25 / 40)
- Every score ships with its input signals, a plain-language summary and the
  *Visual AI-assisted assessment* label

### Recommendations
- Categorised improvement plan: quick wins, lighting, furniture, colour, material, decor
- Each item carries a reason, an expected impact, a priority and an optional estimated cost
- Three makeover packages at **₹5,000 / ₹20,000 / ₹50,000**, validated in code so no package can
  ever exceed its budget

### Visualization and reporting
- Before/after comparison slider with a target-style selector across all seven styles
- Optional **AI Concept Visualization**; always-available deterministic **Design Mockup** fallback
- Multi-page ReportLab PDF: cover with the original photo, executive summary, style evidence,
  detected furniture and materials, palette strips, score meters, costed tables and a disclaimer

### Product
- Premium landing page, dark/light/system theming, full keyboard accessibility, reduced-motion
  support and a mobile-first camera flow
- Analysis history with search, style and room-type filters, and pagination
- Ownership enforced in the backend on every analysis, image and report request

---

## Architecture

```
React (Vite + TypeScript)
   │  multipart upload
   ▼
FastAPI route  ──▶  rate limit ─▶ JWT auth ─▶ ownership check
   │
   ▼
Image validation & normalisation      (Pillow — decode, verify, re-encode, resize)
   │
   ▼
Google GenAI SDK  ──▶  Gemini vision  ──▶  structured RoomAnalysis (Pydantic)
   │
   ▼
Deterministic scoring engine          ← the ONLY source of user-visible scores
   │
   ▼
Google GenAI recommendation call ──▶  improvement plan
Google GenAI budget call          ──▶  deterministic budget validator
   │
   ▼
Optional image generation (explicit, cached, never required)
   │
   ▼
ReportLab PDF  ──▶  local storage service  ──▶  PostgreSQL persistence
```

**Two rules shape the whole codebase:**

1. **The model observes; the backend decides.** The vision model returns qualitative visual
   observations. `app/services/scoring.py` converts them into numbers using fixed, readable,
   tested arithmetic. If the model hallucinated a score, the user would never see it — the model is
   never asked for one.
2. **Nothing critical depends on an optional service.** Image generation is opt-in. Recommendation,
   budget and report-narrative chains each degrade to a deterministic fallback. Only a *new*
   analysis genuinely requires the vision API, and when it is unavailable the user gets a clear,
   actionable error instead of fabricated results.

### Provider abstractions

| Interface | Shipped implementation | Swap by |
|---|---|---|
| `VisionAnalysisProvider` | `GeminiVisionProvider` | editing `get_vision_provider()` |
| `ImageGenerationProvider` | `PixazoImageGenerationProvider`, `LocalVisualizationProvider` | `IMAGE_GENERATION_PROVIDER` |
| `ReportGenerator` | `ReportLabReportGenerator` | injecting into `ReportService` |
| `StorageService` | `LocalStorageService` | implementing `StorageService` (e.g. S3) |

### Source of truth

| Concern | Authority |
|---|---|
| API validation | Backend Pydantic schemas (`app/schemas/`) |
| AI output parsing | AI structured schemas (`app/ai/schemas.py`) |
| Persistence | SQLAlchemy models (`app/models/`) |
| Client contracts | `frontend/src/types/api.ts` — mirrors the public API |

---

## Tech stack

**Frontend** — React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui (Radix primitives) ·
Motion for React · lucide-react · React Router · TanStack Query · React Hook Form · Zod · Axios ·
Recharts · Vitest + Testing Library

**Backend** — Python 3.12 · FastAPI · Uvicorn · Pydantic v2 · pydantic-settings · SQLAlchemy 2.x
(async) · Alembic · PostgreSQL · asyncpg · PyJWT · pwdlib (Argon2) · httpx · Pillow · OpenCV ·
ReportLab · pytest · Ruff · mypy

**AI** — Google GenAI SDK (`google-genai`) with Pydantic structured outputs. The deprecated
The legacy Google SDK and adapter packages are intentionally not installed.

---

## Folder structure

```
room-style-ai/
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   │   ├── chains/          room_analysis · recommendations · makeover · report_content
│   │   │   ├── prompts/         all prompt text, versioned as files
│   │   │   ├── schemas.py       structured AI output contracts
│   │   │   ├── provider.py      VisionAnalysisProvider + Gemini implementation
│   │   │   └── image_gen.py     ImageGenerationProvider + Pixazo/local implementations
│   │   ├── api/
│   │   │   ├── deps.py          auth, session and service dependencies
│   │   │   └── v1/              router, serializers, routes/
│   │   ├── core/                config · security · errors · logging · rate_limit
│   │   ├── db/                  base · session · seed
│   │   ├── models/              users · analyses · images · recommendations · makeovers · reports
│   │   ├── schemas/             request/response contracts
│   │   ├── services/            scoring · budget · image_validation · analysis · makeover · report
│   │   ├── storage/             StorageService + local filesystem implementation
│   │   └── main.py
│   ├── alembic/                 migration environment + initial migration
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                 typed clients: auth · analysis · recommendations · makeover · reports
│   │   ├── components/          ui/ · landing/ · analysis/ · branding/
│   │   ├── hooks/ layouts/ lib/ pages/ stores/ types/
│   │   └── __tests__/
│   ├── public/
│   └── Dockerfile
├── docs/
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Prerequisites

| Path | Requirements |
|---|---|
| Docker | Docker Engine 24+ with Compose v2 |
| Local dev | Python 3.12+, Node.js 20+, PostgreSQL 14+ (or SQLite for a quick trial) |
| Both | A free Gemini API key from Google AI Studio |

---

## Quick start with Docker

```bash
git clone <your-repo-url> room-style-ai
cd room-style-ai

cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"   # paste into JWT_SECRET_KEY
# add your GEMINI_API_KEY to .env

docker compose up --build
```

| Service | URL |
|---|---|
| Application | http://localhost:3000 |
| API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

Migrations run automatically on backend start.

```bash
docker compose down       # stop, keep the database and uploads
docker compose down -v    # stop and delete all volumes (destructive)
docker compose logs -f backend
```

---

## Local development without Docker

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt

cp ../.env.example .env            # edit DATABASE_URL and GEMINI_API_KEY
alembic upgrade head
uvicorn app.main:app --reload
```

For the fastest possible trial, SQLite works without any database server:

```env
DATABASE_URL=sqlite+aiosqlite:///./roomai.db
```

PostgreSQL remains the primary database and the only one used in Docker.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api`, `/capabilities`, `/health` and `/docs`
to `http://localhost:8000`, so no CORS configuration is needed in development.

---

## Environment variables

Full documented list in [`.env.example`](.env.example). The ones that matter most:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | Async SQLAlchemy URL (`postgresql+asyncpg://…` or `sqlite+aiosqlite:///…`) |
| `JWT_SECRET_KEY` | — | **Required.** Long random string; rotating it invalidates all sessions |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime |
| `GEMINI_API_KEY` | — | Required for new analyses |
| `GEMINI_MODEL` | `gemini-3.6-flash` | Vision model identifier |
| `MAX_UPLOAD_MB` | `10` | Upload ceiling, enforced on the server |
| `CORS_ORIGINS` | localhost | Comma-separated allowed browser origins |
| `SCORE_WEIGHT_*` | `0.35 / 0.25 / 0.40` | Room-health weighting; normalised automatically |
| `RATE_LIMIT_*` | see file | `requests/seconds` per endpoint group |
| `PIXAZO_IMAGE_PROVIDER_ENABLED` | `false` | Opt in to AI image generation |
| `DEMO_MODE` | `false` | Enables seeded sample data and the in-app demo badge |

**Secrets never reach the browser.** `GEMINI_API_KEY`, `PIXAZO_API_KEY`, `JWT_SECRET_KEY` and
`DATABASE_URL` are read only by the backend. The frontend learns which optional features exist
through `GET /capabilities`, which returns booleans and model names — never key material. Anything
prefixed `VITE_` is compiled into the public bundle, so never put a secret there.

---

## Google AI Studio and Gemini setup

1. Go to **https://aistudio.google.com/apikey** and sign in with a Google account.
2. Create an API key (the free tier is sufficient for coursework and demos).
3. Put it in `.env`:
   ```env
   GEMINI_API_KEY=your-key
   GEMINI_MODEL=gemini-3.6-flash
   ```
4. Restart the backend and check `GET /capabilities` — `vision_enabled` should be `true`.

If the model identifier is not available to your key, the API returns a clear
`ai_model_unavailable` error naming the configured model. Set `GEMINI_MODEL` to a multimodal model
your account can access; no other code changes are needed.

Free tiers are rate limited. The app surfaces quota exhaustion as a readable message and never
fabricates an analysis to cover it.

---

## Optional image generation setup

Image generation is **off by default** and is never required.

```env
IMAGE_GENERATION_PROVIDER=pixazo
PIXAZO_IMAGE_PROVIDER_ENABLED=true
PIXAZO_API_KEY=your-key
PIXAZO_BASE_URL=https://api.pixazo.com/v1
PIXAZO_MODEL=flux-schnell-free
```

The endpoint, model and key are all environment-driven, so you can point the provider at whichever
free or fair-use tier is currently advertised without touching the code. Verify the current free
model name in your provider's dashboard before enabling it.

With generation disabled — or if it returns 401/403/429/402 or an undecodable response — the
before/after view falls back to the deterministic **Design Mockup**: the target palette plus
concrete furniture, lighting, material and decor changes. Analysis is unaffected either way.

---

## Database migrations

`create_all()` is never used as the migration mechanism. Alembic owns the schema.

```bash
cd backend
alembic upgrade head                                  # apply
alembic revision --autogenerate -m "describe change"  # create after editing models
alembic downgrade -1                                  # roll back one revision
alembic current                                       # inspect
```

In Docker, `entrypoint.sh` runs `alembic upgrade head` before starting Uvicorn.

---

## Seed and demo data

```bash
cd backend
python -m app.db.seed
```

Creates the demo user from `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD`. **No credentials are hard-coded
in source control** — if `DEMO_USER_PASSWORD` is unset, a random password is generated and printed
once for that run.

With `DEMO_MODE=true` the script also creates one fully-formed sample analysis (generated
placeholder image, scores, recommendations and budget packages) so the dashboard, history and
recommendation screens are populated before the first real upload. Demo mode is clearly badged in
the sidebar. The production path always uses the real AI.

In Docker, set `SEED_ON_START=true` to seed automatically on boot.

---

## Tests

### Backend

```bash
cd backend
pytest                    # full suite
pytest -v --tb=short
pytest tests/test_scoring.py
```

Tests run against SQLite with a stub vision provider, so the suite is fast, offline and free.
Coverage includes registration, duplicate email, Argon2 hashing, JWT validation and type confusion,
unauthorised access, protected routes, file validation, oversized uploads, corrupted and disguised
images, path traversal, the scoring engine, budget validation, analysis persistence, cross-user
authorisation, AI provider error classification, report generation and PDF output.

### Frontend

```bash
cd frontend
npm test
npm run test:watch
```

Covers the login and register forms, route protection, upload UI validation, result rendering and
error states.

---

## Linting and formatting

```bash
# Backend
cd backend
ruff check .
ruff format .
mypy app

# Frontend
cd frontend
npm run lint
npm run format
```

---

## API documentation

Interactive OpenAPI docs are generated by FastAPI with meaningful descriptions and examples.

| Surface | URL |
|---|---|
| Swagger UI | `/docs` |
| ReDoc | `/redoc` |
| OpenAPI JSON | `/openapi.json` |

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/auth/register` | Create an account |
| POST | `/api/v1/auth/login` | Sign in |
| POST | `/api/v1/auth/refresh` | Rotate tokens |
| POST | `/api/v1/auth/logout` | End session |
| GET | `/api/v1/auth/me` | Current user |
| POST | `/api/v1/analyses` | Analyse a room photograph |
| GET | `/api/v1/analyses` | List (filter, search, paginate) |
| GET | `/api/v1/analyses/stats` | Dashboard aggregates |
| GET | `/api/v1/analyses/{id}` | Saved analysis (no AI call) |
| DELETE | `/api/v1/analyses/{id}` | Delete |
| GET | `/api/v1/analyses/{id}/recommendations` | Improvements + budgets |
| POST/GET | `/api/v1/analyses/{id}/makeover` | Create / list visualizations |
| POST | `/api/v1/analyses/{id}/report` | Generate PDF |
| GET | `/api/v1/reports/{id}/download` | Download PDF |
| GET | `/health`, `/ready`, `/capabilities` | Liveness, readiness, runtime features |

Errors always use one envelope:

```json
{ "error": { "code": "ai_quota_exceeded", "message": "…", "details": null } }
```

---

## Security notes

- **Passwords** — Argon2 via `pwdlib`. Plaintext is never stored or logged.
- **Generic auth errors** — login failures return an identical message whether or not the email
  exists, so the endpoint cannot enumerate accounts.
- **Ownership** — enforced server-side on every analysis, image, makeover and report request.
  A request for another user's resource returns `404`, revealing nothing about its existence.
- **Report URLs** — UUID-based *and* authorisation-checked; they are not publicly guessable links.
- **Uploads** — MIME type and extension are treated as hints only. Pillow decodes and re-encodes
  every image, which strips EXIF and any appended payload. Files are stored under UUID names;
  original filenames never touch the filesystem.
- **Path traversal** — the storage service resolves every key and refuses anything outside its
  bucket root.
- **Rate limiting** — sliding-window limits on login, registration, analysis, makeover and report
  endpoints, all configurable.
- **Headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and a camera-scoped
  `Permissions-Policy` on every response.
- **Logging** — structured JSON with request IDs and AI call durations. Passwords, tokens, API keys
  and room images are never logged.
- **SQL injection** — all access goes through SQLAlchemy's parameterised query layer.

---

## Production notes

This is a college project, so a few deliberate simplifications would need revisiting before real
production use:

- Rate limiting is in-process. Move to Redis before running multiple backend replicas.
- Storage is a local volume. Implement `StorageService` against S3-compatible storage for
  horizontal scaling; the interface already exists for exactly this.
- Refresh tokens are stateless. Add a revocation list if you need forced logout.
- Terminate TLS at a reverse proxy and set `APP_ENV=production`, `DEBUG=false`.
- Run `docker compose` with a real secret manager rather than a `.env` file.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `ai_not_configured` on analyse | `GEMINI_API_KEY` is empty. Add it to `.env` and restart the backend. |
| `ai_auth_failed` | The key was rejected. Regenerate it in Google AI Studio and check for stray whitespace. |
| `ai_quota_exceeded` | Free-tier limit reached. Wait for the reset window or use another key. Existing analyses and reports still work. |
| `ai_model_unavailable` | Your key cannot access `GEMINI_MODEL`. Set it to a multimodal model you can access. |
| `corrupt_image` on a real photo | The file is truncated or renamed from another format. Re-export as JPEG or PNG. |
| `413 file_too_large` | Above `MAX_UPLOAD_MB`. Raise the limit or let the client compressor shrink the photo. |
| Camera permission denied | The app shows per-browser re-enable instructions and offers upload as a fallback. Browsers only allow camera access over `https://` or `localhost`. |
| PostgreSQL unavailable | `docker compose ps` — wait for `db` to report healthy; the backend already waits on that healthcheck. |
| `relation "users" does not exist` | Migrations were not applied. Run `alembic upgrade head`. |
| CORS errors in dev | Use the Vite proxy (default) or add your origin to `CORS_ORIGINS` and restart. |
| Frontend/backend URL mismatch | Check `VITE_API_BASE_URL`; it must be `/api/v1` when served behind the bundled nginx. |
| `docker compose up` build fails | `docker compose build --no-cache`; make sure Docker has ≥4 GB of memory. |
| Image generation silently absent | Expected. It is disabled by default — the Design Mockup is the intended fallback. |

---

## Scope and limitations

RoomStyle AI provides **AI-assisted visual design analysis intended for inspiration and planning.**

Scores are visual estimates derived from a single photograph. They are **not** professional
architectural, structural, ventilation, lighting, safety or environmental measurements. The
application does not certify anything, does not measure lux levels, air-change rates or floor areas,
and does not replace a qualified designer, architect or engineer.

Confidence values are subjective **AI confidence estimates**, not calibrated statistical
probabilities. Costs are **estimates** at typical Indian retail prices and should be confirmed with
local suppliers before purchase.

---

## Licence

MIT — see the licence field in the OpenAPI metadata. Built as an educational project.
