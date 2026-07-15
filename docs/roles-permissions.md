# Roles and Permissions

## MVP roles and authority

The only approved application roles are:

1. `owner`
2. `support_helper`

Application authority is resolved on the server from the authenticated user's active, non-deleted database profile and account membership. Browser state, form input, URL parameters, and role labels are never authority. The former `mockRole` UI source has been removed. Normal application requests use the authenticated user-session client under RLS; no service-role client is used.

## Owner

Can:

- Manage all operational data.
- Mark accepted/rejected.
- Set project price.
- View financial summaries and future financial data.
- Record payments.
- Export financial reports.

## Support Helper

Can:

- Add/edit companies and non-financial project details.
- Add/edit respondents and add a respondent to a project.
- Import Excel and export operational reports.
- Open a WhatsApp link and confirm a manual WhatsApp send.
- Update contact status and mark a form completed/transferred.

Cannot:

- View financial wording, data, summaries, prices, payments, due amounts, or financial placeholders.
- Change prices, mark accepted/rejected, record payments, or export financial reports.
- Select or escalate their role.

## Current authenticated route access (`ZAM-AUTH-001D`)

| Capability | `owner` | `support_helper` | Current boundary |
| :--- | :---: | :---: | :--- |
| Protected dashboard `/` | Yes | Yes | Responsive authenticated shell; no fake metrics. |
| Controlled `/companies` | Yes | Yes | Navigation-safety placeholder only; real Companies permissions/data are not complete. |
| Controlled `/projects` | Yes | Yes | Navigation-safety placeholder only; real Projects permissions/data are not complete. |
| Account menu | Yes | Yes | Displays server-resolved profile context. |
| Logout | Yes | Yes | Ends only the current browser session (`scope: "local"`) and redirects to `/login`. |
| Controlled `/financials` | Yes | No | Owner-only placeholder. Support Helper direct access redirects to `/`; no financial wording or data is exposed. |

These placeholders prevent dead navigation; they do not represent completed domain modules or final domain permission enforcement.

## Verified database read surface (DEV/DEMO, `ZAM-WF-001F`)

Database evidence from the manually applied `202607130002_role_safe_read_surfaces.sql` on the designated DEV/DEMO database:

- Owner base-table SELECT remains Owner-only for permitted rows; operational and financial summary views remain Owner-scoped.
- Support Helper access is limited to four approved support-safe `SECURITY DEFINER` RPCs:
  - `support_participation_operational_rows(uuid, integer, integer)`
  - `support_profile_directory(integer, integer)`
  - `support_project_participation_summary(uuid, integer, integer)`
  - `support_project_directory(integer, integer)`
- Support Helper must not receive broad base-table reads, pricing, payments, financial summaries, or review-only/sensitive respondent fields beyond that safe RPC surface.
- The verified managed inventory remains 11 functions, 2 views, and 23 policies; managed manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4` (8238 octets).
- Boundaries: DEV/DEMO evidence only; application integration of the domain RPCs and residual non-SELECT privilege cleanup remain separate future work.

## MVP access and onboarding authority

Binding policy: `INVITATION_OR_ADMIN_SEED_ONLY`.

- The one-time first-Owner bootstrap created exactly one initial account and one active, non-deleted Owner through a privileged SQL-owner-only path. It is consumed on designated DEV/DEMO and is not a recovery or normal application route.
- Support Helpers are onboarded only by an authorized Owner or controlled administration. Self-registration and role escalation are prohibited.
- Existing-account access is invitation or controlled administrative seed only. Public self-service signup and arbitrary account creation are disabled for MVP.
- Additional tenants and sole-Owner recovery require separately approved future designs.
