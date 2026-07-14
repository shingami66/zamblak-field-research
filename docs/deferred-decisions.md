# Deferred Decisions

- PDF reports
- WhatsApp Business API
- FCM (Firebase Cloud Messaging)
- Offline mode
- Mobile app
- Advanced analytics
- SaaS billing
- Complex rules engine
- Refunds/adjustments
- Residual non-SELECT privilege cleanup after role-safe read surfaces (`ZAM-WF-001F`): privileges such as `MAINTAIN`, `REFERENCES`, `TRIGGER`, and `TRUNCATE` that may remain on residual catalog surfaces (including anon/service_role patterns) are intentionally out of scope for the completed read-surface program and require a separate future security follow-up. Do not fold this cleanup into completed 001F apply/verification claims.
- Live authentication follow-ups after the Supabase runtime client foundation (`ZAM-AUTH-001A`): session refresh via Next.js 16 `proxy.ts`; login/logout; auth UX method confirmation before login implementation; DEV/DEMO first-owner bootstrap; fail-closed missing/inactive/deleted profile UX; replacement of `mockRole`; protected routes; generated Supabase Database TypeScript types; first domain slice; Support Helper RPC application integration; Mozfer-owned browser smoke. Do not treat client-factory presence as authentication complete.
