# CyberTutor AI — Architecture Reference

> 4-Layer architecture · Tailwind CSS · No dark mode · No 500-line files

---

## Layer Map

```
app/            ← Layer 1 — Pages & Route Handlers (Next.js App Router)
components/     ← Layer 2 — UI Components (theme/, ui/, features/)
lib/server/     ← Layer 3 — Server-only modules (db, auth, llm, etc.)
types/          ← Layer 4 — Domain types (shared interfaces)
theme/          ← Design system (tokens, skeletons)
```

---

## Layer 1 — Pages & Routes

### Pages (`app/**/(page|layout).tsx`)
- `'use client'` only when state/effects are needed; default to Server Components.
- Max ~150 lines — no inline logic; delegate to feature components.
- Data fetch in a `useEffect` (client) or directly in the Server Component body.

### API Routes (`app/api/**/(route).ts`)
- One file per resource action.
- Always: auth check → rate limit → validate input → business logic → audit log.
- Return `NextResponse.json(...)` with explicit status codes.
- Import only from `@/lib/server/*` — never from `@/components/` or `@/theme/`.

**Naming**
```
app/api/sessions/route.ts              → GET list, POST create
app/api/sessions/[id]/route.ts         → GET one, DELETE
app/api/sessions/[id]/chat/route.ts    → POST stream chat
app/api/sessions/[id]/result/route.ts  → GET result detail
```

---

## Layer 2 — UI Components

### Folder structure

```
components/
  ui/               ← Primitive, reusable atoms (no feature logic)
    button.tsx
    Badge.tsx         DifficultyBadge | ScoreLevelBadge | CategoryBadge
    SectionCard.tsx   card shell with optional title + headerRight slot
  features/         ← Domain-specific composites (may have state)
    result/
      SessionOptionsMenu.tsx   ••• retry/delete dropdown
      ScoreStatsCard.tsx       score gauge + stat grid
      LearnerPerformancePanel.tsx  collapsible insights panel
      TranscriptPanel.tsx      sticky scrollable transcript
  ChatInput.tsx
  MessageBubble.tsx
  PersonaCard.tsx
  PhaseIndicator.tsx
  ProgressCard.tsx
  ScoreProgressChart.tsx
  SessionCharts.tsx
  TopicChip.tsx
  theme-provider.tsx
```

### Rules
- `components/ui/` — zero feature-domain knowledge; props only.
- `components/features/` — may import from `ui/` and `theme/`; never from `lib/server/`.
- Max 400 lines per file. Split at ~300 lines.
- No `dark:` Tailwind classes anywhere.
- No inline `style={{}}` — use token classes from `theme/tokens.ts`.

---

## Layer 3 — Server Modules (`lib/server/`)

| File | Purpose | Key exports |
|------|---------|-------------|
| `db.ts` | pg Pool + `query<T>()` helper | `query`, default `pool` |
| `auth.ts` | JWT sign/verify, bcrypt, cookie builders | `signJwt`, `verifyJwt`, `hashPassword`, `verifyPassword`, `buildSessionCookie`, `clearSessionCookie`, `getJwtFromCookieHeader` |
| `audit.ts` | INSERT into `audit_log` | `logAudit` |
| `llm.ts` | Multi-provider streaming LLM client | `streamChat`, `LLMMessage` |
| `prompt-builder.ts` | System prompt + message history builders | `buildSystemPrompt`, `buildMessageHistory`, `Persona`, `Topic`, `DbMessage` |
| `rate-limit.ts` | In-memory sliding-window rate limiter | `checkRateLimit`, `getClientIp` |
| `data-sanitizer.ts` | PII scrub before LLM calls | `sanitize` |
| `ollama.ts` | Legacy — kept for compat; use `llm.ts` instead | — |
| `index.ts` | Barrel re-export | `export * from './...'` |

**Import rule:** Always `@/lib/server/<module>`, not the barrel, unless importing from 3+ modules in one file.

### Auth guard pattern (every protected route)
```ts
const token = getJwtFromCookieHeader(request.headers.get('cookie'));
if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const payload = await verifyJwt(token).catch(() => null);
if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### IDOR guard pattern (resource ownership check)
```ts
const [row] = await query<{ user_id: string }>(
  'SELECT user_id FROM sessions WHERE session_id = $1', [id]
);
if (!row || row.user_id !== payload.userId)
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
```

---

## Layer 4 — Domain Types (`types/`)

```
types/
  session.ts    SessionResult | Message | ResultData
```

**Conventions**
- Export only interfaces and type aliases — no runtime code.
- Shared between client pages and API route responses.
- Add `types/api.ts` when you need shared request/response envelope shapes.
- Add `types/index.ts` barrel when the folder grows beyond 3 files.

---

## Theme System (`theme/`)

### `tokens.ts` — design token constants
```ts
// Usage:
import { btn, card, sectionCard, sectionLabel } from '@/theme/tokens';
```

| Token | Class string |
|-------|-------------|
| `btn` | `rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white …` |
| `card` | `rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm` |
| `sectionCard` | `rounded-2xl border border-neutral-100 bg-white p-5` |
| `sectionLabel` | `text-xs font-semibold uppercase tracking-wider text-neutral-400` |
| `input` | input field base classes |
| `difficulty.*` | `beginner` / `intermediate` / `advanced` color classes |
| `scoreLevel.*` | `mastered` / `inProgress` / `needsReview` color classes |
| `text.*` | `heading` / `body` / `muted` / `label` |

### `skeletons.tsx` — animated loading placeholders
```ts
import { ResultPageSkeleton, CardSkeleton, StatCardSkeleton } from '@/theme/skeletons';
```

Exports: `SkeletonBlock`, `CardSkeleton`, `StatCardSkeleton`, `ChartSkeleton`, `TranscriptSkeleton`, `ResultPageSkeleton`

### `index.ts` — barrel
```ts
export * from './tokens';
export * from './skeletons';
```

---

## File Size Rules

| Zone | Soft limit | Hard limit | Action if over |
|------|-----------|-----------|----------------|
| `app/` pages | 150 lines | 250 lines | Extract to `features/` |
| `app/api/` routes | 100 lines | 150 lines | Extract shared logic to `lib/server/` |
| `components/ui/` | 80 lines | 120 lines | Split into separate files |
| `components/features/` | 200 lines | 400 lines | Split by sub-feature |
| `lib/server/` | 150 lines | 300 lines | Extract helpers |
| `theme/tokens.ts` | — | 100 lines | Split into `color-tokens.ts` etc. |
| `theme/skeletons.tsx` | — | 200 lines | Split by page domain |

---

## Styling Rules

- **No dark mode.** No `dark:` prefix classes anywhere.
- **White background** (`bg-white`) everywhere. Borders are `border-neutral-100`.
- **Black buttons** (`bg-neutral-900 text-white`). Hover: `bg-neutral-700`.
- Use `SectionCard` for any card-style container instead of repeating `rounded-2xl border …`.
- Use `DifficultyBadge` / `ScoreLevelBadge` instead of inline conditional class strings.
- Spacing scale: `gap-5`, `p-5`, `px-4 py-2` for cards/actions; `space-y-4` for stacked items.

---

## Environment Variables

| Variable | Required | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | ✅ | `postgresql://postgres:password@localhost:5435/cybertutor` |
| `JWT_SECRET` | ✅ | min 32 chars |
| `LLM_PROVIDER` | ✅ | `groq` / `cloudflare` / `gemini` / `ollama` |
| `GROQ_API_KEY` | if groq | Groq API key |
| `GROQ_MODEL` | if groq | e.g. `llama-3.3-70b-versatile` |
| `JWT_EXPIRES_IN` | optional | default `15m` |

**PostgreSQL port is 5435** (not 5432) — set explicitly in `DATABASE_URL`.

---

## Auth Flow

```
POST /api/auth/register  →  hash password (bcrypt cost 12)  →  INSERT user
POST /api/auth/login     →  verify password  →  signJwt  →  Set-Cookie (httpOnly; Secure; SameSite=Strict)
GET  /api/auth/logout    →  clearSessionCookie  →  200
proxy.ts                 →  verifyJwt on /learn/:path* and /dashboard/:path*
```

> Uses `proxy.ts` (not `middleware.ts`) for the Edge Runtime auth guard.

---

## Suggestions / Backlog

| # | Suggestion | Why |
|---|-----------|-----|
| 1 | Create `types/api.ts` with `ApiResponse<T>` envelope | Consistent error shape across all routes |
| 2 | Create `hooks/useSession.ts` — fetch + polling logic | Removes duplicated fetch pattern across learn pages |
| 3 | Create `hooks/useAuth.ts` — current user context | Avoids re-fetching `/api/me` in every page |
| 4 | Add `components/ui/ErrorBanner.tsx` | Consistent inline error display (currently ad-hoc per page) |
| 5 | Add `components/ui/Spinner.tsx` | Single spinner atom; currently duplicated inline |
| 6 | Move `proxy.ts` → `lib/server/proxy.ts` | Keeps root clean; only `next.config.mjs` + config files at root |
| 7 | Add `types/index.ts` barrel | Once `types/api.ts` is added, barrel keeps imports tidy |
| 8 | Replace in-memory rate limiter with Redis/Upstash | Required for multi-instance or production deploys |
| 9 | Add `ScoreProgressChart` to result page | Already built — just wire it to historical session scores |
| 10 | Add `components/features/dashboard/` folder | Dashboard page growing — extract `SessionHistoryList`, `ProgressSummary` |
