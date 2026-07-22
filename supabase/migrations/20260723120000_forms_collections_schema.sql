-- ============================================================================
-- Zamblak Field Research Core Database Schema
-- Migration: 20260723120000_forms_collections_schema.sql
-- Backend Schema Slice 1: Forms & Collections Data Model & Database Invariants
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CORE BUSINESS TABLES (SLICE 1 BOUNDARY)
-- ----------------------------------------------------------------------------

-- RESEARCH FORMS (Submitted research form attempts and review status)
CREATE TABLE research_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  respondent_id uuid NOT NULL REFERENCES respondents(id) ON DELETE RESTRICT,
  participation_id uuid NOT NULL REFERENCES participations(id) ON DELETE RESTRICT,
  code text NOT NULL,
  attempt_number integer NOT NULL,
  submitted_date date NOT NULL,
  review_status text NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  rejection_reason text,
  review_correction_reason text,
  accepted_price_snapshot numeric(12,2),
  quota_limit_snapshot integer,
  accepted_count_before integer,
  quota_override_reason text,
  quota_overridden_at timestamptz,
  quota_overridden_by uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_rf_attempt_positive CHECK (attempt_number >= 1),
  CONSTRAINT chk_rf_price_positive CHECK (accepted_price_snapshot IS NULL OR accepted_price_snapshot >= 0),
  CONSTRAINT chk_rf_quota_limit CHECK (quota_limit_snapshot IS NULL OR quota_limit_snapshot >= 0),
  CONSTRAINT chk_rf_accepted_count CHECK (accepted_count_before IS NULL OR accepted_count_before >= 0),
  CONSTRAINT chk_rf_code_nonblank CHECK (length(trim(code)) > 0),
  CONSTRAINT chk_rf_review_status CHECK (review_status IN ('submitted', 'accepted', 'rejected', 'cancelled')),
  CONSTRAINT chk_rf_status_timestamps CHECK (
    (review_status = 'submitted' AND reviewed_at IS NULL AND accepted_at IS NULL AND rejected_at IS NULL AND cancelled_at IS NULL AND rejection_reason IS NULL AND review_correction_reason IS NULL AND accepted_price_snapshot IS NULL) OR
    (review_status = 'accepted' AND reviewed_at IS NOT NULL AND accepted_at IS NOT NULL AND rejected_at IS NULL AND cancelled_at IS NULL AND rejection_reason IS NULL AND accepted_price_snapshot IS NOT NULL) OR
    (review_status = 'rejected' AND reviewed_at IS NOT NULL AND rejected_at IS NOT NULL AND accepted_at IS NULL AND cancelled_at IS NULL AND (rejection_reason IS NOT NULL AND length(trim(rejection_reason)) > 0) AND (accepted_price_snapshot IS NULL OR (review_correction_reason IS NOT NULL AND length(trim(review_correction_reason)) > 0))) OR
    (review_status = 'cancelled' AND reviewed_at IS NOT NULL AND cancelled_at IS NOT NULL AND accepted_at IS NULL AND rejected_at IS NULL AND rejection_reason IS NULL AND (accepted_price_snapshot IS NULL OR (review_correction_reason IS NOT NULL AND length(trim(review_correction_reason)) > 0)))
  ),
  CONSTRAINT chk_rf_quota_override_evidence CHECK (
    (quota_limit_snapshot IS NULL AND accepted_count_before IS NULL AND quota_override_reason IS NULL AND quota_overridden_at IS NULL AND quota_overridden_by IS NULL) OR
    (quota_limit_snapshot IS NOT NULL AND accepted_count_before IS NOT NULL AND quota_override_reason IS NOT NULL AND length(trim(quota_override_reason)) >= 3 AND quota_overridden_at IS NOT NULL AND quota_overridden_by IS NOT NULL AND accepted_count_before >= quota_limit_snapshot AND accepted_price_snapshot IS NOT NULL)
  )
);

-- Standalone UNIQUE index for participation attempts
CREATE UNIQUE INDEX idx_rf_unique_attempt ON research_forms (participation_id, attempt_number);

-- Partial UNIQUE index allowing only one active accepted form per participant per project
CREATE UNIQUE INDEX idx_rf_unique_accepted ON research_forms (project_id, respondent_id) WHERE (review_status = 'accepted');

-- Account-scoped UNIQUE code index
CREATE UNIQUE INDEX idx_rf_unique_code ON research_forms (account_id, code);

-- Performance lookup indexes
CREATE INDEX idx_rf_project ON research_forms (account_id, project_id);
CREATE INDEX idx_rf_company ON research_forms (account_id, company_id);
CREATE INDEX idx_rf_respondent ON research_forms (account_id, respondent_id);


-- COLLECTIONS (Company collection receipts)
CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  code text NOT NULL,
  receipt_date date NOT NULL,
  total_amount numeric(12,2) NOT NULL,
  payment_method text NOT NULL,
  reference_number text,
  status text NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 1,
  void_reason text,
  voided_at timestamptz,
  voided_by uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  replaces_collection_id uuid REFERENCES collections(id) ON DELETE RESTRICT,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_col_amount_positive CHECK (total_amount > 0),
  CONSTRAINT chk_col_payment_method CHECK (payment_method IN ('bank_transfer', 'cash', 'cheque')),
  CONSTRAINT chk_col_status CHECK (status IN ('active', 'voided')),
  CONSTRAINT chk_col_version_positive CHECK (version >= 1),
  CONSTRAINT chk_col_code_nonblank CHECK (length(trim(code)) > 0),
  CONSTRAINT chk_col_ref_nonblank CHECK (reference_number IS NULL OR length(trim(reference_number)) > 0),
  CONSTRAINT chk_col_no_self_replace CHECK (replaces_collection_id IS NULL OR replaces_collection_id <> id),
  CONSTRAINT chk_col_status_void_fields CHECK (
    (status = 'active' AND void_reason IS NULL AND voided_at IS NULL AND voided_by IS NULL) OR
    (status = 'voided' AND void_reason IS NOT NULL AND length(trim(void_reason)) >= 3 AND voided_at IS NOT NULL AND voided_by IS NOT NULL)
  )
);

-- Account-scoped UNIQUE collection code
CREATE UNIQUE INDEX idx_col_unique_code ON collections (account_id, code);

-- Partial UNIQUE index ensuring a voided collection has at most one direct replacement
CREATE UNIQUE INDEX idx_col_unique_replacement ON collections (replaces_collection_id) WHERE (replaces_collection_id IS NOT NULL);

-- Performance lookup index
CREATE INDEX idx_col_company ON collections (account_id, company_id);


-- COLLECTION ALLOCATION REVISIONS (Versioned revision header for collection allocations)
CREATE TABLE collection_allocation_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE RESTRICT,
  revision_number integer NOT NULL,
  expected_previous_version integer NOT NULL,
  reason text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_car_revision_positive CHECK (revision_number >= 1),
  CONSTRAINT chk_car_expected_prev CHECK (expected_previous_version >= 0 AND expected_previous_version = revision_number - 1),
  CONSTRAINT chk_car_reason_policy CHECK (revision_number = 1 OR (reason IS NOT NULL AND length(trim(reason)) >= 3))
);

-- UNIQUE revision number per collection
CREATE UNIQUE INDEX idx_car_unique_revision ON collection_allocation_revisions (collection_id, revision_number);

-- Performance lookup index
CREATE INDEX idx_car_collection ON collection_allocation_revisions (account_id, collection_id);


-- COLLECTION ALLOCATIONS (Immutable allocation line items linked to a revision header)
CREATE TABLE collection_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  revision_id uuid NOT NULL REFERENCES collection_allocation_revisions(id) ON DELETE RESTRICT,
  research_form_id uuid NOT NULL REFERENCES research_forms(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_ca_amount_positive CHECK (amount > 0)
);

-- UNIQUE target form per allocation revision
CREATE UNIQUE INDEX idx_ca_unique_form_per_revision ON collection_allocations (revision_id, research_form_id);

-- Performance lookup indexes
CREATE INDEX idx_ca_revision ON collection_allocations (account_id, revision_id);
CREATE INDEX idx_ca_research_form ON collection_allocations (account_id, research_form_id);


-- IDEMPOTENCY KEYS (Concurrency-safe mutation claim and idempotency tracking)
CREATE TABLE idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  scope text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  response_payload jsonb,
  target_record_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_ik_scope_nonblank CHECK (length(trim(scope)) > 0),
  CONSTRAINT chk_ik_key_length CHECK (length(idempotency_key) BETWEEN 8 AND 128),
  CONSTRAINT chk_ik_hash_nonblank CHECK (length(trim(request_hash)) > 0),
  CONSTRAINT chk_ik_status CHECK (status IN ('processing', 'completed')),
  CONSTRAINT chk_ik_status_fields CHECK (
    (status = 'processing' AND completed_at IS NULL AND response_payload IS NULL) OR
    (status = 'completed' AND completed_at IS NOT NULL AND response_payload IS NOT NULL)
  )
);

-- Account-scoped UNIQUE idempotency key per scope
CREATE UNIQUE INDEX idx_ik_unique_key ON idempotency_keys (account_id, scope, idempotency_key);


-- ----------------------------------------------------------------------------
-- 2. IMMUTABILITY, VERSION PROGRESSION & HISTORY PROTECTION TRIGGERS
-- ----------------------------------------------------------------------------

-- Immutability enforcement for research_forms
CREATE OR REPLACE FUNCTION check_research_forms_immutability()
RETURNS trigger AS $$
BEGIN
  -- Always immutable columns
  IF OLD.id IS DISTINCT FROM NEW.id OR
     OLD.account_id IS DISTINCT FROM NEW.account_id OR
     OLD.project_id IS DISTINCT FROM NEW.project_id OR
     OLD.company_id IS DISTINCT FROM NEW.company_id OR
     OLD.respondent_id IS DISTINCT FROM NEW.respondent_id OR
     OLD.participation_id IS DISTINCT FROM NEW.participation_id OR
     OLD.code IS DISTINCT FROM NEW.code OR
     OLD.attempt_number IS DISTINCT FROM NEW.attempt_number OR
     OLD.submitted_at IS DISTINCT FROM NEW.submitted_at OR
     OLD.created_by IS DISTINCT FROM NEW.created_by OR
     OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'research_form_immutable_field',
      DETAIL = 'Core research_form identity fields cannot be modified after insertion';
  END IF;

  -- submitted_date may change ONLY while review_status remains 'submitted'
  IF OLD.submitted_date IS DISTINCT FROM NEW.submitted_date THEN
    IF OLD.review_status <> 'submitted' OR NEW.review_status <> 'submitted' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'submitted_date_locked',
        DETAIL = 'submitted_date is locked once review status changes away from submitted';
    END IF;
  END IF;

  -- accepted_price_snapshot: may transition once from NULL to non-null; once set, immutable
  IF OLD.accepted_price_snapshot IS NOT NULL AND OLD.accepted_price_snapshot IS DISTINCT FROM NEW.accepted_price_snapshot THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'accepted_price_snapshot_immutable',
      DETAIL = 'accepted_price_snapshot cannot be altered once captured';
  END IF;

  -- Quota override fields: once populated, immutable
  IF OLD.quota_limit_snapshot IS NOT NULL THEN
    IF OLD.quota_limit_snapshot IS DISTINCT FROM NEW.quota_limit_snapshot OR
       OLD.accepted_count_before IS DISTINCT FROM NEW.accepted_count_before OR
       OLD.quota_override_reason IS DISTINCT FROM NEW.quota_override_reason OR
       OLD.quota_overridden_at IS DISTINCT FROM NEW.quota_overridden_at OR
       OLD.quota_overridden_by IS DISTINCT FROM NEW.quota_overridden_by THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'quota_override_evidence_immutable',
        DETAIL = 'Quota override evidence fields cannot be modified once set';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_research_forms_immutability
BEFORE UPDATE ON research_forms
FOR EACH ROW EXECUTE FUNCTION check_research_forms_immutability();


-- History protection for research_forms (rejects direct DELETE)
CREATE OR REPLACE FUNCTION check_research_forms_delete_protection()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'research_form_history_delete_forbidden',
    DETAIL = 'research_forms records cannot be deleted; review status transitions must be used instead';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_research_forms_delete_protection
BEFORE DELETE ON research_forms
FOR EACH ROW EXECUTE FUNCTION check_research_forms_delete_protection();


-- Version progression enforcement for collections
CREATE OR REPLACE FUNCTION check_collections_version_progression()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.version <> 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'collection_version_transition_invalid',
        DETAIL = 'Initial collection version must be 1';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'voided' AND OLD.version IS DISTINCT FROM NEW.version THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'collection_version_transition_invalid',
        DETAIL = 'Cannot modify version of a voided collection';
    END IF;

    IF NEW.version < 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'collection_version_transition_invalid',
        DETAIL = 'Collection version must be greater than or equal to 1';
    END IF;

    IF OLD.version IS DISTINCT FROM NEW.version THEN
      IF NEW.version <> OLD.version + 1 THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'collection_version_transition_invalid',
          DETAIL = 'Collection version must increment by exactly 1';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_collections_version_progression
BEFORE INSERT OR UPDATE OF version, status ON collections
FOR EACH ROW EXECUTE FUNCTION check_collections_version_progression();


-- Immutability enforcement for collections
CREATE OR REPLACE FUNCTION check_collections_immutability()
RETURNS trigger AS $$
BEGIN
  -- Always immutable receipt evidence fields
  IF OLD.id IS DISTINCT FROM NEW.id OR
     OLD.account_id IS DISTINCT FROM NEW.account_id OR
     OLD.company_id IS DISTINCT FROM NEW.company_id OR
     OLD.code IS DISTINCT FROM NEW.code OR
     OLD.receipt_date IS DISTINCT FROM NEW.receipt_date OR
     OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
     OLD.payment_method IS DISTINCT FROM NEW.payment_method OR
     OLD.reference_number IS DISTINCT FROM NEW.reference_number OR
     OLD.replaces_collection_id IS DISTINCT FROM NEW.replaces_collection_id OR
     OLD.created_by IS DISTINCT FROM NEW.created_by OR
     OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'collection_immutable_field',
      DETAIL = 'Core collection receipt fields cannot be modified after insertion';
  END IF;

  -- Status transition: only allowed from active to voided
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status = 'voided' AND NEW.status = 'active' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'collection_status_transition_invalid',
        DETAIL = 'Voided collection cannot be reactivated';
    END IF;
  END IF;

  -- Void fields: once set, immutable
  IF OLD.voided_at IS NOT NULL THEN
    IF OLD.void_reason IS DISTINCT FROM NEW.void_reason OR
       OLD.voided_at IS DISTINCT FROM NEW.voided_at OR
       OLD.voided_by IS DISTINCT FROM NEW.voided_by THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'collection_immutable_field',
        DETAIL = 'Voiding evidence fields cannot be modified once set';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_collections_immutability
BEFORE UPDATE ON collections
FOR EACH ROW EXECUTE FUNCTION check_collections_immutability();


-- History protection for collections (rejects direct DELETE)
CREATE OR REPLACE FUNCTION check_collections_delete_protection()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'collection_history_delete_forbidden',
    DETAIL = 'collections records cannot be deleted; void status transitions must be used instead';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_collections_delete_protection
BEFORE DELETE ON collections
FOR EACH ROW EXECUTE FUNCTION check_collections_delete_protection();


-- Immutability enforcement for collection_allocation_revisions (100% immutable - rejects UPDATE and DELETE)
CREATE OR REPLACE FUNCTION check_car_immutability()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'allocation_revision_immutable',
    DETAIL = 'collection_allocation_revisions records are 100% immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_car_immutability
BEFORE UPDATE OR DELETE ON collection_allocation_revisions
FOR EACH ROW EXECUTE FUNCTION check_car_immutability();


-- Immutability enforcement for collection_allocations (100% immutable - rejects UPDATE and DELETE)
CREATE OR REPLACE FUNCTION check_ca_immutability()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'allocation_history_immutable',
    DETAIL = 'collection_allocations records are 100% immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_ca_immutability
BEFORE UPDATE OR DELETE ON collection_allocations
FOR EACH ROW EXECUTE FUNCTION check_ca_immutability();


-- Immutability enforcement for idempotency_keys
CREATE OR REPLACE FUNCTION check_idempotency_keys_immutability()
RETURNS trigger AS $$
BEGIN
  -- Always immutable identity and request fields
  IF OLD.id IS DISTINCT FROM NEW.id OR
     OLD.account_id IS DISTINCT FROM NEW.account_id OR
     OLD.scope IS DISTINCT FROM NEW.scope OR
     OLD.idempotency_key IS DISTINCT FROM NEW.idempotency_key OR
     OLD.request_hash IS DISTINCT FROM NEW.request_hash OR
     OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'idempotency_immutable_field',
      DETAIL = 'Core idempotency key identity and request payload hash fields cannot be modified';
  END IF;

  -- Status transition: processing -> completed only
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status = 'completed' AND NEW.status = 'processing' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'idempotency_status_transition_invalid',
        DETAIL = 'Completed idempotency key cannot return to processing state';
    END IF;
  END IF;

  -- Once populated, completion fields are immutable
  IF OLD.completed_at IS NOT NULL AND OLD.completed_at IS DISTINCT FROM NEW.completed_at THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'idempotency_immutable_field',
      DETAIL = 'completed_at timestamp cannot be modified once set';
  END IF;

  IF OLD.response_payload IS NOT NULL AND OLD.response_payload IS DISTINCT FROM NEW.response_payload THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'idempotency_immutable_field',
      DETAIL = 'response_payload cannot be modified once set';
  END IF;

  IF OLD.target_record_id IS NOT NULL AND OLD.target_record_id IS DISTINCT FROM NEW.target_record_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'idempotency_immutable_field',
      DETAIL = 'target_record_id cannot be modified once set';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_idempotency_keys_immutability
BEFORE UPDATE ON idempotency_keys
FOR EACH ROW EXECUTE FUNCTION check_idempotency_keys_immutability();


-- History protection for idempotency_keys (rejects direct DELETE)
CREATE OR REPLACE FUNCTION check_idempotency_keys_delete_protection()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'idempotency_history_delete_forbidden',
    DETAIL = 'Idempotency keys provide permanent mutation lineage and cannot be deleted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_idempotency_keys_delete_protection
BEFORE DELETE ON idempotency_keys
FOR EACH ROW EXECUTE FUNCTION check_idempotency_keys_delete_protection();


-- ----------------------------------------------------------------------------
-- 3. PARENT & ACCOUNT ISOLATION CONSISTENCY TRIGGERS
-- ----------------------------------------------------------------------------

-- Check research_forms account & relationship consistency
CREATE OR REPLACE FUNCTION check_research_forms_account_consistency()
RETURNS trigger AS $$
DECLARE
  v_project_account_id uuid;
  v_project_company_id uuid;
  v_company_account_id uuid;
  v_respondent_account_id uuid;
  v_part_account_id uuid;
  v_part_project_id uuid;
  v_part_respondent_id uuid;
  v_created_by_account_id uuid;
  v_updated_by_account_id uuid;
BEGIN
  -- Verify project
  SELECT account_id, company_id INTO v_project_account_id, v_project_company_id
  FROM projects WHERE id = NEW.project_id;
  IF v_project_account_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'parent_consistency_violation',
      DETAIL = 'Parent project not found';
  END IF;
  IF NEW.account_id IS DISTINCT FROM v_project_account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'account_consistency_violation',
      DETAIL = 'research_form account_id must match project account_id';
  END IF;

  -- Verify company snapshot
  SELECT account_id INTO v_company_account_id
  FROM companies WHERE id = NEW.company_id;
  IF v_company_account_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'parent_consistency_violation',
      DETAIL = 'Parent company not found';
  END IF;
  IF NEW.account_id IS DISTINCT FROM v_company_account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'account_consistency_violation',
      DETAIL = 'research_form account_id must match company account_id';
  END IF;
  IF NEW.company_id IS DISTINCT FROM v_project_company_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'parent_consistency_violation',
      DETAIL = 'research_form company_id must match project company_id snapshot';
  END IF;

  -- Verify respondent
  SELECT account_id INTO v_respondent_account_id
  FROM respondents WHERE id = NEW.respondent_id;
  IF v_respondent_account_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'parent_consistency_violation',
      DETAIL = 'Parent respondent not found';
  END IF;
  IF NEW.account_id IS DISTINCT FROM v_respondent_account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'account_consistency_violation',
      DETAIL = 'research_form account_id must match respondent account_id';
  END IF;

  -- Verify participation
  SELECT account_id, project_id, respondent_id INTO v_part_account_id, v_part_project_id, v_part_respondent_id
  FROM participations WHERE id = NEW.participation_id;
  IF v_part_account_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'parent_consistency_violation',
      DETAIL = 'Parent participation not found';
  END IF;
  IF NEW.account_id IS DISTINCT FROM v_part_account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'account_consistency_violation',
      DETAIL = 'research_form account_id must match participation account_id';
  END IF;
  IF NEW.project_id IS DISTINCT FROM v_part_project_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'parent_consistency_violation',
      DETAIL = 'research_form project_id must match participation project_id';
  END IF;
  IF NEW.respondent_id IS DISTINCT FROM v_part_respondent_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'parent_consistency_violation',
      DETAIL = 'research_form respondent_id must match participation respondent_id';
  END IF;

  -- Verify actor profiles
  SELECT account_id INTO v_created_by_account_id FROM profiles WHERE id = NEW.created_by;
  IF v_created_by_account_id IS NULL OR v_created_by_account_id IS DISTINCT FROM NEW.account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'actor_account_consistency_violation',
      DETAIL = 'created_by profile must belong to same account';
  END IF;

  SELECT account_id INTO v_updated_by_account_id FROM profiles WHERE id = NEW.updated_by;
  IF v_updated_by_account_id IS NULL OR v_updated_by_account_id IS DISTINCT FROM NEW.account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'actor_account_consistency_violation',
      DETAIL = 'updated_by profile must belong to same account';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_research_forms_account_consistency
BEFORE INSERT OR UPDATE ON research_forms
FOR EACH ROW EXECUTE FUNCTION check_research_forms_account_consistency();


-- Check collections account & relationship consistency
CREATE OR REPLACE FUNCTION check_collections_account_consistency()
RETURNS trigger AS $$
DECLARE
  v_company_account_id uuid;
  v_created_by_account_id uuid;
  v_updated_by_account_id uuid;
BEGIN
  -- Verify company
  SELECT account_id INTO v_company_account_id
  FROM companies WHERE id = NEW.company_id;
  IF v_company_account_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'parent_consistency_violation',
      DETAIL = 'Parent company not found';
  END IF;
  IF NEW.account_id IS DISTINCT FROM v_company_account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'account_consistency_violation',
      DETAIL = 'collection account_id must match company account_id';
  END IF;

  -- Verify actor profiles
  SELECT account_id INTO v_created_by_account_id FROM profiles WHERE id = NEW.created_by;
  IF v_created_by_account_id IS NULL OR v_created_by_account_id IS DISTINCT FROM NEW.account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'actor_account_consistency_violation',
      DETAIL = 'created_by profile must belong to same account';
  END IF;

  SELECT account_id INTO v_updated_by_account_id FROM profiles WHERE id = NEW.updated_by;
  IF v_updated_by_account_id IS NULL OR v_updated_by_account_id IS DISTINCT FROM NEW.account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'actor_account_consistency_violation',
      DETAIL = 'updated_by profile must belong to same account';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_collections_account_consistency
BEFORE INSERT OR UPDATE ON collections
FOR EACH ROW EXECUTE FUNCTION check_collections_account_consistency();


-- Check collection replacement target consistency
CREATE OR REPLACE FUNCTION check_collections_replacement_consistency()
RETURNS trigger AS $$
DECLARE
  v_target_account_id uuid;
  v_target_company_id uuid;
  v_target_status text;
BEGIN
  IF NEW.replaces_collection_id IS NOT NULL THEN
    SELECT account_id, company_id, status
    INTO v_target_account_id, v_target_company_id, v_target_status
    FROM collections WHERE id = NEW.replaces_collection_id;

    IF v_target_account_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'collection_replacement_invalid',
        DETAIL = 'Replacement target collection not found';
    END IF;

    IF v_target_status <> 'voided' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'collection_replacement_invalid',
        DETAIL = 'Replacement target collection must be voided';
    END IF;

    IF NEW.account_id IS DISTINCT FROM v_target_account_id THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'account_consistency_violation',
        DETAIL = 'Replacement collection must belong to same account';
    END IF;

    IF NEW.company_id IS DISTINCT FROM v_target_company_id THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'parent_consistency_violation',
        DETAIL = 'Replacement collection must belong to same company';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_collections_replacement_consistency
BEFORE INSERT OR UPDATE ON collections
FOR EACH ROW EXECUTE FUNCTION check_collections_replacement_consistency();


-- Check collection_allocation_revisions account consistency
CREATE OR REPLACE FUNCTION check_car_account_consistency()
RETURNS trigger AS $$
DECLARE
  v_col_account_id uuid;
  v_created_by_account_id uuid;
BEGIN
  -- Verify collection
  SELECT account_id INTO v_col_account_id
  FROM collections WHERE id = NEW.collection_id;
  IF v_col_account_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'parent_consistency_violation',
      DETAIL = 'Parent collection not found';
  END IF;
  IF NEW.account_id IS DISTINCT FROM v_col_account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'account_consistency_violation',
      DETAIL = 'revision account_id must match collection account_id';
  END IF;

  -- Verify actor profile
  SELECT account_id INTO v_created_by_account_id FROM profiles WHERE id = NEW.created_by;
  IF v_created_by_account_id IS NULL OR v_created_by_account_id IS DISTINCT FROM NEW.account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'actor_account_consistency_violation',
      DETAIL = 'created_by profile must belong to same account';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_car_account_consistency
BEFORE INSERT ON collection_allocation_revisions
FOR EACH ROW EXECUTE FUNCTION check_car_account_consistency();


-- Check collection_allocations account & relationship consistency
CREATE OR REPLACE FUNCTION check_ca_account_consistency()
RETURNS trigger AS $$
DECLARE
  v_rev_account_id uuid;
  v_rev_col_id uuid;
  v_col_company_id uuid;
  v_rf_account_id uuid;
  v_rf_company_id uuid;
  v_created_by_account_id uuid;
BEGIN
  -- Verify revision header
  SELECT account_id, collection_id INTO v_rev_account_id, v_rev_col_id
  FROM collection_allocation_revisions WHERE id = NEW.revision_id;
  IF v_rev_account_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'parent_consistency_violation',
      DETAIL = 'Parent allocation revision header not found';
  END IF;
  IF NEW.account_id IS DISTINCT FROM v_rev_account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'account_consistency_violation',
      DETAIL = 'allocation account_id must match revision account_id';
  END IF;

  -- Get parent collection company_id
  SELECT company_id INTO v_col_company_id
  FROM collections WHERE id = v_rev_col_id;

  -- Verify research form
  SELECT account_id, company_id INTO v_rf_account_id, v_rf_company_id
  FROM research_forms WHERE id = NEW.research_form_id;
  IF v_rf_account_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'parent_consistency_violation',
      DETAIL = 'Target research_form not found';
  END IF;
  IF NEW.account_id IS DISTINCT FROM v_rf_account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'account_consistency_violation',
      DETAIL = 'allocation account_id must match research_form account_id';
  END IF;
  IF v_rf_company_id IS DISTINCT FROM v_col_company_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'parent_consistency_violation',
      DETAIL = 'research_form company_id must match collection company_id';
  END IF;

  -- Verify actor profile
  SELECT account_id INTO v_created_by_account_id FROM profiles WHERE id = NEW.created_by;
  IF v_created_by_account_id IS NULL OR v_created_by_account_id IS DISTINCT FROM NEW.account_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'actor_account_consistency_violation',
      DETAIL = 'created_by profile must belong to same account';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_ca_account_consistency
BEFORE INSERT ON collection_allocations
FOR EACH ROW EXECUTE FUNCTION check_ca_account_consistency();


-- ----------------------------------------------------------------------------
-- 4. CONTIGUOUS REVISION SEQUENCE INVARIANT & TWO-SIDED DEFERRED TRIGGERS
-- ----------------------------------------------------------------------------

-- Invariant helper function enforcing gapless 1..version revision sequence per collection
CREATE OR REPLACE FUNCTION check_collection_revision_sequence_invariant(p_collection_id uuid)
RETURNS void AS $$
DECLARE
  v_version integer;
  v_count integer;
  v_min integer;
  v_max integer;
BEGIN
  SELECT version INTO v_version
  FROM collections
  WHERE id = p_collection_id;

  IF v_version IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*), MIN(revision_number), MAX(revision_number)
  INTO v_count, v_min, v_max
  FROM collection_allocation_revisions
  WHERE collection_id = p_collection_id;

  IF v_count <> v_version OR v_min <> 1 OR v_max <> v_version THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'collection_revision_invariant_violation',
      DETAIL = format('Collection %s (version %s) requires exactly %s contiguous revisions from 1 to %s, found count=%s, min=%s, max=%s',
        p_collection_id, v_version, v_version, v_version, v_count, COALESCE(v_min::text, 'null'), COALESCE(v_max::text, 'null'));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Deferred constraint trigger on collections (evaluates sequence invariant at commit)
CREATE OR REPLACE FUNCTION check_collection_current_revision_consistency()
RETURNS trigger AS $$
BEGIN
  PERFORM check_collection_revision_sequence_invariant(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE CONSTRAINT TRIGGER trg_collections_current_revision_consistency
AFTER INSERT OR UPDATE OF version ON collections
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_collection_current_revision_consistency();


-- Inverse deferred constraint trigger on collection_allocation_revisions (evaluates sequence invariant at commit)
CREATE OR REPLACE FUNCTION check_car_collection_version_consistency()
RETURNS trigger AS $$
DECLARE
  v_target_collection_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target_collection_id := OLD.collection_id;
  ELSE
    v_target_collection_id := NEW.collection_id;
  END IF;

  PERFORM check_collection_revision_sequence_invariant(v_target_collection_id);

  IF TG_OP = 'UPDATE' AND OLD.collection_id IS DISTINCT FROM NEW.collection_id THEN
    PERFORM check_collection_revision_sequence_invariant(OLD.collection_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE CONSTRAINT TRIGGER trg_car_collection_version_consistency
AFTER INSERT OR UPDATE OR DELETE ON collection_allocation_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_car_collection_version_consistency();


-- ----------------------------------------------------------------------------
-- 5. UPDATED_AT TRIGGERS APPLICATION
-- ----------------------------------------------------------------------------

CREATE TRIGGER trg_research_forms_updated_at BEFORE UPDATE ON research_forms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ----------------------------------------------------------------------------
-- 6. AUDIT TRIGGER ATTACHMENTS (REUSING EXISTING GLOBAL AUDIT FUNCTION UNCHANGED)
-- ----------------------------------------------------------------------------

-- Attach existing global audit_trigger_func() to new business tables (excluding idempotency_keys)
CREATE TRIGGER audit_trg_research_forms
AFTER INSERT OR UPDATE OR DELETE ON research_forms
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trg_collections
AFTER INSERT OR UPDATE OR DELETE ON collections
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trg_collection_allocation_revisions
AFTER INSERT OR UPDATE OR DELETE ON collection_allocation_revisions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trg_collection_allocations
AFTER INSERT OR UPDATE OR DELETE ON collection_allocations
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
