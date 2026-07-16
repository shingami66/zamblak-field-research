import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAllowedProjectTransitions,
  isAllowedProjectStatusTransition,
} from "./lifecycle";
import type { ProjectStatus } from "./types";

describe("project lifecycle helper", () => {
  it("allows the four approved edges", () => {
    assert.equal(isAllowedProjectStatusTransition("draft", "active"), true);
    assert.equal(isAllowedProjectStatusTransition("draft", "cancelled"), true);
    assert.equal(isAllowedProjectStatusTransition("active", "closed"), true);
    assert.equal(
      isAllowedProjectStatusTransition("active", "cancelled"),
      true
    );
  });

  it("terminal states have no outgoing transitions", () => {
    assert.deepEqual(getAllowedProjectTransitions("closed"), []);
    assert.deepEqual(getAllowedProjectTransitions("cancelled"), []);
  });

  it("rejects same-status and reopening", () => {
    const statuses: ProjectStatus[] = [
      "draft",
      "active",
      "closed",
      "cancelled",
    ];
    for (const s of statuses) {
      assert.equal(isAllowedProjectStatusTransition(s, s), false);
    }
    assert.equal(isAllowedProjectStatusTransition("closed", "active"), false);
    assert.equal(isAllowedProjectStatusTransition("closed", "draft"), false);
    assert.equal(
      isAllowedProjectStatusTransition("cancelled", "draft"),
      false
    );
    assert.equal(
      isAllowedProjectStatusTransition("cancelled", "active"),
      false
    );
    assert.equal(isAllowedProjectStatusTransition("active", "draft"), false);
    assert.equal(isAllowedProjectStatusTransition("draft", "closed"), false);
  });
});
