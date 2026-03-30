# Tournament Manager

A full-stack web application for managing sports tournaments — from competitor registration to bracket generation and match results tracking.

**Live demo:** [tournament-manager-wine.vercel.app](https://tournament-manager-wine.vercel.app)
**API:** [open-taekwondo-api-0bfc22610b36.herokuapp.com](https://open-taekwondo-api-0bfc22610b36.herokuapp.com/health)

---

## Overview

Tournament Manager covers the full lifecycle of a sports competition:

- **Competitor management** — register players or teams with profile data (gender, birth year)
- **Tournament lifecycle** — state machine from draft to completion (`DRAFT → OPEN → IN_PROGRESS → COMPLETED`)
- **Category system** — group competitors by age range and gender, each with its own independent lifecycle
- **Bracket generation** — single elimination (with ATP-style seeding) and round robin (circle method)
- **Match results** — record outcomes round by round with automatic winner progression

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
│   ├── registrations/          # Register / unregister / seed assignment
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
│       └── lib/                # Toast helpers, utils
└── tournament-manager/         # Bruno API collection (local testing)
```

### Key design decisions

**Service / Controller / Router separation** — controllers handle HTTP concerns (req/res, status codes), services hold business logic and throw `AppError`, routers declare routes and apply middleware. This keeps each layer independently testable.

**Tournament status as a gate** — the tournament's status controls what category operations are allowed. A category can only be opened when the tournament is `OPEN`; a bracket can only be generated when the tournament is `OPEN` or `IN_PROGRESS`. This prevents orphaned state without requiring complex validations in each endpoint.

**Category lifecycle is independent** — each category follows its own `DRAFT → OPEN → IN_PROGRESS → COMPLETED` cycle within the tournament container. Starting a category automatically transitions the tournament to `IN_PROGRESS` if it hasn't already.

**Bracket per category** — match generation (`generateSingleElim`, `generateRoundRobin`) accepts an optional `categoryId` that is stamped on every match created. This enables parallel brackets within a single tournament.

**ATP-style seeding** — seeds 1 and 2 are placed in opposite halves, seeds 3–4 are randomized across quarter positions, and unseeded competitors fill remaining slots via Fisher-Yates shuffle. This ensures top seeds can only meet in the final.

---

## Data Model

```
Competitor ──< TournamentRegistration >── Tournament
   gender              │ seed, categoryId      │ format, status
   birthYear           │                       │
                       │                    Category
                       │                       │ gender, birthYearMin/Max
                       │                       │ status (independent lifecycle)
                       │                       │
                    Match ──< MatchParticipant >── Competitor
                    │ categoryId
                    │ nextMatchId (self-referential → bracket tree)
                    │ winnerId
```

**Enums:**

| Enum | Values |
|------|--------|
| `TournamentStatus` | `DRAFT` `OPEN` `IN_PROGRESS` `COMPLETED` `CANCELLED` |
| `TournamentFormat` | `SINGLE_ELIM` `ROUND_ROBIN` `DOUBLE_ELIM`* |
| `MatchStatus` | `PENDING` `READY` `COMPLETED` `BYE` |
| `CompetitorType` | `PLAYER` `TEAM` |
| `Gender` | `MALE` `FEMALE` `MIXED` |

*DOUBLE_ELIM format is defined in the schema but not yet implemented.

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
| `POST` | `/tournaments/:id/categories/:catId/open` | `DRAFT → OPEN` (requires tournament `OPEN`) |
| `POST` | `/tournaments/:id/categories/:catId/close` | `OPEN → DRAFT` |
| `POST` | `/tournaments/:id/categories/:catId/start` | Generate bracket + `OPEN → IN_PROGRESS` |
| `POST` | `/tournaments/:id/categories/:catId/cancel` | `DRAFT\|OPEN → CANCELLED` |

### Registrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tournaments/:id/registrations` | List registrations |
| `POST` | `/tournaments/:id/registrations` | Register a competitor (auto-assigns category if available) |
| `DELETE` | `/tournaments/:id/registrations/:competitorId` | Unregister |
| `PATCH` | `/tournaments/:id/registrations/:competitorId` | Update seed or category assignment |

### Bracket

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/tournaments/:id/bracket` | Generate bracket (`?thirdPlace=true` for SINGLE_ELIM) |
| `GET` | `/tournaments/:id/bracket` | Get bracket grouped by rounds |
| `GET` | `/tournaments/:id/bracket?format=visual` | Get bracket as a nested tree (for visual rendering) |

### Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tournaments/:id/matches` | List matches (`?round`, `?status`) |
| `GET` | `/tournaments/:id/matches/:matchId` | Get a match by ID |
| `POST` | `/tournaments/:id/matches/:matchId/result` | Record a result and advance the winner |

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
