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

- Supabase browser/server client factories exist in source (`src/lib/supabase/*`) and were independently reviewed; they are not yet committed with the package changes.
- Public env names only: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `NEXT_PUBLIC_SUPABASE_ANON_KEY`; no service-role client).
- Live authentication is not implemented. Login remains visual/static. `mockRole` remains the current UI role source and is not secure authorization.
- Application role authority must eventually come from authenticated database-backed profile/account context (`owner` / `support_helper`), not client state.
