import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { respondentsDetailCopy } from "./detail-copy";
import {
  respondentDetailErrorBehavior,
  respondentDetailResidentLabel,
  toRespondentDetailView,
} from "./detail-view-model";
import type { RespondentDetail, RespondentErrorCode } from "./types";

const base: RespondentDetail = {
  respondentId: "11111111-1111-4111-8111-111111111111",
  name: "علي",
  mobile: "966512345678",
  age: 30,
  nationality: "سعودي",
  residentType: "saudi",
  notes: "ملاحظة ميدانية",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-02T15:30:00.000Z",
};

describe("toRespondentDetailView", () => {
  it("maps a complete RespondentDetail", () => {
    const v = toRespondentDetailView(base);
    assert.equal(v.respondentId, base.respondentId);
    assert.equal(v.nameLabel, "علي");
    assert.equal(v.mobileLabel, "966512345678");
    assert.equal(v.ageLabel, "30");
    assert.equal(v.nationalityLabel, "سعودي");
    assert.equal(v.residentTypeLabel, "سعودي");
    assert.equal(v.notesLabel, "ملاحظة ميدانية");
    assert.equal(v.notesIsEmpty, false);
    assert.notEqual(v.createdAtLabel, respondentsDetailCopy.notSpecified);
    assert.notEqual(v.updatedAtLabel, respondentsDetailCopy.notSpecified);
    assert.equal(v.backHref, "/respondents");
    assert.equal(v.editHref, `/respondents/${base.respondentId}/edit`);
  });

  it("applies null/blank fallbacks for name, age, nationality, notes", () => {
    const v = toRespondentDetailView({
      ...base,
      name: null,
      age: null,
      nationality: null,
      notes: null,
    });
    assert.equal(v.nameLabel, respondentsDetailCopy.unnamed);
    assert.equal(v.ageLabel, respondentsDetailCopy.notSpecified);
    assert.equal(v.nationalityLabel, respondentsDetailCopy.notSpecifiedFeminine);
    assert.equal(v.notesLabel, respondentsDetailCopy.emptyNotes);
    assert.equal(v.notesIsEmpty, true);

    const blank = toRespondentDetailView({
      ...base,
      name: "   ",
      nationality: "  ",
      notes: "\t",
    });
    assert.equal(blank.nameLabel, respondentsDetailCopy.unnamed);
    assert.equal(
      blank.nationalityLabel,
      respondentsDetailCopy.notSpecifiedFeminine
    );
    assert.equal(blank.notesLabel, respondentsDetailCopy.emptyNotes);
    assert.equal(blank.notesIsEmpty, true);
  });

  it("maps all three resident labels", () => {
    assert.equal(respondentDetailResidentLabel("saudi"), "سعودي");
    assert.equal(respondentDetailResidentLabel("non_saudi"), "غير سعودي");
    assert.equal(respondentDetailResidentLabel("unknown"), "غير محدد");
    assert.equal(
      toRespondentDetailView({ ...base, residentType: "non_saudi" })
        .residentTypeLabel,
      "غير سعودي"
    );
    assert.equal(
      toRespondentDetailView({ ...base, residentType: "unknown" })
        .residentTypeLabel,
      "غير محدد"
    );
  });

  it("falls back for malformed timestamps", () => {
    const v = toRespondentDetailView({
      ...base,
      createdAt: "not-a-date",
      updatedAt: "also-bad",
    });
    assert.equal(v.createdAtLabel, respondentsDetailCopy.notSpecified);
    assert.equal(v.updatedAtLabel, respondentsDetailCopy.notSpecified);
  });

  it("preserves mobile for display and keeps it out of hrefs", () => {
    const v = toRespondentDetailView(base);
    assert.equal(v.mobileLabel, base.mobile);
    assert.equal(v.backHref.includes(base.mobile), false);
    assert.equal(v.editHref.includes(base.mobile), false);
    assert.equal(v.editHref.includes("966"), false);
  });

  it("does not introduce internal fields", () => {
    const v = toRespondentDetailView(base);
    const keys = Object.keys(v);
    for (const forbidden of [
      "accountId",
      "normalizedMobile",
      "createdBy",
      "updatedBy",
      "deletedAt",
      "profileId",
    ]) {
      assert.equal(keys.includes(forbidden), false);
    }
  });
});

describe("respondentDetailErrorBehavior", () => {
  it("maps respondent_not_found to not_found distinctly", () => {
    const r = respondentDetailErrorBehavior("respondent_not_found");
    assert.equal(r.kind, "not_found");
    assert.equal(r.message, undefined);
  });

  it("maps access denied to safe Arabic message", () => {
    const r = respondentDetailErrorBehavior("respondent_access_denied");
    assert.equal(r.kind, "message");
    assert.equal(r.message, respondentsDetailCopy.errorAccess);
    assert.equal(r.message?.includes("respondent_access_denied"), false);
    assert.equal(r.message?.includes("SQLSTATE"), false);
  });

  it("maps unexpected and irrelevant codes to safe unexpected fallback", () => {
    const codes: RespondentErrorCode[] = [
      "unexpected_respondent_error",
      "invalid_pagination",
      "invalid_respondent_mobile",
      "duplicate_respondent_mobile",
      "stale_respondent_version",
      "invalid_respondent_name",
      "invalid_respondent_age",
      "invalid_respondent_nationality",
      "invalid_respondent_resident_type",
      "invalid_respondent_notes",
    ];
    for (const code of codes) {
      const r = respondentDetailErrorBehavior(code);
      assert.equal(r.kind, "message", code);
      assert.equal(r.message, respondentsDetailCopy.errorUnexpected, code);
      assert.equal(r.message?.includes(code), false, code);
      assert.equal(r.message?.includes("postgres"), false, code);
      assert.equal(r.message?.includes("constraint"), false, code);
    }
  });
});
