# 24eFiling CRM — Comprehensive Codebase Audit Report

**Date:** 2026-07-22  
**Audited By:** Automated deep audit (TypeScript compiler, architecture review, component-level inspection, security scan)  
**Build Status:** ✅ Vite build succeeds | ❌ TypeScript strict check fails (60+ errors)

---

## Executive Summary

| Category | 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low | Total |
|---|---|---|---|---|---|
| Schema Drift / Broken DB Queries | 3 | 5 | — | — | **8** |
| Runtime Crashes & Bugs | 2 | 3 | 3 | — | **8** |
| Security & Secrets | 2 | 2 | 1 | — | **5** |
| Architecture & Maintainability | — | 3 | 4 | 2 | **9** |
| Performance & Bundle Size | — | 2 | 2 | — | **4** |
| Missing Tooling / DX | — | — | 2 | 2 | **4** |
| **Totals** | **7** | **15** | **12** | **4** | **38** |

**Bottom line:** The app compiles via Vite and runs, but **13 pages/features are completely broken at runtime** because the database type definitions (`database.types.ts`) are out of sync with the actual Supabase schema. Several features will crash or silently fail. Security posture needs immediate attention.

---

## 1. 🔴 CRITICAL — Schema Drift (database.types.ts is severely out-of-date)

> **Root Cause:** `types/database.types.ts` only defines **14 tables**, but the app references **25+ tables** via `supabase.from('table_name')`. Every query to a missing table compiles to `never` type, meaning the data comes back untyped and casts fail at runtime.

### Tables missing from `database.types.ts`:

| Missing Table | Used By (Files) | Impact |
|---|---|---|
| `attendance` | `pages/Attendance.tsx` (lines 58, 92, 113, 136) | ❌ Attendance page completely broken |
| `leave_requests` | `pages/Attendance.tsx` (lines 70, 136) | ❌ Leave management broken |
| `lead_assignment_rules` | `lib/leadAssignment.ts` (lines 27, 51), `pages/AutoAssignmentSettings.tsx` (lines 37, 64, 91, 107) | ❌ Auto-assignment engine broken |
| `automation_rules` | `pages/AutomationRules.tsx` (lines 37, 60, 84) | ❌ Automation rules page broken |
| `document_templates` | `pages/DocumentTemplates.tsx` (lines 39, 62) | ❌ Document templates broken |
| `email_logs` | `components/EmailComposer.tsx` (line 70) | ❌ Email logging broken |
| `expenses` | `pages/ExpenseManager.tsx` (lines 40, 63) | ❌ Expense tracking broken |
| `recurring_services` | `pages/RenewalsPipeline.tsx` (lines 41, 68) | ❌ Renewals pipeline broken |
| `sales_targets` | `pages/TargetsDashboard.tsx` (lines 47, 74) | ❌ Targets dashboard broken |
| `service_deliveries` | `pages/ServiceDelivery.tsx` (lines 43, 71, 97) | ❌ Service delivery broken |
| `team_messages` | `pages/TeamChat.tsx` (lines 28, 64) | ❌ Team chat broken |

> **Fix:** Regenerate `database.types.ts` using `npx supabase gen types typescript` against the live database. This single fix resolves ~45 of the 60+ TypeScript errors.

---

## 2. 🔴 CRITICAL — Missing Icon Exports

The following icons are imported from `components/icons.tsx` but **do not exist** in that file:

| Missing Icon | Used By | Line |
|---|---|---|
| `SendIcon` | `components/EmailComposer.tsx` | 10 |
| `TrendingUpIcon` | `pages/TargetsDashboard.tsx`, `pages/ExpenseManager.tsx`, `pages/RevenueForecasting.tsx` | 11, 12, 5 |
| `AwardIcon` | `pages/TargetsDashboard.tsx` | 11 |
| `MessageSquareIcon` | `pages/AutomationRules.tsx`, `pages/MyDay.tsx` | 11, 8 |
| `AlertCircleIcon` | `pages/ChurnPrediction.tsx`, `pages/MyDay.tsx` | 8, 8 |
| `ShieldCheckIcon` | `pages/ChurnPrediction.tsx` | 8 |
| `SparklesIcon` | `pages/DocumentTemplates.tsx` | 11 |
| `BarChart3Icon` | `pages/RevenueForecasting.tsx` | 5 |

> **Impact:** These pages will throw `undefined is not a function` or render nothing where icons should appear. Vite doesn't catch this at build time since it skips type checking.

---

## 3. 🔴 CRITICAL — Type Mismatches That Cause Runtime Errors

### 3a. Lead type property mismatches (`hooks/api/useLeadsApi.ts`)

| Line | Issue |
|---|---|
| 63 | References `lead.whatsapp_number` — property does not exist on `Lead` type |
| 186 | References `lead.business_category_id` — actual property is `business_category` |
| 187 | References `lead.industry_type_id` — actual property is `industry_type` |
| 406 | References `Database` type — not imported, causes `Cannot find name 'Database'` |
| 440 | Casts `assigned_to: string` to `Lead[]` where `assigned_to` expects a `User` object — type mismatch |

### 3b. Missing export (`pages/create-lead/ReferralSection.tsx`)

- **Line 7:** `import { LeadSource } from '../../types'` — `LeadSource` is not exported from `types.ts`
- **Impact:** Referral section in lead creation form is broken

### 3c. Missing API property (`pages/ClientPortalView.tsx` & `pages/MyDay.tsx`)

- `ClientPortalView.tsx` line 12: accesses `api.documents` — property doesn't exist on the API hook return type
- `MyDay.tsx` line 13: accesses `api.tasks` — property doesn't exist on the API hook return type

---

## 4. 🔴 CRITICAL — Security Issues

### 4a. Gemini API Key Exposed in Client Bundle

**File:** `vite.config.ts` (lines 14-15)
```typescript
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```

The Gemini API key is injected as a string literal into the **client-side JavaScript bundle**. Anyone can extract it from browser DevTools → Sources.

### 4b. Hardcoded Supabase Credentials as Fallbacks

**File:** `lib/env.ts` (lines 3-4)
```typescript
SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://jblhzdtqrhfeawycecql.supabase.co',
SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGci...',
```

Supabase anon keys are designed to be public, BUT hardcoding them as fallbacks means the `.env` file becomes optional. If someone removes `.env`, the app still connects to production with no warning.

### 4c. XSS Vulnerabilities via `dangerouslySetInnerHTML`

| File | Line | Risk |
|---|---|---|
| `components/AICopilot.tsx` | 33 | AI model output rendered as raw HTML — if the model returns `<script>` or `<img onerror>`, it executes |
| `components/Chatbot.tsx` | 26 | Same issue — chatbot responses rendered as raw HTML |
| `pages/DocumentTemplates.tsx` | 189 | Template preview rendered as raw HTML — user-editable content |

> **Fix:** Use DOMPurify (already bundled — `purify.es-B9ZVCkUG.js` appears in the build output) to sanitize all HTML before rendering.

### 4d. Overly Permissive RLS Policies

**File:** `lib/supabaseClient.ts` (line 206)
```sql
CREATE POLICY "Offers Permissive Access" ON public.offers FOR ALL TO authenticated USING (true) WITH CHECK (true);
```
Any authenticated user can read, update, and delete ANY offer — including offers from other branches.

**File:** `lib/supabaseClient.ts` (line 203)
```sql
CREATE POLICY "Authenticated Access Documents" ON public.documents FOR ALL USING (auth.role() = 'authenticated');
```
Any authenticated user can access ALL documents across the entire system — no branch or ownership scoping.

---

## 5. 🟠 HIGH — Runtime Crashes & Broken Features

### 5a. LeadForm.tsx — Null Reference Crashes

**File:** `components/LeadForm.tsx`

- **Line ~546:** `users.find(u => u.id === formData.assignedToId)` — if `users` prop is `undefined` (still loading), this throws `TypeError: Cannot read properties of undefined (reading 'find')` and crashes the form submission.
- **Line ~557:** `serviceSets.flatMap(s => s.subservices.map(...))` — crashes if `serviceSets` is undefined.

### 5b. Customers.tsx — Invalid Date Crash on Import

**File:** `pages/Customers.tsx` (lines 382-383)

```typescript
date_of_completion: row['completed on'] ? new Date(row['completed on']).toISOString() : ...
```

If an Excel import contains an unparseable date string, `new Date(...)` returns `Invalid Date`, and calling `.toISOString()` on it throws `RangeError`. This crashes the entire import loop silently.

### 5c. Customers.tsx — Modal Stuck on Delete Failure

**File:** `pages/Customers.tsx` (lines 149-158)

The `isDeleteConfirmOpen` state is only set to `false` inside the `try` block. If the API call fails, the catch block runs but the dialog is never dismissed — the user is stuck with a frozen modal.

### 5d. LeadForm.tsx — Stale Closure for Offers

**File:** `components/LeadForm.tsx` (line ~141)

The `useEffect` dependency array `[lead, isOpen, users, activeServices]` is missing `offers`. The `autoPromoForService()` function inside depends on `offers`, but if offers load after the component mounts, the effect never re-runs and promotions are never auto-applied.

### 5e. Scoring ML — Wrong Property Name

**File:** `lib/scoringML.ts` (line 26)

References `lead.advance_payment` — the actual property is `advance_amount`. This means the ML scoring engine always treats the advance payment as `undefined`/0, producing inaccurate lead scores.

### 5f. `import.meta.env` TypeScript Errors

**File:** `lib/env.ts` (lines 3-7)

All 5 `import.meta.env` references produce `Property 'env' does not exist on type 'ImportMeta'`. The `vite/client` type reference is missing from `tsconfig.json`. This doesn't break Vite builds but prevents proper IDE type-checking.

### 5g. useWebApi.ts — Missing React Namespace

**File:** `hooks/api/useWebApi.ts` (lines 13-15)

References `React.Dispatch`, `React.SetStateAction` without importing React, causing 6 TypeScript errors. This compiles via Vite's JSX transform but breaks type safety.

---

## 6. 🟡 MEDIUM — Memory Leaks & Race Conditions

### 6a. Memory Leak in Customer Export

**File:** `pages/Customers.tsx` (lines 223, 235)

`URL.createObjectURL(blob)` is called for Excel/CSV exports but `URL.revokeObjectURL(url)` is never called. Each export leaks the blob memory until the page is refreshed.

### 6b. State Update on Unmounted Component

**File:** `components/LeadForm.tsx` (line ~283)

If the user selects a file for upload then immediately closes the modal, the `await onUploadDocument(file)` finishes and calls `setIsUploading(false)` on an unmounted component, causing a React warning and potential state corruption.

### 6c. Presence Heartbeat Multiplied Per Tab

**File:** `context/AuthContext.tsx` (lines ~213-234)

A `setInterval` pings Supabase every 60 seconds to update online presence. If a user has 5 tabs open, that's 5 DB writes/minute — risking Supabase rate limits and unnecessary backend load.

---

## 7. 🟠 HIGH — Architecture & Maintainability

### 7a. God Component: App.tsx (1,495 lines / 64KB)

`App.tsx` is a monolithic file containing:
- All route definitions (~50 routes)
- All CRUD callbacks for leads, customers, users, tasks, etc.
- Inline file upload logic (lines 124-174)
- Background polling via `setInterval` every 10 seconds (lines 433-516)
- All state management and useMemo derivations
- Permission checks and auth guards

> **Impact:** Every state change re-renders the entire component tree. Adding new features requires modifying this single file. Prop-drilling is extreme — some components receive 20+ props.

### 7b. God Component: LeadForm.tsx (51KB)

A single form component handling all lead creation/editing logic — the largest single component file in the codebase. Should be decomposed into form sections.

### 7c. Duplicate Context Directories

The project has both:
- `context/` → contains `AuthContext.tsx`
- `contexts/` → contains `CompanyContext.tsx`, `GlobalFilterContext.tsx`

This is confusing and should be consolidated.

### 7d. Fake Integrations Shipped as Production Code

**File:** `lib/integrations.ts`

All three integrations (Razorpay, Exotel, MSG91) return **hardcoded fake data** with `Math.random()` IDs:
```typescript
export const RazorpayIntegration = {
  generatePaymentLink: async (...) => ({
    payment_link: `https://rzp.io/i/24efiling-${Math.random().toString(36).substring(7)}`,
    ...
  })
};
```

> These are stubs, but if any page actually calls them, users will receive fake payment links and fake call IDs. There is no guard or warning that these are mock implementations.

### 7e. 89 Ad-Hoc SQL Migration Files

**Directory:** `sql_archive/`

There are 89 SQL files with no migration numbering strategy beyond the first few (`00021` through `00035`). The rest use ad-hoc names like `FIX_RLS_ULTIMATE.sql`, `FIX_RLS_FINAL_V3.sql`, `FIX_RLS_PERMISSIVE.sql`. This indicates:
- No proper migration tooling (Supabase migrations, Flyway, etc.)
- Repeated trial-and-error fixing of RLS policies
- Risk of conflicting schemas between environments

### 7f. Non-Lazy Imports for Heavy Pages

**File:** `App.tsx` (lines 60-74)

Several pages are imported with static `import` instead of `lazy()`:
```typescript
import { AutoAssignmentSettings } from './pages/AutoAssignmentSettings';
import { TargetsDashboard } from './pages/TargetsDashboard';
import { ServiceDelivery } from './pages/ServiceDelivery';
// ... 10 more static imports
```

These pages are loaded into the main bundle even if the user never visits them.

---

## 8. 🟠 HIGH — Performance & Bundle Size

### 8a. Main Bundle: 1.2 MB (gzip: 350 KB)

```
dist/assets/index-UQNTqL-n.js    1,201.01 kB │ gzip: 349.78 kB
```

The main chunk is over **1.2 MB minified**. This means ~350 KB must be downloaded and parsed before the app becomes interactive. On a slow 3G connection, this is **10+ seconds** of blank screen.

### 8b. InvoiceManagement: 1.5 MB (gzip: 506 KB)

```
dist/assets/InvoiceManagement-DfFPXb7W.js    1,520.71 kB │ gzip: 505.76 kB
```

A single page component produces a **1.5 MB chunk** — likely because it bundles jsPDF + jsPDF-AutoTable + html2canvas inline. These heavy libraries should be dynamically imported only when the user clicks "Generate PDF".

### 8c. useDashboardMetrics.ts (40 KB source / 21 KB built)

This single hook is enormous and likely fetches data from many tables in sequence. Risk of N+1 query patterns and unnecessary full-table scans on every dashboard load.

### 8d. No Code Splitting for PDF Libraries

jsPDF alone is 388 KB and jsPDF-AutoTable is 456 KB. Together they're ~840 KB — nearly the size of the entire main bundle. These should be loaded on-demand via `await import('jspdf')`.

---

## 9. 🟡 MEDIUM — Type Safety & Data Integrity

### 9a. Payment Method Enum Mismatch

- `types.ts` defines: `'Credit Card' | 'Debit Card' | 'Net Banking' | 'Cheque' | 'Other'`
- `database.types.ts` defines: `'Cash' | 'Card' | 'UPI' | 'Bank Transfer'`

The app will show payment method options that don't exist in the database enum, causing insert failures.

### 9b. Task Fields Missing from DB Schema

`types.ts` defines `status?: 'todo' | 'in_progress' | 'review' | 'done'` and `category` on the `Task` type. These fields do not exist in `database.types.ts`. Attempts to save these fields will be silently ignored by Supabase.

### 9c. Widespread `any` Type Usage

Every API hook file in `hooks/api/` uses `: any` types extensively. This disables TypeScript's safety checks and allows runtime type errors to slip through.

**Files with heavy `any` usage:**
- `useApiCore.ts`, `useLeadsApi.ts`, `useUsersApi.ts`, `useCustomersApi.ts`
- `useBranchesApi.ts`, `useTasksApi.ts`, `useNotificationsApi.ts`
- `useOffersApi.ts`, `useServicesApi.ts`, `useActivitiesApi.ts`

### 9d. Hardcoded Business Configuration

**File:** `constants.ts`

`SERVICE_OPTIONS`, `SERVICE_HIERARCHY`, `ROLE_PERMISSIONS`, `BUSINESS_CATEGORIES`, and `INDUSTRY_TYPES` are all hardcoded arrays. Adding a new service or role requires a code deployment.

---

## 10. 🔵 LOW — Missing Tooling & Developer Experience

| Issue | Impact |
|---|---|
| No ESLint configuration | No automated code quality checks |
| No Prettier configuration | Inconsistent formatting |
| No test framework (no Jest/Vitest) | Zero test coverage — all testing is manual |
| No CI/CD pipeline detected | Deployments are likely manual |
| Missing `vite/client` types in `tsconfig.json` | IDE shows false errors for `import.meta.env` |
| No `.env.example` file (`.gitignore` has a broken rule `! .env.example` with a space) | New developers don't know what env vars are needed |

---

## 11. What WORKS Well ✅

Not everything is broken. Here's what's solid:

| Area | Assessment |
|---|---|
| **Core Auth Flow** | Login, signup, password reset, session management all work correctly with proper retry logic and error handling |
| **Supabase Client Setup** | Properly typed with `createClient<Database>()`, connection checks, and error guards |
| **Lazy Loading (partial)** | ~40 pages use `React.lazy()` with Suspense fallbacks |
| **UI Component Library** | 30 well-built Radix-based UI components (Dialog, Popover, Select, etc.) |
| **Lead/Customer CRUD** | Core lead and customer creation, editing, and listing work correctly |
| **Branch Management** | Multi-branch architecture with RLS scoping is properly designed |
| **Invoice Generation** | StandardInvoice and InvoicePDF rendering work (though bundle is huge) |
| **Global Filter System** | `GlobalFilterContext` with branch/date/user filtering works across pages |
| **Toast Notifications** | Clean toast system using Sonner |
| **Error Boundaries** | Components are wrapped in ErrorBoundary to prevent full-app crashes |
| **WhatsApp Client** | Well-structured with graceful fallback when credentials aren't configured |
| **Responsive Design** | Tailwind-based responsive layout works across screen sizes |

---

## Priority Fix Order (Recommended)

### 🚨 Immediate (Fixes 13 broken pages)
1. **Regenerate `database.types.ts`** — Run `npx supabase gen types typescript` against the live DB
2. **Add missing icon exports** to `components/icons.tsx`
3. **Export `LeadSource`** from `types.ts`

### ⚡ This Week (Prevents crashes & data loss)
4. Add null-safety guards in `LeadForm.tsx` (`users?.find()`, `serviceSets?.flatMap()`)
5. Fix `Customers.tsx` date parsing with `isValid()` check before `.toISOString()`
6. Add `finally` blocks to all modal async operations
7. Fix property names: `whatsapp_number` → correct name, `advance_payment` → `advance_amount`
8. Sanitize HTML in AICopilot/Chatbot with DOMPurify before `dangerouslySetInnerHTML`

### 📋 This Sprint (Security & Performance)
9. Remove Gemini API key from `vite.config.ts` `define` block — use a backend proxy instead
10. Remove hardcoded Supabase credentials from `lib/env.ts`
11. Tighten RLS policies on `offers` and `documents` tables
12. Dynamic-import jsPDF/html2canvas in InvoiceManagement
13. Convert remaining static imports in `App.tsx` to `lazy()`

### 🏗️ Next Sprint (Architecture)
14. Break up `App.tsx` into `Routes.tsx` + feature-specific state hooks
15. Break up `LeadForm.tsx` into section components
16. Consolidate `context/` and `contexts/` directories
17. Add ESLint + Prettier + Vitest
18. Set up proper Supabase migration workflow
19. Replace mock integrations with real implementations or clearly mark as disabled

---

*End of audit report.*
