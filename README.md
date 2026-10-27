# 🎓 Study-Group

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis)](https://redis.io/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-1.5_Flash-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel)](https://study-group-sigma.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

> **Study-Group** is an all-in-one student collaboration platform and productivity workspace. Create study circles, plan real-time study sessions, share academic resources, write versioned study notes, execute focused Pomodoro study blocks, and leverage **StudyMate AI** for personalized tutoring, notes summarization, and interactive quiz generation.

🔗 **Live Production App:** [study-group-sigma.vercel.app](https://study-group-sigma.vercel.app)

---

## 🌟 Key Features

```
DISCOVER → JOIN → PLAN → STUDY → COLLABORATE → TRACK → IMPROVE
```

- 👥 **Group Workspaces & Role-Based Control**
  - Public discovery and invite-only private study groups.
  - Granular role hierarchy (`OWNER`, `ADMIN`, `MEMBER`) enforced server-side.
  - Dedicated group hubs: Discussions, Tasks, Shared Notes, Resources, Calendar, and Members.
  - Group announcements with sticky pinning.

- ⚡ **Realtime Chat & Collaboration Engine**
  - **Dual-mode synchronization**: Persistent Redis-backed WebSocket companion server for instant message fanout, live typing indicators, and online presence.
  - **Resilient fallback**: Automatic degradation to HTTP REST synchronization (2.5s active / 8s background) if the WebSocket service or Redis is unreachable.
  - Message replies, emoji reactions, message editing, soft-deletion, and pinned messages.

- 🤖 **StudyMate AI Study Assistant**
  - Multi-provider AI architecture supporting both **Google Gemini** (`gemini-1.5-flash`) and **OpenAI** (`gpt-4o-mini`).
  - Native zero-dependency HTTP client implementation.
  - Dynamic note context injection: StudyMate grounds its tutoring in your real class notes.
  - On-demand AI multiple-choice quiz generator with instant validation and scoring.
  - Automated study note summarization into concise revision points.

- ⏱️ **Focus Rooms & Pomodoro Tracker**
  - Timed focus sessions (25-minute Pomodoro, 50-minute deep work, 90-minute ultradian, or custom duration).
  - Ambient soundscapes and distraction-free interface.
  - Automated tracking of total study hours, subject distribution, and daily study streaks.

- 📝 **Markdown Notes with Revision History**
  - Full-featured markdown editor with live preview and syntax formatting.
  - Automatic version snapshotting on each edit with full restore capability.
  - Private personal notes or one-click publication to group workspaces.

- 📅 **Integrated Study Calendar & RSVP**
  - Interactive Month, Week, and Day views for academic events, study blocks, and exams.
  - Session scheduling with attendee RSVPs (`ATTENDING`, `MAYBE`, `DECLINED`).
  - Conflict detection and agenda views.

- 📊 **Productivity & Subject Analytics**
  - Dynamic visual charts displaying weekly study hours, subject allocation, and task velocity.
  - Consistency scoring and milestone badges based on active study streaks.

- 📁 **Resource Repository & Document Storage**
  - Subject and category tagging with search, filter, and quick bookmarks.
  - Hybrid storage engine: Serverless temporary staging for previews and **Vercel Blob** cloud storage for production.

- 🔍 **Command Palette & Global Search (⌘K / Ctrl+K)**
  - Debounced, keyboard-navigable global search across groups, notes, tasks, events, and members.

---

## 🏗️ Architecture & Tech Stack

```mermaid
flowchart TD
    Client["Browser / Mobile Client (Next.js 15 + React 18)"]
    
    subgraph NextServer["Next.js App Router (Vercel Serverless)"]
        API["API Routes & Server Actions"]
        Auth["JWT & bcrypt Authentication"]
        Zod["Zod Validation & RBAC Middleware"]
        Storage["Storage Provider (Vercel Blob / Local)"]
        AI["StudyMate AI (Google Gemini / OpenAI)"]
    end

    subgraph DataTier["Data & Cache Tier"]
        Postgres[("PostgreSQL Database (Prisma ORM)")]
        Redis[("Redis (Pub/Sub & Presence Cache)")]
    end

    subgraph RealtimeTier["Realtime Companion Service (Node.js)"]
        WS["WebSocket Server (/ws)"]
        EventHub["Pub/Sub Dispatcher (/publish)"]
    end

    Client -->|"HTTPS / REST"| API
    Client <-->|"WSS (Authenticated Ticket)"| WS
    API --> Zod --> Auth
    API --> Postgres
    API -->|"Event Publish"| EventHub
    EventHub --> Redis
    WS <--> Redis
    API --> Storage
    API --> AI
```

### Stack Breakdown

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Next.js 15 (App Router), React 18, TypeScript | Server Components, Client Components, React Hooks |
| **Styling** | Tailwind CSS, Framer Motion, Lucide Icons | Responsive layout, light/dark themes, fluid micro-interactions |
| **Backend** | Next.js Route Handlers (Node.js runtime) | Type-safe JSON APIs, rate limiting, secure cookie session handling |
| **Database** | PostgreSQL 16 via Prisma ORM 6.19 | Migrations, typed relational schema, cascade rules, indexing |
| **Realtime** | WebSocket (`ws`) + Redis 7 | Ticket-based authentication, distributed presence, message pub/sub |
| **AI Layer** | Google Gemini API / OpenAI API | Native REST fetch, strict JSON generation, context injection |
| **Storage** | Vercel Blob / OS temporary storage | Abstracted file storage provider interface with signed access |
| **Security** | bcryptjs, jsonwebtoken, Zod | Cryptographic password hashing, HTTP-only JWTs, input validation |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- **Docker & Docker Compose** (for local PostgreSQL & Redis)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/subhamxaura/Study-Group.git
cd Study-Group
npm install
```

### 2. Configure Environment Variables

Copy the example environment template:

```bash
cp .env.example .env
```

Ensure `.env` contains the minimum required keys:

```env
# Database & Authentication (Required)
DATABASE_URL="postgresql://postgres:studygroup@localhost:5432/studygroup?schema=public"
JWT_SECRET="replace-with-a-secure-random-secret-at-least-32-chars-long"

# AI Provider (Optional: Google Gemini or OpenAI)
AI_PROVIDER="gemini"
GEMINI_API_KEY="your-google-ai-studio-api-key"
# or:
# AI_PROVIDER="openai"
# OPENAI_API_KEY="your-openai-api-key"

# Realtime & Redis (Optional for local development)
REDIS_URL="redis://localhost:6379"
```

### 3. Start Local Services with Docker

Start PostgreSQL and Redis containers in the background:

```bash
docker compose up -d
```

### 4. Push Schema & Seed Demo Data

Initialize the database schema and populate it with rich sample data:

```bash
# Push schema migrations
npm run db:push

# Populate sample users, groups, tasks, notes, and discussions
npm run db:seed
```

### 5. Launch the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

*(Optional)* To start the WebSocket realtime companion server locally:
```bash
npm run dev:realtime
```

---

## 👥 Demo Accounts

The database seed provides ready-to-use demo accounts. All accounts share the same password:

> **Password for all seed accounts:** `password123`

| Email | Role & Description |
|---|---|
| `subham@example.com` | Primary Admin / Owner of *Computer Science Hub* |
| `alex@example.com` | Active Member across multiple study circles |
| `jordan@example.com` | Owner of *Physics Study Circle* |
| `taylor@example.com` | Owner of *Advanced Mathematics Group* |
| `casey@example.com` | Member in *Chemistry & Physics Hubs* |

---

## ⚙️ Environment Variables Reference

| Variable | Required | Default | Purpose |
|---|:---:|---|---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string with schema parameter |
| `JWT_SECRET` | **Yes** | — | Cryptographic secret for signing session tokens (min 32 bytes) |
| `AI_PROVIDER` | No | `gemini` | AI provider choice (`gemini` or `openai`) |
| `GEMINI_API_KEY` | No | — | Google AI Studio API key for StudyMate AI |
| `GEMINI_MODEL` | No | `gemini-1.5-flash` | Gemini model variant |
| `OPENAI_API_KEY` | No | — | OpenAI API key (alternative provider) |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model variant |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL for realtime pub/sub & presence |
| `REALTIME_TICKET_SECRET` | No | — | Shared secret for signing one-time WebSocket connection tickets |
| `REALTIME_PUBLISH_SECRET` | No | — | Internal token for publishing events from Next.js to companion |
| `REALTIME_PUBLIC_URL` | No | — | Public WebSocket endpoint (`wss://.../ws`) |
| `REALTIME_PUBLISH_URL` | No | — | Private REST endpoint for event dispatch (`https://.../publish`) |
| `STORAGE_PROVIDER` | No | `LOCAL` | Storage backend (`LOCAL` or `BLOB`) |
| `BLOB_READ_WRITE_TOKEN` | No | — | Vercel Blob access token for cloud file uploads |

---

## 📜 Available NPM Scripts

```bash
# Development & Build
npm run dev             # Start Next.js development server
npm run build           # Generate Prisma client and create production build
npm run start           # Start Next.js production server
npm run vercel-build    # Automated Vercel build script (handles preview migrations safely)

# Code Quality & Testing
npm test                # Run type-check and linter validation
npm run type-check      # TypeScript static type check (tsc --noEmit)
npm run lint            # Run ESLint validation
npm run test:e2e        # Run end-to-end integration test suite
npm run test:realtime   # Run Redis-backed WebSocket integration tests

# Database Management
npm run db:push         # Synchronize Prisma schema directly with database (dev)
npm run db:migrate      # Apply pending migrations (production)
npm run db:seed         # Seed database with sample accounts and data
npm run db:studio       # Launch interactive Prisma Studio GUI

# Realtime WebSocket Companion
npm run dev:realtime    # Start realtime companion in watch mode
npm run start:realtime  # Start production realtime companion
```

---

## 🚢 Production Deployment

### 1. Deploying the Web App to Vercel

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Connect a PostgreSQL database (e.g. Neon, Supabase, Vercel Postgres, or AWS RDS).
4. Configure environment variables (`DATABASE_URL`, `JWT_SECRET`, and optionally `GEMINI_API_KEY`).
5. Vercel automatically runs `npm run vercel-build`, which safely runs `prisma generate` and applies pending migrations before triggering `next build`.
6. Verify deployment health at `https://<your-domain>/api/health`.

### 2. Deploying the Realtime WebSocket Companion (Optional)

The web application functions fully without the realtime service using REST synchronization. If you want instant WebSocket presence and message delivery:

1. Host `server/realtime.mjs` on any platform supporting long-lived WebSockets (Railway, Fly.io, Render, AWS ECS, or a Docker VPS).
2. Provision a Redis instance (Upstash, AWS ElastiCache, or Redis Cloud).
3. Set `REDIS_URL`, `DATABASE_URL`, `REALTIME_TICKET_SECRET`, and `REALTIME_PUBLISH_SECRET` on both services.
4. Set `REALTIME_PUBLIC_URL=wss://<companion-domain>/ws` in your Vercel project settings.

For in-depth operational architecture, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/API.md`](docs/API.md).

---

## 📂 Project Structure

```
Study-Group/
├── app/                       # Next.js 15 App Router pages & API routes
│   ├── (auth)/                # Authentication routes (login, register)
│   ├── api/                   # REST API endpoints (auth, groups, tasks, notes, ai, health)
│   ├── calendar/              # Study calendar views & scheduling
│   ├── dashboard/             # Main student overview dashboard
│   ├── focus/                 # Pomodoro focus session room
│   ├── groups/                # Study circle hubs & workspaces
│   ├── messages/              # Direct & group discussions
│   ├── notes/                 # Markdown notes with revision history
│   ├── profile/               # User account profile & study stats
│   ├── resources/             # Resource sharing repository
│   └── tasks/                 # Task tracker & assignment boards
├── components/                # Reusable React UI design components
├── lib/                       # Core utilities & server-side helpers
│   ├── ai/                    # Multi-provider AI engine (Gemini & OpenAI)
│   ├── storage/               # File storage abstraction (Local & Vercel Blob)
│   ├── prisma.ts              # Global Prisma Client instance
│   └── validation.ts          # Zod request validation schemas
├── prisma/                    # Database schema and seed scripts
│   ├── schema.prisma          # PostgreSQL relational schema definition
│   └── seed.ts                # Realistic development dataset generator
├── scripts/                   # Build and migration automation scripts
├── server/                    # Standalone Redis WebSocket companion service
├── tests/                     # Integration and end-to-end test suites
└── docs/                      # Architectural specifications & security audits
```

---

## 🛡️ Security & Reliability

- **CSRF & Origin Verification**: Mutating endpoints enforce origin validation against trusted host headers.
- **Strict Role Authorization**: Member and role permissions are verified in database queries before executing state mutations.
- **Serverless Resilience**: File uploads gracefully adapt to read-only container systems (`/tmp`) when external object storage is not configured.
- **Safe Database Migrations**: CI/CD build scripts verify database accessibility before applying migrations, preventing broken deployment previews.

---

## 👤 Author & Maintainer

**SUBHAM GHOSH**
- GitHub: [@subhamxaura](https://github.com/subhamxaura)
- Repository: [subhamxaura/Study-Group](https://github.com/subhamxaura/Study-Group)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
