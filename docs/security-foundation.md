# Security Foundation

- `account_id` boundary (Tenant boundary)
- Row Level Security (RLS) is strictly required on all tables.
- RPC-only / Server Actions for sensitive writes.
- Financial isolation between operational and financial tables.
- Audit immutability (trigger-backed, client-immutable).
- No direct client financial access.
- Role-safe read surfaces (DEV/DEMO verified under `ZAM-WF-001F`): owner base-table SELECT remains owner-only for permitted rows; Support Helper is limited to four support-safe `SECURITY DEFINER` RPCs and must not receive broad base-table, pricing, payments, or financial-summary visibility. Residual non-SELECT privilege cleanup is deferred separately.
- Supabase runtime client foundation (`ZAM-AUTH-001A`, source present, not yet committed): browser and request-scoped server clients use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` via `@supabase/ssr`. No service-role or secret key on the normal app path. Client-side role stubs (`mockRole`) are not authorization. Live session, Proxy refresh, login, and profile resolution are not implemented yet.
