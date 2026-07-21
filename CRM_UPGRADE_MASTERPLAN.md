# 🏢 24eFiling CRM — Complete Upgrade Masterplan

> **Audit Date:** July 21, 2026  
> **Audited By:** Owner / Super Admin perspective  
> **Scope:** Full codebase — 39 pages, 60+ components, 74 SQL migrations, 135KB API layer, complete Supabase backend  
> **Philosophy:** "If I'm running this company and living inside this CRM every day, what do I need to never leave it?"

---

## 📊 Current State Summary

| Metric | Count |
|---|---|
| Pages | 39 |
| Components | 60+ |
| SQL Migration Files | 74 (no migration system) |
| Types/Interfaces | 48 |
| Main API Hook | 1 file, ~2,700 lines, 135KB |
| Database Tables | ~30+ |
| Roles | 3 active (Super Admin, Admin/Branch Manager, Sales Executive) |
| Total Codebase | ~1.2MB TypeScript/TSX |

### What's Already Well-Built ✅
- Complete lead-to-customer conversion pipeline with transactional rollback
- Role-based access control with Supabase RLS
- Real-time data sync via Supabase channels
- SWR local storage caching for instant UI
- Comprehensive service catalog with dynamic pricing, GST, and discounts
- WhatsApp integration with AI (Gemini) smart replies
- PDF invoice generation (two engines)
- Multi-branch, multi-city organizational hierarchy
- Kanban board, activity feed, document verification
- Employee performance reviews and leaderboards
- Web lead capture and conversion workflow
- Work orders, support tickets, knowledge base
- Offer/promo code system with expiry tracking
- Birthday scheduler and offer expiry alerts

---

## 🔴 PRIORITY 1 — Critical Fixes & Technical Debt

> Things that are broken, fragile, or will bite you as you scale.

### 1.1 Split the Monolithic `useApi.ts` (135KB, ~2,700 lines)
**Problem:** Every entity's CRUD logic (leads, customers, invoices, tasks, offers, blogs, work orders, support tickets, feedback, WhatsApp, etc.) lives in ONE file. Any change risks breaking unrelated features. It's impossible to code-review.

**Solution:** Split into domain-specific hooks:
```
hooks/
├── useLeadsApi.ts          # Lead CRUD, scoring, conversion
├── useCustomersApi.ts       # Customer CRUD, import, export
├── useUsersApi.ts           # User management, transfers, deletion
├── useInvoicesApi.ts        # Invoice CRUD, payments
├── useServicesApi.ts        # Service catalog, sub-services
├── useTasksApi.ts           # Tasks, activities, documents
├── useOffersApi.ts          # Offers, promo codes
├── useWebApi.ts             # Web leads, blogs, testimonials
├── useWorkOrdersApi.ts      # Work orders, notes
├── useSupportApi.ts         # Tickets, KB articles, feedback
├── useWhatsAppApi.ts        # Conversations, messages, templates
├── useBranchesApi.ts        # Branches, cities
├── useNotificationsApi.ts   # Notifications, announcements
├── useSettingsApi.ts        # Organization settings, policies
├── useApiCore.ts            # Shared Supabase client, cache, realtime
```

### 1.2 Split `CreateLead.tsx` (1,541 lines, 95KB)
**Problem:** Lead creation wizard + dynamic pricing calculator + live invoice preview all in one component. Extremely hard to maintain.

**Solution:** Extract into:
- `CreateLeadForm.tsx` — Form fields and validation
- `ServiceSetBuilder.tsx` — Service selection, quantity, pricing
- `PricingCalculator.tsx` — Discount, tax, total calculations
- `LiveInvoicePreview.tsx` — Real-time proforma preview
- `useLeadFormState.ts` — Form state management hook

### 1.3 Split `LeadDetail.tsx` (1,141 lines, 69KB)
**Solution:** Extract tab sections into:
- `LeadOverviewTab.tsx`, `LeadActivitiesTab.tsx`, `LeadDocumentsTab.tsx`
- `LeadTasksTab.tsx`, `LeadPaymentsTab.tsx`, `LeadScoreCard.tsx`

### 1.4 Eliminate `any` Type Assertions
**Problem:** Extended tables (`invoices`, `work_orders`, `support_tickets`, `branches`, `cities`) use `(supabase.from(...) as any)`, completely bypassing TypeScript safety.

**Solution:**
- Generate proper Supabase types using `supabase gen types typescript`
- Create a proper `database.types.ts` that covers ALL tables
- Remove every `as any` cast

### 1.5 Implement a Database Migration System
**Problem:** 74 loose SQL files in the root directory with no order, no version tracking, no rollback capability. You have `FIX_RLS_COMPREHENSIVE.sql`, `FIX_RLS_FINAL_V3.sql`, `FIX_RLS_ULTIMATE.sql` — three files trying to fix the same thing.

**Solution:**
- Use Supabase CLI migrations (`supabase migration new`, `supabase db push`)
- Move all SQL into `supabase/migrations/` with timestamps
- Delete the 74 root-level SQL files after consolidation
- Add migration documentation explaining what each does

### 1.6 Remove Dead / Empty Files
- `components/Dashboard.tsx` — 0 bytes
- `components/DashboardMetrics.tsx` — 0 bytes
- `backend/server.js` — essentially blank placeholder
- `App.tsx.backup` — stale backup file
- Various cleanup scripts (`clean.cjs`, `clean2.py`, `clean3.py`, `fix.py`, `migrate_app.py`)

### 1.7 Move Credentials Out of Source Code
**Problem:** `env.tsx` contains hardcoded Supabase URL and anon key directly in the codebase.

**Solution:**
- Use proper `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Add `.env` to `.gitignore`
- Use `import.meta.env.VITE_*` in Vite

### 1.8 Consolidate Duplicate Invoice Engines
**Problem:** Two completely separate PDF generation systems:
1. `InvoicePDF.tsx` — uses `@react-pdf/renderer` (stream-based)
2. `StandardInvoice.tsx` — uses `html2canvas` + `jsPDF` (screenshot-based)

**Solution:** Pick one engine (recommend `@react-pdf/renderer` for quality/consistency) and consolidate.

### 1.9 Add Form Validation Library
**Problem:** All forms use manual `useState` + inline validation with `alert()` popups. No consistent validation patterns.

**Solution:**
- Adopt `react-hook-form` + `zod` for schema-based validation
- Create reusable form field components with error display
- Replace all `alert()` and `window.confirm()` with proper UI dialogs

### 1.10 Fix Client-Side Schedulers
**Problem:** Birthday scheduler and offer expiry scheduler only run when someone has the app open in their browser. If nobody opens the CRM on a Saturday, no birthday wishes go out.

**Solution:**
- Move to Supabase `pg_cron` for database-level scheduled jobs
- Or use Supabase Edge Functions with scheduled invocation
- Keep client-side as a backup notification layer only

---

## 🟠 PRIORITY 2 — Missing Core Features (As The Owner, I Need These)

### 2.1 📧 Email Integration
**Current State:** Zero email functionality. Can't send, receive, or track emails.

**What's Needed:**
- Send emails from within lead/customer detail pages
- Email templates for common communications (welcome, payment reminder, service update, document request)
- Email tracking (opened, clicked, replied)
- Auto-attach email conversations to lead/customer activity timeline
- Bulk email capability for announcements
- Integration options: Gmail API, SendGrid, or Resend

### 2.2 📞 Call Logging & Telephony
**Current State:** Activity feed supports "Call" type but it's just a text note. No actual call integration.

**What's Needed:**
- Click-to-call from lead/customer pages
- Auto-log call duration, outcome (connected, no answer, busy, callback)
- Call recording storage (optional, compliance-dependent)
- Call disposition notes linked to activity timeline
- Missed call alerts as notifications
- Daily call targets per sales executive
- Integration: Exotel, Knowlarity, or Twilio for Indian market

### 2.3 📅 Meeting & Calendar System
**Current State:** Follow-ups exist as dates, but there's no actual calendar/scheduling system.

**What's Needed:**
- Internal calendar view (daily, weekly, monthly) per user
- Meeting scheduling with client (with Google Calendar / Outlook sync)
- Meeting room booking (if applicable)
- Video call links auto-generation (Google Meet / Zoom)
- Meeting notes and outcome logging
- Calendar overlay showing follow-ups + meetings + reminders + birthdays

### 2.4 🔄 Service Delivery Pipeline (Post-Sales)
**Current State:** Once a lead converts to customer, there's no structured workflow tracking the actual service delivery (e.g., GST registration steps, ITR filing stages).

**What's Needed:**
- Service-specific delivery checklists (e.g., GST Registration: Collect documents → Apply on portal → ARN generated → GSTIN received)
- Stage-wise tracking per service per customer
- Assignment of service execution to operations/CA team (not just sales)
- SLA timers per service type (e.g., GST registration should complete in 7 working days)
- Client notification at each stage ("Your GSTIN has been generated")
- Delivery dashboard showing bottlenecks and overdue services

### 2.5 🔁 Recurring Services & Renewals
**Current State:** No concept of recurring services. Once a service is "completed," it disappears.

**What's Needed:**
- Flag services as recurring (annual ITR filing, GST return filing monthly/quarterly, trademark renewal every 10 years)
- Auto-generate renewal reminders 30/60/90 days before due date
- Renewal pipeline separate from new lead pipeline
- Revenue forecasting based on renewal calendar
- Auto-create follow-up leads for renewals
- Track customer lifetime value (LTV) based on recurring revenue

### 2.6 💰 Expense Tracking & Profitability
**Current State:** Revenue tracking exists. Expense tracking is completely absent.

**What's Needed:**
- Operational expense logging (rent, salaries, software subscriptions, government fees)
- Per-service cost tracking (government fees paid on behalf of client)
- Branch-level P&L statements
- Profit margin per service type
- Reimbursement requests from employees
- Monthly/quarterly financial summary for the owner

### 2.7 🎯 Sales Targets & Incentive Management
**Current State:** Employee performance shows conversion rates and revenue, but there are no configurable targets.

**What's Needed:**
- Set monthly/quarterly targets per sales executive (lead count, revenue, conversion rate)
- Set branch-level targets
- Real-time target vs. achievement dashboard
- Incentive/commission calculation rules (e.g., 5% commission on revenue above ₹1L)
- Incentive payout tracking
- Gamification: badges, streaks, milestones
- Leaderboard with rewards visibility

### 2.8 🤖 Automated Lead Assignment Rules
**Current State:** Leads are manually assigned via dropdown. No automation.

**What's Needed:**
- Round-robin auto-assignment within a branch
- Skill-based routing (e.g., trademark leads go to executives with trademark skills)
- Load-balanced assignment (assign to executive with fewest active leads)
- Source-based routing (web leads go to specific team)
- Geography-based routing (leads from Hyderabad go to LB Nagar branch)
- Re-assignment rules for leads untouched for X days
- Configurable rules engine in Settings

### 2.9 📱 Client Self-Service Portal
**Current State:** Clients have zero visibility into their service status. They have to call/WhatsApp to check.

**What's Needed:**
- Separate client-facing portal (can be a subdomain: `portal.24efiling.com`)
- Client login via OTP (phone number)
- View service status and progress stages
- Upload requested documents
- View and download invoices/receipts
- Raise support tickets
- View payment history and pending dues
- Receive notifications about service updates

### 2.10 📄 Document Template System
**Current State:** Documents are uploaded manually. No template generation.

**What's Needed:**
- Auto-generate engagement letters, service agreements, NOC letters
- Template variables auto-filled from lead/customer data (`{{client_name}}`, `{{service_name}}`, `{{gst_number}}`)
- E-signature integration (optional)
- Template library managed by Super Admin
- Version control on templates
- Bulk document generation for compliance

### 2.11 🔔 Smart Notification System
**Current State:** Notifications exist but are basic text alerts. No channels, no escalation.

**What's Needed:**
- Multi-channel: In-app + Email + WhatsApp + SMS
- Notification rules engine (e.g., "If lead untouched for 48 hours, notify branch manager")
- Escalation chains (executive → branch manager → super admin)
- Digest mode (daily summary email instead of individual alerts)
- Snooze and mute capabilities
- Priority-based notification sounds/badges
- Push notifications (PWA or mobile app)

### 2.12 📋 Attendance & Leave Management
**Current State:** `is_online` and `last_seen` exist but there's no formal attendance tracking.

**What's Needed:**
- Daily check-in/check-out (can be geo-fenced for branch verification)
- Leave request and approval workflow
- Leave balance tracking (casual, sick, earned)
- Attendance calendar per employee
- Late arrival tracking
- Half-day and work-from-home markers
- Integration with payroll for attendance-based deductions
- Monthly attendance report for HR

### 2.13 💬 Internal Team Chat / Messaging
**Current State:** WhatsApp integration is for client communication only. No internal messaging.

**What's Needed:**
- Internal chat between team members (1:1 and group)
- Chat channels per branch or department
- File sharing within chat
- @mentions and tagging
- Link conversations to specific leads/customers
- Reduce dependency on personal WhatsApp groups for internal communication

### 2.14 🗃️ Bulk Import & Data Management
**Current State:** Customer import exists (chunks of 50) but lead import is missing.

**What's Needed:**
- CSV/Excel import for leads (with field mapping UI)
- Duplicate detection on import (by phone, email, PAN)
- Data de-duplication tool for existing records
- Merge duplicate leads/customers
- Data archival for old/completed records (move to archive table, not delete)
- Data export with custom field selection

### 2.15 🧾 GST Return & Compliance Tracker
**Current State:** GST invoicing exists but no compliance tracking.

**What's Needed (specific to 24eFiling's business):**
- Track GST filing deadlines for each client (GSTR-1, GSTR-3B, annual return)
- Auto-reminders before filing deadlines
- Filing status tracker (Not Started, In Progress, Filed, Acknowledged)
- Penalty/late fee calculator for missed deadlines
- Compliance dashboard showing which clients are up-to-date vs overdue
- Integration roadmap: GST portal API (when available)

---

## 🟡 PRIORITY 3 — Role-Specific Improvements

### 3.1 Super Admin (Owner) Improvements

| # | Feature | Current State | Needed |
|---|---------|--------------|--------|
| 1 | **Executive Summary Dashboard** | Basic KPI cards | One-screen "state of the business" — revenue, pipeline value, overdue payments, team performance, service delivery status, all at a glance |
| 2 | **Branch Comparison** | Branch performance table exists | Side-by-side branch comparison with drill-down, P&L per branch, headcount efficiency |
| 3 | **Cash Flow Forecasting** | None | Project next 30/60/90 day revenue based on pipeline + renewals |
| 4 | **Custom Dashboard Builder** | Widget toggles exist | Drag-and-drop dashboard with custom KPI cards, chart types, and data sources |
| 5 | **Bulk Operations** | Limited bulk actions | Bulk reassign leads across branches, bulk status updates, bulk communication |
| 6 | **Audit Trail Enhancement** | Activity feed exists | Full audit trail with before/after diff on every record change, exportable for compliance |
| 7 | **Data Retention Policies** | None | Auto-archive leads older than X months, GDPR-style data deletion requests |
| 8 | **System Health Monitor** | None | API response times, error rates, storage usage, active user count, real-time system status |
| 9 | **Role & Permission Granularity** | 3 broad roles | Granular permission matrix — control access to individual pages, actions (view/create/edit/delete) per role. Support custom roles beyond the 3 existing ones |
| 10 | **Multi-Company / White-Label** | Single company | Future-proof: support multiple company profiles under one instance (if you expand or franchise) |

### 3.2 Admin / Branch Manager Improvements

| # | Feature | Current State | Needed |
|---|---------|--------------|--------|
| 1 | **Branch Dashboard** | Filtered view of global dashboard | Dedicated branch command center with branch-specific KPIs, team status, pending actions |
| 2 | **Team Workload View** | Basic performance cards | Visual workload heatmap — who's overloaded, who's idle, real-time lead distribution |
| 3 | **Escalation Management** | None | View escalated leads/tickets, auto-escalation rules, SLA breach alerts |
| 4 | **Branch-Level Targets** | None | Set and track branch revenue/conversion targets, see gap analysis |
| 5 | **Approval Workflows** | None | Approve discounts above X%, approve refunds, approve large expenses |
| 6 | **Team Attendance** | None | View team check-in/out status, leave calendar, coverage planning |
| 7 | **Daily Standup Report** | None | Auto-generated daily summary: yesterday's activity, today's plan, blockers — per team member |
| 8 | **Lead Transfer Between Branches** | Reassignment exists | Formal transfer workflow with reason tracking and handoff notes |
| 9 | **Document Approval Queue** | Basic approve/reject | Batch approval, priority queue, auto-escalate if pending > 48 hours |
| 10 | **Branch Announcements** | Global announcements | Branch-specific notice board visible only to branch team |

### 3.3 Sales Executive Improvements

| # | Feature | Current State | Needed |
|---|---------|--------------|--------|
| 1 | **My Day View** | Dashboard with agenda card | Focused "today" screen: calls to make, follow-ups due, meetings, tasks, targets — one scrollable checklist |
| 2 | **Quick Add Lead** | Full form required | Quick-add modal: just name + phone + service → create in 5 seconds, fill details later |
| 3 | **Follow-Up Sequences** | Manual follow-up dates | Automated sequences: "After first contact → wait 2 days → send template email → wait 3 days → WhatsApp reminder → escalate if no response" |
| 4 | **Personal Target Tracker** | Can see own metrics | Visual target gauge: "₹3.2L / ₹5L this month" with daily run-rate |
| 5 | **Lead Score Explanations** | Score exists | Show WHY a lead scored 75 — "High priority (+25), 3 activities (+15), documents uploaded (+10), advance paid (+25)" |
| 6 | **Quick Notes** | Activity log | Voice-to-text note capture, quick tags (#callback, #interested, #price-sensitive) |
| 7 | **Offline Mode** | None | Cache critical data for offline access, sync when back online (important for field sales) |
| 8 | **Competition Tracker** | None | Log competitor quotes/offers mentioned by leads for pricing intelligence |
| 9 | **Email/WhatsApp Templates** | WhatsApp templates exist | Personal template library for common scenarios: intro, pricing, document request, thank you |
| 10 | **Commission Calculator** | None | Real-time view of earned commission based on closed deals this month |

---

## 🔵 PRIORITY 4 — UX/UI Improvements

### 4.1 Design System Fixes

| # | Issue | Solution |
|---|-------|----------|
| 1 | **Inconsistent Charts** | Custom SVG charts in `components/charts/` vs Recharts in `StatCard.tsx`. Standardize on Recharts everywhere for consistent tooltips, animations, and responsiveness |
| 2 | **No Toast Component** | Notifications passed imperatively via props. Add Radix Toast or Sonner for consistent toast notifications |
| 3 | **No Tooltip Component** | Missing hover tooltips on icons and buttons. Add Radix Tooltip primitive |
| 4 | **No Design Tokens** | CSS variables exist but no centralized token system. Create `tokens.ts` with typography scale, spacing scale, z-index layers, color palette |
| 5 | **Color Contrast Issues** | `text-slate-400/500` on dark backgrounds may fail WCAG AA. Audit and fix all contrast ratios |
| 6 | **Native Browser Dialogs** | `window.confirm()` and `alert()` used in multiple pages. Replace with `ConfirmationDialog` component everywhere |

### 4.2 Navigation & Layout

| # | Improvement | Details |
|---|-------------|---------|
| 1 | **Collapsible Sidebar** | Add mini/icon-only mode for more screen real estate on data-heavy pages |
| 2 | **Breadcrumb Navigation** | Add breadcrumbs on detail pages (Dashboard > Leads > Lead #E-042-2026) |
| 3 | **Global Search** | Cmd+K / Ctrl+K spotlight search across leads, customers, invoices, users — with recent searches and quick actions |
| 4 | **Keyboard Shortcuts** | Power-user shortcuts: `N` for new lead, `S` for search, `←/→` for sidebar navigation |
| 5 | **Tab Persistence** | When navigating away and back, remember which tab/filter was active |
| 6 | **Favorites/Pinned Pages** | Let users pin frequently used pages to sidebar top |
| 7 | **Recent Items** | Show recently viewed leads/customers in sidebar or header for quick access |

### 4.3 Data Tables

| # | Improvement | Details |
|---|-------------|---------|
| 1 | **Saved Filters/Views** | Let users save filter combinations as named views ("My Hot Leads", "Overdue Payments") |
| 2 | **Column Resizing** | Allow drag-to-resize table columns |
| 3 | **Inline Editing** | Quick-edit cells directly in table (status, priority, assigned to) without opening detail page |
| 4 | **Row Selection Memory** | Remember selected rows across pagination |
| 5 | **Sticky Headers** | Keep table header visible while scrolling long lists |
| 6 | **Density Toggle** | Compact/comfortable/spacious row height toggle |

### 4.4 Mobile Experience

| # | Improvement | Details |
|---|-------------|---------|
| 1 | **Progressive Web App (PWA)** | Add service worker, manifest.json, offline caching — installable on phone |
| 2 | **Mobile-First Lead Card** | Swipeable lead cards with quick actions (call, WhatsApp, status change) |
| 3 | **Bottom Navigation Bar** | On mobile, show bottom nav with key actions (Dashboard, Leads, Create, Notifications) |
| 4 | **Pull-to-Refresh** | Native-feeling data refresh on mobile |
| 5 | **Responsive Data Tables** | Card-based layout on mobile instead of horizontal-scrolling tables |

---

## 🟣 PRIORITY 5 — Analytics & Business Intelligence

### 5.1 Enhanced Reports

| # | Report | Details |
|---|--------|---------|
| 1 | **Lead Source ROI** | Cost per lead by source, conversion rate by source, revenue per source — know where to spend marketing money |
| 2 | **Service Profitability** | Revenue vs. cost per service type, most/least profitable services |
| 3 | **Sales Cycle Analysis** | Average time from lead creation to conversion, by service/source/executive |
| 4 | **Lost Lead Analysis** | Why leads are lost (competitor, price, not interested), patterns and trends |
| 5 | **Customer Cohort Analysis** | Retention rates by enrollment month, repeat purchase rates |
| 6 | **Revenue Aging Report** | Outstanding dues by age (0-30, 30-60, 60-90, 90+ days) |
| 7 | **Employee Utilization** | Hours logged vs. capacity, productive time percentage |
| 8 | **Branch Comparison Matrix** | Multi-metric comparison across all branches in one view |
| 9 | **Trend Analysis** | Month-over-month, quarter-over-quarter trends for all key metrics |
| 10 | **Custom Report Builder** | Drag-and-drop report creator with any data dimensions |

### 5.2 AI/ML Enhancements

| # | Feature | Details |
|---|---------|---------|
| 1 | **Lead Scoring v2** | ML-based scoring using historical conversion data instead of rule-based weights |
| 2 | **Churn Prediction** | Identify customers likely to not renew services |
| 3 | **Revenue Forecasting** | Predictive revenue based on pipeline probability + historical patterns |
| 4 | **Smart Follow-Up Timing** | AI suggests best time to call/message based on past engagement |
| 5 | **Anomaly Detection** | Auto-detect unusual patterns (sudden spike in lost leads, revenue drops) |
| 6 | **AI Copilot Enhancements** | Current copilot exists — enhance with: "Summarize this lead's history", "Draft a follow-up email", "What should I prioritize today?" |

---

## ⚫ PRIORITY 6 — Security, Performance & Infrastructure

### 6.1 Security

| # | Item | Details |
|---|------|---------|
| 1 | **Two-Factor Authentication** | Settings page has 2FA UI but it needs actual TOTP implementation |
| 2 | **Session Management** | Show active sessions, ability to force-logout other sessions |
| 3 | **IP Whitelisting** | Optional: restrict CRM access to office IPs |
| 4 | **Password Policies** | Enforce minimum complexity, expiry, prevent reuse |
| 5 | **Role-Based Page Access** | Granular per-page, per-action permission checks (not just 3 broad roles) |
| 6 | **Storage Bucket Security** | Currently ALL storage buckets are public. Documents and invoices should be **private** with signed URLs |
| 7 | **API Rate Limiting** | Prevent abuse of Supabase queries, especially from the client side |
| 8 | **Data Encryption** | Encrypt sensitive fields (Aadhar, PAN) at rest |
| 9 | **GDPR/Data Privacy** | Right to deletion, data export for customers, consent tracking |
| 10 | **Vulnerability Scanning** | Add `npm audit` to CI, regularly update dependencies |

### 6.2 Performance

| # | Item | Details |
|---|------|---------|
| 1 | **Server-Side Pagination** | Currently fetches ALL leads/customers client-side and paginates in browser. Move to Supabase `.range()` queries with server-side pagination for tables |
| 2 | **Virtual Scrolling** | For lists with 1000+ items, use virtual scrolling (`react-virtual`) |
| 3 | **Image Optimization** | Lazy-load images, use WebP format, thumbnail generation for avatars |
| 4 | **Bundle Size Audit** | Analyze Vite bundle, code-split large dependencies (xlsx, jspdf, recharts) |
| 5 | **Database Indexing** | Add indexes on frequently queried columns: `leads.assigned_to`, `leads.branch_id`, `leads.status`, `customers.lead_id`, `activities.lead_id` |
| 6 | **React Query Migration** | `@tanstack/react-query` is installed but underutilized. Migrate from custom SWR cache to proper React Query for better cache invalidation, background refetching, and devtools |
| 7 | **Memoization** | Large computed arrays (filtered leads, dashboard metrics) should use `useMemo` to prevent re-computation on every render |

### 6.3 Infrastructure & DevOps

| # | Item | Details |
|---|------|---------|
| 1 | **CI/CD Pipeline** | GitHub Actions or similar: lint → type-check → test → build → deploy |
| 2 | **Automated Testing** | Unit tests for business logic (scoring, pricing calculations), E2E tests for critical flows (login, create lead, convert to customer) |
| 3 | **Error Tracking** | Integrate Sentry or similar for production error monitoring |
| 4 | **Logging** | Structured logging for debugging production issues |
| 5 | **Staging Environment** | Separate staging Supabase project for testing changes before production |
| 6 | **Database Backups** | Automated daily backups beyond Supabase's built-in (export to external storage) |
| 7 | **Uptime Monitoring** | Monitor CRM availability and get alerted on downtime |

---

## 🟤 PRIORITY 7 — Integrations & Automations

### 7.1 Third-Party Integrations

| # | Integration | Purpose |
|---|-------------|---------|
| 1 | **Google Workspace** | Gmail (send/track emails), Calendar (meetings), Drive (document storage) |
| 2 | **Tally / Zoho Books** | Accounting sync — auto-push invoices and payments |
| 3 | **Razorpay / PayU** | Online payment collection with auto-reconciliation |
| 4 | **India SMS Gateway** | MSG91 or Twilio for SMS notifications and OTP |
| 5 | **Exotel / Knowlarity** | Cloud telephony for click-to-call and call tracking |
| 6 | **Zapier / Make** | No-code automation connector for 3rd party workflows |
| 7 | **Google Analytics** | Track website lead form conversions |
| 8 | **IndiaMART / JustDial** | Auto-capture leads from listing platforms |
| 9 | **DigiLocker** | Document verification via government API |
| 10 | **GST Portal API** | Auto-verify GSTIN, auto-file returns (when API available) |

### 7.2 Workflow Automations

| # | Automation | Trigger → Action |
|---|------------|-----------------|
| 1 | **Auto-Welcome Message** | New lead created → Send WhatsApp welcome template |
| 2 | **Stale Lead Alert** | Lead untouched 48 hours → Notify branch manager |
| 3 | **Payment Confirmation** | Payment recorded → Send receipt via WhatsApp + Email |
| 4 | **Document Request** | Lead moves to "Documents & Payments" → Send document checklist |
| 5 | **Service Completion** | Work order completed → Create invoice + notify client |
| 6 | **Review Request** | Service completed + 7 days → Ask client for testimonial |
| 7 | **SLA Breach** | Service delivery past deadline → Escalate to super admin |
| 8 | **Birthday Wishes** | Customer birthday → Send personalized WhatsApp + create task |
| 9 | **Renewal Reminder** | 30 days before renewal → Create follow-up lead + notify executive |
| 10 | **Daily Digest** | Every morning 9 AM → Email summary to each executive: today's follow-ups, pending tasks, targets |

---

## 📋 PRIORITY 8 — Additional Missing Pages/Modules

### New pages that should be added:

| # | Page | For Role | Purpose |
|---|------|----------|---------|
| 1 | **My Day** | Sales Exec | Personal daily command center — everything due today |
| 2 | **Targets Dashboard** | All | Monthly/quarterly targets vs achievement with gauges |
| 3 | **Service Delivery Tracker** | Admin, SA | Post-sales service execution pipeline |
| 4 | **Renewals Pipeline** | All | Upcoming renewals calendar and pipeline |
| 5 | **Expense Manager** | All | Log and approve expenses, reimbursements |
| 6 | **Attendance** | All | Check-in/out, leave management |
| 7 | **Internal Chat** | All | Team messaging and collaboration |
| 8 | **Client Portal Admin** | SA | Manage client portal access and settings |
| 9 | **Compliance Calendar** | Admin, SA | GST/IT filing deadlines across all clients |
| 10 | **Integration Settings** | SA | Configure all third-party integrations |
| 11 | **Automation Rules** | SA | Visual rule builder for workflow automations |
| 12 | **Training / Onboarding** | All | New employee training modules and checklists |
| 13 | **Asset Management** | SA, Admin | Tables exist but no dedicated page with proper UI |
| 14 | **Refund Management** | SA, Admin | Track refund requests, approvals, processing |
| 15 | **Profit & Loss** | SA | Branch and company-level P&L dashboard |

---

## 🗓️ Suggested Implementation Phases

### Phase 1 — Foundation (Weeks 1-3)
> Fix what's broken. Clean the house.

- [ ] Split `useApi.ts` into domain hooks
- [ ] Split `CreateLead.tsx` and `LeadDetail.tsx`
- [ ] Eliminate all `any` type assertions
- [ ] Set up database migration system
- [ ] Move credentials to `.env`
- [ ] Remove dead files
- [ ] Consolidate invoice engines
- [ ] Add `react-hook-form` + `zod`
- [ ] Fix storage bucket permissions (make private)
- [ ] Add proper toast/tooltip components

### Phase 2 — Core Gaps (Weeks 4-8)
> Build the features that matter most for daily operations.

- [ ] Email integration
- [ ] Call logging
- [ ] Automated lead assignment rules
- [ ] Service delivery pipeline
- [ ] Sales targets & tracking
- [ ] Quick-add lead
- [ ] Global search (Cmd+K)
- [ ] Saved filter views
- [ ] Server-side pagination
- [ ] PWA setup

### Phase 3 — Growth Features (Weeks 9-14)
> Scale the business with automation and intelligence.

- [ ] Recurring services & renewals
- [ ] Client self-service portal
- [ ] Attendance & leave management
- [ ] Expense tracking
- [ ] Workflow automation engine
- [ ] Document template system
- [ ] Smart notification system with escalation
- [ ] Lead source ROI reporting
- [ ] Enhanced AI copilot

### Phase 4 — Integrations & Polish (Weeks 15-20)
> Connect everything and make it premium.

- [ ] Payment gateway integration (Razorpay)
- [ ] Cloud telephony integration (Exotel)
- [ ] SMS gateway integration
- [ ] Tally/accounting sync
- [ ] Internal team chat
- [ ] Custom report builder
- [ ] Mobile-optimized experience
- [ ] CI/CD pipeline
- [ ] Automated testing
- [ ] Error tracking (Sentry)

### Phase 5 — Intelligence & Future (Weeks 21+)
> Make the CRM smarter than you.

- [ ] ML-based lead scoring
- [ ] Churn prediction
- [ ] Revenue forecasting
- [ ] GST compliance tracker
- [ ] Multi-company support
- [ ] Client portal v2 with document signing
- [ ] Offline mode for field sales
- [ ] Advanced analytics & BI

---

## 📈 Impact Scoring

| Feature | Business Impact | User Impact | Effort | Priority Score |
|---------|:-:|:-:|:-:|:-:|
| Split `useApi.ts` | ⭐⭐ | ⭐⭐⭐⭐⭐ | Medium | 🔴 Critical |
| Email Integration | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | High | 🔴 Critical |
| Service Delivery Pipeline | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | High | 🔴 Critical |
| Automated Lead Assignment | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Medium | 🔴 Critical |
| Sales Targets | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Medium | 🟠 High |
| Recurring Services | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Medium | 🟠 High |
| Server-Side Pagination | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Medium | 🟠 High |
| Client Portal | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Very High | 🟡 Medium |
| Expense Tracking | ⭐⭐⭐⭐ | ⭐⭐⭐ | Medium | 🟡 Medium |
| Internal Chat | ⭐⭐⭐ | ⭐⭐⭐⭐ | High | 🟡 Medium |
| ML Lead Scoring | ⭐⭐⭐⭐ | ⭐⭐⭐ | Very High | 🔵 Low |
| Multi-Company | ⭐⭐⭐ | ⭐⭐ | Very High | 🔵 Low |

---

## 🎯 Bottom Line

**Your CRM is already 60-65% of where it needs to be.** The core lead pipeline, invoicing, and team management are solid. But to truly run your entire business from this CRM without switching to other tools, you need:

1. **Communication layer** (email + SMS + better WhatsApp)
2. **Post-sales delivery tracking** (the biggest gap — leads convert, then what?)
3. **Financial completeness** (expenses, profitability, not just revenue)
4. **Automation** (stop doing things manually that rules can handle)
5. **Code health** (split the giants, fix types, migrate DB properly)

The technical debt items (Priority 1) should be tackled FIRST — they'll make everything else faster to build and safer to deploy.

---

*This document should be treated as a living roadmap. Update it as features are completed and priorities shift.*
