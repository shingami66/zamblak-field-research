# Security Foundation

- `account_id` boundary (Tenant boundary)
- Row Level Security (RLS) is strictly required on all tables.
- RPC-only / Server Actions for sensitive writes.
- Financial isolation between operational and financial tables.
- Audit immutability (trigger-backed, client-immutable).
- No direct client financial access.
- Role-safe read surfaces (DEV/DEMO verified under `ZAM-WF-001F`): owner base-table SELECT remains owner-only for permitted rows; Support Helper is limited to four support-safe `SECURITY DEFINER` RPCs and must not receive broad base-table, pricing, payments, or financial-summary visibility. Residual non-SELECT privilege cleanup is deferred separately.
