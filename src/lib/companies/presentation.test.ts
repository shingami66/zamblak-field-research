import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  companyPhoneDisplayText,
  companyPhonePresentation,
} from "./presentation";

describe("companyPhonePresentation", () => {
  it("declares LTR isolation and right alignment for Arabic forms", () => {
    assert.equal(companyPhonePresentation.dir, "ltr");
    assert.equal(companyPhonePresentation.textAlign, "right");
    assert.equal(companyPhonePresentation.unicodeBidi, "isolate");
  });
});

describe("companyPhoneDisplayText", () => {
  it("preserves exact digit order and never inserts spaces", () => {
    const stored = "966512345678";
    const result = companyPhoneDisplayText(stored, "—");
    assert.equal(result.isLtr, true);
    assert.equal(result.text, stored);
    assert.equal(result.text.includes(" "), false);
    assert.equal(result.text, "966512345678");
  });

  it("uses empty fallback when phone is null or blank", () => {
    assert.deepEqual(companyPhoneDisplayText(null, "غير متوفر"), {
      text: "غير متوفر",
      isLtr: false,
    });
    assert.deepEqual(companyPhoneDisplayText("   ", "غير متوفر"), {
      text: "غير متوفر",
      isLtr: false,
    });
  });
});
