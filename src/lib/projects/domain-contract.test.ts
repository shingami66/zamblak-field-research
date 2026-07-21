import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const migration = readFileSync(
  path.join(root, "supabase/migrations/20260719120000_projects_free_text_domain.sql"),
  "utf8"
);

describe("project free-text domain migration contract", () => {
  it("replaces only the domain constraint with a trimmed 1..120 character check", () => {
    assert.match(migration, /DROP CONSTRAINT IF EXISTS chk_projects_domain/);
    assert.match(migration, /btrim\(domain\) <> ''/);
    assert.match(migration, /char_length\(btrim\(domain\)\) BETWEEN 1 AND 120/);
    assert.equal(migration.includes("domain IN ('telecom'"), false);
  });

  it("keeps both exact RPC signatures, definer posture, and narrow grants", () => {
    for (const signature of [
      "create_project(text,uuid,text,date,date,integer,integer,integer,text,text,boolean,text,text,text)",
      "update_project(uuid,timestamptz,text,uuid,text,date,date,integer,integer,integer,text,text,boolean,text,text,text)",
    ]) {
      assert.equal(migration.includes(signature), true);
    }
    assert.equal((migration.match(/SECURITY DEFINER/g) ?? []).length, 2);
    assert.equal((migration.match(/SET search_path = pg_catalog, public/g) ?? []).length, 2);
    assert.equal((migration.match(/OWNER TO postgres/g) ?? []).length, 2);
    assert.equal((migration.match(/TO authenticated/g) ?? []).length, 2);
    assert.equal((migration.match(/FROM PUBLIC, anon, service_role/g) ?? []).length, 2);
  });

  it("trims arbitrary domain input without broadening account or role authority", () => {
    assert.equal((migration.match(/v_domain := btrim\(p_domain\)/g) ?? []).length >= 2, true);
    assert.equal(migration.includes("p_domain NOT IN"), false);
    assert.equal((migration.match(/public\.is_owner\(\)/g) ?? []).length, 2);
    assert.equal((migration.match(/public\.is_support_helper\(\)/g) ?? []).length, 2);
    assert.equal((migration.match(/current_account_id\(\)/g) ?? []).length, 2);
    assert.equal((migration.match(/FOR SHARE/g) ?? []).length, 2);
    assert.equal((migration.match(/FOR UPDATE/g) ?? []).length, 1);
  });
});
