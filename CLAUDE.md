# ReCode — Project Handover

> **Solve once. Remember forever.**
> A spaced-repetition revision tracker for LeetCode problems.

This file is the source of truth for building ReCode. Read it fully before writing code. Build milestone by milestone (see **Roadmap**), and check off tasks as they are completed.

---

## 1. Product Overview

ReCode helps developers retain what they've solved on LeetCode. Users log solved problems (manually by problem number, or auto-synced from their public LeetCode profile), write notes, add their own tags, and get a daily list of problems due for revision based on spaced repetition.

### Core user loop
1. User signs up (Google OAuth or email via Supabase Auth).
2. User optionally links their **public LeetCode username** (no LeetCode login/OAuth exists; we only read public data).
3. Solved problems appear in their list (auto-sync or manual add by number).
4. User writes markdown notes + custom tags per problem.
5. Each problem gets a `nextReviewAt` date.
6. The dashboard shows **"Due today"**. User revises, then rates recall: **Easy / Okay / Forgot**.
7. The rating determines the next review date.

### Key concepts
- Problems are primarily identified by **LeetCode frontend number** (e.g. `1` = Two Sum).
- **Tags** = LeetCode topic tags (shared, from problem metadata) + **custom tags** (per user, free text).
- **Revision** = spaced repetition with adaptive intervals (simplified SM-2).

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js **15.5.x** (**App Router**, React Server Components), React 19 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui, style `radix-nova` — built on **Radix UI** primitives (`radix-ui` package), Lucide icons |
| Dark mode | `next-themes` |
| Auth | Supabase Auth via `@supabase/ssr` |
| Database | PostgreSQL hosted on Supabase |
| ORM | Prisma **6.19.x** |
| Validation | Zod 4 |
| Markdown notes | `react-markdown` + `remark-gfm` for rendering; plain `<Textarea>` for editing (upgrade later) |
| Dates | `date-fns` + `date-fns-tz` |
| Tests | Vitest (from Milestone 3) |
| Deployment | Vercel |
| Scheduled jobs | Vercel Cron |
| Email reminders (later) | Resend |

**Do not add** other UI libraries (no Headless UI, MUI, Chakra, and no Base UI — shadcn must stay on the Radix base). Use shadcn/ui components only; add them with `npx shadcn@latest add <component>`.

---

## 3. Initial Setup

Already done in this repo; kept for reference.

```bash
npx create-next-app@15.5.26 recode --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
cd recode
npx shadcn@latest init --base radix --preset nova
npm i @prisma/client@6.19.3 @supabase/supabase-js @supabase/ssr zod date-fns date-fns-tz react-markdown remark-gfm next-themes
npm i -D prisma@6.19.3
```

### Environment variables (`.env.local` / `.env`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Prisma — use the POOLED connection (port 6543) for runtime
DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true&connection_limit=1"
# Direct connection (port 5432) for migrations
DIRECT_URL="postgresql://...:5432/postgres"

# Protects cron endpoints
CRON_SECRET=
```

Never commit `.env*` files. Keep `.env.example` updated with empty keys.

---

## 4. Common Commands

```bash
npm run dev                     # start dev server
npm run build                   # production build (run before declaring a milestone done)
npm run lint                    # lint
npx prisma migrate dev --name <name>   # create + apply migration
npx prisma generate             # regenerate client
npx prisma studio               # inspect DB
npx prisma db seed              # seed problems table
```

---

## 5. Folder Structure

```
src/
  app/
    (auth)/
      login/page.tsx
      auth/callback/route.ts        # Supabase OAuth callback
    (app)/                          # authenticated area, shared layout w/ sidebar
      layout.tsx
      dashboard/page.tsx            # Due today + stats
      problems/page.tsx             # All problems, filter by tag/difficulty
      problems/[number]/page.tsx    # Problem detail: notes, tags, review history
      review/page.tsx               # Focused revision session (one at a time)
      settings/page.tsx             # LeetCode username, timezone
    api/
      cron/sync-leetcode/route.ts   # daily sync (protected by CRON_SECRET)
    page.tsx                        # public landing page
  components/
    ui/                             # shadcn components (generated, don't hand-edit heavily)
    problems/                       # ProblemCard, TagPicker, NotesEditor, RatingButtons...
    dashboard/                      # DueList, StreakCounter, Heatmap...
  lib/
    prisma.ts                       # Prisma singleton
    supabase/server.ts              # server client (cookies)
    supabase/client.ts              # browser client
    auth.ts                         # getCurrentUser() helper
    srs.ts                          # spaced repetition logic (pure functions)
    leetcode.ts                     # LeetCode GraphQL client
    validations.ts                  # Zod schemas
  actions/                          # Server Actions (mutations)
    problems.ts
    reviews.ts
    settings.ts
  middleware.ts                     # refresh Supabase session, protect (app) routes
prisma/
  schema.prisma
  seed.ts
```

---

## 6. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum Rating {
  EASY
  OKAY
  FORGOT
}

enum ProblemSource {
  MANUAL
  SYNC
}

model User {
  id               String        @id @db.Uuid   // same as Supabase auth.users.id
  email            String        @unique
  leetcodeUsername String?
  timezone         String        @default("UTC") // IANA, e.g. "Asia/Kolkata"
  lastSyncedAt     DateTime?
  createdAt        DateTime      @default(now())
  problems         UserProblem[]
}

// Shared cache of LeetCode problem metadata
model Problem {
  number     Int           @id               // LeetCode frontend question number
  title      String
  titleSlug  String        @unique
  difficulty Difficulty
  topicTags  String[]
  paidOnly   Boolean       @default(false)
  userLinks  UserProblem[]
}

model UserProblem {
  id            String        @id @default(cuid())
  userId        String        @db.Uuid
  problemNumber Int
  notes         String        @default("")   // markdown
  customTags    String[]
  source        ProblemSource @default(MANUAL)
  solvedAt      DateTime      @default(now())
  stage         Int           @default(0)    // index into SRS intervals
  nextReviewAt  DateTime
  reviewCount   Int           @default(0)
  lastReviewedAt DateTime?
  archived      Boolean       @default(false) // "mastered", excluded from due list
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  problem Problem  @relation(fields: [problemNumber], references: [number])
  reviews Review[]

  @@unique([userId, problemNumber])
  @@index([userId, nextReviewAt])
}

model Review {
  id            String      @id @default(cuid())
  userProblemId String
  rating        Rating
  reviewedAt    DateTime    @default(now())
  stageBefore   Int
  stageAfter    Int

  userProblem UserProblem @relation(fields: [userProblemId], references: [id], onDelete: Cascade)

  @@index([userProblemId])
}
```

**User row creation:** on first login (in the auth callback or `getCurrentUser()`), upsert a `User` row using the Supabase user's `id` and `email`.

---

## 7. Spaced Repetition Logic (`src/lib/srs.ts`)

Keep this file **pure** (no DB, no I/O) and fully unit-tested.

```ts
export const INTERVALS_DAYS = [1, 3, 7, 14, 30, 60, 120] as const;
export const MAX_STAGE = INTERVALS_DAYS.length - 1;

// Rating → next stage
// EASY   → stage + 2 (capped)
// OKAY   → stage + 1 (capped)
// FORGOT → 0
export function nextStage(current: number, rating: "EASY" | "OKAY" | "FORGOT"): number;

// Returns the next review date: start of day in user's timezone + INTERVALS_DAYS[stage]
export function computeNextReviewAt(stage: number, from: Date, timezone: string): Date;
```

Rules:
- New problem (manual or synced): `stage = 0`, `nextReviewAt = solvedAt + 1 day`.
- **"Due"** means `nextReviewAt <= end of today in the user's timezone` and `archived = false`.
- Overdue problems stay in the due list (sorted most-overdue first), and are never auto-skipped.
- At `MAX_STAGE` with an EASY rating, offer (don't force) "Mark as mastered" → `archived = true`.
- Submitting a review must, in one transaction: create a `Review`, update `stage`, `nextReviewAt`, `reviewCount`, `lastReviewedAt`.

---

## 8. LeetCode Integration (`src/lib/leetcode.ts`)

LeetCode has **no official public API**. We use the unofficial GraphQL endpoint used by the website. Treat it as unreliable: handle errors gracefully, never crash a page because of it, and cache metadata in the `Problem` table.

**Endpoint:** `POST https://leetcode.com/graphql` with headers `Content-Type: application/json` and `Referer: https://leetcode.com`.

**Recent accepted submissions** (public profiles only; returns ~20 most recent max):
```graphql
query recentAc($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    id
    title
    titleSlug
    timestamp
  }
}
```

**Problem metadata by slug:**
```graphql
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId
    title
    titleSlug
    difficulty
    isPaidOnly
    topicTags { name slug }
  }
}
```

**Seeding the `Problem` table** (`prisma/seed.ts`): fetch the full problem list once so users can add problems **by number** without extra API calls. The legacy endpoint `https://leetcode.com/api/problems/all/` returns `stat_status_pairs` with `stat.frontend_question_id`, `stat.question__title`, `stat.question__title_slug`, `difficulty.level` (1/2/3), and `paid_only`. Topic tags aren't included there, so fetch them lazily via `questionData` the first time a problem is added, then store them.

**Sync behaviour:**
- Runs daily via Vercel Cron (Hobby plan allows daily cron only), plus a manual "Sync now" button in Settings (rate-limit it: once per 10 minutes per user).
- For each user with `leetcodeUsername`: fetch recent AC list → map slug → problem number → upsert `UserProblem` with `source = SYNC` if not already present. **Never overwrite** existing notes, tags, or SRS state.
- Because only ~20 recent submissions are returned, users who solve many problems between syncs may miss some. Show a hint in the UI to add older problems manually.
- Validate the username exists when saving it in Settings (a `matchedUser` query or a successful empty response).

**Cron route security:** `/api/cron/sync-leetcode` must check `Authorization: Bearer ${CRON_SECRET}` and return 401 otherwise.

`vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/sync-leetcode", "schedule": "0 2 * * *" }]
}
```

---

## 9. Pages & Features

### Landing (`/`)
Tagline, short explanation of the revision loop, "Get started" → login.

### Dashboard (`/dashboard`) — Server Component
- **Due today** list (count + cards: number, title, difficulty badge, tags, days overdue).
- "Start review" button → `/review`.
- Stats: total problems, reviews this week, current streak (consecutive days with ≥1 review).
- Later: GitHub-style review heatmap.

### Problems (`/problems`)
- Table/list of all user problems.
- Filters: custom tag, topic tag, difficulty, due/not due, archived. Search by number or title.
- "Add problem" dialog: input number → preview title/difficulty from `Problem` table → confirm.

### Problem detail (`/problems/[number]`)
- Title, difficulty, link to `https://leetcode.com/problems/{titleSlug}/`.
- Markdown notes editor with preview tab; save via Server Action.
- Tag picker for custom tags (autocomplete from user's existing tags).
- Next review date, stage, review history.
- Actions: "Review now", "Reset schedule", "Archive", "Delete".

### Review session (`/review`) — Client Component for interactivity
- Shows due problems one at a time: number, title, tags, link to solve again. Notes hidden by default with "Reveal notes" (encourages active recall).
- Rating buttons: **Forgot / Okay / Easy**, each showing the resulting next interval (e.g. "Okay · 7 days").
- Keyboard shortcuts: `1` Forgot, `2` Okay, `3` Easy, `Space` reveal notes.
- End screen with summary.

### Settings (`/settings`)
- LeetCode username (validate on save), "Sync now", last synced time.
- Timezone (default from browser `Intl.DateTimeFormat().resolvedOptions().timeZone`).

---

## 10. Coding Conventions

- **Server Components by default.** Add `"use client"` only for interactivity (editors, rating buttons, dialogs, filters).
- **Mutations via Server Actions** in `src/actions/`. Every action must: get the current user, validate input with Zod, scope all queries by `userId`, then `revalidatePath` the affected pages.
- **Never trust client-supplied userId.** Always derive it from the Supabase session on the server.
- Prisma client as a singleton in `src/lib/prisma.ts` (avoid multiple instances in dev hot reload).
- Keep business logic (SRS, LeetCode parsing) in `src/lib/` as testable functions; keep components thin.
- Use `date-fns-tz` for all "today" calculations; never use server local time.
- Accessible UI: use shadcn/Radix primitives, label all inputs, support keyboard navigation.
- Loading states with `loading.tsx` / Suspense; error states with `error.tsx`.
- Small, focused commits per task. Run `npm run lint` and `npm run build` before marking a milestone complete.

---

## 11. Roadmap

### Milestone 1 — Foundation
- [x] Project scaffold, Tailwind, shadcn/ui init
- [x] Prisma schema + first migration against Supabase
- [x] Supabase Auth (Google + email magic link), `middleware.ts` session refresh, protected `(app)` layout
- [x] `getCurrentUser()` with User upsert on first login
- [x] App shell: sidebar/nav (Dashboard, Problems, Review, Settings), dark mode

### Milestone 2 — Problems & Notes
- [x] Seed script for `Problem` table
- [x] Add problem by number (with preview), lazy-fetch topic tags
- [x] Problems list with search + filters
- [ ] Problem detail page: markdown notes, custom tags, delete/archive

### Milestone 3 — Revision Engine
- [ ] `srs.ts` with unit tests (Vitest)
- [ ] Dashboard "Due today" (timezone-aware)
- [ ] Review session page with rating + keyboard shortcuts
- [ ] Review history on problem detail

### Milestone 4 — LeetCode Sync
- [ ] `leetcode.ts` client with error handling + timeouts
- [ ] Settings: link/validate username, timezone
- [ ] Manual "Sync now" (rate-limited)
- [ ] Cron route + `vercel.json`

### Milestone 5 — Polish & Launch
- [ ] Stats: streak, weekly reviews, heatmap
- [ ] Landing page
- [ ] Empty states, loading skeletons, error boundaries
- [ ] Deploy to Vercel, set env vars, verify cron
- [ ] Set the Vercel function region to `bom1` (same region as the DB) and revisit filter speed (see the 2026-10-09 Decisions Log entry)

### Future ideas
- Daily reminder email via Resend ("5 problems due today")
- Browser extension: "Save to ReCode" button on LeetCode problem pages
- Revise-by-tag sessions ("revise all my DP problems")
- Import older solved problems in bulk (paste list of numbers)
- Public shareable profile / stats

---

## 12. Known Gotchas

- **Supabase + Prisma:** runtime must use the pooled URL (port 6543, `pgbouncer=true`); migrations use `DIRECT_URL`. Mixing them up causes prepared-statement or connection-limit errors.
- **LeetCode API is unofficial:** it can change or rate-limit without notice. Add timeouts, retries with backoff in cron, and clear UI errors ("Couldn't reach LeetCode, try again later").
- **Private LeetCode profiles** return no submissions; tell the user to make their profile public or add problems manually.
- **Timezones:** a problem due "tomorrow" for a user in India is still "today" in UTC for several hours. Always compute due dates in the user's timezone.
- **Supabase Auth user vs Prisma User:** they're separate tables; keep IDs identical (UUID) and upsert on login.

---

## 13. How to Work on This Project (for Claude Code)

1. Work one milestone at a time, in order. Don't start the next until the current one builds cleanly.
2. Before a large change, briefly outline the plan (files to create/modify), then implement.
3. After finishing tasks, update the checkboxes in **Section 11**.
4. If a decision isn't covered here, choose the simplest option consistent with this file and note it under a **Decisions Log** section below.

## Decisions Log
- **2026-09-27 — Next.js 15.5, not 13 or 16.** Next 13 was considered, but it no longer gets security fixes (npm audit on 13.5.11 reported 1 critical and 7 high issues; the fixes only exist in 15.5.x and later). 15.5 is the oldest line that still gets patches, and Server Actions are stable there. Consequences: route protection stays in `src/middleware.ts` (Next 16 renamed it to `proxy.ts`), and `cookies()` / `params` are async.
- **2026-09-27 — shadcn on Radix.** The current shadcn CLI defaults to Base UI. We init with `--base radix` (`components.json` → `"style": "radix-nova"`), so all components are built on Radix UI primitives. `cn()` comes from shadcn's `cn` package (replaces `clsx` + `tailwind-merge`).
- **2026-09-27 — Prisma 6.19, not 7.** Prisma 7 moves datasource URLs into `prisma.config.ts` and requires driver adapters. Prisma 6 runs the schema in §6 unchanged (`url` + `directUrl`).
- **2026-09-27 — `next build` uses webpack.** Turbopack is used for `next dev` only; Turbopack builds are still beta in 15.5.
- **2026-09-27 — `next-themes` for dark mode.** This is shadcn's documented dark-mode approach. It isn't a UI library.
- **2026-09-29 — RLS on every table, no policies.** Supabase serves `public` tables through its REST API using the public anon key. ReCode reads and writes only through Prisma (the table owner, which RLS doesn't restrict), so the init migration enables RLS with no policies, which closes that API. `_prisma_migrations` was set once with `prisma db execute`. **Every future migration that creates a table must add `ALTER TABLE "<Name>" ENABLE ROW LEVEL SECURITY;`.**
- **2026-09-29 — `getClaims()` for auth checks.** Middleware and `getCurrentUser()` use `supabase.auth.getClaims()`, which verifies the JWT signature, not `getSession()`, which trusts the cookie as-is.
- **2026-09-29 — After login, always go to `/dashboard`.** No `?next=` return path; this is simpler and avoids open-redirect checks. Revisit if deep links become important.
- **2026-09-29 — Light/dark toggle only.** The theme defaults to the system setting; the header button switches between light and dark. Both icons render and CSS hides one, avoiding hydration mismatches.
- **2026-09-29 — `font-sans` on `<body>`.** The shadcn-generated `globals.css` sets `--font-sans: var(--font-sans)` (self-referencing), and `next/font` defines `--font-sans` on `<body>`. Without `font-sans` on `<body>`, the page falls back to Times.
- **2026-09-29 — One `.env` file.** Next.js and the Prisma CLI both read `.env`, so all variables live there instead of being split with `.env.local`. It's git-ignored via `.env*`.
- **2026-10-08 — Seed settings stay in `package.json#prisma`.** Prisma 6 prints a deprecation warning and suggests `prisma.config.ts`, but in Prisma 6 that file stops the CLI from loading `.env` (so `DATABASE_URL`/`DIRECT_URL` would be missing). Keep `"prisma": { "seed": "tsx prisma/seed.ts" }` and ignore the warning until the move to Prisma 7.
- **2026-10-08 — `computeNextReviewAt` added in Milestone 2.** Adding a problem needs its first review date (start of tomorrow in the user's timezone), so this one `srs.ts` function was written early; its unit tests come with the rest of `srs.ts` in Milestone 3.
- **2026-10-08 — Empty `topicTags` means "not fetched yet".** The seed stores `[]` for every problem. `addProblem` fetches tags via the `questionData` GraphQL query the first time anyone adds a problem, saves them, and never blocks adding if LeetCode fails.
- **2026-10-08 — Problem lookup is a Server Action.** `lookupProblem` is a read, not a mutation, but making it a Server Action keeps the "Add problem" dialog a simple two-step form (look up → add) with no extra API route.
- **2026-10-09 — Filters live in the URL and run on the server; the measured lag is deferred.** Each filter change reloads `/problems` on the server, which runs ~3 queries one after another (user lookup, tag options, list). Measured from a dev Mac in India: ~35 ms network round trip to Supabase (ap-south-1), but ~200 ms per query through the transaction pooler (port 6543, ≈6 round trips) vs ~35 ms through the session pooler (port 5432), so ~0.7 s per filter change. Auth isn't a factor (ES256 keys, so `getClaims()` verifies locally). In production the overhead should mostly vanish if Vercel runs in `bom1` next to the DB. Deferred fixes: (1) for local dev only, point `DATABASE_URL` at the session pooler with `connection_limit=5` and no `pgbouncer` flag (production keeps 6543); (2) optionally filter in the browser so filter changes need no server round trip.
