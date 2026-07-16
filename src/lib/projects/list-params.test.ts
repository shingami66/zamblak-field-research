import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROJECTS_LIST_PAGE_SIZE,
  buildProjectsListHref,
  deriveProjectsListPagination,
  parseProjectsListSearchParams,
} from "./list-params";

const companyId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("parseProjectsListSearchParams", () => {
  it("handles absent values", () => {
    const r = parseProjectsListSearchParams({});
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.page, 1);
      assert.equal(r.data.search, null);
      assert.equal(r.data.companyId, null);
      assert.equal(r.data.status, null);
      assert.equal(r.data.params.limit, PROJECTS_LIST_PAGE_SIZE);
      assert.equal(r.data.params.offset, 0);
    }
  });

  it("trims search and treats empty as null", () => {
    const r = parseProjectsListSearchParams({ q: "  field  " });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.search, "field");

    const empty = parseProjectsListSearchParams({ q: "   " });
    assert.equal(empty.ok, true);
    if (empty.ok) assert.equal(empty.data.search, null);
  });

  it("rejects search over 120", () => {
    const r = parseProjectsListSearchParams({ q: "x".repeat(121) });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "invalid_project_text_length");
  });

  it("accepts valid status and rejects invalid", () => {
    const ok = parseProjectsListSearchParams({ status: "draft" });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.data.status, "draft");

    const bad = parseProjectsListSearchParams({ status: "open" });
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.equal(bad.code, "invalid_project_status");
  });

  it("accepts valid company UUID and rejects invalid", () => {
    const ok = parseProjectsListSearchParams({ company: companyId });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.data.companyId, companyId);

    const bad = parseProjectsListSearchParams({ company: "not-uuid" });
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.equal(bad.code, "invalid_company_id");
  });

  it("normalizes invalid page to 1 and maps page 2 to offset 25", () => {
    const invalid = parseProjectsListSearchParams({ page: "0" });
    assert.equal(invalid.ok, true);
    if (invalid.ok) {
      assert.equal(invalid.data.page, 1);
      assert.equal(invalid.data.params.offset, 0);
    }

    const page2 = parseProjectsListSearchParams({ page: "2" });
    assert.equal(page2.ok, true);
    if (page2.ok) {
      assert.equal(page2.data.page, 2);
      assert.equal(page2.data.params.offset, 25);
      assert.ok(page2.data.params.limit <= 50);
    }
  });
});

describe("buildProjectsListHref", () => {
  it("omits empty filters and first page", () => {
    assert.equal(buildProjectsListHref({}), "/projects");
    assert.equal(buildProjectsListHref({ page: 1 }), "/projects");
  });

  it("retains filters and later pages", () => {
    assert.equal(
      buildProjectsListHref({
        search: "acme",
        companyId,
        status: "active",
        page: 2,
      }),
      `/projects?q=acme&company=${companyId}&status=active&page=2`
    );
  });
});

describe("deriveProjectsListPagination", () => {
  it("hides previous on first page and preserves filters", () => {
    const p = deriveProjectsListPagination({
      page: 1,
      pageSize: 25,
      returnedCount: 25,
      search: "acme",
      companyId,
      status: "draft",
    });
    assert.equal(p.hasPrevious, false);
    assert.equal(p.previousHref, null);
    assert.equal(p.hasNext, true);
    assert.equal(
      p.nextHref,
      `/projects?q=acme&company=${companyId}&status=draft&page=2`
    );
  });

  it("hides next when fewer than page size", () => {
    const p = deriveProjectsListPagination({
      page: 1,
      pageSize: 25,
      returnedCount: 3,
      search: null,
      companyId: null,
      status: null,
    });
    assert.equal(p.hasNext, false);
    assert.equal(p.nextHref, null);
  });

  it("previous retains filters", () => {
    const p = deriveProjectsListPagination({
      page: 2,
      pageSize: 25,
      returnedCount: 25,
      search: "x",
      companyId: null,
      status: "closed",
    });
    assert.equal(p.previousHref, "/projects?q=x&status=closed");
    assert.equal(p.nextHref, "/projects?q=x&status=closed&page=3");
  });
});
