"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createCompanyAction } from "@/app/companies/new/actions";
import { companiesCreateCopy } from "@/lib/companies/create-copy";
import {
  EMPTY_CREATE_COMPANY_STATE,
  type CreateCompanyActionState,
} from "@/lib/companies/create-form";
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
      {pending ? companiesCreateCopy.submitting : companiesCreateCopy.submit}
    </button>
  );
}

type CreateCompanyFormProps = {
  initialState?: CreateCompanyActionState;
};

export function CreateCompanyForm({
  initialState = EMPTY_CREATE_COMPANY_STATE,
}: CreateCompanyFormProps) {
  const [state, formAction] = useActionState(
    createCompanyAction,
    initialState
  );

  const values = state.values;
  const fieldErrors = state.fieldErrors;
  const hasFormError = Boolean(state.formError);

  return (
    <form
      action={formAction}
      className={styles.form}
      noValidate
      aria-describedby={hasFormError ? "create-company-form-error" : undefined}
    >
      {state.formError ? (
        <div
          id="create-company-form-error"
          role="alert"
          aria-atomic="true"
          className={styles.formError}
        >
          <strong className={styles.formErrorTitle}>
            {companiesCreateCopy.formErrorHeading}
          </strong>
          <p className={styles.formErrorText}>{state.formError}</p>
        </div>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="company-name" className={styles.label}>
          {companiesCreateCopy.nameLabel}
          <span className={styles.required}>
            {" "}
            ({companiesCreateCopy.nameRequired})
          </span>
        </label>
        <p id="company-name-hint" className={styles.hint}>
          {companiesCreateCopy.nameHint}
        </p>
        <input
          id="company-name"
          name="name"
          type="text"
          required
          maxLength={COMPANY_NAME_MAX_LENGTH}
          defaultValue={values.name}
          autoComplete="organization"
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={
            fieldErrors.name
              ? "company-name-hint company-name-error"
              : "company-name-hint"
          }
          className={styles.input}
        />
        {fieldErrors.name ? (
          <p id="company-name-error" className={styles.fieldError} role="alert">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="company-contact" className={styles.label}>
          {companiesCreateCopy.contactLabel}
        </label>
        <p id="company-contact-hint" className={styles.hint}>
          {companiesCreateCopy.contactHint}
        </p>
        <input
          id="company-contact"
          name="contact_person"
          type="text"
          maxLength={COMPANY_CONTACT_MAX_LENGTH}
          defaultValue={values.contactPerson}
          autoComplete="name"
          aria-invalid={fieldErrors.contactPerson ? true : undefined}
          aria-describedby={
            fieldErrors.contactPerson
              ? "company-contact-hint company-contact-error"
              : "company-contact-hint"
          }
          className={styles.input}
        />
        {fieldErrors.contactPerson ? (
          <p
            id="company-contact-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.contactPerson}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="company-phone" className={styles.label}>
          {companiesCreateCopy.phoneLabel}
        </label>
        <p id="company-phone-hint" className={styles.hint}>
          {companiesCreateCopy.phoneHint}
        </p>
        <input
          id="company-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={values.phone}
          autoComplete="tel"
          dir="ltr"
          aria-invalid={fieldErrors.phone ? true : undefined}
          aria-describedby={
            fieldErrors.phone
              ? "company-phone-hint company-phone-error"
              : "company-phone-hint"
          }
          className={`${styles.input} ${styles.inputLtr}`}
        />
        {fieldErrors.phone ? (
          <p id="company-phone-error" className={styles.fieldError} role="alert">
            {fieldErrors.phone}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="company-notes" className={styles.label}>
          {companiesCreateCopy.notesLabel}
        </label>
        <p id="company-notes-hint" className={styles.hint}>
          {companiesCreateCopy.notesHint}
        </p>
        <textarea
          id="company-notes"
          name="notes"
          maxLength={COMPANY_NOTES_MAX_LENGTH}
          defaultValue={values.notes}
          rows={5}
          aria-invalid={fieldErrors.notes ? true : undefined}
          aria-describedby={
            fieldErrors.notes
              ? "company-notes-hint company-notes-error"
              : "company-notes-hint"
          }
          className={styles.textarea}
        />
        {fieldErrors.notes ? (
          <p id="company-notes-error" className={styles.fieldError} role="alert">
            {fieldErrors.notes}
          </p>
        ) : null}
      </div>

      <div className={styles.actions}>
        <SubmitButton />
        <Link href="/companies" className={styles.cancel}>
          {companiesCreateCopy.cancel}
        </Link>
      </div>
    </form>
  );
}
