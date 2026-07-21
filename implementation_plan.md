# 24eFiling CRM — Complete Upgrade Implementation Plan (v2)

## Background & Current State

The 24eFiling CRM is an existing **React 19 + TypeScript + Vite + TailwindCSS + Supabase** application with:
- **27 pages** including Dashboard, Leads, Customers, Reports, Services, Payments, Branch Management, etc.
- **Supabase PostgreSQL** backend with RLS, Edge Functions, and Storage
- **Role hierarchy**: Super Admin → Admin/Branch Manager → Sales Executive (+ Receptionist, Team Leader, Service Executive, Accounts Team)
- **Existing features**: Lead management, customer management, payment tracking, document upload/download, notifications, services, offers, web management (blogs, testimonials)
- **Deployment target**: Vercel (frontend) + Supabase (backend/DB/storage/edge functions)

The client shared a **NEXORA CRM** reference design — a premium dark-theme UI with glassmorphic cards, AI copilot panel, rich analytics, and modern animations.

---

## Resolved Questions

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| Q1 | Deployment target | **Vercel** | Supabase Edge Functions for webhooks; Vercel for frontend hosting |
| Q2 | WhatsApp Business API | **Don't have yet** — de-prioritized to Phase 6 (last) | WhatsApp + bot features moved to final phase |
| Q3 | Work Orders 24/7 | **Customers submit via WhatsApp bot** → employees manage via CRM | CRM-side work order management in Phase 4; WhatsApp bot intake in Phase 6 |
| Q4 | Phase priority | **WhatsApp de-prioritized**, everything else stays | Phase order adjusted |
| Q5 | City Management | **No existing UI page** — needs new page | New `CityManagement.tsx` page in Phase 1 |

---

## User Review Required

> [!IMPORTANT]
> **This is a massive project spanning 18 feature areas.** Delivered in 6 phases, each building on the previous. WhatsApp integration is now the final phase — you can get the full CRM running before needing a WhatsApp Business API account.

> [!WARNING]
> **Work Order Flow**: Customers will eventually submit work orders via a WhatsApp bot (Phase 6). Until then, Phase 4 builds the CRM-side work order module so employees can manually create/manage work orders. When WhatsApp goes live in Phase 6, bot-submitted orders will auto-flow into the same system.

---

## Requirements Mapping

| # | Requirement | Current Status | Phase |
|---|------------|---------------|-------|
| 1 | Total cities & create city | ❌ No UI page exists | **Phase 1** |
| 2 | Total branch & create branch | ✅ BranchManagement.tsx exists | **Phase 1** (enhance) |
| 3 | Total employee & create employee | ✅ UserManagement.tsx exists | **Phase 1** (enhance) |
| 4 | Revenue — branch wise, filters (day/week/month/custom) | ⚠️ Reports.tsx partial | **Phase 2** |
| 5 | Employee sales conversions & performance | ⚠️ SalesExecutivePerformanceModal exists | **Phase 2** |
| 6 | Customer data & documentation | ✅ Customers.tsx, CustomerDetail.tsx | **Phase 1** (enhance) |
| 7 | Document upload & download | ✅ Document management exists | **Phase 1** (enhance) |
| 8 | Reminders — personal + task-assigned, admin task assignment | ❌ Needs new page + DB tables | **Phase 3** |
| 9 | Work status — employee wise & branch wise | ❌ Needs new feature | **Phase 3** |
| 10 | Extensive analytics, user-friendly | ⚠️ Reports page exists (115KB) | **Phase 2** |
| 11 | Support for employees, sales, operations, clients | ⚠️ Basic roles exist | **Phase 4** |
| 12 | Employee feedback | ❌ Needs new feature | **Phase 4** |
| 13 | Work orders 24/7 | ❌ Needs new module | **Phase 4** (CRM side) + **Phase 6** (WhatsApp bot intake) |
| 14 | WhatsApp AI chatbot | ⚠️ Chatbot.tsx is basic AI chat | **Phase 6** (de-prioritized) |
| 15 | Work & sales reports | ⚠️ Reports exists, needs enhancement | **Phase 2** |
| 16 | Super admin updates/announcements | ❌ Needs new feature | **Phase 3** |
| 17 | Services — create, customize, pricing | ✅ ServiceManagement.tsx exists | **Phase 1** (enhance) |
| 18 | Revenue generation, invoice storing, policies | ⚠️ InvoicePDF exists, no storage | **Phase 2** |

---

## Proposed Changes

### Phase 1: NEXORA-Style UI Overhaul + Foundation Enhancements
**Goal**: Transform the visual identity to match the NEXORA reference while enhancing existing modules and adding city management.

---

#### Design System Refresh

##### [MODIFY] [index.css](file:///d:/24efilings%20CRM/index.css)
- Complete dark-theme overhaul with NEXORA-inspired color palette
- Glassmorphism utility classes (`glass-card`, `glass-panel`, `glass-sidebar`)
- New CSS variables for gradient backgrounds, glow effects, card borders
- Premium scrollbar styling for dark mode
- Micro-animation keyframes (fade-up, slide-in, pulse-glow, shimmer)

##### [MODIFY] [tailwind.config.js](file:///d:/24efilings%20CRM/tailwind.config.js)
- Extended color palette with curated dark-mode colors (slate-900/950 base, blue/violet accents)
- Custom backdrop-blur and glass transparency scales
- Animation timing functions and duration presets
- Typography: Inter (body) + Outfit (headings) from Google Fonts

##### [NEW] `components/ui/GlassCard.tsx`
- Reusable glassmorphic card component with gradient borders
- Hover glow effects and subtle animations
- Variants: `default`, `stat`, `chart`, `activity`

##### [NEW] `components/ui/StatCard.tsx`
- NEXORA-style metric cards (Total Revenue, Open Leads, Win Rate, etc.)
- Sparkline mini-charts using Recharts
- Trend indicators (↑ +14.6%, ↓ -3.2%) with color-coded badges
- Animated number counters

##### [NEW] `components/ui/AnimatedCounter.tsx`
- Smooth number animation component for dashboard metrics
- Supports currency formatting (₹), percentages, and plain numbers

---

#### Sidebar & Navigation Overhaul

##### [MODIFY] [Sidebar.tsx](file:///d:/24efilings%20CRM/components/Sidebar.tsx)
- NEXORA-style dark glassmorphic sidebar with blur backdrop
- Collapsible sidebar with smooth animations (expanded/icon-only modes)
- Grouped navigation sections with section headers (e.g., "Core", "Analytics", "Management", "Communication")
- Active state with gradient highlight and left border indicator
- User profile card at bottom with online status indicator
- Quick search bar at top (⌘K shortcut)
- Badge counts with animated pulse for new items
- Add nav items for all new pages: Cities, Reminders, Work Status, Feedback, Work Orders, Support, Announcements, Revenue, Performance, Invoices

##### [MODIFY] [Header.tsx](file:///d:/24efilings%20CRM/components/Header.tsx)
- Slim top bar with breadcrumb navigation
- Global search with command palette (⌘K)
- Notification bell with unread count badge
- Quick-action buttons (+ New Lead, + New Task)
- User avatar dropdown with settings/logout

##### [MODIFY] [Layout.tsx](file:///d:/24efilings%20CRM/components/Layout.tsx)
- Responsive layout with collapsible sidebar
- Smooth page transitions using Framer Motion
- Dark gradient background (deep navy → slate-950)

---

#### Dashboard Overhaul

##### [MODIFY] [DashboardOverview.tsx](file:///d:/24efilings%20CRM/pages/DashboardOverview.tsx)
- **Greeting Header**: "Good morning, [Name] 👋" with date, + Add Widget button, time-period selector
- **Top Row**: 4 NEXORA-style stat cards with sparklines and trend badges:
  - Total Revenue (₹) with % change
  - Total Leads with conversion indicator
  - Conversion Rate (%) with trend
  - Avg. Deal Size (₹) with trend
- **Row 2**: 
  - Pipeline Overview (horizontal stacked bar — Qualification, Discovery, Proposal, Negotiation, Closed Won)
  - Revenue Forecast (area chart with gradient fill, actual vs projected)
  - Recent Activities (avatar-based timeline feed)
- **Row 3**: Branch-wise revenue comparison, Top performers leaderboard, Upcoming reminders
- All cards use glassmorphic styling with hover effects

---

#### City Management Page (Requirement #1)

##### [NEW] `pages/CityManagement.tsx`
- **Stat cards at top**: Total Cities, Active Cities, States Covered
- Create/Edit city modal (city name, city code, state, status toggle)
- Searchable, sortable data table with columns: City Name, Code, State, Branches Count, Status, Actions
- Bulk actions (activate/deactivate)
- City detail: expand to see branches in that city

##### [NEW] SQL: `SETUP_CITIES_UI.sql`
- Ensure `cities` table exists with proper schema (if not already created by `SETUP_CITIES_MODULE.sql`)
- RLS policies: Super Admin full access, Admin read-only
- Indexes on `city_name`, `state`

##### [MODIFY] [App.tsx](file:///d:/24efilings%20CRM/App.tsx)
- Add route: `/cities` → `CityManagement`
- Add lazy import for `CityManagement`
- Add page config entry

---

#### Enhanced Branch Management (Requirement #2)

##### [MODIFY] [BranchManagement.tsx](file:///d:/24efilings%20CRM/pages/BranchManagement.tsx)
- NEXORA-style stat cards at top: Total Branches, Active Branches, Total Employees across branches, Total Revenue across branches
- Branch cards with glassmorphic styling: logo, manager info, employee count, revenue at-a-glance
- Create branch modal with **city selection dropdown** (linked to cities table)
- Branch detail expansion: employee list, revenue chart, recent activity

---

#### Enhanced Employee/User Management (Requirement #3)

##### [MODIFY] [UserManagement.tsx](file:///d:/24efilings%20CRM/pages/UserManagement.tsx)
- Stat cards: Total Employees, Active, By Department breakdown
- Enhanced user cards with role badges, branch info, online status
- Department-wise filtering tabs (Sales, Operations, HR, CA, Others)
- Quick-view drawer for employee profile with activity history

---

#### Enhanced Services (Requirement #17)

##### [MODIFY] [ServiceManagement.tsx](file:///d:/24efilings%20CRM/pages/ServiceManagement.tsx)
- Glassmorphic redesign
- Service catalog with pricing display
- Bulk price update capability
- Service usage count (how many leads/customers use each service)

---

#### Enhanced Customers & Documents (Requirements #6, #7)

##### [MODIFY] [Customers.tsx](file:///d:/24efilings%20CRM/pages/Customers.tsx) & [CustomerDetail.tsx](file:///d:/24efilings%20CRM/pages/CustomerDetail.tsx)
- Glassmorphic redesign matching NEXORA contact detail view
- Customer profile card with AI summary section
- Document tab with drag-and-drop upload, download buttons, verification status badges
- Timeline view of all customer interactions

---

### Phase 2: Revenue Analytics, Reports & Invoice System
**Goal**: Comprehensive revenue tracking with branch-wise filters, enhanced reports, and invoice storage.

---

#### Revenue Dashboard (Requirement #4)

##### [NEW] `pages/RevenueDashboard.tsx`
- **Branch-wise revenue table** with expandable rows showing employee-level breakdown
- **Time filter bar**: Today | This Week | This Month | This Quarter | This Year | Custom Date Range picker
- **Revenue charts**:
  - Area chart: Revenue trend over time (daily/weekly/monthly granularity)
  - Bar chart: Branch-wise comparison (side-by-side)
  - Pie/Donut chart: Service-wise revenue distribution
  - Stacked bar: Revenue breakdown by payment method
- **KPI stat cards**: Total Revenue, Revenue per Branch (avg), Growth Rate vs previous period, Outstanding Dues
- **Export**: Download as Excel (.xlsx) or PDF
- **Drill-down**: Click any branch → see employee-level revenue → click employee → see lead-level revenue

##### [NEW] `components/charts/RevenueChart.tsx`
- Reusable chart component with gradient fills, animated transitions, interactive tooltips
- Supports area, bar, pie, and stacked chart modes

---

#### Employee Performance & Sales Conversions (Requirement #5)

##### [NEW] `pages/EmployeePerformance.tsx`
- **Leaderboard view**: Ranked employees by conversion rate, revenue generated, tasks completed
- **Individual performance card** (click any employee):
  - Leads assigned vs converted (funnel chart)
  - Revenue generated (bar chart over time)
  - Average deal size, average response time
  - Activity score (calls + emails + notes + document uploads)
  - Task completion rate
- **Comparison mode**: Select 2-3 employees for side-by-side comparison
- **Time-period filters**: Same as revenue dashboard (day/week/month/quarter/year/custom)
- **Branch filter**: View performance for a specific branch

##### [MODIFY] [SalesExecutivePerformanceModal.tsx](file:///d:/24efilings%20CRM/components/SalesExecutivePerformanceModal.tsx)
- Glassmorphic redesign
- Add historical performance trend chart
- Link to full EmployeePerformance page

---

#### Enhanced Reports (Requirements #10, #15)

##### [MODIFY] [Reports.tsx](file:///d:/24efilings%20CRM/pages/Reports.tsx)
- **Restructure into tabbed sections**:
  1. **Sales Reports**: Lead conversion funnel, win/loss analysis, source attribution, pipeline velocity
  2. **Revenue Reports**: Branch-wise, service-wise, employee-wise revenue with all time filters
  3. **Work Reports**: Task completion rates, average turnaround time, SLA compliance
  4. **Employee Reports**: Performance trends, activity patterns, feedback scores (Phase 4 data)
  5. **Customer Reports**: Retention analysis, lifetime value, service popularity
- **Export all reports**: Excel + PDF
- **Glassmorphic charts** with NEXORA styling

---

#### Invoice Storage System (Requirement #18)

##### [NEW] `pages/InvoiceManagement.tsx`
- Invoice list with search, filter by status (Paid, Pending, Overdue, Cancelled)
- Invoice detail view with embedded PDF preview
- **Create invoice** from customer/lead data (auto-populate items from service sets)
- **Auto-save** generated PDF to Supabase Storage, store metadata in DB
- Invoice numbering: auto-increment (e.g., `INV-2026-0001`)
- Payment reconciliation: link payments to invoices
- Overdue invoice alerts

##### [NEW] SQL: `SETUP_INVOICES_TABLE.sql`
```
Tables:
- invoices: id, invoice_number, customer_id, lead_id, branch_id, 
  items (jsonb), subtotal, tax_amount, discount_amount, total_amount,
  status (draft/sent/paid/overdue/cancelled), due_date, paid_date,
  pdf_url (Supabase Storage link), notes, created_by, created_at, updated_at

- invoice_payments: id, invoice_id, payment_id, amount, created_at
```

##### [MODIFY] [InvoicePDF.tsx](file:///d:/24efilings%20CRM/components/InvoicePDF.tsx)
- After PDF generation, auto-upload to Supabase Storage bucket
- Save URL reference to `invoices.pdf_url`
- Download button that fetches from storage

##### [NEW] `pages/PoliciesManagement.tsx`
- Company policies CRUD (payment terms, refund policy, service agreements)
- Policy templates that auto-attach to invoices
- Version history for policy changes

---

### Phase 3: Reminders, Task Management & Super Admin Updates
**Goal**: Comprehensive reminder system, work status tracking, and admin communications.

---

#### Reminders System (Requirement #8)

##### [NEW] `pages/Reminders.tsx`
- **Two-tab layout**:
  1. **Personal Reminders**: User creates for themselves
     - Title, description, due date/time
     - Priority (High/Medium/Low) with color coding
     - Recurring option (daily, weekly, monthly)
     - Status: Pending → Snoozed → Completed / Overdue
  2. **Task-Assigned Reminders**: 
     - Admins/Super Admins assign tasks to employees
     - Assignee gets a reminder notification
     - Assigner can track completion status
     - Category: Follow-up, Document Collection, Payment Reminder, Client Meeting, Internal Task
- **Views**:
  - List view (default): sorted by due date
  - Calendar view: day/week/month calendar with reminder dots
  - Kanban view: columns by status (Pending | Today | Overdue | Completed)
- **Auto birthday greetings**: System creates auto-reminders for customer/employee DOBs (leverages existing `birthdayScheduler.ts`)
- **Notification integration**: Bell icon alerts + browser notifications for due/overdue reminders
- **Filters**: By type, priority, status, assignee, date range

##### [NEW] SQL: `SETUP_REMINDERS_TABLE.sql`
```
Tables:
- reminders: id, user_id (owner), title, description, 
  type ('personal' | 'task_assigned'), due_date, due_time,
  priority ('high' | 'medium' | 'low'), 
  status ('pending' | 'snoozed' | 'completed' | 'overdue'),
  is_recurring, recurrence_pattern (daily/weekly/monthly),
  assigned_by (FK profiles), assigned_to (FK profiles),
  related_lead_id, related_customer_id, branch_id,
  completed_at, snoozed_until, created_at, updated_at

RLS: Users see own reminders + reminders assigned to them.
     Admins see all reminders in their branch.
     Super Admin sees all.
```

##### [MODIFY] [birthdayScheduler.ts](file:///d:/24efilings%20CRM/lib/birthdayScheduler.ts)
- Create reminder records (not just notifications) for upcoming birthdays
- Configurable greeting message templates
- Support both customer DOB and employee DOB

---

#### Work Status Tracking (Requirement #9)

##### [NEW] `pages/WorkStatus.tsx`
- **Kanban board**: Drag-and-drop tasks across columns: To Do → In Progress → Review → Done
- **Employee-wise view**: Select an employee → see all their tasks with status, workload bar
- **Branch-wise view**: Aggregate task metrics per branch in a summary table
  - Columns: Branch Name, Total Tasks, Completed, In Progress, Overdue, Completion Rate
- **Metrics panel** at top:
  - Total tasks (all statuses)
  - Completion rate (%)
  - Average turnaround time
  - Overdue count (with red badge)
- **Filters**: By employee, branch, priority, date range, category
- **Gantt chart** (optional toggle): Timeline view with task bars and dependencies

##### Enhanced Tasks Schema
- Extend existing `tasks` table with: `assigned_to`, `status` (todo/in_progress/review/done), `branch_id`, `category` (work_order/internal/client_task), `estimated_hours`, `actual_hours`
- New SQL migration: `ENHANCE_TASKS_TABLE.sql`

---

#### Super Admin Updates & Announcements (Requirement #16)

##### [NEW] `pages/Announcements.tsx`
- **Create announcement** (Super Admin only):
  - Title, rich-text content (markdown editor)
  - Target audience: All Users, specific roles, specific branches
  - Type: General, Policy Update, Feature Release, Urgent
  - Pin option (stays at top)
  - Expiry date (optional)
- **Announcement feed**: Chronological list with type badges and read/unread indicators
- **Read receipts**: Track which users have seen each announcement
- **Employees view**: Read-only feed with mark-as-read

##### [NEW] SQL: `SETUP_ANNOUNCEMENTS_TABLE.sql`
```
Tables:
- announcements: id, title, content, type, target_roles (text[]),
  target_branches (uuid[]), is_pinned, expires_at, 
  created_by (FK profiles), created_at, updated_at

- announcement_reads: id, announcement_id (FK), user_id (FK), read_at

RLS: All authenticated users can read announcements targeting their role/branch.
     Only Super Admin can create/edit/delete.
```

##### [MODIFY] [DashboardOverview.tsx](file:///d:/24efilings%20CRM/pages/DashboardOverview.tsx)
- Add pinned announcements banner/carousel at top of dashboard
- "New announcements" indicator if unread announcements exist

---

### Phase 4: Support, Feedback & Work Orders (CRM Side)
**Goal**: Internal support system, employee feedback, and CRM-side work order management.

> [!NOTE]
> Work orders are managed by employees in this phase. Customer-facing submission via WhatsApp bot comes in Phase 6.

---

#### Support System (Requirement #11)

##### [NEW] `pages/Support.tsx`
- **Ticket-based support** for employees, sales, operations, clients
- **Create ticket**: Category (Technical, Account, Service, General), priority, description, attachments
- **Ticket lifecycle**: Open → Assigned → In Progress → Resolved → Closed
- **Ticket list**: Filterable by status, priority, category, assignee
- **Ticket detail view**: Conversation thread (comments), status history, SLA timer
- **Knowledge base tab**: FAQ articles for common questions (Super Admin creates)
- **SLA tracking**: Auto-escalate if response time > threshold

##### [NEW] SQL: `SETUP_SUPPORT_TICKETS_TABLE.sql`
```
Tables:
- support_tickets: id, title, description, category, priority, status,
  created_by (FK), assigned_to (FK), branch_id,
  attachments (text[]),
  sla_response_deadline, sla_resolution_deadline,
  first_response_at, resolved_at, closed_at,
  created_at, updated_at

- ticket_comments: id, ticket_id (FK), user_id (FK), content, 
  attachments (text[]), created_at

- knowledge_base: id, title, content, category, 
  created_by (FK), is_published, created_at, updated_at
```

---

#### Employee Feedback (Requirement #12)

##### [NEW] `pages/EmployeeFeedback.tsx`
- **Feedback dashboard** (Admin/Super Admin view):
  - All employees with average scores, recent feedback status
  - Filter by branch, department, period
- **Give feedback** (Manager → Employee):
  - Rating categories: Communication, Technical Skills, Teamwork, Punctuality, Customer Handling, Initiative
  - Each category: 1-5 star rating + text comment
  - Overall rating auto-calculated
  - Period selection (Q1/Q2/Q3/Q4 + Year)
- **Receive feedback** (Employee view):
  - View feedback received with scores
  - Trend chart of scores over quarters
  - Acknowledge feedback
- **Self-assessment**: Employee fills out same form for themselves
- **Anonymous peer feedback** (optional): Employees can give anonymous feedback to peers

##### [NEW] SQL: `SETUP_FEEDBACK_TABLE.sql`
```
Tables:
- employee_feedback: id, employee_id (FK), reviewer_id (FK),
  feedback_type ('self' | 'manager' | 'peer'),
  period (e.g., 'Q1-2026'), 
  ratings (jsonb: {communication: 4, technical: 5, ...}),
  overall_score (computed), comments (text),
  is_anonymous (bool), status ('draft' | 'submitted' | 'acknowledged'),
  created_at, updated_at

- feedback_templates: id, name, categories (jsonb), 
  created_by (FK), is_active, created_at
```

---

#### Work Orders — CRM Side (Requirement #13)

##### [NEW] `pages/WorkOrders.tsx`
- **Work order list**: All orders with status filters
- **Create work order** (employee creates on behalf of customer, or auto-created from WhatsApp in Phase 6):
  - Customer selection (from existing customers or new)
  - Service(s) selection with pricing
  - Description, priority, estimated completion date
  - Branch assignment
- **Work order lifecycle**: Submitted → Accepted (auto) → Assigned → In Progress → Completed → Invoiced
- **Auto-accept**: All work orders are immediately accepted (24/7 availability)
- **Assignment**: Auto-assign to available employee in the branch, or manual assignment
- **SLA timer**: Track turnaround time per service type
- **Link to invoices**: Generate invoice from completed work order (Phase 2 invoice system)

##### [NEW] SQL: `SETUP_WORK_ORDERS_TABLE.sql`
```
Tables:
- work_orders: id, reference_number (auto: WO-2026-0001), 
  customer_id (FK), customer_name, customer_phone,
  service_id (FK), sub_service_id (FK),
  description, priority ('urgent' | 'normal' | 'low'),
  status ('submitted' | 'accepted' | 'assigned' | 'in_progress' | 'completed' | 'invoiced'),
  assigned_to (FK profiles), branch_id (FK),
  estimated_completion, actual_completion,
  total_amount, invoice_id (FK invoices, nullable),
  source ('crm' | 'whatsapp' | 'web'),
  created_by (FK, nullable for bot-created),
  created_at, updated_at

- work_order_notes: id, work_order_id (FK), user_id (FK), 
  content, created_at
```

---

### Phase 5: Polish, AI Copilot & Optimization
**Goal**: AI-powered insights, performance optimization, and final UI polish.

---

#### AI Copilot Panel (inspired by NEXORA reference)

##### [NEW] `components/AICopilot.tsx`
- Slide-out panel on right side of dashboard (toggle with button)
- Powered by Google Gemini AI (`@google/genai` already in dependencies)
- **Sections**:
  - **Deal Insights**: "Lead X is 85% likely to convert based on activity and engagement"
  - **Action Items**: "You have 5 tasks due today" with quick links
  - **Smart Summary**: "Your team closed 12 deals this month, 20% more than last month"
  - **Ask anything**: Natural language query box — "Show me revenue for LB Nagar branch this week"
- Context-aware: Uses current page data to generate relevant insights

##### [MODIFY] [DashboardOverview.tsx](file:///d:/24efilings%20CRM/pages/DashboardOverview.tsx)
- Add AI Copilot toggle button in header area
- Integrate copilot panel alongside dashboard

---

#### Dashboard Widget Customization

##### [NEW] `components/dashboards/WidgetGrid.tsx`
- Drag-and-drop dashboard widget layout
- Widget types: KPI stat card, chart, activity feed, calendar, reminders, announcements
- Users can show/hide widgets and rearrange layout
- Save layout preference per user in Supabase (profiles table or separate `user_preferences` table)

---

#### Performance Optimization

##### Across all pages:
- **React Query caching**: Review and optimize stale times, garbage collection
- **Virtual scrolling**: Add TanStack Virtual for large data tables (leads, customers, invoices)
- **Image optimization**: Lazy loading for avatars and branch logos
- **Bundle optimization**: Review code splitting, ensure all pages are lazy-loaded
- **Supabase optimization**: 
  - Add database indexes on frequently queried columns
  - Materialized views for expensive report queries
  - Connection pooling configuration
- **Lighthouse audit**: Target 90+ performance score

---

### Phase 6: WhatsApp AI Chatbot & Bot-Driven Work Orders (De-prioritized)
**Goal**: WhatsApp Business API integration with AI-powered auto-responses and automated work order intake.

> [!NOTE]
> This phase requires a **WhatsApp Business API account** (via Meta Cloud API, or a provider like Twilio/360dialog). Set up the account before starting this phase.

---

#### WhatsApp Integration (Requirement #14)

##### [NEW] `supabase/functions/whatsapp-webhook/index.ts`
- Supabase Edge Function as webhook endpoint for Meta Cloud API
- **Inbound message handling**:
  - Parse incoming WhatsApp messages
  - Route to AI engine (Google Gemini) for auto-response
  - Create work orders from customer messages (Requirement #13 bot intake)
  - Send auto-replies with service information, pricing, status updates
- **Outbound message handling**:
  - Send template messages (birthday greetings, payment reminders, status updates)
  - Broadcast messages (with opt-in tracking)

##### [NEW] `pages/WhatsAppDashboard.tsx`
- **Conversation list**: All WhatsApp conversations with customer name, last message, timestamp
- **Chat view**: Full message history with sent/delivered/read status
- **AI response suggestions**: Gemini generates suggested replies, employee can approve/edit/send
- **Template library**: Pre-approved WhatsApp message templates
- **Broadcast**: Send bulk messages to customer segments
- **Analytics**: Response rate, average response time, conversations resolved by bot vs human

##### [MODIFY] [Chatbot.tsx](file:///d:/24efilings%20CRM/components/Chatbot.tsx)
- Evolve into a unified communication panel
- Tab 1: Internal AI Assistant (existing)
- Tab 2: WhatsApp conversations (new)
- Customer context sidebar: Show lead/customer info alongside chat

##### [NEW] `lib/whatsappClient.ts`
- WhatsApp Business API client wrapper
- Functions: sendTextMessage, sendTemplate, sendMedia, markAsRead
- Rate limiting and retry logic
- Error handling for API failures

##### [NEW] SQL: `SETUP_WHATSAPP_INTEGRATION.sql`
```
Tables:
- whatsapp_conversations: id, customer_phone, customer_name, customer_id (FK nullable),
  last_message_at, unread_count, assigned_to (FK profiles),
  status ('active' | 'resolved' | 'archived'), created_at

- whatsapp_messages: id, conversation_id (FK), direction ('inbound' | 'outbound'),
  content, message_type ('text' | 'image' | 'document' | 'template'),
  whatsapp_message_id (Meta's ID), status ('sent' | 'delivered' | 'read' | 'failed'),
  is_ai_generated (bool), template_name, created_at

- whatsapp_templates: id, name, content, variables (text[]),
  category ('marketing' | 'utility' | 'authentication'),
  status ('approved' | 'pending' | 'rejected'),
  created_by (FK), created_at
```

#### Work Order Bot Intake (Requirement #13 — WhatsApp side)

##### [MODIFY] `supabase/functions/whatsapp-webhook/index.ts`
- When AI detects a customer wants a service:
  1. Extract: customer name, phone, service requested, description
  2. Auto-create a `work_order` record with `source = 'whatsapp'` and `status = 'accepted'`
  3. Auto-assign to available employee in the relevant branch
  4. Send confirmation message to customer via WhatsApp
  5. Notify assigned employee via CRM notification
- Conversational flow: Bot asks clarifying questions if service type is ambiguous

---

## Database Changes Summary

| Table | Phase | Purpose |
|-------|-------|---------|
| `cities` (new page, table may exist) | 1 | City management UI |
| `invoices` | 2 | Invoice storage & tracking |
| `invoice_payments` | 2 | Payment-invoice linkage |
| `company_policies` | 2 | Policy management |
| `reminders` | 3 | Personal + task-assigned reminders |
| `announcements` | 3 | Super admin updates |
| `announcement_reads` | 3 | Read tracking |
| `tasks` (enhanced) | 3 | Extended status, assignment fields |
| `support_tickets` | 4 | Support system |
| `ticket_comments` | 4 | Support conversation threads |
| `knowledge_base` | 4 | FAQ/help articles |
| `employee_feedback` | 4 | Feedback records |
| `feedback_templates` | 4 | Feedback form templates |
| `work_orders` | 4 | Work order management |
| `work_order_notes` | 4 | Work order conversation |
| `whatsapp_conversations` | 6 | WhatsApp chat threads |
| `whatsapp_messages` | 6 | Individual messages |
| `whatsapp_templates` | 6 | Approved message templates |

All tables follow existing patterns: UUID primary keys, RLS policies per role hierarchy, `created_at`/`updated_at` timestamps, proper foreign keys with cascade rules.

---

## Updated Navigation Structure

```
── CORE ──────────────────────────────
📊  Dashboard
🏙️  City Management              [NEW - Phase 1]
🏢  Branch Management             [ENHANCED - Phase 1]
👥  User Management               [ENHANCED - Phase 1]

── SALES ─────────────────────────────
📋  All Leads
➕  Create New Lead
🎯  My Leads
🔄  Lead Workflow
👤  Customers                     [ENHANCED - Phase 1]

── ANALYTICS ─────────────────────────
💰  Revenue Dashboard             [NEW - Phase 2]
📈  Employee Performance          [NEW - Phase 2]
📊  Reports & Analytics           [ENHANCED - Phase 2]

── MANAGEMENT ────────────────────────
🧾  Invoices & Policies           [NEW - Phase 2]
⏰  Reminders                     [NEW - Phase 3]
📌  Work Status                   [NEW - Phase 3]
📋  Work Orders                   [NEW - Phase 4]
📢  Announcements                 [NEW - Phase 3]

── PEOPLE ────────────────────────────
🎫  Support                       [NEW - Phase 4]
📝  Employee Feedback             [NEW - Phase 4]

── COMMUNICATION ─────────────────────
💬  WhatsApp                      [NEW - Phase 6]
🔔  Notifications

── BUSINESS ──────────────────────────
💳  Payments
🏷️  Offers & Coupons
🌐  24eFiling Web (dropdown)
🛠️  Services                     [ENHANCED - Phase 1]
⚙️  Settings
```

---

## Verification Plan

### Per-Phase Build Checks
- TypeScript compilation: `npx tsc --noEmit`
- Production build: `npm run build`
- Vercel deployment preview for each phase

### Per-Phase Functional Checks

| Phase | Key Verification |
|-------|-----------------|
| **Phase 1** | UI matches NEXORA reference, all existing features still work, city CRUD functional, navigation restructured |
| **Phase 2** | Revenue dashboard shows accurate branch-wise data with all time filters, invoices created/stored/downloadable, reports restructured |
| **Phase 3** | Personal + task reminders work with notifications, kanban work status is draggable, announcements display on dashboard |
| **Phase 4** | Support tickets CRUD with conversation threads, feedback forms submit/aggregate/display, work orders auto-accept and flow through lifecycle |
| **Phase 5** | AI Copilot generates useful insights from real data, dashboard widgets are customizable, performance score ≥ 90 |
| **Phase 6** | WhatsApp webhook receives/sends messages, AI generates contextual responses, work orders auto-created from bot conversations |

### Role-Based Testing
- Log in as **Super Admin**: Verify full access to all modules
- Log in as **Admin/Branch Manager**: Verify branch-scoped data
- Log in as **Sales Executive**: Verify assigned-data-only access
- Verify RLS policies block unauthorized data access

---

## Estimated Scope

| Phase | Description | New/Modified Files | New DB Tables |
|-------|------------|-------------------|---------------|
| **Phase 1** | UI Overhaul + Foundation | ~15-20 | 1 (cities UI) |
| **Phase 2** | Revenue, Reports, Invoices | ~10-12 | 3 |
| **Phase 3** | Reminders, Work Status, Announcements | ~8-10 | 4 |
| **Phase 4** | Support, Feedback, Work Orders | ~10-12 | 6 |
| **Phase 5** | AI Copilot, Polish, Optimization | ~5-8 | 0-1 |
| **Phase 6** | WhatsApp AI Chatbot | ~6-8 | 3 |
| **Total** | | **~55-70 files** | **~17 tables** |

---

> [!TIP]
> **Ready to start Phase 1** — the NEXORA-style UI transformation + city management + navigation overhaul. This phase delivers the biggest visual impact and sets up the design system for everything that follows.
