# Deferred Decisions

## Product and platform

- PDF reports.
- WhatsApp Business API.
- FCM (Firebase Cloud Messaging).
- Offline mode and a mobile app.
- Advanced analytics.
- SaaS billing.
- Complex rules engine.
- Refunds/adjustments.
- Generated Supabase Database TypeScript types.
- Residual non-SELECT privilege cleanup after `ZAM-WF-001F` on the **ten core public tables, two managed views, named core trigger functions, and `postgres` GLOBAL/`public` default privileges** is **closed** under `ZAM-SEC-ACL-001` (migration `20260715120000_harden_core_acl_defaults.sql`, DEV/DEMO apply verified, commit `846894e`). Intentionally remaining out of scope: `supabase_admin`-owned default ACLs (hosted project-owner limitation) and any future non-core public objects (require explicit grants).

## Auth and account administration after `ZAM-AUTH-001D`

- Password recovery.
- Authenticated password change.
- Invitation and Support Helper administration.
- Controlled Auth-user/profile relinking administration.
- Account and profile settings.
- Broader multi-device session viewing and revocation controls. Current logout intentionally ends only the current browser session.
- Sole-Owner recovery as a separately designed, fail-closed administrative workflow.

Deleting and recreating Auth users is **not** an approved recovery or relinking procedure. Any future recovery/relinking capability must be a controlled administrative design that preserves tenant, profile, audit, and authorization integrity.

## Domain modules after controlled placeholders

- **Companies MVP CRUD:** implemented and Mozfer-smoked on designated DEV/DEMO (list/create/detail/edit). Lifecycle/delete/restore and advanced metrics remain deferred in the register below. Cross-account runtime isolation smoke remains deferred and non-blocking.
- Replace `/projects` with the real Projects module (next product phase after Companies MVP CRUD close).
- Replace Owner-only `/financials` with the real Financials module and server-authorized data integration.
- Implement the remaining sequence: Project → Respondent → Participation → Review → Financials.

The current `/projects` and `/financials` pages are navigation-safety placeholders with no fake data. They are not completed domain pages or final domain permission implementations. Companies is no longer a placeholder for MVP operational CRUD.

## Preserved onboarding deferrals

- First-Owner bootstrap (`ZAM-AUTH-001C`) is complete for repository and designated DEV/DEMO; the path is consumed there and must not be re-run.
- Customer production bootstrap/apply remains a separately authorized action when needed.
- Future controlled new-tenant self-provisioning is not MVP, not implemented, and not approved for implementation. It must never permit existing-account self-join, Owner creation in an existing account, arbitrary role selection, or browser service-role exposure.

---

## Companies domain deferred-work register (`ZAM-COMPANIES-001`)

**Authority:** Mozfer-approved Companies MVP contract and deferred-work register (`ZAM-COMPANIES-001-DOMAIN-CONTRACT-RECOVERY-1`, `ZAM-COMPANIES-001-DEFERRED-WORK-REGISTER-1`).

**Rules:**

- No deferred item is an automatic implementation commitment.
- Each item is reconsidered **only** when its concrete revisit trigger occurs.
- Permanent non-goals are not scheduled features under the current product charter.

### Required verification gate

#### DWR-COMP-026 — Live DEV/DEMO catalog verification

| Field | Content |
|---|---|
| **Classification** | **Mandatory pre-implementation verification gate** — **CLOSED (PASS)** |
| **Reason** | Live catalog was not re-verified against committed migrations before Companies design |
| **Current MVP behavior** | Gate completed: Mozfer manual metadata-only run on DEV/DEMO `gdegnwglakyblnmxgiwx` (PostgreSQL 17.6); reviewed PASS; no HOLD conditions |
| **Packet status** | Executed and reviewed. Evidence recorded in `docs/companies-live-catalog-verification.md`. Raw export reviewed but not a repository migration artifact |
| **Closed by** | Result-close documentation after Mozfer run + review (`docs(companies): record live catalog verification`) |
| **Revisit trigger** | None for this gate. Re-run catalog verify only if DEV/DEMO schema diverges materially before/during Companies apply |
| **Next task ID** | Gate closed. Companies MVP CRUD application + Mozfer smoke closed. Next product phase: `ZAM-PROJECTS-MVP-SCOPE-REVIEW-1` |
| **Dependencies** | Satisfied (approved contract; Mozfer DEV/DEMO SQL Editor run completed) |
| **Product implications** | Catalog gate closed; DB RPCs applied; application MVP CRUD closed on DEV/DEMO |
| **Security implications** | Metadata-only catalog verify; production readiness not claimed |
| **Schema implications** | Pre-design catalog reconciled; post-apply uniqueness/phone/index/RPCs exist on DEV/DEMO |
| **UX implications** | None for this gate |
| **Destination docs** | `docs/companies-live-catalog-verification.md`, `docs/project-status.md`, `docs/database-schema.md`, `docs/project-roadmap.md` |
| **Priority** | P1 (closed) |
| **Blocks current MVP implementation** | **No.** Companies MVP CRUD closed for designated DEV/DEMO. Cross-account runtime smoke remains separately deferred and non-blocking |

### Scheduled deferred features (Companies-related)

#### DWR-COMP-001 — Company soft-delete action

| Field | Content |
|---|---|
| **Classification** | Deferred product feature + security/RBAC decision |
| **Reason** | Support-safe project RPCs join non-deleted companies; soft-delete can strand SH project visibility |
| **Current MVP behavior** | Active-only (`deleted_at IS NULL`); no soft-delete UI/action; `deleted_at` is foundation only |
| **Revisit trigger** | After Projects CRUD ships **and** a safe soft-delete policy is chosen **and** all support project RPCs are re-audited for deleted-company joins |
| **Future task ID** | `ZAM-COMPANIES-LIFECYCLE-001-SOFT-DELETE-CONTRACT-1` |
| **Dependencies** | Projects module; support RPC join audit; Mozfer lifecycle approval |
| **Product implications** | Recoverable company removal |
| **Security implications** | Must not break SH operational reads or account isolation |
| **Schema implications** | Uses existing `deleted_at`; mutation RPC only |
| **UX implications** | Owner detail confirm (future) |
| **Destination docs** | this file; roadmap; roles-permissions; database-schema |
| **Priority** | P1 |
| **Blocks current MVP** | No |

#### DWR-COMP-002 — Company restore action

| Field | Content |
|---|---|
| **Classification** | Deferred product feature |
| **Reason** | No restore without soft-delete and a discoverable deleted surface |
| **Current MVP behavior** | No restore |
| **Revisit trigger** | After soft-delete contract is approved and Owner-only deleted-company discoverability is designed |
| **Future task ID** | `ZAM-COMPANIES-LIFECYCLE-001-RESTORE-CONTRACT-1` |
| **Dependencies** | DWR-COMP-001; DWR-COMP-003 |
| **Product implications** | Recover soft-deleted companies under uniqueness rules |
| **Security implications** | Owner-only; re-check active-name uniqueness |
| **Schema implications** | Clear `deleted_at` via RPC only |
| **UX implications** | Owner-only restore entry |
| **Destination docs** | this file; roles-permissions; ui-implementation-roadmap |
| **Priority** | P1 |
| **Blocks current MVP** | No |

#### DWR-COMP-003 — Deleted-companies list and management

| Field | Content |
|---|---|
| **Classification** | Deferred UI/UX surface |
| **Reason** | Soft-delete deferred; list only serves restore |
| **Current MVP behavior** | Soft-deleted excluded from all normal reads; no deleted list |
| **Revisit trigger** | When Owner soft-delete is approved and restore is in scope |
| **Future task ID** | `ZAM-COMPANIES-LIFECYCLE-002-DELETED-LIST-UI-1` |
| **Dependencies** | DWR-COMP-001; DWR-COMP-002 |
| **Product implications** | Admin recovery surface |
| **Security implications** | Owner-only; no Support Helper |
| **Schema implications** | Query `deleted_at IS NOT NULL` under Owner path |
| **UX implications** | Owner-only list + restore |
| **Destination docs** | this file; ui-implementation-roadmap; roles-permissions |
| **Priority** | P2 |
| **Blocks current MVP** | No |

#### DWR-COMP-004 — Archived / stopped / inactive company lifecycle states

| Field | Content |
|---|---|
| **Classification** | Deferred schema decision (not in approved MVP) |
| **Reason** | Stitch labels only; inventing CRM status risks state-smuggling |
| **Current MVP behavior** | Active only; “لا توجد مشاريع نشطة” is an operational observation, not a company state |
| **Revisit trigger** | When Owner needs non-delete parking that is not soft-delete **and** Mozfer re-approves a stored status model |
| **Future task ID** | `ZAM-COMPANIES-LIFECYCLE-003-STATUS-ENUM-CONTRACT-1` |
| **Dependencies** | Mozfer product decision; possible migration |
| **Product implications** | Richer lifecycle than active/deleted |
| **Security implications** | Transitions must be RPC-only |
| **Schema implications** | New column/check if ever approved |
| **UX implications** | Badges/filters only after schema |
| **Destination docs** | this file; database-schema; ui-implementation-roadmap |
| **Priority** | deferred |
| **Blocks current MVP** | No |

#### DWR-COMP-005 — Lifecycle/status filters on Companies list

| Field | Content |
|---|---|
| **Classification** | Deferred UI/UX surface |
| **Reason** | No company status enum; MVP active-only list |
| **Current MVP behavior** | No status filter; active companies only |
| **Revisit trigger** | After a stored or clearly derived filterable state is approved (DWR-COMP-004 or soft-delete list) |
| **Future task ID** | `ZAM-COMPANIES-002-LIST-FILTERS-1` |
| **Dependencies** | DWR-COMP-004 and/or DWR-COMP-003 |
| **Product implications** | Faster triage of large lists |
| **Security implications** | Filters must not leak soft-deleted to Support Helper |
| **Schema implications** | None until status exists |
| **UX implications** | Stitch status filter removed from MVP |
| **Destination docs** | ui-implementation-roadmap; this file |
| **Priority** | P2 |
| **Blocks current MVP** | No |

#### DWR-COMP-006 — Stored company-level domain field

| Field | Content |
|---|---|
| **Classification** | Deferred schema decision |
| **Reason** | Domain lives on `projects`; company column would denormalize |
| **Current MVP behavior** | No company domain column |
| **Revisit trigger** | Only if product proves company domain must exist independent of any project **and** Mozfer approves migration |
| **Future task ID** | `ZAM-COMPANIES-002-DOMAIN-FIELD-CONTRACT-1` |
| **Dependencies** | Projects domain taxonomy stability |
| **Product implications** | Industry tag without projects |
| **Security implications** | Low if account-scoped |
| **Schema implications** | New column + check if approved |
| **UX implications** | Stitch domain field removed/adapted via projects |
| **Destination docs** | this file; database-schema |
| **Priority** | deferred |
| **Blocks current MVP** | No |

#### DWR-COMP-007 — Domain filter on Companies list

| Field | Content |
|---|---|
| **Classification** | Deferred query/aggregate + UI |
| **Reason** | No company domain; filter needs project-derived multi-value logic |
| **Current MVP behavior** | No domain filter; name search only |
| **Revisit trigger** | After Projects list/detail are live **and** product needs filter-by-project-domain on companies |
| **Future task ID** | `ZAM-COMPANIES-002-DOMAIN-FILTER-1` |
| **Dependencies** | Projects CRUD; optional DWR-COMP-008 |
| **Product implications** | Find companies by project industry |
| **Security implications** | Account-scoped; finance-blind |
| **Schema implications** | Query join `projects.domain` |
| **UX implications** | Stitch domain filter removed from MVP |
| **Destination docs** | ui-implementation-roadmap; this file |
| **Priority** | P2 |
| **Blocks current MVP** | No |

#### DWR-COMP-008 — Project-domain summary on company list/detail

| Field | Content |
|---|---|
| **Classification** | Deferred query/aggregate |
| **Reason** | Extra join complexity; not required for create→project flow |
| **Current MVP behavior** | No domain summary; active count + active/closed project sections only |
| **Revisit trigger** | After Projects domain is stable in UI **and** company detail needs multi-domain chips |
| **Future task ID** | `ZAM-COMPANIES-002-DOMAIN-SUMMARY-1` |
| **Dependencies** | Projects module |
| **Product implications** | At-a-glance industry mix |
| **Security implications** | Ops-only; no finance |
| **Schema implications** | Aggregate distinct `projects.domain` |
| **UX implications** | Optional chips |
| **Destination docs** | ui-implementation-roadmap; this file |
| **Priority** | P2 |
| **Blocks current MVP** | No |

#### DWR-COMP-009 — Last-project metric on list cards

| Field | Content |
|---|---|
| **Classification** | Deferred query/aggregate |
| **Reason** | Ordering ambiguity; reduced MVP coupling |
| **Current MVP behavior** | List shows **active project count only** |
| **Revisit trigger** | After Projects module defines “last activity” product meaning |
| **Future task ID** | `ZAM-COMPANIES-002-LAST-PROJECT-METRIC-1` |
| **Dependencies** | Projects CRUD |
| **Product implications** | Recency cue on list |
| **Security implications** | Ops-only |
| **Schema implications** | Subquery/order |
| **UX implications** | Stitch “آخر مشروع” removed from MVP |
| **Destination docs** | ui-implementation-roadmap; this file |
| **Priority** | P2 |
| **Blocks current MVP** | No |

#### DWR-COMP-010 — Participant count on company detail

| Field | Content |
|---|---|
| **Classification** | Deferred query/aggregate |
| **Reason** | Depends on Participations domain and stable non-financial counts |
| **Current MVP behavior** | Not shown |
| **Revisit trigger** | After Participation query contract is approved and implemented for project-level counts |
| **Future task ID** | `ZAM-COMPANIES-002-PARTICIPANT-COUNT-1` |
| **Dependencies** | Projects + Participations modules |
| **Product implications** | Ops load at company level |
| **Security implications** | Non-financial; Support Helper–safe |
| **Schema implications** | Aggregate participations via projects |
| **UX implications** | Stitch count deferred |
| **Destination docs** | this file; ui-implementation-roadmap; project-roadmap |
| **Priority** | P2 |
| **Blocks current MVP** | No |

#### DWR-COMP-011 — Accepted-form count on company detail

| Field | Content |
|---|---|
| **Classification** | Deferred query/aggregate |
| **Reason** | Review domain; risk of conflating with financial accepted-form pricing |
| **Current MVP behavior** | Not shown |
| **Revisit trigger** | After Review workflow defines operational accepted-form counts distinct from pricing |
| **Future task ID** | `ZAM-COMPANIES-002-ACCEPTED-FORM-COUNT-1` |
| **Dependencies** | Participations + Review |
| **Product implications** | Throughput metric |
| **Security implications** | Must not expose prices/payments |
| **Schema implications** | Participation review_status aggregates |
| **UX implications** | Stitch count deferred |
| **Destination docs** | this file; ui-implementation-roadmap |
| **Priority** | P2 |
| **Blocks current MVP** | No |

#### DWR-COMP-012 — Advanced aggregate cards on Companies screens

| Field | Content |
|---|---|
| **Classification** | Deferred UI/UX surface |
| **Reason** | Out of lean MVP; couples multiple domains |
| **Current MVP behavior** | Active count + active/closed project sections only |
| **Revisit trigger** | When Mozfer requests company-level dashboard cards after Companies list/detail are live |
| **Future task ID** | `ZAM-COMPANIES-002-AGGREGATE-CARDS-1` |
| **Dependencies** | DWR-COMP-009–011 as needed |
| **Product implications** | Richer company home |
| **Security implications** | Finance-free cards only |
| **Schema implications** | Query-only |
| **UX implications** | Optional cards |
| **Destination docs** | ui-implementation-roadmap; this file |
| **Priority** | deferred |
| **Blocks current MVP** | No |

#### DWR-COMP-013 — Project reassignment to a different company

| Field | Content |
|---|---|
| **Classification** | Deferred project relationship behavior |
| **Reason** | Cross-module; account consistency; audit; out of Companies MVP |
| **Current MVP behavior** | Company fixed at project create; no reassignment UI |
| **Revisit trigger** | After Projects CRUD exists **and** Owner needs move between companies in the same account |
| **Future task ID** | `ZAM-PROJECTS-001-REASSIGN-COMPANY-CONTRACT-1` |
| **Dependencies** | Projects module |
| **Product implications** | Correct mistaken company links |
| **Security implications** | Same-account only; RPC; fail-closed |
| **Schema implications** | `projects.company_id` update via RPC |
| **UX implications** | Projects detail action |
| **Destination docs** | this file; project-roadmap; database-schema |
| **Priority** | P1 (Projects phase) |
| **Blocks current MVP** | No |

#### DWR-COMP-014 — Inline company creation from Project creation

| Field | Content |
|---|---|
| **Classification** | Deferred project relationship behavior + UI |
| **Reason** | Companies module first; single create path |
| **Current MVP behavior** | Create company only on Companies routes; Projects later pick existing company |
| **Revisit trigger** | After Companies create is stable **and** Project create UX shows friction |
| **Future task ID** | `ZAM-PROJECTS-001-INLINE-COMPANY-CREATE-1` |
| **Dependencies** | Companies create RPC; Projects create design |
| **Product implications** | Faster project setup |
| **Security implications** | Same create RPC authority as Companies |
| **Schema implications** | Reuse company create RPC |
| **UX implications** | Nested form in Projects |
| **Destination docs** | this file; project-roadmap; ui-implementation-roadmap |
| **Priority** | P2 |
| **Blocks current MVP** | No |

#### DWR-COMP-016 — Bulk company import

| Field | Content |
|---|---|
| **Classification** | Deferred product feature |
| **Reason** | Not required for single-researcher MVP; high validation risk |
| **Current MVP behavior** | Single create form only |
| **Revisit trigger** | When Owner has ≥50 companies to onboard in one session **or** Mozfer requests import |
| **Future task ID** | `ZAM-COMPANIES-002-BULK-IMPORT-1` |
| **Dependencies** | Create RPC stability; uniqueness rules |
| **Product implications** | Faster bulk onboarding |
| **Security implications** | Same tenancy/validation as create |
| **Schema implications** | Batch RPC |
| **UX implications** | Import wizard later |
| **Destination docs** | this file; project-roadmap |
| **Priority** | deferred |
| **Blocks current MVP** | No |

#### DWR-COMP-017 — Company export

| Field | Content |
|---|---|
| **Classification** | Deferred product feature (reporting) |
| **Reason** | Export out of early UI batches; privacy |
| **Current MVP behavior** | No export |
| **Revisit trigger** | When an approved Reporting/export program authorizes company operational export |
| **Future task ID** | `ZAM-REPORTS-001-COMPANY-EXPORT-1` |
| **Dependencies** | Reports domain; role matrix |
| **Product implications** | Offline list for Owner |
| **Security implications** | Owner-only likely; Support Helper TBD |
| **Schema implications** | Read-only export query |
| **UX implications** | Export button later |
| **Destination docs** | this file; project-roadmap |
| **Priority** | deferred |
| **Blocks current MVP** | No |

#### DWR-COMP-018 — Advanced company reporting

| Field | Content |
|---|---|
| **Classification** | Deferred product feature |
| **Reason** | Reports phase; not Companies MVP |
| **Current MVP behavior** | No reports |
| **Revisit trigger** | After Financials/Reports roadmap phase starts with approved metrics |
| **Future task ID** | `ZAM-REPORTS-001-COMPANY-REPORTS-1` |
| **Dependencies** | Financials + Reports |
| **Product implications** | Cross-company analytics |
| **Security implications** | Owner financial vs Support Helper ops split |
| **Schema implications** | Views/RPCs later |
| **UX implications** | Reports area, not Companies |
| **Destination docs** | this file; project-roadmap |
| **Priority** | deferred |
| **Blocks current MVP** | No |

#### DWR-COMP-019 — Company financial ledger / company-level payments or settlements

| Field | Content |
|---|---|
| **Classification** | Deferred to Financials domain (not Companies MVP) |
| **Reason** | Finance isolated to project financial settings/payments; Support Helper finance-blind |
| **Current MVP behavior** | Zero financial fields/joins on Companies |
| **Revisit trigger** | Inside Owner Financials module if product needs company rollups of project finance |
| **Future task ID** | `ZAM-FINANCIALS-001-COMPANY-ROLLUP-1` |
| **Dependencies** | Financials domain; Owner-only |
| **Product implications** | Settlement by client |
| **Security implications** | Owner-only; never Support Helper |
| **Schema implications** | Not on `companies` table |
| **UX implications** | Financials routes only |
| **Destination docs** | this file; project-roadmap; roles-permissions |
| **Priority** | deferred (Financials phase) |
| **Blocks current MVP** | No |

#### DWR-COMP-024 — Cursor pagination

| Field | Content |
|---|---|
| **Classification** | Deferred query design |
| **Reason** | MVP uses offset/page (default 25, max 50) |
| **Current MVP behavior** | Offset pagination only |
| **Revisit trigger** | When account company count consistently exceeds ~500 **and** offset performance/UX degrades |
| **Future task ID** | `ZAM-COMPANIES-002-CURSOR-PAGINATION-1` |
| **Dependencies** | Live scale evidence |
| **Product implications** | Stable deep paging |
| **Security implications** | Same account bounds |
| **Schema implications** | Keyset on (normalized_name, id) |
| **UX implications** | Next-cursor controls |
| **Destination docs** | this file; database-schema |
| **Priority** | deferred |
| **Blocks current MVP** | No |

#### DWR-COMP-025 — Advanced search/filtering beyond name

| Field | Content |
|---|---|
| **Classification** | Deferred UI + query |
| **Reason** | MVP name search only |
| **Current MVP behavior** | Name search max 120 characters |
| **Revisit trigger** | After soft-delete list, domain filter, or phone search is product-approved |
| **Future task ID** | `ZAM-COMPANIES-002-ADVANCED-SEARCH-1` |
| **Dependencies** | DWR-COMP-005–007 as relevant |
| **Product implications** | Power-user find |
| **Security implications** | No cross-account leakage |
| **Schema implications** | Indexes as needed |
| **UX implications** | Filter panel later |
| **Destination docs** | ui-implementation-roadmap; this file |
| **Priority** | P2 |
| **Blocks current MVP** | No |

#### DWR-COMP-027 — Email, city, and address company fields

| Field | Content |
|---|---|
| **Classification** | Deferred schema decision |
| **Reason** | Not in schema; not required for Company→Project MVP |
| **Current MVP behavior** | Not collected |
| **Revisit trigger** | When Owner repeatedly needs non-phone contact or location **and** Mozfer approves fields |
| **Future task ID** | `ZAM-COMPANIES-002-EXTENDED-CONTACT-FIELDS-1` |
| **Dependencies** | Mozfer; migration |
| **Product implications** | Richer contact card |
| **Security implications** | More PII surface |
| **Schema implications** | New nullable columns |
| **UX implications** | Form fields |
| **Destination docs** | this file; database-schema |
| **Priority** | deferred |
| **Blocks current MVP** | No |

### Rejected alternatives

#### DWR-COMP-028 — Owner-only Companies UI (instead of Support Helper Companies access)

| Field | Content |
|---|---|
| **Classification** | **Rejected alternative** under the currently approved MVP contract |
| **Reason** | Mozfer approved Support Helper list/detail/create/edit through bounded authenticated paths |
| **Current MVP behavior (approved)** | Support Helper uses support-safe RPCs for read; Server Action → RPC for create/edit of four operational fields |
| **Revisit trigger** | Only if Mozfer later **revokes** Support Helper Companies access |
| **Future task ID** | `ZAM-COMPANIES-SECURITY-001-OWNER-ONLY-ACCESS-1` |
| **Dependencies** | Mozfer revocation decision |
| **Product implications** | Narrower helper operations |
| **Security implications** | Tighter least privilege if ever chosen |
| **Schema implications** | May adjust INSERT policy expectations |
| **UX implications** | Hide Companies for Support Helper or read-only |
| **Destination docs** | roles-permissions; this file |
| **Priority** | Only if approval revokes SH path |
| **Blocks current MVP** | Yes **only if** Mozfer later rejects the approved SH model |

### Permanent non-goals (current product charter)

These are **not** scheduled implementation items unless the product charter changes.

#### DWR-COMP-015 — Hard delete of companies

| Field | Content |
|---|---|
| **Classification** | Permanent Companies MVP non-goal (revisit only under data-retention program) |
| **Reason** | Audit, FK to projects, safety; soft-delete foundation preferred if ever needed |
| **Current MVP behavior** | No delete of any kind in UI |
| **Revisit trigger** | Only under an approved data-retention/erasure policy covering projects and audits |
| **Future task ID** | `ZAM-COMPANIES-SECURITY-001-HARD-DELETE-POLICY-1` |
| **Dependencies** | Legal/product retention; full cascade design |
| **Product implications** | True erasure |
| **Security implications** | High risk of orphan/history loss |
| **Schema implications** | Destructive |
| **UX implications** | Extreme confirm |
| **Destination docs** | this file; database-schema |
| **Priority** | deferred |
| **Blocks current MVP** | No |

#### DWR-COMP-020 — CRM sales pipeline

| Field | Content |
|---|---|
| **Classification** | Permanent non-goal under current Zamblak product charter |
| **Reference** | `ZAM-COMPANIES-OUT-OF-SCOPE-CRM-1` |
| **Reason** | Out of product scope; CRM contamination risk |
| **Current MVP behavior** | Operational client registry only |
| **Revisit trigger** | Only if product charter expands beyond field research ops |
| **Future task ID** | Not scheduled |
| **Dependencies** | Product charter change |
| **Destination docs** | this file |
| **Priority** | deferred |
| **Blocks current MVP** | No |

#### DWR-COMP-021 — Company user accounts or company portal

| Field | Content |
|---|---|
| **Classification** | Permanent non-goal under current product model |
| **Reason** | Companies are data entities under the researcher account, not tenants |
| **Current MVP behavior** | Company is a row under researcher account |
| **Revisit trigger** | Only if multi-tenant company-login product is approved |
| **Future task ID** | Not scheduled |
| **Destination docs** | this file |
| **Priority** | deferred |
| **Blocks current MVP** | No |

#### DWR-COMP-022 — Cross-account company sharing

| Field | Content |
|---|---|
| **Classification** | Permanent non-goal under current tenancy model |
| **Reason** | Violates account isolation |
| **Current MVP behavior** | Strict `account_id` scoping |
| **Revisit trigger** | Never under current tenancy without a new multi-tenant design program |
| **Future task ID** | Not scheduled |
| **Destination docs** | this file; security-foundation (non-goal) |
| **Priority** | deferred |
| **Blocks current MVP** | No |

#### DWR-COMP-023 — External company enrichment

| Field | Content |
|---|---|
| **Classification** | Permanent Companies MVP non-goal |
| **Reason** | Privacy, cost, out of MVP |
| **Current MVP behavior** | Manual fields only |
| **Revisit trigger** | When Mozfer approves a specific enrichment provider under privacy review |
| **Future task ID** | Not scheduled |
| **Destination docs** | this file |
| **Priority** | deferred |
| **Blocks current MVP** | No |

Also permanent for Companies screens (see DWR-COMP-019 for Financials rollup later):

- Company financial ledger on Companies UI
- Company payments/settlements on Companies UI
- Fake sample companies as product content
