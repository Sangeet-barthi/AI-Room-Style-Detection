# API reference

Base path: `/api/v1`. Interactive documentation: `/docs` (Swagger UI) and `/redoc`.

All authenticated endpoints expect:

```
Authorization: Bearer <access_token>
```

## Error envelope

Every error response uses the same shape:

```json
{
  "error": {
    "code": "ai_quota_exceeded",
    "message": "The AI free-tier quota has been reached. Please wait for the quota to reset or configure a different API key.",
    "details": null
  }
}
```

| Status | Typical codes |
|---|---|
| 400 | `bad_request` |
| 401 | `authentication_failed`, `invalid_token` |
| 403 | `permission_denied` |
| 404 | `not_found` |
| 409 | `conflict` |
| 413 | `file_too_large` |
| 415 | `unsupported_media_type` |
| 422 | `validation_error`, `corrupt_image`, `image_too_small`, `invalid_style` |
| 429 | `rate_limited` |
| 500 | `internal_error` |
| 503 | `ai_unavailable`, `ai_quota_exceeded`, `ai_auth_failed`, `ai_model_unavailable`, `ai_not_configured` |

Stack traces are never returned. In debug mode only, `details` may carry the exception message.

## Authentication

### `POST /auth/register` → `201`

```json
{ "full_name": "Akshay Patil", "email": "akshay@example.com", "password": "StrongPass123" }
```

Passwords require 8+ characters with at least one uppercase letter, one lowercase letter and one
digit. Returns a `TokenResponse`.

### `POST /auth/login` → `200`

```json
{ "email": "akshay@example.com", "password": "StrongPass123" }
```

Returns a `TokenResponse`. Failures return an identical message whether or not the account exists.

### `TokenResponse`

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "uuid",
    "email": "akshay@example.com",
    "full_name": "Akshay Patil",
    "is_demo": false,
    "created_at": "2026-01-01T10:00:00Z"
  }
}
```

### Other auth endpoints

| Endpoint | Notes |
|---|---|
| `POST /auth/refresh` | Body `{ "refresh_token": "..." }`. Rotates both tokens. An access token is rejected here. |
| `POST /auth/logout` | Acknowledges sign-out; the client discards its tokens. |
| `GET /auth/me` | Current user profile. |
| `PATCH /auth/me` | Body `{ "full_name": "..." }`. |
| `POST /auth/change-password` | Body `{ "current_password": "...", "new_password": "..." }`. |

## Analyses

### `POST /analyses` → `201`

`multipart/form-data`:

| Field | Type | Required |
|---|---|---|
| `image` | file (JPEG/PNG/WEBP) | yes |
| `title` | string | no |

Runs the full pipeline and returns an `AnalysisDetail`. Rate limited by `RATE_LIMIT_ANALYSIS`.

### `GET /analyses`

Query parameters: `page` (≥1), `page_size` (1–50), `room_type`, `style`, `search`.

```json
{ "items": [], "total": 0, "page": 1, "page_size": 12, "has_more": false }
```

### `GET /analyses/stats`

Totals, average room-health score, report count, style and room-type distributions, score trend and
the latest analysis summary.

### `GET /analyses/{id}`

Returns the persisted `AnalysisDetail`. **No AI call is made.**

### `GET /analyses/{id}/recommendations`

Stored improvement plan, the three budget packages and the score block.

### `GET /analyses/{id}/images/{image_id}`

Streams the image. Ownership is verified per request.

### `DELETE /analyses/{id}` → `204`

Deletes the analysis, its images, recommendations, visualizations and reports.

## Makeover

### `POST /analyses/{id}/makeover` → `201`

```json
{ "target_style": "Minimalist", "force": false }
```

`target_style` must be one of the seven supported styles. With `force: false` an existing AI
concept for that style is reused. Returns:

```json
{
  "id": "uuid",
  "target_style": "Minimalist",
  "kind": "design_mockup",
  "provider": "local",
  "label": "Design Mockup",
  "image_url": null,
  "mockup": {
    "palette": [{ "name": "Paper White", "hex": "#F8F7F4" }],
    "furniture_changes": ["Reduce to essential pieces only"],
    "lighting_changes": ["Even, diffused ceiling light"],
    "decor_changes": ["One considered object per surface"],
    "material_changes": ["Pale oak, matte white paint, natural cotton"]
  },
  "note": "AI image generation is not configured.",
  "created_at": "2026-01-01T10:00:00Z"
}
```

`kind` is `ai_concept` (label *AI Concept Visualization*, with `image_url`) or `design_mockup`
(label *Design Mockup*, `image_url` is `null`). This endpoint does not fail when generation is
unavailable.

### `GET /analyses/{id}/makeover`

All visualizations for the analysis.

### `GET /analyses/{id}/makeover/{makeover_id}/image`

Streams a stored AI concept image.

## Reports

| Endpoint | Notes |
|---|---|
| `POST /analyses/{id}/report` → `201` | Renders and stores the PDF; returns metadata with `download_url`. |
| `GET /reports` | All reports owned by the user, newest first. |
| `GET /reports/{id}` | Report metadata. |
| `GET /reports/{id}/download` | `application/pdf` with `Content-Disposition: attachment`. |

Requesting another user's report returns `404`.

## System

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness. |
| `GET /ready` | Readiness — verifies the database connection. |
| `GET /capabilities` | Non-secret runtime feature flags, supported styles and room types, budget tiers and the upload limit. |
