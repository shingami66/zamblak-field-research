---
name: zamblak-security-privacy-guard
description: Specialist review guard for application security, authentication, authorization, privacy, respondent PII protection, and tenant isolation under AGENTS.md.
---

# Zamblak Security & Privacy Guard

## Purpose & Scope
This skill serves as the specialist review guard for application security, authentication, authorization, data privacy, respondent Personally Identifiable Information (PII) protection, and multi-tenant isolation in Zamblak.

### Authority Boundaries
- **Advisory & Specialist Review Only:** This skill provides rigorous security review criteria and checks; it does not grant authority to mutate application code, database schemas, or Git state.
- **Strictly Prohibited:** Accessing, viewing, printing, or attempting to read `.env` secrets, encryption keys, or credentials.
- **Non-Overlap with Database Guard:** Schema mutations, SQL migrations, database triggers, and RLS policy DDL remain the sole authority of `zamblak-db-rls-migration-guard`.
- **Non-Overlap with Runtime Data Engineering:** Runtime query composition and SSR cookie handling are governed by `zamblak-supabase-data-engineering`.

---

## 1. Multi-Tenant Isolation & IDOR/BOLA Defense

- **Mandatory Tenant Boundary (`account_id`):**
  - All application entities (projects, forms, respondents, participations, field notes, audit records) are strictly partition-scoped by `account_id`.
  - Cross-tenant data leakage is a critical P0 security failure.
- **Insecure Direct Object Reference (IDOR / BOLA) Prevention:**
  - Never allow direct URL parameter or client-supplied payload manipulation (e.g., changing `/forms/[formId]` or `accountId` in request bodies) to access or mutate records belonging to another tenant.
  - Every data fetch or mutation must verify that the requested entity belongs to the authenticated user's active tenant (`account_id`).
- **Deep Inspection of Direct and Indirect Data Paths:**
  - Security review must inspect direct queries, nested relational joins, aggregations, exports, and background jobs.
  - Relying solely on client UI hiding (e.g. disabling a button or omitting a link) is strictly insufficient; backend endpoints must independently enforce access boundaries.

---

## 2. Server-Authoritative Authentication & Authorization

- **Independent Server Verification:**
  - Every Server Action (`"use server"`) and Route Handler (`app/api/**/route.ts`) must independently verify the user's authentication and role before processing data.
  - Authenticated identity must be resolved via `supabase.auth.getUser()`, which validates the JWT against the Supabase Auth server. Never rely solely on unverified client session cookies or cached tokens.
- **Zero Client Trust:**
  - Never trust browser-supplied assertions regarding role (`owner`, `support_helper`), account ownership (`account_id`), profile state, or financial amounts.
  - Monetary values, pricing baselines, and participant compensation must always be calculated server-side.
- **Metadata Authorization Invariants:**
  - **Forbidden:** Never use Supabase `user_metadata` or `raw_user_meta_data` for access control or role authorization. User metadata is client-writable via the Supabase Auth API (`supabase.auth.updateUser()`) and represents an immediate privilege escalation vector.
  - Roles and permissions must be derived exclusively from the server-managed database profile (`profiles.role`) or server-controlled `app_metadata`.
- **JWT Freshness vs Profile State:**
  - For sensitive actions (tenant configuration, user role modification, financial operations), re-verify profile state directly from the database to catch revoked sessions or downgraded permissions immediately.
- **Fail-Closed on Inactive or Deleted Accounts:**
  - If a user profile has `active = false` or `deleted_at IS NOT NULL`, all access attempts must fail closed immediately (HTTP 401/403 or typed unauthorized action error).

---

## 3. Service-Role Key Security Boundaries

- **Server-Only Trust Boundary:**
  - The Supabase Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) completely bypasses Row Level Security.
  - It must **never** be exposed to browser bundles, client components, public API responses, or client-accessible environment variables.
- **No Authorization Shortcuts:**
  - The service-role client must **never** be used as a convenient shortcut to bypass broken or inconvenient RLS policies or application authorization checks.
  - When service-role operations are legitimately required (e.g., system maintenance or automated synchronization), application code must explicitly enforce strict tenant (`account_id`) validation.

---

## 4. Privacy, PII Protection & Data Leakage Prevention

- **Respondent Personally Identifiable Information (PII):**
  - Zamblak collects sensitive fieldwork data across Saudi Arabia regions. Respondent names, national IDs, contact numbers, GPS coordinates, and audio/image recordings are confidential PII.
  - PII must be accessed strictly on a need-to-know basis for authorized fieldwork researchers.
- **Prohibited Leaks in Logs, Errors, and URLs:**
  - Never log raw PII, authentication tokens, session cookies, or full survey response bodies in server logs or external telemetry.
  - Never include respondent PII in URL query strings or browser history.
- **User-Facing Error Sanitization:**
  - User-facing error messages must be generic, safe, and localization-friendly (Arabic-first).
  - Never expose internal database error details, PostgreSQL error codes, SQL queries, table schemas, stack traces, or internal server IPs in responses returned to clients.
- **Role Isolation for Support Helpers (`support_helper`):**
  - The `support_helper` role is an operational fieldwork assistant.
  - Must **never** gain access to financial data (`participation_pricing`, `project_financial_settings`, payments), cross-tenant data, or tenant administrative controls.

---

## 5. Security Review Checklist (PASS/HOLD Criteria)

When performing a security review, systematically verify:
1. **Tenant Boundary:** Are all queries and mutations strictly scoped to `account_id`? Is IDOR/BOLA prevented?
2. **Server Authority:** Do Server Actions and Route Handlers independently verify auth via `supabase.auth.getUser()`?
3. **Zero Browser Trust:** Are roles, pricing, and accounts validated server-side without trusting client claims?
4. **Metadata Safety:** Is authorization strictly derived from server-managed profile tables rather than client-writable `user_metadata`?
5. **Fail-Closed Lifecycle:** Do suspended (`active = false`) or deleted profiles immediately lose access?
6. **Service-Role Hygiene:** Is service-role usage absent from client code and never used to bypass RLS?
7. **PII & Privacy:** Is respondent PII protected, masked, and excluded from logs, query strings, and error messages?
8. **Error Sanitization:** Are internal database errors and stack traces masked from user responses?
9. **Role Matrix Adherence:** Does `support_helper` remain strictly excluded from financial and administrative surfaces?
