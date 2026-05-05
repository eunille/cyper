# CyberTutor AI — Project Documentation

> Foundation Tutor Chatbot · AI Integration & Automation Practice Project

---

## Overview

CyberTutor AI is a persona-driven tutoring chatbot for cybersecurity fundamentals. A student picks a tutor persona with a distinct teaching style, picks a topic, and enters a structured learning session. The AI acts as a real tutor — it probes, explains, hints, corrects, and recaps — not a search engine that dumps everything at once.

This project is designed to practice the exact stack and patterns used in industry for AI-powered internal tools and learning platforms.

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend + Backend | **Next.js 14** (App Router + API Routes) | Full-stack in one repo. API Routes handle all server logic. |
| Database | **PostgreSQL** via `pg` (node-postgres) | Raw SQL — better learning than an ORM at this stage. |
| LLM Inference | **Ollama** · `llama3:8b` | Runs locally. No API key, no data leaving your machine. |
| Auth | **`jose`** (JWT) + **`bcryptjs`** | Lightweight. JWT stored in httpOnly cookie only. |
| Styling | **Tailwind CSS** | Standard with Next.js. |
| Containerization | **Docker Compose** | Runs PostgreSQL + Ollama only. Next.js runs with `npm run dev`. |

**Why no separate Python backend?**
Next.js API Routes handle the prompt assembly and Ollama HTTP calls fine. A separate FastAPI service makes sense when you have a Python-heavy ML pipeline or multiple frontends sharing one backend. For this project it would add a second language, a second service, a proxy layer, and extra complexity with no real benefit.

**Why no Redis?**
Rate limiting for a solo practice project can be done with a simple DB counter or in-memory map. Redis is worth learning but adds infrastructure overhead here. Add it in v2 when you need job queue or pub/sub.

**Why no ORM (like Prisma or SQLAlchemy)?**
Writing raw SQL against `pg` teaches you what is actually happening. Every senior engineer you work with will read and write SQL. ORMs are a convenience on top — learn the foundation first.

---

## Architecture

```
Browser
  │
  ▼
Next.js (App Router)
  ├── /app/**             → React pages (UI)
  └── /app/api/**        → API Routes (server logic)
        ├── /auth         → register, login, logout
        ├── /sessions     → create session, send message, end session
        └── /me           → profile, progress, history
              │
              ▼
        PostgreSQL        ← stores users, sessions, messages, progress, audit log
              │
              ▼
        Ollama (local)    ← llama3:8b, called via HTTP from API Routes
```

### Request Flow — Chat Message

1. User sends a message in the chat screen.
2. Next.js chat page calls `POST /api/sessions/[id]/chat`.
3. The API Route reads the JWT from the httpOnly cookie and validates it.
4. The API Route fetches full message history for this session from PostgreSQL.
5. `lib/prompt-builder.ts` assembles the system prompt (persona + topic + Scenario C rules) plus the full message history.
6. The API Route calls Ollama's `/api/chat` endpoint and streams the response back.
7. While streaming, it writes the user message and AI response to the `messages` table.
8. The chat screen displays the response token-by-token as it arrives.
9. An audit log row is inserted recording: user, session, endpoint, timestamp, status.

---

## Database Schema

PostgreSQL. All primary keys are UUIDs — never sequential integers (sequential IDs expose record counts and enable enumeration attacks).

### Tables

```
users
sessions
messages
user_progress
audit_log
```

---
Evolisto24!
### `users`

```sql
CREATE TABLE users (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,          -- bcrypt, cost factor 12
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login    TIMESTAMPTZ,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE  -- soft delete only
);
```

---

### `personas`

Seeded at startup. Personas are data, not hardcoded — add new tutors without touching application code.

```sql
CREATE TABLE personas (
  persona_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(100) NOT NULL,
  role                  VARCHAR(100) NOT NULL,  -- e.g. "Network Security Professor"
  specialization        TEXT NOT NULL,
  teaching_style        TEXT NOT NULL,
  tone                  TEXT NOT NULL,
  system_prompt_template TEXT NOT NULL          -- parameterized with {topic} at runtime
);
```

---

### `topics`

```sql
CREATE TABLE topics (
  topic_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(150) NOT NULL,
  category          VARCHAR(50)  NOT NULL,  -- Foundations, Threat Landscape, Defense, Cryptography
  difficulty        VARCHAR(15)  NOT NULL   CHECK (difficulty IN ('beginner','intermediate','advanced')),
  learning_objective TEXT        NOT NULL,
  suggested_persona  UUID        REFERENCES personas(persona_id)
);
```

---

### `sessions`

One row per tutor session. Tracks the current phase and stores the tutor-generated summary at the end.

```sql
CREATE TABLE sessions (
  session_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(user_id),
  persona_id  UUID NOT NULL REFERENCES personas(persona_id),
  topic_id    UUID NOT NULL REFERENCES topics(topic_id),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,                    -- NULL = session still active
  phase       VARCHAR(20)  NOT NULL DEFAULT 'diagnostic'
              CHECK (phase IN ('diagnostic','explain','check','recap','practice','ended')),
  score       SMALLINT     CHECK (score BETWEEN 0 AND 100),  -- set at session end
  summary     TEXT                            -- tutor-generated recap, set at session end
);
```

---

### `messages`

Every message in every session. Full history is fetched and sent to Ollama on each turn to maintain context.

```sql
CREATE TABLE messages (
  message_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID        NOT NULL REFERENCES sessions(session_id),
  role         VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT        NOT NULL,
  sequence     INTEGER     NOT NULL,          -- ordering within session
  phase_at_send VARCHAR(20) NOT NULL,         -- which phase when sent
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  token_count  INTEGER                        -- estimated, for context window tracking

  UNIQUE (session_id, sequence)
);
```

---

### `user_progress`

One row per user per topic. Updated (upserted) every time a session ends.

```sql
CREATE TABLE user_progress (
  progress_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(user_id),
  topic_id     UUID NOT NULL REFERENCES topics(topic_id),
  attempts     INTEGER     NOT NULL DEFAULT 0,
  best_score   SMALLINT,
  last_score   SMALLINT,
  mastered     BOOLEAN     NOT NULL DEFAULT FALSE,  -- true when score >= 80
  last_studied TIMESTAMPTZ,

  UNIQUE (user_id, topic_id)
);
```

---

### `audit_log`

Insert-only. Never updated after insert. Compliance record of every API call.

```sql
CREATE TABLE audit_log (
  log_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,                           -- nullable for unauthenticated endpoints
  session_id  UUID,
  endpoint    VARCHAR(100) NOT NULL,          -- e.g. POST /api/sessions/[id]/chat
  ip_address  INET,
  status_code SMALLINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Tutor Personas

| Persona | Specialization | Teaching Method | Tone |
|---|---|---|---|
| **Prof. Chen** | Networking & Protocols | Socratic — asks before telling | Calm, precise |
| **Agent Ramos** | Threat Intel & Cyber Kill Chain | Scenario-based — attacker perspective | Intense, narrative |
| **Dr. Kapoor** | Cryptography & Data Safety | First-principles — builds from math | Methodical, analogy-heavy |
| **Maya Cruz** | Career & Certifications | Coaching — goal-setting, gap analysis | Encouraging, structured |

---

## Topic Curriculum

### Foundations
- What is Networking? *(Beginner · Prof. Chen)*
- What is a Firewall? *(Beginner · Prof. Chen)*
- DNS Explained *(Beginner · Prof. Chen)*
- HTTP vs HTTPS *(Beginner · Prof. Chen)*

### Threat Landscape
- Cyber Kill Chain — 7 Stages *(Intermediate · Agent Ramos)*
- Types of Malware *(Intermediate · Agent Ramos)*
- Social Engineering & Phishing *(Beginner · Agent Ramos)*
- What is a Zero-Day? *(Intermediate · Agent Ramos)*

### Defense & Operations
- What is a SOC? *(Beginner · Maya Cruz)*
- Incident Response Basics *(Intermediate · Prof. Chen)*
- Log Analysis Intro *(Intermediate · Prof. Chen)*

### Cryptography
- Symmetric vs Asymmetric Encryption *(Intermediate · Dr. Kapoor)*
- What is Hashing? *(Beginner · Dr. Kapoor)*
- TLS Handshake *(Advanced · Dr. Kapoor)*

---

## Scenario C — Pedagogical Flow

This is the core interaction model. The system prompt enforces a structured arc every session. The model's default behavior is to explain everything immediately — Scenario C overrides that.

### Session Arc

| Phase | DB value | What the tutor does |
|---|---|---|
| 1. Diagnostic | `diagnostic` | Greets student, asks an open question to gauge prior knowledge |
| 2. Explanation | `explain` | Explains at calibrated depth, pauses after each sub-concept |
| 3. Check | `check` | Asks a comprehension question, uses hint ladder if stuck |
| 4. Correction | `check` | Affirms what's right, gently corrects the gap |
| 5. Recap | `recap` | One-sentence summary of each concept covered |
| 6. Practice Q | `practice` | New question — waits for student attempt before evaluating |
| 7. Evaluation | `ended` | Scores attempt, writes score + summary to DB |

### The Hint Ladder

When a student is stuck, the tutor never gives the answer immediately. It works through four levels:

| Level | Pattern |
|---|---|
| L0 — Diagnostic question | "Think about what happens when... what would that tell you?" |
| L1 — Vague hint | "Consider the relationship between X and Y..." |
| L2 — Pointed hint | "Remember that X always happens before Y in this process..." |
| L3 — Leading question | "If I told you X, what would you conclude about Y?" |
| L4 — Reveal (after 3 failed hints) | "Let me walk you through it: [answer]. Now restate that in your own words." |

### System Prompt Template

The system prompt sent to Ollama is assembled from three parts at runtime in `lib/prompt-builder.ts`:

```
PART 1 — PERSONA (from personas table)
You are {persona.name}. {persona.description}.
Your communication style: {persona.teaching_style}.
Your domain: {persona.specialization}.

PART 2 — TOPIC (from topics table)
The student is studying: {topic.name}.
Learning objective: {topic.learning_objective}.
Assume the student has {difficulty} prior knowledge of this subject.

PART 3 — SCENARIO C RULES (hardcoded, never changes)
TEACHING RULES — follow these every session without exception:
1. Start with a diagnostic question. Never lecture before gauging baseline.
2. Explain only after understanding the student's level.
3. Never give the full answer on the first request. Use the 4-level hint ladder.
4. After each concept, ask a targeted comprehension question.
5. Correct misconceptions by first affirming what is right, then addressing the gap.
6. After all concepts, give a one-sentence recap of each point.
7. End with a practice question. Wait for the student's attempt before evaluating.
8. When the session ends, output exactly this JSON on its own line:
   {"score": <0-100>, "summary": "<3 sentence recap>", "gaps": ["<topic>", ...]}
```

---

## API Routes

All routes under `/app/api/`. JWT validated on every protected route by reading the httpOnly cookie.

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account. Hash password with bcrypt (cost 12). |
| POST | `/api/auth/login` | No | Verify hash, issue JWT in httpOnly cookie. |
| POST | `/api/auth/logout` | Yes | Clear the cookie. |

### Sessions

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/sessions` | Yes | Create session row (persona + topic selected). |
| GET | `/api/sessions/[id]` | Yes | Fetch session metadata and current phase. |
| POST | `/api/sessions/[id]/chat` | Yes | Send message. Fetch history → build prompt → stream Ollama response → write to DB. |
| PATCH | `/api/sessions/[id]/end` | Yes | End session. Trigger score + summary generation. |
| GET | `/api/sessions` | Yes | List user's past sessions with scores and summaries. |

### User

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/me` | Yes | Current user profile. |
| GET | `/api/me/progress` | Yes | All topic progress records. |

---

## Frontend Screens

| Screen | Route | Key UI |
|---|---|---|
| Login / Register | `/auth` | Form, validation, error state |
| Persona Select | `/learn` | Persona cards, selection state |
| Topic Select | `/learn/topics` | Topic chips, category filter, difficulty badge |
| Chat Session | `/learn/session/[id]` | Message list, input, hint button, phase indicator, quick replies |
| Progress Dashboard | `/dashboard` | Per-topic progress cards, session history, scores |

### Recommended UI Components

- **`PersonaCard`** — avatar, name, role, teaching style tag, selected state
- **`TopicChip`** — topic name, difficulty badge (Beginner/Intermediate/Advanced)
- **`MessageBubble`** — role-aware (user vs assistant), streaming state
- **`PhaseIndicator`** — shows current phase: Diagnostic → Explain → Check → Recap → Practice
- **`HintButton`** — sends "give me a hint" without the student typing it out
- **`QuickReplies`** — persistent chips: "I'm stuck" · "Explain more" · "I understand, continue"

---

## File Structure

```
cybertutor-ai/
├── app/
│   ├── auth/
│   │   └── page.tsx                   # Login + Register screen
│   ├── learn/
│   │   ├── page.tsx                   # Persona Select screen
│   │   ├── topics/
│   │   │   └── page.tsx               # Topic Select screen
│   │   └── session/
│   │       └── [id]/
│   │           └── page.tsx           # Active Chat screen
│   ├── dashboard/
│   │   └── page.tsx                   # Progress Dashboard
│   └── api/
│       ├── auth/
│       │   ├── register/route.ts
│       │   ├── login/route.ts
│       │   └── logout/route.ts
│       ├── sessions/
│       │   ├── route.ts               # POST /api/sessions (create)
│       │   └── [id]/
│       │       ├── route.ts           # GET session
│       │       ├── chat/route.ts      # POST chat message (streaming)
│       │       └── end/route.ts       # PATCH end session
│       └── me/
│           ├── route.ts               # GET profile
│           └── progress/route.ts      # GET progress
│
├── components/
│   ├── PersonaCard.tsx
│   ├── TopicChip.tsx
│   ├── MessageBubble.tsx
│   ├── PhaseIndicator.tsx
│   ├── ChatInput.tsx                  # Input + HintButton + QuickReplies
│   └── ProgressCard.tsx
│
├── lib/
│   ├── db.ts                          # pg Pool — single connection pool, exported
│   ├── auth.ts                        # JWT sign/verify with jose, bcrypt helpers
│   ├── prompt-builder.ts              # Assembles system prompt from persona + topic
│   ├── ollama.ts                      # Ollama HTTP client, streaming handler
│   └── audit.ts                       # Writes to audit_log table
│
├── middleware.ts                      # Next.js edge middleware — auth guard on /learn and /dashboard
│
├── db/
│   ├── schema.sql                     # Full DDL — run once to create all tables
│   └── seed.sql                       # Inserts for personas and topics
│
├── docker-compose.yml                 # PostgreSQL + Ollama only
├── .env.local                         # Never commit this
├── .env.example                       # Commit this — shows required keys without values
└── README.md
```

---

## Compliance & Security Requirements

These are not optional. They are the point of the project.

| Requirement | Implementation | Where |
|---|---|---|
| No plaintext passwords | bcrypt, cost factor 12 | `lib/auth.ts` — register route |
| JWT in httpOnly cookie | `Set-Cookie` with `httpOnly; Secure; SameSite=Strict` | Login API route |
| Auth guard on protected routes | Next.js `middleware.ts` — reads cookie, validates JWT | `middleware.ts` |
| UUID primary keys | `gen_random_uuid()` on all tables | `db/schema.sql` |
| Soft delete only | `is_active = false` — never `DELETE FROM users` | User deactivation logic |
| Input length limits | Check `content.length` before processing | Chat API route |
| Audit log on every request | Insert to `audit_log` in a try/finally block | `lib/audit.ts` |
| Secrets in environment only | All keys in `.env.local`, never in source | `lib/db.ts`, `lib/auth.ts` |
| Local LLM | Ollama runs on your machine — no data sent to third parties | `lib/ollama.ts` |
| HTTPS in production | Configure at reverse proxy (Nginx/Caddy) — not in Next.js | Deployment config |

> **JWT storage rule:** Store the JWT in an `httpOnly` cookie only. Never `localStorage`. Never `sessionStorage`. JavaScript cannot read `httpOnly` cookies — this protects the token from XSS attacks. This is non-negotiable in any real deployment.

---

## Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/cybertutor

# Auth
JWT_SECRET=replace-with-a-long-random-string-at-least-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3:8b

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Docker Compose

Only PostgreSQL and Ollama run in Docker. Next.js runs normally with `npm run dev`.

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: cybertutor
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./db/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql

  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  postgres_data:
  ollama_data:
```

**First run commands:**
```bash
docker compose up -d
ollama pull llama3:8b     # run this after ollama container is up
npm install
npm run dev
```

---

## Development Phases

### Phase 1 — Scaffold & Database · *5–7 days*

- Initialize Next.js 14 with TypeScript and Tailwind
- Write `docker-compose.yml` for PostgreSQL + Ollama
- Write `db/schema.sql` — all tables, constraints, indexes
- Write `db/seed.sql` — insert all personas and topics
- Set up `lib/db.ts` with a `pg` connection pool
- Verify: `docker compose up` runs clean, tables exist, seed data is in

**Exit criteria:** You can connect to the DB and query the personas table.

---

### Phase 2 — Authentication · *5–7 days*

- `POST /api/auth/register` — validate input, bcrypt hash, insert user
- `POST /api/auth/login` — verify hash, sign JWT, set httpOnly cookie
- `POST /api/auth/logout` — clear the cookie
- `middleware.ts` — validate JWT on every `/learn` and `/dashboard` route
- `lib/audit.ts` — write to `audit_log` on every API call
- Login and Register UI screens with validation and error states

**Exit criteria:** Register → login → protected route works. Audit log has entries. Wrong password returns 401.

---

### Phase 3 — Tutor Session Core · *7–10 days*

- `lib/prompt-builder.ts` — assemble system prompt from persona + topic records + Scenario C rules
- `lib/ollama.ts` — POST to Ollama `/api/chat`, handle streaming response
- `POST /api/sessions` — create session row, return `session_id`
- `POST /api/sessions/[id]/chat` — fetch history from DB, build prompt, stream Ollama, write messages to DB
- `GET /api/sessions/[id]` — return session metadata and current phase
- Persona Select screen
- Topic Select screen  
- Chat screen with streaming display, input, hint button, phase indicator, quick reply chips

**Exit criteria:** Full session works end-to-end. Messages are saved to DB. You can refresh the page and message history is still there.

---

### Phase 4 — Progress & History · *4–5 days*

- `PATCH /api/sessions/[id]/end` — parse the JSON block from the tutor's closing message, write score and summary to `sessions` table
- Upsert `user_progress` after each session end
- `GET /api/me/progress` — all topic progress for the current user
- `GET /api/sessions` — paginated past sessions with scores
- Progress Dashboard screen — topic cards with mastery badges
- Past session detail view — read-only message replay

**Exit criteria:** After ending a session, score and summary are saved. Dashboard shows accurate progress per topic.

---

### Phase 5 — Hardening & Polish · *3–5 days*

- Add input length validation on the chat endpoint (block messages > 2000 chars)
- Add basic rate limiting in the chat route — max 30 requests per user per 10 minutes (DB counter on `audit_log`)
- Review every API route — confirm audit_log is written in all cases including errors
- Add loading states, error boundaries, empty states to all screens
- Test manually: wrong password, expired JWT, invalid session_id, empty message
- Write `README.md` with setup steps, env variable list, first-run commands
- Clean up `.env.example`

**Exit criteria:** The app handles bad input gracefully. README lets someone else set it up from scratch.

---

## What This Project Teaches

By the time Phase 5 is done, you will have practiced:

- **Full-stack Next.js** — App Router, API Routes, Server Components, Client Components, streaming responses
- **PostgreSQL** — schema design, raw SQL queries, UUIDs, constraints, UPSERT, TIMESTAMPTZ
- **JWT authentication** — signing, verification, httpOnly cookies, middleware guards
- **LLM integration** — prompt engineering, streaming, conversation history management, context window awareness
- **Compliance patterns** — audit logging, soft deletes, input validation, secret management
- **Docker Compose** — multi-service local development environment
- **System prompt engineering** — persona injection, Scenario C enforcement, structured output (JSON from LLM)

---

## Out of Scope for v1.0

- Email verification
- Password reset flow
- Automated tests (unit / integration)
- Cloud deployment
- Admin UI for persona/topic management
- Multi-language support

---

*CyberTutor AI · Practice Project · AI Integration & Automation Engineer Path*
