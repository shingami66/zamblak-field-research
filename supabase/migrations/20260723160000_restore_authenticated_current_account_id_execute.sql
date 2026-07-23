-- ============================================================================
-- Zamblak Field Research Core Database Schema
-- Migration: 20260723160000_restore_authenticated_current_account_id_execute.sql
-- Fix: Restore authenticated EXECUTE grant on public.current_account_id()
-- ============================================================================
--
-- Rationale:
--   Owner SELECT policies for core tables, research_forms, collections, and related
--   read views invoke public.current_account_id() during RLS evaluation.
--   When authenticated sessions query these tables, PostgreSQL evaluates the RLS policy
--   under the authenticated role, which requires EXECUTE privilege on current_account_id().
--   This migration grants EXECUTE on public.current_account_id() strictly to authenticated,
--   while keeping anon and PUBLIC explicitly denied.
-- ============================================================================

BEGIN;

REVOKE ALL ON FUNCTION public.current_account_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_account_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_account_id() TO authenticated;

COMMIT;
