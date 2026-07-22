-- ============================================================================
-- Zamblak Field Research Core Database Schema
-- Migration: 20260723130000_forms_collections_rls_views.sql
-- Backend Schema Slice 2: Row Level Security, Table Privileges & Read Views
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ROW LEVEL SECURITY (RLS) ENABLEMENT & FORCING
-- ----------------------------------------------------------------------------

ALTER TABLE public.research_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_forms FORCE ROW LEVEL SECURITY;

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections FORCE ROW LEVEL SECURITY;

ALTER TABLE public.collection_allocation_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_allocation_revisions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.collection_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_allocations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys FORCE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- 2. DIRECT TABLE PRIVILEGES HARDENING
-- ----------------------------------------------------------------------------

-- Revoke all direct privileges on new tables from PUBLIC, anon, and authenticated
REVOKE ALL ON TABLE public.research_forms FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.collections FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.collection_allocation_revisions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.collection_allocations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.idempotency_keys FROM PUBLIC, anon, authenticated;

-- Grant SELECT only to authenticated for financial base tables (excluding idempotency_keys)
GRANT SELECT ON TABLE public.research_forms TO authenticated;
GRANT SELECT ON TABLE public.collections TO authenticated;
GRANT SELECT ON TABLE public.collection_allocation_revisions TO authenticated;
GRANT SELECT ON TABLE public.collection_allocations TO authenticated;


-- ----------------------------------------------------------------------------
-- 3. OWNER-ONLY RLS SELECT POLICIES
-- ----------------------------------------------------------------------------

-- Owner-only SELECT policy for research_forms
CREATE POLICY research_forms_owner_select ON public.research_forms
  FOR SELECT USING (account_id = current_account_id() AND is_owner());

-- Owner-only SELECT policy for collections
CREATE POLICY collections_owner_select ON public.collections
  FOR SELECT USING (account_id = current_account_id() AND is_owner());

-- Owner-only SELECT policy for collection_allocation_revisions
CREATE POLICY collection_allocation_revisions_owner_select ON public.collection_allocation_revisions
  FOR SELECT USING (account_id = current_account_id() AND is_owner());

-- Owner-only SELECT policy for collection_allocations
CREATE POLICY collection_allocations_owner_select ON public.collection_allocations
  FOR SELECT USING (account_id = current_account_id() AND is_owner());

-- NOTE: idempotency_keys table has ZERO client RLS policies.
-- It can be accessed exclusively by internal SECURITY DEFINER mutation RPCs.


-- ----------------------------------------------------------------------------
-- 4. HARDEN EXECUTE PRIVILEGES ON SLICE 1 FUNCTIONS
-- ----------------------------------------------------------------------------

-- Revoke EXECUTE from PUBLIC, anon, and authenticated on all 17 Slice 1 trigger & helper functions
REVOKE EXECUTE ON FUNCTION public.check_research_forms_immutability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_research_forms_delete_protection() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_collections_version_progression() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_collections_immutability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_collections_delete_protection() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_car_immutability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_ca_immutability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_idempotency_keys_immutability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_idempotency_keys_delete_protection() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_research_forms_account_consistency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_collections_account_consistency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_collections_replacement_consistency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_car_account_consistency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_ca_account_consistency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_collection_current_revision_consistency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_car_collection_version_consistency() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_collection_revision_sequence_invariant(uuid) FROM PUBLIC, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5. FINANCIAL READ VIEWS (SECURITY INVOKER)
-- ----------------------------------------------------------------------------

-- Form Financial Summary View (Owner-visible receivables summary per accepted research form)
CREATE VIEW public.form_financial_summary
WITH (security_invoker = true) AS
SELECT
  rf.id AS research_form_id,
  rf.account_id,
  rf.project_id,
  rf.company_id,
  rf.respondent_id,
  rf.participation_id,
  rf.code AS form_code,
  rf.submitted_date,
  rf.accepted_at,
  rf.accepted_price_snapshot,
  COALESCE(SUM(ca.amount), 0.00)::numeric(12,2) AS allocated_amount,
  GREATEST(rf.accepted_price_snapshot - COALESCE(SUM(ca.amount), 0.00), 0.00)::numeric(12,2) AS outstanding_amount,
  CASE
    WHEN COALESCE(SUM(ca.amount), 0.00) = 0 THEN 'uncollected'
    WHEN COALESCE(SUM(ca.amount), 0.00) < rf.accepted_price_snapshot THEN 'partially_collected'
    ELSE 'collected'
  END AS settlement_state,
  (p.end_date + COALESCE(pfs.payment_due_days_after_end, 40))::date AS due_date
FROM public.research_forms rf
JOIN public.projects p ON p.id = rf.project_id
LEFT JOIN public.project_financial_settings pfs ON pfs.project_id = rf.project_id
LEFT JOIN public.collection_allocations ca ON ca.research_form_id = rf.id
LEFT JOIN public.collection_allocation_revisions car ON car.id = ca.revision_id
LEFT JOIN public.collections c ON c.id = car.collection_id AND c.version = car.revision_number AND c.status = 'active'
WHERE rf.review_status = 'accepted'
GROUP BY
  rf.id,
  rf.account_id,
  rf.project_id,
  rf.company_id,
  rf.respondent_id,
  rf.participation_id,
  rf.code,
  rf.submitted_date,
  rf.accepted_at,
  rf.accepted_price_snapshot,
  p.end_date,
  pfs.payment_due_days_after_end;


-- Collection Summary View (Owner-visible summary per collection receipt)
CREATE VIEW public.collection_summary
WITH (security_invoker = true) AS
SELECT
  c.id AS collection_id,
  c.account_id,
  c.company_id,
  c.code AS collection_code,
  c.receipt_date,
  c.total_amount,
  c.payment_method,
  c.reference_number,
  c.status,
  c.version,
  c.void_reason,
  c.voided_at,
  c.replaces_collection_id,
  CASE
    WHEN c.status = 'voided' THEN 0.00
    ELSE COALESCE(SUM(ca.amount), 0.00)
  END::numeric(12,2) AS allocated_amount,
  CASE
    WHEN c.status = 'voided' THEN 0.00
    ELSE GREATEST(c.total_amount - COALESCE(SUM(ca.amount), 0.00), 0.00)
  END::numeric(12,2) AS unallocated_amount,
  CASE
    WHEN c.status = 'voided' THEN 'voided'
    WHEN COALESCE(SUM(ca.amount), 0.00) = 0 THEN 'unallocated'
    WHEN COALESCE(SUM(ca.amount), 0.00) < c.total_amount THEN 'partially_allocated'
    ELSE 'fully_allocated'
  END AS allocation_state
FROM public.collections c
LEFT JOIN public.collection_allocation_revisions car ON car.collection_id = c.id AND car.revision_number = c.version
LEFT JOIN public.collection_allocations ca ON ca.revision_id = car.id
GROUP BY
  c.id,
  c.account_id,
  c.company_id,
  c.code,
  c.receipt_date,
  c.total_amount,
  c.payment_method,
  c.reference_number,
  c.status,
  c.version,
  c.void_reason,
  c.voided_at,
  c.replaces_collection_id;


-- ----------------------------------------------------------------------------
-- 6. READ VIEW PRIVILEGES HARDENING
-- ----------------------------------------------------------------------------

-- Revoke all direct privileges on views from PUBLIC, anon, and authenticated
REVOKE ALL ON TABLE public.form_financial_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.collection_summary FROM PUBLIC, anon, authenticated;

-- Grant SELECT only to authenticated for financial summary views
GRANT SELECT ON TABLE public.form_financial_summary TO authenticated;
GRANT SELECT ON TABLE public.collection_summary TO authenticated;
