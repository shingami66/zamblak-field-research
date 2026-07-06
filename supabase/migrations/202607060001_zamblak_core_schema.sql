-- ==========================================
-- Zamblak Field Research Core Database Schema
-- Migration 001 - Core Schema Draft
-- ==========================================

-- ------------------------------------------
-- 1. EXTENSIONS & FUNCTIONS
-- ------------------------------------------
-- For gen_random_uuid() compatibility if needed (native in PG 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Generic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------
-- 2. CORE BUSINESS TABLES
-- ------------------------------------------

-- ACCOUNTS (Tenant root boundary)
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- PROFILES (Users bound to an account with roles)
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  auth_user_id uuid UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  role text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_profiles_role CHECK (role IN ('owner', 'support_helper'))
);

-- Partial index for active owner: Max one active, non-deleted owner profile per account
CREATE UNIQUE INDEX idx_profiles_unique_active_owner_per_account
ON profiles (account_id)
WHERE (role = 'owner' AND active = true AND deleted_at IS NULL);

-- COMPANIES (Clients commissioning research projects)
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  name text NOT NULL,
  contact_person text,
  phone text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- PROJECTS (Research study configurations - OPERATIONAL ONLY, NO FINANCIAL FIELDS)
-- DESIGN DECISION: Financial variables are completely isolated into a separate table
-- to ensure strict operational vs financial privilege separation. Support helpers should not see pricing.
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  domain text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  start_date date,
  end_date date,
  quota integer,
  min_age integer,
  max_age integer,
  required_resident_type text NOT NULL DEFAULT 'any',
  eligibility_notes text,
  requires_three_month_warning boolean NOT NULL DEFAULT true,
  whatsapp_template_ar text,
  whatsapp_template_en text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_projects_status CHECK (status IN ('draft', 'active', 'closed', 'cancelled')),
  CONSTRAINT chk_projects_domain CHECK (domain IN ('telecom', 'banking', 'insurance', 'product', 'other')),
  CONSTRAINT chk_projects_resident_type CHECK (required_resident_type IN ('any', 'saudi', 'non_saudi', 'unknown')),
  CONSTRAINT chk_projects_min_age CHECK (min_age IS NULL OR min_age >= 0),
  CONSTRAINT chk_projects_max_age CHECK (max_age IS NULL OR max_age >= 0),
  CONSTRAINT chk_projects_age_range CHECK (max_age IS NULL OR min_age IS NULL OR max_age >= min_age),
  CONSTRAINT chk_projects_quota CHECK (quota IS NULL OR quota >= 0),
  CONSTRAINT chk_projects_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- PROJECT FINANCIAL SETTINGS (Owner-only pricing details)
-- DESIGN DECISION: Separated from the projects table to allow strict role-based access control.
-- This ensures support_helper roles cannot read or modify project price rates.
CREATE TABLE project_financial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id),
  price_per_accepted_form numeric(12,2),
  settlement_mode text NOT NULL DEFAULT 'project_end_plus_days',
  payment_due_days_after_end integer NOT NULL DEFAULT 40,
  monthly_billing_day integer,
  custom_due_date date,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_pfs_settlement_mode CHECK (settlement_mode IN ('project_end_plus_days', 'monthly', 'custom')),
  CONSTRAINT chk_pfs_price_form CHECK (price_per_accepted_form IS NULL OR price_per_accepted_form >= 0),
  CONSTRAINT chk_pfs_due_days CHECK (payment_due_days_after_end >= 0),
  CONSTRAINT chk_pfs_monthly_day CHECK (monthly_billing_day IS NULL OR (monthly_billing_day >= 1 AND monthly_billing_day <= 31)),
  CONSTRAINT chk_pfs_settlement_conditionals CHECK (
    (settlement_mode = 'project_end_plus_days' AND payment_due_days_after_end IS NOT NULL) OR
    (settlement_mode = 'monthly' AND monthly_billing_day IS NOT NULL) OR
    (settlement_mode = 'custom' AND custom_due_date IS NOT NULL)
  )
);

-- RESPONDENTS (Central registry of individuals participating in studies)
CREATE TABLE respondents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  name text,
  mobile text NOT NULL,
  normalized_mobile text NOT NULL,
  age integer,
  nationality text,
  resident_type text NOT NULL DEFAULT 'unknown',
  notes text,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_respondents_resident_type CHECK (resident_type IN ('saudi', 'non_saudi', 'unknown')),
  CONSTRAINT chk_respondents_age CHECK (age IS NULL OR age >= 0),
  CONSTRAINT chk_respondents_mobile_format CHECK (normalized_mobile ~ '^9665[0-9]{8}$')
);

-- Partial index for uniqueness of normalized mobile per account (soft delete active-only)
CREATE UNIQUE INDEX idx_respondents_unique_mobile_per_account
ON respondents (account_id, normalized_mobile)
WHERE (deleted_at IS NULL);

-- PARTICIPATIONS (Operational status of respondent inside a project - OPERATIONAL ONLY, NO FINANCIAL FIELDS)
-- DESIGN DECISION: Support helpers cannot directly update participations. Any status change
-- must go through controlled database functions or API endpoints (RPC / Server Actions).
CREATE TABLE participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  respondent_id uuid NOT NULL REFERENCES respondents(id),
  assigned_to_profile_id uuid REFERENCES profiles(id),
  contact_status text NOT NULL DEFAULT 'new',
  participation_decision_status text NOT NULL DEFAULT 'unknown',
  consent_status text NOT NULL DEFAULT 'unknown',
  consent_purpose_text text,
  consent_channel text,
  consent_at timestamptz,
  used_product text,
  used_bank text,
  project_specific_notes text,
  whatsapp_status text NOT NULL DEFAULT 'not_opened',
  whatsapp_opened_at timestamptz,
  whatsapp_sent_at timestamptz,
  whatsapp_message_snapshot text,
  form_status text NOT NULL DEFAULT 'not_started',
  form_completed_at timestamptz,
  transferred_at timestamptz,
  review_status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  rejection_notes text,
  review_correction_reason text,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_part_contact_status CHECK (contact_status IN ('new', 'whatsapp_opened', 'whatsapp_sent_manual', 'responded', 'cannot_contact_now')),
  CONSTRAINT chk_part_decision_status CHECK (participation_decision_status IN ('unknown', 'agreed', 'did_not_agree')),
  CONSTRAINT chk_part_consent_status CHECK (consent_status IN ('unknown', 'given', 'not_given')),
  CONSTRAINT chk_part_consent_channel CHECK (consent_channel IS NULL OR consent_channel IN ('verbal', 'whatsapp', 'in_person')),
  CONSTRAINT chk_part_whatsapp_status CHECK (whatsapp_status IN ('not_opened', 'opened', 'sent_manual', 'opened_not_confirmed')),
  CONSTRAINT chk_part_form_status CHECK (form_status IN ('not_started', 'completed', 'transferred')),
  CONSTRAINT chk_part_review_status CHECK (review_status IN ('pending', 'under_review', 'accepted', 'rejected')),
  CONSTRAINT chk_part_rejection_reason CHECK (rejection_reason IS NULL OR rejection_reason IN ('verification_no_answer', 'inconsistent_answers', 'form_logic_error', 'not_qualified', 'duplicate', 'other'))
);

-- Partial index to prevent a respondent from participating more than once per project (unless soft deleted)
CREATE UNIQUE INDEX idx_participations_unique_respondent_per_project
ON participations (project_id, respondent_id)
WHERE (deleted_at IS NULL);

-- PARTICIPATION PRICING (Owner-only transaction-level pricing snapshots)
-- DESIGN DECISION: Separating price snapshots from operational participations prevents exposure to
-- support helpers, and keeps price_snapshot immutable on subsequent status flips unless explicitly changed.
CREATE TABLE participation_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  participation_id uuid NOT NULL UNIQUE REFERENCES participations(id),
  price_snapshot numeric(12,2),
  payable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_part_price_nonnegative CHECK (price_snapshot IS NULL OR price_snapshot >= 0)
);

-- PAYMENTS (Owner-only project payouts to respondents/fieldwork)
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  amount numeric(12,2) NOT NULL,
  payment_date date NOT NULL,
  payment_method text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_payments_amount_positive CHECK (amount > 0)
);

-- AUDIT LOG (Immutable trail of data changes)
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  actor_profile_id uuid REFERENCES profiles(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------
-- 3. TIMESTAMP TRIGGERS APPLICATION
-- ------------------------------------------
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_project_financial_settings_updated_at BEFORE UPDATE ON project_financial_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_respondents_updated_at BEFORE UPDATE ON respondents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_participations_updated_at BEFORE UPDATE ON participations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_participation_pricing_updated_at BEFORE UPDATE ON participation_pricing FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------
-- 4. RLS HELPER FUNCTIONS
-- ------------------------------------------
-- DESIGN DECISION: SECURITY DEFINER bypasses RLS on profiles to prevent
-- infinite recursion when profiles' own RLS policies evaluate these functions.
-- These helper functions intentionally ignore inactive or soft-deleted profiles so deactivation immediately removes RLS access even if the Supabase Auth session remains valid.
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() AND active = true AND deleted_at IS NULL LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_account_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT account_id FROM profiles WHERE auth_user_id = auth.uid() AND active = true AND deleted_at IS NULL LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM profiles WHERE auth_user_id = auth.uid() AND active = true AND deleted_at IS NULL LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_owner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'owner' FROM profiles WHERE auth_user_id = auth.uid() AND active = true AND deleted_at IS NULL LIMIT 1), false);
$$;

CREATE OR REPLACE FUNCTION is_support_helper()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'support_helper' FROM profiles WHERE auth_user_id = auth.uid() AND active = true AND deleted_at IS NULL LIMIT 1), false);
$$;

-- ------------------------------------------
-- 5. ACCOUNT ISOLATION & CONSISTENCY TRIGGERS
-- ------------------------------------------

-- Check projects.account_id matches companies.account_id
CREATE OR REPLACE FUNCTION check_project_account_consistency()
RETURNS trigger AS $$
DECLARE
  v_company_account_id uuid;
BEGIN
  SELECT account_id INTO v_company_account_id
  FROM companies
  WHERE id = NEW.company_id;

  IF v_company_account_id IS NULL THEN
    RAISE EXCEPTION 'Account consistency violation: parent company not found';
  END IF;

  IF NEW.account_id IS DISTINCT FROM v_company_account_id THEN
    RAISE EXCEPTION 'Account consistency violation: project account_id must match company account_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_projects_account_consistency
BEFORE INSERT OR UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION check_project_account_consistency();

-- Check project_financial_settings.account_id matches projects.account_id
CREATE OR REPLACE FUNCTION check_pfs_account_consistency()
RETURNS trigger AS $$
DECLARE
  v_project_account_id uuid;
BEGIN
  SELECT account_id INTO v_project_account_id
  FROM projects
  WHERE id = NEW.project_id;

  IF v_project_account_id IS NULL THEN
    RAISE EXCEPTION 'Account consistency violation: parent project not found';
  END IF;

  IF NEW.account_id IS DISTINCT FROM v_project_account_id THEN
    RAISE EXCEPTION 'Account consistency violation: financial settings account_id must match project account_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_pfs_account_consistency
BEFORE INSERT OR UPDATE ON project_financial_settings
FOR EACH ROW EXECUTE FUNCTION check_pfs_account_consistency();

-- Check participations.account_id matches projects.account_id and respondents.account_id
CREATE OR REPLACE FUNCTION check_participation_account_consistency()
RETURNS trigger AS $$
DECLARE
  v_project_account_id uuid;
  v_respondent_account_id uuid;
BEGIN
  SELECT account_id INTO v_project_account_id
  FROM projects
  WHERE id = NEW.project_id;

  IF v_project_account_id IS NULL THEN
    RAISE EXCEPTION 'Account consistency violation: parent project not found';
  END IF;

  IF NEW.account_id IS DISTINCT FROM v_project_account_id THEN
    RAISE EXCEPTION 'Account consistency violation: participation account_id must match project account_id';
  END IF;

  SELECT account_id INTO v_respondent_account_id
  FROM respondents
  WHERE id = NEW.respondent_id;

  IF v_respondent_account_id IS NULL THEN
    RAISE EXCEPTION 'Account consistency violation: parent respondent not found';
  END IF;

  IF NEW.account_id IS DISTINCT FROM v_respondent_account_id THEN
    RAISE EXCEPTION 'Account consistency violation: participation account_id must match respondent account_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_participation_account_consistency
BEFORE INSERT OR UPDATE ON participations
FOR EACH ROW EXECUTE FUNCTION check_participation_account_consistency();

-- Check participation_pricing.account_id matches participations.account_id
CREATE OR REPLACE FUNCTION check_participation_pricing_account_consistency()
RETURNS trigger AS $$
DECLARE
  v_participation_account_id uuid;
BEGIN
  SELECT account_id INTO v_participation_account_id
  FROM participations
  WHERE id = NEW.participation_id;

  IF v_participation_account_id IS NULL THEN
    RAISE EXCEPTION 'Account consistency violation: parent participation not found';
  END IF;

  IF NEW.account_id IS DISTINCT FROM v_participation_account_id THEN
    RAISE EXCEPTION 'Account consistency violation: participation pricing account_id must match participation account_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_participation_pricing_account_consistency
BEFORE INSERT OR UPDATE ON participation_pricing
FOR EACH ROW EXECUTE FUNCTION check_participation_pricing_account_consistency();

-- Check payments.account_id matches projects.account_id
CREATE OR REPLACE FUNCTION check_payments_account_consistency()
RETURNS trigger AS $$
DECLARE
  v_project_account_id uuid;
BEGIN
  SELECT account_id INTO v_project_account_id
  FROM projects
  WHERE id = NEW.project_id;

  IF v_project_account_id IS NULL THEN
    RAISE EXCEPTION 'Account consistency violation: parent project not found';
  END IF;

  IF NEW.account_id IS DISTINCT FROM v_project_account_id THEN
    RAISE EXCEPTION 'Account consistency violation: payment account_id must match project account_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_payments_account_consistency
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION check_payments_account_consistency();

-- ------------------------------------------
-- 6. REVIEW STATUS & FINANCIAL TRIGGERS
-- ------------------------------------------

-- BEFORE trigger to validate correction reasons and manage accepted_at / rejected_at fields
CREATE OR REPLACE FUNCTION handle_participation_review_status_before()
RETURNS trigger AS $$
DECLARE
  v_price numeric(12,2);
  v_exists_settings boolean;
  v_payments_exist boolean;
  v_became_accepted boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_became_accepted := (NEW.review_status = 'accepted');
  ELSIF TG_OP = 'UPDATE' THEN
    v_became_accepted := (NEW.review_status = 'accepted' AND OLD.review_status <> 'accepted');
  END IF;

  -- If changing from accepted to non-accepted, verify if payments already exist for the project
  IF TG_OP = 'UPDATE' THEN
    IF OLD.review_status = 'accepted' AND NEW.review_status <> 'accepted' THEN
      SELECT EXISTS (
        SELECT 1 FROM payments
        WHERE project_id = NEW.project_id
          AND deleted_at IS NULL
      ) INTO v_payments_exist;

      IF v_payments_exist AND NEW.review_correction_reason IS NULL THEN
        RAISE EXCEPTION 'Changing review_status from accepted to non-accepted after payments exist requires a review_correction_reason.';
      END IF;
    END IF;
  END IF;

  -- Verify financial settings exist when accepting a participation
  IF v_became_accepted THEN
    SELECT price_per_accepted_form, true
    INTO v_price, v_exists_settings
    FROM project_financial_settings
    WHERE project_id = NEW.project_id AND deleted_at IS NULL;

    IF NOT COALESCE(v_exists_settings, false) THEN
      RAISE EXCEPTION 'Cannot accept participation: project financial settings do not exist.';
    END IF;

    IF v_price IS NULL THEN
      RAISE EXCEPTION 'Cannot accept participation: price_per_accepted_form is not set in financial settings.';
    END IF;

    -- Update status change timestamps
    IF NEW.accepted_at IS NULL THEN
      NEW.accepted_at := now();
    END IF;
    NEW.rejected_at := NULL;
    NEW.rejection_reason := NULL;
    NEW.rejection_notes := NULL;

  -- Handle change away from accepted status
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.review_status = 'accepted' AND NEW.review_status <> 'accepted' THEN
      IF NEW.review_status = 'rejected' THEN
        IF NEW.rejected_at IS NULL THEN
          NEW.rejected_at := now();
        END IF;
        NEW.accepted_at := NULL;
      ELSE
        NEW.accepted_at := NULL;
        NEW.rejected_at := NULL;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- NOTE ON TRIGGER ORDERING:
-- Postgres executes triggers of the same event type (e.g. BEFORE INSERT OR UPDATE) in alphabetical order by trigger name.
-- To ensure account consistency (trg_participation_account_consistency) runs and verifies the tenant boundary
-- BEFORE any review-status financial checks or status transitions (trg_participation_review_status_before) execute,
-- the trigger names are intentionally ordered alphabetically (trg_participation_account_consistency < trg_participation_review_status_before).
-- Future trigger renames must preserve this execution order or combine the logic explicitly to prevent bypassed checks.
CREATE TRIGGER trg_participation_review_status_before
BEFORE INSERT OR UPDATE ON participations
FOR EACH ROW EXECUTE FUNCTION handle_participation_review_status_before();

-- AFTER trigger to manage downstream participation_pricing record
CREATE OR REPLACE FUNCTION handle_participation_review_status_after()
RETURNS trigger AS $$
DECLARE
  v_price numeric(12,2);
  v_existing_price numeric(12,2);
  v_found boolean := false;
  v_became_accepted boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_became_accepted := (NEW.review_status = 'accepted');
  ELSIF TG_OP = 'UPDATE' THEN
    v_became_accepted := (NEW.review_status = 'accepted' AND OLD.review_status <> 'accepted');
  END IF;

  -- When review_status becomes accepted
  IF v_became_accepted THEN
    -- Get price from settings
    SELECT price_per_accepted_form INTO v_price
    FROM project_financial_settings
    WHERE project_id = NEW.project_id AND deleted_at IS NULL;

    -- Get existing price_snapshot if any
    SELECT price_snapshot, true INTO v_existing_price, v_found
    FROM participation_pricing
    WHERE participation_id = NEW.id;

    IF v_found THEN
      -- Update existing record (payable = true, DO NOT overwrite existing price_snapshot on re-acceptance)
      UPDATE participation_pricing
      SET payable = true,
          price_snapshot = COALESCE(v_existing_price, v_price),
          updated_at = now()
      WHERE participation_id = NEW.id;
    ELSE
      -- Insert new record
      INSERT INTO participation_pricing (account_id, participation_id, price_snapshot, payable)
      VALUES (NEW.account_id, NEW.id, v_price, true);
    END IF;

  -- When review_status changes away from accepted
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.review_status = 'accepted' AND NEW.review_status <> 'accepted' THEN
      -- Mark payable = false, but keep the snapshot price for historical audit trail
      UPDATE participation_pricing
      SET payable = false,
          updated_at = now()
      WHERE participation_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_participation_review_status_after
AFTER INSERT OR UPDATE ON participations
FOR EACH ROW EXECUTE FUNCTION handle_participation_review_status_after();

-- ------------------------------------------
-- 7. AUDIT LOGGING TRIGGERS (CLIENT IMMUTABILITY)
-- ------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS trigger AS $$
DECLARE
  v_actor_profile_id uuid;
  v_account_id uuid;
  v_old jsonb := null;
  v_new jsonb := null;
  v_action text;
  v_entity_id uuid;
  v_should_audit boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old := to_jsonb(OLD);
    v_entity_id := OLD.id;
    v_account_id := OLD.account_id;
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    v_new := to_jsonb(NEW);
    v_entity_id := NEW.id;
    v_account_id := NEW.account_id;
  ELSE
    v_action := 'UPDATE';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_entity_id := NEW.id;
    v_account_id := NEW.account_id;
  END IF;

  -- Capture active profile ID
  v_actor_profile_id := current_profile_id();

  -- Audit logic parameters (specific columns of interest)
  IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    v_should_audit := true;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if record was soft-deleted/restored
    -- Using jsonb access to prevent runtime errors on tables without deleted_at
    IF (v_old->>'deleted_at' IS DISTINCT FROM v_new->>'deleted_at') THEN
      v_should_audit := true;
    END IF;

    -- Evaluate fields depending on table
    IF TG_TABLE_NAME = 'participations' THEN
      IF OLD.review_status <> NEW.review_status THEN
        v_should_audit := true;
      END IF;
    ELSIF TG_TABLE_NAME = 'participation_pricing' THEN
      IF OLD.price_snapshot IS DISTINCT FROM NEW.price_snapshot OR OLD.payable <> NEW.payable THEN
        v_should_audit := true;
      END IF;
    ELSIF TG_TABLE_NAME = 'project_financial_settings' THEN
      IF OLD.price_per_accepted_form IS DISTINCT FROM NEW.price_per_accepted_form THEN
        v_should_audit := true;
      END IF;
    ELSIF TG_TABLE_NAME = 'payments' THEN
      IF OLD.amount IS DISTINCT FROM NEW.amount OR OLD.payment_date IS DISTINCT FROM NEW.payment_date OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
        v_should_audit := true;
      END IF;
    ELSIF TG_TABLE_NAME = 'respondents' THEN
      IF OLD.mobile <> NEW.mobile OR OLD.normalized_mobile <> NEW.normalized_mobile THEN
        v_should_audit := true;
      END IF;
    END IF;
  END IF;

  -- Create audit entry (runs with DEFINER permissions to bypass client insert block)
  IF v_should_audit THEN
    INSERT INTO audit_log (
      account_id,
      actor_profile_id,
      entity_type,
      entity_id,
      action,
      old_value,
      new_value,
      reason
    ) VALUES (
      v_account_id,
      v_actor_profile_id,
      TG_TABLE_NAME,
      v_entity_id,
      v_action,
      v_old,
      v_new,
      CASE
        WHEN TG_TABLE_NAME = 'participations' AND TG_OP = 'UPDATE' THEN NEW.review_correction_reason
        ELSE NULL
      END
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_trg_participations
AFTER INSERT OR UPDATE OR DELETE ON participations
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trg_participation_pricing
AFTER INSERT OR UPDATE OR DELETE ON participation_pricing
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trg_project_financial_settings
AFTER INSERT OR UPDATE OR DELETE ON project_financial_settings
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trg_payments
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trg_respondents
AFTER INSERT OR UPDATE OR DELETE ON respondents
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE respondents ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE participation_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ACCOUNTS POLICIES
CREATE POLICY sel_accounts ON accounts
  FOR SELECT USING (id = current_account_id());

CREATE POLICY upd_accounts ON accounts
  FOR UPDATE USING (id = current_account_id() AND is_owner());

-- PROFILES POLICIES
CREATE POLICY sel_profiles ON profiles
  FOR SELECT USING (account_id = current_account_id());

CREATE POLICY ins_profiles_owner ON profiles
  FOR INSERT WITH CHECK (account_id = current_account_id() AND is_owner());

CREATE POLICY upd_profiles_owner ON profiles
  FOR UPDATE USING (account_id = current_account_id() AND is_owner())
  WITH CHECK (account_id = current_account_id() AND is_owner());

-- COMPANIES POLICIES
CREATE POLICY sel_companies ON companies
  FOR SELECT USING (account_id = current_account_id());

CREATE POLICY ins_companies ON companies
  FOR INSERT WITH CHECK (
    account_id = current_account_id() AND
    deleted_at IS NULL AND
    (created_by IS NULL OR created_by = current_profile_id()) AND
    updated_by IS NULL
  );

-- Direct UPDATE is denied for operational tables in the schema foundation.
-- Editing, soft-delete/archive, project status changes, phone changes, and other sensitive mutations must be implemented later through reviewed RPC/server actions.
-- This avoids state-smuggling and soft-delete bypass.

-- PROJECTS POLICIES
CREATE POLICY sel_projects ON projects
  FOR SELECT USING (account_id = current_account_id());

CREATE POLICY ins_projects ON projects
  FOR INSERT WITH CHECK (
    account_id = current_account_id() AND
    status = 'draft' AND
    deleted_at IS NULL AND
    (created_by IS NULL OR created_by = current_profile_id()) AND
    updated_by IS NULL
  );

-- Direct UPDATE is denied for operational tables in the schema foundation.
-- Editing, soft-delete/archive, project status changes, phone changes, and other sensitive mutations must be implemented later through reviewed RPC/server actions.
-- This avoids state-smuggling and soft-delete bypass.

-- PROJECT FINANCIAL SETTINGS POLICIES (Owner-Only)
CREATE POLICY sel_pfs_owner ON project_financial_settings
  FOR SELECT USING (account_id = current_account_id() AND is_owner());

CREATE POLICY ins_pfs_owner ON project_financial_settings
  FOR INSERT WITH CHECK (account_id = current_account_id() AND is_owner());

CREATE POLICY upd_pfs_owner ON project_financial_settings
  FOR UPDATE USING (account_id = current_account_id() AND is_owner())
  WITH CHECK (account_id = current_account_id() AND is_owner());

-- RESPONDENTS POLICIES
CREATE POLICY sel_respondents ON respondents
  FOR SELECT USING (account_id = current_account_id());

CREATE POLICY ins_respondents ON respondents
  FOR INSERT WITH CHECK (
    account_id = current_account_id() AND
    deleted_at IS NULL AND
    (created_by IS NULL OR created_by = current_profile_id()) AND
    updated_by IS NULL
  );

-- Direct UPDATE is denied for operational tables in the schema foundation.
-- Editing, soft-delete/archive, project status changes, phone changes, and other sensitive mutations must be implemented later through reviewed RPC/server actions.
-- This avoids state-smuggling and soft-delete bypass.

-- PARTICIPATIONS POLICIES (No direct Client Updates)
-- DESIGN DECISION: Support Helper/Owner can read participations. Support Helper can insert
-- participations to register respondents to projects.
-- Direct UPDATE is completely blocked (no UPDATE policy exists) to force changes to go through RPCs.
CREATE POLICY sel_participations ON participations
  FOR SELECT USING (account_id = current_account_id());

-- Direct INSERT only creates a neutral assignment row. All workflow transitions must use controlled RPC/server actions.
CREATE POLICY ins_participations ON participations
  FOR INSERT WITH CHECK (
    account_id = current_account_id() AND
    review_status = 'pending' AND
    accepted_at IS NULL AND
    rejected_at IS NULL AND
    rejection_reason IS NULL AND
    rejection_notes IS NULL AND
    review_correction_reason IS NULL AND
    form_status = 'not_started' AND
    form_completed_at IS NULL AND
    transferred_at IS NULL AND
    whatsapp_status = 'not_opened' AND
    whatsapp_opened_at IS NULL AND
    whatsapp_sent_at IS NULL AND
    whatsapp_message_snapshot IS NULL AND
    contact_status = 'new' AND
    participation_decision_status = 'unknown' AND
    consent_status = 'unknown' AND
    consent_channel IS NULL AND
    consent_at IS NULL AND
    consent_purpose_text IS NULL AND
    used_product IS NULL AND
    used_bank IS NULL AND
    project_specific_notes IS NULL AND
    deleted_at IS NULL AND
    (created_by IS NULL OR created_by = current_profile_id()) AND
    updated_by IS NULL AND
    (assigned_to_profile_id IS NULL OR assigned_to_profile_id = current_profile_id())
  );

-- PARTICIPATION PRICING POLICIES (Owner-Only)
CREATE POLICY sel_pp_owner ON participation_pricing
  FOR SELECT USING (account_id = current_account_id() AND is_owner());

CREATE POLICY ins_pp_owner ON participation_pricing
  FOR INSERT WITH CHECK (account_id = current_account_id() AND is_owner());

CREATE POLICY upd_pp_owner ON participation_pricing
  FOR UPDATE USING (account_id = current_account_id() AND is_owner())
  WITH CHECK (account_id = current_account_id() AND is_owner());

-- PAYMENTS POLICIES (Owner-Only)
CREATE POLICY sel_payments_owner ON payments
  FOR SELECT USING (account_id = current_account_id() AND is_owner());

CREATE POLICY ins_payments_owner ON payments
  FOR INSERT WITH CHECK (account_id = current_account_id() AND is_owner());

CREATE POLICY upd_payments_owner ON payments
  FOR UPDATE USING (account_id = current_account_id() AND is_owner())
  WITH CHECK (account_id = current_account_id() AND is_owner());

-- AUDIT LOG POLICIES (Client-Immutable, Select-Only)
-- DESIGN DECISION: Client cannot INSERT/UPDATE/DELETE audit logs directly. Write capability is
-- performed entirely through the SECURITY DEFINER audit trigger function.
-- MVP DECISION: audit_log SELECT is owner-only to fully prevent financial payload leaks.
-- support_helper audit visibility is deferred until redacted operational audit views exist.
CREATE POLICY sel_audit_log ON audit_log
  FOR SELECT USING (account_id = current_account_id() AND is_owner());

-- ------------------------------------------
-- 9. SECURITY INVOKER VIEWS
-- ------------------------------------------

-- Project Operational Summary View (Visible to both roles, strictly no pricing or payment figures)
CREATE VIEW project_operational_summary
WITH (security_invoker = true) AS
SELECT
  p.id AS project_id,
  p.account_id,
  p.name AS project_name,
  p.domain,
  p.status,
  COUNT(part.id) AS total_participations,
  COUNT(CASE WHEN part.review_status = 'accepted' THEN 1 END) AS accepted_count,
  COUNT(CASE WHEN part.review_status = 'rejected' THEN 1 END) AS rejected_count,
  COUNT(CASE WHEN part.review_status = 'pending' THEN 1 END) AS pending_count
FROM projects p
LEFT JOIN participations part ON p.id = part.project_id AND part.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.account_id, p.name, p.domain, p.status;

-- Project Financial Summary View (Owner-only due to underlying table RLS restrictions)
CREATE VIEW project_financial_summary
WITH (security_invoker = true) AS
SELECT
  p.id AS project_id,
  p.account_id,
  p.name AS project_name,
  COALESCE(pfs.price_per_accepted_form, 0) AS price_per_accepted_form,
  COUNT(pp.id) FILTER (WHERE pp.payable = true) AS accepted_payable_count,
  COALESCE(SUM(pp.price_snapshot) FILTER (WHERE pp.payable = true), 0) AS amount_due,
  COALESCE(pay.total_paid, 0) AS amount_paid,
  (COALESCE(SUM(pp.price_snapshot) FILTER (WHERE pp.payable = true), 0) - COALESCE(pay.total_paid, 0)) AS remaining
FROM projects p
JOIN project_financial_settings pfs ON p.id = pfs.project_id AND pfs.deleted_at IS NULL
LEFT JOIN participations part ON p.id = part.project_id AND part.deleted_at IS NULL
LEFT JOIN participation_pricing pp ON part.id = pp.participation_id
LEFT JOIN (
  SELECT project_id, SUM(amount) AS total_paid
  FROM payments
  WHERE deleted_at IS NULL
  GROUP BY project_id
) pay ON p.id = pay.project_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.account_id, p.name, pfs.price_per_accepted_form, pay.total_paid;
