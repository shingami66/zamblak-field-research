# Roles and Permissions

## MVP Roles
1. `owner`
2. `support_helper`

## Owner
Can:
- Manage all operational data
- Mark accepted/rejected
- Set project price
- View financial summaries
- Record payments
- Export financial reports

## Support Helper
Can:
- Add/edit companies
- Add/edit non-financial project details
- Add/edit respondents
- Import Excel
- Export operational reports
- Add respondent to project
- Open WhatsApp link
- Confirm manual WhatsApp sent
- Update contact status
- Mark form completed/transferred

Cannot:
- View financial data
- View payments
- Change prices
- Mark accepted/rejected
- Record payments
- Export financial reports

## Verified database read surface (DEV/DEMO, ZAM-WF-001F)

Database evidence from manually applied `202607130002_role_safe_read_surfaces.sql` on designated DEV/DEMO project `gdegnwglakyblnmxgiwx` (post-apply verification PASS):

- **Owner**: base-table SELECT remains owner-only for current permitted rows; operational and financial summary views remain owner-scoped.
- **Support Helper**: database access is limited to four support-safe `SECURITY DEFINER` RPCs only:
  - `support_participation_operational_rows(uuid, integer, integer)`
  - `support_profile_directory(integer, integer)`
  - `support_project_participation_summary(uuid, integer, integer)`
  - `support_project_directory(integer, integer)`
- Support Helper must not receive broad base-table reads, pricing visibility, payments visibility, financial-summary visibility, or review-only / sensitive respondent fields beyond the approved safe RPC surface.
- Managed inventory verified: 11 functions, 2 views, 23 policies; managed manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4` (8238 octets).
- Boundaries: DEV/DEMO only; no live application authorization claim; no browser smoke claim; residual non-SELECT privilege cleanup remains a separate deferred security follow-up.

## Application runtime status (ZAM-AUTH-001A foundation)

- Supabase browser/server client factories exist in source (`src/lib/supabase/*`), were independently reviewed, and are committed and pushed in `567c021670b4f6546993c7529256df7b5e6cacf7` (`feat(auth): add Supabase runtime client foundation`) with the package changes.
- Public env names only: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `NEXT_PUBLIC_SUPABASE_ANON_KEY`; no service-role client).
- Live authentication is not implemented. Login remains visual/static. `mockRole` remains the current UI role source and is not secure authorization.
- Application role authority must eventually come from authenticated database-backed profile/account context (`owner` / `support_helper`), not client state.

## MVP access and onboarding authority (ZAM-AUTH-001B recorded; 001C design approved)

Binding MVP policy: `INVITATION_OR_ADMIN_SEED_ONLY`.

- **Deployment first Owner (current MVP bootstrap, APPROVED DESIGN ONLY):** globally one-time deployment initialization creates **exactly one** initial account and **exactly one** initial active non-deleted Owner via a privileged SQL-owner-only administrative path (not public or normal application routes). After any Owner profile has existed (including inactive or soft-deleted historical Owners), this bootstrap path remains unavailable. It cannot create another Owner or another tenant. Users must not create themselves as Owner. Users must not select their own role. Design detail: `docs/first-owner-bootstrap-design.md`. **Not implemented. Not applied. Not available at runtime.**
- **Support Helper:** onboarded only by an authorized Owner or controlled administrative creation. Self-registration is prohibited. Role escalation to Owner (or any other role) by the Support Helper is prohibited.
- **Existing-account access after initialization:** invitation or controlled administrative seed only for MVP. Public self-service signup and arbitrary account creation are disabled for MVP.
- **Additional tenants:** future separate program only; not authorized by the approved current bootstrap.
- **Runtime role authority:** server-resolved profile and account membership under RLS. `mockRole` has no authority (UI-only). Service-role credentials never enter browser or normal user-session paths. Live application role enforcement is not claimed yet.
- **Sole-Owner recovery:** deferred separate design (not the bootstrap path).
- **Long-term (not MVP; not implemented; not approved for implementation):** a future separately approved program may allow a verified new researcher to create a **new** tenant/account only and become its single initial Owner through controlled server-side atomic provisioning. It must never allow joining an existing account without invitation, creating an Owner inside an existing account, or selecting an arbitrary role.
