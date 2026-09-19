# Study-Group

An all-in-one student collaboration and study workspace. Find study groups, plan
sessions, share resources, take shared notes, run focus sessions and track your
consistency — all backed by real persistence.

## The loop

DISCOVER → JOIN → PLAN → STUDY → COLLABORATE → TRACK → IMPROVE

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **PostgreSQL** + **Prisma** (typed ORM, migrations, seeds)
- Auth: email + password (**bcrypt** hashing, **JWT** in an httpOnly cookie)
- **Zod** validation on every API input; server-side role authorization
- **Tailwind CSS** design system (light/dark), **Framer Motion** micro-interactions
- Realtime: lightweight polling sync for chat/presence/typing (Vercel-friendly)

## Getting started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start a local Postgres (Docker) and set your env

   ```bash
   docker compose up -d
   cp .env.example .env   # then fill DATABASE_URL + JWT_SECRET
   ```

   Local defaults in `.env`: `postgresql://postgres:studygroup@localhost:5432/studygroup?schema=public`

3. Create the schema and seed demo data

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. Run it

   ```bash
   npm run dev
   ```

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

See `.env.example`. Required: `DATABASE_URL`, `JWT_SECRET`. Optional:
`AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL` (StudyMate assistant — without a
key, StudyMate shows a proper setup state instead of fake responses).

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
```

## Deploying to Vercel

1. Push this repo and import it in Vercel.
2. Provision Postgres (Neon, Supabase or Vercel Postgres) and set `DATABASE_URL`.
3. Set `JWT_SECRET` (32+ random bytes), optionally `AI_PROVIDER` / `OPENAI_API_KEY`.
4. Deploy — the Vercel build (`npm run vercel-build`) runs `prisma generate`,
   then `prisma migrate deploy` (applies pending migrations safely, never
   destructive), then `next build`. Verify afterwards with
   `GET /api/health` (reports env presence, DB reachability and migration
   state — never secret values). If you deploy without `DATABASE_URL` set,
   the build fails on `prisma migrate deploy` instead of shipping a broken app.

## Architecture notes

- Every API route validates input with Zod and checks the session server-side.
- Group authorization is centralized in `lib/groups.ts` (`requireMembership`,
  `requireRole`) — roles are never trusted from the client.
- The schema is normalized with FKs, cascade rules and indexes on hot paths
  (`Message(groupId, createdAt)`, `Task(assigneeId, status)`, `Notification(userId, isRead, createdAt)`, …).
- Lists paginate; the dashboard uses a single aggregate endpoint to avoid waterfalls.
- Chat sync is polling-based (2.5s active / 6s hidden) with heartbeats for
  presence — no custom server, so it deploys anywhere Next.js runs.
