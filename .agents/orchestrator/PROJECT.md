# Project: 24efilings CRM Codebase Audit

## Architecture
- Application stack: React 18, TypeScript, Vite, Tailwind CSS, Supabase (Auth, RLS policies, PostgreSQL, RPC/Functions, Storage)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Security & Data Privacy Audit | Supabase RLS policies, auth & authorization flows, env secrets, API exposure, input sanitization | none | IN_PROGRESS |
| 2 | Architecture & State Management Audit | React component structure, state management (Contexts, hooks), side effects, modularity, App.tsx complexity | none | IN_PROGRESS |
| 3 | Database & Backend Integration Audit | Supabase schema, migration consistency, query efficiency, indexes, RPC/edge functions | none | IN_PROGRESS |
| 4 | Performance & Frontend Quality Audit | Rendering efficiency, bundle optimization, UI/UX responsiveness, accessibility, error boundary handling | none | IN_PROGRESS |
| 5 | Code Quality & Maintenance Audit | TypeScript strictness, any/unsafe casts, dead code identification, test coverage, code consistency | none | IN_PROGRESS |
| 6 | Comprehensive Report Synthesis | Synthesize findings from M1-M5 into codebase_audit_report.md with severity ratings, root causes, and actionable fixes | M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts & Guidelines
- Domain reports must be saved in each subagent's working directory (`.agents/explorer_<domain>/handoff.md`).
- Severity ratings: Critical, High, Medium, Low.
- Each finding must cite exact file path, line numbers, root cause explanation, and step-by-step remediation plan.

## Code Layout
- `App.tsx`: Main application entry point and root layout component
- `components/`: Modular UI components
- `contexts/`: Application state contexts
- `hooks/`: Custom React hooks
- `lib/`: Utility functions and Supabase client configuration
- `pages/`: Page-level components
- `supabase/`: Database migrations, seed data, and function definitions
- `types.ts` & `types/`: Shared TypeScript type definitions
- `sql_archive/`: Historical SQL migration scripts
