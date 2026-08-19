# 24eFilings CRM — Unified Security & Improvement Audit

**Date:** August 13, 2026
**Sources merged:** Initial audit · Full Improvement Audit · Antigravity AI Security & Code Audit
**Scope:** Full-stack audit — security, bugs, architecture, performance, UX, code quality, testing, infrastructure
**Baseline:** `tsc --noEmit` passes; `npm run lint` and `npm run test` both crash (missing `eslint`, `@eslint/js`, `typescript-eslint`, `vitest`, `jsdom` in devDependencies; zero test files exist). 307 tracked files, no CI/CD. Branch `main` @ `177f3cf`.

---

## Executive Summary

The CRM has **5 CRITICAL, 14 HIGH, 12 MEDIUM, 5 LOW** issues. The most dangerous findings are unauthenticated admin Edge Functions, RLS privilege escalation (self-service role change with no `WITH CHECK`), a public document bucket with all-authenticated read/delete, a hardcoded WhatsApp webhook verification token, and client-bundle exposure of WhatsApp/Gemini secrets. The architecture also suffers from a ~1,600-line monolithic `App.tsx` and an O(N²) dashboard metric computation that will collapse at scale.

**Important role-model correction:** The functional access-control model is **3 roles** — Super Admin (top), Admin (branch managers etc.), Sales Executive (all others). The `8`-value role enum in `types.ts` / `database.types.ts` contains vestigial labels (Receptionist, Team Leader, Service Executive, Branch Manager, Accounts Team) that are never selectable in the UI, and scattered code branches on `'Branch Manager'` as if it were a real role. Login correctly exposes 3 tabs; the real risk is that a ghost label ever stored in `profiles.role` gets no RLS coverage and is rejected at login.

---

## 1. Critical — Security

### [CRITICAL] Security — Edge functions are completely unauthenticated
**Location:** `supabase/functions/create-user/index.ts:14-32,47`, `delete-user/index.ts:10-21,40`, `create-super-admin/index.ts`
**Issue:** `create-user` accepts an arbitrary `role` from the body; `delete-user` accepts `userIds[]`; both execute with `service_role` and **zero JWT verification**. Anyone who opens DevTools can call `supabase.functions.invoke('create-user', { role: 'Super Admin' })` or delete every user in the org. CORS is `*` on all functions.
**Impact:** Full account takeover / data destruction by any unauthenticated caller who knows the function URL. Most critical vulnerability in the system.
**Fix:** Verify the `Authorization` header JWT via `supabaseAdmin.auth.getUser()`, then check `profiles.role === 'Super Admin'` inside the function; or move to `SECURITY DEFINER` RPCs. Return proper 401/403. Restrict CORS to the app origin.

### [CRITICAL] Security — RLS privilege escalation: `Manage Own Profile` has no `WITH CHECK`
**Location:** `lib/supabaseClient.ts:173`
**Issue:** `CREATE POLICY "Manage Own Profile" ... FOR ALL USING (auth.uid() = id)` has no `WITH CHECK` — any user can `UPDATE` their own `profiles` row to `role = 'Super Admin'`. The `on_profile_change` trigger syncs that into auth `user_metadata`, which every other policy reads via `get_my_claim('user_role')` — defeating the entire policy set.
**Impact:** Any employee self-promotes to Super Admin → full PII access, user deletion.
**Fix:** Add `WITH CHECK (auth.uid() = id)` and forbid `role`/`branch_id` changes in self-service policies; elevate roles only via a server-side RPC. Never trust client-supplied `role` metadata in `handle_new_user` (default to `'Sales Executive'` server-side).

### [CRITICAL] Security — Sign-up fallback can mint a Super Admin
**Location:** `contexts/AuthContext.tsx:332-358`, `supabase/config.toml:176,221` (`enable_signup = true`)
**Issue:** If the `create-super-admin` edge function fails, the code falls back to `supabase.auth.signUp` + direct `profiles.insert({ role: 'Super Admin' })`. With signups enabled (`enable_signup = true`, `enable_confirmations = false`), anyone can call the API directly with `data: { role: 'Super Admin' }` and bypass the UI's single-super-admin check.
**Impact:** Anonymous user becomes Super Admin.
**Fix:** Disable signups in config; delete the fallback; assign the default role in the trigger; promote roles only via authenticated server path.

### [CRITICAL] Security — Sensitive documents publicly readable; bucket is public
**Location:** `hooks/api/useDocumentsApi.ts:17`, `lib/supabaseClient.ts:203`, `sql_archive/SETUP_STORAGE.sql`
**Issue:** Uploads go to the public `documents` storage bucket and a permanent `getPublicUrl` is persisted. RLS is `FOR ALL TO authenticated` (`auth.role() = 'authenticated'`) — every logged-in user (incl. any Sales Exec) can read/delete all leads' PAN/Aadhaar scans. The lead-detail tab already does `createSignedUrl` correctly; the upload path doesn't. No MIME or size validation anywhere.
**Impact:** Full client-document exfiltration/deletion; public URLs leak documents without auth.
**Fix:** Private bucket; owner/lead-scoped storage policies; persist only the storage path and serve via signed URLs; enforce MIME/size server-side.

### [CRITICAL] Security — Notifications RLS fully permissive
**Location:** `FIX_NOTIFICATIONS_RLS_PERMISSIVE.sql:33-50`
**Issue:** The *most recent* notification RLS "fix" uses `SELECT/UPDATE/DELETE ... USING (true)` — any authenticated user can read, modify, or delete every other user's notifications.
**Impact:** Private business communications leaked and tampered with.
**Fix:** `USING (auth.uid() = user_id)` for SELECT/UPDATE/DELETE; keep INSERT permissive for cross-user notifications.

### [CRITICAL] Security — Hardcoded WhatsApp webhook token + no HMAC verification
**Location:** `supabase/functions/whatsapp-webhook/index.ts:7,31`
**Issue:** `VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'my_secure_whatsapp_token_123'` — predictable fallback. No `X-Hub-Signature-256` verification of Meta payloads. The full inbound payload (customer phone numbers + message text) is `console.log`ged.
**Impact:** Forged inbound messages → fake work orders, poisoned CRM; PII leaked into function logs.
**Fix:** Fail loudly if env var missing (no fallback); verify HMAC signature; stop logging payloads.

---

## 2. High — Security

### [HIGH] Security — CORS wildcard on all edge functions
**Location:** all 4 functions (`'Access-Control-Allow-Origin': '*'`)
**Impact:** Cross-origin invocation from any attacker-controlled site.
**Fix:** Restrict to the app's domain.

### [HIGH] Security — Client-bundle token exposure (WhatsApp + Gemini)
**Location:** `.env` (`VITE_WHATSAPP_ACCESS_TOKEN`, `VITE_GEMINI_API_KEY`), `lib/env.ts:5-7`
**Issue:** `VITE_`-prefixed values are inlined into the public JS bundle. `WHATSAPP_ACCESS_TOKEN` is also read via `import.meta.env`. Gemini is called directly from the browser (`AICopilot.tsx`/`Chatbot.tsx`).
**Impact:** Anyone can extract the WhatsApp token and send messages as the business; Gemini key burned for billing abuse.
**Fix:** Proxy AI/WhatsApp calls through edge functions; never ship provider secrets in `VITE_` vars; rotate if a bundle ever leaked.

### [HIGH] Security — Weak auth configuration
**Location:** `supabase/config.toml:182-185,226,271-276`
**Issue:** `minimum_password_length = 6`, empty `password_requirements`, `enable_confirmations = false`, session/inactivity timeout commented out (sessions persist indefinitely).
**Impact:** Trivial passwords (`123456`), fake accounts without email verification, abandoned sessions valid forever.
**Fix:** min length ≥ 8 with `lower_upper_letters_digits_symbols`; `enable_confirmations = true`; `[auth.sessions] timebox = "24h"` + `inactivity_timeout = "2h"`.

### [HIGH] Security — Documents and Offers RLS overly permissive
**Location:** `lib/supabaseClient.ts:203-206` (`documents FOR ALL ... auth.role()='authenticated'`; `offers FOR ALL TO authenticated USING (true) WITH CHECK (true)`)
**Impact:** Any logged-in user can read/modify/delete all documents and alter discounts/pricing.
**Fix:** Branch/role-scoped policies mirroring the lead/customer pattern.

### [HIGH] Security — `SECURITY DEFINER` functions without `SET search_path`
**Location:** `sql_archive/FIX_RLS_ULTIMATE.sql` (`get_current_user_role`), `sql_archive/SETUP_PAYMENT_SEQUENCE.sql`
**Impact:** Search-path hijacking → privilege escalation to the definer (potentially `postgres`).
**Fix:** Add `SET search_path = ''` and schema-qualify all references in every SECURITY DEFINER function.

### [HIGH] Security — All PII cached in `localStorage`
**Location:** `hooks/api/useApiCore.ts:315-320`
**Issue:** The entire DB (leads/customers with PAN/Aadhaar, profiles with salary/DOB) is serialized to a ~4.5 MB localStorage blob on every refetch. Persists indefinitely; shared with every same-origin XSS vector; stale after signout.
**Impact:** Offline PII exfiltration via any XSS or disk access.
**Fix:** Memory-only cache with short TTL; treat localStorage as untrusted input.

### [HIGH] Security — Fake/mock data leaking into production flows
**Location:** `hooks/api/useApiCore.ts:179-198` + `hooks/api/seeds.ts` (`defaultWebLeadsSeed`/`defaultBlogsSeed`/`defaultTestimonialsSeed`); `WhatsAppDashboard.tsx:26-90`; `pages/Support.tsx:21`
**Issue:** When the DB returns empty (exactly what happens for low-role users whose RLS blocks queries), the app falls back to seed data — staff see fabricated leads with real personal emails/phone numbers. WhatsApp dashboard merges fake conversations/messages/templates into live lists; Support shows a mock KB + fabricated "SLA Met Rate: 98.5%".
**Impact:** False data presented as real in production; trust/regulatory risk.
**Fix:** Remove seed fallbacks from production paths; gate mock data behind an explicit dev flag; treat RLS-blocked-empty as error.

### [HIGH] Security — Mock payment/WhatsApp gateways in production path
**Location:** `lib/integrations.ts` (`Math.random()` IDs for Razorpay/Exotel/MSG91), `hooks/api/useWhatsAppApi.ts:10` (inserts `status: 'sent'` without ever calling Meta), `lib/whatsappClient.ts` (`simulated: true`)
**Issue:** WhatsApp messages are marked "sent" in the DB but never delivered; payments/SMS fabricate success.
**Impact:** Customers never receive critical messages/payments; silent data loss.
**Fix:** Fail loudly when unconfigured; require an explicit env flag for mock mode; store real provider receipts/status.

### [HIGH] Security — Client-side role check only for admin actions
**Location:** `contexts/AuthContext.tsx:400` (`if (profile?.role !== 'Super Admin')`)
**Issue:** The check runs on the frontend; the `create-user` edge function does not re-verify.
**Impact:** Direct API calls bypass the check.
**Fix:** Server-side enforcement (see edge-function fix).

---

## 3. Medium — Security

### [MEDIUM] Security — No rate limiting / CAPTCHA at the app level
**Location:** `pages/Login.tsx`, `supabase/config.toml:207` (`sign_in_sign_ups = 30` per 5 min)
**Impact:** 30 attempts/5 min is still generous for brute-force.
**Fix:** Enable CAPTCHA (`turnstile`) + account lockout.

### [MEDIUM] Security — File upload: no MIME or size validation
**Location:** `App.tsx:130-157,160-180` (`uploadAvatar`/`uploadBranchLogo`)
**Issue:** File extension derived from user-controllable `blob.type`; no size limit; no server-side validation.
**Impact:** Executable/SVG-with-script upload; storage exhaustion.
**Fix:** Whitelist `image/jpeg|png|webp`, 2 MB max, enforced server-side too.

### [MEDIUM] Security — Error information leakage in login
**Location:** `contexts/AuthContext.tsx:266`
**Issue:** `Access denied. This account has the role "...", not "...".` — reveals the user's actual role to an attacker probing role tabs.
**Fix:** Generic message: "Invalid credentials or role mismatch."

### [MEDIUM] Security — Edge functions return HTTP 200 with error bodies
**Location:** `supabase/functions/create-user/index.ts` (all error branches `status: 200`)
**Issue:** Monitoring/retries treat failures as success; `error.message` internals leak.
**Fix:** Proper 400/401/403/500 statuses; generic messages.

### [MEDIUM] Security — Full RLS teardown SQL shipped in the client bundle
**Location:** `lib/supabaseClient.ts:20-230` (`SETUP_SQL_SCRIPT` with DROP TRIGGER / ALTER TABLE / CREATE POLICY), shown to logged-out users on `pages/Login.tsx:153-173`
**Issue:** DDL in the production bundle; accidental execution disables RLS; client copy is not the deployed source of truth → guaranteed drift.
**Fix:** Move to versioned `supabase/migrations/`; never render SQL in the UI; enforce `supabase db diff` in CI.

### [MEDIUM] Security — Live credentials in working tree / tracked scripts
**Location:** `.env` (gitignored, on disk) with real `SUPABASE_URL` + anon key; `scratch/*.js` scripts hardcode the URL + anon key and **are tracked**
**Issue:** `.env` is gitignored (OK) but present on disk; `scratch/*.js` is committed.
**Impact:** Project ID + anon key discoverable; combined with weak RLS = unauthorized access.
**Fix:** `git log --all --diff-filter=A -- .env` to confirm history; remove/scrub `scratch/*.js`; rotate anon key if exposure suspected.

### [LOW] Security — SSL enforcement not configured
**Location:** `supabase/config.toml:83-85` (commented out)
**Fix:** Enable for production.

---

## 4. High — Bugs & Correctness

### [HIGH] Bug — Four roles cannot log in (vestigial-role lockout)
**Location:** `pages/Login.tsx:12`, `contexts/AuthContext.tsx:264`
**Issue:** Login exposes 3 role tabs and `signIn` requires an exact role match. The functional model is 3 roles, so this is correct for real users — **but** any profile that ever holds a vestigial label (Branch Manager, Receptionist, Team Leader, Service Executive, Accounts Team) is rejected at login AND gets no RLS coverage (RLS checks `get_my_claim('user_role') = 'Admin'` exactly, while `App.tsx:342`, `components/Sidebar.tsx:398`, `hooks/api/useUsersApi.ts:23,148` treat `'Branch Manager'` as admin-tier).
**Impact:** Ghost-role users silently locked out of everything; inconsistent admin-tier behavior.
**Fix:** Narrow `UserRole` (types.ts:4-13) and the DB `user_role` enum to 3 values; sweep vestigial references (`App.tsx`, `Sidebar.tsx`, `useUsersApi.ts`, `BranchManagement.tsx`, `CustomTreeNodes.tsx`, `EmployeeFeedback`, `InvoiceManagement`, `Reminders`, `Announcements`) to use `'Admin'`/`'Sales Executive'`; backfill any legacy rows.

### [HIGH] Bug — Audit Logs / Transfer Logs hardcoded empty
**Location:** `App.tsx:1464-1465` (`transferLogs={[]}`, `auditLogs={[]}`, TODO) though `apiData` exposes both.
**Impact:** Settings Audit Logs tab always shows nothing.
**Fix:** Wire real data + filters/export.

### [HIGH] Bug — Business category / industry / lead source lookups permanently broken
**Location:** `hooks/api/useApiCore.ts` (fetches `business_categories`/`industry_types`/`lead_sources` but never calls the setters); `hooks/api/useLeadsApi.ts:118-123`
**Issue:** State stays `[]`, so `useLeadsApi` always falls back to hardcoded sentinel UUIDs `11111…/22222…/33333…`; every lead is stored with garbage FKs and displayed as `business_category: "Other"`.
**Impact:** Corrupted FK data across all leads; incorrect reporting.
**Fix:** Call the setters; remove sentinel UUIDs; backfill/migrate existing rows.

### [HIGH] Bug — Reference/payment numbers can duplicate
**Location:** `hooks/api/useLeadsApi.ts:107`, `pages/LeadDetail.tsx:314`, `hooks/api/useCustomersApi.ts` (fallback `seqVal = <collection>.length + 1`)
**Issue:** Client-derived sequence races under concurrency; wrong beyond the 500-record cap.
**Impact:** Duplicate `E-XXX-YYYY` numbers; broken invoice references.
**Fix:** DB sequence/RPC as single source of truth; surface failures instead of falling back.

### [HIGH] Bug — Silent data loss on retry (PAN/Aadhaar stripped)
**Location:** `hooks/api/useLeadsApi.ts:169-171, 283-285`
**Issue:** Schema-cache retry path strips `reference_number, pan_number, aadhar_number, created_by, assigned_by`.
**Impact:** PAN/Aadhaar silently never persist when the retry path runs.
**Fix:** Preserve the payload across retries; persist raw insert first.

### [HIGH] Bug — Lead deletion cascades to customers
**Location:** `lib/supabaseClient.ts:148-153` (`customers_lead_id_fkey ON DELETE CASCADE`)
**Issue:** A Sales Exec can delete an assigned lead and permanently destroy the customer record and financial history. No soft-delete, no warning.
**Impact:** Irreversible data loss.
**Fix:** Soft delete / trash + restore; block cascade or require admin confirmation.

### [HIGH] Bug — `useApiCore` refetches all tables on every write
**Location:** `hooks/api/useApiCore.ts:120-149, 346`; explicit `fetchData()` after mutations (`useLeadsApi.ts:477,488`, `useUsersApi.ts:137,223`)
**Issue:** 28 queries in parallel on mount; a `postgres_changes` subscription on **all public tables** re-fires the batch on any change (including own writes and the 60s presence heartbeat); every mutation adds another explicit full refetch.
**Impact:** One lead edit = 28+ table re-fetches; collapses under load.
**Fix:** Scoped realtime channels + filters, debounced targeted invalidation, or React Query.

### [HIGH] Bug — UTC date drift
**Location:** `pages/Calendar.tsx:22`, `components/LeadForm.tsx:49`, `components/CustomerForm.tsx:37`, `hooks/create-lead/useCreateLeadForm.ts:142`, `lib/offerScheduler.ts`, `lib/birthdayScheduler.ts` (`toISOString().split('T')[0]`, `YYYY-MM-DD` parsed as UTC)
**Issue:** Off-by-one-day for IST users; schedulers disagree on midnight semantics.
**Impact:** Wrong due dates/reminders for Indian users.
**Fix:** One local-timezone date utility (`en-CA`/`formatInTimeZone`); single implementation.

### [HIGH] Bug — Payment math incorrect
**Location:** `pages/LeadDetail.tsx:322-336`
**Issue:** New payments hardcode `tax/fee/total = 0` and `due = 0 - amount` → negative due amounts; `sales_amount` ignores service splits.
**Impact:** Wrong invoices and dashboard financials.
**Fix:** Compute from service breakdown; clamp `due >= 0`.

---

## 5. Medium — Bugs & Correctness

### [MEDIUM] Bug — Conditional hook call (Rules of Hooks violation)
**Location:** `App.tsx:399` (`profile ? useGlobalFilter() : { ... }`)
**Impact:** Hook-count change → React runtime error; masked only because profile loads from localStorage cache.
**Fix:** Always call hooks; early-return data.

### [MEDIUM] Bug — `setState` inside `useMemo`
**Location:** `hooks/usePagination.ts:28-32` (used by LeadTable, Customers, ActivityFeed)
**Impact:** React render-loop risk; non-deterministic page.
**Fix:** Effect/reducer pattern.

### [MEDIUM] Bug — Two parallel lead-creation implementations
**Location:** `components/LeadForm.tsx` (54 KB modal) vs `pages/create-lead/*` (`useCreateLeadForm.ts`, PricingCalculator, ServiceSetBuilder)
**Issue:** Both write via `addLead` but validation/pricing/ref-number logic has drifted.
**Impact:** Behavior divergence.
**Fix:** Single creation engine + shared validation.

### [MEDIUM] Bug — Lead assignment race condition
**Location:** `lib/leadAssignment.ts` (non-transactional `last_assigned_index`)
**Impact:** Concurrent lead creation can assign to the same exec.
**Fix:** Atomic `UPDATE ... RETURNING` / advisory lock inside one RPC.

### [MEDIUM] Bug — Non-transactional lead→customer conversion
**Location:** `hooks/api/useLeadsApi.ts:310-448`
**Issue:** Multi-step flow with client-side rollback of only `status`/`next_follow_up`; partial failures leave orphan customers and mismatched `paid_amount`/`due_amount`.
**Fix:** Single transaction RPC or compensating transactions.

### [MEDIUM] Bug — Broken `Dialog` maxWidth prop
**Location:** `components/ui/Dialog.tsx:122` (`` `max-w-[${maxWidth}]` `` → invalid `max-w-[max-w-xl]`)
**Impact:** Width prop silently no-ops.
**Fix:** Size map or raw value.

### [MEDIUM] Bug — Unbounded notification refs
**Location:** `App.tsx:472-473` (`notifiedTasksRef`/`notifiedFollowUpsRef` never pruned)
**Impact:** Memory growth over long sessions.
**Fix:** Cap/expire entries.

### [MEDIUM] Bug — Theme not persisted
**Location:** `index.html:2` (hardcoded `class="dark"`), `components/Header.tsx:57-72`
**Issue:** Toggle never reads `localStorage.theme` on boot; light-mode users reset to dark on refresh.
**Fix:** Persist + apply on boot (pre-render script to avoid flash).

### [MEDIUM] Bug — Localhost fallback in production delete flow
**Location:** `hooks/api/useUsersApi.ts:245` (`fetch('http://localhost:54321/functions/v1/delete-user')`)
**Impact:** Deletes silently fail in prod; confusing code path.
**Fix:** `supabase.functions.invoke` with configured URL; remove fallback.

### [MEDIUM] Bug — `useMemo` array mutation
**Location:** `components/WhatsAppDashboard.tsx:148`
**Fix:** Immutable updates.

### [MEDIUM] Bug — Client-side schedulers for birthdays/offers
**Location:** `lib/birthdayScheduler.ts`, `lib/offerScheduler.ts` (run in whichever admin logs in; gated by `localStorage`)
**Impact:** Missed/duplicate notifications; client-clock dependent.
**Fix:** Server-side cron/edge function; client only displays.

### [MEDIUM] Bug — `alert()`/`confirm()`/`prompt()` across 18 pages
**Location:** LeadDetail, ServiceManagement, BranchManagement, CityManagement, Announcements, WorkOrders, Customers, etc.
**Fix:** Centralize on shared `ConfirmationDialog`.

### [MEDIUM] Bug — Two competing toast systems + native dialogs
**Location:** `components/Toast.tsx` vs `sonner`; `OffersManagement.tsx:583` hand-rolled modal
**Fix:** Pick one system.

### [MEDIUM] Bug — Document path parsing from public URL
**Location:** `hooks/api/useDocumentsApi.ts`
**Issue:** Storage path reverse-engineered by string-parsing the public URL and stripping `/documents/`.
**Fix:** Persist `storage_path` in the row.

### [MEDIUM] Bug — No retry/backoff for external API calls
**Location:** `lib/whatsappClient.ts:35-53`
**Impact:** Transient failure permanently loses the message.
**Fix:** Retry + exponential backoff or a message queue.

### [MEDIUM] Bug — `update()` without `.select()` swallows RLS-blocked writes
**Location:** `hooks/api/useLeadsApi.ts:279` etc.
**Issue:** Update returns success then gets reverted by `fetchData()`.
**Fix:** Use `.select()` and check returned rows.

---

## 6. Architecture & Design

### [CRITICAL] Architecture — ~1,600-line monolithic root component
**Location:** `App.tsx` (68 KB: routing, state, role-scoped filtering, uploads, polling, notifications, 60+ handlers; `FilteredAppContent` has 100+ prop-drilled values)
**Impact:** Untestable, unmaintainable; every change risks unrelated regressions.
**Fix:** Extract `lib/storage.ts`, `hooks/useNotificationPolling.ts`, `hooks/useRoleScopedData.ts`; route-level providers; Context/Zustand over prop-drilling.

### [HIGH] Architecture — Business logic inside components
**Location:** `components/LeadForm.tsx` (1,000+ lines: discount calc, promo-code validation, fee aggregation, PDF generation)
**Impact:** Cannot be unit-tested or reused; pricing changes require UI edits.
**Fix:** Extract `lib/pricingEngine.ts` (pure functions).

### [HIGH] Architecture — DDL migrations hardcoded in frontend
**Location:** `lib/supabaseClient.ts:20-230` (`SETUP_SQL_SCRIPT`)
**Fix:** `supabase/migrations/` + `supabase db push`; remove from client.

### [MEDIUM] Architecture — No environment-based configuration
**Location:** `lib/env.ts`, `constants.ts` (hardcoded service lists, departments, document types)
**Fix:** `.env.staging`/`.env.production`; business constants → DB lookup tables.

### [MEDIUM] Architecture — No soft-delete model
**Fix:** Deleted flag + trash/restore for leads/customers/documents.

---

## 7. Performance & Scalability

### [CRITICAL] Performance — O(N²) dashboard metric computation
**Location:** `hooks/useDashboardMetrics.ts` (`.find()` inside loops over `filteredLeads`)
**Impact:** 2,000+ iterations per render at 1,000 leads; freezes at 5,000+.
**Fix:** Pre-build `Map` lookups; better: Supabase RPC aggregates.

### [HIGH] Performance — All data loaded upfront, no pagination
**Location:** `hooks/api/useApiCore.ts:120-149` (28 parallel queries; leads/customers `.limit(500)`); `max_rows = 1000` config cap
**Issue:** Initial load scales linearly; records past the cap **invisibly vanish** from every screen.
**Fix:** Cursor pagination / `useInfiniteQuery`; fetch only what's visible; RPC aggregates for dashboards.

### [HIGH] Performance — 10-second polling scans all leads/tasks client-side
**Location:** `App.tsx:475-558`
**Impact:** Constant CPU/battery burn on every user's machine.
**Fix:** Supabase Realtime, or 60s+ interval, or DB trigger → push notifications.

### [HIGH] Performance — Realtime subscription on all tables re-fires full batch
**Location:** `hooks/api/useApiCore.ts:346` (`postgres_changes` on `*`), compounded by own-write events + 60s presence heartbeat
**Impact:** Thundering herd; self-inflicted load under scale.
**Fix:** Scoped subscriptions with filters; exclude own writes.

### [MEDIUM] Performance — Re-render storm defeats memoization
**Location:** `App.tsx:339-441` (8 `useMemo` passes over all data), 60+ props, `any` types
**Fix:** Route-level providers, memoized selectors, context.

### [MEDIUM] Performance — GlobalSearch linear scan on every keystroke
**Location:** `components/GlobalSearch.tsx` (26 KB, manual string matching/scoring)
**Fix:** Debounced Supabase `to_tsvector` search or Fuse.js.

### [MEDIUM] Performance — Bundle size / eager heavy libraries
**Location:** `hooks/useDashboardMetrics.ts:4-6` (eager html2canvas/jspdf/xlsx); 1.5 MB `InvoiceManagement` chunk, 388 KB jsPDF, 455 KB autotable, 202 KB html2canvas, 304 KB `UserManagement`; images committed in both `public/` and `dist/`
**Fix:** Lazy-load PDF/Excel libs; code-split routes; dedupe assets.

### [MEDIUM] Performance — `localStorage` quota thrash
**Location:** `hooks/api/useApiCore.ts:315-320` (~4.5 MB rewrite per refetch)
**Fix:** Stop persisting PII (see Security section).

### [MEDIUM] Performance — No React Query / memoized server state
**Location:** `hooks/queries/*` scaffolding mounted but unused
**Fix:** Adopt per-domain React Query.

---

## 8. Code Quality & Maintainability

### [HIGH] Quality — Pervasive `any` (70+ files, 100+ sites)
**Location:** `App.tsx:230,354,357`, `hooks/api/useApiCore.ts:17,151`, `useLeadsApi.ts` (~30), `useUsersApi`, `AuthContext.tsx:225`; `useApiCore` returns `branches/auditLogs/businessCategories: any[]`
**Impact:** Type safety disabled where it matters most.
**Fix:** Type `authData`/`apiData`; strict-mode pass; remove `as any`.

### [HIGH] Quality — Console statements in 60+ files (incl. PII)
**Location:** `AuthContext.tsx:117,287,405` (emails), `whatsapp-webhook/index.ts:31` (full payloads)
**Fix:** Structured logger; strip `console.*` in prod builds.

### [MEDIUM] Quality — Duplicated Markdown renderer
**Location:** `components/AICopilot.tsx`, `components/Chatbot.tsx` (`dangerouslySetInnerHTML` + `sanitizeHtml`)
**Impact:** XSS surface if sanitize allow-list widens; divergence.
**Fix:** One shared, escape-first `components/ui/Markdown.tsx`.

### [MEDIUM] Quality — Export logic duplicated across pages
**Location:** `pages/Customers.tsx` (jsPDF/XLSX inline), Reports, Leads
**Fix:** `lib/exportService.ts`.

### [MEDIUM] Quality — Dead code & unused scaffolding
**Location:** `components/dashboards/*` (3 zero-byte files), `Chatbot.tsx`, `EmailComposer.tsx`, `PaymentReceipt.tsx`, `components/charts/*`, `PipelineFunnel`, `QuickActionsPanel`, `DashboardExportMenu`, `hooks/queries/*`, `useMockData.ts`, `lib/scoringML.ts`, 4 of 6 `lib/validations/*`
**Fix:** Prune or mark deprecated.

### [MEDIUM] Quality — Suspected unused deps + duplicate toast systems
**Location:** `html-react-parser`, `framer-motion`, `dagre`/`@types/dagre`, `@xyflow/react`; `components/Toast.tsx` vs `sonner`
**Fix:** Remove unused; consolidate.

### [MEDIUM] Quality — `sanitizeInput` mangles names
**Location:** `contexts/AuthContext.tsx:67-71` (strips spaces/non-ASCII → "Rahul Kumar" → "rahulkumar", "María José" → "marajos")
**Fix:** Separate `sanitizeEmail` / `sanitizeName` (preserve unicode/spaces).

### [MEDIUM] Quality — Error handling gaps
**Location:** `hooks/api/useActivitiesApi.ts` (silent `console.warn` → lost audit trail), empty catches, `update()` without `.select()`, edge functions leak `error.message`
**Fix:** Surface errors; `.select()` checks; generic server messages.

### [LOW] Quality — File naming inconsistency
**Location:** `components/ui/checkbox.tsx` vs PascalCase siblings
**Fix:** Standardize.

### [LOW] Quality — Dead update after user creation
**Location:** `contexts/AuthContext.tsx:438-448` (`.update({ branch_id })` on another user's row — always RLS-blocked, error swallowed)
**Fix:** Pass `branch_id` into the function payload instead.

### [LOW] Quality — DOMPurify imported but not in `package.json`
**Location:** `lib/sanitize.ts:1`
**Fix:** `npm install dompurify @types/dompurify` (or verify it resolves).

---

## 9. UX / UI

1. **No loading/error/empty states** — pages render blank/`undefined` while loading (`Attendance.tsx:43`, `ExpenseManager.tsx:29`, `TargetsDashboard`); empty lists lack CTAs.
2. **No 404 route** — no `<Route path="*">`; unknown URLs render nothing in the shell.
3. **Hardcoded dark-only page roots** — 16 pages use `bg-slate-950 text-white` (Support, WorkOrders, WhatsAppDashboard, Announcements, Reports, RevenueDashboard, WebLeadsManagement…), broken in light mode; bypasses the `bg-card` token system.
4. **Accessibility** — icon-only buttons lack `aria-label`; `onClick` divs not keyboard-accessible; Dialog lacks `aria-describedby`; color-only status; non-semantic scroll tables.
5. **Responsiveness** — horizontal page scroll; fixed `h-72`/`h-64` cards clip; stat grids don't reflow on mobile; header search hidden on small screens.
6. **Inconsistent flows** — two toast systems; hand-rolled modals; native `alert()` interleaved with toasts; "My Day" Log Call/Call Now only fire a toast.
7. **Login surfaces raw SQL** (`Login.tsx:153-173`, SETUP_REQUIRED path).
8. **Small Tailwind/UI bugs** — invalid `text-indigo-650` (`BlogsManagement.tsx:500`); `WebLeadsManagement` hover inverts on dark rows; `BranchManagement` shows SQL filenames to users.
9. **No confirmation on destructive bulk actions** (bulk lead delete, user delete, transfers).
10. **Navigation gaps** — `/policies` exists with no sidebar link; `/invoices` mislabeled; "My Day" duplicated; duplicate routes (`/services`, `/services-catalog`, `/web/services`).

---

## 10. Features (low-effort / high-value)

1. Confirm the **3-role model** end-to-end (clean enum, login, RLS, permission matrix) — closes the vestigial-role lockout.
2. **Soft delete / trash + restore** for leads/customers instead of hard cascading deletes.
3. **Global data refresh / pull-to-refresh** and a visible "last synced" timestamp.
4. **Bulk row actions** (assign, export, document verify) beyond LeadsOverview.
5. **Server-side pagination/search** beyond the 500-record cap.
6. **Unsaved-changes guard** + **draft autosave** on the create-lead flow.
7. **Keyboard shortcuts** beyond ⌘K / "N".
8. **Export parity** across all list pages (Reminders, FollowUps, WorkOrders).
9. **Empty-state guidance** on every list.
10. **Notification preferences** (toggles exist; the polling/heartbeat system in `App.tsx:475-558` runs unconditionally).
11. **Audit-log viewer wired to real data** with filters + export.
12. **Undo** for destructive actions (delete lead/user).
13. **404 + error-boundary recovery UI** (ErrorBoundary exists but no fallback guidance).

---

## 11. Testing, Dependencies & Infrastructure

### [HIGH] Testing — Zero test files
**Location:** repo-wide (no `*.test.*`/`*.spec.*`); `vitest.config.ts` + `TESTING_GUIDE.md` exist but nothing runs
**Impact:** Zero automated coverage; every deployment is a gamble.
**Priority targets:** edge-function auth, extracted pricing engine, role-scoped filtering, `sanitize.ts`, lead assignment, customer-sequence RPC, XSS payloads.
**Fix:** Add vitest/jsdom devDeps; write the suite.

### [HIGH] Infra — Broken quality gates + no CI/CD
**Location:** `package.json` (missing `eslint`, `@eslint/js`, `typescript-eslint`, `vitest`, `jsdom`); no GitHub Actions; `vercel.json` only does SPA rewrites
**Fix:** Add devDeps; wire `lint`/`test`; add CI (typecheck + lint + test + `supabase db diff --linked` + build).

### [HIGH] Infra — Schema managed by hand-applied SQL
**Location:** `sql_archive/` (60+ one-off scripts, conflicting versions: `FIX_RLS_FINAL_V3`, `FIX_RLS_ULTIMATE`, `FIX_RLS_COMPREHENSIVE`); the real source of truth is a string inside the client bundle — not the deployed DB
**Impact:** Fresh environment can't be reproduced; drift guaranteed.
**Fix:** Migrate to sequential `supabase/migrations/`; forbid `DISABLE ROW LEVEL SECURITY` outside migrations; diff in CI.

### [MEDIUM] Dependencies — `xlsx@0.18.5` supply-chain risk
**Location:** `package.json` (pinned `^0.18.5`)
**Issue:** Known CVEs (prototype pollution CVE-2023-30533, ReDoS CVE-2024-22363/22362); free version unmaintained.
**Fix:** `exceljs` or SheetJS paid; pin exact.

### [LOW] Dependencies — `@supabase/supabase-js` pinned at 2.44.4
**Location:** `package.json`
**Fix:** Update to latest 2.x; test.

### [LOW] Infra — Edge-function SDK drift
**Location:** Deno std 0.177 + supabase-js 2.x vs 0.168/2.39 across functions; `declare const Deno: any`
**Fix:** Pin one version; add Deno types.

### [LOW] Infra — Stale/contradictory committed docs
**Location:** `reaudit_report.md` (claims "0 exposed secrets ✅ PASSED" — contradicted by this audit), `report.md`, `VERIFICATION_REPORT*.md`, `.agents/`, `CRM_UPGRADE_MASTERPLAN.md`, `implementation_plan.md`
**Fix:** Prune or gitignore; keep one living SECURITY.md.

### [LOW] Infra — `dist/` build artifacts in working tree
**Fix:** Add to `.gitignore` (or remove).

### [LOW] Infra — README aspirational (7-role hierarchy, invoicing, onboarding) vs shipped state
**Location:** `README.md:97-115` (lists Branch Manager / Service Executive / Accounts Team roles)
**Fix:** Align README with the 3-role model and shipped features.

---

## Priority Matrix

| Priority | Count | Key Actions |
|----------|-------|-------------|
| 🔴 CRITICAL | 5 | Auth on edge functions · `WITH CHECK` on self-profile policy + signup hardening · Notifications RLS scoping · docs bucket private + signed URLs · webhook token/HMAC |
| 🟠 HIGH | 14 | CORS restrict · remove VITE secrets · auth config (password/confirmations/sessions) · documents/offers RLS · localStorage PII · kill mock/seed data · 3-role cleanup · audit logs · sentinel UUIDs · cascade delete · payment math · fetch-all pattern · date drift |
| 🟡 MEDIUM | 12 | CAPTCHA · file-upload validation · generic login errors · HTTP status codes · DDL out of bundle · pagination/perf · dead code · `any` cleanup · test suite |
| 🟢 LOW | 5 | SSL · naming · DOMPurify dep · xlsx · docs pruning |

---

## Quick Wins (< 1 day each)

1. **Fix Notifications RLS** — `USING (true)` → `USING (auth.uid() = user_id)` (5 min)
2. **Remove hardcoded webhook token** — delete fallback string; fail loudly (2 min)
3. **Add auth to Edge Functions** — JWT + role verification header (30 min each)
4. **Restrict CORS origins** — replace `*` with the app domain (5 min)
5. **Set password requirements** — `config.toml` (2 min)
6. **Add DOMPurify to dependencies** — `npm install dompurify` (1 min)
7. **Fix role disclosure in login error** — generic message (2 min)
8. **Remove `.env`/`scratch` secrets from working tree**; check git history (10 min)

---

## Long-Term Improvements

1. **Decompose `App.tsx`** into feature-level route modules with co-located state.
2. **Server-side pagination** — replace "fetch all" with cursor pagination on Supabase.
3. **Move WhatsApp/AI clients to Edge Functions** — remove provider tokens from the client bundle.
4. **Add a comprehensive test suite** — start with Edge Functions and business logic.
5. **Implement structured logging** — replace `console.*`.
6. **Database-computed aggregates** — move dashboard metrics to Supabase RPCs.
7. **Standardize on the 3-role model** — clean enum, RLS, UI, docs.

---

## Suggested Implementation Order

1. **Security-critical:** edge-function auth → RLS `WITH CHECK`/policy scoping → webhook HMAC → docs bucket → remove VITE secrets.
2. **Correctness:** 3-role cleanup, wire audit/transfer logs, fix category/source mapping + sentinel UUIDs, payment math, soft delete.
3. **Scalability:** replace the 28-query fetch-on-every-change pattern with React Query + scoped subscriptions; server-side pagination; move the 10s poll to a server job.
4. **Hygiene:** restore lint/test tooling, add CI, migrate SQL to `supabase/migrations/`, prune dead code/docs.
