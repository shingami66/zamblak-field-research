import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  createRespondent,
  getRespondent,
  listRespondents,
  updateRespondent,
} from "./rpc";

type RpcCall = { name: string; args: Record<string, unknown> };

function mockClient(handler: (name: string, args: Record<string, unknown>) => {
  data?: unknown;
  error?: { message?: string; details?: string; hint?: string } | null;
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

const listRow = {
  respondent_id: "11111111-1111-4111-8111-111111111111",
  name: "Ali",
  mobile: "966512345678",
  age: 30,
  nationality: "Saudi",
  resident_type: "saudi",
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-02T00:00:00.000Z",
};

const detailRow = {
  ...listRow,
  notes: "n",
};

describe("Respondent RPC wrappers", () => {
  it("listRespondents calls list_respondents with exact args", async () => {
    const { client, calls } = mockClient(() => ({
      data: [listRow],
      error: null,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listRespondents(client as any, {
      search: "ali",
      limit: 10,
      offset: 5,
    });
    assert.equal(result.ok, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, "list_respondents");
    assert.deepEqual(calls[0].args, {
      p_search: "ali",
      p_limit: 10,
      p_offset: 5,
    });
    if (result.ok) {
      assert.equal(result.data.respondents[0].respondentId, listRow.respondent_id);
    }
  });

  it("listRespondents validation failure causes zero RPC calls", async () => {
    const { client, calls } = mockClient(() => ({ data: [], error: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listRespondents(client as any, { limit: 0 });
    assert.equal(result.ok, false);
    assert.equal(calls.length, 0);
  });

  it("getRespondent maps success and not found", async () => {
    const ok = mockClient(() => ({ data: [detailRow], error: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const success = await getRespondent(ok.client as any, listRow.respondent_id);
    assert.equal(success.ok, true);
    assert.equal(ok.calls[0].name, "get_respondent");
    assert.deepEqual(ok.calls[0].args, {
      p_respondent_id: listRow.respondent_id,
    });

    const empty = mockClient(() => ({ data: [], error: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nf = await getRespondent(empty.client as any, listRow.respondent_id);
    assert.equal(nf.ok, false);
    if (!nf.ok) assert.equal(nf.code, "respondent_not_found");

    const badId = mockClient(() => ({ data: [], error: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad = await getRespondent(badId.client as any, "not-uuid");
    assert.equal(bad.ok, false);
    assert.equal(badId.calls.length, 0);
  });

  it("createRespondent uses create_respondent RPC args", async () => {
    const { client, calls } = mockClient(() => ({
      data: [detailRow],
      error: null,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createRespondent(client as any, {
      mobile: "0512345678",
      name: null,
      age: null,
      nationality: null,
      residentType: "unknown",
      notes: null,
    });
    assert.equal(result.ok, true);
    assert.equal(calls[0].name, "create_respondent");
    assert.deepEqual(calls[0].args, {
      p_mobile: "966512345678",
      p_name: null,
      p_age: null,
      p_nationality: null,
      p_resident_type: "unknown",
      p_notes: null,
    });
  });

  it("updateRespondent preserves concurrency mapping and normalizes errors", async () => {
    const { client, calls } = mockClient(() => ({
      data: null,
      error: { message: "stale_respondent_version" },
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await updateRespondent(client as any, {
      respondentId: listRow.respondent_id,
      expectedUpdatedAt: "2026-07-02T00:00:00.000Z",
      mobile: "966512345678",
      name: null,
      age: null,
      nationality: null,
      residentType: "unknown",
      notes: null,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "stale_respondent_version");
    assert.equal(calls[0].name, "update_respondent");
    assert.deepEqual(calls[0].args, {
      p_respondent_id: listRow.respondent_id,
      p_mobile: "966512345678",
      p_expected_updated_at: "2026-07-02T00:00:00.000Z",
      p_name: null,
      p_age: null,
      p_nationality: null,
      p_resident_type: "unknown",
      p_notes: null,
    });
  });

  it("maps malformed response to unexpected_respondent_error", async () => {
    const { client } = mockClient(() => ({
      data: [{ respondent_id: "bad" }],
      error: null,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listRespondents(client as any, {
      search: null,
      limit: 25,
      offset: 0,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "unexpected_respondent_error");
  });
});

describe("Respondent contract boundary invariants", () => {
  it("production modules forbid table access, service_role, and finance contamination", () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const productionFiles = [
      "types.ts",
      "input.ts",
      "map-row.ts",
      "errors.ts",
      "rpc.ts",
      "index.ts",
    ];
    const forbidden = [
      "service_role",
      '.from("respondents")',
      ".from('respondents')",
      "participation_pricing",
      "price_per_accepted_form",
      "amount_due",
      "amount_paid",
      "settlement",
      "payment",
      "three-month",
      "three_month",
      "normalize_respondent_mobile",
    ];

    for (const file of productionFiles) {
      const text = readFileSync(path.join(dir, file), "utf8");
      for (const token of forbidden) {
        // allow comments about never calling the internal helper only in rpc/input docs?
        if (
          token === "normalize_respondent_mobile" &&
          (file === "input.ts" || file === "rpc.ts" || file === "index.ts")
        ) {
          // production code must not call the SQL helper; string may appear only in comments
          const codeOnly = text
            .split("\n")
            .filter((line) => !line.trimStart().startsWith("//") && !line.includes("*"))
            .join("\n");
          assert.equal(
            codeOnly.includes(token),
            false,
            `${file} must not call ${token}`
          );
          continue;
        }
        assert.equal(
          text.includes(token),
          false,
          `${file} must not contain ${token}`
        );
      }
      // accountId as caller authority field must not appear on public types
      if (file === "types.ts") {
        assert.equal(text.includes("accountId"), false);
      }
    }
  });
});
