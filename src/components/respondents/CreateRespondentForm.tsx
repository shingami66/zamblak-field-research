"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createRespondentAction } from "@/app/respondents/new/actions";
import { ZamblakLoadingMark } from "@/components/brand/ZamblakLoadingMark";
import { respondentsCreateCopy } from "@/lib/respondents/create-copy";
import {
  EMPTY_CREATE_RESPONDENT_STATE,
  type CreateRespondentActionState,
} from "@/lib/respondents/create-form";
import {
  RESPONDENT_AGE_MAX,
  RESPONDENT_NAME_MAX_LENGTH,
  RESPONDENT_NATIONALITY_MAX_LENGTH,
  RESPONDENT_NOTES_MAX_LENGTH,
} from "@/lib/respondents/input";
import styles from "@/app/respondents/new/create-respondent.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={styles.submit}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <span className={styles.pendingContent}>
          <ZamblakLoadingMark variant="compact" className={styles.pendingMark} />
          <span>{respondentsCreateCopy.submitting}</span>
        </span>
      ) : (
        respondentsCreateCopy.submit
      )}
    </button>
  );
}

const RESIDENT_OPTIONS = [
  { value: "unknown", label: respondentsCreateCopy.residentUnknown },
  { value: "saudi", label: respondentsCreateCopy.residentSaudi },
  { value: "non_saudi", label: respondentsCreateCopy.residentNonSaudi },
] as const;

type CreateRespondentFormProps = {
  initialState?: CreateRespondentActionState;
};

export function CreateRespondentForm({
  initialState = EMPTY_CREATE_RESPONDENT_STATE,
}: CreateRespondentFormProps) {
  const [state, formAction] = useActionState(
    createRespondentAction,
    initialState
  );

  const values = state.values;
  const fieldErrors = state.fieldErrors;
  const hasFormError = Boolean(state.formError);

  // Remount after every error revision so uncontrolled defaultValue
  // re-applies the full returned action-state values.
  return (
    <form
      key={state.revision}
      action={formAction}
      className={styles.form}
      noValidate
      aria-describedby={
        hasFormError ? "create-respondent-form-error" : undefined
      }
    >
      {state.formError ? (
        <div
          id="create-respondent-form-error"
          role="alert"
          aria-atomic="true"
          className={styles.formError}
        >
          <strong className={styles.formErrorTitle}>
            {respondentsCreateCopy.formErrorHeading}
          </strong>
          <p className={styles.formErrorText}>{state.formError}</p>
        </div>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="respondent-mobile" className={styles.label}>
          {respondentsCreateCopy.mobileLabel}
          <span className={styles.required}>
            {" "}
            ({respondentsCreateCopy.required})
          </span>
        </label>
        <p id="respondent-mobile-hint" className={styles.hint}>
          {respondentsCreateCopy.mobileHint}
        </p>
        <p id="respondent-mobile-examples" className={styles.hint}>
          {respondentsCreateCopy.mobileExamples}
        </p>
        <input
          id="respondent-mobile"
          name="mobile"
          type="tel"
          inputMode="tel"
          required
          defaultValue={values.mobile}
          autoComplete="tel"
          dir="ltr"
          aria-invalid={fieldErrors.mobile ? true : undefined}
          aria-describedby={
            fieldErrors.mobile
              ? "respondent-mobile-hint respondent-mobile-examples respondent-mobile-error"
              : "respondent-mobile-hint respondent-mobile-examples"
          }
          className={`${styles.input} ${styles.inputLtr}`}
        />
        {fieldErrors.mobile ? (
          <p
            id="respondent-mobile-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.mobile}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="respondent-name" className={styles.label}>
          {respondentsCreateCopy.nameLabel}
          <span className={styles.optional}>
            {" "}
            ({respondentsCreateCopy.optional})
          </span>
        </label>
        <p id="respondent-name-hint" className={styles.hint}>
          {respondentsCreateCopy.nameHint}
        </p>
        <input
          id="respondent-name"
          name="name"
          type="text"
          maxLength={RESPONDENT_NAME_MAX_LENGTH}
          defaultValue={values.name}
          autoComplete="name"
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={
            fieldErrors.name
              ? "respondent-name-hint respondent-name-error"
              : "respondent-name-hint"
          }
          className={styles.input}
        />
        {fieldErrors.name ? (
          <p
            id="respondent-name-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="respondent-age" className={styles.label}>
          {respondentsCreateCopy.ageLabel}
          <span className={styles.optional}>
            {" "}
            ({respondentsCreateCopy.optional})
          </span>
        </label>
        <p id="respondent-age-hint" className={styles.hint}>
          {respondentsCreateCopy.ageHint}
        </p>
        <input
          id="respondent-age"
          name="age"
          type="number"
          inputMode="numeric"
          min={0}
          max={RESPONDENT_AGE_MAX}
          step={1}
          defaultValue={values.age}
          dir="ltr"
          aria-invalid={fieldErrors.age ? true : undefined}
          aria-describedby={
            fieldErrors.age
              ? "respondent-age-hint respondent-age-error"
              : "respondent-age-hint"
          }
          className={`${styles.input} ${styles.inputLtr}`}
        />
        {fieldErrors.age ? (
          <p
            id="respondent-age-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.age}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="respondent-nationality" className={styles.label}>
          {respondentsCreateCopy.nationalityLabel}
          <span className={styles.optional}>
            {" "}
            ({respondentsCreateCopy.optional})
          </span>
        </label>
        <p id="respondent-nationality-hint" className={styles.hint}>
          {respondentsCreateCopy.nationalityHint}
        </p>
        <input
          id="respondent-nationality"
          name="nationality"
          type="text"
          maxLength={RESPONDENT_NATIONALITY_MAX_LENGTH}
          defaultValue={values.nationality}
          autoComplete="country-name"
          aria-invalid={fieldErrors.nationality ? true : undefined}
          aria-describedby={
            fieldErrors.nationality
              ? "respondent-nationality-hint respondent-nationality-error"
              : "respondent-nationality-hint"
          }
          className={styles.input}
        />
        {fieldErrors.nationality ? (
          <p
            id="respondent-nationality-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.nationality}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="respondent-resident-type" className={styles.label}>
          {respondentsCreateCopy.residentTypeLabel}
          <span className={styles.optional}>
            {" "}
            ({respondentsCreateCopy.optional})
          </span>
        </label>
        <p id="respondent-resident-type-hint" className={styles.hint}>
          {respondentsCreateCopy.residentTypeHint}
        </p>
        <select
          id="respondent-resident-type"
          name="resident_type"
          defaultValue={values.residentType || "unknown"}
          aria-invalid={fieldErrors.residentType ? true : undefined}
          aria-describedby={
            fieldErrors.residentType
              ? "respondent-resident-type-hint respondent-resident-type-error"
              : "respondent-resident-type-hint"
          }
          className={styles.select}
        >
          {RESIDENT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {fieldErrors.residentType ? (
          <p
            id="respondent-resident-type-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.residentType}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="respondent-notes" className={styles.label}>
          {respondentsCreateCopy.notesLabel}
          <span className={styles.optional}>
            {" "}
            ({respondentsCreateCopy.optional})
          </span>
        </label>
        <p id="respondent-notes-hint" className={styles.hint}>
          {respondentsCreateCopy.notesHint}
        </p>
        <textarea
          id="respondent-notes"
          name="notes"
          maxLength={RESPONDENT_NOTES_MAX_LENGTH}
          defaultValue={values.notes}
          rows={5}
          aria-invalid={fieldErrors.notes ? true : undefined}
          aria-describedby={
            fieldErrors.notes
              ? "respondent-notes-hint respondent-notes-error"
              : "respondent-notes-hint"
          }
          className={styles.textarea}
        />
        {fieldErrors.notes ? (
          <p
            id="respondent-notes-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.notes}
          </p>
        ) : null}
      </div>

      <div className={styles.actions}>
        <SubmitButton />
        <Link href="/respondents" className={styles.cancel}>
          {respondentsCreateCopy.cancel}
        </Link>
      </div>
    </form>
  );
}
