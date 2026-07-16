"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateCompanyAction } from "@/app/companies/[id]/edit/actions";
import { companiesEditCopy } from "@/lib/companies/edit-copy";
import type { EditCompanyActionState } from "@/lib/companies/edit-form";
import {
  COMPANY_CONTACT_MAX_LENGTH,
  COMPANY_NAME_MAX_LENGTH,
  COMPANY_NOTES_MAX_LENGTH,
} from "@/lib/companies/input";
import styles from "@/app/companies/new/create-company.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={styles.submit}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? companiesEditCopy.saving : companiesEditCopy.save}
    </button>
  );
}

type EditCompanyFormProps = {
  initialState: EditCompanyActionState;
};

export function EditCompanyForm({ initialState }: EditCompanyFormProps) {
  const [state, formAction] = useActionState(
    updateCompanyAction,
    initialState
  );

  const values = state.values;
  const fieldErrors = state.fieldErrors;
  const hasFormError = Boolean(state.formError);
  const detailHref = `/companies/${values.companyId}`;
  const editHref = `/companies/${values.companyId}/edit`;

  return (
    <form
      action={formAction}
      className={styles.form}
      noValidate
      aria-describedby={hasFormError ? "edit-company-form-error" : undefined}
    >
      <input type="hidden" name="company_id" value={values.companyId} />
      <input
        type="hidden"
        name="expected_updated_at"
        value={values.expectedUpdatedAt}
      />

      {state.formError ? (
        <div
          id="edit-company-form-error"
          role="alert"
          aria-atomic="true"
          className={styles.formError}
        >
          <strong className={styles.formErrorTitle}>
            {companiesEditCopy.formErrorHeading}
          </strong>
          <p className={styles.formErrorText}>{state.formError}</p>
          {state.showReload ? (
            <p className={styles.formErrorText}>
              <Link href={editHref} className={styles.cancel}>
                {companiesEditCopy.reloadCompany}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="edit-company-name" className={styles.label}>
          {companiesEditCopy.nameLabel}
          <span className={styles.required}>
            {" "}
            ({companiesEditCopy.nameRequired})
          </span>
        </label>
        <p id="edit-company-name-hint" className={styles.hint}>
          {companiesEditCopy.nameHint}
        </p>
        <input
          id="edit-company-name"
          name="name"
          type="text"
          required
          maxLength={COMPANY_NAME_MAX_LENGTH}
          defaultValue={values.name}
          autoComplete="organization"
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={
            fieldErrors.name
              ? "edit-company-name-hint edit-company-name-error"
              : "edit-company-name-hint"
          }
          className={styles.input}
        />
        {fieldErrors.name ? (
          <p
            id="edit-company-name-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="edit-company-contact" className={styles.label}>
          {companiesEditCopy.contactLabel}
        </label>
        <p id="edit-company-contact-hint" className={styles.hint}>
          {companiesEditCopy.contactHint}
        </p>
        <input
          id="edit-company-contact"
          name="contact_person"
          type="text"
          maxLength={COMPANY_CONTACT_MAX_LENGTH}
          defaultValue={values.contactPerson}
          autoComplete="name"
          aria-invalid={fieldErrors.contactPerson ? true : undefined}
          aria-describedby={
            fieldErrors.contactPerson
              ? "edit-company-contact-hint edit-company-contact-error"
              : "edit-company-contact-hint"
          }
          className={styles.input}
        />
        {fieldErrors.contactPerson ? (
          <p
            id="edit-company-contact-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.contactPerson}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="edit-company-phone" className={styles.label}>
          {companiesEditCopy.phoneLabel}
        </label>
        <p id="edit-company-phone-hint" className={styles.hint}>
          {companiesEditCopy.phoneHint}
        </p>
        <input
          id="edit-company-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={values.phone}
          autoComplete="tel"
          dir="ltr"
          aria-invalid={fieldErrors.phone ? true : undefined}
          aria-describedby={
            fieldErrors.phone
              ? "edit-company-phone-hint edit-company-phone-error"
              : "edit-company-phone-hint"
          }
          className={`${styles.input} ${styles.inputLtr}`}
        />
        {fieldErrors.phone ? (
          <p
            id="edit-company-phone-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.phone}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="edit-company-notes" className={styles.label}>
          {companiesEditCopy.notesLabel}
        </label>
        <p id="edit-company-notes-hint" className={styles.hint}>
          {companiesEditCopy.notesHint}
        </p>
        <textarea
          id="edit-company-notes"
          name="notes"
          maxLength={COMPANY_NOTES_MAX_LENGTH}
          defaultValue={values.notes}
          rows={5}
          aria-invalid={fieldErrors.notes ? true : undefined}
          aria-describedby={
            fieldErrors.notes
              ? "edit-company-notes-hint edit-company-notes-error"
              : "edit-company-notes-hint"
          }
          className={styles.textarea}
        />
        {fieldErrors.notes ? (
          <p
            id="edit-company-notes-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.notes}
          </p>
        ) : null}
      </div>

      <div className={styles.actions}>
        <SubmitButton />
        <Link href={detailHref} className={styles.cancel}>
          {companiesEditCopy.cancel}
        </Link>
      </div>
    </form>
  );
}
