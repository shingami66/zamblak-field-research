import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createProject,
  getProject,
  listProjects,
  transitionProjectStatus,
  updateProject,
} from "./rpc";

type RpcCall = { name: string; args: Record<string, unknown> };

function mockClient(
  handler: (
    name: string,
    args: Record<string, unknown>
  ) => {
    data?: unknown;
    error?: { message: string } | null;
  }
) {
  const calls: RpcCall[] = [];
  return {
    calls,
    client: {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return handler(name, args);
      },
      from: () => {
        throw new Error("direct table access is forbidden");
      },
    },
  };
}

const listRow = {
  project_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  project_name: "Survey A",
  company_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  company_name: "Acme Co",
  domain: "telecom",
  status: "draft",
  start_date: null,
  end_date: null,
  quota: null,
  updated_at: "2026-07-02T00:00:00.000Z",
};

const detailRow = {
  ...listRow,
  min_age: null,
  max_age: null,
  required_resident_type: "any",
  eligibility_notes: null,
  requires_three_month_warning: true,
  whatsapp_template_ar: null,
  whatsapp_template_en: null,
  notes: null,
  created_at: "2026-07-01T00:00:00.000Z",
};

const writeInput = {
  name: "Survey A",
  companyId: listRow.company_id,
  domain: "telecom" as const,
  startDate: null,
  endDate: null,
  quota: null,
  minAge: null,
  maxAge: null,
  requiredResidentType: "any" as const,
  eligibilityNotes: null,
  requiresThreeMonthWarning: true,
  whatsappTemplateAr: null,
  whatsappTemplateEn: null,
  notes: null,
};

describe("Projects RPC wrappers", () => {
  it("listProjects calls list_projects only with exact args", async () => {
    const { client, calls } = mockClient(() => ({
      data: [listRow],
      error: null,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listProjects(client as any, {
      search: "acme",
      companyId: listRow.company_id,
      status: "draft",
      limit: 10,
      offset: 5,
    });
    assert.equal(result.ok, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, "list_projects");
    assert.deepEqual(calls[0].args, {
      p_search: "acme",
      p_company_id: listRow.company_id,
      p_status: "draft",
      p_limit: 10,
      p_offset: 5,
    });
    if (result.ok) {
      assert.equal(result.data.projects[0].projectId, listRow.project_id);
    }
  });

  it("getProject maps not found and access denied", async () => {
    const notFound = mockClient(() => ({
      data: null,
      error: { message: "project_not_found" },
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nf = await getProject(notFound.client as any, listRow.project_id);
    assert.equal(nf.ok, false);
    if (!nf.ok) assert.equal(nf.code, "project_not_found");

    const denied = mockClient(() => ({
      data: null,
      error: { message: "project_access_denied" },
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = await getProject(denied.client as any, listRow.project_id);
    assert.equal(d.ok, false);
    if (!d.ok) assert.equal(d.code, "project_access_denied");

    assert.equal(notFound.calls[0].name, "get_project");
    assert.deepEqual(notFound.calls[0].args, {
      p_project_id: listRow.project_id,
    });
  });

  it("createProject uses create_project RPC args without status/account/audit", async () => {
    const { client, calls } = mockClient(() => ({
      data: [detailRow],
      error: null,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createProject(client as any, writeInput);
    assert.equal(calls[0].name, "create_project");
    assert.equal(
      Object.prototype.hasOwnProperty.call(calls[0].args, "p_status"),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(calls[0].args, "p_account_id"),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(calls[0].args, "p_created_by"),
      false
    );
    assert.equal(calls[0].args.p_name, "Survey A");
    assert.equal(calls[0].args.p_company_id, listRow.company_id);
  });

  it("updateProject preserves expected timestamp and excludes status", async () => {
    const { client, calls } = mockClient(() => ({
      data: null,
      error: { message: "stale_project_version" },
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await updateProject(client as any, {
      projectId: listRow.project_id,
      expectedUpdatedAt: "2026-07-02T00:00:00.000Z",
      ...writeInput,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "stale_project_version");
    assert.equal(calls[0].name, "update_project");
    assert.equal(
      calls[0].args.p_expected_updated_at,
      "2026-07-02T00:00:00.000Z"
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(calls[0].args, "p_status"),
      false
    );
  });

  it("transitionProjectStatus uses expected timestamp and target status", async () => {
    const { client, calls } = mockClient(() => ({
      data: [{ ...detailRow, status: "active" }],
      error: null,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await transitionProjectStatus(client as any, {
      projectId: listRow.project_id,
      expectedUpdatedAt: "2026-07-02T00:00:00.000Z",
      targetStatus: "active",
    });
    assert.equal(result.ok, true);
    assert.equal(calls[0].name, "transition_project_status");
    assert.deepEqual(calls[0].args, {
      p_project_id: listRow.project_id,
      p_expected_updated_at: "2026-07-02T00:00:00.000Z",
      p_target_status: "active",
    });
  });

  it("does not expose service-role or table APIs on the contract path", async () => {
    const { client } = mockClient(() => ({ data: [listRow], error: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await listProjects(client as any, {
      search: null,
      companyId: null,
      status: null,
      limit: 25,
      offset: 0,
    });
    assert.equal(
      Object.prototype.hasOwnProperty.call(client, "service_role"),
      false
    );
    assert.throws(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).from("projects");
    }, /direct table access is forbidden/);
  });
});
