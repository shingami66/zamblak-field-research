import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const actionsPath = join(here, "actions.ts");

describe("Participation Assignment Server Actions", () => {
  const tsText = readFileSync(actionsPath, "utf8");

  it('exports only async functions (no objects/constants) in "use server" file', () => {
    assert.equal(tsText.includes('"use server"'), true);
    assert.equal(tsText.includes("export const EMPTY_ASSIGNMENT_WARNING_STATE"), false);
    assert.equal(tsText.includes("export type AssignmentWarningActionState"), false);
    
    // Check that we export async functions
    assert.equal(tsText.includes("export async function checkAssignmentWarningsAction"), true);
    assert.equal(tsText.includes("export async function createParticipationAction"), true);
  });

  it("checks warnings on final submission server-side", () => {
    assert.equal(tsText.includes("checkRespondentAssignmentWarnings"), true);
    assert.equal(tsText.includes("!warningsResult.ok"), true);
  });
});
