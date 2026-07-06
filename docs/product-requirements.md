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
