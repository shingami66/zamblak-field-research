-- ============================================================================
-- Zamblak Field Research Core Database Schema
-- Migration: 20260723150000_fix_form_financial_summary_active_allocations.sql
-- Fix: Filter form_financial_summary allocations by active collection revision
-- ============================================================================

CREATE OR REPLACE VIEW public.form_financial_summary
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
  COALESCE(
    SUM(ca.amount) FILTER (WHERE c.id IS NOT NULL),
    0.00
  )::numeric(12,2) AS allocated_amount,
  GREATEST(
    rf.accepted_price_snapshot - COALESCE(
      SUM(ca.amount) FILTER (WHERE c.id IS NOT NULL),
      0.00
    ),
    0.00
  )::numeric(12,2) AS outstanding_amount,
  CASE
    WHEN COALESCE(
      SUM(ca.amount) FILTER (WHERE c.id IS NOT NULL),
      0.00
    ) = 0 THEN 'uncollected'
    WHEN COALESCE(
      SUM(ca.amount) FILTER (WHERE c.id IS NOT NULL),
      0.00
    ) < rf.accepted_price_snapshot THEN 'partially_collected'
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
