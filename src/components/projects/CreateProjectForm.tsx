"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createProjectAction } from "@/app/projects/new/actions";
import { projectsCreateCopy } from "@/lib/projects/create-copy";
import {
  EMPTY_CREATE_PROJECT_STATE,
  type CreateProjectActionState,
} from "@/lib/projects/create-form";
import {
  PROJECT_LONG_TEXT_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
} from "@/lib/projects/input";
import styles from "@/app/projects/new/create-project.module.css";

export type CompanyOption = {
  companyId: string;
  name: string;
};

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
      {pending ? projectsCreateCopy.submitting : projectsCreateCopy.submit}
    </button>
  );
}

type CreateProjectFormProps = {
  companyOptions: CompanyOption[];
  initialState?: CreateProjectActionState;
};

const DOMAIN_OPTIONS = [
  { value: "telecom", label: projectsCreateCopy.domainTelecom },
  { value: "banking", label: projectsCreateCopy.domainBanking },
  { value: "insurance", label: projectsCreateCopy.domainInsurance },
  { value: "product", label: projectsCreateCopy.domainProduct },
  { value: "other", label: projectsCreateCopy.domainOther },
] as const;

const RESIDENT_OPTIONS = [
  { value: "any", label: projectsCreateCopy.residentAny },
  { value: "saudi", label: projectsCreateCopy.residentSaudi },
  { value: "non_saudi", label: projectsCreateCopy.residentNonSaudi },
  { value: "unknown", label: projectsCreateCopy.residentUnknown },
] as const;

export function CreateProjectForm({
  companyOptions,
  initialState = EMPTY_CREATE_PROJECT_STATE,
}: CreateProjectFormProps) {
  const [state, formAction] = useActionState(
    createProjectAction,
    initialState
  );

  const values = state.values;
  const fieldErrors = state.fieldErrors;
  const hasFormError = Boolean(state.formError);
  const noCompanies = companyOptions.length === 0;

  // Remount after every error revision so uncontrolled defaultValue/defaultChecked
  // re-apply the full returned action-state values (not the initial empty defaults).
  return (
    <form
      key={state.revision}
      action={formAction}
      className={styles.form}
      noValidate
      aria-describedby={hasFormError ? "create-project-form-error" : undefined}
    >
      {state.formError ? (
        <div
          id="create-project-form-error"
          role="alert"
          aria-atomic="true"
          className={styles.formError}
        >
          <strong className={styles.formErrorTitle}>
            {projectsCreateCopy.formErrorHeading}
          </strong>
          <p className={styles.formErrorText}>{state.formError}</p>
        </div>
      ) : null}

      <section className={styles.section} aria-labelledby="section-basic">
        <h2 id="section-basic" className={styles.sectionTitle}>
          {projectsCreateCopy.sectionBasic}
        </h2>

        <div className={styles.field}>
          <label htmlFor="project-name" className={styles.label}>
            {projectsCreateCopy.nameLabel}
            <span className={styles.required}>
              {" "}
              ({projectsCreateCopy.nameRequired})
            </span>
          </label>
          <p id="project-name-hint" className={styles.hint}>
            {projectsCreateCopy.nameHint}
          </p>
          <input
            id="project-name"
            name="name"
            type="text"
            required
            maxLength={PROJECT_NAME_MAX_LENGTH}
            defaultValue={values.name}
            autoComplete="off"
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={
              fieldErrors.name
                ? "project-name-hint project-name-error"
                : "project-name-hint"
            }
            className={styles.input}
          />
          {fieldErrors.name ? (
            <p id="project-name-error" className={styles.fieldError} role="alert">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="project-company" className={styles.label}>
            {projectsCreateCopy.companyLabel}
            <span className={styles.required}>
              {" "}
              ({projectsCreateCopy.companyRequired})
            </span>
          </label>
          <p id="project-company-hint" className={styles.hint}>
            {projectsCreateCopy.companyHint}
          </p>
          <select
            id="project-company"
            name="company_id"
            required
            defaultValue={values.companyId}
            disabled={noCompanies}
            aria-invalid={fieldErrors.companyId ? true : undefined}
            aria-describedby={
              fieldErrors.companyId
                ? "project-company-hint project-company-error"
                : "project-company-hint"
            }
            className={styles.select}
          >
            <option value="">{projectsCreateCopy.companyPlaceholder}</option>
            {companyOptions.map((option) => (
              <option key={option.companyId} value={option.companyId}>
                {option.name}
              </option>
            ))}
          </select>
          {fieldErrors.companyId ? (
            <p
              id="project-company-error"
              className={styles.fieldError}
              role="alert"
            >
              {fieldErrors.companyId}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="project-domain" className={styles.label}>
            {projectsCreateCopy.domainLabel}
            <span className={styles.required}>
              {" "}
              ({projectsCreateCopy.domainRequired})
            </span>
          </label>
          <p id="project-domain-hint" className={styles.hint}>
            {projectsCreateCopy.domainHint}
          </p>
          <select
            id="project-domain"
            name="domain"
            required
            defaultValue={values.domain}
            aria-invalid={fieldErrors.domain ? true : undefined}
            aria-describedby={
              fieldErrors.domain
                ? "project-domain-hint project-domain-error"
                : "project-domain-hint"
            }
            className={styles.select}
          >
            <option value="">{projectsCreateCopy.domainPlaceholder}</option>
            {DOMAIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.domain ? (
            <p
              id="project-domain-error"
              className={styles.fieldError}
              role="alert"
            >
              {fieldErrors.domain}
            </p>
          ) : null}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="section-schedule">
        <h2 id="section-schedule" className={styles.sectionTitle}>
          {projectsCreateCopy.sectionSchedule}
        </h2>
        <p id="project-dates-hint" className={styles.hint}>
          {projectsCreateCopy.dateHint}
        </p>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="project-start-date" className={styles.label}>
              {projectsCreateCopy.startDateLabel}
            </label>
            <input
              id="project-start-date"
              name="start_date"
              type="date"
              defaultValue={values.startDate}
              aria-invalid={fieldErrors.startDate ? true : undefined}
              aria-describedby={
                fieldErrors.startDate
                  ? "project-dates-hint project-start-date-error"
                  : "project-dates-hint"
              }
              className={`${styles.input} ${styles.inputLtr}`}
            />
            {fieldErrors.startDate ? (
              <p
                id="project-start-date-error"
                className={styles.fieldError}
                role="alert"
              >
                {fieldErrors.startDate}
              </p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label htmlFor="project-end-date" className={styles.label}>
              {projectsCreateCopy.endDateLabel}
            </label>
            <input
              id="project-end-date"
              name="end_date"
              type="date"
              defaultValue={values.endDate}
              aria-invalid={fieldErrors.endDate ? true : undefined}
              aria-describedby={
                fieldErrors.endDate
                  ? "project-dates-hint project-end-date-error"
                  : "project-dates-hint"
              }
              className={`${styles.input} ${styles.inputLtr}`}
            />
            {fieldErrors.endDate ? (
              <p
                id="project-end-date-error"
                className={styles.fieldError}
                role="alert"
              >
                {fieldErrors.endDate}
              </p>
            ) : null}
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="project-quota" className={styles.label}>
            {projectsCreateCopy.quotaLabel}
          </label>
          <p id="project-quota-hint" className={styles.hint}>
            {projectsCreateCopy.quotaHint}
          </p>
          <input
            id="project-quota"
            name="quota"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={values.quota}
            aria-invalid={fieldErrors.quota ? true : undefined}
            aria-describedby={
              fieldErrors.quota
                ? "project-quota-hint project-quota-error"
                : "project-quota-hint"
            }
            className={`${styles.input} ${styles.inputLtr}`}
          />
          {fieldErrors.quota ? (
            <p
              id="project-quota-error"
              className={styles.fieldError}
              role="alert"
            >
              {fieldErrors.quota}
            </p>
          ) : null}
        </div>
      </section>

      <section
        className={styles.section}
        aria-labelledby="section-participants"
      >
        <h2 id="section-participants" className={styles.sectionTitle}>
          {projectsCreateCopy.sectionParticipants}
        </h2>
        <p id="project-age-hint" className={styles.hint}>
          {projectsCreateCopy.ageHint}
        </p>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="project-min-age" className={styles.label}>
              {projectsCreateCopy.minAgeLabel}
            </label>
            <input
              id="project-min-age"
              name="min_age"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={values.minAge}
              aria-invalid={fieldErrors.minAge ? true : undefined}
              aria-describedby={
                fieldErrors.minAge
                  ? "project-age-hint project-min-age-error"
                  : "project-age-hint"
              }
              className={`${styles.input} ${styles.inputLtr}`}
            />
            {fieldErrors.minAge ? (
              <p
                id="project-min-age-error"
                className={styles.fieldError}
                role="alert"
              >
                {fieldErrors.minAge}
              </p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label htmlFor="project-max-age" className={styles.label}>
              {projectsCreateCopy.maxAgeLabel}
            </label>
            <input
              id="project-max-age"
              name="max_age"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={values.maxAge}
              aria-invalid={fieldErrors.maxAge ? true : undefined}
              aria-describedby={
                fieldErrors.maxAge
                  ? "project-age-hint project-max-age-error"
                  : "project-age-hint"
              }
              className={`${styles.input} ${styles.inputLtr}`}
            />
            {fieldErrors.maxAge ? (
              <p
                id="project-max-age-error"
                className={styles.fieldError}
                role="alert"
              >
                {fieldErrors.maxAge}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="project-resident" className={styles.label}>
            {projectsCreateCopy.residentLabel}
          </label>
          <p id="project-resident-hint" className={styles.hint}>
            {projectsCreateCopy.residentHint}
          </p>
          <select
            id="project-resident"
            name="required_resident_type"
            defaultValue={values.requiredResidentType || "any"}
            aria-invalid={
              fieldErrors.requiredResidentType ? true : undefined
            }
            aria-describedby={
              fieldErrors.requiredResidentType
                ? "project-resident-hint project-resident-error"
                : "project-resident-hint"
            }
            className={styles.select}
          >
            {RESIDENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.requiredResidentType ? (
            <p
              id="project-resident-error"
              className={styles.fieldError}
              role="alert"
            >
              {fieldErrors.requiredResidentType}
            </p>
          ) : null}
        </div>

        <div className={styles.checkboxField}>
          <input
            id="project-three-month"
            name="requires_three_month_warning"
            type="checkbox"
            value="true"
            defaultChecked={values.requiresThreeMonthWarning}
            className={styles.checkbox}
            aria-describedby="project-three-month-hint"
          />
          <div className={styles.checkboxText}>
            <label htmlFor="project-three-month" className={styles.label}>
              {projectsCreateCopy.threeMonthLabel}
            </label>
            <p id="project-three-month-hint" className={styles.hint}>
              {projectsCreateCopy.threeMonthHint}
            </p>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="project-eligibility" className={styles.label}>
            {projectsCreateCopy.eligibilityLabel}
          </label>
          <p id="project-eligibility-hint" className={styles.hint}>
            {projectsCreateCopy.eligibilityHint}
          </p>
          <textarea
            id="project-eligibility"
            name="eligibility_notes"
            maxLength={PROJECT_LONG_TEXT_MAX_LENGTH}
            defaultValue={values.eligibilityNotes}
            rows={4}
            aria-describedby="project-eligibility-hint"
            className={styles.textarea}
          />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="section-contact">
        <h2 id="section-contact" className={styles.sectionTitle}>
          {projectsCreateCopy.sectionContact}
        </h2>
        <p id="project-whatsapp-hint" className={styles.hint}>
          {projectsCreateCopy.whatsappHint}
        </p>
        <div className={styles.field}>
          <label htmlFor="project-wa-ar" className={styles.label}>
            {projectsCreateCopy.whatsappArLabel}
          </label>
          <textarea
            id="project-wa-ar"
            name="whatsapp_template_ar"
            maxLength={PROJECT_LONG_TEXT_MAX_LENGTH}
            defaultValue={values.whatsappTemplateAr}
            rows={4}
            aria-describedby="project-whatsapp-hint"
            className={styles.textarea}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="project-wa-en" className={styles.label}>
            {projectsCreateCopy.whatsappEnLabel}
          </label>
          <textarea
            id="project-wa-en"
            name="whatsapp_template_en"
            maxLength={PROJECT_LONG_TEXT_MAX_LENGTH}
            defaultValue={values.whatsappTemplateEn}
            rows={4}
            aria-describedby="project-whatsapp-hint"
            className={styles.textarea}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="project-notes" className={styles.label}>
            {projectsCreateCopy.notesLabel}
          </label>
          <p id="project-notes-hint" className={styles.hint}>
            {projectsCreateCopy.notesHint}
          </p>
          <textarea
            id="project-notes"
            name="notes"
            maxLength={PROJECT_LONG_TEXT_MAX_LENGTH}
            defaultValue={values.notes}
            rows={4}
            aria-describedby="project-notes-hint"
            className={styles.textarea}
          />
        </div>
      </section>

      <div className={styles.actions}>
        <SubmitButton disabled={noCompanies} />
        <Link href="/projects" className={styles.cancel}>
          {projectsCreateCopy.cancel}
        </Link>
      </div>
    </form>
  );
}
