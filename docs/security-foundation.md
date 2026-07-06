# Security Foundation

- `account_id` boundary (Tenant boundary)
- Row Level Security (RLS) is strictly required on all tables.
- RPC-only / Server Actions for sensitive writes.
- Financial isolation between operational and financial tables.
- Audit immutability (trigger-backed, client-immutable).
- No direct client financial access.
