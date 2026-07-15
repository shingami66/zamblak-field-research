# Project Status

Current phase: **Companies product phase** after closed Auth. Companies MVP contract and deferred-work register are **Mozfer-approved**. Companies UI remains a protected placeholder. **No Companies implementation has begun.** Current work: documentation sync of the approved contract and deferred register.

Next sequence after this docs sync: independent documentation review → exact documentation commit → independent commit review → Graphify refresh → independent Graphify freshness review → live DEV/DEMO catalog verification (`ZAM-COMPANIES-001-LIVE-CATALOG-VERIFY-1`) → schema/RPC design → implementation only after design approval.

## Auth (`ZAM-AUTH-001D`) — CLOSED

- **Status:** closed, committed, and pushed.
- **Application commit:** `74ceca7 feat(auth): add protected sessions and role-aware shell`.
- **Documentation commits:** `9a140d8 docs(auth): record protected session milestone`; `ee44d66 docs(auth): sync post-commit milestone state`.
- **Remote:** local `main` and `origin/main` aligned at `ee44d6663eac2a08ca0559c15db81dfc44cb6f02`.
- **Manual runtime evidence:** Mozfer-owned smoke passed for real Owner login, redirects, session persistence after refresh, unauthenticated root protection, responsive login/dashboard layouts, desktop/mobile account menu behavior, logout, and controlled routes. Not agent-performed browser smoke.
- Production readiness is **not** claimed.

Implemented Auth behavior (still current):

- Live email/password login using the request-scoped Supabase server client and sanitized Arabic errors.
- Server-side Auth user validation and database-backed profile/account/role resolution for `owner` and `support_helper` only.
- Next.js Proxy session-cookie refresh.
- Protected `/`; unauthenticated access redirects to `/login`.
- Authenticated `/login` access redirects to `/`.
- Responsive branded login and authenticated dashboard shell; no fake dashboard metrics.
- Accessible desktop/mobile account menu; local-session logout to `/login`.
- Controlled authenticated placeholders for `/companies` and `/projects`.
- Controlled Owner-only `/financials` placeholder; Support Helper direct access redirects to `/` without financial wording or data.

## Companies (`ZAM-COMPANIES-001`) — contract approved; implementation not started

- **Contract:** Mozfer-approved lean Companies MVP (fields, phone, duplicates, lifecycle active-only, roles, RPC read/mutation, pagination, metrics, routes).
- **Deferred register:** `DWR-COMP-001` through `DWR-COMP-028` recorded in `docs/deferred-decisions.md`.
- **Application today:** `/companies` remains a protected placeholder (`requireAppSession` + empty pending module). No list, detail, create, edit, query, server action, RPC, or fake company data.
- **Mandatory before schema/RPC design:** live DEV/DEMO catalog verification (`DWR-COMP-026` / `ZAM-COMPANIES-001-LIVE-CATALOG-VERIFY-1`). Metadata only; no domain row dumps; no `.env` secret access.
- **Current docs task:** `ZAM-COMPANIES-001-CONTRACT-DEFERRED-DOCS-SYNC-1` (this documentation synchronization only).

### Approved Companies MVP summary (not runtime)

- Fields: `name` (required), `contact_person`, `phone`, `notes` (optional).
- Errors: `duplicate_company_name`, `invalid_company_phone`.
- Mutations: **Server Action → authenticated RPC** for create and edit only; no lifecycle RPC; no direct base-table UPDATE.
- Owner: server query helpers + RLS. Support Helper: bounded support-safe list/detail RPCs; finance-blind; no broad base-table SELECT.
- Metrics: active project count on list; active (`status = active`) and completed (`status = closed`, Arabic `مكتمل`) project sections on detail.
- Routes: `/companies`, `/companies/new`, `/companies/[id]`, `/companies/[id]/edit`.

## Auth security and authority boundary

- Role authority comes from the authenticated user's active, non-deleted database profile/account context, resolved server-side through the argument-free `resolve_current_profile()` RPC.
- Browser-supplied roles, account IDs, profile IDs, Auth UUIDs, and redirect targets are not accepted as authority.
- Missing, inactive, deleted, malformed, or unsupported profiles fail closed.
- The former `mockRole` source has been removed.
- No service-role client is used in browser or normal user-session paths.
- User-initiated logout uses explicit local scope. Financial route authorization is checked on the server.
- MVP onboarding remains `INVITATION_OR_ADMIN_SEED_ONLY`; public signup, arbitrary account creation, user-selected roles, and user-created Owners remain prohibited.

## Earlier Auth milestones

### `ZAM-AUTH-001A` — Supabase runtime client foundation (closed)

- Committed/pushed foundation introduced environment-name validation and browser/request-scoped SSR client factories using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Superseded for login/session by `ZAM-AUTH-001D`.

### `ZAM-AUTH-001B` — MVP access policy (recorded)

- Binding policy: `INVITATION_OR_ADMIN_SEED_ONLY`.
- Support Helper onboarding is authorized Owner or controlled administration only.

### `ZAM-AUTH-001C` — First-Owner bootstrap (repository + DEV/DEMO complete)

- Design: `docs/first-owner-bootstrap-design.md`.
- Migration applied and path consumed on designated DEV/DEMO. Production readiness unclaimed.

## Database enforcement status

### `ZAM-WF-001E` — Participation project-state enforcement

- Migration committed/pushed, manually applied by Mozfer to designated DEV/DEMO, and structurally verified.
- Participation creation and relevant membership/restore changes fail closed unless the project is active and non-deleted.

### `ZAM-WF-001F` — Role-safe read surface

- Mozfer manually applied the frozen migration to designated DEV/DEMO; post-apply packet passed.
- Verified inventory: 11 functions, 2 views, and 23 policies; managed manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4` (8238 octets).
- Owner base-table SELECT remains Owner-scoped. Support Helper limited to four support-safe `SECURITY DEFINER` RPCs (no broad base-table, pricing, payment, or financial-summary access).
- Boundaries: DEV/DEMO database evidence only. Domain Companies RPCs are **planned under the approved contract**, not yet implemented. Residual non-SELECT privilege cleanup remains deferred.

## Open work

- Complete Companies contract/deferred-register documentation sync, independent review, docs commit, Graphify refresh, and live catalog verification gates.
- Design then implement Companies MVP only after those gates pass.
- Then Projects and remaining domain sequence.
- Deferred Auth admin: password recovery/change, invitation and Support Helper administration, Auth-user/profile relinking, account/profile settings, multi-device session controls, sole-Owner recovery.
