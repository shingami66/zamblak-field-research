import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectsDetailCopy } from "./detail-copy";
import {
  EMPTY_TRANSITION_PROJECT_STATE,
  isProjectStatusValue,
  mapTransitionProjectErrorPresentation,
  readTransitionFormFields,
  transitionOwnerDeniedState,
} from "./detail-transition";
import {
  buildTransitionProjectStatusRpcArgs,
  parseTransitionProjectStatusInput,
} from "./input";

const projectId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const expectedUpdatedAt = "2026-07-02T12:00:00.000Z";

describe("readTransitionFormFields", () => {
  it("reads project_id, expected_updated_at, and target_status", () => {
    const fd = new FormData();
    fd.set("project_id", projectId);
    fd.set("expected_updated_at", expectedUpdatedAt);
    fd.set("target_status", "active");
    assert.deepEqual(readTransitionFormFields(fd), {
      projectId,
      expectedUpdatedAt,
      targetStatus: "active",
    });
  });
});

describe("transition parse + RPC args", () => {
  it("requires expectedUpdatedAt and builds exact RPC args", () => {
    const parsed = parseTransitionProjectStatusInput({
      projectId,
      expectedUpdatedAt,
      targetStatus: "active",
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(buildTransitionProjectStatusRpcArgs(parsed.data), {
      p_project_id: projectId,
      p_expected_updated_at: expectedUpdatedAt,
      p_target_status: "active",
    });
  });

  it("rejects missing expectedUpdatedAt", () => {
    const parsed = parseTransitionProjectStatusInput({
      projectId,
      targetStatus: "active",
    });
    assert.equal(parsed.ok, false);
  });
});

describe("transition presentation", () => {
  it("owner denied and error mapping stay safe", () => {
    const denied = transitionOwnerDeniedState();
    assert.equal(denied.status, "error");
    assert.equal(denied.code, "project_access_denied");
    assert.equal(denied.formError, projectsDetailCopy.errorTransitionAccess);

    const stale = mapTransitionProjectErrorPresentation("stale_project_version");
    assert.equal(stale.formError, projectsDetailCopy.errorStale);
    assert.equal(stale.formError?.includes("SQLSTATE"), false);
  });

  it("idle state defaults", () => {
    assert.equal(EMPTY_TRANSITION_PROJECT_STATE.status, "idle");
    assert.equal(EMPTY_TRANSITION_PROJECT_STATE.formError, null);
  });
});

describe("isProjectStatusValue", () => {
  it("accepts only canonical statuses", () => {
    assert.equal(isProjectStatusValue("draft"), true);
    assert.equal(isProjectStatusValue("active"), true);
    assert.equal(isProjectStatusValue("open"), false);
  });
});
