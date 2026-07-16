import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { companiesCreateCopy } from "./create-copy";
import {
  mapCreateCompanyErrorPresentation,
  readCreateCompanyFormValues,
} from "./create-form";

describe("readCreateCompanyFormValues", () => {
  it("reads string fields and defaults missing to empty string", () => {
    const fd = new FormData();
    fd.set("name", "  Acme  ");
    fd.set("contact_person", "Ali");
    fd.set("phone", "0512345678");
    fd.set("notes", "note");
    assert.deepEqual(readCreateCompanyFormValues(fd), {
      name: "  Acme  ",
      contactPerson: "Ali",
      phone: "0512345678",
      notes: "note",
    });
  });

  it("uses empty strings when fields are absent", () => {
    const fd = new FormData();
    assert.deepEqual(readCreateCompanyFormValues(fd), {
      name: "",
      contactPerson: "",
      phone: "",
      notes: "",
    });
  });
});

describe("mapCreateCompanyErrorPresentation", () => {
  const values = {
    name: "Acme",
    contactPerson: "Ali",
    phone: "05",
    notes: "n",
  };

  it("maps field errors for name/contact/phone/notes", () => {
    const name = mapCreateCompanyErrorPresentation(
      "invalid_company_name",
      values
    );
    assert.equal(name.status, "error");
    assert.equal(name.fieldErrors.name, companiesCreateCopy.errorInvalidName);
    assert.equal(name.formError, null);
    assert.deepEqual(name.values, values);

    assert.equal(
      mapCreateCompanyErrorPresentation("invalid_company_contact_person", values)
        .fieldErrors.contactPerson,
      companiesCreateCopy.errorInvalidContact
    );
    assert.equal(
      mapCreateCompanyErrorPresentation("invalid_company_phone", values)
        .fieldErrors.phone,
      companiesCreateCopy.errorInvalidPhone
    );
    assert.equal(
      mapCreateCompanyErrorPresentation("invalid_company_notes", values)
        .fieldErrors.notes,
      companiesCreateCopy.errorInvalidNotes
    );
  });

  it("maps duplicate name to form and name field", () => {
    const r = mapCreateCompanyErrorPresentation(
      "duplicate_company_name",
      values
    );
    assert.equal(r.formError, companiesCreateCopy.errorDuplicateName);
    assert.equal(r.fieldErrors.name, companiesCreateCopy.errorDuplicateName);
    assert.equal(r.code, "duplicate_company_name");
  });

  it("maps access denied and unexpected safely without SQL details", () => {
    const access = mapCreateCompanyErrorPresentation(
      "company_access_denied",
      values
    );
    assert.equal(access.formError, companiesCreateCopy.errorAccess);

    const unexpected = mapCreateCompanyErrorPresentation(
      "unexpected_company_error",
      values
    );
    assert.equal(unexpected.formError, companiesCreateCopy.errorUnexpected);
    assert.equal(unexpected.formError?.includes("SQLSTATE"), false);
    assert.equal(unexpected.formError?.includes("postgres"), false);
  });
});
