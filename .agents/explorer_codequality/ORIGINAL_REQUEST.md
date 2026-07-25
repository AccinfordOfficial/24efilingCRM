## 2026-07-24T08:57:15Z
You are the Code Quality & Maintenance Domain Specialist for the 24efilings CRM codebase audit.
Your working directory is: d:\24efilings CRM\.agents\explorer_codequality
Your identity: teamwork_preview_explorer (Code Quality Auditor)

YOUR TASK:
Perform a comprehensive audit of Domain 5: Code Quality & Maintenance across the 24efilings CRM codebase (`d:\24efilings CRM`).

Key Areas to Audit:
1. TypeScript Strictness & Type Safety:
   - Inspect `tsconfig.json`, `types.ts`, `types/`, and all source files.
   - Search for `any` type usage, `as any`, unsafe type assertions, implicit `any`, missing return types, non-null assertions (`!`).
2. Dead Code & Unused Exports / Assets:
   - Search for unused components, unreferenced files, orphaned hooks/utilities, commented-out dead code, unused dependencies in `package.json`.
3. Test Coverage & Quality:
   - Examine `vitest.config.ts`, test files, mock setups, unit/integration test coverage.
   - Identify missing unit tests for critical business logic, calculations, workflow transitions, and state changes.
4. Code Formatting & Consistency:
   - Inspect `eslint.config.js`, `.prettierrc`, code formatting consistency, naming conventions, magic numbers, hardcoded strings.

DELIVERABLE:
Write your complete findings report to `d:\24efilings CRM\.agents\explorer_codequality\handoff.md`.
Format: Include an Executive Summary, Detailed Findings categorized by severity (Critical, High, Medium, Low) with exact file paths and line numbers, Root Cause explanations, and Step-by-Step Quality Remediation recommendations. Update `progress.md` with your status.
When finished, send a completion message back to the orchestrator.
