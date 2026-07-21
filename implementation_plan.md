# 📐 24eFiling CRM — Implementation Plan

> **Created:** July 21, 2026  
> **Based on:** [CRM_UPGRADE_MASTERPLAN.md](./CRM_UPGRADE_MASTERPLAN.md)  
> **Approach:** Bottom-up — fix foundations first, then build features  
> **Estimated Total Duration:** ~20 weeks (5 phases)

---

## Phase 1 — Foundation & Technical Debt Cleanup
**Duration:** Weeks 1–3  
**Goal:** Make the codebase maintainable, secure, and ready for rapid feature development.

---

### 1.1 Environment & Credentials Hardening
**Time:** 2 hours

#### Tasks:
- [ ] Create `.env` file at project root:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  VITE_GOOGLE_GENAI_API_KEY=your-key
  VITE_WHATSAPP_TOKEN=your-token
  VITE_WHATSAPP_PHONE_NUMBER_ID=your-id
  ```
- [ ] Update `.gitignore` to include `.env`, `.env.local`, `.env.production`
- [ ] Refactor `env.tsx` → `lib/env.ts`:
  ```typescript
  export const ENV = {
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    GOOGLE_GENAI_API_KEY: import.meta.env.VITE_GOOGLE_GENAI_API_KEY,
    WHATSAPP_TOKEN: import.meta.env.VITE_WHATSAPP_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID,
  } as const;
  ```
- [ ] Update all imports across codebase (`lib/supabaseClient.ts`, `lib/whatsappClient.ts`, `components/AICopilot.tsx`, etc.)
- [ ] Delete old `env.tsx`

#### Files Modified:
| Action | File |
|--------|------|
| CREATE | `.env` |
| CREATE | `lib/env.ts` |
| MODIFY | `.gitignore` |
| MODIFY | `lib/supabaseClient.ts` |
| MODIFY | `lib/whatsappClient.ts` |
| MODIFY | `components/AICopilot.tsx` |
| MODIFY | `pages/WhatsAppDashboard.tsx` |
| DELETE | `env.tsx` |

---

### 1.2 Dead File Cleanup
**Time:** 30 minutes

#### Tasks:
- [ ] Delete empty/dead files:
  - `components/Dashboard.tsx` (0 bytes)
  - `components/DashboardMetrics.tsx` (0 bytes)
  - `App.tsx.backup` (stale backup)
  - `backend/server.js` (blank placeholder)
  - `backend/package.json` (unused)
- [ ] Delete one-off utility scripts (after confirming no longer needed):
  - `clean.cjs`, `clean2.py`, `clean3.py`
  - `fix.py`, `migrate_app.py`
  - `debug_data.js`, `update_users.js`, `update_supabase_types.cjs`
- [ ] Verify no imports reference deleted files
- [ ] Remove `backend/` directory entirely

#### Files Deleted:
| File | Reason |
|------|--------|
| `components/Dashboard.tsx` | 0 bytes — never implemented |
| `components/DashboardMetrics.tsx` | 0 bytes — never implemented |
| `App.tsx.backup` | Stale backup, use git instead |
| `backend/server.js` | Blank file, no backend server used |
| `backend/package.json` | Orphaned package.json |
| `clean.cjs` | One-off migration script |
| `clean2.py` | One-off migration script |
| `clean3.py` | One-off migration script |
| `fix.py` | One-off fix script |
| `migrate_app.py` | One-off migration script |
| `debug_data.js` | Debug utility |
| `update_users.js` | One-off script |
| `update_supabase_types.cjs` | One-off script |

---

### 1.3 Database Migration System Setup
**Time:** 4 hours

#### Tasks:
- [ ] Initialize Supabase CLI in the project:
  ```bash
  npx supabase init
  ```
- [ ] Create a consolidated baseline migration from all 74 SQL files:
  ```
  supabase/migrations/
  ├── 00001_baseline_profiles.sql
  ├── 00002_baseline_leads.sql
  ├── 00003_baseline_customers.sql
  ├── 00004_baseline_activities_tasks.sql
  ├── 00005_baseline_documents_notifications.sql
  ├── 00006_baseline_services_offers.sql
  ├── 00007_baseline_branches_cities.sql
  ├── 00008_baseline_invoices.sql
  ├── 00009_baseline_announcements.sql
  ├── 00010_baseline_support_tickets.sql
  ├── 00011_baseline_work_orders.sql
  ├── 00012_baseline_feedback.sql
  ├── 00013_baseline_whatsapp.sql
  ├── 00014_baseline_web_modules.sql
  ├── 00015_baseline_assets.sql
  ├── 00016_baseline_rls_policies.sql
  ├── 00017_baseline_triggers_functions.sql
  ├── 00018_baseline_storage_buckets.sql
  ├── 00019_baseline_settings.sql
  ├── 00020_baseline_payment_sequences.sql
  ```
- [ ] Move all 74 root-level SQL files into `sql_archive/` (don't delete — keep for reference)
- [ ] Add `sql_archive/` to `.gitignore`
- [ ] Document migration process in `supabase/README.md`
- [ ] Generate proper Supabase TypeScript types:
  ```bash
  npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
  ```

#### Files Modified:
| Action | File |
|--------|------|
| CREATE | `supabase/migrations/00001_baseline_profiles.sql` ... `00020_baseline_payment_sequences.sql` |
| CREATE | `supabase/README.md` |
| CREATE | `types/database.types.ts` |
| MOVE | 74 root `.sql` files → `sql_archive/` |
| MODIFY | `.gitignore` |

---

### 1.4 Split `useApi.ts` (135KB → 15 domain hooks)
**Time:** 8 hours  
**Risk:** HIGH — this is the backbone. Must be done carefully with testing after each extraction.

#### New File Structure:
```
hooks/
├── api/
│   ├── useApiCore.ts              # Supabase client, cache manager, realtime subscription, shared types
│   ├── useLeadsApi.ts             # addLead, updateLead, updateMultipleLeads, deleteMultipleLeads, fetchLeadDetails
│   ├── useCustomersApi.ts         # addCustomer, updateCustomer, deleteCustomer, deleteCustomers, importCustomers
│   ├── useUsersApi.ts             # updateUser, transferUser, deleteMultipleUsers
│   ├── useTasksApi.ts             # addTaskToLead, updateTaskOnLead, deleteTaskFromLead
│   ├── useActivitiesApi.ts        # addActivityToLead, fetchActivities
│   ├── useDocumentsApi.ts         # uploadDocument, deleteDocument, updateDocumentStatus
│   ├── useServicesApi.ts          # addService, updateService, deleteService, addSubService, updateSubService, deleteSubService
│   ├── useInvoicesApi.ts          # addInvoice, updateInvoice, deleteInvoice, addInvoicePayment
│   ├── useOffersApi.ts            # addOffer, updateOffer, deleteOffer, incrementOfferUsage
│   ├── useWebApi.ts               # addWebLead, updateWebLead, convertWebLeadToCrmLead, blogs CRUD, testimonials CRUD
│   ├── useWorkOrdersApi.ts        # addWorkOrder, updateWorkOrder, deleteWorkOrder, work order notes
│   ├── useSupportApi.ts           # tickets CRUD, comments, KB articles, employee feedback
│   ├── useWhatsAppApi.ts          # conversations, messages, templates CRUD
│   ├── useBranchesApi.ts          # branches CRUD, cities CRUD
│   ├── useNotificationsApi.ts     # addNotification, markAsRead, announcements CRUD
│   ├── useSettingsApi.ts          # org settings, policies, reminders
│   └── index.ts                   # Re-export combined useApi hook for backward compatibility
├── useDashboardMetrics.ts         # (keep as-is, already separate)
├── useMockData.ts                 # (keep as-is)
└── usePagination.ts               # (keep as-is)
```

#### Extraction Strategy:
1. Create `hooks/api/useApiCore.ts` — extract Supabase client init, localStorage cache logic, realtime channel setup, and shared state types
2. Extract one domain at a time, starting with the most independent:
   - `useSettingsApi.ts` (fewest dependencies)
   - `useBranchesApi.ts`
   - `useServicesApi.ts`
   - `useOffersApi.ts`
   - `useNotificationsApi.ts`
   - `useWebApi.ts`
   - `useWhatsAppApi.ts`
   - `useSupportApi.ts`
   - `useWorkOrdersApi.ts`
   - `useInvoicesApi.ts`
   - `useDocumentsApi.ts`
   - `useActivitiesApi.ts`
   - `useTasksApi.ts`
   - `useUsersApi.ts`
   - `useCustomersApi.ts`
   - `useLeadsApi.ts` (most dependencies — do last)
3. Create `hooks/api/index.ts` that combines all hooks into a single `useApi()` for backward compatibility
4. Test after each extraction — verify the page that uses those functions still works

#### Backward Compatibility Pattern (`hooks/api/index.ts`):
```typescript
export function useApi() {
  const core = useApiCore();
  const leads = useLeadsApi(core);
  const customers = useCustomersApi(core);
  const users = useUsersApi(core);
  // ... all other hooks
  
  return {
    ...core,
    ...leads,
    ...customers,
    ...users,
    // ... spread all
  };
}
```

---

### 1.5 Split `CreateLead.tsx` (1,541 lines → 5 components)
**Time:** 4 hours

#### New File Structure:
```
pages/
├── CreateLead.tsx                      # Orchestrator (imports below, manages state)
├── create-lead/
│   ├── ClientInfoSection.tsx           # Personal/business details form fields
│   ├── ServiceSetBuilder.tsx           # Service selection, sub-services, quantity
│   ├── PricingCalculator.tsx           # Discount, tax, totals computation
│   ├── LiveProformaPreview.tsx         # Real-time invoice preview panel
│   ├── ReferralSection.tsx             # Referral source (customer/employee)
│   └── useCreateLeadForm.ts           # Form state management hook
```

#### Extraction Details:
| New File | Lines (approx) | Extracts From |
|----------|:-:|---|
| `ClientInfoSection.tsx` | ~250 | Name, email, phone, PAN, address fields, country select |
| `ServiceSetBuilder.tsx` | ~350 | Service dropdown, sub-service multi-select, quantity inputs, add/remove service sets |
| `PricingCalculator.tsx` | ~200 | Discount logic, GST calculation, total computation, offer code application |
| `LiveProformaPreview.tsx` | ~200 | Live invoice preview panel that reacts to form state |
| `ReferralSection.tsx` | ~100 | Referral by customer/employee selection |
| `useCreateLeadForm.ts` | ~300 | All useState declarations, validation logic, submit handler, reference number generation |

---

### 1.6 Split `LeadDetail.tsx` (1,141 lines → tab components)
**Time:** 3 hours

#### New File Structure:
```
pages/
├── LeadDetail.tsx                      # Tab shell, lead header, status stepper
├── lead-detail/
│   ├── LeadOverviewTab.tsx             # Contact info, business details, score card
│   ├── LeadActivitiesTab.tsx           # Activity timeline with add note
│   ├── LeadDocumentsTab.tsx            # Document upload, status, verification
│   ├── LeadTasksTab.tsx               # Task list, create/edit/complete
│   ├── LeadPaymentsTab.tsx            # Payment history, add payment, receipts
│   ├── LeadScoreBreakdown.tsx         # Visual score breakdown card
│   └── LeadStatusStepper.tsx          # Pipeline stage stepper bar
```

---

### 1.7 Form Validation System
**Time:** 4 hours

#### Tasks:
- [ ] Install dependencies:
  ```bash
  npm install react-hook-form zod @hookform/resolvers
  ```
- [ ] Create validation schemas:
  ```
  lib/
  ├── validations/
  │   ├── leadSchema.ts          # Lead form validation (phone regex, PAN regex, email)
  │   ├── customerSchema.ts      # Customer form validation
  │   ├── userSchema.ts          # User creation/edit validation
  │   ├── invoiceSchema.ts       # Invoice validation
  │   ├── serviceSchema.ts       # Service/sub-service validation
  │   └── commonSchemas.ts       # Shared schemas (email, phone, PAN, GSTIN, Aadhar)
  ```
- [ ] Create reusable form field components:
  ```
  components/ui/
  ├── FormField.tsx              # Label + Input + Error message wrapper
  ├── FormSelect.tsx             # Label + Select + Error wrapper
  ├── FormTextarea.tsx           # Label + Textarea + Error wrapper
  ├── FormDatePicker.tsx         # Label + Calendar + Error wrapper
  ```
- [ ] Migrate forms one at a time:
  1. `components/UserForm.tsx` (simplest)
  2. `components/CustomerForm.tsx`
  3. `pages/create-lead/` components
  4. All modal forms across pages

#### Common Validation Schemas (`lib/validations/commonSchemas.ts`):
```typescript
import { z } from 'zod';

export const phoneSchema = z.string()
  .regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit Indian mobile number');

export const panSchema = z.string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Enter valid PAN (e.g., ABCDE1234F)');

export const gstinSchema = z.string()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$/, 'Enter valid GSTIN');

export const aadharSchema = z.string()
  .regex(/^\d{12}$/, 'Enter valid 12-digit Aadhar number');

export const emailSchema = z.string().email('Enter valid email address');
```

---

### 1.8 UI Component Gaps
**Time:** 3 hours

#### Tasks:
- [ ] Install Sonner for toast notifications:
  ```bash
  npm install sonner
  ```
- [ ] Create `components/ui/Toaster.tsx` — global toast provider
- [ ] Replace all imperative `showToast` prop passing with `toast()` calls from Sonner
- [ ] Install and create Radix Tooltip:
  ```bash
  npm install @radix-ui/react-tooltip
  ```
- [ ] Create `components/ui/Tooltip.tsx` — reusable tooltip wrapper
- [ ] Add tooltips to all icon-only buttons across the app
- [ ] Replace ALL `window.confirm()` usages with `ConfirmationDialog`:
  - `pages/PoliciesManagement.tsx`
  - `pages/TestimonialsManagement.tsx`
  - `pages/CustomerDetail.tsx` (uses `alert()`)
  - Any other occurrences
- [ ] Standardize all charts to Recharts (replace custom SVG charts):
  - `components/charts/BarChart.tsx` → Recharts `<BarChart>`
  - `components/charts/DonutChart.tsx` → Recharts `<PieChart>`
  - `components/charts/FunnelChart.tsx` → Recharts custom funnel
  - `components/charts/LineChart.tsx` → Recharts `<LineChart>`

#### Files Modified:
| Action | File |
|--------|------|
| CREATE | `components/ui/Toaster.tsx` |
| CREATE | `components/ui/Tooltip.tsx` |
| MODIFY | `components/charts/BarChart.tsx` (rewrite with Recharts) |
| MODIFY | `components/charts/DonutChart.tsx` (rewrite with Recharts) |
| MODIFY | `components/charts/FunnelChart.tsx` (rewrite with Recharts) |
| MODIFY | `components/charts/LineChart.tsx` (rewrite with Recharts) |
| MODIFY | ~15 pages (replace window.confirm/alert with components) |

---

### 1.9 Storage Bucket Security
**Time:** 1 hour

#### Tasks:
- [ ] Change `documents` bucket from public to private
- [ ] Change `invoices` bucket from public to private
- [ ] Keep `avatars` bucket public (profile images need direct URLs)
- [ ] Update document/invoice access to use Supabase signed URLs:
  ```typescript
  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 3600); // 1 hour expiry
  ```
- [ ] Update all components that display documents/invoices to request signed URLs

#### SQL Migration:
```sql
-- 00021_fix_storage_security.sql
UPDATE storage.buckets SET public = false WHERE id = 'documents';
UPDATE storage.buckets SET public = false WHERE id = 'invoices';
```

---

### 1.10 Performance Foundation
**Time:** 3 hours

#### Tasks:
- [ ] Add database indexes:
  ```sql
  -- 00022_add_performance_indexes.sql
  CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON leads(branch_id);
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
  CREATE INDEX IF NOT EXISTS idx_customers_lead_id ON customers(lead_id);
  CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);
  CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON documents(lead_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
  CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON profiles(branch_id);
  CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
  ```
- [ ] Add `useMemo` wrapping for expensive computations in:
  - `App.tsx` — `roleScopedLeads`, `roleScopedCustomers`, `globallyFilteredLeads`
  - `pages/Reports.tsx` — chart data computations
  - `pages/RevenueDashboard.tsx` — revenue aggregations
  - `pages/Customers.tsx` — filtered/sorted customer lists
  - `hooks/useDashboardMetrics.ts` — metric calculations
- [ ] Implement server-side pagination for leads table:
  ```typescript
  // In useLeadsApi.ts
  async function fetchLeadsPaginated(page: number, pageSize: number, filters: LeadFilters) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    let query = supabase.from('leads').select('*', { count: 'exact' });
    
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
    if (filters.branchId) query = query.eq('branch_id', filters.branchId);
    
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    return { data, totalCount: count, page, pageSize };
  }
  ```

---

### Phase 1 Verification Checklist:
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] All pages load without console errors
- [ ] Lead creation flow works end-to-end
- [ ] Lead-to-customer conversion works
- [ ] Invoice generation works
- [ ] Document upload/download works (with signed URLs)
- [ ] Login/logout works for all 3 roles
- [ ] Real-time updates still function

---

## Phase 2 — Core Feature Gaps
**Duration:** Weeks 4–8  
**Goal:** Build the daily-driver features that eliminate the need for external tools.

---

### 2.1 Global Search (Cmd+K)
**Time:** 6 hours

#### New Files:
```
components/
├── GlobalSearch.tsx              # Cmd+K spotlight modal
├── GlobalSearchResults.tsx       # Categorized results (leads, customers, invoices, users)
```

#### Implementation:
- [ ] Create `GlobalSearch.tsx` — Radix Dialog with search input, keyboard shortcut listener
- [ ] Search across: leads (name, business, phone, email, PAN, reference#), customers (same), users (name, email), invoices (number)
- [ ] Categorized results with icons and quick navigation
- [ ] Recent searches stored in `localStorage`
- [ ] Quick actions: "Create Lead", "Create Invoice", "Add User"
- [ ] Register `Ctrl+K` / `Cmd+K` keyboard shortcut in `App.tsx`
- [ ] Add search icon to `Header.tsx`

#### Database:
- [ ] Consider adding a Supabase full-text search index on leads/customers if dataset grows large:
  ```sql
  -- 00023_add_search_indexes.sql
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(business_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone_number, ''))
    ) STORED;
  CREATE INDEX idx_leads_search ON leads USING gin(search_vector);
  ```

---

### 2.2 Quick-Add Lead Modal
**Time:** 3 hours

#### New Files:
```
components/
├── QuickAddLead.tsx              # Minimal lead creation modal
```

#### Implementation:
- [ ] Floating "+" button on bottom-right of all pages (Sales Executive)
- [ ] Modal with only: First Name, Phone, Service (dropdown), Priority — 4 fields
- [ ] Creates lead with `status: 'New Lead'`, auto-assigns to current user
- [ ] "Add More Details" button navigates to full CreateLead page
- [ ] Keyboard shortcut: `N` key opens quick-add

---

### 2.3 Automated Lead Assignment Rules
**Time:** 8 hours

#### New Files:
```
pages/
├── AutoAssignmentSettings.tsx       # Rules configuration UI

lib/
├── leadAssignment.ts                # Assignment engine

supabase/migrations/
├── 00024_lead_assignment_rules.sql  # Rules table
```

#### Database Schema:
```sql
-- 00024_lead_assignment_rules.sql
CREATE TABLE lead_assignment_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,           -- Higher = checked first
  is_active BOOLEAN DEFAULT true,
  rule_type TEXT NOT NULL,              -- 'round_robin', 'skill_based', 'load_balanced', 'source_based', 'geography_based'
  conditions JSONB DEFAULT '{}',        -- { "lead_source": "Website", "city": "Hyderabad", "service": "GST" }
  target_branch_id TEXT,                -- Assign to specific branch
  target_user_ids UUID[],              -- Specific users for round-robin
  last_assigned_index INTEGER DEFAULT 0, -- Track round-robin position
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Assignment Engine (`lib/leadAssignment.ts`):
```typescript
export async function autoAssignLead(lead: Partial<Lead>): Promise<string | null> {
  // 1. Fetch active rules ordered by priority DESC
  // 2. For each rule, check if lead matches conditions
  // 3. If match found:
  //    - round_robin: pick next user from target_user_ids, increment index
  //    - skill_based: find user with matching skills and fewest active leads
  //    - load_balanced: find user in branch with fewest active leads
  //    - source_based: map lead source to user/branch
  //    - geography_based: map lead city to branch
  // 4. Return assigned user ID or null if no rule matches
}
```

#### Integration Points:
- [ ] Call `autoAssignLead()` in `addLead()` when `assigned_to` is not manually set
- [ ] Call `autoAssignLead()` for web lead conversion in `convertWebLeadToCrmLead()`
- [ ] Add "Auto-Assignment Rules" to Settings sidebar (Super Admin only)

---

### 2.4 Sales Targets & Tracking
**Time:** 10 hours

#### New Files:
```
pages/
├── TargetsDashboard.tsx             # Targets vs achievement view

components/
├── TargetGauge.tsx                  # Visual gauge component
├── TargetSettingsModal.tsx          # Set targets modal

supabase/migrations/
├── 00025_sales_targets.sql
```

#### Database Schema:
```sql
-- 00025_sales_targets.sql
CREATE TABLE sales_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  branch_id TEXT,
  period_type TEXT NOT NULL,          -- 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_revenue NUMERIC DEFAULT 0,
  target_leads INTEGER DEFAULT 0,
  target_conversions INTEGER DEFAULT 0,
  target_calls INTEGER DEFAULT 0,
  commission_rate NUMERIC DEFAULT 0,  -- Percentage
  commission_threshold NUMERIC DEFAULT 0, -- Min revenue before commission kicks in
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE commission_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_id UUID REFERENCES sales_targets(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  achieved_revenue NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',      -- 'pending', 'approved', 'paid'
  approved_by UUID REFERENCES profiles(id),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Features:
- [ ] Super Admin / Branch Manager can set targets per user per month/quarter
- [ ] Branch-level aggregate targets
- [ ] Real-time gauge: "₹3.2L / ₹5L" with daily run-rate projection
- [ ] Commission calculator: auto-compute based on rules
- [ ] Leaderboard integration with target achievement percentage
- [ ] Add "Targets" to sidebar navigation for all roles
- [ ] Notification when target achieved (celebration modal)

---

### 2.5 Service Delivery Pipeline
**Time:** 12 hours

#### New Files:
```
pages/
├── ServiceDelivery.tsx              # Service delivery tracking dashboard

components/
├── ServiceDeliveryBoard.tsx         # Kanban-style delivery tracker
├── DeliveryChecklist.tsx            # Service-specific checklist component

supabase/migrations/
├── 00026_service_delivery.sql
```

#### Database Schema:
```sql
-- 00026_service_delivery.sql
CREATE TABLE service_delivery_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  sub_service_name TEXT,
  steps JSONB NOT NULL,               -- [{ "order": 1, "name": "Collect Documents", "sla_hours": 24 }, ...]
  total_sla_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE service_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES work_orders(id),
  service_name TEXT NOT NULL,
  sub_service_name TEXT,
  template_id UUID REFERENCES service_delivery_templates(id),
  assigned_to UUID REFERENCES profiles(id),
  branch_id TEXT,
  status TEXT DEFAULT 'not_started',  -- 'not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'
  current_step INTEGER DEFAULT 0,
  steps_progress JSONB DEFAULT '[]',  -- [{ "step": 1, "status": "completed", "completed_at": "...", "notes": "..." }]
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Pre-Built Templates for 24eFiling:
```json
[
  {
    "service": "GST Registration",
    "steps": [
      { "order": 1, "name": "Collect PAN, Aadhar, Photos", "sla_hours": 24 },
      { "order": 2, "name": "Prepare Application", "sla_hours": 12 },
      { "order": 3, "name": "Submit on GST Portal", "sla_hours": 4 },
      { "order": 4, "name": "ARN Generated", "sla_hours": 1 },
      { "order": 5, "name": "Respond to Queries (if any)", "sla_hours": 48 },
      { "order": 6, "name": "GSTIN Received", "sla_hours": 72 }
    ]
  },
  {
    "service": "Company Registration",
    "steps": [
      { "order": 1, "name": "Name Approval (RUN)", "sla_hours": 48 },
      { "order": 2, "name": "DSC Generation", "sla_hours": 24 },
      { "order": 3, "name": "Drafting MOA/AOA", "sla_hours": 24 },
      { "order": 4, "name": "SPICe+ Filing", "sla_hours": 12 },
      { "order": 5, "name": "CIN Received", "sla_hours": 72 },
      { "order": 6, "name": "PAN/TAN Allotment", "sla_hours": 24 }
    ]
  }
]
```

#### Integration:
- [ ] Auto-create service delivery when work order is created
- [ ] Auto-create service delivery when lead converts to customer
- [ ] SLA timer with color coding (green = on track, yellow = warning, red = breached)
- [ ] Customer notification at each step completion (WhatsApp template)
- [ ] Dashboard widget showing delivery bottlenecks
- [ ] Link from customer detail page to delivery status

---

### 2.6 Recurring Services & Renewals
**Time:** 8 hours

#### New Files:
```
pages/
├── RenewalsPipeline.tsx             # Renewals management view

supabase/migrations/
├── 00027_recurring_services.sql
```

#### Database Schema:
```sql
-- 00027_recurring_services.sql
CREATE TABLE recurring_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  sub_service_name TEXT,
  frequency TEXT NOT NULL,            -- 'monthly', 'quarterly', 'half_yearly', 'yearly', 'custom'
  frequency_months INTEGER,           -- Custom frequency in months
  last_completed_date DATE,
  next_due_date DATE NOT NULL,
  amount NUMERIC DEFAULT 0,
  auto_create_lead BOOLEAN DEFAULT true,
  reminder_days_before INTEGER[] DEFAULT '{30, 15, 7}',
  assigned_to UUID REFERENCES profiles(id),
  branch_id TEXT,
  status TEXT DEFAULT 'active',       -- 'active', 'paused', 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE renewal_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_service_id UUID REFERENCES recurring_services(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  period_start DATE,
  period_end DATE,
  amount NUMERIC,
  status TEXT DEFAULT 'pending',      -- 'pending', 'completed', 'skipped', 'overdue'
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Features:
- [ ] Flag services as recurring during lead creation / customer edit
- [ ] Auto-generate renewal reminders (30/15/7 days before)
- [ ] Auto-create follow-up lead when renewal is due (optional)
- [ ] Renewal calendar view (monthly grid showing upcoming renewals)
- [ ] Revenue forecasting based on active recurring services
- [ ] Customer LTV calculation: sum of all historical + projected recurring revenue
- [ ] Renewal pipeline with status columns: Upcoming → Contacted → Renewed → Skipped

---

### 2.7 Email Integration
**Time:** 10 hours

#### New Files:
```
components/
├── EmailComposer.tsx                # Rich email compose modal
├── EmailThread.tsx                  # Email conversation thread view
├── EmailTemplateSelector.tsx        # Template picker

lib/
├── emailClient.ts                   # Email sending via Resend/SendGrid API

supabase/
├── functions/send-email/index.ts    # Edge Function for email dispatch

supabase/migrations/
├── 00028_email_integration.sql
```

#### Database Schema:
```sql
-- 00028_email_integration.sql
CREATE TABLE email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  category TEXT,                      -- 'welcome', 'payment_reminder', 'document_request', 'service_update', 'general'
  variables TEXT[],                   -- ['{{client_name}}', '{{service_name}}', '{{due_date}}']
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sent_by UUID REFERENCES profiles(id),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_preview TEXT,
  template_id UUID REFERENCES email_templates(id),
  status TEXT DEFAULT 'sent',         -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  message_id TEXT,                    -- External provider message ID
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Implementation:
- [ ] Use Resend (recommended for simplicity) or SendGrid as email provider
- [ ] Supabase Edge Function handles actual sending (keeps API key server-side)
- [ ] Email composer with template variable auto-fill from lead/customer data
- [ ] Email logs attached to lead/customer activity timeline
- [ ] Bulk email capability from Customers/Leads overview pages
- [ ] Pre-built templates: Welcome, Payment Reminder, Document Request, Service Update, Completion Notification

---

### 2.8 Notification System Enhancement
**Time:** 6 hours

#### New Files:
```
supabase/migrations/
├── 00029_notification_rules.sql

components/
├── NotificationRulesEditor.tsx      # Rules configuration UI
```

#### Database Schema:
```sql
-- 00029_notification_rules.sql
CREATE TABLE notification_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,         -- 'lead_stale', 'payment_overdue', 'sla_breach', 'document_pending', 'target_achieved'
  conditions JSONB DEFAULT '{}',      -- { "days_stale": 2, "amount_threshold": 10000 }
  channels TEXT[] DEFAULT '{"in_app"}', -- 'in_app', 'email', 'whatsapp', 'sms'
  escalation_chain UUID[],           -- [exec_id, manager_id, admin_id] — escalate after each interval
  escalation_interval_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Built-in Rules to Create:
1. Lead untouched 48 hours → notify branch manager
2. Payment overdue 30 days → notify super admin
3. Document pending verification 48 hours → notify admin
4. SLA breach on service delivery → notify branch manager + super admin
5. Target achieved → celebration notification to user + admin
6. New web lead → notify assigned branch
7. Support ticket unresolved 72 hours → escalate

---

### 2.9 "My Day" View for Sales Executives
**Time:** 6 hours

#### New Files:
```
pages/
├── MyDay.tsx                        # Personal daily command center
```

#### Features:
- [ ] Morning checklist layout:
  - Today's follow-ups (sorted by time)
  - Overdue follow-ups (highlighted red)
  - Tasks due today
  - Meetings/appointments
  - Birthdays to wish
  - New leads assigned (since yesterday)
- [ ] Target progress gauge at the top
- [ ] Quick actions: Log Call, Send WhatsApp, Add Note, Mark Done
- [ ] "Plan My Day" AI suggestion (using Gemini): prioritize which leads to contact first based on score + staleness
- [ ] End-of-day summary: auto-generated report of today's activities

#### Sidebar Addition:
- Add "My Day" as the first item in Sales Executive navigation
- Make it the default landing page for Sales Executives (instead of Dashboard)

---

### Phase 2 Verification Checklist:
- [ ] Cmd+K global search finds leads, customers, users across all pages
- [ ] Quick-add lead creates a lead in under 5 seconds
- [ ] Auto-assignment rules correctly route new leads
- [ ] Sales targets display and track correctly for each executive
- [ ] Service delivery pipeline shows step-by-step progress
- [ ] Renewals generate reminders at configured intervals
- [ ] Emails send successfully with template variable substitution
- [ ] Notification rules trigger correctly for stale leads and overdue payments
- [ ] "My Day" view shows all relevant daily items for sales executive

---

## Phase 3 — Growth Features
**Duration:** Weeks 9–14  
**Goal:** Add automation, client-facing tools, and operational features.

---

### 3.1 Client Self-Service Portal
**Time:** 20 hours (separate mini-app)

#### Architecture:
```
client-portal/                       # Separate Vite app (subdomain: portal.24efiling.com)
├── src/
│   ├── pages/
│   │   ├── Login.tsx               # OTP-based phone login
│   │   ├── Dashboard.tsx           # Service status overview
│   │   ├── ServiceStatus.tsx       # Step-by-step delivery tracker
│   │   ├── Documents.tsx           # Upload/download documents
│   │   ├── Invoices.tsx            # View & download invoices/receipts
│   │   ├── Payments.tsx            # Payment history & pay online
│   │   ├── Support.tsx             # Raise/track support tickets
│   │   └── Profile.tsx             # Edit contact details
│   ├── lib/
│   │   └── supabaseClient.ts       # Same Supabase project, different RLS
│   └── App.tsx
```

#### Database Changes:
```sql
-- 00030_client_portal.sql
CREATE TABLE client_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE NOT NULL,
  otp_hash TEXT,
  otp_expires_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Clients can only see their own data
-- New RLS policies on customers, service_deliveries, documents, invoices
-- scoped to client_accounts.customer_id
```

---

### 3.2 Attendance & Leave Management
**Time:** 10 hours

#### New Files:
```
pages/
├── Attendance.tsx                   # Attendance dashboard
├── LeaveManagement.tsx              # Leave request/approval

supabase/migrations/
├── 00031_attendance.sql
```

#### Database Schema:
```sql
-- 00031_attendance.sql
CREATE TABLE attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present',      -- 'present', 'absent', 'half_day', 'wfh', 'on_leave', 'late'
  location_lat NUMERIC,
  location_lng NUMERIC,
  branch_id TEXT,
  notes TEXT,
  UNIQUE(user_id, date)
);

CREATE TABLE leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,           -- 'casual', 'sick', 'earned', 'comp_off', 'unpaid'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',      -- 'pending', 'approved', 'rejected', 'cancelled'
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE leave_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  casual_total INTEGER DEFAULT 12,
  casual_used INTEGER DEFAULT 0,
  sick_total INTEGER DEFAULT 6,
  sick_used INTEGER DEFAULT 0,
  earned_total INTEGER DEFAULT 15,
  earned_used INTEGER DEFAULT 0,
  UNIQUE(user_id, year)
);
```

---

### 3.3 Expense Tracking
**Time:** 8 hours

#### New Files:
```
pages/
├── ExpenseManager.tsx               # Expense logging & approval
├── ProfitLoss.tsx                   # P&L dashboard

supabase/migrations/
├── 00032_expenses.sql
```

#### Database Schema:
```sql
-- 00032_expenses.sql
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,             -- 'salary', 'rent', 'software', 'travel', 'govt_fees', 'utilities', 'marketing', 'misc'
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  branch_id TEXT,
  customer_id UUID REFERENCES customers(id),  -- If expense is on behalf of client
  receipt_url TEXT,
  submitted_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending',      -- 'pending', 'approved', 'rejected', 'reimbursed'
  is_reimbursable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.4 Workflow Automation Engine
**Time:** 12 hours

#### New Files:
```
pages/
├── AutomationRules.tsx              # Visual rule builder

components/
├── AutomationRuleEditor.tsx         # Rule creation form

supabase/migrations/
├── 00033_automation_engine.sql

supabase/functions/
├── run-automations/index.ts         # Edge Function — cron triggered
```

#### Database Schema:
```sql
-- 00033_automation_engine.sql
CREATE TABLE automation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,        -- 'lead_created', 'lead_status_changed', 'payment_received', 'service_completed', 'time_based'
  trigger_conditions JSONB,           -- { "status": "Success", "amount_gt": 5000 }
  actions JSONB NOT NULL,             -- [{ "type": "send_whatsapp", "template": "welcome" }, { "type": "create_task", "content": "..." }]
  delay_minutes INTEGER DEFAULT 0,   -- Wait before executing
  is_active BOOLEAN DEFAULT true,
  run_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE automation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES automation_rules(id),
  trigger_entity_type TEXT,           -- 'lead', 'customer', 'payment'
  trigger_entity_id UUID,
  actions_executed JSONB,
  status TEXT DEFAULT 'success',      -- 'success', 'partial_failure', 'failed'
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT now()
);
```

#### Pre-Built Automations:
| # | Name | Trigger | Action |
|---|------|---------|--------|
| 1 | Welcome Message | Lead created | Send WhatsApp welcome template |
| 2 | Stale Lead Alert | Lead untouched 48h | Notify branch manager |
| 3 | Payment Confirmation | Payment recorded | Send WhatsApp receipt + Email |
| 4 | Document Request | Status → "Documents & Payments" | Send document checklist WhatsApp |
| 5 | Service Complete | Work order completed | Create invoice + notify client |
| 6 | Review Request | Service completed + 7 days | Send testimonial request |
| 7 | SLA Breach | Delivery past deadline | Escalate to super admin |
| 8 | Birthday Wishes | Customer birthday | WhatsApp wish + create task |
| 9 | Renewal Reminder | 30 days before renewal | Create follow-up lead + notify exec |
| 10 | Daily Digest | Every day 9 AM | Email summary to each executive |

---

### 3.5 Document Template System
**Time:** 6 hours

#### New Files:
```
pages/
├── DocumentTemplates.tsx            # Template management

components/
├── TemplateEditor.tsx               # Template editor with variable picker
├── TemplatePreview.tsx              # Live preview with sample data

supabase/migrations/
├── 00034_document_templates.sql
```

#### Database Schema:
```sql
-- 00034_document_templates.sql
CREATE TABLE document_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,             -- 'engagement_letter', 'agreement', 'noc', 'authorization', 'receipt'
  body_html TEXT NOT NULL,
  variables TEXT[],                   -- ['{{client_name}}', '{{service_name}}', '{{date}}', '{{company_gst}}']
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Phase 3 Verification Checklist:
- [ ] Client portal login via OTP works
- [ ] Clients can view their service delivery status
- [ ] Attendance check-in/out records correctly
- [ ] Leave requests flow through approval workflow
- [ ] Expenses can be submitted, approved, and reflected in P&L
- [ ] Automation rules trigger correctly on events
- [ ] Document templates generate correctly with client data

---

## Phase 4 — Integrations & Polish
**Duration:** Weeks 15–20  
**Goal:** Connect external services, optimize mobile, add testing.

---

### 4.1 Payment Gateway (Razorpay)
**Time:** 8 hours

- [ ] Razorpay integration for online payment collection
- [ ] Payment links generated from CRM, sent via WhatsApp/Email
- [ ] Auto-reconciliation: webhook captures payment → updates lead/customer → sends receipt
- [ ] Partial payment support

### 4.2 Cloud Telephony (Exotel)
**Time:** 8 hours

- [ ] Click-to-call from lead/customer pages
- [ ] Auto-log call duration and outcome
- [ ] Call recording storage (link to activity)
- [ ] Missed call alerts as notifications

### 4.3 SMS Gateway (MSG91)
**Time:** 4 hours

- [ ] SMS notification support for critical alerts
- [ ] OTP generation for client portal
- [ ] SMS templates aligned with DLT registration

### 4.4 PWA Setup
**Time:** 4 hours

- [ ] Add `manifest.json` with app name, icons, theme color
- [ ] Register service worker for offline caching
- [ ] Add install prompt for mobile users
- [ ] Cache critical assets and API responses for offline access
- [ ] Push notification support via service worker

### 4.5 CI/CD & Testing
**Time:** 8 hours

- [ ] GitHub Actions workflow:
  ```yaml
  # .github/workflows/ci.yml
  name: CI
  on: [push, pull_request]
  jobs:
    lint-and-build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
        - run: npm ci
        - run: npx tsc --noEmit        # Type check
        - run: npm run build            # Build check
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
        - run: npm ci
        - run: npm test
  ```
- [ ] Install Vitest:
  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
  ```
- [ ] Write unit tests for critical business logic:
  - `lib/scoring.ts` — lead scoring calculations
  - `lib/paymentUtils.ts` — reference number generation
  - `lib/validations/*.ts` — all zod schemas
  - Pricing calculator — discount + GST computations
- [ ] Write integration tests for critical flows:
  - Login → Dashboard load
  - Create Lead → Verify in database
  - Convert Lead → Customer created correctly
  - Payment recording → Totals update correctly
- [ ] Error tracking:
  ```bash
  npm install @sentry/react
  ```
  - Configure Sentry in `index.tsx`
  - Wrap App in `Sentry.ErrorBoundary`

### 4.6 Mobile-Optimized Experience
**Time:** 6 hours

- [ ] Bottom navigation bar component for mobile
- [ ] Card-based layout for data tables on mobile (responsive breakpoint)
- [ ] Swipeable lead cards with quick actions
- [ ] Pull-to-refresh on list pages
- [ ] Touch-friendly spacing on all interactive elements

---

## Phase 5 — Intelligence & Future
**Duration:** Weeks 21+  
**Goal:** Make the CRM predictive and intelligent.

---

### 5.1 ML-Based Lead Scoring
- [ ] Train model on historical lead data (features: source, service, response time, activity count, document count → outcome: converted/lost)
- [ ] Deploy as Supabase Edge Function or external API
- [ ] Replace rule-based scoring with ML predictions
- [ ] Show confidence score and top contributing factors

### 5.2 Revenue Forecasting
- [ ] Time-series forecasting based on historical monthly revenue
- [ ] Pipeline-weighted forecast (lead value × probability per stage)
- [ ] Renewal-based recurring revenue projection
- [ ] Visual forecast chart on Revenue Dashboard

### 5.3 Churn Prediction
- [ ] Identify customers likely to not renew
- [ ] Factors: engagement frequency, payment delays, support tickets, service completion time
- [ ] Early warning dashboard for at-risk customers
- [ ] Auto-trigger retention workflow (special offers, check-in calls)

### 5.4 GST Compliance Calendar
- [ ] Per-client GST filing deadline tracker
- [ ] GSTR-1, GSTR-3B, GSTR-9 due dates auto-calculated
- [ ] Filing status per client per period
- [ ] Bulk reminder generation before deadlines
- [ ] Late fee calculator for missed filings

### 5.5 Internal Team Chat
- [ ] Real-time messaging using Supabase Realtime
- [ ] 1:1 and group channels
- [ ] File sharing
- [ ] @mention notifications
- [ ] Link messages to leads/customers

### 5.6 Multi-Company Support
- [ ] Tenant isolation at database level
- [ ] Company switcher in header
- [ ] Per-company settings, branding, and service catalog
- [ ] Cross-company reporting for the owner

---

## Sidebar Navigation After All Phases

### Super Admin (Final State):
```
📊 Dashboard
📅 My Day
🎯 Targets

── SALES ──
📋 All Leads
➕ Create Lead
👤 My Leads
📊 Lead Workflow
👥 Customers
🔄 Renewals

── SERVICE DELIVERY ──
🔧 Service Tracker
📝 Work Orders
📄 Work Status

── ANALYTICS ──
💰 Revenue Dashboard
📈 Employee Performance
📊 Reports & Analytics
💵 P&L Dashboard

── MANAGEMENT ──
🏢 Branches
🏙️ Cities
👥 Users
👥 Teams
📝 Document Verification
📋 Attendance

── OPERATIONS ──
🧾 Invoices
💳 Payments
💸 Expenses
⏰ Reminders
📢 Announcements
🎫 Support Center
📝 Employee Feedback

── MARKETING ──
🎁 Offers
🌐 Website Hub
  ├── Overview
  ├── Web Leads
  ├── Blogs
  ├── Testimonials
  └── Services

── COMMUNICATION ──
💬 WhatsApp
📧 Email Center

── AUTOMATION ──
⚡ Automation Rules
🔀 Auto-Assignment
📄 Document Templates

── SYSTEM ──
🔔 Notifications
📜 Activity Feed
⚙️ Settings
```

### Sales Executive (Final State):
```
📅 My Day              ← NEW (default landing page)
📊 Dashboard
🎯 My Targets          ← NEW

── SALES ──
📋 All Leads
➕ Create Lead (+ Quick Add)
👤 My Leads
📊 Lead Workflow
👥 Customers
🔄 My Renewals          ← NEW

── OPERATIONS ──
🧾 Invoices
📞 Follow-ups
📂 Client Documents
⏰ Reminders
📝 Work Status
📢 Announcements
🎫 Support
📝 Feedback
📝 Work Orders

── ANALYTICS ──
💰 Revenue
📈 Performance
📊 Reports

── COMMUNICATION ──
💬 WhatsApp
📧 Email               ← NEW

── SYSTEM ──
🔔 Notifications
📋 Attendance           ← NEW
```

---

## Summary — Total New Files to Create

| Phase | New Files | New DB Tables | Est. Hours |
|-------|:-:|:-:|:-:|
| Phase 1 — Foundation | ~35 files | 0 new tables, indexes + migrations | ~32 hrs |
| Phase 2 — Core Gaps | ~20 files | 8 new tables | ~65 hrs |
| Phase 3 — Growth | ~15 files | 8 new tables | ~56 hrs |
| Phase 4 — Integrations | ~10 files | 2 new tables | ~38 hrs |
| Phase 5 — Intelligence | ~15 files | 4 new tables | ~40 hrs |
| **TOTAL** | **~95 files** | **~22 new tables** | **~231 hrs** |

---

> **Note:** This plan is designed to be executed sequentially — each phase builds on the previous one. However, within each phase, tasks can be parallelized by different developers. Phase 1 MUST be completed before starting Phase 2, as it establishes the code architecture that all subsequent features depend on.

---

*Last updated: July 21, 2026*
