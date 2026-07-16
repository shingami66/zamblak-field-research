import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCompany,
  getCompany,
  listCompanies,
  updateCompany,
} from "./rpc";

type RpcCall = { name: string; args: Record<string, unknown> };

function mockClient(handler: (name: string, args: Record<string, unknown>) => {
  data?: unknown;
  error?: { message: string } | null;
}) {
  const calls: RpcCall[] = [];
  return {
    calls,
    client: {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return handler(name, args);
      },
    },
  };
}

const companyRow = {
  company_id: "11111111-1111-1111-1111-111111111111",
  account_id: "22222222-2222-2222-2222-222222222222",
  name: "Acme",
  contact_person: null,
  phone: null,
  notes: null,
  created_by: "33333333-3333-3333-3333-333333333333",
  updated_by: "33333333-3333-3333-3333-333333333333",
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-02T00:00:00.000Z",
  active_projects_count: 1,
  completed_projects_count: 2,
};

describe("Companies RPC wrappers", () => {
  it("listCompanies calls list_companies only with exact args", async () => {
    const { client, calls } = mockClient(() => ({ data: [companyRow], error: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listCompanies(client as any, {
      search: "acme",
      limit: 10,
      offset: 5,
    });
    assert.equal(result.ok, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, "list_companies");
    assert.deepEqual(calls[0].args, {
      p_search: "acme",
      p_limit: 10,
      p_offset: 5,
    });
  });

  it("getCompany maps not found and access denied", async () => {
    const notFound = mockClient(() => ({
      data: null,
      error: { message: "company_not_found" },
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nf = await getCompany(notFound.client as any, companyRow.company_id);
    assert.equal(nf.ok, false);
    if (!nf.ok) assert.equal(nf.code, "company_not_found");

    const denied = mockClient(() => ({
      data: null,
      error: { message: "company_access_denied" },
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = await getCompany(denied.client as any, companyRow.company_id);
    assert.equal(d.ok, false);
    if (!d.ok) assert.equal(d.code, "company_access_denied");
  });

  it("createCompany uses create_company RPC args", async () => {
    const { client, calls } = mockClient(() => ({ data: [companyRow], error: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createCompany(client as any, {
      name: "Acme",
      contactPerson: null,
      phone: null,
      notes: null,
    });
    assert.equal(calls[0].name, "create_company");
    assert.deepEqual(calls[0].args, {
      p_name: "Acme",
      p_contact_person: null,
      p_phone: null,
      p_notes: null,
    });
  });

  it("updateCompany preserves corrected parameter mapping and does not swallow stale", async () => {
    const { client, calls } = mockClient(() => ({
      data: null,
      error: { message: "stale_company_version" },
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await updateCompany(client as any, {
      companyId: companyRow.company_id,
      name: "Acme",
      expectedUpdatedAt: "2026-07-02T00:00:00.000Z",
      contactPerson: null,
      phone: null,
      notes: null,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "stale_company_version");
    assert.equal(calls[0].name, "update_company");
    assert.deepEqual(Object.keys(calls[0].args), [
      "p_company_id",
      "p_name",
      "p_expected_updated_at",
      "p_contact_person",
      "p_phone",
      "p_notes",
    ]);
    assert.equal(
      calls[0].args.p_expected_updated_at,
      "2026-07-02T00:00:00.000Z"
    );
  });
});
