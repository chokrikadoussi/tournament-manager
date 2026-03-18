# Tournament Manager API

A REST API for managing sports tournaments — competitors, registrations, bracket generation, match results, and statistics.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 (ES Modules) |
| Framework | Express.js |
| ORM | Prisma + `@prisma/adapter-pg` |
| Database | PostgreSQL 16 |
| Validation | Zod |
| Logging | Morgan |
| Rate limiting | express-rate-limit |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd tournament-manager

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/open?schema=public"
```

> Note: Docker Compose maps PostgreSQL to port **5433** (to avoid conflicts with a local instance).

### Start the database

```bash
docker compose up -d
```

### Run migrations & generate Prisma client

```bash
npm run db:migrate
npm run db:generate
```

### Start the server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

The API is available at `http://localhost:3000`.

Health check: `GET /health` → `{ "status": "ok" }`

---

## API Reference

Base URL: `/api/v1`

### Competitors

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/competitors` | List competitors (filters: `?type`, `?search`, pagination: `?page`, `?limit`) |
| `POST` | `/competitors` | Create a competitor |
| `GET` | `/competitors/:id` | Get a competitor by ID |
| `PATCH` | `/competitors/:id` | Update a competitor |
| `DELETE` | `/competitors/:id` | Delete a competitor |
| `GET` | `/competitors/:id/stats` | Get competitor statistics |

**Competitor stats response:**
```json
{
  "competitorId": "uuid",
  "name": "Alice",
  "stats": {
    "tournamentsPlayed": 5,
    "wins": 12,
    "losses": 4,
    "winRate": 75,
    "matchesPlayed": 16
  }
}
```

### Tournaments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tournaments` | List tournaments (filters: `?status`, `?sport`, pagination: `?page`, `?limit`) |
| `POST` | `/tournaments` | Create a tournament |
| `GET` | `/tournaments/:id` | Get a tournament by ID |
| `PATCH` | `/tournaments/:id` | Update a tournament |
| `DELETE` | `/tournaments/:id` | Delete a tournament |
| `GET` | `/tournaments/:id/stats` | Get tournament statistics |
| `POST` | `/tournaments/:id/open` | Open registrations (`DRAFT → OPEN`) |
| `POST` | `/tournaments/:id/close-registration` | Close registrations (`OPEN → DRAFT`) |
| `POST` | `/tournaments/:id/cancel` | Cancel the tournament |

**Tournament lifecycle (state machine):**
```
DRAFT ──→ OPEN ──→ (generate bracket) ──→ IN_PROGRESS ──→ COMPLETED
  │         │                                   │
  └─────────┴───────────── CANCELLED ←──────────┘
```

### Registrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tournaments/:id/registrations` | List registrations |
| `POST` | `/tournaments/:id/registrations` | Register a competitor |
| `DELETE` | `/tournaments/:id/registrations/:competitorId` | Unregister a competitor |
| `PATCH` | `/tournaments/:id/registrations/:competitorId` | Assign a seed (`{ seed: number \| null }`) |

### Bracket

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/tournaments/:id/bracket` | Generate the bracket |
| `GET` | `/tournaments/:id/bracket` | Get bracket (by rounds) |
| `GET` | `/tournaments/:id/bracket?format=visual` | Get bracket as nested tree |

**Query parameters for generation:**
- `?thirdPlace=true` — add a third-place match (SINGLE_ELIM only)

**Supported formats:**

| Format | Description |
|--------|-------------|
| `SINGLE_ELIM` | Single elimination with standard sports seeding (ATP/Grand Slam) |
| `ROUND_ROBIN` | Round robin using the circle method |
| `DOUBLE_ELIM` | Not yet supported |

**Visual tree response (`?format=visual`):**
```json
{
  "tournamentId": "uuid",
  "format": "visual",
  "final": {
    "matchId": "uuid",
    "round": 3,
    "position": 0,
    "status": "PENDING",
    "winnerId": null,
    "participants": [
      { "slot": 0, "competitorId": "uuid", "name": "Alice" }
    ],
    "children": [...]
  }
}
```

### Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tournaments/:id/matches` | List matches (filters: `?round`, `?status`) |
| `GET` | `/tournaments/:id/matches/:matchId` | Get a match by ID |
| `POST` | `/tournaments/:id/matches/:matchId/result` | Record a match result |

---

## Data Model

```
Competitor ──< TournamentRegistration >── Tournament
                       │ seed                   │ format
                                                │
                                             Match ──< MatchParticipant >── Competitor
                                             │ nextMatchId (self-ref)
                                             │ winnerId
```

**Enums:**

| Enum | Values |
|------|--------|
| `TournamentStatus` | `DRAFT`, `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `TournamentFormat` | `SINGLE_ELIM`, `ROUND_ROBIN`, `DOUBLE_ELIM` |
| `MatchStatus` | `PENDING`, `READY`, `COMPLETED`, `BYE` |
| `CompetitorType` | `PLAYER`, `TEAM` |

---

## Seeding (SINGLE_ELIM)

Seeds follow the standard sports bracket placement (ATP / Grand Slam):

- **Seed 1** → position 0
- **Seed 2** → position N-1 (opposite half)
- **Seeds 3–4** → quarter positions (randomized between them)
- **Unseeded** → remaining slots (Fisher-Yates shuffle)

Seed 1 and Seed 2 can only meet in the final.

---

## Pagination

Endpoints that support pagination return:

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

Default: `page=1`, `limit=20`, max `limit=100`.

---

## Error Handling

All errors follow a consistent format:

```json
{ "error": "Descriptive message" }
```

| Status | Cause |
|--------|-------|
| `400` | Validation error, invalid state transition |
| `404` | Resource not found |
| `409` | Unique constraint violation (duplicate name, seed conflict) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Rate Limiting

| Limiter | Routes | Limit |
|---------|--------|-------|
| `apiLimiter` | All `/api/*` routes | 100 req / 15 min per IP |
| `writeLimiter` | `POST /tournaments`, `POST /bracket` | 30 req / 15 min per IP |

---

## Development Scripts

```bash
npm run dev          # Start with nodemon (hot reload)
npm run format       # Format code with Prettier
npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Regenerate Prisma client
npm run db:studio    # Open Prisma Studio (DB GUI)
```

---

## Project Structure

```
src/
├── index.js                  # Express app entry point
├── db.js                     # Prisma singleton
├── router.js                 # Mounts all sub-routers
├── lib/
│   ├── AppError.js           # Custom error class
│   ├── asyncWrap.js          # Async error wrapper
│   ├── paginate.js           # Pagination helpers
│   ├── rateLimiter.js        # Rate limit configs
│   └── validate.js           # Zod validation helper
├── middleware/
│   ├── errorHandler.js       # Global error handler
│   └── notFound.js           # 404 catch-all
├── competitors/              # CRUD + stats
├── tournaments/              # CRUD + lifecycle + stats
├── registrations/            # Register / unregister / seed
├── bracket/
│   ├── bracket.service.js    # Bracket generation dispatcher
│   ├── bracket.utils.js      # Utilities (seeding, rounds)
│   └── generators/
│       ├── singleElim.js     # Single elimination algorithm
│       └── roundRobin.js     # Round robin (circle method)
└── matches/                  # Results + progression
```
