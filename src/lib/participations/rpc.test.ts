import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapParticipationRpcError } from "./errors";
import { parseParticipationIds } from "./input";
import {
  checkRespondentAssignmentWarnings,
  createParticipation,
  listProjectParticipations,
} from "./rpc";

const projectId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const respondentId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const participationId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const timestamp = "2026-07-18T12:00:00.000Z";

function clientFor(data: unknown, error: unknown = null) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  return {
    calls,
    client: {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return { data, error };
      },
      from: () => {
        throw new Error("direct table access is forbidden");
      },
    },
  };
}

const warningRow = {
  three_month_warning: true,
  requires_three_month_flag: true,
  project_domain: "telecom",
  match_count: 1,
  eligibility_warning: true,
  eligibility_warning_codes: ["age_below_min"],
};

describe("Participation assignment RPC wrappers", () => {
  it("checks warnings with only project and respondent IDs", async () => {
    const { client, calls } = clientFor([warningRow]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await checkRespondentAssignmentWarnings(client as any, {
      projectId,
      respondentId,
    });
    assert.deepEqual(calls, [
      {
        name: "check_respondent_three_month_warning",
        args: { p_project_id: projectId, p_respondent_id: respondentId },
      },
    ]);
    assert.deepEqual(result, {
      ok: true,
      data: {
        threeMonthWarning: true,
        requiresThreeMonthFlag: true,
        projectDomain: "telecom",
        matchCount: 1,
        eligibilityWarning: true,
        eligibilityWarningCodes: ["age_below_min"],
      },
    });
  });

  it("creates only a neutral participation and rejects malformed rows", async () => {
    const { client, calls } = clientFor([
      {
        participation_id: participationId,
        project_id: projectId,
        respondent_id: respondentId,
        contact_status: "new",
        participation_decision_status: "unknown",
        consent_status: "unknown",
        whatsapp_status: "not_opened",
        form_status: "not_started",
        created_at: timestamp,
        updated_at: timestamp,
        ...warningRow,
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createParticipation(client as any, { projectId, respondentId });
    assert.equal(result.ok, true);
    assert.deepEqual(calls[0], {
      name: "create_participation",
      args: { p_project_id: projectId, p_respondent_id: respondentId },
    });
    if (result.ok) assert.equal(result.data.contactStatus, "new");
  });

  it("lists finance-blind operational fields and blocks unknown errors", async () => {
    const { client, calls } = clientFor([
      {
        participation_id: participationId,
        respondent_id: respondentId,
        respondent_name: "ليلى",
        respondent_mobile: "+966500000000",
        respondent_age: 35,
        respondent_resident_type: "saudi",
        contact_status: "new",
        participation_decision_status: "unknown",
        consent_status: "unknown",
        whatsapp_status: "not_opened",
        form_status: "not_started",
        created_at: timestamp,
        updated_at: timestamp,
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listProjectParticipations(client as any, {
      projectId,
      search: null,
      limit: 25,
      offset: 0,
    });
    assert.equal(result.ok, true);
    assert.deepEqual(calls[0], {
      name: "list_project_participations",
      args: { p_project_id: projectId, p_search: null, p_limit: 25, p_offset: 0 },
    });
    assert.equal(mapParticipationRpcError({ message: "database internals" }), "unexpected_participation_error");
    assert.deepEqual(parseParticipationIds({ projectId: "bad", respondentId }), {
      ok: false,
      code: "invalid_project_id",
    });
  });

  it("maps a duplicate assignment to a safe blocking code", async () => {
    const { client } = clientFor(null, { message: "duplicate_participation" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createParticipation(client as any, { projectId, respondentId });
    assert.deepEqual(result, { ok: false, code: "duplicate_participation" });
  });
});