# Project Status

Current phase: Role-safe read-surface documentation synchronization
Next task: ZAM-WF-001F-RLS-READ-SURFACE-DOCS-REVIEW-1 (independent documentation review)

## Current Activity
- Role-aware empty Dashboard Shell slice is complete and reflected in `src/app/page.tsx`, `src/components/dashboard/DashboardShell.tsx`, `src/components/layout/Navigation.tsx`, and `src/lib/auth/mock-role.ts`.
- Approved roles are limited to `owner` and `support_helper`.
- The shell remains static UI only: no live auth, no Supabase integration, no database access, no metrics, no charts, and no dashboard cards.
- `support_helper` does not receive `المستحقات` or `/financials`.
- Independent review found mismatched static role sources, support-helper financial navigation risk, unsupported researcher-team wording, and admin-like owner wording.
- Narrow fix completed with one shared static role source, source-level role filtering before navigation render, and corrected approved Arabic role descriptions.
- Independent re-review passed.
- Static validation passed: build, lint, TypeScript, and `git diff --check`.
- Mozfer manual smoke passed for both owner and support helper views.
- Deferred routes `"/companies"`, `"/projects"`, and `"/financials"` remain unimplemented and currently return Next.js 404 pages.
- `mockRole` was restored to `owner`.
- Impeccable and Graphify were not used for this slice.
- Participation project-state enforcement migration `supabase/migrations/202607130001_participation_project_state_guard.sql` was committed and pushed in `0d48fe8ed2d67b2f923a44b59f52a6dab0010577`.
- Mozfer manually applied the exact committed project-state guard to the designated DEV/DEMO database for project ref `gdegnwglakyblnmxgiwx`; post-apply structural verification and a controlled zero-UUID dry-run passed.
- Verified project-state enforcement covers participation INSERT, membership-creating project/respondent changes, and soft-delete restore for active non-deleted projects; missing, deleted, draft, closed, and cancelled projects fail closed.

## ZAM-WF-001F Role-Safe Read Surface (DEV/DEMO applied and verified)
- Program `ZAM-WF-001F-RLS-READ-SURFACE` completed migration source preparation, frozen-snapshot manual apply to designated DEV/DEMO, and read-only post-apply verification.
- Migration source: `supabase/migrations/202607130002_role_safe_read_surfaces.sql` (local untracked draft at apply time; SHA-256 `AE01C67A188E188533769E946C4965878975381B0E5CB1AF750431028F56EC8D`).
- Mozfer manually applied the byte-identical frozen snapshot once to DEV/DEMO project `gdegnwglakyblnmxgiwx` with no Supabase SQL error.
- Final read-only post-apply verification packet `ZAM-WF-001F-RLS-READ-SURFACE-POST-APPLY-VERIFICATION-PACKET-1` returned `overall_verdict = PASS` with empty failure arrays.
- Managed inventory verified: **11** functions, **2** views, **23** policies (managed manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4`, octets `8238`).
- Owner base-table SELECT remains owner-only for current permitted rows; `project_operational_summary` and `project_financial_summary` grant authenticated SELECT while remaining owner-scoped through policy and view predicates.
- Support Helper database access remains limited to four whitelisted support-safe `SECURITY DEFINER` RPCs:
  - `support_participation_operational_rows(uuid, integer, integer)`
  - `support_profile_directory(integer, integer)`
  - `support_project_participation_summary(uuid, integer, integer)`
  - `support_project_directory(integer, integer)`
- Support Helper must not gain broad base-table reads, pricing visibility, payments visibility, financial-summary visibility, or review-only / sensitive respondent fields beyond the approved safe RPC surface.
- Verification also confirmed: fixed `search_path`, function EXECUTE ACLs, view structure/dependencies/ACLs, policy identities/expressions, core-table SELECT ACL contract, preserved participation project-state guard, preserved unique respondent-per-project index, and expected RLS state (RLS on, FORCE RLS off for the ten core tables).
- A compact note: the final evidence-exact verification packet passed after local verification-packet formatting corrections; those corrections were not database defects.
- Boundaries: DEV/DEMO database evidence only. No browser smoke, no live authenticated application integration claim, no customer production-readiness claim, and no Supabase migration-history registration claim (manual SQL Editor apply).
- Deferred residual privilege follow-up remains open: non-SELECT privileges such as `MAINTAIN`, `REFERENCES`, `TRIGGER`, and `TRUNCATE` on residual surfaces (including anon/service_role patterns) are out of scope for this completed program and must not be silently closed here.
