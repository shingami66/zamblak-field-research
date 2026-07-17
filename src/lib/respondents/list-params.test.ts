import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RESPONDENTS_LIST_PAGE_SIZE,
  RESPONDENTS_LIST_RPC_LIMIT,
  buildRespondentsListHref,
  deriveRespondentsListPagination,
  parseRespondentsListSearchParams,
} from "./list-params";

describe("parseRespondentsListSearchParams", () => {
  it("defaults to q=null and page=1 with RPC limit 26", () => {
    const r = parseRespondentsListSearchParams({});
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.page, 1);
      assert.equal(r.data.search, null);
      assert.equal(r.data.params.limit, RESPONDENTS_LIST_RPC_LIMIT);
      assert.equal(r.data.params.offset, 0);
      assert.equal(RESPONDENTS_LIST_RPC_LIMIT, 26);
      assert.equal(RESPONDENTS_LIST_PAGE_SIZE, 25);
    }
  });

  it("trims q and treats empty as null", () => {
    const empty = parseRespondentsListSearchParams({ q: "   " });
    assert.equal(empty.ok, true);
    if (empty.ok) assert.equal(empty.data.search, null);

    const ok = parseRespondentsListSearchParams({ q: "  علي " });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.data.search, "علي");
  });

  it("accepts Arabic and mobile-like search", () => {
    const ar = parseRespondentsListSearchParams({ q: "أحمد" });
    assert.equal(ar.ok, true);
    if (ar.ok) assert.equal(ar.data.search, "أحمد");

    const mobile = parseRespondentsListSearchParams({ q: "0512345678" });
    assert.equal(mobile.ok, true);
    if (mobile.ok) assert.equal(mobile.data.search, "0512345678");
  });

  it("rejects q over max length", () => {
    const r = parseRespondentsListSearchParams({ q: "x".repeat(121) });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "invalid_pagination");
  });

  it("rejects array q and page", () => {
    assert.equal(
      parseRespondentsListSearchParams({ q: ["a", "b"] }).ok,
      false
    );
    assert.equal(
      parseRespondentsListSearchParams({ page: ["1", "2"] }).ok,
      false
    );
  });

  it("rejects invalid page values", () => {
    for (const page of ["0", "-1", "1.5", "+2", " 2", "2 ", "abc", "9007199254740993"]) {
      const r = parseRespondentsListSearchParams({ page });
      assert.equal(r.ok, false, page);
      if (!r.ok) assert.equal(r.code, "invalid_pagination", page);
    }
  });

  it("maps page 2 to offset 25", () => {
    const r = parseRespondentsListSearchParams({ page: "2" });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.page, 2);
      assert.equal(r.data.params.offset, 25);
      assert.equal(r.data.params.limit, 26);
    }
  });

  it("rejects offset overflow beyond PostgreSQL integer range", () => {
    // (page-1)*25 > 2147483647
    const hugePage = String(Math.floor(2_147_483_647 / 25) + 3);
    const r = parseRespondentsListSearchParams({ page: hugePage });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "invalid_pagination");
  });
});

describe("buildRespondentsListHref", () => {
  it("builds default URL", () => {
    assert.equal(buildRespondentsListHref({}), "/respondents");
    assert.equal(buildRespondentsListHref({ page: 1 }), "/respondents");
  });

  it("encodes q and keeps later pages", () => {
    assert.equal(
      buildRespondentsListHref({ search: "علي", page: 2 }),
      "/respondents?q=%D8%B9%D9%84%D9%8A&page=2"
    );
  });

  it("reset removes all search state", () => {
    assert.equal(buildRespondentsListHref({ search: null, page: 1 }), "/respondents");
  });
});

describe("deriveRespondentsListPagination", () => {
  it("uses sentinel: 26 returned means hasNext; visible count 25", () => {
    const p = deriveRespondentsListPagination({
      page: 1,
      returnedCount: 26,
      search: null,
    });
    assert.equal(p.hasNext, true);
    assert.equal(p.hasPrevious, false);
    assert.equal(p.visibleCount, 25);
    assert.equal(p.nextHref, "/respondents?page=2");
    assert.equal(p.previousHref, null);
  });

  it("fewer than 26 means no next", () => {
    const p = deriveRespondentsListPagination({
      page: 1,
      returnedCount: 25,
      search: null,
    });
    assert.equal(p.hasNext, false);
    assert.equal(p.visibleCount, 25);
  });

  it("preserves q on previous/next", () => {
    const p = deriveRespondentsListPagination({
      page: 2,
      returnedCount: 26,
      search: "ali",
    });
    assert.equal(p.hasPrevious, true);
    assert.equal(p.previousHref, "/respondents?q=ali");
    assert.equal(p.nextHref, "/respondents?q=ali&page=3");
  });
});
