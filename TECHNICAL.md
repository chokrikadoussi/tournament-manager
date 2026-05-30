> **Technical reference** for Tournament Manager.
> For the product's purpose and business value, see the [README](./README.md).
> This document is wiki-ready: its sections can be copied as-is into the GitHub Wiki once enabled.

# Tournament Manager — Technical Documentation

A full-stack web application for managing sports tournaments — from competitor registration to bracket generation and match results tracking.

**Live app:** [tournoi.chokri.tech](https://tournoi.chokri.tech)
**API:** [open-taekwondo-api-0bfc22610b36.herokuapp.com](https://open-taekwondo-api-0bfc22610b36.herokuapp.com/health)

---

## Overview

Tournament Manager covers the full lifecycle of a sports competition:

- **Competitor management** — register players or teams with profile data (gender, birth year)
- **Tournament lifecycle** — state machine from draft to completion (`DRAFT → OPEN → IN_PROGRESS → COMPLETED`)
- **Category system** — group competitors by age range and gender, each with its own independent lifecycle
- **Bracket generation** — single elimination (with ATP-style seeding) and round robin (circle method)
- **Match results** — record outcomes round by round with automatic winner progression
- **Third place & repechage** — petite finale for a single bronze; empty repechage bracket on the PDF
- **PDF export** — printable draw sheets per category (landscape A4), with bye absorption and per-category mat number

---

## Tech Stack

### Backend

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 (ES Modules) |
| Framework | Express 5 |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Database | PostgreSQL 16 |
| Validation | Zod 4 |
| Logging | pino + pino-http |
| Security | Helmet, express-rate-limit |
| Deployment | Heroku (with `release` phase migrations) |

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 8 |
| Routing | React Router 7 |
| Data fetching | TanStack Query 5 |
| Tables | TanStack Table 8 |
| UI components | shadcn/ui (Radix UI + Tailwind CSS 4) |
| PDF generation | jsPDF |
| HTTP client | Axios |
| Deployment | Vercel |

---

## Architecture

The project follows a monorepo structure with a strict separation between backend and frontend.

```
tournament-manager/
├── src/                        # Express API
│   ├── index.js                # App entry point (middleware, mounts)
│   ├── db.js                   # Prisma singleton (env-aware SSL)
│   ├── lib/
│   │   ├── AppError.js         # Custom error class with HTTP status
│   │   ├── asyncWrap.js        # Async error propagation to Express
│   │   ├── paginate.js         # Cursor/offset pagination helpers
│   │   ├── rateLimiter.js      # Read/write rate limit configs
│   │   └── validate.js         # Zod validation wrapper
│   ├── middleware/
│   │   ├── errorHandler.js     # Global error → JSON response
│   │   └── notFound.js         # 404 catch-all
│   ├── competitors/            # CRUD + statistics
│   ├── tournaments/            # CRUD + lifecycle state machine
│   ├── categories/             # CRUD + independent lifecycle + gate rules
│   ├── registrations/          # Register / unregister / seed assignment / CSV import
│   ├── bracket/
│   │   ├── bracket.service.js  # Generation dispatcher
│   │   ├── bracket.utils.js    # Seeding, power-of-two helpers
│   │   └── generators/
│   │       ├── singleElim.js   # Single elimination + bye propagation
│   │       └── roundRobin.js   # Round robin (Berger tables / circle method)
│   └── matches/                # Result recording + bracket progression
├── prisma/
│   ├── schema.prisma           # Data model
│   └── migrations/             # Migration history
├── frontend/
│   └── src/
│       ├── api/                # Axios-based API clients (one per domain)
│       ├── components/         # Shared UI components
│       ├── pages/              # Route-level components
│       └── lib/                # PDF export, toast helpers, utils
└── scripts/                    # Local-only SQL / ops scripts (git-ignored)
```

### Key design decisions

**Service / Controller / Router separation** — controllers handle HTTP concerns (req/res, status codes), services hold business logic and throw `AppError`, routers declare routes and apply middleware. This keeps each layer independently testable.

**Tournament status as a gate** — the tournament's status controls what category operations are allowed. A category can only be opened when the tournament is `OPEN`; a bracket can only be generated when the tournament is `OPEN` or `IN_PROGRESS`. This prevents orphaned state without requiring complex validations in each endpoint.

**Category lifecycle is independent** — each category follows its own `DRAFT → OPEN → IN_PROGRESS → COMPLETED` cycle within the tournament container. Starting a category automatically transitions the tournament to `IN_PROGRESS` if it hasn't already. A category is only marked `COMPLETED` when no playable match remains (final **and** petite finale included); the tournament completes only once all its non-cancelled categories are done.

**Bracket per category** — match generation (`generateSingleElim`, `generateRoundRobin`) accepts an optional `categoryId` that is stamped on every match created. This enables parallel brackets within a single tournament. Match completion, third-place routing and the repechage size are all scoped per category.

**Standard fold seeding** — top seeds are distributed into opposite halves/quarters via a recursive "fold" (seed 1 vs seed 2 only in the final, seeds 1↔4 / 2↔3 in the semis); byes are placed opposite the top seeds. This ensures top seeds can only meet late.

**Third place via petite finale** — when a category starts, a petite finale match is generated (`round = totalRounds`, `position = 1`). The two semi-final losers are routed into it; if one semi-final is a bye (e.g. 3 entrants), the lone loser takes bronze by walkover.

---

## Data Model

```
Competitor ──< TournamentRegistration >── Tournament
   gender              │ seed, categoryId      │ format, status
   birthYear           │                       │
   club                │                       │
                       │                    Category
                       │                       │ gender, birthYearMin/Max
                       │                       │ status (independent lifecycle)
                       │                       │
                    Match ──< MatchParticipant >── Competitor
                    │ categoryId
                    │ nextMatchId (self-referential → bracket tree)
                    │ bracketSide (WINNERS / LOSERS / GRAND_FINAL — reserved)
                    │ winnerId
```

**Enums:**

| Enum | Values |
|------|--------|
| `TournamentStatus` | `DRAFT` `OPEN` `IN_PROGRESS` `COMPLETED` `CANCELLED` |
| `TournamentFormat` | `SINGLE_ELIM` `ROUND_ROBIN` `DOUBLE_ELIM`* |
| `MatchStatus` | `PENDING` `READY` `COMPLETED` `BYE` |
| `BracketSide` | `WINNERS` `LOSERS` `GRAND_FINAL`* |
| `CompetitorType` | `PLAYER` `TEAM` |
| `Gender` | `MALE` `FEMALE` `MIXED` |

*`DOUBLE_ELIM` and `BracketSide` are defined in the schema but not yet wired into generation.

---

## API Reference

Base URL: `/api/v1`

### Competitors

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/competitors` | List competitors (`?type`, `?search`, `?page`, `?limit`) |
| `POST` | `/competitors` | Create a competitor |
| `GET` | `/competitors/:id` | Get by ID |
| `PATCH` | `/competitors/:id` | Update |
| `DELETE` | `/competitors/:id` | Delete |
| `GET` | `/competitors/:id/stats` | Win/loss statistics |

### Tournaments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tournaments` | List tournaments (`?status`, `?sport`, `?page`, `?limit`) |
| `POST` | `/tournaments` | Create a tournament |
| `GET` | `/tournaments/:id` | Get by ID |
| `PATCH` | `/tournaments/:id` | Update |
| `DELETE` | `/tournaments/:id` | Delete |
| `GET` | `/tournaments/:id/stats` | Participant and match statistics |
| `POST` | `/tournaments/:id/open` | Open registrations (`DRAFT → OPEN`) |
| `POST` | `/tournaments/:id/close-registration` | Close registrations (`OPEN → DRAFT`) |
| `POST` | `/tournaments/:id/cancel` | Cancel the tournament |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tournaments/:id/categories` | List categories (with registration counts) |
| `POST` | `/tournaments/:id/categories` | Create a category (requires tournament `DRAFT` or `OPEN`) |
| `GET` | `/tournaments/:id/categories/:catId` | Get by ID |
| `PATCH` | `/tournaments/:id/categories/:catId` | Update (requires category `DRAFT`) |
| `DELETE` | `/tournaments/:id/categories/:catId` | Delete (requires `DRAFT` + 0 registrations) |
| `POST` | `/tournaments/:id/categories/open-all` | Bulk open all `DRAFT` categories |
| `POST` | `/tournaments/:id/categories/start-all` | Bulk start all `OPEN` categories |
| `POST` | `/tournaments/:id/categories/:catId/open` | `DRAFT → OPEN` (requires tournament `OPEN`) |
| `POST` | `/tournaments/:id/categories/:catId/close` | `OPEN → DRAFT` |
| `POST` | `/tournaments/:id/categories/:catId/start` | Generate bracket + `OPEN → IN_PROGRESS` |
| `POST` | `/tournaments/:id/categories/:catId/cancel` | `DRAFT\|OPEN → CANCELLED` |
| `POST` | `/tournaments/:id/categories/:catId/reset` | Tear down bracket, `IN_PROGRESS\|COMPLETED → OPEN` |

### Registrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tournaments/:id/registrations` | List registrations |
| `POST` | `/tournaments/:id/registrations` | Register a competitor (auto-assigns category if available) |
| `POST` | `/tournaments/:id/registrations/import` | Import competitors from a CSV (preview + merge/replace) |
| `DELETE` | `/tournaments/:id/registrations/:competitorId` | Unregister |
| `PATCH` | `/tournaments/:id/registrations/:competitorId` | Update seed or category assignment |

### Bracket

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/tournaments/:id/bracket` | Generate bracket (`?thirdPlace=true` for SINGLE_ELIM) |
| `GET` | `/tournaments/:id/bracket` | Get bracket grouped by rounds (`?categoryId`) |
| `GET` | `/tournaments/:id/bracket?format=visual` | Get bracket as a nested tree (for visual rendering) |

### Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tournaments/:id/matches` | List matches (`?round`, `?status`) |
| `GET` | `/tournaments/:id/matches/:matchId` | Get a match by ID |
| `POST` | `/tournaments/:id/matches/:matchId/result` | Record a result and advance the winner |

---

## CSV Import

The registrations import accepts a CSV with headers (accents/case-insensitive):

```
prenom,nom,genre,datenaissance,club
Adam,Benali,M,2011,Taekwondo Club Paris 15
Sarah,Dubois,F,2012,ATC Versailles
```

- **Gender** accepts: `M`/`masculin`/`male`/`homme`/`h`/`garçon` and `F`/`féminin`/`female`/`femme`/`fille`.
- **Birth year** accepts `YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD` (guarded to 1900 → current year).
- A **preview** endpoint computes created/updated/skipped/errors inside a rolled-back transaction.
- Modes: **merge** (keep existing, skip duplicates) or **replace** (wipe then import).

---

## PDF Export (draw sheets)

Generated client-side with jsPDF (`frontend/src/lib/bracketPDFExport.js`), landscape A4, one page per category:

- **Bye absorption** — when the first round is mostly byes (≥ 3 rounds), the near-empty column is dropped: auto-qualified competitors appear directly at the next round, and the few real preliminary matches are drawn as small "Tour prélim." feeders.
- **Adaptive name fitting** — font shrinks to fit full first + last name, centered in the cell.
- **Medals** — gold/silver from the final, single bronze from the petite finale.
- **Per-category mat number** — when exporting all categories, each can carry its own "Aire N°".
- **Repechage sheet** — an empty second bracket per category (to fill by hand) for the 2nd bronze, sized for preliminary + first-round losers (semi-final excluded). PDF-only, not persisted.

---

## Getting Started (local development)

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd tournament-manager

# 2. Install backend dependencies
npm install

# 3. Install frontend dependencies
cd frontend && npm install && cd ..

# 4. Configure environment
cp .env.example .env
# Edit .env — defaults work with Docker Compose (PostgreSQL on :5433)
```

### Start

```bash
# Terminal 1 — Database only (recommended for dev)
docker compose up postgres -d

# Terminal 2 — Backend (hot reload via nodemon)
npm run dev

# Terminal 3 — Frontend (Vite HMR)
cd frontend && npm run dev
```

> The recommended local setup runs only the database in Docker to get hot reload on both backend and frontend. See `.env.example` for the `DATABASE_URL` pointing to `localhost:5433`.

### Database

```bash
npm run db:migrate     # Run migrations
npm run db:generate    # Regenerate Prisma client
npm run db:studio      # Open Prisma Studio (visual DB browser)
```

---

## Deployment

- **Frontend → Vercel** — deploys automatically on push to `main` (files under `frontend/`).
- **Backend → Heroku** — `git push heroku main`; `prisma migrate deploy` runs in the `release` phase. A failed release is not promoted (previous slug stays current).
- A global `vite:preloadError` handler reloads the page once when a stale chunk (post-deploy hash change) fails to load.

---

## Pagination

All list endpoints support pagination and return a consistent envelope:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 87,
    "totalPages": 5
  }
}
```

Defaults: `page=1`, `limit=20`, maximum `limit=100`.

---

## Error Handling

All errors return a consistent JSON shape:

```json
{ "error": "Descriptive message" }
```

| Status | Cause |
|--------|-------|
| `400` | Validation error, business rule violation |
| `404` | Resource not found |
| `409` | Conflict (duplicate entry, invalid state transition) |
| `422` | Unprocessable — data is valid but cannot be processed (e.g. category overlap) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Rate Limiting

| Limiter | Applied to | Limit |
|---------|------------|-------|
| `apiLimiter` | All `/api/*` routes | 100 req / 15 min per IP |
| `writeLimiter` | All write endpoints (`POST`, `PATCH`, `DELETE`) | 30 req / 15 min per IP |

---

## Development Scripts

```bash
# Backend
npm run dev          # Start API with nodemon (hot reload)
npm run format       # Format all files with Prettier
npm run db:migrate   # Create and apply a new migration
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:studio    # Open Prisma Studio

# Frontend
cd frontend
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run lint         # ESLint
```
