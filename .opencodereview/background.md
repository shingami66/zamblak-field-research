# Zamblak Field Research — Review Background

## Core Domain Hierarchy & Invariants
- Hierarchy: `Account` (Tenant) → `Company` → `Project` → `Participation` → `Research Form`.
- Invariant: Exactly one `Research Form` per `Participation`.
- Respondent Registry: Shared tenant registry; mobile is lookup key; 90-day (3-month) multi-study duplicate warning.

## Multi-Tenancy, Security & Roles
- Tenant Isolation: Mandatory `account_id UUID REFERENCES accounts(id)` on all tenant tables.
- Row Level Security (RLS): Mandatory on all tables. Verified server-side via `auth.uid()` and `current_user_account_id()`. No client tenant overrides.
- Role Boundaries: `owner` has full tenant/financial administration; legacy `support_helper` has bounded operational access to assigned projects only (no tenant/financial administration).

## Financial & Pricing Governance
- Server-Authoritative: All fees, rates, and compensations calculated server-side (`participation_pricing`, `project_financial_settings`).
- Zero Browser Pricing Authority: Client forms never calculate or submit final monetary values.
- Accepted-Only Accounting: Only verified/accepted participations count toward costs or budgets.

## UI/UX: Arabic-First & Senior Fieldwork
- Arabic-First RTL: Native RTL layout using CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`).
- Senior-Friendly: Large touch targets (min 44x44px), high contrast, clear confirmation dialogs before irreversible actions, auto-dismissing success notifications.

## Development & Safety Boundaries
- Migrations: Never apply migrations to live/remote DBs without explicit Owner approval and apply plan.
- Secrets: `.env*`, service-role keys, and credentials must never be exposed or logged.
- Anti-Contamination: Zero G7 CRM, ERP, quotation, invoice, VAT, or billing models. Zamblak repository authority is sovereign.
