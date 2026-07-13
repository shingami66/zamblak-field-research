# Product Requirements Document

## Project Info
- Project name: Zamblak Field Research
- Arabic name: زمبلك للأبحاث الميدانية

## Core Product Principles
- Respondent Registry is the heart of the product.
- Store each respondent once.
- One mobile number represents one respondent only.
- Reuse respondent participation history across projects.
- Warn about same-domain participation within 3 months (warning only, do not block).
- Hard block only same respondent inside same active project.
- Accepted forms only count financially.
- Completed/transferred forms do not count financially.
- Owner-only financial control.
- Support Helper operational only.

## Participation Membership Rules
- Respondents may be created, searched, and maintained in the Respondent Registry independently of project activation. Registry existence does not create project participation.
- A draft project may be configured and prepared, including eligibility, quota, dates, domain, company, and other approved project setup.
- Registry preparation and draft project preparation do not create participation membership by themselves.
- Participation membership writes are allowed only when the target project is `active` and `deleted_at IS NULL`.
- Draft projects reject participation `INSERT`, reassignment into the project, and restore of a soft-deleted participation.
- Closed, cancelled, and deleted projects reject participation `INSERT`, reassignment into the project, and restore of a soft-deleted participation.
- Closing a project ends that project's active duplicate-blocking scope for future participation in other projects. It does not permit new participation writes into the closed project.
- This section records a product decision only. Migration design, runtime enforcement, database behavior, and manual smoke are not yet proven here.

## MVP Import, Export, and Reporting Scope
- Excel import remains in MVP. A `support_helper` may perform operational import when otherwise authorized.
- Operational Excel export is approved MVP product scope, but implementation, runtime behavior, server authorization, RLS enforcement, field filtering, and manual export smoke are not yet proven.
- A `support_helper` may export only legitimate fieldwork records within the same authorized account and authorized project.
- Operational exports may include only fields the role is otherwise authorized to access; approving a field for export does not expand the role's underlying read permission.
- Export generation, storage, and download handling must preserve the same account, project, role, and field boundaries. PII must not leak through logs, URLs or query strings, analytics or telemetry, error messages, temporary files, or unauthorized downloads.
- A `support_helper` operational export may include only: respondent reference or code, full name, full mobile number, project code, project name, age or a product-provided age band, resident type, eligibility status, non-financial operational participation status, and scheduled or interview date.
- Full mobile is allowed only for legitimate fieldwork contact within the authorized account and project. Age does not authorize date of birth.
- A `support_helper` export must exclude financial data or signals (price per form, pricing records, amounts, totals, dues, payments, settlement data, financial summaries or labels, calculation or billing-trigger results, and accepted-count aggregates that enable financial inference); national ID, identity-document images, date of birth, detailed address or precise location, sensitive free-text notes, cross-project history, internal account IDs, authorization or security metadata, soft-deleted or inactive records, and unauthorized-account data.
- Financial exports remain owner-only, including direct and indirect financial information. UI visibility alone is not authorization.
- Operational export is not permission to export the complete respondent registry or an unrestricted respondent database. Bulk or unrestricted export across projects, accounts, or the full registry is forbidden; only the approved fields for authorized projects, records, and operational purposes may be exported.
- A non-financial operational participation status must not expose, encode, imply, or authorize financial review, accepted-form billing consequence, price per form, pricing, amounts or totals, dues, payment state, settlement state, or any financial consequence or inference. If a status cannot be safely separated from financial meaning, it must not be included until a later authorized implementation mapping resolves it.
- Excel import, operational Excel export, financial export, PDF reports, and analytics are separate capabilities. PDF reports and advanced reporting dashboards or analytics are deferred.
- This scope does not authorize new product or schema fields.

## Tech Stack
- Next.js + TypeScript + Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Supabase RLS
- Next.js Server Actions / RPC for sensitive writes
- Excel import/export in MVP
- PDF deferred
- WhatsApp wa.me manual links in MVP
- FCM deferred for internal notifications only
- Google Stitch may be used later for UI design inspiration, not as business logic source of truth
