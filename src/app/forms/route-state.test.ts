import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPaginationUrl,
  getSingleSearchParam,
  normalizeFormIdParam,
  parseCodeParam,
  parseFormsListRouteFilters,
  parseIsoDateParam,
  parsePageParam,
  parsePageSizeParam,
  parseReviewStatusParam,
} from "./route-state";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

describe("Forms Route State Helpers (Slice B1)", () => {
  describe("Search Param Helpers", () => {
    it("handles single and array search parameters safely", () => {
      assert.equal(getSingleSearchParam(undefined), undefined);
      assert.equal(getSingleSearchParam("  test  "), "test");
      assert.equal(getSingleSearchParam(["  first  ", "second"]), "first");
      assert.equal(getSingleSearchParam(""), undefined);
    });

    it("parses page numbers with fail-safe defaults", () => {
      assert.equal(parsePageParam(undefined), 1);
      assert.equal(parsePageParam("2"), 2);
      assert.equal(parsePageParam("0"), 1);
      assert.equal(parsePageParam("-5"), 1);
      assert.equal(parsePageParam("1.5"), 1);
      assert.equal(parsePageParam("invalid"), 1);
    });

    it("parses page sizes restricting to allowed values [10, 20, 50, 100]", () => {
      assert.equal(parsePageSizeParam(undefined), 20);
      assert.equal(parsePageSizeParam("10"), 10);
      assert.equal(parsePageSizeParam("50"), 50);
      assert.equal(parsePageSizeParam("100"), 100);
      assert.equal(parsePageSizeParam("15"), 20);
      assert.equal(parsePageSizeParam("200"), 20);
    });

    it("normalizes review status filter", () => {
      assert.equal(parseReviewStatusParam("submitted"), "submitted");
      assert.equal(parseReviewStatusParam("accepted"), "accepted");
      assert.equal(parseReviewStatusParam("invalid"), undefined);
    });

    it("normalizes strict ISO dates and rejects invalid format", () => {
      assert.equal(parseIsoDateParam("2026-07-23"), "2026-07-23");
      assert.equal(parseIsoDateParam("2026-13-45"), undefined);
      assert.equal(parseIsoDateParam("invalid"), undefined);
    });

    it("trims and bounds code search input to 64 characters", () => {
      assert.equal(parseCodeParam("  RF-100  "), "RF-100");
      const longCode = "a".repeat(100);
      assert.equal(parseCodeParam(longCode)?.length, 64);
    });
  });

  describe("Route Filter Parsing & Date Range Validation", () => {
    it("parses valid route filters", () => {
      const result = parseFormsListRouteFilters({
        page: "2",
        pageSize: "50",
        reviewStatus: "accepted",
        submittedDateFrom: "2026-07-01",
        submittedDateTo: "2026-07-23",
        code: "RF-001",
      });

      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.filters.page, 2);
        assert.equal(result.filters.pageSize, 50);
        assert.equal(result.filters.reviewStatus, "accepted");
        assert.equal(result.filters.submittedDateFrom, "2026-07-01");
        assert.equal(result.filters.submittedDateTo, "2026-07-23");
        assert.equal(result.filters.code, "RF-001");
      }
    });

    it("rejects reversed date range (from > to)", () => {
      const result = parseFormsListRouteFilters({
        submittedDateFrom: "2026-08-01",
        submittedDateTo: "2026-07-01",
      });

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.code, "invalid_date_range");
      }
    });
  });

  describe("Pagination URL Builder", () => {
    it("builds pagination URL preserving active filters", () => {
      const url = buildPaginationUrl(
        "/forms",
        {
          code: "RF-001",
          reviewStatus: "accepted",
          submittedDateFrom: "2026-07-01",
          submittedDateTo: "2026-07-23",
          pageSize: 50,
        },
        3
      );

      assert.equal(
        url,
        "/forms?code=RF-001&reviewStatus=accepted&submittedDateFrom=2026-07-01&submittedDateTo=2026-07-23&pageSize=50&page=3"
      );
    });

    it("omits default page 1 and default pageSize 20 from URL query string", () => {
      const url = buildPaginationUrl(
        "/forms",
        {
          pageSize: 20,
        },
        1
      );

      assert.equal(url, "/forms");
    });
  });

  describe("Form ID Normalizer", () => {
    it("normalizes valid UUID and rejects invalid UUIDs", () => {
      assert.equal(normalizeFormIdParam(VALID_UUID), VALID_UUID);
      assert.equal(normalizeFormIdParam("invalid-uuid"), null);
      assert.equal(normalizeFormIdParam(undefined), null);
    });
  });
});
