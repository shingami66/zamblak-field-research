import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveRespondentsEmptyState,
  formatRespondentTimestamp,
  residentTypeLabel,
  respondentsListErrorMessage,
  toRespondentListItemView,
} from "./list-view-model";
import type { RespondentListItem } from "./types";

const item: RespondentListItem = {
  respondentId: "11111111-1111-4111-8111-111111111111",
  name: "علي",
  mobile: "966512345678",
  age: 30,
  nationality: "سعودي",
  residentType: "saudi",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-02T15:30:00.000Z",
};

describe("toRespondentListItemView", () => {
  it("maps complete row", () => {
    const v = toRespondentListItemView(item);
    assert.equal(v.respondentId, item.respondentId);
    assert.equal(v.nameLabel, "علي");
    assert.equal(v.mobileLabel, "966512345678");
    assert.equal(v.ageLabel, "30");
    assert.equal(v.nationalityLabel, "سعودي");
    assert.equal(v.residentTypeLabel, "سعودي");
    assert.equal(v.detailHref, `/respondents/${item.respondentId}`);
    assert.equal(Object.prototype.hasOwnProperty.call(v, "accountId"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(v, "notes"), false);
    assert.equal(
      Object.prototype.hasOwnProperty.call(v, "normalizedMobile"),
      false
    );
  });

  it("applies nullable fallbacks", () => {
    const v = toRespondentListItemView({
      ...item,
      name: null,
      age: null,
      nationality: null,
    });
    assert.equal(v.nameLabel, "بدون اسم");
    assert.equal(v.ageLabel, "غير محدد");
    assert.equal(v.nationalityLabel, "غير محددة");
  });

  it("maps resident type labels exactly", () => {
    assert.equal(residentTypeLabel("saudi"), "سعودي");
    assert.equal(residentTypeLabel("non_saudi"), "غير سعودي");
    assert.equal(residentTypeLabel("unknown"), "غير محدد");
  });

  it("formats timestamps via repository precedent", () => {
    const label = formatRespondentTimestamp("2026-07-02T15:30:00.000Z");
    assert.notEqual(label, "غير محدد");
    assert.equal(formatRespondentTimestamp("not-a-date"), "غير محدد");
  });
});

describe("deriveRespondentsEmptyState", () => {
  it("page 1, no search → empty_registry", () => {
    assert.equal(
      deriveRespondentsEmptyState({ page: 1, hasSearch: false }),
      "empty_registry"
    );
  });

  it("page 1, active search → filtered_empty", () => {
    assert.equal(
      deriveRespondentsEmptyState({ page: 1, hasSearch: true }),
      "filtered_empty"
    );
  });

  it("page 2, no search → page_beyond", () => {
    assert.equal(
      deriveRespondentsEmptyState({ page: 2, hasSearch: false }),
      "page_beyond"
    );
  });

  it("page 2, active search → page_beyond (wins over filtered_empty)", () => {
    assert.equal(
      deriveRespondentsEmptyState({ page: 2, hasSearch: true }),
      "page_beyond"
    );
  });

  it("higher page with active search → page_beyond", () => {
    assert.equal(
      deriveRespondentsEmptyState({ page: 5, hasSearch: true }),
      "page_beyond"
    );
  });
});

describe("respondentsListErrorMessage", () => {
  it("maps list-relevant codes and unknown fallback", () => {
    assert.match(
      respondentsListErrorMessage("respondent_access_denied"),
      /صلاحية|تسجيل/
    );
    assert.match(
      respondentsListErrorMessage("invalid_pagination"),
      /تصفح|الصفحة/
    );
    assert.match(
      respondentsListErrorMessage("unexpected_respondent_error"),
      /تعذّر|لاحقاً/
    );
    assert.match(
      respondentsListErrorMessage("duplicate_respondent_mobile"),
      /تعذّر|لاحقاً/
    );
    assert.equal(
      respondentsListErrorMessage("invalid_pagination").includes(
        "invalid_pagination"
      ),
      false
    );
  });
});
