-- Role-safe owner and support-helper read surfaces.
-- This migration changes read authorization only; it performs no data mutation.

BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('zamblak:202607130002_role_safe_read_surfaces', 0)
);

DO $precondition$
DECLARE
  v_public_schema oid := pg_catalog.to_regnamespace('public');
  v_auth_schema oid := pg_catalog.to_regnamespace('auth');
  v_relation record;
  v_column record;
  v_function record;
  v_policy record;
  v_oid oid;
  v_owner text;
  v_definition text;
  v_columns text[];
  v_output_names text[];
  v_output_types text[];
  v_policy_roles oid[];
  v_policy_comment text;
  v_function_source text;
  v_function_comment text;
  v_function_config text[];
  v_migration_state text;
  v_object_state text;
  v_normalized_definition text;
  v_normalized_expected text;
  v_using_definition text;
  v_check_definition text;
  v_expected_using text;
  v_expected_check text;
  v_column_types text[];
  v_dependencies text[];
  v_count bigint;
BEGIN
  -- Managed function definitions are compared by md5 after only line-ending
  -- normalization and outer trimming; the fingerprints are fixed baselines.
  IF v_public_schema IS NULL OR v_auth_schema IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: required_schema_missing';
  END IF;

  IF current_user::text NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: untrusted_migration_owner';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS required_role(role_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_roles AS role_row
      WHERE role_row.rolname = required_role.role_name
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: required_role_missing';
  END IF;

  IF EXISTS (
       SELECT 1
       FROM pg_catalog.pg_namespace AS namespace_row
       CROSS JOIN LATERAL pg_catalog.aclexplode(
         COALESCE(namespace_row.nspacl, pg_catalog.acldefault('n', namespace_row.nspowner))
       ) AS privilege_row
       WHERE namespace_row.oid = v_public_schema
         AND privilege_row.grantee = 0
         AND privilege_row.privilege_type = 'CREATE'
     ) OR EXISTS (
       SELECT 1
       FROM pg_catalog.pg_roles AS role_row
       WHERE role_row.rolname IN ('anon', 'authenticated')
         AND pg_catalog.has_schema_privilege(role_row.oid, v_public_schema, 'CREATE')
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: untrusted_public_schema_create';
  END IF;

  FOR v_relation IN
    SELECT expected.table_name FROM (VALUES
      ('accounts'),
      ('profiles'),
      ('companies'),
      ('projects'),
      ('project_financial_settings'),
      ('respondents'),
      ('participations'),
      ('participation_pricing'),
      ('payments'),
      ('audit_log')
    ) AS expected(table_name)
  LOOP
    v_oid := pg_catalog.to_regclass(pg_catalog.format('public.%I', v_relation.table_name));
    IF v_oid IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: core_table_missing';
    END IF;

    SELECT pg_catalog.pg_get_userbyid(class_row.relowner)
    INTO v_owner
    FROM pg_catalog.pg_class AS class_row
    WHERE class_row.oid = v_oid
      AND class_row.relkind IN ('r', 'p')
      AND class_row.relrowsecurity
      AND NOT class_row.relforcerowsecurity;

    IF NOT FOUND OR v_owner IS DISTINCT FROM current_user::text THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: core_table_security_or_owner_mismatch';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class AS class_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(class_row.relacl, pg_catalog.acldefault('r', class_row.relowner))
      ) AS privilege_row
      WHERE class_row.oid = v_oid
        AND CASE
          WHEN privilege_row.grantee = 0 THEN 'PUBLIC'
          ELSE pg_catalog.pg_get_userbyid(privilege_row.grantee)
        END NOT IN ('PUBLIC', 'anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin', current_user::text)
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: unexpected_table_grantee';
    END IF;
  END LOOP;

  FOR v_column IN
    SELECT expected.table_name, expected.column_name, expected.type_name FROM (VALUES
      ('accounts', 'id', 'uuid'), ('accounts', 'deleted_at', 'timestamp with time zone'),
      ('profiles', 'id', 'uuid'), ('profiles', 'account_id', 'uuid'), ('profiles', 'auth_user_id', 'uuid'),
      ('profiles', 'name', 'text'), ('profiles', 'role', 'text'), ('profiles', 'active', 'boolean'),
      ('profiles', 'deleted_at', 'timestamp with time zone'),
      ('companies', 'id', 'uuid'), ('companies', 'account_id', 'uuid'), ('companies', 'name', 'text'),
      ('companies', 'deleted_at', 'timestamp with time zone'),
      ('projects', 'id', 'uuid'), ('projects', 'account_id', 'uuid'), ('projects', 'company_id', 'uuid'),
      ('projects', 'name', 'text'), ('projects', 'domain', 'text'), ('projects', 'status', 'text'),
      ('projects', 'start_date', 'date'), ('projects', 'end_date', 'date'),
      ('projects', 'deleted_at', 'timestamp with time zone'),
      ('project_financial_settings', 'account_id', 'uuid'),
      ('project_financial_settings', 'deleted_at', 'timestamp with time zone'),
      ('respondents', 'id', 'uuid'), ('respondents', 'account_id', 'uuid'), ('respondents', 'name', 'text'),
      ('respondents', 'mobile', 'text'), ('respondents', 'age', 'integer'),
      ('respondents', 'resident_type', 'text'), ('respondents', 'deleted_at', 'timestamp with time zone'),
      ('participations', 'id', 'uuid'), ('participations', 'account_id', 'uuid'),
      ('participations', 'project_id', 'uuid'), ('participations', 'respondent_id', 'uuid'),
      ('participations', 'assigned_to_profile_id', 'uuid'), ('participations', 'contact_status', 'text'),
      ('participations', 'whatsapp_status', 'text'), ('participations', 'form_status', 'text'),
      ('participations', 'created_at', 'timestamp with time zone'),
      ('participations', 'deleted_at', 'timestamp with time zone'),
      ('participation_pricing', 'account_id', 'uuid'),
      ('payments', 'account_id', 'uuid'), ('payments', 'deleted_at', 'timestamp with time zone'),
      ('audit_log', 'account_id', 'uuid')
    ) AS expected(table_name, column_name, type_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute AS attribute_row
      WHERE attribute_row.attrelid = pg_catalog.to_regclass(pg_catalog.format('public.%I', v_column.table_name))
        AND attribute_row.attname = v_column.column_name
        AND attribute_row.attnum > 0
        AND NOT attribute_row.attisdropped
        AND attribute_row.atttypid = v_column.type_name::pg_catalog.regtype
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: required_column_incompatible';
    END IF;
  END LOOP;

  FOR v_function IN
    SELECT expected.function_name, expected.return_type, expected.authenticated_execute FROM (VALUES
      ('current_profile_id', 'uuid', false),
      ('current_account_id', 'uuid', false),
      ('current_profile_role', 'text', false),
      ('is_owner', 'boolean', true),
      ('is_support_helper', 'boolean', true)
    ) AS expected(function_name, return_type, authenticated_execute)
  LOOP
    SELECT COUNT(*)
    INTO v_count
    FROM pg_catalog.pg_proc AS function_row
    WHERE function_row.pronamespace = v_public_schema
      AND function_row.proname = v_function.function_name;

    v_oid := pg_catalog.to_regprocedure(pg_catalog.format('public.%I()', v_function.function_name));
    IF v_count IS DISTINCT FROM 1::bigint OR v_oid IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: identity_helper_signature_or_overload';
    END IF;

    SELECT
      pg_catalog.pg_get_userbyid(function_row.proowner),
      pg_catalog.pg_get_functiondef(function_row.oid),
      function_row.proconfig,
      pg_catalog.obj_description(function_row.oid, 'pg_proc')
    INTO v_owner, v_function_source, v_function_config, v_function_comment
    FROM pg_catalog.pg_proc AS function_row
    WHERE function_row.oid = v_oid
      AND function_row.prokind = 'f'
      AND function_row.pronargs = 0
      AND function_row.prorettype = v_function.return_type::pg_catalog.regtype
      AND function_row.prolang = (SELECT language_row.oid FROM pg_catalog.pg_language AS language_row WHERE language_row.lanname = 'sql')
      AND function_row.provolatile = 's'
      AND function_row.prosecdef;

    IF NOT FOUND OR v_owner IS DISTINCT FROM current_user::text THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: identity_helper_incompatible';
    END IF;

    IF v_function_config = ARRAY['search_path=public']::text[]
       AND position('managed_by: 202607130002_role_safe_read_surfaces' IN v_function_source) = 0
       AND v_function_comment IS NULL THEN
      v_object_state := 'baseline';
    ELSIF v_function_config = ARRAY['search_path=pg_catalog, public']::text[]
          AND position('managed_by: 202607130002_role_safe_read_surfaces' IN v_function_source) > 0
          AND v_function_comment LIKE 'managed_by: 202607130002_role_safe_read_surfaces;%'
    THEN
      v_object_state := 'managed';
    ELSE
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: identity_helper_state';
    END IF;

    v_normalized_definition := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(v_function_source, E'\r\n', E'\n'), E'\r', E'\n')
    );
    IF v_object_state = 'baseline' AND (
         position('auth.uid()' IN v_function_source) = 0
         OR position('active = true' IN v_function_source) = 0
         OR position('deleted_at IS NULL' IN v_function_source) = 0
         OR (v_function.function_name = 'is_owner' AND position('role = ''owner''' IN v_function_source) = 0)
         OR (v_function.function_name = 'is_support_helper' AND position('role = ''support_helper''' IN v_function_source) = 0)
       ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: baseline_identity_helper_source';
    ELSIF v_object_state = 'managed' AND pg_catalog.md5(v_normalized_definition) IS DISTINCT FROM (
      CASE v_function.function_name
        WHEN 'current_profile_id' THEN '4b8f5c0c0fbff768c99104d12fd0787f'
        WHEN 'current_account_id' THEN '2340258251b8626ba92eec927982a737'
        WHEN 'current_profile_role' THEN 'e16265f573450809ff42abefddb297db'
        WHEN 'is_owner' THEN '60f1c53cc2c2a992ae40d84e4193fb08'
        WHEN 'is_support_helper' THEN '48b03908b54e7d4f96ac774b080ce80f'
      END
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: managed_identity_helper_source';
    END IF;

    IF v_migration_state IS NULL THEN
      v_migration_state := v_object_state;
    ELSIF v_migration_state IS DISTINCT FROM v_object_state THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: mixed_helper_state';
    END IF;

    IF v_object_state = 'baseline' THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc AS function_row
        CROSS JOIN LATERAL pg_catalog.aclexplode(
          COALESCE(function_row.proacl, pg_catalog.acldefault('f', function_row.proowner))
        ) AS privilege_row
        WHERE function_row.oid = v_oid
          AND privilege_row.privilege_type = 'EXECUTE'
          AND privilege_row.grantee = 0
      ) OR EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc AS function_row
        CROSS JOIN LATERAL pg_catalog.aclexplode(
          COALESCE(function_row.proacl, pg_catalog.acldefault('f', function_row.proowner))
        ) AS privilege_row
        WHERE function_row.oid = v_oid
          AND privilege_row.privilege_type = 'EXECUTE'
          AND privilege_row.grantee NOT IN (
            0,
            function_row.proowner,
            (SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'anon'),
            (SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated')
          )
      ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: baseline_helper_acl_incompatible';
      END IF;
    ELSE
      IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc AS function_row
        CROSS JOIN LATERAL pg_catalog.aclexplode(
          COALESCE(function_row.proacl, pg_catalog.acldefault('f', function_row.proowner))
        ) AS privilege_row
        WHERE function_row.oid = v_oid
          AND privilege_row.privilege_type = 'EXECUTE'
          AND privilege_row.grantee NOT IN (
            function_row.proowner,
            CASE WHEN v_function.authenticated_execute THEN
              (SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated')
            ELSE function_row.proowner END
          )
      ) OR (
        v_function.authenticated_execute AND NOT pg_catalog.has_function_privilege(
          (SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated'),
          v_oid,
          'EXECUTE'
        )
      ) OR (
        NOT v_function.authenticated_execute AND pg_catalog.has_function_privilege(
          (SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated'),
          v_oid,
          'EXECUTE'
        )
      ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: managed_helper_acl_incompatible';
      END IF;
    END IF;
  END LOOP;

  FOR v_function IN
    SELECT expected.function_name, expected.signature FROM (VALUES
      ('current_account_matches', 'public.current_account_matches(uuid)'),
      ('current_profile_matches', 'public.current_profile_matches(uuid)')
    ) AS expected(function_name, signature)
  LOOP
    SELECT COUNT(*)
    INTO v_count
    FROM pg_catalog.pg_proc AS function_row
    WHERE function_row.pronamespace = v_public_schema
      AND function_row.proname = v_function.function_name;

    v_oid := pg_catalog.to_regprocedure(v_function.signature);
    IF v_migration_state = 'baseline' THEN
      IF v_count <> 0 OR v_oid IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: boolean_match_helper_preexists';
      END IF;
    ELSIF v_count IS DISTINCT FROM 1::bigint OR v_oid IS NULL OR NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS function_row
      WHERE function_row.oid = v_oid
        AND function_row.prokind = 'f'
        AND function_row.pronargs = 1
        AND function_row.proargtypes = '2950'::oidvector
        AND function_row.prorettype = 'boolean'::pg_catalog.regtype
        AND function_row.prolang = (SELECT language_row.oid FROM pg_catalog.pg_language AS language_row WHERE language_row.lanname = 'sql')
        AND function_row.provolatile = 's'
        AND function_row.prosecdef
        AND function_row.proconfig = ARRAY['search_path=pg_catalog, public']::text[]
        AND pg_catalog.md5(pg_catalog.btrim(
          pg_catalog.replace(pg_catalog.replace(pg_catalog.pg_get_functiondef(function_row.oid), E'\r\n', E'\n'), E'\r', E'\n')
        )) = CASE v_function.function_name
          WHEN 'current_account_matches' THEN '65ac12ffc3c52eb1a72d720c2a975688'
          WHEN 'current_profile_matches' THEN '4691508aaf2ed77bfd5586694032871f'
        END
        AND pg_catalog.obj_description(function_row.oid, 'pg_proc') LIKE 'managed_by: 202607130002_role_safe_read_surfaces;%'
        AND pg_catalog.pg_get_userbyid(function_row.proowner) = current_user::text
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: boolean_match_helper_state';
    END IF;

    IF v_migration_state = 'managed' AND (
      NOT pg_catalog.has_function_privilege(
        (SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated'),
        v_oid,
        'EXECUTE'
      ) OR EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc AS function_row
        CROSS JOIN LATERAL pg_catalog.aclexplode(
          COALESCE(function_row.proacl, pg_catalog.acldefault('f', function_row.proowner))
        ) AS privilege_row
        WHERE function_row.oid = v_oid
          AND privilege_row.privilege_type = 'EXECUTE'
          AND privilege_row.grantee NOT IN (
            function_row.proowner,
            (SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated')
          )
      )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: boolean_match_helper_acl';
    END IF;
  END LOOP;

  FOR v_policy IN
    SELECT expected.table_name, expected.policy_name, expected.baseline_expression, expected.managed_expression FROM (VALUES
      ('accounts', 'sel_accounts', '(id = current_account_id())', '(is_owner() AND current_account_matches(id) AND (deleted_at IS NULL))'),
      ('profiles', 'sel_profiles', '(account_id = current_account_id())', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('companies', 'sel_companies', '(account_id = current_account_id())', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('projects', 'sel_projects', '(account_id = current_account_id())', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('project_financial_settings', 'sel_pfs_owner', '((account_id = current_account_id()) AND is_owner())', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('respondents', 'sel_respondents', '(account_id = current_account_id())', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('participations', 'sel_participations', '(account_id = current_account_id())', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('participation_pricing', 'sel_pp_owner', '((account_id = current_account_id()) AND is_owner())', '(is_owner() AND current_account_matches(account_id))'),
      ('payments', 'sel_payments_owner', '((account_id = current_account_id()) AND is_owner())', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('audit_log', 'sel_audit_log', '((account_id = current_account_id()) AND is_owner())', '(is_owner() AND current_account_matches(account_id))')
    ) AS expected(table_name, policy_name, baseline_expression, managed_expression)
  LOOP
    SELECT COUNT(*)
    INTO v_count
    FROM pg_catalog.pg_policy AS policy_row
    WHERE policy_row.polrelid = pg_catalog.to_regclass(pg_catalog.format('public.%I', v_policy.table_name))
      AND policy_row.polcmd IN ('r', '*');

    IF v_count IS DISTINCT FROM 1::bigint THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: select_policy_inventory_incompatible';
    END IF;

    SELECT
      policy_row.oid,
      pg_catalog.pg_get_expr(policy_row.polqual, policy_row.polrelid),
      policy_row.polroles
    INTO v_oid, v_definition, v_policy_roles
    FROM pg_catalog.pg_policy AS policy_row
    WHERE policy_row.polrelid = pg_catalog.to_regclass(pg_catalog.format('public.%I', v_policy.table_name))
      AND policy_row.polname = v_policy.policy_name
      AND policy_row.polcmd = 'r'
      AND policy_row.polpermissive
      AND policy_row.polwithcheck IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: expected_select_policy_incompatible';
    END IF;

    v_policy_comment := pg_catalog.obj_description(v_oid, 'pg_policy');
    v_normalized_definition := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(v_definition, E'\r\n', E'\n'), E'\r', E'\n')
    );
    v_normalized_expected := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(
        CASE WHEN v_migration_state = 'baseline'
          THEN v_policy.baseline_expression
          ELSE v_policy.managed_expression
        END,
        E'\r\n', E'\n'), E'\r', E'\n')
    );

    IF v_normalized_definition IS DISTINCT FROM v_normalized_expected
       OR (v_migration_state = 'baseline' AND v_policy_roles IS DISTINCT FROM ARRAY[0::oid])
       OR (v_migration_state = 'managed' AND v_policy_roles IS DISTINCT FROM ARRAY[(
         SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated'
       )])
       OR (v_migration_state = 'baseline' AND v_policy_comment IS NOT NULL)
       OR (v_migration_state = 'managed' AND v_policy_comment IS DISTINCT FROM 'managed_by: 202607130002_role_safe_read_surfaces')
    THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: select_policy_state';
    END IF;
  END LOOP;

  FOR v_policy IN
    SELECT expected.table_name, expected.policy_name, expected.command, expected.baseline_using,
           expected.baseline_check, expected.managed_using, expected.managed_check
        FROM (VALUES
      ('accounts', 'upd_accounts', 'w',
        '((id = current_account_id()) AND is_owner())', NULL,
        '(current_account_matches(id) AND is_owner())', NULL),
      ('profiles', 'ins_profiles_owner', 'a',
        NULL, '((account_id = current_account_id()) AND is_owner())',
        NULL, '(current_account_matches(account_id) AND is_owner())'),
      ('profiles', 'upd_profiles_owner', 'w',
        '((account_id = current_account_id()) AND is_owner())', '((account_id = current_account_id()) AND is_owner())',
        '(current_account_matches(account_id) AND is_owner())', '(current_account_matches(account_id) AND is_owner())'),
      ('companies', 'ins_companies', 'a',
        NULL, '((account_id = current_account_id()) AND (deleted_at IS NULL) AND ((created_by IS NULL) OR (created_by = current_profile_id())) AND (updated_by IS NULL))',
        NULL, '(current_account_matches(account_id) AND (deleted_at IS NULL) AND ((created_by IS NULL) OR current_profile_matches(created_by)) AND (updated_by IS NULL))'),
      ('projects', 'ins_projects', 'a',
        NULL, '((account_id = current_account_id()) AND (status = ''draft''::text) AND (deleted_at IS NULL) AND ((created_by IS NULL) OR (created_by = current_profile_id())) AND (updated_by IS NULL))',
        NULL, '(current_account_matches(account_id) AND (status = ''draft''::text) AND (deleted_at IS NULL) AND ((created_by IS NULL) OR current_profile_matches(created_by)) AND (updated_by IS NULL))'),
      ('project_financial_settings', 'ins_pfs_owner', 'a',
        NULL, '((account_id = current_account_id()) AND is_owner())',
        NULL, '(current_account_matches(account_id) AND is_owner())'),
      ('project_financial_settings', 'upd_pfs_owner', 'w',
        '((account_id = current_account_id()) AND is_owner())', '((account_id = current_account_id()) AND is_owner())',
        '(current_account_matches(account_id) AND is_owner())', '(current_account_matches(account_id) AND is_owner())'),
      ('respondents', 'ins_respondents', 'a',
        NULL, '((account_id = current_account_id()) AND (deleted_at IS NULL) AND ((created_by IS NULL) OR (created_by = current_profile_id())) AND (updated_by IS NULL))',
        NULL, '(current_account_matches(account_id) AND (deleted_at IS NULL) AND ((created_by IS NULL) OR current_profile_matches(created_by)) AND (updated_by IS NULL))'),
      ('participations', 'ins_participations', 'a',
        NULL, '((account_id = current_account_id()) AND (review_status = ''pending''::text) AND (accepted_at IS NULL) AND (rejected_at IS NULL) AND (rejection_reason IS NULL) AND (rejection_notes IS NULL) AND (review_correction_reason IS NULL) AND (form_status = ''not_started''::text) AND (form_completed_at IS NULL) AND (transferred_at IS NULL) AND (whatsapp_status = ''not_opened''::text) AND (whatsapp_opened_at IS NULL) AND (whatsapp_sent_at IS NULL) AND (whatsapp_message_snapshot IS NULL) AND (contact_status = ''new''::text) AND (participation_decision_status = ''unknown''::text) AND (consent_status = ''unknown''::text) AND (consent_channel IS NULL) AND (consent_at IS NULL) AND (consent_purpose_text IS NULL) AND (used_product IS NULL) AND (used_bank IS NULL) AND (project_specific_notes IS NULL) AND (deleted_at IS NULL) AND ((created_by IS NULL) OR (created_by = current_profile_id())) AND (updated_by IS NULL) AND ((assigned_to_profile_id IS NULL) OR (assigned_to_profile_id = current_profile_id())))',
        NULL, '(current_account_matches(account_id) AND (review_status = ''pending''::text) AND (accepted_at IS NULL) AND (rejected_at IS NULL) AND (rejection_reason IS NULL) AND (rejection_notes IS NULL) AND (review_correction_reason IS NULL) AND (form_status = ''not_started''::text) AND (form_completed_at IS NULL) AND (transferred_at IS NULL) AND (whatsapp_status = ''not_opened''::text) AND (whatsapp_opened_at IS NULL) AND (whatsapp_sent_at IS NULL) AND (whatsapp_message_snapshot IS NULL) AND (contact_status = ''new''::text) AND (participation_decision_status = ''unknown''::text) AND (consent_status = ''unknown''::text) AND (consent_channel IS NULL) AND (consent_at IS NULL) AND (consent_purpose_text IS NULL) AND (used_product IS NULL) AND (used_bank IS NULL) AND (project_specific_notes IS NULL) AND (deleted_at IS NULL) AND ((created_by IS NULL) OR current_profile_matches(created_by)) AND (updated_by IS NULL) AND ((assigned_to_profile_id IS NULL) OR current_profile_matches(assigned_to_profile_id)))'),
      ('participation_pricing', 'ins_pp_owner', 'a',
        NULL, '((account_id = current_account_id()) AND is_owner())',
        NULL, '(current_account_matches(account_id) AND is_owner())'),
      ('participation_pricing', 'upd_pp_owner', 'w',
        '((account_id = current_account_id()) AND is_owner())', '((account_id = current_account_id()) AND is_owner())',
        '(current_account_matches(account_id) AND is_owner())', '(current_account_matches(account_id) AND is_owner())'),
      ('payments', 'ins_payments_owner', 'a',
        NULL, '((account_id = current_account_id()) AND is_owner())',
        NULL, '(current_account_matches(account_id) AND is_owner())'),
      ('payments', 'upd_payments_owner', 'w',
        '((account_id = current_account_id()) AND is_owner())', '((account_id = current_account_id()) AND is_owner())',
        '(current_account_matches(account_id) AND is_owner())', '(current_account_matches(account_id) AND is_owner())')
    ) AS expected(table_name, policy_name, command, baseline_using, baseline_check, managed_using, managed_check)
  LOOP
    SELECT
      policy_row.oid,
      pg_catalog.pg_get_expr(policy_row.polqual, policy_row.polrelid),
      pg_catalog.pg_get_expr(policy_row.polwithcheck, policy_row.polrelid),
      policy_row.polroles
    INTO v_oid, v_using_definition, v_check_definition, v_policy_roles
    FROM pg_catalog.pg_policy AS policy_row
    WHERE policy_row.polrelid = pg_catalog.to_regclass(pg_catalog.format('public.%I', v_policy.table_name))
      AND policy_row.polname = v_policy.policy_name
      AND policy_row.polcmd = v_policy.command
      AND policy_row.polpermissive;

    IF NOT FOUND OR v_policy_roles IS DISTINCT FROM ARRAY[0::oid] THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: write_policy_identity_incompatible';
    END IF;

    v_expected_using := CASE WHEN v_migration_state = 'baseline' THEN v_policy.baseline_using ELSE v_policy.managed_using END;
    v_expected_check := CASE WHEN v_migration_state = 'baseline' THEN v_policy.baseline_check ELSE v_policy.managed_check END;

    v_normalized_definition := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(COALESCE(v_using_definition, ''), E'\r\n', E'\n'), E'\r', E'\n')
    );
    v_normalized_expected := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(COALESCE(v_expected_using, ''), E'\r\n', E'\n'), E'\r', E'\n')
    );
    IF v_normalized_definition IS DISTINCT FROM v_normalized_expected THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: write_policy_using_semantics';
    END IF;

    v_normalized_definition := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(COALESCE(v_check_definition, ''), E'\r\n', E'\n'), E'\r', E'\n')
    );
    v_normalized_expected := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(COALESCE(v_expected_check, ''), E'\r\n', E'\n'), E'\r', E'\n')
    );
    IF v_normalized_definition IS DISTINCT FROM v_normalized_expected
       OR (v_migration_state = 'baseline' AND pg_catalog.obj_description(v_oid, 'pg_policy') IS NOT NULL)
       OR (v_migration_state = 'managed' AND pg_catalog.obj_description(v_oid, 'pg_policy') IS DISTINCT FROM 'managed_by: 202607130002_role_safe_read_surfaces')
    THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: write_policy_check_semantics';
    END IF;
  END LOOP;

  FOR v_relation IN
    SELECT expected.view_name, expected.column_names, expected.column_types, expected.dependencies FROM (VALUES
      (
        'project_operational_summary',
        ARRAY['project_id','account_id','project_name','domain','status','total_participations','accepted_count','rejected_count','pending_count']::text[],
        ARRAY['uuid','uuid','text','text','text','bigint','bigint','bigint','bigint']::text[],
        ARRAY['participations','projects']::text[]
      ),
      (
        'project_financial_summary',
        ARRAY['project_id','account_id','project_name','price_per_accepted_form','accepted_payable_count','amount_due','amount_paid','remaining']::text[],
        ARRAY['uuid','uuid','text','numeric','bigint','numeric','numeric','numeric']::text[],
        ARRAY['participation_pricing','participations','payments','project_financial_settings','projects']::text[]
      )
    ) AS expected(view_name, column_names, column_types, dependencies)
  LOOP
    v_oid := pg_catalog.to_regclass(pg_catalog.format('public.%I', v_relation.view_name));
    SELECT pg_catalog.pg_get_userbyid(class_row.relowner)
    INTO v_owner
    FROM pg_catalog.pg_class AS class_row
    WHERE class_row.oid = v_oid
      AND class_row.relkind = 'v'
      AND 'security_invoker=true' = ANY(COALESCE(class_row.reloptions, ARRAY[]::text[]));

    IF NOT FOUND OR v_owner IS DISTINCT FROM current_user::text THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: summary_view_incompatible';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class AS class_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(class_row.relacl, pg_catalog.acldefault('r', class_row.relowner))
      ) AS privilege_row
      WHERE class_row.oid = v_oid
        AND CASE
          WHEN privilege_row.grantee = 0 THEN 'PUBLIC'
          ELSE pg_catalog.pg_get_userbyid(privilege_row.grantee)
        END NOT IN ('PUBLIC', 'anon', 'authenticated', 'service_role', 'postgres', 'supabase_admin', current_user::text)
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: unexpected_view_grantee';
    END IF;

    IF v_migration_state = 'managed' AND (
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class AS class_row
        CROSS JOIN LATERAL pg_catalog.aclexplode(
          COALESCE(class_row.relacl, pg_catalog.acldefault('r', class_row.relowner))
        ) AS privilege_row
        WHERE class_row.oid = v_oid
          AND privilege_row.grantee IN (0, (
            SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'anon'
          ))
      ) OR NOT pg_catalog.has_table_privilege(
        (SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated'),
        v_oid,
        'SELECT'
      ) OR EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class AS class_row
        CROSS JOIN LATERAL pg_catalog.aclexplode(
          COALESCE(class_row.relacl, pg_catalog.acldefault('r', class_row.relowner))
        ) AS privilege_row
        WHERE class_row.oid = v_oid
          AND privilege_row.grantee = (
            SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated'
          )
          AND privilege_row.privilege_type <> 'SELECT'
      )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: managed_view_acl';
    END IF;

    SELECT
      pg_catalog.array_agg(attribute_row.attname ORDER BY attribute_row.attnum),
      pg_catalog.array_agg(pg_catalog.format_type(attribute_row.atttypid, NULL) ORDER BY attribute_row.attnum)
    INTO v_columns, v_column_types
    FROM pg_catalog.pg_attribute AS attribute_row
    WHERE attribute_row.attrelid = v_oid
      AND attribute_row.attnum > 0
      AND NOT attribute_row.attisdropped;

    IF v_columns IS DISTINCT FROM v_relation.column_names
       OR v_column_types IS DISTINCT FROM v_relation.column_types THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: summary_view_columns_incompatible';
    END IF;

    SELECT pg_catalog.array_agg(DISTINCT dependency_class.relname ORDER BY dependency_class.relname)
    INTO v_dependencies
    FROM pg_catalog.pg_rewrite AS rewrite_row
    JOIN pg_catalog.pg_depend AS dependency_row
      ON dependency_row.classid = 'pg_catalog.pg_rewrite'::pg_catalog.regclass
     AND dependency_row.objid = rewrite_row.oid
     AND dependency_row.refclassid = 'pg_catalog.pg_class'::pg_catalog.regclass
    JOIN pg_catalog.pg_class AS dependency_class
      ON dependency_class.oid = dependency_row.refobjid
    JOIN pg_catalog.pg_namespace AS dependency_namespace
      ON dependency_namespace.oid = dependency_class.relnamespace
    WHERE rewrite_row.ev_class = v_oid
      AND dependency_row.refobjid <> v_oid
      AND dependency_namespace.nspname = 'public'
      AND dependency_class.relkind IN ('r', 'p', 'v', 'm');

    IF v_dependencies IS DISTINCT FROM v_relation.dependencies THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: summary_view_dependencies_incompatible';
    END IF;

    SELECT pg_catalog.pg_get_viewdef(v_oid, false)
    INTO v_definition;
    v_normalized_definition := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(v_definition, E'\r\n', E'\n'), E'\r', E'\n')
    );

    IF v_migration_state = 'managed'
       AND pg_catalog.md5(v_normalized_definition) IS DISTINCT FROM (
         CASE v_relation.view_name
           WHEN 'project_operational_summary' THEN 'b1f87e352e1dcd50b85f5fce8d9ecc7d'
           WHEN 'project_financial_summary' THEN 'f9be64f49dcbe0769bda0419a3e644be'
         END
       ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: view_definition';
    END IF;
  END LOOP;

  SELECT pg_catalog.pg_get_constraintdef(constraint_row.oid, true)
  INTO v_definition
  FROM pg_catalog.pg_constraint AS constraint_row
  WHERE constraint_row.conrelid = 'public.profiles'::pg_catalog.regclass
    AND constraint_row.conname = 'chk_profiles_role'
    AND constraint_row.contype = 'c'
    AND constraint_row.convalidated;

  IF v_definition IS NULL
     OR position('''owner''' IN v_definition) = 0
     OR position('''support_helper''' IN v_definition) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: profile_role_constraint_incompatible';
  END IF;

  SELECT pg_catalog.array_agg(role_literal.match_value ORDER BY role_literal.match_value)
  INTO v_columns
  FROM (
    SELECT match_row.match_values[1] AS match_value
    FROM pg_catalog.regexp_matches(v_definition, '''([^'']+)''', 'g') AS match_row(match_values)
  ) AS role_literal;

  IF v_columns IS DISTINCT FROM ARRAY['owner', 'support_helper']::text[] THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: profile_role_constraint_has_unexpected_value';
  END IF;

  FOR v_policy IN
    SELECT expected.constraint_name, expected.allowed_values FROM (VALUES
      ('chk_part_contact_status', ARRAY['new','whatsapp_opened','whatsapp_sent_manual','responded','cannot_contact_now']::text[]),
      ('chk_part_whatsapp_status', ARRAY['not_opened','opened','sent_manual','opened_not_confirmed']::text[]),
      ('chk_part_form_status', ARRAY['not_started','completed','transferred']::text[])
    ) AS expected(constraint_name, allowed_values)
  LOOP
    SELECT pg_catalog.pg_get_constraintdef(constraint_row.oid, true)
    INTO v_definition
    FROM pg_catalog.pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.participations'::pg_catalog.regclass
      AND constraint_row.conname = v_policy.constraint_name
      AND constraint_row.contype = 'c'
      AND constraint_row.convalidated;

    IF v_definition IS NULL OR EXISTS (
      SELECT 1 FROM pg_catalog.unnest(v_policy.allowed_values) AS allowed_value(value)
      WHERE position(pg_catalog.quote_literal(allowed_value.value) IN v_definition) = 0
    ) OR v_definition ~* '(review|accept|reject|price|bill|payment|settlement|payable)' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: operational_status_constraint_incompatible';
    END IF;
  END LOOP;

  v_oid := pg_catalog.to_regprocedure('public.enforce_participation_project_state()');
  IF v_oid IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_proc AS function_row
       WHERE function_row.oid = v_oid
         AND function_row.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
         AND function_row.prosecdef
         AND COALESCE('search_path=public' = ANY(function_row.proconfig), false)
        AND position('managed_by: 202607130001_participation_project_state_guard' IN pg_catalog.pg_get_functiondef(function_row.oid)) > 0
         AND pg_catalog.pg_get_userbyid(function_row.proowner) = current_user::text
     )
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_trigger AS trigger_row
       WHERE trigger_row.tgrelid = 'public.participations'::pg_catalog.regclass
         AND trigger_row.tgname = 'trg_participation_00_project_state_guard'
         AND NOT trigger_row.tgisinternal
         AND trigger_row.tgenabled = 'O'
         AND trigger_row.tgfoid = v_oid
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: project_state_guard_missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_index AS index_row
    WHERE index_row.indexrelid = pg_catalog.to_regclass('public.idx_participations_unique_respondent_per_project')
      AND index_row.indrelid = 'public.participations'::pg_catalog.regclass
      AND index_row.indisunique
      AND index_row.indisvalid
      AND index_row.indisready
      AND pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, true) = 'project_id'
      AND pg_catalog.pg_get_indexdef(index_row.indexrelid, 2, true) = 'respondent_id'
      AND pg_catalog.btrim(
        pg_catalog.replace(pg_catalog.replace(pg_catalog.pg_get_expr(index_row.indpred, index_row.indrelid), E'\r\n', E'\n'), E'\r', E'\n')
      ) = '(deleted_at IS NULL)'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: participation_unique_index_incompatible';
  END IF;

  FOR v_function IN
    SELECT expected.function_name, expected.signature, expected.output_names, expected.output_types FROM (VALUES
      (
        'support_participation_operational_rows',
        'public.support_participation_operational_rows(uuid,integer,integer)',
        ARRAY['participation_id','project_id','project_name','respondent_id','respondent_name','respondent_mobile','respondent_age','respondent_resident_type','assigned_profile_id','assigned_profile_name','assigned_profile_role','assigned_profile_active','contact_status','whatsapp_status','form_status']::text[],
        ARRAY['uuid','uuid','text','uuid','text','text','integer','text','uuid','text','text','boolean','text','text','text']::text[]
      ),
      (
        'support_profile_directory',
        'public.support_profile_directory(integer,integer)',
        ARRAY['profile_id','display_name','role','active']::text[],
        ARRAY['uuid','text','text','boolean']::text[]
      ),
      (
        'support_project_participation_summary',
        'public.support_project_participation_summary(uuid,integer,integer)',
        ARRAY['project_id','project_name','total_participations']::text[],
        ARRAY['uuid','text','bigint']::text[]
      ),
      (
        'support_project_directory',
        'public.support_project_directory(integer,integer)',
        ARRAY['project_id','project_name','company_id','company_name','project_status','domain','start_date','end_date']::text[],
        ARRAY['uuid','text','uuid','text','text','text','date','date']::text[]
      )
    ) AS expected(function_name, signature, output_names, output_types)
  LOOP
    SELECT COUNT(*)
    INTO v_count
    FROM pg_catalog.pg_proc AS function_row
    WHERE function_row.pronamespace = v_public_schema
      AND function_row.proname = v_function.function_name;
    v_oid := pg_catalog.to_regprocedure(v_function.signature);

    IF v_migration_state = 'baseline' THEN
      IF v_count <> 0 OR v_oid IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: support_rpc_preexists';
      END IF;
    ELSIF v_count IS DISTINCT FROM 1::bigint OR v_oid IS NULL OR NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS function_row
      WHERE function_row.oid = v_oid
        AND function_row.prokind = 'f'
        AND function_row.provolatile = 's'
        AND function_row.prosecdef
        AND function_row.proconfig = ARRAY['search_path=pg_catalog, public']::text[]
        AND function_row.prolang = (SELECT language_row.oid FROM pg_catalog.pg_language AS language_row WHERE language_row.lanname = 'plpgsql')
        AND pg_catalog.md5(pg_catalog.btrim(
          pg_catalog.replace(pg_catalog.replace(pg_catalog.pg_get_functiondef(function_row.oid), E'\r\n', E'\n'), E'\r', E'\n')
        )) = CASE v_function.function_name
          WHEN 'support_participation_operational_rows' THEN '49e53047775321c7e822848317b289a4'
          WHEN 'support_profile_directory' THEN '7eb3fc54c1d2e5f565291ffe2922cd05'
          WHEN 'support_project_participation_summary' THEN 'd8d2057d0cb3eac268c01ca86508b427'
          WHEN 'support_project_directory' THEN 'f90ce9569d002e384931e2641f8933d9'
        END
        AND pg_catalog.obj_description(function_row.oid, 'pg_proc') LIKE 'managed_by: 202607130002_role_safe_read_surfaces;%'
        AND pg_catalog.pg_get_userbyid(function_row.proowner) = current_user::text
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: support_rpc';
    ELSE
      IF NOT pg_catalog.has_function_privilege(
        (SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated'),
        v_oid,
        'EXECUTE'
      ) OR EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc AS function_row
        CROSS JOIN LATERAL pg_catalog.aclexplode(
          COALESCE(function_row.proacl, pg_catalog.acldefault('f', function_row.proowner))
        ) AS privilege_row
        WHERE function_row.oid = v_oid
          AND privilege_row.privilege_type = 'EXECUTE'
          AND privilege_row.grantee NOT IN (
            function_row.proowner,
            (SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated')
          )
      ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: support_rpc_unexpected_grantee';
      END IF;

      SELECT
        pg_catalog.array_agg(function_row.proargnames[argument.ordinality] ORDER BY argument.ordinality),
        pg_catalog.array_agg(
          pg_catalog.format_type(function_row.proallargtypes[argument.ordinality], NULL)
          ORDER BY argument.ordinality
        )
      INTO v_output_names, v_output_types
      FROM pg_catalog.pg_proc AS function_row
      CROSS JOIN LATERAL pg_catalog.generate_subscripts(function_row.proallargtypes, 1)
        AS argument(ordinality)
      WHERE function_row.oid = v_oid
        AND function_row.proargmodes[argument.ordinality] = 't';

      IF v_output_names IS DISTINCT FROM v_function.output_names
         OR v_output_types IS DISTINCT FROM v_function.output_types THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: support_rpc_result_shape';
      END IF;
    END IF;
  END LOOP;
END;
$precondition$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  -- managed_by: 202607130002_role_safe_read_surfaces
  SELECT profile_row.id
  FROM public.profiles AS profile_row
  JOIN public.accounts AS account_row
    ON account_row.id = profile_row.account_id
   AND account_row.deleted_at IS NULL
  WHERE profile_row.auth_user_id = (SELECT auth.uid())
    AND profile_row.active = true
    AND profile_row.deleted_at IS NULL;
$function$;

CREATE OR REPLACE FUNCTION public.current_account_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  -- managed_by: 202607130002_role_safe_read_surfaces
  SELECT profile_row.account_id
  FROM public.profiles AS profile_row
  JOIN public.accounts AS account_row
    ON account_row.id = profile_row.account_id
   AND account_row.deleted_at IS NULL
  WHERE profile_row.id = public.current_profile_id()
    AND profile_row.active = true
    AND profile_row.deleted_at IS NULL;
$function$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  -- managed_by: 202607130002_role_safe_read_surfaces
  SELECT profile_row.role
  FROM public.profiles AS profile_row
  JOIN public.accounts AS account_row
    ON account_row.id = profile_row.account_id
   AND account_row.deleted_at IS NULL
  WHERE profile_row.id = public.current_profile_id()
    AND profile_row.active = true
    AND profile_row.deleted_at IS NULL;
$function$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  -- managed_by: 202607130002_role_safe_read_surfaces
  SELECT COALESCE(public.current_profile_role() = 'owner', false);
$function$;

CREATE OR REPLACE FUNCTION public.is_support_helper()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  -- managed_by: 202607130002_role_safe_read_surfaces
  SELECT COALESCE(public.current_profile_role() = 'support_helper', false);
$function$;

CREATE OR REPLACE FUNCTION public.current_account_matches(target_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  -- managed_by: 202607130002_role_safe_read_surfaces
  SELECT COALESCE(
    target_account_id IS NOT NULL
    AND target_account_id = public.current_account_id(),
    false
  );
$function$;

CREATE OR REPLACE FUNCTION public.current_profile_matches(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  -- managed_by: 202607130002_role_safe_read_surfaces
  SELECT COALESCE(
    target_profile_id IS NOT NULL
    AND target_profile_id = public.current_profile_id(),
    false
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.current_profile_id() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.current_account_id() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.current_profile_role() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.is_support_helper() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.current_account_matches(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.current_profile_matches(uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_support_helper() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_account_matches(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_matches(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.support_participation_operational_rows(
  p_project_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  participation_id uuid,
  project_id uuid,
  project_name text,
  respondent_id uuid,
  respondent_name text,
  respondent_mobile text,
  respondent_age integer,
  respondent_resident_type text,
  assigned_profile_id uuid,
  assigned_profile_name text,
  assigned_profile_role text,
  assigned_profile_active boolean,
  contact_status text,
  whatsapp_status text,
  form_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 202607130002_role_safe_read_surfaces
DECLARE
  v_account_id uuid;
BEGIN
  IF NOT COALESCE(public.is_support_helper(), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'support_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'support_access_denied';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_pagination';
  END IF;

  RETURN QUERY
  SELECT
    participation_row.id,
    project_row.id,
    project_row.name,
    respondent_row.id,
    respondent_row.name,
    respondent_row.mobile,
    respondent_row.age,
    respondent_row.resident_type,
    assigned_profile.id,
    assigned_profile.name,
    assigned_profile.role,
    assigned_profile.active,
    participation_row.contact_status,
    participation_row.whatsapp_status,
    participation_row.form_status
  FROM public.participations AS participation_row
  JOIN public.projects AS project_row
    ON project_row.id = participation_row.project_id
   AND project_row.account_id = v_account_id
   AND project_row.deleted_at IS NULL
  JOIN public.companies AS company_row
    ON company_row.id = project_row.company_id
   AND company_row.account_id = v_account_id
   AND company_row.deleted_at IS NULL
  JOIN public.respondents AS respondent_row
    ON respondent_row.id = participation_row.respondent_id
   AND respondent_row.account_id = v_account_id
   AND respondent_row.deleted_at IS NULL
  LEFT JOIN public.profiles AS assigned_profile
    ON assigned_profile.id = participation_row.assigned_to_profile_id
   AND assigned_profile.account_id = v_account_id
   AND assigned_profile.deleted_at IS NULL
  WHERE participation_row.account_id = v_account_id
    AND participation_row.deleted_at IS NULL
    AND (p_project_id IS NULL OR participation_row.project_id = p_project_id)
    AND (participation_row.assigned_to_profile_id IS NULL OR assigned_profile.id IS NOT NULL)
  ORDER BY participation_row.created_at DESC, participation_row.id DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.support_profile_directory(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  profile_id uuid,
  display_name text,
  role text,
  active boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 202607130002_role_safe_read_surfaces
DECLARE
  v_account_id uuid;
BEGIN
  IF NOT COALESCE(public.is_support_helper(), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'support_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'support_access_denied';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_pagination';
  END IF;

  RETURN QUERY
  SELECT profile_row.id, profile_row.name, profile_row.role, profile_row.active
  FROM public.profiles AS profile_row
  WHERE profile_row.account_id = v_account_id
    AND profile_row.deleted_at IS NULL
  ORDER BY profile_row.name, profile_row.id
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.support_project_participation_summary(
  p_project_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  total_participations bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 202607130002_role_safe_read_surfaces
DECLARE
  v_account_id uuid;
BEGIN
  IF NOT COALESCE(public.is_support_helper(), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'support_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'support_access_denied';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_pagination';
  END IF;

  RETURN QUERY
  SELECT
    project_row.id,
    project_row.name,
    (
      SELECT COUNT(*)
      FROM public.participations AS participation_row
      JOIN public.respondents AS respondent_row
        ON respondent_row.id = participation_row.respondent_id
       AND respondent_row.account_id = v_account_id
       AND respondent_row.deleted_at IS NULL
      LEFT JOIN public.profiles AS assigned_profile
        ON assigned_profile.id = participation_row.assigned_to_profile_id
       AND assigned_profile.account_id = v_account_id
       AND assigned_profile.deleted_at IS NULL
      WHERE participation_row.project_id = project_row.id
        AND participation_row.account_id = v_account_id
        AND participation_row.deleted_at IS NULL
        AND (participation_row.assigned_to_profile_id IS NULL OR assigned_profile.id IS NOT NULL)
    )::bigint
  FROM public.projects AS project_row
  JOIN public.companies AS company_row
    ON company_row.id = project_row.company_id
   AND company_row.account_id = v_account_id
   AND company_row.deleted_at IS NULL
  WHERE project_row.account_id = v_account_id
    AND project_row.deleted_at IS NULL
    AND (p_project_id IS NULL OR project_row.id = p_project_id)
  ORDER BY project_row.name, project_row.id
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.support_project_directory(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  company_id uuid,
  company_name text,
  project_status text,
  domain text,
  start_date date,
  end_date date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 202607130002_role_safe_read_surfaces
DECLARE
  v_account_id uuid;
BEGIN
  IF NOT COALESCE(public.is_support_helper(), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'support_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'support_access_denied';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_pagination';
  END IF;

  RETURN QUERY
  SELECT
    project_row.id,
    project_row.name,
    company_row.id,
    company_row.name,
    project_row.status,
    project_row.domain,
    project_row.start_date,
    project_row.end_date
  FROM public.projects AS project_row
  JOIN public.companies AS company_row
    ON company_row.id = project_row.company_id
   AND company_row.account_id = v_account_id
   AND company_row.deleted_at IS NULL
  WHERE project_row.account_id = v_account_id
    AND project_row.deleted_at IS NULL
  ORDER BY project_row.name, project_row.id
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

COMMENT ON FUNCTION public.current_profile_id() IS 'managed_by: 202607130002_role_safe_read_surfaces; active profile and account identity helper';
COMMENT ON FUNCTION public.current_account_id() IS 'managed_by: 202607130002_role_safe_read_surfaces; active account identity helper';
COMMENT ON FUNCTION public.current_profile_role() IS 'managed_by: 202607130002_role_safe_read_surfaces; active role identity helper';
COMMENT ON FUNCTION public.is_owner() IS 'managed_by: 202607130002_role_safe_read_surfaces; owner role predicate';
COMMENT ON FUNCTION public.is_support_helper() IS 'managed_by: 202607130002_role_safe_read_surfaces; support-helper role predicate';
COMMENT ON FUNCTION public.current_account_matches(uuid) IS 'managed_by: 202607130002_role_safe_read_surfaces; non-leaking active-account match predicate';
COMMENT ON FUNCTION public.current_profile_matches(uuid) IS 'managed_by: 202607130002_role_safe_read_surfaces; non-leaking active-profile match predicate';
COMMENT ON FUNCTION public.support_participation_operational_rows(uuid, integer, integer) IS 'managed_by: 202607130002_role_safe_read_surfaces; support-safe operational participation rows';
COMMENT ON FUNCTION public.support_profile_directory(integer, integer) IS 'managed_by: 202607130002_role_safe_read_surfaces; support-safe profile directory';
COMMENT ON FUNCTION public.support_project_participation_summary(uuid, integer, integer) IS 'managed_by: 202607130002_role_safe_read_surfaces; support-safe project participation totals';
COMMENT ON FUNCTION public.support_project_directory(integer, integer) IS 'managed_by: 202607130002_role_safe_read_surfaces; support-safe project directory';

REVOKE EXECUTE ON FUNCTION public.support_participation_operational_rows(uuid, integer, integer) FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.support_profile_directory(integer, integer) FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.support_project_participation_summary(uuid, integer, integer) FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.support_project_directory(integer, integer) FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.support_participation_operational_rows(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_profile_directory(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_project_participation_summary(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_project_directory(integer, integer) TO authenticated;

DROP POLICY sel_accounts ON public.accounts;
CREATE POLICY sel_accounts ON public.accounts FOR SELECT TO authenticated
USING (public.is_owner() AND public.current_account_matches(id) AND deleted_at IS NULL);

DROP POLICY sel_profiles ON public.profiles;
CREATE POLICY sel_profiles ON public.profiles FOR SELECT TO authenticated
USING (public.is_owner() AND public.current_account_matches(account_id) AND deleted_at IS NULL);

DROP POLICY sel_companies ON public.companies;
CREATE POLICY sel_companies ON public.companies FOR SELECT TO authenticated
USING (public.is_owner() AND public.current_account_matches(account_id) AND deleted_at IS NULL);

DROP POLICY sel_projects ON public.projects;
CREATE POLICY sel_projects ON public.projects FOR SELECT TO authenticated
USING (public.is_owner() AND public.current_account_matches(account_id) AND deleted_at IS NULL);

DROP POLICY sel_pfs_owner ON public.project_financial_settings;
CREATE POLICY sel_pfs_owner ON public.project_financial_settings FOR SELECT TO authenticated
USING (public.is_owner() AND public.current_account_matches(account_id) AND deleted_at IS NULL);

DROP POLICY sel_respondents ON public.respondents;
CREATE POLICY sel_respondents ON public.respondents FOR SELECT TO authenticated
USING (public.is_owner() AND public.current_account_matches(account_id) AND deleted_at IS NULL);

DROP POLICY sel_participations ON public.participations;
CREATE POLICY sel_participations ON public.participations FOR SELECT TO authenticated
USING (public.is_owner() AND public.current_account_matches(account_id) AND deleted_at IS NULL);

DROP POLICY sel_pp_owner ON public.participation_pricing;
CREATE POLICY sel_pp_owner ON public.participation_pricing FOR SELECT TO authenticated
USING (public.is_owner() AND public.current_account_matches(account_id));

DROP POLICY sel_payments_owner ON public.payments;
CREATE POLICY sel_payments_owner ON public.payments FOR SELECT TO authenticated
USING (public.is_owner() AND public.current_account_matches(account_id) AND deleted_at IS NULL);

DROP POLICY sel_audit_log ON public.audit_log;
CREATE POLICY sel_audit_log ON public.audit_log FOR SELECT TO authenticated
USING (public.is_owner() AND public.current_account_matches(account_id));

DROP POLICY upd_accounts ON public.accounts;
CREATE POLICY upd_accounts ON public.accounts
FOR UPDATE USING (public.current_account_matches(id) AND public.is_owner());

DROP POLICY ins_profiles_owner ON public.profiles;
CREATE POLICY ins_profiles_owner ON public.profiles
FOR INSERT WITH CHECK (public.current_account_matches(account_id) AND public.is_owner());

DROP POLICY upd_profiles_owner ON public.profiles;
CREATE POLICY upd_profiles_owner ON public.profiles
FOR UPDATE USING (public.current_account_matches(account_id) AND public.is_owner())
WITH CHECK (public.current_account_matches(account_id) AND public.is_owner());

DROP POLICY ins_companies ON public.companies;
CREATE POLICY ins_companies ON public.companies
FOR INSERT WITH CHECK (
  public.current_account_matches(account_id) AND
  deleted_at IS NULL AND
  (created_by IS NULL OR public.current_profile_matches(created_by)) AND
  updated_by IS NULL
);

DROP POLICY ins_projects ON public.projects;
CREATE POLICY ins_projects ON public.projects
FOR INSERT WITH CHECK (
  public.current_account_matches(account_id) AND
  status = 'draft' AND
  deleted_at IS NULL AND
  (created_by IS NULL OR public.current_profile_matches(created_by)) AND
  updated_by IS NULL
);

DROP POLICY ins_pfs_owner ON public.project_financial_settings;
CREATE POLICY ins_pfs_owner ON public.project_financial_settings
FOR INSERT WITH CHECK (public.current_account_matches(account_id) AND public.is_owner());

DROP POLICY upd_pfs_owner ON public.project_financial_settings;
CREATE POLICY upd_pfs_owner ON public.project_financial_settings
FOR UPDATE USING (public.current_account_matches(account_id) AND public.is_owner())
WITH CHECK (public.current_account_matches(account_id) AND public.is_owner());

DROP POLICY ins_respondents ON public.respondents;
CREATE POLICY ins_respondents ON public.respondents
FOR INSERT WITH CHECK (
  public.current_account_matches(account_id) AND
  deleted_at IS NULL AND
  (created_by IS NULL OR public.current_profile_matches(created_by)) AND
  updated_by IS NULL
);

DROP POLICY ins_participations ON public.participations;
CREATE POLICY ins_participations ON public.participations
FOR INSERT WITH CHECK (
  public.current_account_matches(account_id) AND
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
  (created_by IS NULL OR public.current_profile_matches(created_by)) AND
  updated_by IS NULL AND
  (assigned_to_profile_id IS NULL OR public.current_profile_matches(assigned_to_profile_id))
);

DROP POLICY ins_pp_owner ON public.participation_pricing;
CREATE POLICY ins_pp_owner ON public.participation_pricing
FOR INSERT WITH CHECK (public.current_account_matches(account_id) AND public.is_owner());

DROP POLICY upd_pp_owner ON public.participation_pricing;
CREATE POLICY upd_pp_owner ON public.participation_pricing
FOR UPDATE USING (public.current_account_matches(account_id) AND public.is_owner())
WITH CHECK (public.current_account_matches(account_id) AND public.is_owner());

DROP POLICY ins_payments_owner ON public.payments;
CREATE POLICY ins_payments_owner ON public.payments
FOR INSERT WITH CHECK (public.current_account_matches(account_id) AND public.is_owner());

DROP POLICY upd_payments_owner ON public.payments;
CREATE POLICY upd_payments_owner ON public.payments
FOR UPDATE USING (public.current_account_matches(account_id) AND public.is_owner())
WITH CHECK (public.current_account_matches(account_id) AND public.is_owner());

COMMENT ON POLICY sel_accounts ON public.accounts IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY sel_profiles ON public.profiles IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY sel_companies ON public.companies IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY sel_projects ON public.projects IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY sel_pfs_owner ON public.project_financial_settings IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY sel_respondents ON public.respondents IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY sel_participations ON public.participations IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY sel_pp_owner ON public.participation_pricing IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY sel_payments_owner ON public.payments IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY sel_audit_log ON public.audit_log IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY upd_accounts ON public.accounts IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY ins_profiles_owner ON public.profiles IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY upd_profiles_owner ON public.profiles IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY ins_companies ON public.companies IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY ins_projects ON public.projects IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY ins_pfs_owner ON public.project_financial_settings IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY upd_pfs_owner ON public.project_financial_settings IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY ins_respondents ON public.respondents IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY ins_participations ON public.participations IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY ins_pp_owner ON public.participation_pricing IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY upd_pp_owner ON public.participation_pricing IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY ins_payments_owner ON public.payments IS 'managed_by: 202607130002_role_safe_read_surfaces';
COMMENT ON POLICY upd_payments_owner ON public.payments IS 'managed_by: 202607130002_role_safe_read_surfaces';

CREATE OR REPLACE VIEW public.project_operational_summary
WITH (security_invoker = true) AS
SELECT
  project_row.id AS project_id,
  project_row.account_id,
  project_row.name AS project_name,
  project_row.domain,
  project_row.status,
  COUNT(participation_row.id) AS total_participations,
  COUNT(CASE WHEN participation_row.review_status = 'accepted' THEN 1 END) AS accepted_count,
  COUNT(CASE WHEN participation_row.review_status = 'rejected' THEN 1 END) AS rejected_count,
  COUNT(CASE WHEN participation_row.review_status = 'pending' THEN 1 END) AS pending_count
FROM public.projects AS project_row
LEFT JOIN public.participations AS participation_row
  ON participation_row.project_id = project_row.id
 AND participation_row.deleted_at IS NULL
WHERE project_row.deleted_at IS NULL
  AND public.current_account_matches(project_row.account_id)
  AND public.is_owner()
GROUP BY project_row.id, project_row.account_id, project_row.name, project_row.domain, project_row.status;

COMMENT ON VIEW public.project_operational_summary IS 'managed_by: 202607130002_role_safe_read_surfaces; owner-only review-derived operational summary';

REVOKE SELECT ON TABLE
  public.accounts,
  public.profiles,
  public.companies,
  public.projects,
  public.project_financial_settings,
  public.respondents,
  public.participations,
  public.participation_pricing,
  public.payments,
  public.audit_log
FROM PUBLIC, anon;

GRANT SELECT ON TABLE
  public.accounts,
  public.profiles,
  public.companies,
  public.projects,
  public.project_financial_settings,
  public.respondents,
  public.participations,
  public.participation_pricing,
  public.payments,
  public.audit_log
TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.project_operational_summary, public.project_financial_summary FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.project_operational_summary, public.project_financial_summary TO authenticated;

DO $assertions$
DECLARE
  v_function record;
  v_policy record;
  v_relation record;
  v_oid oid;
  v_output_columns text[];
  v_output_types text[];
  v_policy_expression text;
  v_policy_check_expression text;
  v_view_definition text;
  v_function_source text;
  v_normalized_definition text;
  v_normalized_expected text;
  v_column_names text[];
  v_column_types text[];
  v_dependencies text[];
  v_count bigint;
  v_authenticated_oid oid := (SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated');
  v_anon_oid oid := (SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'anon');
  v_service_role_oid oid := (SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'service_role');
  v_public_schema oid := pg_catalog.to_regnamespace('public');
BEGIN
  -- Final managed-function and view checks use fixed trusted fingerprints after
  -- only line-ending normalization and outer trimming.
  IF EXISTS (
       SELECT 1
       FROM pg_catalog.pg_namespace AS namespace_row
       CROSS JOIN LATERAL pg_catalog.aclexplode(
         COALESCE(namespace_row.nspacl, pg_catalog.acldefault('n', namespace_row.nspowner))
       ) AS privilege_row
       WHERE namespace_row.oid = v_public_schema
         AND privilege_row.grantee = 0
         AND privilege_row.privilege_type = 'CREATE'
     ) OR pg_catalog.has_schema_privilege(v_anon_oid, v_public_schema, 'CREATE')
     OR pg_catalog.has_schema_privilege(v_authenticated_oid, v_public_schema, 'CREATE') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: untrusted_public_schema_create_assertion';
  END IF;

  FOR v_function IN
    SELECT expected.function_name, expected.signature, expected.return_type, expected.language_name,
           expected.authenticated_execute, expected.output_columns, expected.output_types FROM (VALUES
      ('current_profile_id', 'public.current_profile_id()', 'uuid', 'sql', false, ARRAY[]::text[], ARRAY[]::text[]),
      ('current_account_id', 'public.current_account_id()', 'uuid', 'sql', false, ARRAY[]::text[], ARRAY[]::text[]),
      ('current_profile_role', 'public.current_profile_role()', 'text', 'sql', false, ARRAY[]::text[], ARRAY[]::text[]),
      ('is_owner', 'public.is_owner()', 'boolean', 'sql', true, ARRAY[]::text[], ARRAY[]::text[]),
      ('is_support_helper', 'public.is_support_helper()', 'boolean', 'sql', true, ARRAY[]::text[], ARRAY[]::text[]),
      ('current_account_matches', 'public.current_account_matches(uuid)', 'boolean', 'sql', true, ARRAY[]::text[], ARRAY[]::text[]),
      ('current_profile_matches', 'public.current_profile_matches(uuid)', 'boolean', 'sql', true, ARRAY[]::text[], ARRAY[]::text[]),
      ('support_participation_operational_rows', 'public.support_participation_operational_rows(uuid,integer,integer)', 'record', 'plpgsql', true,
        ARRAY['participation_id','project_id','project_name','respondent_id','respondent_name','respondent_mobile','respondent_age','respondent_resident_type','assigned_profile_id','assigned_profile_name','assigned_profile_role','assigned_profile_active','contact_status','whatsapp_status','form_status']::text[],
        ARRAY['uuid','uuid','text','uuid','text','text','integer','text','uuid','text','text','boolean','text','text','text']::text[]),
      ('support_profile_directory', 'public.support_profile_directory(integer,integer)', 'record', 'plpgsql', true,
        ARRAY['profile_id','display_name','role','active']::text[], ARRAY['uuid','text','text','boolean']::text[]),
      ('support_project_participation_summary', 'public.support_project_participation_summary(uuid,integer,integer)', 'record', 'plpgsql', true,
        ARRAY['project_id','project_name','total_participations']::text[], ARRAY['uuid','text','bigint']::text[]),
      ('support_project_directory', 'public.support_project_directory(integer,integer)', 'record', 'plpgsql', true,
        ARRAY['project_id','project_name','company_id','company_name','project_status','domain','start_date','end_date']::text[],
        ARRAY['uuid','text','uuid','text','text','text','date','date']::text[])
    ) AS expected(function_name, signature, return_type, language_name, authenticated_execute, output_columns, output_types)
  LOOP
    SELECT COUNT(*)
    INTO v_count
    FROM pg_catalog.pg_proc AS function_row
    WHERE function_row.pronamespace = v_public_schema
      AND function_row.proname = v_function.function_name;

    v_oid := pg_catalog.to_regprocedure(v_function.signature);
    IF v_count IS DISTINCT FROM 1::bigint OR v_oid IS NULL OR NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS function_row
      WHERE function_row.oid = v_oid
        AND function_row.prokind = 'f'
        AND function_row.prorettype = v_function.return_type::pg_catalog.regtype
        AND function_row.prolang = (SELECT language_row.oid FROM pg_catalog.pg_language AS language_row WHERE language_row.lanname = v_function.language_name)
        AND function_row.provolatile = 's'
        AND function_row.prosecdef
        AND function_row.proconfig = ARRAY['search_path=pg_catalog, public']::text[]
        AND position('managed_by: 202607130002_role_safe_read_surfaces' IN pg_catalog.pg_get_functiondef(function_row.oid)) > 0
        AND pg_catalog.obj_description(function_row.oid, 'pg_proc') LIKE 'managed_by: 202607130002_role_safe_read_surfaces;%'
        AND pg_catalog.pg_get_userbyid(function_row.proowner) = current_user::text
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: managed_function_assertion';
    END IF;

    SELECT pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(pg_catalog.pg_get_functiondef(function_row.oid), E'\r\n', E'\n'), E'\r', E'\n')
    )
    INTO v_function_source
    FROM pg_catalog.pg_proc AS function_row
    WHERE function_row.oid = v_oid;

    IF pg_catalog.md5(v_function_source) IS DISTINCT FROM (
      CASE v_function.function_name
        WHEN 'current_profile_id' THEN '4b8f5c0c0fbff768c99104d12fd0787f'
        WHEN 'current_account_id' THEN '2340258251b8626ba92eec927982a737'
        WHEN 'current_profile_role' THEN 'e16265f573450809ff42abefddb297db'
        WHEN 'is_owner' THEN '60f1c53cc2c2a992ae40d84e4193fb08'
        WHEN 'is_support_helper' THEN '48b03908b54e7d4f96ac774b080ce80f'
        WHEN 'current_account_matches' THEN '65ac12ffc3c52eb1a72d720c2a975688'
        WHEN 'current_profile_matches' THEN '4691508aaf2ed77bfd5586694032871f'
        WHEN 'support_participation_operational_rows' THEN '49e53047775321c7e822848317b289a4'
        WHEN 'support_profile_directory' THEN '7eb3fc54c1d2e5f565291ffe2922cd05'
        WHEN 'support_project_participation_summary' THEN 'd8d2057d0cb3eac268c01ca86508b427'
        WHEN 'support_project_directory' THEN 'f90ce9569d002e384931e2641f8933d9'
      END
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: managed_function_source_assertion';
    END IF;

    IF pg_catalog.cardinality(v_function.output_columns) > 0 THEN
      SELECT
        pg_catalog.array_agg(function_row.proargnames[argument.ordinality] ORDER BY argument.ordinality),
        pg_catalog.array_agg(pg_catalog.format_type(function_row.proallargtypes[argument.ordinality], NULL) ORDER BY argument.ordinality)
      INTO v_output_columns, v_output_types
      FROM pg_catalog.pg_proc AS function_row
      CROSS JOIN LATERAL pg_catalog.generate_subscripts(function_row.proallargtypes, 1)
        AS argument(ordinality)
      WHERE function_row.oid = v_oid
        AND function_row.proargmodes[argument.ordinality] = 't';

      IF v_output_columns IS DISTINCT FROM v_function.output_columns
         OR v_output_types IS DISTINCT FROM v_function.output_types
         OR v_output_columns && ARRAY['review_status','reviewed_at','accepted_at','rejected_at','rejection_reason','rejection_notes','review_correction_reason','notes','account_id','created_at','updated_at','deleted_at','price','amount','payment','settlement','payable']::text[] THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: support_rpc_output_assertion';
      END IF;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS function_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(function_row.proacl, pg_catalog.acldefault('f', function_row.proowner))
      ) AS privilege_row
      WHERE function_row.oid = v_oid
        AND privilege_row.privilege_type = 'EXECUTE'
        AND privilege_row.grantee IN (0, v_anon_oid, v_service_role_oid)
    ) OR EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS function_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(function_row.proacl, pg_catalog.acldefault('f', function_row.proowner))
      ) AS privilege_row
      WHERE function_row.oid = v_oid
        AND privilege_row.privilege_type = 'EXECUTE'
        AND privilege_row.grantee NOT IN (function_row.proowner, v_authenticated_oid)
    ) OR (v_function.authenticated_execute AND NOT pg_catalog.has_function_privilege(v_authenticated_oid, v_oid, 'EXECUTE'))
      OR (NOT v_function.authenticated_execute AND pg_catalog.has_function_privilege(v_authenticated_oid, v_oid, 'EXECUTE'))
    THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: function_acl_assertion';
    END IF;
  END LOOP;

  FOR v_policy IN
    SELECT expected.table_name, expected.policy_name, expected.expression FROM (VALUES
      ('accounts', 'sel_accounts', '(is_owner() AND current_account_matches(id) AND (deleted_at IS NULL))'),
      ('profiles', 'sel_profiles', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('companies', 'sel_companies', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('projects', 'sel_projects', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('project_financial_settings', 'sel_pfs_owner', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('respondents', 'sel_respondents', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('participations', 'sel_participations', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('participation_pricing', 'sel_pp_owner', '(is_owner() AND current_account_matches(account_id))'),
      ('payments', 'sel_payments_owner', '(is_owner() AND current_account_matches(account_id) AND (deleted_at IS NULL))'),
      ('audit_log', 'sel_audit_log', '(is_owner() AND current_account_matches(account_id))')
    ) AS expected(table_name, policy_name, expression)
  LOOP
    SELECT COUNT(*)
    INTO v_count
    FROM pg_catalog.pg_policy AS policy_row
    WHERE policy_row.polrelid = pg_catalog.to_regclass(pg_catalog.format('public.%I', v_policy.table_name))
      AND policy_row.polcmd IN ('r', '*');

    SELECT policy_row.oid, pg_catalog.pg_get_expr(policy_row.polqual, policy_row.polrelid)
    INTO v_oid, v_policy_expression
    FROM pg_catalog.pg_policy AS policy_row
    WHERE policy_row.polrelid = pg_catalog.to_regclass(pg_catalog.format('public.%I', v_policy.table_name))
      AND policy_row.polname = v_policy.policy_name
      AND policy_row.polcmd = 'r'
      AND policy_row.polpermissive
      AND policy_row.polroles = ARRAY[v_authenticated_oid]
      AND policy_row.polwithcheck IS NULL;

    v_normalized_definition := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(COALESCE(v_policy_expression, ''), E'\r\n', E'\n'), E'\r', E'\n')
    );
    v_normalized_expected := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(v_policy.expression, E'\r\n', E'\n'), E'\r', E'\n')
    );

    IF v_count IS DISTINCT FROM 1::bigint
       OR NOT FOUND
       OR v_normalized_definition IS DISTINCT FROM v_normalized_expected
       OR pg_catalog.obj_description(v_oid, 'pg_policy') IS DISTINCT FROM 'managed_by: 202607130002_role_safe_read_surfaces' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: select_policy_assertion';
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy AS policy_row
    WHERE policy_row.polrelid IN (
      'public.accounts'::pg_catalog.regclass, 'public.profiles'::pg_catalog.regclass,
      'public.companies'::pg_catalog.regclass, 'public.projects'::pg_catalog.regclass,
      'public.project_financial_settings'::pg_catalog.regclass, 'public.respondents'::pg_catalog.regclass,
      'public.participations'::pg_catalog.regclass, 'public.participation_pricing'::pg_catalog.regclass,
      'public.payments'::pg_catalog.regclass, 'public.audit_log'::pg_catalog.regclass
    ) AND (
      position('current_account_id' IN COALESCE(pg_catalog.pg_get_expr(policy_row.polqual, policy_row.polrelid), '')) > 0
      OR position('current_profile_id' IN COALESCE(pg_catalog.pg_get_expr(policy_row.polqual, policy_row.polrelid), '')) > 0
      OR position('current_profile_role' IN COALESCE(pg_catalog.pg_get_expr(policy_row.polqual, policy_row.polrelid), '')) > 0
      OR position('current_account_id' IN COALESCE(pg_catalog.pg_get_expr(policy_row.polwithcheck, policy_row.polrelid), '')) > 0
      OR position('current_profile_id' IN COALESCE(pg_catalog.pg_get_expr(policy_row.polwithcheck, policy_row.polrelid), '')) > 0
      OR position('current_profile_role' IN COALESCE(pg_catalog.pg_get_expr(policy_row.polwithcheck, policy_row.polrelid), '')) > 0
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: internal_helper_policy_reference';
  END IF;

  FOR v_policy IN
    SELECT expected.table_name, expected.policy_name, expected.command, expected.using_expression, expected.check_expression
    FROM (VALUES
      ('accounts', 'upd_accounts', 'w',
        '(current_account_matches(id) AND is_owner())', NULL),
      ('profiles', 'ins_profiles_owner', 'a',
        NULL, '(current_account_matches(account_id) AND is_owner())'),
      ('profiles', 'upd_profiles_owner', 'w',
        '(current_account_matches(account_id) AND is_owner())', '(current_account_matches(account_id) AND is_owner())'),
      ('companies', 'ins_companies', 'a',
        NULL, '(current_account_matches(account_id) AND (deleted_at IS NULL) AND ((created_by IS NULL) OR current_profile_matches(created_by)) AND (updated_by IS NULL))'),
      ('projects', 'ins_projects', 'a',
        NULL, '(current_account_matches(account_id) AND (status = ''draft''::text) AND (deleted_at IS NULL) AND ((created_by IS NULL) OR current_profile_matches(created_by)) AND (updated_by IS NULL))'),
      ('project_financial_settings', 'ins_pfs_owner', 'a',
        NULL, '(current_account_matches(account_id) AND is_owner())'),
      ('project_financial_settings', 'upd_pfs_owner', 'w',
        '(current_account_matches(account_id) AND is_owner())', '(current_account_matches(account_id) AND is_owner())'),
      ('respondents', 'ins_respondents', 'a',
        NULL, '(current_account_matches(account_id) AND (deleted_at IS NULL) AND ((created_by IS NULL) OR current_profile_matches(created_by)) AND (updated_by IS NULL))'),
      ('participations', 'ins_participations', 'a',
        NULL, '(current_account_matches(account_id) AND (review_status = ''pending''::text) AND (accepted_at IS NULL) AND (rejected_at IS NULL) AND (rejection_reason IS NULL) AND (rejection_notes IS NULL) AND (review_correction_reason IS NULL) AND (form_status = ''not_started''::text) AND (form_completed_at IS NULL) AND (transferred_at IS NULL) AND (whatsapp_status = ''not_opened''::text) AND (whatsapp_opened_at IS NULL) AND (whatsapp_sent_at IS NULL) AND (whatsapp_message_snapshot IS NULL) AND (contact_status = ''new''::text) AND (participation_decision_status = ''unknown''::text) AND (consent_status = ''unknown''::text) AND (consent_channel IS NULL) AND (consent_at IS NULL) AND (consent_purpose_text IS NULL) AND (used_product IS NULL) AND (used_bank IS NULL) AND (project_specific_notes IS NULL) AND (deleted_at IS NULL) AND ((created_by IS NULL) OR current_profile_matches(created_by)) AND (updated_by IS NULL) AND ((assigned_to_profile_id IS NULL) OR current_profile_matches(assigned_to_profile_id)))'),
      ('participation_pricing', 'ins_pp_owner', 'a',
        NULL, '(current_account_matches(account_id) AND is_owner())'),
      ('participation_pricing', 'upd_pp_owner', 'w',
        '(current_account_matches(account_id) AND is_owner())', '(current_account_matches(account_id) AND is_owner())'),
      ('payments', 'ins_payments_owner', 'a',
        NULL, '(current_account_matches(account_id) AND is_owner())'),
      ('payments', 'upd_payments_owner', 'w',
        '(current_account_matches(account_id) AND is_owner())', '(current_account_matches(account_id) AND is_owner())')
    ) AS expected(table_name, policy_name, command, using_expression, check_expression)
  LOOP
    SELECT
      policy_row.oid,
      pg_catalog.pg_get_expr(policy_row.polqual, policy_row.polrelid),
      pg_catalog.pg_get_expr(policy_row.polwithcheck, policy_row.polrelid)
    INTO v_oid, v_policy_expression, v_policy_check_expression
    FROM pg_catalog.pg_policy AS policy_row
    WHERE policy_row.polrelid = pg_catalog.to_regclass(pg_catalog.format('public.%I', v_policy.table_name))
      AND policy_row.polname = v_policy.policy_name
      AND policy_row.polcmd = v_policy.command
      AND policy_row.polpermissive
      AND policy_row.polroles = ARRAY[0::oid];

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: write_policy_identity_assertion';
    END IF;

    v_normalized_definition := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(COALESCE(v_policy_expression, ''), E'\r\n', E'\n'), E'\r', E'\n')
    );
    v_normalized_expected := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(COALESCE(v_policy.using_expression, ''), E'\r\n', E'\n'), E'\r', E'\n')
    );
    IF v_normalized_definition IS DISTINCT FROM v_normalized_expected THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: write_policy_using_assertion';
    END IF;

    v_normalized_definition := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(COALESCE(v_policy_check_expression, ''), E'\r\n', E'\n'), E'\r', E'\n')
    );
    v_normalized_expected := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(COALESCE(v_policy.check_expression, ''), E'\r\n', E'\n'), E'\r', E'\n')
    );
    IF v_normalized_definition IS DISTINCT FROM v_normalized_expected
       OR pg_catalog.obj_description(v_oid, 'pg_policy') IS DISTINCT FROM 'managed_by: 202607130002_role_safe_read_surfaces' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: write_policy_check_assertion';
    END IF;
  END LOOP;

  FOR v_relation IN
    SELECT expected.table_name FROM (VALUES
      ('accounts'), ('profiles'), ('companies'), ('projects'), ('project_financial_settings'),
      ('respondents'), ('participations'), ('participation_pricing'), ('payments'), ('audit_log')
    ) AS expected(table_name)
  LOOP
    v_oid := pg_catalog.to_regclass(pg_catalog.format('public.%I', v_relation.table_name));
    -- Read-surface contract only: SELECT authorization. Non-SELECT privileges are out of scope.
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_class AS class_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(class_row.relacl) AS privilege_row
      WHERE class_row.oid = v_oid
        AND privilege_row.privilege_type = 'SELECT'
        AND privilege_row.grantee = 0
    ) OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_class AS class_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(class_row.relacl) AS privilege_row
      WHERE class_row.oid = v_oid
        AND privilege_row.privilege_type = 'SELECT'
        AND privilege_row.grantee = v_anon_oid
    ) OR NOT pg_catalog.has_table_privilege(
      v_authenticated_oid,
      v_oid,
      'SELECT'
    ) OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_class AS class_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(class_row.relacl) AS privilege_row
      WHERE class_row.oid = v_oid
        AND privilege_row.privilege_type = 'SELECT'
        AND privilege_row.grantee = v_authenticated_oid
        AND privilege_row.is_grantable
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: table_acl_assertion';
    END IF;
  END LOOP;

  FOR v_relation IN
    SELECT expected.view_name, expected.column_names, expected.column_types, expected.dependencies FROM (VALUES
      (
        'project_operational_summary',
        ARRAY['project_id','account_id','project_name','domain','status','total_participations','accepted_count','rejected_count','pending_count']::text[],
        ARRAY['uuid','uuid','text','text','text','bigint','bigint','bigint','bigint']::text[],
        ARRAY['participations','projects']::text[]
      ),
      (
        'project_financial_summary',
        ARRAY['project_id','account_id','project_name','price_per_accepted_form','accepted_payable_count','amount_due','amount_paid','remaining']::text[],
        ARRAY['uuid','uuid','text','numeric','bigint','numeric','numeric','numeric']::text[],
        ARRAY['participation_pricing','participations','payments','project_financial_settings','projects']::text[]
      )
    ) AS expected(view_name, column_names, column_types, dependencies)
  LOOP
    v_oid := pg_catalog.to_regclass(pg_catalog.format('public.%I', v_relation.view_name));
    -- View ACL contract: REVOKE ALL from PUBLIC/anon/authenticated + GRANT SELECT to authenticated.
    -- service_role Dxtm is preserved by runtime and by managed evidence; do not reject it.
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class AS class_row
      WHERE class_row.oid = v_oid
        AND class_row.relkind = 'v'
        AND 'security_invoker=true' = ANY(COALESCE(class_row.reloptions, ARRAY[]::text[]))
        AND pg_catalog.pg_get_userbyid(class_row.relowner) = current_user::text
    ) OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_class AS class_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(class_row.relacl, pg_catalog.acldefault('r', class_row.relowner))
      ) AS privilege_row
      WHERE class_row.oid = v_oid
        AND privilege_row.grantee = 0
    ) OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_class AS class_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(class_row.relacl, pg_catalog.acldefault('r', class_row.relowner))
      ) AS privilege_row
      WHERE class_row.oid = v_oid
        AND privilege_row.grantee = v_anon_oid
    ) OR NOT pg_catalog.has_table_privilege(
      v_authenticated_oid,
      v_oid,
      'SELECT'
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class AS class_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(class_row.relacl, pg_catalog.acldefault('r', class_row.relowner))
      ) AS privilege_row
      WHERE class_row.oid = v_oid
        AND privilege_row.privilege_type = 'SELECT'
        AND privilege_row.grantee = v_authenticated_oid
        AND NOT privilege_row.is_grantable
    ) OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_class AS class_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(class_row.relacl, pg_catalog.acldefault('r', class_row.relowner))
      ) AS privilege_row
      WHERE class_row.oid = v_oid
        AND privilege_row.grantee = v_authenticated_oid
        AND privilege_row.privilege_type <> 'SELECT'
    ) OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_class AS class_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(class_row.relacl, pg_catalog.acldefault('r', class_row.relowner))
      ) AS privilege_row
      WHERE class_row.oid = v_oid
        AND privilege_row.grantee = v_authenticated_oid
        AND privilege_row.privilege_type = 'SELECT'
        AND privilege_row.is_grantable
    ) OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_class AS class_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(class_row.relacl, pg_catalog.acldefault('r', class_row.relowner))
      ) AS privilege_row
      WHERE class_row.oid = v_oid
        AND privilege_row.grantee NOT IN (class_row.relowner, v_authenticated_oid, v_service_role_oid)
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: view_assertion';
    END IF;

    SELECT
      pg_catalog.array_agg(attribute_row.attname ORDER BY attribute_row.attnum),
      pg_catalog.array_agg(pg_catalog.format_type(attribute_row.atttypid, NULL) ORDER BY attribute_row.attnum)
    INTO v_column_names, v_column_types
    FROM pg_catalog.pg_attribute AS attribute_row
    WHERE attribute_row.attrelid = v_oid
      AND attribute_row.attnum > 0
      AND NOT attribute_row.attisdropped;

    IF v_column_names IS DISTINCT FROM v_relation.column_names
       OR v_column_types IS DISTINCT FROM v_relation.column_types THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: view_column_assertion';
    END IF;

    SELECT pg_catalog.array_agg(DISTINCT dependency_class.relname ORDER BY dependency_class.relname)
    INTO v_dependencies
    FROM pg_catalog.pg_rewrite AS rewrite_row
    JOIN pg_catalog.pg_depend AS dependency_row
      ON dependency_row.classid = 'pg_catalog.pg_rewrite'::pg_catalog.regclass
     AND dependency_row.objid = rewrite_row.oid
     AND dependency_row.refclassid = 'pg_catalog.pg_class'::pg_catalog.regclass
    JOIN pg_catalog.pg_class AS dependency_class
      ON dependency_class.oid = dependency_row.refobjid
    JOIN pg_catalog.pg_namespace AS dependency_namespace
      ON dependency_namespace.oid = dependency_class.relnamespace
    WHERE rewrite_row.ev_class = v_oid
      AND dependency_row.refobjid <> v_oid
      AND dependency_namespace.nspname = 'public'
      AND dependency_class.relkind IN ('r', 'p', 'v', 'm');

    IF v_dependencies IS DISTINCT FROM v_relation.dependencies THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: view_dependency_assertion';
    END IF;

    SELECT pg_catalog.pg_get_viewdef(v_oid, false)
    INTO v_view_definition;
    v_normalized_definition := pg_catalog.btrim(
      pg_catalog.replace(pg_catalog.replace(v_view_definition, E'\r\n', E'\n'), E'\r', E'\n')
    );

    IF pg_catalog.md5(v_normalized_definition) IS DISTINCT FROM (
      CASE v_relation.view_name
        WHEN 'project_operational_summary' THEN 'b1f87e352e1dcd50b85f5fce8d9ecc7d'
        WHEN 'project_financial_summary' THEN 'f9be64f49dcbe0769bda0419a3e644be'
      END
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: view_definition_assertion';
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_index AS index_row
    WHERE index_row.indexrelid = pg_catalog.to_regclass('public.idx_participations_unique_respondent_per_project')
      AND index_row.indisunique AND index_row.indisvalid AND index_row.indisready
  ) OR pg_catalog.to_regprocedure('public.enforce_participation_project_state()') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_trigger AS trigger_row
       WHERE trigger_row.tgrelid = 'public.participations'::pg_catalog.regclass
         AND trigger_row.tgname = 'trg_participation_00_project_state_guard'
         AND NOT trigger_row.tgisinternal
         AND trigger_row.tgenabled = 'O'
         AND trigger_row.tgfoid = pg_catalog.to_regprocedure('public.enforce_participation_project_state()')
     ) OR EXISTS (
       SELECT 1 FROM pg_catalog.pg_class AS class_row
       WHERE class_row.oid IN (
         'public.accounts'::pg_catalog.regclass, 'public.profiles'::pg_catalog.regclass,
         'public.companies'::pg_catalog.regclass, 'public.projects'::pg_catalog.regclass,
         'public.project_financial_settings'::pg_catalog.regclass, 'public.respondents'::pg_catalog.regclass,
         'public.participations'::pg_catalog.regclass, 'public.participation_pricing'::pg_catalog.regclass,
         'public.payments'::pg_catalog.regclass, 'public.audit_log'::pg_catalog.regclass
       ) AND (NOT class_row.relrowsecurity OR class_row.relforcerowsecurity)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: preserved_security_object_assertion';
  END IF;
END;
$assertions$;

COMMIT;
