import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMPANIES_LIST_RPC_LIMIT,
  buildCompaniesListHref,
  deriveListPagination,
  parseCompaniesListSearchParams,
} from "./list-params";

describe("parseCompaniesListSearchParams", () => {
  it("handles absent values", () => {
    const r = parseCompaniesListSearchParams({});
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.page, 1);
      assert.equal(r.data.search, null);
      assert.equal(r.data.params.limit, COMPANIES_LIST_RPC_LIMIT);
      assert.equal(r.data.params.offset, 0);
    }
  });

  it("trims search", () => {
    const r = parseCompaniesListSearchParams({ q: "  acme  " });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.search, "acme");
  });

  it("treats invalid page as page 1", () => {
    const r = parseCompaniesListSearchParams({ page: "0" });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.page, 1);
      assert.equal(r.data.params.offset, 0);
    }
  });

  it("maps page 2 to offset 25", () => {
    const r = parseCompaniesListSearchParams({ page: "2" });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.page, 2);
      assert.equal(r.data.params.offset, 25);
    }
  });

  it("rejects overlong search", () => {
    const r = parseCompaniesListSearchParams({ q: "x".repeat(121) });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "invalid_pagination");
  });
});

describe("buildCompaniesListHref", () => {
  it("omits empty search and first page", () => {
    assert.equal(buildCompaniesListHref({}), "/companies");
    assert.equal(buildCompaniesListHref({ page: 1 }), "/companies");
  });

  it("retains search and later pages", () => {
    assert.equal(
      buildCompaniesListHref({ search: "acme", page: 2 }),
      "/companies?q=acme&page=2"
    );
  });
});

describe("deriveListPagination", () => {
  it("hides previous on first page", () => {
    const p = deriveListPagination({
      page: 1,
      pageSize: 25,
      returnedCount: 26,
      search: null,
    });
    assert.equal(p.hasPrevious, false);
    assert.equal(p.previousHref, null);
    assert.equal(p.hasNext, true);
    assert.equal(p.nextHref, "/companies?page=2");
  });

  it("retains search across pages", () => {
    const p = deriveListPagination({
      page: 2,
      pageSize: 25,
      returnedCount: 26,
      search: "acme",
    });
    assert.equal(p.previousHref, "/companies?q=acme");
    assert.equal(p.nextHref, "/companies?q=acme&page=3");
  });

  it("hides next when fewer than page size", () => {
    const p = deriveListPagination({
      page: 1,
      pageSize: 25,
      returnedCount: 3,
      search: null,
    });
    assert.equal(p.hasNext, false);
    assert.equal(p.nextHref, null);
  });

  it("hides next when returned count equals the visible page size", () => {
    const p = deriveListPagination({
      page: 3,
      pageSize: 25,
      returnedCount: 25,
      search: null,
    });
    assert.equal(p.hasNext, false);
    assert.equal(p.hasPrevious, true);
  });
});
