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

- Add/edit companies (Companies MVP create/edit **runtime-verified** on designated DEV/DEMO for same-account Support Helper).
- Add/edit **non-financial** project details and list/view projects under the frozen Projects MVP design (`docs/projects-schema-rpc-design.md`) — **database RPCs applied on DEV/DEMO**; **not implemented in app yet**; Support Helper **must not** transition project lifecycle and remains **finance-blind**.
- Add/edit respondents and add a respondent to a project.
- Import Excel and export operational reports.
- Open a WhatsApp link and confirm a manual WhatsApp send.
- Update contact status and mark a form completed/transferred.

Cannot:

- View financial wording, data, summaries, prices, payments, due amounts, or financial placeholders (**finance-blind**).
- Change prices, mark accepted/rejected, record payments, or export financial reports.
- Select or escalate their role.

## Current authenticated route access (`ZAM-AUTH-001D` — implemented)

| Capability | `owner` | `support_helper` | Current boundary |
| :--- | :---: | :---: | :--- |
| Protected dashboard `/` | Yes | Yes | Responsive authenticated shell; no fake metrics. |
| `/companies` list | Yes | Yes | **Implemented** MVP list + search + pagination. |
| `/companies/new` | Yes | Yes | **Implemented** create (Server Action → RPC). |
| `/companies/[id]` | Yes | Yes | **Implemented** detail (operational fields + counts). |
| `/companies/[id]/edit` | Yes | Yes | **Implemented** edit + optimistic concurrency. |
| Controlled `/projects` | Yes | Yes | Navigation-safety placeholder only. |
| Account menu | Yes | Yes | Server-resolved profile context. |
| Logout | Yes | Yes | Current browser session only (`scope: "local"`) → `/login`. |
| Controlled `/financials` | Yes | No | Owner-only placeholder; Support Helper redirects to `/`; no financial wording or data. |

`/projects` and `/financials` placeholders prevent dead navigation; they do not represent completed domain modules. Companies MVP is implemented and Mozfer-smoked on designated DEV/DEMO only.

## Companies permissions (MVP — implemented + DEV/DEMO smoke)

Mozfer-approved Companies MVP contract. **Database RPCs applied** on designated DEV/DEMO (`20260716120000_companies_mvp_schema_rpc.sql`). **Application list/create/detail/edit wired**. **Owner and same-account Support Helper Mozfer smoke PASS**. **Finance-blind Support Helper UI PASS**. **Cross-account runtime isolation NOT TESTED** (deferred, non-blocking). Production readiness **not** claimed.

### Owner (implemented)

| Action | Allowed | Enforcement |
| :--- | :---: | :--- |
| List / search companies | Yes | Server-side helpers + request-scoped authenticated Supabase client; RLS remains authoritative |
| View company detail | Yes | Same |
| Create company | Yes | Server Action → authenticated RPC |
| Edit `name`, `contact_person`, `phone`, `notes` | Yes | Server Action → authenticated RPC |
| Soft-delete / restore | **No** (MVP) | Deferred (`DWR-COMP-001`–`003`) |
| Companies financial ledger | **No** | Finance stays off Companies UI |
| View operational project summaries | Yes | Non-financial project aggregates only |

### Support Helper (implemented; same-account smoke PASS)

| Action | Allowed | Enforcement |
| :--- | :---: | :--- |
| List / search companies | Yes | Authenticated Companies list/detail RPCs (bounded; finance-free) |
| View company detail | Yes | Same RPCs |
| Create company | Yes | Server Action → authenticated RPC |
| Edit the same four operational fields | Yes | Server Action → authenticated RPC |
| Soft-delete / restore | **No** | — |
| Broad Companies base-table SELECT | **No** | Owner-only base SELECT posture remains |
| Direct base-table mutation / UPDATE | **No** | Denied by design |
| Finance (prices, payments, due amounts, summaries) | **No** | **Finance-blind** (Mozfer UI smoke PASS) |
| Operational notes view/edit | Yes | Explicit Mozfer approval recorded for MVP |

### Companies mutation and authority invariants

- All create/edit mutations: **Server Action → authenticated RPC**.
- List/detail MVP path: unified RPCs for Owner and Support Helper (see `docs/companies-schema-rpc-design.md`). Owner-only base-table SELECT (`sel_companies`) remains; Support Helper must not gain broad Companies SELECT.
- No direct client or direct base-table UPDATE path; authenticated relation privileges remain SELECT-only.
- No browser-supplied trusted `account_id`, role, profile, ownership, or finance authority.
- Account isolation fails closed at RPC design; **cross-account runtime smoke with a second account remains NOT TESTED**.
- Stable errors include `duplicate_company_name`, `invalid_company_phone`, `company_not_found`, `company_access_denied`, `invalid_company_name`, `invalid_pagination`, `stale_company_version`, plus contact/notes field codes.
- No lifecycle RPC in MVP.

### Distinguishing planned vs current

| Surface | Current (implemented + DEV/DEMO smoke) | Still deferred / not claimed |
| :--- | :--- | :--- |
| Companies DB RPCs / indexes | Applied on DEV/DEMO; used by app | Production readiness |
| `/companies` page | List with search, pagination, operational counts | Lifecycle filters, finance KPIs |
| `/companies/new`, `/companies/[id]`, `/companies/[id]/edit` | Dedicated senior-friendly pages | Delete/restore UI |
| Support Helper company reads/writes | Same-account smoke PASS | Cross-account second-account smoke |

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
- Boundaries: DEV/DEMO database evidence only for read-surface apply. Companies domain RPCs were **later applied** on DEV/DEMO under `20260716120000_companies_mvp_schema_rpc.sql` (object-verified). Application wiring and runtime smoke remain separate.

## MVP access and onboarding authority

Binding policy: `INVITATION_OR_ADMIN_SEED_ONLY`.

- The one-time first-Owner bootstrap created exactly one initial account and one active, non-deleted Owner through a privileged SQL-owner-only path. It is consumed on designated DEV/DEMO and is not a recovery or normal application route.
- Support Helpers are onboarded only by an authorized Owner or controlled administration. Self-registration and role escalation are prohibited.
- Existing-account access is invitation or controlled administrative seed only. Public self-service signup and arbitrary account creation are disabled for MVP.
- Additional tenants and sole-Owner recovery require separately approved future designs.
