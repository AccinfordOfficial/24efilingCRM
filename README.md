# 🏢 24eFiling CRM - Enterprise Tax & Business Services CRM

![React 19](https://img.shields.io/badge/React-19.2.0-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwindcss)

A modern, high-performance **Enterprise CRM Application** built for 24eFiling to manage lead pipelines, multi-branch business operations, client documents, tax/GST compliance, invoicing, and team analytics.

---

## ✨ Key Features

### 🎯 1. Lead Management & Conversion Pipeline
- **Full Lifecycle Stepper**: Move leads seamlessly through `New Lead`, `Lead Confirmed`, `Documents & Payments`, `In-Progress`, and `Success` stages.
- **Auto-Customer Conversion**: Changing a lead's status to **Success** automatically converts it into an official Customer record with historical activity logging.
- **Sequential Lead Reference Numbers**: Auto-generated payment & reference numbers (e.g. `E-027-2026`).
- **Lead Scoring & Category Matching**: Automated lead scoring based on response metrics, deal size, and source priority.

### 🏢 2. Multi-Branch Operations & Role Hierarchies
- **Role Scoping**: Multi-tier access control supporting **Super Admin**, **Admin**, **Branch Manager**, **Team Leader**, **Sales Executive**, **Service Executive**, and **Accounts Team**.
- **City & Branch Filtering**: Scoped visibility across regional cities and branch locations (e.g., LB Nagar, HSR Layout, Head Office).
- **Inter-Branch User Transfers**: Seamlessly transfer staff or leads between operational branches with full transfer audit logs.

### 🔀 3. Head Office Lead Routing
- **Lead Assignments Portal**: Dedicated dashboard for Head Office managers and sales execs to inspect unassigned leads and allocate them directly to sales executives.
- **Automatic Recipient Notifications**: Real-time notifications delivered to all relevant team members when a lead is created or re-routed.

### 🧭 4. Interactive Onboarding Tour
- **Role-Tailored Guided Walkthrough**: Interactive, glassmorphic spotlight tour for new team members.
- **Zero Database Migrations**: Uses Supabase Auth `user_metadata` for account-bound persistence across laptops, desktops, and mobile devices.
- **Manual Re-Run**: Users can restart the tour anytime via **Settings > Profile Information**.

### 📄 5. Invoicing & Document Verification
- **Standardized Invoicing**: GST tax breakdowns, sub-service packages, discount codes, and automated PDF export.
- **Document Management**: Document upload, verification status (`Verified`, `Pending`, `Rejected`), and secure storage.

### 📊 6. Analytics & Performance Metrics
- **Executive Dashboards**: Revenue analytics, conversion win-rates, lead funnel visualization, and KPI performance cards.
- **Activity Streams & Audit Logs**: Detailed activity history for every lead, customer, and user interaction.

---

## 🛠️ Technology Stack

| Component | Technology | Version / Tool |
| :--- | :--- | :--- |
| **Frontend Core** | React 19, TypeScript | `React 19.2`, `TypeScript 5.8` |
| **Build System** | Vite | `Vite 6.2` |
| **Database & Auth** | Supabase (PostgreSQL) | `@supabase/supabase-js 2.44` |
| **Styling & UI** | TailwindCSS, Radix UI | Custom Glassmorphism Theme |
| **Icons & Charts** | Lucide React, Recharts | `Lucide 0.560`, `Recharts 3.5` |
| **PDF & Exports** | React-PDF, XLSX | Invoicing & Reporting |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AccinfordOfficial/24efilingCRM.git
   cd 24efilingCRM
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (refer to `.env.example`):
   ```env
   VITE_SUPABASE_URL=https://jblhzdtqrhfeawycecql.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start Local Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` (or `http://localhost:3002`) in your browser.

5. **Type Checking & Quality Check**:
   ```bash
   npx tsc --noEmit
   ```

---

## 👥 User Roles & Hierarchy

```
                      ┌─────────────────────────┐
                      │       Super Admin       │
                      └────────────┬────────────┘
                                   │
            ┌──────────────────────┴──────────────────────┐
            ▼                                             ▼
┌───────────────────────┐                     ┌───────────────────────┐
│     Branch Manager    │                     │         Admin         │
└───────────┬───────────┘                     └───────────┬───────────┘
            │                                             │
            ├──────────────────────┬──────────────────────┤
            ▼                      ▼                      ▼
┌───────────────────────┐┌───────────────────┐┌───────────────────────┐
│    Sales Executive    ││ Service Executive ││     Accounts Team     │
└───────────────────────┘└───────────────────┘└───────────────────────┘
```

---

## 📜 License

Private & Proprietary — **24eFiling Official**. All rights reserved.
