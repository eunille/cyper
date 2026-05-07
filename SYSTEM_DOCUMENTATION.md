# CyberTutor AI — System Documentation

> Version 1.0 · May 2026 · Internal Technical Reference

---

## Table of Contents

1. [What CyberTutor AI Solves](#1-what-cybertutor-ai-solves)
2. [System Significance](#2-system-significance)
3. [Tech Stack](#3-tech-stack)
4. [Architecture Overview](#4-architecture-overview)
5. [The Socratic Teaching Engine](#5-the-socratic-teaching-engine)
6. [LLM — Model & Provider](#6-llm--model--provider)
7. [Token Optimization](#7-token-optimization)
8. [Security & Compliance](#8-security--compliance)
9. [Authentication Flow](#9-authentication-flow)
10. [Database Design](#10-database-design)
11. [API Reference](#11-api-reference)
12. [Streaming Architecture](#12-streaming-architecture)
13. [Session Lifecycle](#13-session-lifecycle)
14. [Sentinel Protocol](#14-sentinel-protocol)
15. [Industry Standards Applied](#15-industry-standards-applied)

---

## 1. What CyberTutor AI Solves

### The Problem

Most online cybersecurity learning platforms are passive. Students watch videos, read articles, or answer pre-set quiz questions with no adaptation. The result is surface-level retention — students learn to recognise answers without understanding the reasoning behind them.

| Problem | Traditional Platform | CyberTutor AI |
|---|---|---|
| Content is one-size-fits-all | ✓ Static content for all learners | Adapts depth based on diagnostic response |
| No accountability for wrong answers | ✓ Move on after any answer | Wrong answers are blocked from advancing |
| No reasoning check | ✓ Multiple choice only | WHY PROBE validates conceptual understanding |
| Passive consumption | ✓ Watch/read/click | Active dialogue — student must explain concepts |
| No scaffolding on failure | ✓ "Incorrect. Try again." | 4-level hint ladder → MCQ rescue → reveal |

### The Solution

CyberTutor AI is a **persona-driven Socratic tutor** for cybersecurity fundamentals. It uses a structured 5-phase teaching protocol to guide each student through a complete learning arc — from diagnosing prior knowledge to confirming mastery through practice.

The core principle: **a student must earn the right to advance.** Phase progression is gated behind evidence of comprehension, not just participation.

---

## 2. System Significance

### Educational Impact

- **Active recall** over passive recognition — the student must produce the answer, not pick from a list (MCQ is a rescue mechanic, not the default).
- **Compression of feedback loops** — a human tutor gives personalised feedback in real time; CyberTutor AI does the same at scale with zero scheduling overhead.
- **Misconception correction** — distractors in MCQ blocks are based on real common misconceptions, not arbitrary wrong answers. The tutor names the trap explicitly.
- **WHY PROBE methodology** — after every correct answer, the student must explain *why* in their own words. This is the same technique used by Socrates and modern evidence-based tutoring research (see: Bloom's 2-Sigma problem).

### Operational Significance

- **No instructor required at runtime** — the system is autonomous once a topic and persona are seeded.
- **Audit trail** — every session, message, phase transition, and login event is logged with timestamps. Suitable for compliance review.
- **Pluggable LLM backend** — the provider can be swapped between Groq, Cloudflare Workers AI, Gemini, or a local Ollama instance with one environment variable change. No code changes needed.
- **Progress tracking** — `user_progress` records best score, attempt count, and mastery status per topic per user. The dashboard surfaces this as a learning history.

---

## 3. Tech Stack

| Layer | Technology | Version | Role |
|---|---|---|---|
| **Framework** | Next.js (App Router + Turbopack) | 16.2.4 | Full-stack — UI pages + API routes in one repo |
| **Language** | TypeScript (strict mode) | 5.x | Zero `any` tolerance; `npx tsc --noEmit` enforced after every change |
| **UI** | React | 19.2.4 | Client components for streaming chat, MCQ cards, modals |
| **Styling** | Tailwind CSS | 4.x | Utility-first; white background, black buttons; no dark mode |
| **Component Library** | shadcn/ui + Radix UI | latest | Accessible unstyled primitives |
| **Charts** | Recharts | 3.8.1 | Dashboard progress visualisation |
| **Database** | PostgreSQL 16 (Alpine) | 16-alpine | Raw SQL via `pg` (node-postgres); no ORM |
| **LLM Provider** | Groq API | — | Hosts `llama-3.3-70b-versatile`; OpenAI-compatible SSE |
| **Auth** | `jose` (JWT) + `bcryptjs` | 6.2.3 / 3.0.3 | httpOnly cookies; cost-12 bcrypt; OTP MFA |
| **Email / OTP** | Nodemailer | 8.0.7 | Gmail SMTP; 6-digit OTP delivery |
| **Markdown render** | react-markdown | 10.1.0 | Renders tutor responses with safe HTML |
| **Icons** | Lucide React | 1.14.0 | UI iconography |
| **Container** | Docker Compose | — | PostgreSQL container only; Next.js runs on host |

### Why These Choices

**Next.js App Router** — API routes and React pages co-exist in one repo. No separate Express server, no CORS configuration, no proxy layer for local development.

**Raw SQL over ORM** — Every query is readable and auditable. No magic N+1 queries hiding behind abstraction. Senior engineers read SQL; this stack makes that the default.

**Groq over OpenAI** — Groq's inference hardware (LPU) delivers the fastest time-to-first-token of any cloud provider at time of writing. The LLaMA 3.3 70B model matches GPT-4o on coding and reasoning benchmarks. Groq's free tier covers development; paid tier is cost-competitive at scale.

**Provider abstraction** — `lib/server/llm.ts` supports `cloudflare`, `groq`, `gemini`, and `ollama` behind a single `LLM_PROVIDER` env var. Switching providers is a one-line `.env.local` change.

---

## 4. Architecture Overview

```
Browser (React 19)
  │
  │  HTTPS / httpOnly Cookie (JWT)
  ▼
Next.js 16 (App Router + Turbopack)
  ├── /app/**                     → React pages (SSR + Client Components)
  │     ├── /auth                 → Login + OTP verification
  │     ├── /learn                → Topic selection, session view, dashboard
  │     └── /dashboard           → Session history, progress charts
  │
  ├── /app/api/**                 → API Routes (server-side only)
  │     ├── /auth/login           → Password verify → OTP dispatch
  │     ├── /auth/verify-otp      → OTP check → JWT cookie set
  │     ├── /auth/logout          → Cookie clear
  │     ├── /sessions             → Create session
  │     ├── /sessions/[id]/chat   → Stream LLM response
  │     ├── /sessions/[id]/end    → Force-end session
  │     ├── /sessions/[id]/phase  → Poll current phase (for progress bar)
  │     └── /personas, /topics    → Seed data access
  │
  ├── /lib/server/**              → Server-only modules (never imported by client)
  │     ├── db.ts                 → pg pool + parameterised query helper
  │     ├── auth.ts               → JWT sign/verify + bcrypt
  │     ├── llm.ts                → Provider-agnostic LLM streaming client
  │     ├── prompt-builder.ts     → System prompt assembly + history sanitisation
  │     ├── audit.ts              → Audit log writes
  │     ├── rate-limit.ts         → Sliding-window in-memory rate limiter
  │     ├── otp.ts                → OTP generation + expiry
  │     ├── mailer.ts             → Nodemailer Gmail SMTP
  │     └── data-sanitizer.ts     → Input sanitisation
  │
  └── /proxy.ts                   → Auth guard middleware (NOT middleware.ts)
        └── Protects /learn/** and /dashboard/**

PostgreSQL 16 (Docker, port 5435)
  └── Tables: users, personas, topics, sessions, messages,
              user_progress, audit_log, otp_codes

Groq Cloud API
  └── Model: llama-3.3-70b-versatile
  └── Protocol: OpenAI-compatible SSE (Server-Sent Events)
```

### Request Flow — Chat Message

```
1  User types a message → React calls POST /api/sessions/[id]/chat
2  proxy.ts validates JWT from httpOnly cookie
3  API route verifies JWT, checks session ownership (user_id match)
4  Checks session.phase !== 'ended'
5  Sanitises input (max 4000 chars, XSS strip)
6  Fetches full message history from PostgreSQL
7  prompt-builder strips sentinel JSON from assistant history
8  prompt-builder assembles: system prompt + history + new message
9  streamChat() opens SSE connection to Groq API
10 Tokens stream back chunk-by-chunk via ReadableStream to browser
11 Client useSession hook buffers rawContent, strips sentinels for display
12 When stream ends: parse phase sentinels, update DB, log audit entry
13 Client polls /phase endpoint; updates progress bar in real time
```

---

## 5. The Socratic Teaching Engine

The pedagogical backbone of CyberTutor AI is the **Scenario C protocol** — a 5-phase structured teaching session enforced at both the LLM prompt level and the server logic level.

### The 5 Phases

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  DIAGNOSTIC │───▶│   EXPLAIN   │───▶│    CHECK    │───▶│    RECAP    │───▶│  PRACTICE   │
│             │    │             │    │  (THE GATE) │    │             │    │             │
│ Probe prior │    │ Teach one   │    │ Validate    │    │ Summarise   │    │ Hands-on    │
│ knowledge   │    │ concept     │    │ with WHY    │    │ all learned │    │ scenario    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### The CHECK Gate (Phase 3)

Phase 3 is the critical gate. The student cannot advance to RECAP until **both** conditions are met:

1. The student answers the check question correctly or closely.
2. The student answers the WHY PROBE with a correct explanation.

A wrong answer at any point activates the **Wrong-Answer Recovery Ladder**:

| Attempt | Action |
|---|---|
| 1st wrong | L1 vague hint → re-ask |
| 2nd wrong | L2 mechanism hint → re-ask |
| 3rd wrong | MCQ BLOCK emitted |
| Wrong MCQ pick | Distractor explanation + correct answer + WHY PROBE |
| Correct MCQ pick | Affirm + WHY PROBE + validate WHY before advancing |
| 4th fail total | L4 Full reveal + restatement request |

### Two-Layer Phase Gate Enforcement

Phase advancement is protected at two independent layers:

| Layer | Mechanism | What it blocks |
|---|---|---|
| **LLM Prompt** | SCENARIO_C_RULES in system prompt | Instructs the model never to emit `advance_phase` on wrong/non-answers |
| **Server Guard** | `blockAdvance` in `chat/route.ts` | Intercepts and drops any `advance_phase:"recap"` signal when the current message was an MCQ-format wrong answer confirmed by distractor pattern in response |

### Sentinel Protocol

The LLM communicates phase transitions and MCQ blocks through embedded JSON sentinels in its response text. These are machine-readable signals the system acts on, then strips before display.

```jsonc
// Phase advance signal (emitted on its own line)
{"advance_phase": "check"}

// MCQ block (emitted on its own line)
{"mcq":{"q":"...","opts":{"A":"...","B":"...","C":"...","D":"..."},"correct":"B"}}

// Session end signal (emitted alone)
{"score": 82, "summary": "...", "gaps": ["topic1"]}
```

Sentinel stripping is applied at **two points**:
- **Client** (`useSession.ts` → `stripSentinels()`): removes from display during streaming via a `rawContent` buffer so raw JSON is never shown in chat bubbles.
- **Server** (`prompt-builder.ts` → `stripSentinelsFromHistory()`): removes from all assistant messages before feeding history back to the LLM, preventing the model from re-reading its own phase signals as session milestones.

Both use identical **brace-counting** logic (not regex) to handle nested JSON correctly.

---

## 6. LLM — Model & Provider

### Active Configuration

| Setting | Value |
|---|---|
| Provider | **Groq** |
| Model | **`llama-3.3-70b-versatile`** |
| Protocol | OpenAI-compatible SSE (`/chat/completions` endpoint) |
| Streaming | Yes — token-by-token via `ReadableStream` |
| Context window | 128k tokens |
| Data retention | Groq's zero-retention policy on free tier for API calls |

### Why LLaMA 3.3 70B on Groq

- **Speed**: Groq LPU hardware delivers the lowest time-to-first-token of cloud providers (~100ms). Streaming tutoring responses feel instantaneous.
- **Quality**: LLaMA 3.3 70B matches or exceeds GPT-4o on instruction-following benchmarks — critical for Socratic prompt compliance.
- **Instruction compliance**: 70B models reliably follow structured prompt rules (emit sentinel JSON on correct lines, never advance phase on wrong answers). Smaller models (7B–13B) fail these reliably.
- **Cost**: Free tier covers development; paid tier is $0.59/M input tokens — significantly cheaper than OpenAI GPT-4o at $5/M.
- **Privacy**: API calls go to Groq servers in the US. No training on API data under standard terms.

### Provider Abstraction

`lib/server/llm.ts` is provider-agnostic. Switch with one env var:

```bash
LLM_PROVIDER=groq        # current
LLM_PROVIDER=cloudflare  # Cloudflare Workers AI (free, zero-retention)
LLM_PROVIDER=gemini      # Google Gemini Flash
LLM_PROVIDER=ollama      # Local Ollama (fully private, no API key)
```

No application code changes required. All four providers implement the same `AsyncGenerator<string>` streaming interface internally.

---

## 7. Token Optimization

Token usage directly affects latency and cost. Several techniques are applied:

### 1. Sentinel Stripping from History

Before each LLM call, all assistant messages in the history are stripped of `advance_phase`, `mcq`, and `score` JSON blocks via `stripSentinelsFromHistory()`.

**Why it matters**: These sentinels can be 50–200 tokens each. A 20-message session with 5 MCQ blocks would otherwise waste ~1000 tokens per turn on data the LLM doesn't need to re-read — and which causes hallucinations when it does.

### 2. Phase-Aware History Pruning (design principle)

Each message stores `phase_at_send`. This enables future context window management: messages from completed phases can be summarised and dropped once the session advances, keeping context lean for long sessions.

### 3. Concise System Prompt

The SCENARIO_C_RULES prompt is written in imperative form — no examples, no repetition. Rules are stated once. Token budget for the system prompt is under 800 tokens.

### 4. Max Content Length Guard

User messages are capped at **4000 characters** server-side (`MAX_CONTENT_LENGTH = 4000`). This prevents prompt injection attempts and context window abuse.

### 5. Brevity Rule in Prompt

The LLM is instructed: *"Every reply: max 3 sentences. One idea per message."* This caps output tokens per turn to approximately 100–150 tokens, keeping streaming fast and responses pedagogically focused.

### Estimated Token Budget per Turn

| Component | Approx. Tokens |
|---|---|
| System prompt | ~700 |
| Message history (10-turn session, stripped) | ~800 |
| User message | ~30–80 |
| LLM response | ~80–150 |
| **Total per turn** | **~1,600–1,700** |

At Groq's pricing: ~$0.001 per turn. A complete 5-phase session costs under $0.01.

---

## 8. Security & Compliance

CyberTutor AI implements defence-in-depth across authentication, data access, transport, and input handling. Below is a mapping to the **OWASP Top 10 (2021)** and applied mitigations.

### OWASP Top 10 Compliance

| OWASP Category | Risk | Mitigation Applied |
|---|---|---|
| **A01 — Broken Access Control** | User accesses another user's session | Session ownership check: `session.user_id !== userId` → 403. Route-level JWT validation on every API call. |
| **A02 — Cryptographic Failures** | Password exposure | `bcryptjs` cost factor 12. Passwords never logged or returned in responses. |
| **A03 — Injection** | SQL injection | All queries use parameterised statements via `pg` — no string interpolation. |
| **A03 — Injection** | XSS / prompt injection | Input sanitised via `lib/server/data-sanitizer.ts` before DB write and LLM call. |
| **A04 — Insecure Design** | Session enumeration | All PKs are UUIDs (`gen_random_uuid()`), never sequential integers. |
| **A05 — Security Misconfiguration** | Credential exposure | No secrets in source code. All keys in `.env.local` (git-ignored). |
| **A07 — Identification & Auth Failures** | Brute-force login | Rate limiter: 5 requests per IP per 15-minute window on `/api/auth/login`. |
| **A07 — Identification & Auth Failures** | Session hijacking | JWT in `httpOnly; Secure; SameSite=Strict` cookie — inaccessible to JavaScript. |
| **A07 — Identification & Auth Failures** | Single-factor auth bypass | Two-factor: password + time-limited 6-digit OTP delivered via email. |
| **A09 — Security Logging Failures** | No audit trail | Every API call writes to `audit_log` with user_id, endpoint, status, timestamp. |
| **A10 — SSRF** | LLM provider fetch abuse | LLM base URLs are hardcoded per provider in `llm.ts` — not user-supplied. |

### Authentication Security Detail

```
Login Flow:
  1. POST /api/auth/login
     ├── Rate limit check (5 req / 15 min / IP)
     ├── Constant-time bcrypt compare (dummy hash if user not found — prevents timing attack)
     └── On success: generate 6-digit OTP, store hashed in otp_codes (TTL: 10 min), send email

  2. POST /api/auth/verify-otp
     ├── Validate OTP not expired (checked_at vs expires_at)
     ├── Mark OTP used (one-time use enforced)
     └── Set JWT in httpOnly; Secure; SameSite=Strict cookie

JWT Properties:
  - Algorithm: HS256 (jose library)
  - Payload: { userId, iat, exp }
  - Expiry: configured via JWT_EXPIRY env var
  - Storage: httpOnly cookie only — never localStorage, never sessionStorage
```

### Input Validation

- All API routes validate request body types before use.
- `content` field: must be non-empty string, max 4000 chars.
- Content sanitised via `data-sanitizer.ts` before DB insert and LLM call.
- No user-supplied values interpolated into SQL strings.

### Secrets Management

```bash
# .env.local (never committed)
DATABASE_URL=postgresql://...
GROQ_API_KEY=gsk_...
JWT_SECRET=...
SMTP_PASS=...
```

`.env.local` is in `.gitignore`. No secrets appear in source code, logs, or API responses.

---

## 9. Authentication Flow

```
                    ┌──────────────┐
                    │   Browser    │
                    └──────┬───────┘
                           │ POST /api/auth/login
                           │ { username, password }
                           ▼
                    ┌──────────────┐
                    │  Rate Limit  │ ← 5 req / 15 min / IP
                    └──────┬───────┘
                           │ Pass
                           ▼
                    ┌──────────────┐
                    │ bcrypt verify│ ← cost 12, constant-time
                    └──────┬───────┘
                           │ Valid
                           ▼
                    ┌──────────────┐
                    │  OTP create  │ ← 6 digits, 10 min TTL, stored hashed
                    │  + email     │ ← Gmail SMTP via Nodemailer
                    └──────┬───────┘
                           │
                    ┌──────────────┐
                    │   Browser    │ ← User enters OTP
                    └──────┬───────┘
                           │ POST /api/auth/verify-otp
                           ▼
                    ┌──────────────┐
                    │ OTP validate │ ← expiry + one-time use check
                    └──────┬───────┘
                           │ Valid
                           ▼
                    ┌──────────────┐
                    │  JWT issued  │ ← httpOnly; Secure; SameSite=Strict
                    └──────────────┘
```

### Session Expiry Handling

When any authenticated API call returns HTTP 401, the client `useSession` hook fires `handle401()`, which sets `sessionExpired: true`. The `SessionExpiredModal` component renders with a 4-second countdown and animated progress bar, then auto-calls `handleLogout()` which clears the cookie and redirects to `/auth`.

---

## 10. Database Design

PostgreSQL 16-Alpine. Host port **5435**. Container: `cybot-postgres-1`.

### Schema at a Glance

```
users          → identity, credentials (hashed), active status
personas       → tutor personalities seeded at startup
topics         → learning topics with category + difficulty
sessions       → one row per tutor session, tracks phase + score
messages       → all chat messages, with phase_at_send column
user_progress  → upserted on session end (best score, mastery)
audit_log      → every API call: user, endpoint, status, timestamp
otp_codes      → time-limited 6-digit codes, one-time use
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| UUIDs for all PKs | Prevents record enumeration attacks. Session IDs in URLs are not guessable. |
| `phase_at_send` on messages | Enables phase-aware history pruning and server-side phase validation |
| `is_active` soft delete on users | Accounts are never hard-deleted; supports audit and recovery |
| Separate `otp_codes` table | OTPs are short-lived and high-volume; isolating them simplifies TTL management |
| `UNIQUE (user_id, topic_id)` on user_progress | One upsertable row per student per topic; no duplicates |

---

## 11. API Reference

All routes require a valid JWT in the `cybertutor_session` httpOnly cookie unless marked public.

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create account |
| `POST` | `/api/auth/login` | Public | Verify password → send OTP |
| `POST` | `/api/auth/verify-otp` | Public | Verify OTP → set JWT cookie |
| `POST` | `/api/auth/logout` | Auth | Clear JWT cookie |
| `GET` | `/api/me` | Auth | Current user profile |
| `GET` | `/api/personas` | Auth | List all tutor personas |
| `GET` | `/api/topics` | Auth | List all topics |
| `POST` | `/api/sessions` | Auth | Create a new session |
| `POST` | `/api/sessions/[id]/chat` | Auth | Send message, stream response |
| `POST` | `/api/sessions/[id]/end` | Auth | Force-end a session |
| `GET` | `/api/sessions/[id]/phase` | Auth | Poll current phase |
| `GET` | `/api/sessions/[id]` | Auth | Session detail + messages |
| `GET` | `/api/progress` | Auth | User progress across all topics |

---

## 12. Streaming Architecture

LLM responses are streamed token-by-token from Groq → Next.js API route → Browser. No buffering of the full response.

```
Groq API (SSE)
  │ data: {"choices":[{"delta":{"content":"token"}}]}
  │
  ▼
Next.js API Route
  ├── ReadableStream<Uint8Array>
  ├── Enqueue token chunks as they arrive
  └── On stream end: parse sentinels, update DB

  │
  ▼
Browser (useSession.ts)
  ├── fetch() with body reader
  ├── rawContent buffer accumulates all tokens
  ├── stripSentinels(rawContent) → clean display text
  ├── React state update on each chunk → re-render
  └── After stream ends:
        ├── extractMcq(rawContent) → attach MCQCard if present
        └── Phase poll → update progress indicator
```

### Why ReadableStream (not WebSocket)

- HTTP streaming via `ReadableStream` is stateless and works through load balancers without sticky sessions.
- The SSE protocol from Groq is already a `ReadableStream` internally — no translation layer needed.
- WebSocket adds handshake overhead and connection management complexity for a use case that is unidirectional (server → client for tokens).

---

## 13. Session Lifecycle

```
created
  │
  ▼
diagnostic  ←──── LLM emits {"advance_phase":"explain"} after student responds
  │
  ▼
explain     ←──── LLM emits {"advance_phase":"check"} after teaching + check question
  │
  ▼
check       ←──── LLM emits {"advance_phase":"recap"} ONLY after correct answer + WHY PROBE
  │                Server blockAdvance guard as second layer
  ▼
recap       ←──── LLM emits {"advance_phase":"practice"} after recap
  │
  ▼
practice    ←──── LLM emits {"score":...} after student's first substantive response
  │                Auto-end fallback: if LLM misses score sentinel, server auto-ends with score 75
  ▼
ended       ─────▶ user_progress upserted, redirect to /dashboard/session/[id]
```

### Phase Persistence

Phase is stored in `sessions.phase`. Every API call reads the current phase from the DB — there is no client-side phase state. The React progress bar polls `/api/sessions/[id]/phase` every 3 seconds while a session is active.

---

## 14. Sentinel Protocol

Sentinels are the machine-readable control channel embedded in the LLM's natural language output. The LLM writes them; the system reads and acts on them; the UI never sees them.

### Sentinel Types

| Sentinel | When emitted | Server action |
|---|---|---|
| `{"advance_phase":"<phase>"}` | Phase completion | `UPDATE sessions SET phase = $1` (forward-only, with blockAdvance guard) |
| `{"mcq":{...}}` | Student is stuck / blank | Parsed by `extractMcq()` in client hook; rendered as `MCQCard` component |
| `{"score":N,"summary":"...","gaps":[...]}` | Practice response received | `UPDATE sessions SET phase='ended', score=$1, summary=$2, gaps=$3`; upsert `user_progress` |

### Brace-Counting Parser

Sentinels are extracted using a brace-counting algorithm, not regex. This is necessary because option text inside `{"mcq":{...}}` can contain quotes, commas, and special characters that would break a regex approach.

```typescript
// Algorithm: find marker → walk back to opening { → count depth → extract slice → JSON.parse
function extractMcq(text: string): McqData | undefined {
  const marker = '"mcq":';
  const start = text.indexOf(marker);
  // ... brace counting loop ...
  return JSON.parse(text.slice(outerBrace, end + 1)).mcq;
}
```

The same algorithm is used in:
- `useSession.ts` → `extractMcq()` and `stripSentinels()` (client-side)
- `prompt-builder.ts` → `stripSentinelsFromHistory()` (server-side)

---

## 15. Industry Standards Applied

| Standard / Practice | Where Applied |
|---|---|
| **OWASP Top 10** | Full mapping in Section 8 |
| **Parameterised SQL** | All DB queries via `pg` with `$1, $2` placeholders |
| **bcrypt cost 12** | Password hashing (NIST SP 800-63B recommendation) |
| **Multi-factor Authentication** | Password + time-limited OTP (NIST SP 800-63B Level 2) |
| **httpOnly + Secure + SameSite=Strict cookies** | JWT storage (OWASP Session Management Cheatsheet) |
| **Constant-time comparison** | Dummy hash on unknown user prevents timing-based enumeration |
| **UUID primary keys** | Prevents IDOR (Insecure Direct Object Reference) attacks |
| **Soft delete** | `is_active = false` instead of `DELETE` — preserves audit trail |
| **Audit logging** | Every API call logged with user, action, status, timestamp |
| **Rate limiting** | Login endpoint: 5 req / 15 min / IP (sliding window) |
| **Separation of concerns** | `lib/server/**` is server-only; no server modules imported in client components |
| **Input validation at boundaries** | Every API route validates types before processing |
| **No secrets in source** | All credentials in `.env.local` (git-ignored) |
| **Forward-only phase transitions** | `phaseOrder` map enforces that phase can only increase, never regress |
| **Immutable data patterns** | New messages are inserted, not updated; history is append-only |
| **Zero TS errors policy** | `npx tsc --noEmit` run after every change — strict mode enforced |
| **File size limit** | No file over 500 lines — enforced manually to maintain readability |

---

*CyberTutor AI — Built to teach security through the same rigour it embodies.*