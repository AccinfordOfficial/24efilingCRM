# 24eFiling CRM — Implementation Plan (Post-Audit)

> **Created:** July 22, 2026  
> **Based on:** [report.md](./report.md) — Comprehensive Codebase Audit  
> **Approach:** Fix what's broken first → Harden security → Improve architecture → Add tooling  
> **Estimated Total Duration:** ~4 phases across 6–8 weeks

---

## Phase 1 — Emergency Fixes (13 Broken Pages + Runtime Crashes)
**Duration:** 1–2 days  
**Goal:** Make every page in the app functional. Currently 13 pages crash or return no data.

---

### 1.1 Regenerate Database Types (Fixes ~45 TypeScript errors)
**Time:** 30 minutes  
**Priority:** 🔴 CRITICAL  
**Root Cause:** `types/database.types.ts` only defines 14 tables but the app uses 25+.

#### Tasks:
- [ ] Run Supabase type generation against the live database:
  ```bash
  npx supabase gen types typescript --project-id jblhzdtqrhfeawycecql > types/database.types.ts
  ```
- [ ] If the CLI approach fails (no local Supabase link), manually add the missing table definitions to `types/database.types.ts` for these tables:
  - `attendance`
  - `leave_requests`
  - `lead_assignment_rules`
  - `automation_rules`
  - `document_templates`
  - `email_logs`
  - `expenses`
  - `recurring_services`
  - `sales_targets`
  - `service_deliveries`
  - `team_messages`
- [ ] After regeneration, run `npx tsc --noEmit` to verify the table-related errors are resolved

#### Files Changed:
- [MODIFY] [database.types.ts](file:///d:/24efilings%20CRM/types/database.types.ts)

#### Verification:
```bash
npx tsc --noEmit 2>&1 | grep "is not assignable to parameter of type" | wc -l
# Should drop from ~40 to 0
```

#### Pages Unblocked:
| Page | File |
|---|---|
| Attendance | `pages/Attendance.tsx` |
| Auto-Assignment Settings | `pages/AutoAssignmentSettings.tsx` |
| Automation Rules | `pages/AutomationRules.tsx` |
| Document Templates | `pages/DocumentTemplates.tsx` |
| Expense Manager | `pages/ExpenseManager.tsx` |
| Renewals Pipeline | `pages/RenewalsPipeline.tsx` |
| Service Delivery | `pages/ServiceDelivery.tsx` |
| Targets Dashboard | `pages/TargetsDashboard.tsx` |
| Team Chat | `pages/TeamChat.tsx` |
| Email Composer | `components/EmailComposer.tsx` |
| Lead Assignment Engine | `lib/leadAssignment.ts` |

---

### 1.2 Add Missing Icon Exports
**Time:** 15 minutes  
**Priority:** 🔴 CRITICAL

#### Tasks:
- [ ] Add the following icon exports to `components/icons.tsx` (re-export from lucide-react):
  ```typescript
  export { 
    Send as SendIcon,
    TrendingUp as TrendingUpIcon,
    Award as AwardIcon,
    MessageSquare as MessageSquareIcon,
    AlertCircle as AlertCircleIcon,
    ShieldCheck as ShieldCheckIcon,
    Sparkles as SparklesIcon,
    BarChart3 as BarChart3Icon
  } from 'lucide-react';
  ```

#### Files Changed:
- [MODIFY] [icons.tsx](file:///d:/24efilings%20CRM/components/icons.tsx)

#### Verification:
```bash
npx tsc --noEmit 2>&1 | grep "has no exported member"
# Should return 0 results
```

---

### 1.3 Fix Missing Type Exports & Property Mismatches
**Time:** 1 hour  
**Priority:** 🔴 CRITICAL

#### Tasks:

**1.3a — Export `LeadSource` from types.ts:**
- [ ] Add `LeadSource` type/interface export in `types.ts` (or export the existing one if it's defined but not exported)
- [ ] Verify `pages/create-lead/ReferralSection.tsx` compiles

**1.3b — Fix property name mismatches in useLeadsApi.ts:**
- [ ] Line 63: `lead.whatsapp_number` → identify and use the correct property name from the Lead type
- [ ] Line 186: `lead.business_category_id` → `lead.business_category`
- [ ] Line 187: `lead.industry_type_id` → `lead.industry_type`
- [ ] Line 406: Add missing `import { Database } from '../../types/database.types'`
- [ ] Line 440: Fix the `assigned_to: string` → `Lead[]` cast (use proper join query or type assertion)

**1.3c — Fix scoringML.ts property name:**
- [ ] Line 26: `lead.advance_payment` → `lead.advance_amount`

**1.3d — Fix missing API properties:**
- [ ] `pages/ClientPortalView.tsx` line 12: `api.documents` — either add this property to the API hook or replace with a direct Supabase query
- [ ] `pages/MyDay.tsx` line 13: `api.tasks` — same fix

**1.3e — Fix useWebApi.ts missing React namespace:**
- [ ] Add `import React from 'react';` at the top of `hooks/api/useWebApi.ts`

**1.3f — Fix import.meta.env types:**
- [ ] Add `/// <reference types="vite/client" />` to a new file `vite-env.d.ts` in the project root, or add `"vite/client"` to `tsconfig.json` types array

#### Files Changed:
- [MODIFY] [types.ts](file:///d:/24efilings%20CRM/types.ts)
- [MODIFY] [useLeadsApi.ts](file:///d:/24efilings%20CRM/hooks/api/useLeadsApi.ts)
- [MODIFY] [scoringML.ts](file:///d:/24efilings%20CRM/lib/scoringML.ts)
- [MODIFY] [ClientPortalView.tsx](file:///d:/24efilings%20CRM/pages/ClientPortalView.tsx)
- [MODIFY] [MyDay.tsx](file:///d:/24efilings%20CRM/pages/MyDay.tsx)
- [MODIFY] [useWebApi.ts](file:///d:/24efilings%20CRM/hooks/api/useWebApi.ts)
- [NEW] [vite-env.d.ts](file:///d:/24efilings%20CRM/vite-env.d.ts)

#### Verification:
```bash
npx tsc --noEmit
# Target: 0 errors
```

---

### 1.4 Fix Runtime Crashes (Null Guards & Error Handling)
**Time:** 2 hours  
**Priority:** 🟠 HIGH

#### Tasks:

**1.4a — LeadForm.tsx null safety:**
- [ ] Line ~546: `const assignedToUser = users?.find(u => u.id === formData.assignedToId);` (add `?.`)
- [ ] Line ~557: `const requestedServices = serviceSets?.flatMap(s => s.subservices?.map(sub => sub.name)) ?? [];` (add `?.` and `?? []`)
- [ ] Add early return or loading state check at the top of the submit handler if `users` or `serviceSets` are not yet loaded

**1.4b — Customers.tsx date parsing crash:**
- [ ] Lines 382-383: Wrap date parsing with validation:
  ```typescript
  const parsedDate = row['completed on'] ? new Date(row['completed on']) : null;
  const date_of_completion = parsedDate && !isNaN(parsedDate.getTime()) 
    ? parsedDate.toISOString() 
    : null;
  ```

**1.4c — Customers.tsx stuck modal:**
- [ ] Lines 149-158: Move `setIsDeleteConfirmOpen(false)` into a `finally` block:
  ```typescript
  try {
    await deleteCustomers(selectedCustomerIds);
    setSelectedCustomerIds([]);
  } catch (error: any) {
    alert(`Failed to delete: ${error.message}`);
  } finally {
    setIsDeleteConfirmOpen(false); // Always close the modal
  }
  ```
- [ ] Apply the same `finally` pattern to ALL other async modal operations across the codebase

**1.4d — LeadForm.tsx stale closure:**
- [ ] Line ~141: Add `offers` to the `useEffect` dependency array:
  ```typescript
  useEffect(() => { ... }, [lead, isOpen, users, activeServices, offers]);
  ```

#### Files Changed:
- [MODIFY] [LeadForm.tsx](file:///d:/24efilings%20CRM/components/LeadForm.tsx)
- [MODIFY] [Customers.tsx](file:///d:/24efilings%20CRM/pages/Customers.tsx)

#### Verification:
- Manually test: Open LeadForm before users load → should NOT crash
- Manually test: Import an Excel with invalid dates → should skip bad rows, not crash
- Manually test: Trigger a delete failure → modal should close

---

### 1.5 Fix Memory Leaks
**Time:** 30 minutes  
**Priority:** 🟡 MEDIUM

#### Tasks:

**1.5a — Blob URL leak in Customers.tsx:**
- [ ] Lines 223, 235: Add cleanup after download:
  ```typescript
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url); // ← Add this line
  ```

**1.5b — State update on unmounted component in LeadForm.tsx:**
- [ ] Line ~283: Add an abort controller or mounted ref:
  ```typescript
  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);
  // Then in the handler:
  try { await onUploadDocument(file); }
  finally { if (isMounted.current) setIsUploading(false); }
  ```

#### Files Changed:
- [MODIFY] [Customers.tsx](file:///d:/24efilings%20CRM/pages/Customers.tsx)
- [MODIFY] [LeadForm.tsx](file:///d:/24efilings%20CRM/components/LeadForm.tsx)

---

## Phase 1 — Verification Checkpoint

```bash
# 1. TypeScript should compile clean
npx tsc --noEmit
# Expected: 0 errors

# 2. Vite build should succeed without warnings about missing exports
npx vite build 2>&1 | grep -i "error"
# Expected: 0 errors

# 3. Manual smoke test: Visit each of the 13 previously broken pages
#    - Attendance, AutoAssignment, AutomationRules, DocumentTemplates
#    - ExpenseManager, RenewalsPipeline, ServiceDelivery, TargetsDashboard
#    - TeamChat, EmailComposer, MyDay, ClientPortalView, ChurnPrediction
```

---

## Phase 2 — Security Hardening
**Duration:** 1–2 days  
**Goal:** Eliminate all identified security vulnerabilities.

---

### 2.1 Remove API Key from Client Bundle
**Time:** 1 hour  
**Priority:** 🔴 CRITICAL

#### Tasks:
- [ ] Remove the `define` block from `vite.config.ts`:
  ```diff
  -      define: {
  -        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  -        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
  -      },
  ```
- [ ] Rename the env variable to use `VITE_` prefix if it must be client-side:
  - In `.env`: `VITE_GEMINI_API_KEY=your-key`
  - In `lib/env.ts`: `GOOGLE_GENAI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || ''`
- [ ] **Better approach:** Create a Supabase Edge Function as a proxy for Gemini API calls, keeping the key server-side only
- [ ] Update `components/AICopilot.tsx` and `components/Chatbot.tsx` to use the edge function instead of direct API calls

#### Files Changed:
- [MODIFY] [vite.config.ts](file:///d:/24efilings%20CRM/vite.config.ts)
- [MODIFY] [.env](file:///d:/24efilings%20CRM/.env)
- [MODIFY] [env.ts](file:///d:/24efilings%20CRM/lib/env.ts)
- [NEW] [supabase/functions/gemini-proxy/index.ts](file:///d:/24efilings%20CRM/supabase/functions/gemini-proxy/index.ts) (optional, recommended)

---

### 2.2 Remove Hardcoded Credentials from Source
**Time:** 30 minutes  
**Priority:** 🟠 HIGH

#### Tasks:
- [ ] In `lib/env.ts`, remove the hardcoded Supabase URL and anon key fallbacks:
  ```diff
  -  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://jblhzdtqrhfeawycecql.supabase.co',
  -  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGci...',
  +  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  +  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  ```
- [ ] Add a startup check in `lib/supabaseClient.ts` that throws a clear error if the env vars are missing
- [ ] Create `.env.example` with placeholder values:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here
  VITE_GEMINI_API_KEY=your-gemini-key-here
  WHATSAPP_ACCESS_TOKEN=
  WHATSAPP_PHONE_NUMBER_ID=
  ```
- [ ] Fix `.gitignore` line 29: `! .env.example` → `!.env.example` (remove the space)

#### Files Changed:
- [MODIFY] [env.ts](file:///d:/24efilings%20CRM/lib/env.ts)
- [MODIFY] [supabaseClient.ts](file:///d:/24efilings%20CRM/lib/supabaseClient.ts)
- [NEW] [.env.example](file:///d:/24efilings%20CRM/.env.example)
- [MODIFY] [.gitignore](file:///d:/24efilings%20CRM/.gitignore)

---

### 2.3 Sanitize HTML Rendering (Fix XSS)
**Time:** 1 hour  
**Priority:** 🟠 HIGH

#### Tasks:
- [ ] Install DOMPurify (or use the already-bundled version):
  ```bash
  npm install dompurify @types/dompurify
  ```
- [ ] Create a shared sanitize utility `lib/sanitize.ts`:
  ```typescript
  import DOMPurify from 'dompurify';
  export const sanitizeHtml = (dirty: string): string => DOMPurify.sanitize(dirty);
  ```
- [ ] Update all 3 `dangerouslySetInnerHTML` usages:
  - `components/AICopilot.tsx` line 33: wrap `formattedContent` with `sanitizeHtml()`
  - `components/Chatbot.tsx` line 26: wrap `formattedContent` with `sanitizeHtml()`
  - `pages/DocumentTemplates.tsx` line 189: wrap `renderPreviewHtml(...)` with `sanitizeHtml()`

#### Files Changed:
- [NEW] [sanitize.ts](file:///d:/24efilings%20CRM/lib/sanitize.ts)
- [MODIFY] [AICopilot.tsx](file:///d:/24efilings%20CRM/components/AICopilot.tsx)
- [MODIFY] [Chatbot.tsx](file:///d:/24efilings%20CRM/components/Chatbot.tsx)
- [MODIFY] [DocumentTemplates.tsx](file:///d:/24efilings%20CRM/pages/DocumentTemplates.tsx)

---

### 2.4 Tighten RLS Policies
**Time:** 1 hour  
**Priority:** 🟠 HIGH

#### Tasks:
- [ ] Replace the overly permissive offers policy:
  ```sql
  -- BEFORE (anyone can do anything):
  -- CREATE POLICY "Offers Permissive Access" ON public.offers FOR ALL TO authenticated USING (true) WITH CHECK (true);
  
  -- AFTER (branch-scoped):
  DROP POLICY IF EXISTS "Offers Permissive Access" ON public.offers;
  
  CREATE POLICY "Super Admin Full Access Offers" ON public.offers FOR ALL USING (
    COALESCE(get_my_claim('user_role'), '')::text = 'Super Admin'
  );
  CREATE POLICY "Admin Branch Access Offers" ON public.offers FOR ALL USING (
    COALESCE(get_my_claim('user_role'), '')::text = 'Admin' AND
    branch_id = get_my_claim('user_branch_id')
  );
  CREATE POLICY "Authenticated Read Offers" ON public.offers FOR SELECT TO authenticated USING (true);
  ```
- [ ] Replace the overly permissive documents policy with branch/ownership scoping
- [ ] Save the migration as `sql_archive/FIX_RLS_OFFERS_DOCUMENTS.sql`

#### Files Changed:
- [NEW] [FIX_RLS_OFFERS_DOCUMENTS.sql](file:///d:/24efilings%20CRM/sql_archive/FIX_RLS_OFFERS_DOCUMENTS.sql)
- Remove the inline SQL from `lib/supabaseClient.ts` (lines 20-230) — this massive SQL string should not live in the client code

---

## Phase 2 — Verification Checkpoint

- [ ] Build the app and inspect the bundle for leaked API keys:
  ```bash
  npx vite build
  grep -r "GEMINI" dist/ # Should return 0 results (or only empty strings)
  ```
- [ ] Verify `.env.example` exists and `.env` is gitignored
- [ ] Test AI Copilot/Chatbot with a prompt that returns `<img onerror="alert(1)">` — should render as text, not execute
- [ ] Test that a Sales Executive cannot edit/delete offers from another branch

---

## Phase 3 — Performance Optimization
**Duration:** 3–5 days  
**Goal:** Reduce initial load time from ~10s to ~3s on 3G. Cut bundle from 2.7 MB to under 800 KB.

---

### 3.1 Dynamic Import PDF Libraries
**Time:** 2 hours  
**Priority:** 🟠 HIGH (saves ~840 KB)

#### Tasks:
- [ ] In `pages/InvoiceManagement.tsx`, change static imports to dynamic:
  ```typescript
  // BEFORE:
  import jsPDF from 'jspdf';
  import autoTable from 'jspdf-autotable';
  
  // AFTER:
  const generatePDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    // ... existing PDF generation logic
  };
  ```
- [ ] Apply the same pattern to `components/InvoicePDF.tsx` and any other file importing jsPDF
- [ ] Do the same for `html2canvas` if it's statically imported

#### Files Changed:
- [MODIFY] [InvoiceManagement.tsx](file:///d:/24efilings%20CRM/pages/InvoiceManagement.tsx)
- [MODIFY] [InvoicePDF.tsx](file:///d:/24efilings%20CRM/components/InvoicePDF.tsx)

#### Verification:
```bash
npx vite build 2>&1 | grep "InvoiceManagement"
# Chunk should drop from 1,520 KB to ~200 KB
```

---

### 3.2 Convert Static Imports to Lazy
**Time:** 30 minutes  
**Priority:** 🟡 MEDIUM

#### Tasks:
- [ ] In `App.tsx`, convert these static imports (lines 60-74) to lazy:
  ```typescript
  // BEFORE:
  import { AutoAssignmentSettings } from './pages/AutoAssignmentSettings';
  import { TargetsDashboard } from './pages/TargetsDashboard';
  // ... 12 more
  
  // AFTER:
  const AutoAssignmentSettings = lazy(() => import('./pages/AutoAssignmentSettings'));
  const TargetsDashboard = lazy(() => import('./pages/TargetsDashboard'));
  // ... 12 more
  ```
  Pages to convert: `AutoAssignmentSettings`, `TargetsDashboard`, `ServiceDelivery`, `RenewalsPipeline`, `MyDay`, `ClientPortalView`, `Attendance`, `ExpenseManager`, `AutomationRules`, `DocumentTemplates`, `IntegrationsCenter`, `RevenueForecasting`, `ChurnPrediction`, `GstComplianceCalendar`, `TeamChat`
- [ ] Ensure each of these pages uses `export default` (not named exports) for `lazy()` to work

#### Files Changed:
- [MODIFY] [App.tsx](file:///d:/24efilings%20CRM/App.tsx)
- [MODIFY] Each of the 15 page files above (add `export default` if missing)

#### Verification:
```bash
npx vite build 2>&1 | grep "index-"
# Main chunk should drop significantly from 1,201 KB
```

---

### 3.3 Add Manual Chunks for Heavy Libraries
**Time:** 30 minutes  
**Priority:** 🟡 MEDIUM

#### Tasks:
- [ ] Update `vite.config.ts` with manual chunk splitting:
  ```typescript
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable', '@react-pdf/renderer'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-dropdown-menu'],
        }
      }
    }
  }
  ```

#### Files Changed:
- [MODIFY] [vite.config.ts](file:///d:/24efilings%20CRM/vite.config.ts)

---

### 3.4 Reduce Presence Heartbeat Load
**Time:** 15 minutes  
**Priority:** 🟡 MEDIUM

#### Tasks:
- [ ] In `context/AuthContext.tsx`, add tab-visibility check to the presence interval:
  ```typescript
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      updatePresence();
    }
  }, 60000);
  ```
  This prevents background tabs from sending heartbeats.

#### Files Changed:
- [MODIFY] [AuthContext.tsx](file:///d:/24efilings%20CRM/context/AuthContext.tsx)

---

## Phase 3 — Verification Checkpoint

```bash
npx vite build
# Target metrics:
# - Main chunk (index-*.js): < 500 KB (down from 1,201 KB)
# - InvoiceManagement chunk: < 300 KB (down from 1,520 KB)
# - No chunk > 500 KB warning
# - Total bundle: < 1.5 MB (down from 2.7 MB)
```

---

## Phase 4 — Architecture & DX Improvements
**Duration:** 1–2 weeks  
**Goal:** Make the codebase maintainable, testable, and onboardable for new developers.

---

### 4.1 Break Up App.tsx (1,495 lines → ~300 lines)
**Time:** 4–6 hours  
**Priority:** 🟠 HIGH

#### Tasks:
- [ ] Extract routes into `routes/AppRoutes.tsx`
- [ ] Extract all CRUD callbacks into feature-specific hooks:
  - `hooks/useLeadActions.ts` — lead CRUD callbacks
  - `hooks/useCustomerActions.ts` — customer CRUD callbacks
  - `hooks/useUserActions.ts` — user CRUD callbacks
  - `hooks/useFileUpload.ts` — `uploadAvatar`, `uploadBranchLogo`, etc.
- [ ] Extract background scheduler logic (lines 433-516) into `hooks/useBackgroundScheduler.ts`
- [ ] Extract the `PAGE_CONFIG` object into `constants/pageConfig.ts`
- [ ] `App.tsx` should only contain: provider wrappers, the routes component, and top-level layout

#### Files Changed:
- [MODIFY] [App.tsx](file:///d:/24efilings%20CRM/App.tsx) (reduce to ~300 lines)
- [NEW] `routes/AppRoutes.tsx`
- [NEW] `hooks/useLeadActions.ts`
- [NEW] `hooks/useCustomerActions.ts`
- [NEW] `hooks/useUserActions.ts`
- [NEW] `hooks/useFileUpload.ts`
- [NEW] `hooks/useBackgroundScheduler.ts`

---

### 4.2 Break Up LeadForm.tsx (51 KB → 5 files)
**Time:** 3–4 hours  
**Priority:** 🟡 MEDIUM

#### Tasks:
- [ ] Split into:
  - `components/lead-form/LeadFormContainer.tsx` — orchestrator with state management
  - `components/lead-form/PersonalInfoSection.tsx` — name, phone, email, address
  - `components/lead-form/BusinessInfoSection.tsx` — business name, category, GST
  - `components/lead-form/ServiceSection.tsx` — service selection, pricing
  - `components/lead-form/useLeadFormLogic.ts` — all the form logic (validation, auto-promo, submit)

---

### 4.3 Consolidate Context Directories
**Time:** 15 minutes  
**Priority:** 🔵 LOW

#### Tasks:
- [ ] Move `context/AuthContext.tsx` → `contexts/AuthContext.tsx`
- [ ] Delete the `context/` directory
- [ ] Update all imports (grep for `'../context/AuthContext'` and replace with `'../contexts/AuthContext'`)

#### Files Changed:
- [MOVE] `context/AuthContext.tsx` → `contexts/AuthContext.tsx`
- [DELETE] `context/` directory
- Update imports in: `App.tsx`, `index.tsx`, `components/AICopilot.tsx`, and any other file importing from `context/`

---

### 4.4 Fix Type System (`any` cleanup)
**Time:** 2–3 hours  
**Priority:** 🟡 MEDIUM

#### Tasks:
- [ ] Eliminate `any` types from all API hooks in `hooks/api/`:
  - Replace `any` parameters with proper types from `types.ts` or `database.types.ts`
  - Focus on `useApiCore.ts`, `useLeadsApi.ts`, `useUsersApi.ts` first
- [ ] Fix the Payment Method enum mismatch:
  - Align `types.ts` `Payment.method` with `database.types.ts` `payment_method` enum
  - Choose one source of truth (database enum should win)
- [ ] Fix the Task type: remove `status` and `category` fields that don't exist in DB, or add them to the DB schema

---

### 4.5 Align SQL Migrations
**Time:** 2 hours  
**Priority:** 🟡 MEDIUM

#### Tasks:
- [ ] Create a single consolidated migration file: `sql_archive/CONSOLIDATED_SCHEMA.sql`
  - Combine all 89 ad-hoc SQL files into one definitive schema
  - Remove duplicates and conflicts (e.g., the 7 different `FIX_RLS_*.sql` files)
- [ ] Move the inline SQL from `lib/supabaseClient.ts` (lines 20-230) into the consolidated migration
- [ ] Clean up `lib/supabaseClient.ts` to only contain the Supabase client initialization (~15 lines)
- [ ] Document which migrations have been applied to production

---

### 4.6 Add Developer Tooling
**Time:** 1–2 hours  
**Priority:** 🔵 LOW

#### Tasks:
- [ ] Add ESLint:
  ```bash
  npm install -D eslint @eslint/js typescript-eslint
  ```
  Create `eslint.config.js` with recommended rules
- [ ] Add Prettier:
  ```bash
  npm install -D prettier
  ```
  Create `.prettierrc` with project preferences
- [ ] Add Vitest for unit testing:
  ```bash
  npm install -D vitest @testing-library/react
  ```
  Create `vitest.config.ts`
- [ ] Add scripts to `package.json`:
  ```json
  "lint": "eslint .",
  "format": "prettier --write .",
  "test": "vitest",
  "typecheck": "tsc --noEmit"
  ```

#### Files Changed:
- [NEW] `eslint.config.js`
- [NEW] `.prettierrc`
- [NEW] `vitest.config.ts`
- [MODIFY] [package.json](file:///d:/24efilings%20CRM/package.json)

---

### 4.7 Mark Mock Integrations
**Time:** 15 minutes  
**Priority:** 🔵 LOW

#### Tasks:
- [ ] Rename `lib/integrations.ts` → `lib/integrations.mock.ts`
- [ ] Add a prominent warning comment and console.warn at the top:
  ```typescript
  /**
   * ⚠️ MOCK INTEGRATIONS — These return fake data.
   * Replace with real Razorpay/Exotel/MSG91 SDKs before production use.
   */
  console.warn('[MOCK] integrations.mock.ts loaded — Razorpay, Exotel, MSG91 are NOT connected');
  ```
- [ ] Add a UI indicator when mock integrations are active

---

## Phase 4 — Verification Checkpoint

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npx vite build` → no chunks > 500 KB
- [ ] `npm run lint` → passes (once ESLint is added)
- [ ] `App.tsx` is under 400 lines
- [ ] `LeadForm.tsx` is split into 5+ files, each under 300 lines
- [ ] Only one `contexts/` directory exists
- [ ] `lib/supabaseClient.ts` is under 20 lines (no inline SQL)

---

## Summary — Full File Change List

| Action | File | Phase |
|---|---|---|
| MODIFY | `types/database.types.ts` | 1.1 |
| MODIFY | `components/icons.tsx` | 1.2 |
| MODIFY | `types.ts` | 1.3 |
| MODIFY | `hooks/api/useLeadsApi.ts` | 1.3 |
| MODIFY | `lib/scoringML.ts` | 1.3 |
| MODIFY | `pages/ClientPortalView.tsx` | 1.3 |
| MODIFY | `pages/MyDay.tsx` | 1.3 |
| MODIFY | `hooks/api/useWebApi.ts` | 1.3 |
| NEW | `vite-env.d.ts` | 1.3 |
| MODIFY | `components/LeadForm.tsx` | 1.4, 1.5 |
| MODIFY | `pages/Customers.tsx` | 1.4, 1.5 |
| MODIFY | `vite.config.ts` | 2.1, 3.3 |
| MODIFY | `.env` | 2.2 |
| MODIFY | `lib/env.ts` | 2.2 |
| MODIFY | `lib/supabaseClient.ts` | 2.2, 4.5 |
| NEW | `.env.example` | 2.2 |
| MODIFY | `.gitignore` | 2.2 |
| NEW | `lib/sanitize.ts` | 2.3 |
| MODIFY | `components/AICopilot.tsx` | 2.3 |
| MODIFY | `components/Chatbot.tsx` | 2.3 |
| MODIFY | `pages/DocumentTemplates.tsx` | 2.3 |
| NEW | `sql_archive/FIX_RLS_OFFERS_DOCUMENTS.sql` | 2.4 |
| MODIFY | `pages/InvoiceManagement.tsx` | 3.1 |
| MODIFY | `components/InvoicePDF.tsx` | 3.1 |
| MODIFY | `App.tsx` | 3.2, 4.1 |
| MODIFY | `context/AuthContext.tsx` | 3.4 |
| NEW | `routes/AppRoutes.tsx` | 4.1 |
| NEW | `hooks/useLeadActions.ts` | 4.1 |
| NEW | `hooks/useCustomerActions.ts` | 4.1 |
| NEW | `hooks/useUserActions.ts` | 4.1 |
| NEW | `hooks/useFileUpload.ts` | 4.1 |
| NEW | `hooks/useBackgroundScheduler.ts` | 4.1 |
| MOVE | `context/AuthContext.tsx` → `contexts/` | 4.3 |
| NEW | `sql_archive/CONSOLIDATED_SCHEMA.sql` | 4.5 |
| NEW | `eslint.config.js` | 4.6 |
| NEW | `.prettierrc` | 4.6 |
| NEW | `vitest.config.ts` | 4.6 |
| MODIFY | `package.json` | 4.6 |
| RENAME | `lib/integrations.ts` → `lib/integrations.mock.ts` | 4.7 |

---

*End of implementation plan.*
