"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ZamblakLoadingMark } from "@/components/brand/ZamblakLoadingMark";
import { respondentsEditCopy } from "@/lib/respondents/edit-copy";
import type { EditRespondentActionState } from "@/lib/respondents/edit-form";
import {
  RESPONDENT_AGE_MAX,
  RESPONDENT_NAME_MAX_LENGTH,
  RESPONDENT_NATIONALITY_MAX_LENGTH,
  RESPONDENT_NOTES_MAX_LENGTH,
} from "@/lib/respondents/input";
import styles from "@/app/respondents/new/create-respondent.module.css";

export type BoundUpdateRespondentAction = (
  prevState: EditRespondentActionState,
  formData: FormData
) => Promise<EditRespondentActionState>;

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = Boolean(disabled) || pending;

  return (
    <button
      type="submit"
      className={styles.submit}
      disabled={isDisabled}
      aria-busy={pending}
    >
      {pending ? (
        <span className={styles.pendingContent}>
          <ZamblakLoadingMark variant="compact" className={styles.pendingMark} />
          <span>{respondentsEditCopy.saving}</span>
        </span>
      ) : (
        respondentsEditCopy.save
      )}
    </button>
  );
}

const RESIDENT_OPTIONS = [
  { value: "unknown", label: respondentsEditCopy.residentUnknown },
  { value: "saudi", label: respondentsEditCopy.residentSaudi },
  { value: "non_saudi", label: respondentsEditCopy.residentNonSaudi },
] as const;

type EditRespondentFormProps = {
  action: BoundUpdateRespondentAction;
  initialState: EditRespondentActionState;
  detailHref: string;
  editHref: string;
};

export function EditRespondentForm({
  action,
  initialState,
  detailHref,
  editHref,
}: EditRespondentFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  const values = state.values;
  const fieldErrors = state.fieldErrors;
  const hasFormError = Boolean(state.formError);
  const isStale = state.code === "stale_respondent_version";

  return (
    <form
      key={state.revision}
      action={formAction}
      className={styles.form}
      noValidate
      aria-describedby={
        hasFormError ? "edit-respondent-form-error" : undefined
      }
    >
      {state.formError ? (
        <div
          id="edit-respondent-form-error"
          role="alert"
          aria-atomic="true"
          className={styles.formError}
        >
          <strong className={styles.formErrorTitle}>
            {respondentsEditCopy.formErrorHeading}
          </strong>
          <p className={styles.formErrorText}>{state.formError}</p>
          {state.showReload ? (
            <p className={styles.formErrorText}>
              <Link href={editHref} className={styles.cancel}>
                {respondentsEditCopy.reloadRecord}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="edit-respondent-mobile" className={styles.label}>
          {respondentsEditCopy.mobileLabel}
          <span className={styles.required}>
            {" "}
            ({respondentsEditCopy.required})
          </span>
        </label>
        <p id="edit-respondent-mobile-hint" className={styles.hint}>
          {respondentsEditCopy.mobileHint}
        </p>
        <p id="edit-respondent-mobile-examples" className={styles.hint}>
          {respondentsEditCopy.mobileExamples}
        </p>
        <input
          id="edit-respondent-mobile"
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
              ? "edit-respondent-mobile-hint edit-respondent-mobile-examples edit-respondent-mobile-error"
              : "edit-respondent-mobile-hint edit-respondent-mobile-examples"
          }
          className={`${styles.input} ${styles.inputLtr}`}
        />
        {fieldErrors.mobile ? (
          <p
            id="edit-respondent-mobile-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.mobile}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="edit-respondent-name" className={styles.label}>
          {respondentsEditCopy.nameLabel}
          <span className={styles.optional}>
            {" "}
            ({respondentsEditCopy.optional})
          </span>
        </label>
        <p id="edit-respondent-name-hint" className={styles.hint}>
          {respondentsEditCopy.nameHint}
        </p>
        <input
          id="edit-respondent-name"
          name="name"
          type="text"
          maxLength={RESPONDENT_NAME_MAX_LENGTH}
          defaultValue={values.name}
          autoComplete="name"
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={
            fieldErrors.name
              ? "edit-respondent-name-hint edit-respondent-name-error"
              : "edit-respondent-name-hint"
          }
          className={styles.input}
        />
        {fieldErrors.name ? (
          <p
            id="edit-respondent-name-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="edit-respondent-age" className={styles.label}>
          {respondentsEditCopy.ageLabel}
          <span className={styles.optional}>
            {" "}
            ({respondentsEditCopy.optional})
          </span>
        </label>
        <p id="edit-respondent-age-hint" className={styles.hint}>
          {respondentsEditCopy.ageHint}
        </p>
        <input
          id="edit-respondent-age"
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
              ? "edit-respondent-age-hint edit-respondent-age-error"
              : "edit-respondent-age-hint"
          }
          className={`${styles.input} ${styles.inputLtr}`}
        />
        {fieldErrors.age ? (
          <p
            id="edit-respondent-age-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.age}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="edit-respondent-nationality" className={styles.label}>
          {respondentsEditCopy.nationalityLabel}
          <span className={styles.optional}>
            {" "}
            ({respondentsEditCopy.optional})
          </span>
        </label>
        <p id="edit-respondent-nationality-hint" className={styles.hint}>
          {respondentsEditCopy.nationalityHint}
        </p>
        <input
          id="edit-respondent-nationality"
          name="nationality"
          type="text"
          maxLength={RESPONDENT_NATIONALITY_MAX_LENGTH}
          defaultValue={values.nationality}
          autoComplete="country-name"
          aria-invalid={fieldErrors.nationality ? true : undefined}
          aria-describedby={
            fieldErrors.nationality
              ? "edit-respondent-nationality-hint edit-respondent-nationality-error"
              : "edit-respondent-nationality-hint"
          }
          className={styles.input}
        />
        {fieldErrors.nationality ? (
          <p
            id="edit-respondent-nationality-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.nationality}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label
          htmlFor="edit-respondent-resident-type"
          className={styles.label}
        >
          {respondentsEditCopy.residentTypeLabel}
          <span className={styles.optional}>
            {" "}
            ({respondentsEditCopy.optional})
          </span>
        </label>
        <p id="edit-respondent-resident-type-hint" className={styles.hint}>
          {respondentsEditCopy.residentTypeHint}
        </p>
        <select
          id="edit-respondent-resident-type"
          name="resident_type"
          defaultValue={values.residentType || "unknown"}
          aria-invalid={fieldErrors.residentType ? true : undefined}
          aria-describedby={
            fieldErrors.residentType
              ? "edit-respondent-resident-type-hint edit-respondent-resident-type-error"
              : "edit-respondent-resident-type-hint"
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
            id="edit-respondent-resident-type-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.residentType}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="edit-respondent-notes" className={styles.label}>
          {respondentsEditCopy.notesLabel}
          <span className={styles.optional}>
            {" "}
            ({respondentsEditCopy.optional})
          </span>
        </label>
        <p id="edit-respondent-notes-hint" className={styles.hint}>
          {respondentsEditCopy.notesHint}
        </p>
        <textarea
          id="edit-respondent-notes"
          name="notes"
          maxLength={RESPONDENT_NOTES_MAX_LENGTH}
          defaultValue={values.notes}
          rows={5}
          aria-invalid={fieldErrors.notes ? true : undefined}
          aria-describedby={
            fieldErrors.notes
              ? "edit-respondent-notes-hint edit-respondent-notes-error"
              : "edit-respondent-notes-hint"
          }
          className={styles.textarea}
        />
        {fieldErrors.notes ? (
          <p
            id="edit-respondent-notes-error"
            className={styles.fieldError}
            role="alert"
          >
            {fieldErrors.notes}
          </p>
        ) : null}
      </div>

      <div className={styles.actions}>
        <SubmitButton disabled={isStale} />
        <Link href={detailHref} className={styles.cancel}>
          {respondentsEditCopy.cancel}
        </Link>
      </div>
    </form>
  );
}
