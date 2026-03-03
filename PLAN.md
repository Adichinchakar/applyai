# ApplyAI — Implementation Plan
> See `../PROJECT_CONTEXT.md` for full context, file map, and handoff protocol.
> Last updated: 2026-03-03 (Session 3)

---

## Phases Overview

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation & Core Build | ✅ COMPLETE |
| 2 | Configuration & Real Data | ✅ COMPLETE (1 blocker — see below) |
| 3 | Discovery & Scoring Pipeline | 🔴 BLOCKED — Gemini quota = 0 |
| 4 | Apply Automation | 🔴 BLOCKED — needs API key + resume.pdf |
| 5 | UI Polish & Quality of Life | 🔵 Planned |
| 6 | Reliability & Alternative Sources | 🔵 Planned |

---

## 🔴 ACTIVE BLOCKERS (fix these before testing anything)

| # | Blocker | Fix | Time |
|---|---------|-----|------|
| 1 | **Gemini API quota = 0** | Regenerate key in a NEW AI Studio project at `aistudio.google.com` → paste into `.env.local` → restart server | 5 min |
| 2 | **`data/resume.pdf` missing** | Convert `resume.md` → PDF. Use browser print or Pandoc. Save as `applyai/data/resume.pdf` | 5 min |

### Fix #1 Step-by-Step:
1. Go to `aistudio.google.com`
2. Click project dropdown (top-left) → **New Project**
3. In new project → **Get API key** → **Create API key**
4. Copy the `AIza...` key
5. Open `applyai/.env.local` → replace `GEMINI_API_KEY=...` line
6. Restart dev server: `npm run dev`
7. Test: POST to `/api/jobs/score` with any job ID from dashboard

### Fix #2 Step-by-Step:
- Open Chrome → navigate to `C:\Users\Admin\Desktop\Hunt job project\applyai\data\resume.md`
- Press Ctrl+P → "Print" → Destination: "Save as PDF"
- Save as `C:\Users\Admin\Desktop\Hunt job project\applyai\data\resume.pdf`

---

## Phase 1 — Foundation & Core Build ✅ COMPLETE

All code scaffolded, TypeScript clean (0 errors), production build passes, UI renders.

**Done:**
- [x] Next.js 15, TypeScript, Tailwind CSS v4, App Router
- [x] SQLite with `node:sqlite` (Node 24 built-in — no native compilation)
- [x] All TypeScript types (`src/types/index.ts`)
- [x] All 9 API routes return 200
- [x] All pages render (dashboard, pipeline board, job detail, settings)
- [x] All UI components
- [x] Playwright browser + vision form filler (`src/lib/playwright/`)
- [x] ATS adapters: Greenhouse, Lever, Workday, LinkedIn (`src/lib/playwright/ats-adapters/`)

---

## Phase 2 — Configuration & Real Data ✅ COMPLETE (except resume.pdf)

### Task 2.1 — AI Provider ✅ DONE
- ~~Anthropic API~~ → **Migrated to Google Gemini** (`@google/generative-ai`)
- Model: `gemini-2.0-flash-lite` for all tasks
- Client in: `src/lib/claude.ts` (file kept as claude.ts for import stability)
- **Key is set** in `.env.local` — but quota = 0 on the current project (see blocker above)

### Task 2.2 — Add resume.pdf ❌ MISSING
- **File needed:** `applyai/data/resume.pdf`
- Used by Playwright's `setInputFiles()` in `fill-form.ts`
- Source: convert `data/resume.md` → PDF

### Task 2.3 — Personal info in preferences.json ✅ DONE (by Antigravity)
- All personal fields filled: fullName, email, phone, linkedinUrl, portfolioUrl, etc.
- LinkedIn URL fixed: `https://linkedin.com/in/adityachinchakar`

### Task 2.4 — Personal Info section in Settings UI ✅ DONE (by Antigravity)
- Settings page now shows Personal Info + API Key sections

### Task 2.5 — Install Playwright browsers ✅ DONE (by Antigravity)
- Chromium installed via `npx playwright install chromium`

### Task 2.6 — Update resume.md with real data ✅ DONE (Session 3)
- Sourced from `portfolio-adichinchakar.vercel.app`
- Real metrics: 70% assessment reduction, 92% task completion, 4.5hrs/week, 42% faster cycles
- Added Aulys project (live Figma plugin), Keywordio, Green Earth roles
- Contact info: adityachinchakar@gmail.com, linkedin.com/in/adityachinchakar, adityachinchakar.com

---

## Phase 3 — Discovery & Scoring Pipeline 🔴 BLOCKED

### Task 3.1 — Discovery source ✅ DONE (by Antigravity)
- LinkedIn RSS was broken (LinkedIn killed RSS)
- **Replaced with RemoteOK API** — 101 jobs already in DB
- Source: `src/lib/discovery/` — RemoteOK implementation

### Task 3.2 — Filter discovery by target roles 📋 PENDING
- RemoteOK currently returns all job types
- Add tag filters: `product-design`, `ux`, `ui-ux` to discovery query
- **File:** `src/lib/discovery/` — update API call tags

### Task 3.3 — Test scoring pipeline end-to-end 🔴 BLOCKED
**Requires:** Blocker #1 fixed (new API key with working quota)

Steps once API key works:
1. Open dashboard at `http://localhost:3002`
2. Click "Score" on any job card
3. Verify: fit score fills in, green/yellow/red flags show, seniority/recommendation appear
4. POST `/api/jobs/score` with `{ "jobId": "<id>" }` to test directly

### Task 3.4 — Test cover letter generation 🔴 BLOCKED
**Requires:** Blocker #1 fixed

Steps once API key works:
1. Open any scored job → click "Generate Cover Letter"
2. Verify text appears (it streams via SSE)
3. Verify letter references company + role + specific metrics from resume

### Task 3.5 — Test company research 🔴 BLOCKED
**Requires:** Blocker #1 fixed

Steps:
1. Click "Research Company" on a job
2. Verify research text fills in
3. Check `companySummary` field is saved to DB

---

## Phase 4 — Apply Automation 🔴 BLOCKED

### Task 4.1 — Test Playwright apply flow 🔴 BLOCKED
**Requires:** Both blockers fixed (API key + resume.pdf)

Steps once both are fixed:
1. Find a Greenhouse job: search `"site:boards.greenhouse.io product designer"`
2. Add it via discover or manually
3. Click "Apply Now" on job detail
4. Browser opens (headless: false) — watch form fill
5. **DO NOT SUBMIT** — verify fields only, then close

Common debug points:
- `resume.pdf` not found → check `data/resume.pdf` exists
- Form not detected → add `console.log` to see Gemini vision response
- Browser doesn't open → run `npx playwright install chromium`

### Task 4.2 — Test ATS adapters 🔴 BLOCKED
**Requires:** Blocker #1 fixed

Test with real URLs:
- Greenhouse: `boards.greenhouse.io/companyname/jobs/...`
- Lever: `jobs.lever.co/companyname/...`
- Workday: `companyname.myworkdayjobs.com/...`

---

## Phase 5 — UI Polish & Quality of Life 🔵 PLANNED

### Task 5.1 — Job search + filter UI
**File:** `src/app/jobs/page.tsx`
- Add search bar (filter by title/company)
- Add filter chips: by status, by score range, remote only
- No API change needed — filter on client side (101 jobs is small)

### Task 5.2 — Pagination
**File:** `src/app/jobs/page.tsx` + `src/app/api/jobs/route.ts`
- Add `?page=1&limit=20` pagination to jobs API
- Add "Load more" button or infinite scroll in UI

### Task 5.3 — Toast notification system
- Lightweight toasts for success/error (e.g., "Cover letter saved", "Scoring failed")
- Use `react-hot-toast` (zero setup, ~3KB)

### Task 5.4 — Cover letter preview mode
**File:** `src/components/job-detail/cover-letter-editor.tsx` (if exists)
- Toggle between edit (textarea) and preview (rendered markdown)

### Task 5.5 — Resume PDF generation in-app
- Add "Generate PDF" button in Settings
- Use `child_process.exec` to call Pandoc:
  ```bash
  pandoc data/resume.md -o data/resume.pdf
  ```

### Task 5.6 — Export jobs data
- Add "Export CSV" button to jobs page
- API: `GET /api/jobs?format=csv`

---

## Phase 6 — Reliability & Robustness 🔵 PLANNED

### Task 6.1 — Filter discovery by design roles
- Update RemoteOK tags to: `product-design`, `ux`, `ui-ux`, `design-systems`
- Add keyword filter post-fetch for titles containing "designer", "UX", "product design"

### Task 6.2 — Job deduplication
**File:** `src/lib/discovery/index.ts`
- Use `INSERT OR IGNORE` with job URL as unique key
- Prevents duplicate jobs on repeated discovery runs

### Task 6.3 — Graceful Playwright failure handling
- Wrap `src/app/api/apply/route.ts` in try/catch
- Send proper SSE error events on failure
- Reset job status to previous state if apply crashes

### Task 6.4 — Scheduled discovery
- Add a cron endpoint: `GET /api/jobs/discover?auto=true`
- Or use a simple interval scheduler
- Run discovery every 4-6 hours automatically

---

## Immediate Next Steps (Ordered)

```
BLOCKERS (do these first):
1. [ ] User: Regenerate Gemini API key in NEW AI Studio project → paste to .env.local
2. [ ] User: Convert resume.md → PDF → save as applyai/data/resume.pdf

TESTING (after blockers fixed):
3. [ ] Test: Score a job — POST /api/jobs/score → verify fit score appears on dashboard
4. [ ] Test: Generate cover letter → verify streaming text with job-specific content
5. [ ] Test: Research company → verify companySummary fills in
6. [ ] Test: Apply flow → browser opens → form fills (don't submit)

QUICK IMPROVEMENTS:
7. [ ] Dev: Filter RemoteOK discovery by design role tags (Task 6.1)
8. [ ] Dev: Add job search/filter UI (Task 5.1)
9. [ ] Dev: Add pagination to jobs list (Task 5.2)
```

---

## Testing Checklist

After blockers are fixed, verify the full pipeline:

```
[ ] Server starts: npm run dev → port 3002
[ ] Dashboard loads: 101+ jobs show, pipeline board visible
[ ] Discovery works: POST /api/jobs/discover → new jobs appear
[ ] Scoring works: click Score on job → fit score fills in (green/yellow/red)
[ ] Cover letter works: Generate → text streams in with job-specific content
[ ] Company research works: Research → summary fills in
[ ] Apply works: Apply → browser opens → form fills → looks correct
[ ] Settings save: edit preference → save → refresh → still saved
[ ] Pipeline board: drag job to new column → persists on refresh
```
