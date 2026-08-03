# Zamblak Field Research
زمبلك للأبحاث الميدانية

Zamblak is an Owner-first field-research management system covering companies, projects, respondents, participations, research forms, review, and financial/collection foundations. This repository is a **DEV/DEMO baseline**; production readiness is **not** claimed.

## Current status

- The repository represents a DEV/DEMO baseline; production readiness is not claimed.
- The product is currently **Owner-first**.
- Current code recognizes `owner` and `support_helper`.
- `support_helper` is **legacy compatibility** and does not define future product design. No future role names are invented here.

## Current live hierarchy

`Account → Company → Project → Participation → Research Form`

Approved future logical direction (not implemented):

`Account → Company → Project → Sample → Participation → Research Form`

- **Project Sample is not implemented** in schema or code.
- `P###-S##-F###` is a future human-reference direction only.
- Physical Sample schema and rollout remain unresolved.

## Delivered baseline

- Supabase Auth login at `/login` and an authenticated application shell.
- Companies: list/create/detail/edit.
- Projects: list/create/detail/edit.
- Project lifecycle transitions: Owner-only.
- Respondent Registry: list/create/detail/edit.
- Participation assignment and three-month eligibility warning foundations.
- Exactly one persisted Research Form per Participation.
- Research Form submission, detail, and Owner review foundations.
- Form financial-summary and Collections database/RPC foundations.

## Known limitations

- The Collections application UI remains prototype-only and `sessionStorage`-backed (namespace `zamblak.forms-prototype.v1`).
- `/financials` is Owner-only and currently renders mock/demo data.
- Live payment-recording UI and financial-report export are not fully implemented or runtime-accepted.
- Successful Research Form acceptance requires usable authoritative pricing; acceptance fails closed when pricing is unavailable.
- Project Sample is not implemented.
- Production deployment is not claimed.

## Technology stack

Verified from current `package.json` and repository configuration:

- Next.js 16 (App Router) + React 19 + TypeScript 5
- Tailwind CSS 4
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`) on PostgreSQL
- ESLint 9; Vitest + Testing Library (UI tests); `tsx` (Node tests)

## Local development

Prerequisites: Node.js with npm, and the approved local environment configuration.

- Install dependencies: `npm install`
- Development server: `npm run dev`
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`
- Tests: `npm test` (or `npm run test:node` / `npm run test:ui` individually)
- Production build: `npm run build`

The repository does not ship a committed environment template (`.env.local` is gitignored and never committed). Contributors must obtain the approved local environment configuration (Supabase URL and publishable key) from the repository owner. Never commit secrets.

## Canonical documentation

This README is an entry point. Canonical documents govern detailed product, role, schema, migration, security, and roadmap truth:

- [docs/product-requirements.md](./docs/product-requirements.md) — product requirements and business rules
- [docs/roles-permissions.md](./docs/roles-permissions.md) — roles and permission boundaries
- [docs/database-schema.md](./docs/database-schema.md) — schema and invariants
- [docs/database-migrations.md](./docs/database-migrations.md) — migration ledger
- [docs/project-roadmap.md](./docs/project-roadmap.md) — roadmap and canonical direction
- [docs/deferred-decisions.md](./docs/deferred-decisions.md) — deferred, unresolved, closed, and historical decision register
- [docs/security-foundation.md](./docs/security-foundation.md) — security foundation
- [docs/project-status.md](./docs/project-status.md) — **historical evidence** of milestones and smoke logs; not current product authority

## Phase 1 workflow contracts

Workflow contracts are subordinate Phase 1 delivery artifacts. Canonical product, role, schema, security, decision, and roadmap documents remain authoritative; inclusion here does not mean implementation or runtime acceptance.

- [docs/contracts/research-form-submission-screen-contract.md](./docs/contracts/research-form-submission-screen-contract.md) — Research Form submission Screen Contract for the Owner-first `/forms/new` workflow.

## Contributor and agent governance

Repository tasks (agents and contributors) must follow the execution modes, exact scope, approval gates, and safety requirements defined in [AGENTS.md](./AGENTS.md) and the skills under `.agents/skills/`.
