# Study-Group

An all-in-one student collaboration and study workspace. Find study groups, plan
sessions, share resources, take shared notes, run focus sessions and track your
consistency — all backed by real persistence.

## The loop

DISCOVER → JOIN → PLAN → STUDY → COLLABORATE → TRACK → IMPROVE

## Stack

- **Next.js 15** (App Router) + **React 18** + **TypeScript**
- **PostgreSQL** + **Prisma** (typed ORM, migrations, seeds)
- Auth: email + password (**bcrypt** hashing, **JWT** in an httpOnly cookie)
- **Zod** validation on every API input; server-side role authorization
- **Tailwind CSS** design system (light/dark), **Framer Motion** micro-interactions
- Realtime: optional authenticated WebSocket companion for chat/presence/typing, with REST polling fallback

## Getting started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start local Postgres and Redis (Docker) and set your env

   ```bash
   docker compose up -d
   cp .env.example .env   # then fill DATABASE_URL + JWT_SECRET
   ```

   Local defaults in `.env`: `postgresql://postgres:studygroup@localhost:5432/studygroup?schema=public` and `redis://localhost:6379`.

3. Create the schema and seed demo data

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. Run it

   ```bash
   npm run dev
   ```

   For local realtime collaboration, start `npm run dev:realtime` in a second terminal after configuring the `REALTIME_*` variables. The companion also requires `REDIS_URL`; the web app remains usable through REST sync when the optional companion is not running. To run the Redis integration suite, set `REALTIME_TEST_REDIS_URL` explicitly to a disposable Redis instance.

## Demo accounts (from the seed)

All demo accounts use password `password123`:

| Email | Role notes |
| --- | --- |
| subham@example.com | Owner of Computer Science Hub, member elsewhere |
| alex@example.com | Member in several groups |
| jordan@example.com | Owner of Physics Study Circle |
| taylor@example.com | Owner of Advanced Mathematics |
| casey@example.com | Member in Physics & Chemistry |

## Environment variables

See `.env.example`. Node.js 20 or newer is required. The web app requires `DATABASE_URL` and `JWT_SECRET` (at least 32 UTF-8 bytes). `REDIS_URL` is required only by the optional realtime companion. Other optional settings include `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL` (StudyMate assistant — without a key, StudyMate shows a proper setup state instead of fake responses), `STORAGE_PROVIDER=BLOB` and `BLOB_READ_WRITE_TOKEN` for private cloud uploads, and `REALTIME_*` for the separately hosted WebSocket service.

## Feature map

| Area | Route | Notes |
| --- | --- | --- |
| Dashboard | `/dashboard` | Stats, today plan, upcoming, groups, tasks, activity, weekly chart |
| My Groups | `/groups` | Joined groups with roles and activity |
| Discover | `/discover` | Search + filters, join public groups, create group |
| Group workspace | `/groups/[id]` | Overview / Discussion / Tasks / Resources / Calendar / Notes / Members tabs |
| Group settings | `/groups/[id]/settings` | Edit, pin announcement, roles, delete (owner) |
| Messages | `/messages` | Chat with reactions, replies, edit/delete, pin, presence, typing |
| Calendar | `/calendar` | Month/week/day, sessions + events, RSVP from details |
| Tasks | `/tasks` | My/group scope, status, priority, overdue states |
| Focus | `/focus` | 25/50/90 or custom timer; logs hours, tasks, streak |
| Analytics | `/analytics` | Weekly hours, per-subject, task completion, consistency |
| Resources | `/resources` | Search/filter/sort, bookmarks, "Saved" view |
| Notifications | bell menu | Mark read/all, deep links |
| Search | ⌘K / Ctrl-K | Unified, debounced, grouped results, keyboard navigation |
| Profile | `/profile` | Editable profile with real stats |
| StudyMate | floating button | AI study assistant (needs `OPENAI_API_KEY`) |

## Scripts

```bash
npm run dev         # development server
npm run build       # prisma generate + production build
npm run start       # production server
npm run lint        # eslint
npm run type-check  # tsc --noEmit
npm run db:push     # push schema (dev)
npm run db:migrate  # apply migrations (prod)
npm run db:seed     # seed demo data
npm run db:studio   # prisma studio
npm run dev:realtime    # local persistent WebSocket companion
npm run start:realtime  # production WebSocket companion
npm run test:realtime   # Redis-backed, two-instance tests; requires REALTIME_TEST_REDIS_URL
npm run test:e2e        # API E2E suite against a running server + test database
```

## Deploying to Vercel and realtime

1. Import the repository into Vercel and provision PostgreSQL. Set `DATABASE_URL` and a cryptographically random `JWT_SECRET` of at least 32 bytes. Configure AI/storage variables only if those services are enabled. Provision a managed Redis service only if realtime collaboration is enabled.
2. Configure `REALTIME_TICKET_SECRET` and `REALTIME_PUBLISH_SECRET` as two independent random secrets (at least 32 bytes each). Use the ticket secret in both the Next app and companion. Set `REALTIME_PUBLIC_URL` to the browser-facing `wss://<realtime-host>/ws`, `REALTIME_ALLOWED_ORIGINS` to the exact production app origin(s), and `REALTIME_PUBLISH_URL` to an HTTPS/private service address reachable by the Vercel functions.
3. Deploy the web app. The configured `npm run vercel-build` generates Prisma Client, applies pending migrations with `prisma migrate deploy`, then runs `next build`. Do not also run a separate migration job at the same time. Check `GET /api/health` for database and migration readiness; it reports no secret values.
4. Run `npm run start:realtime` as a separate, persistent Node 20+ service on a host that supports long-lived WebSockets. Give it `DATABASE_URL`, a private TLS `REDIS_URL` (`rediss://` where supported), the same ticket/publish secrets, exact allowed origins, host/port, and a stable public URL. All replicas in one environment must share the same Redis database and `REALTIME_REDIS_PREFIX`; Redis supplies cross-instance presence, event fanout, ticket replay protection, and rate limits, so WebSocket session stickiness is not required. Put `/ws` behind TLS and restrict `/publish` to the app's private network where possible. Set `REALTIME_TRUST_PROXY=true` only when the reverse proxy overwrites `X-Forwarded-For`.
5. Realtime is optional. If it or Redis is unavailable, clients continue to use REST synchronization. Check `/livez` for process liveness and `/healthz` for Redis readiness. For the full production topology and operational checks, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), and for endpoint contracts see [`docs/API.md`](docs/API.md).

## Architecture notes

- API inputs use Zod where defined; authenticated handlers resolve the session server-side, enforce same-origin request checks, and use centralized group role/membership helpers.
- Group authorization is centralized in `lib/groups.ts` (`requireMembership`,
  `requireRole`) — roles are never trusted from the client.
- The schema is normalized with FKs, cascade rules and indexes on hot paths
  (`Message(groupId, createdAt)`, `Task(assigneeId, status)`, `Notification(userId, isRead, createdAt)`, …).
- Lists paginate; the dashboard uses a single aggregate endpoint to avoid waterfalls.
- Chat is code-split until the Discussion tab opens. Connected clients receive WebSocket presence/typing and change notifications, then fetch durable deltas over REST; REST polling remains available (2.5s visible / 8s hidden) when realtime is unavailable.
- Redis Pub/Sub and expiring shared leases let realtime presence, typing, invalidations, rate limits, and one-time tickets coordinate across service replicas; PostgreSQL and REST remain authoritative.
- Security findings and remaining production risks are tracked in [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md).
