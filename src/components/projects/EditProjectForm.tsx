"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProjectAction } from "@/app/projects/[projectId]/edit/actions";
import { ZamblakLoadingMark } from "@/components/brand/ZamblakLoadingMark";
import { projectsEditCopy } from "@/lib/projects/edit-copy";
import type { EditProjectActionState } from "@/lib/projects/edit-form";
import {
  PROJECT_LONG_TEXT_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
} from "@/lib/projects/input";
import styles from "@/app/projects/new/create-project.module.css";

export type EditCompanyOption = {
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
      {pending ? (
        <span className={styles.pendingContent}>
          <ZamblakLoadingMark variant="compact" className={styles.pendingMark} />
          <span>{projectsEditCopy.saving}</span>
        </span>
      ) : (
        projectsEditCopy.save
      )}
    </button>
  );
}

type EditProjectFormProps = {
  initialState: EditProjectActionState;
  companyOptions: EditCompanyOption[];
  companyLocked: boolean;
  currentCompanyName: string;
  statusLabel: string;
};

const DOMAIN_OPTIONS = [
  { value: "telecom", label: projectsEditCopy.domainTelecom },
  { value: "banking", label: projectsEditCopy.domainBanking },
  { value: "insurance", label: projectsEditCopy.domainInsurance },
  { value: "product", label: projectsEditCopy.domainProduct },
  { value: "other", label: projectsEditCopy.domainOther },
] as const;

const RESIDENT_OPTIONS = [
  { value: "any", label: projectsEditCopy.residentAny },
  { value: "saudi", label: projectsEditCopy.residentSaudi },
  { value: "non_saudi", label: projectsEditCopy.residentNonSaudi },
  { value: "unknown", label: projectsEditCopy.residentUnknown },
] as const;

export function EditProjectForm({
  initialState,
  companyOptions,
  companyLocked,
  currentCompanyName,
  statusLabel,
}: EditProjectFormProps) {
  const [state, formAction] = useActionState(
    updateProjectAction,
    initialState
  );

  const values = state.values;
  const fieldErrors = state.fieldErrors;
  const hasFormError = Boolean(state.formError);
  const detailHref = `/projects/${values.projectId}`;
  const editHref = `/projects/${values.projectId}/edit`;
  const noCompanies = !companyLocked && companyOptions.length === 0;

  return (
    <form
      action={formAction}
      className={styles.form}
      noValidate
      aria-describedby={hasFormError ? "edit-project-form-error" : undefined}
    >
      <input type="hidden" name="project_id" value={values.projectId} />
      <input
        type="hidden"
        name="expected_updated_at"
        value={values.expectedUpdatedAt}
      />

      <div className={styles.draftNotice} role="status">
        <strong>{projectsEditCopy.statusContext}:</strong> {statusLabel}
      </div>

      {state.formError ? (
        <div
          id="edit-project-form-error"
          role="alert"
          aria-atomic="true"
          className={styles.formError}
        >
          <strong className={styles.formErrorTitle}>
            {projectsEditCopy.formErrorHeading}
          </strong>
          <p className={styles.formErrorText}>{state.formError}</p>
          {state.showReload ? (
            <p className={styles.formErrorText}>
              <Link href={editHref} className={styles.secondaryAction}>
                {projectsEditCopy.reloadProject}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <section className={styles.section} aria-labelledby="edit-section-basic">
        <h2 id="edit-section-basic" className={styles.sectionTitle}>
          {projectsEditCopy.sectionBasic}
        </h2>

        <div className={styles.field}>
          <label htmlFor="edit-project-name" className={styles.label}>
            {projectsEditCopy.nameLabel}
            <span className={styles.required}>
              {" "}
              ({projectsEditCopy.nameRequired})
            </span>
          </label>
          <p id="edit-project-name-hint" className={styles.hint}>
            {projectsEditCopy.nameHint}
          </p>
          <input
            id="edit-project-name"
            name="name"
            type="text"
            required
            maxLength={PROJECT_NAME_MAX_LENGTH}
            defaultValue={values.name}
            autoComplete="off"
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={
              fieldErrors.name
                ? "edit-project-name-hint edit-project-name-error"
                : "edit-project-name-hint"
            }
            className={styles.input}
          />
          {fieldErrors.name ? (
            <p
              id="edit-project-name-error"
              className={styles.fieldError}
              role="alert"
            >
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          {companyLocked ? (
            <>
              <span className={styles.label} id="edit-project-company-label">
                {projectsEditCopy.companyLabel}
              </span>
              <p id="edit-project-company-hint" className={styles.hint}>
                {projectsEditCopy.companyLockedNote}
              </p>
              <p
                className={styles.input}
                aria-labelledby="edit-project-company-label"
                aria-describedby="edit-project-company-hint"
              >
                {currentCompanyName}
              </p>
              <input
                type="hidden"
                name="company_id"
                value={values.companyId}
              />
              {fieldErrors.companyId ? (
                <p className={styles.fieldError} role="alert">
                  {fieldErrors.companyId}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <label htmlFor="edit-project-company" className={styles.label}>
                {projectsEditCopy.companyLabel}
                <span className={styles.required}>
                  {" "}
                  ({projectsEditCopy.companyRequired})
                </span>
              </label>
              <p id="edit-project-company-hint" className={styles.hint}>
                {projectsEditCopy.companyHint}
              </p>
              <select
                id="edit-project-company"
                name="company_id"
                required
                defaultValue={values.companyId}
                disabled={noCompanies}
                aria-invalid={fieldErrors.companyId ? true : undefined}
                aria-describedby={
                  fieldErrors.companyId
                    ? "edit-project-company-hint edit-project-company-error"
                    : "edit-project-company-hint"
                }
                className={styles.select}
              >
                <option value="">
                  {projectsEditCopy.companyPlaceholder}
                </option>
                {companyOptions.map((option) => (
                  <option key={option.companyId} value={option.companyId}>
                    {option.name}
                  </option>
                ))}
              </select>
              {fieldErrors.companyId ? (
                <p
                  id="edit-project-company-error"
                  className={styles.fieldError}
                  role="alert"
                >
                  {fieldErrors.companyId}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="edit-project-domain" className={styles.label}>
            {projectsEditCopy.domainLabel}
            <span className={styles.required}>
              {" "}
              ({projectsEditCopy.domainRequired})
            </span>
          </label>
          <p id="edit-project-domain-hint" className={styles.hint}>
            {projectsEditCopy.domainHint}
          </p>
          <select
            id="edit-project-domain"
            name="domain"
            required
            defaultValue={values.domain}
            aria-invalid={fieldErrors.domain ? true : undefined}
            aria-describedby={
              fieldErrors.domain
                ? "edit-project-domain-hint edit-project-domain-error"
                : "edit-project-domain-hint"
            }
            className={styles.select}
          >
            <option value="">{projectsEditCopy.domainPlaceholder}</option>
            {DOMAIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.domain ? (
            <p
              id="edit-project-domain-error"
              className={styles.fieldError}
              role="alert"
            >
              {fieldErrors.domain}
            </p>
          ) : null}
        </div>
      </section>

      <section
        className={styles.section}
        aria-labelledby="edit-section-schedule"
      >
        <h2 id="edit-section-schedule" className={styles.sectionTitle}>
          {projectsEditCopy.sectionSchedule}
        </h2>
        <p id="edit-project-dates-hint" className={styles.hint}>
          {projectsEditCopy.dateHint}
        </p>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="edit-project-start-date" className={styles.label}>
              {projectsEditCopy.startDateLabel}
            </label>
            <input
              id="edit-project-start-date"
              name="start_date"
              type="date"
              defaultValue={values.startDate}
              aria-invalid={fieldErrors.startDate ? true : undefined}
              aria-describedby={
                fieldErrors.startDate
                  ? "edit-project-dates-hint edit-project-start-date-error"
                  : "edit-project-dates-hint"
              }
              className={`${styles.input} ${styles.inputLtr}`}
            />
            {fieldErrors.startDate ? (
              <p
                id="edit-project-start-date-error"
                className={styles.fieldError}
                role="alert"
              >
                {fieldErrors.startDate}
              </p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label htmlFor="edit-project-end-date" className={styles.label}>
              {projectsEditCopy.endDateLabel}
            </label>
            <input
              id="edit-project-end-date"
              name="end_date"
              type="date"
              defaultValue={values.endDate}
              aria-invalid={fieldErrors.endDate ? true : undefined}
              aria-describedby={
                fieldErrors.endDate
                  ? "edit-project-dates-hint edit-project-end-date-error"
                  : "edit-project-dates-hint"
              }
              className={`${styles.input} ${styles.inputLtr}`}
            />
            {fieldErrors.endDate ? (
              <p
                id="edit-project-end-date-error"
                className={styles.fieldError}
                role="alert"
              >
                {fieldErrors.endDate}
              </p>
            ) : null}
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="edit-project-quota" className={styles.label}>
            {projectsEditCopy.quotaLabel}
          </label>
          <p id="edit-project-quota-hint" className={styles.hint}>
            {projectsEditCopy.quotaHint}
          </p>
          <input
            id="edit-project-quota"
            name="quota"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={values.quota}
            aria-invalid={fieldErrors.quota ? true : undefined}
            aria-describedby={
              fieldErrors.quota
                ? "edit-project-quota-hint edit-project-quota-error"
                : "edit-project-quota-hint"
            }
            className={`${styles.input} ${styles.inputLtr}`}
          />
          {fieldErrors.quota ? (
            <p
              id="edit-project-quota-error"
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
        aria-labelledby="edit-section-participants"
      >
        <h2 id="edit-section-participants" className={styles.sectionTitle}>
          {projectsEditCopy.sectionParticipants}
        </h2>
        <p id="edit-project-age-hint" className={styles.hint}>
          {projectsEditCopy.ageHint}
        </p>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="edit-project-min-age" className={styles.label}>
              {projectsEditCopy.minAgeLabel}
            </label>
            <input
              id="edit-project-min-age"
              name="min_age"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={values.minAge}
              aria-invalid={fieldErrors.minAge ? true : undefined}
              aria-describedby={
                fieldErrors.minAge
                  ? "edit-project-age-hint edit-project-min-age-error"
                  : "edit-project-age-hint"
              }
              className={`${styles.input} ${styles.inputLtr}`}
            />
            {fieldErrors.minAge ? (
              <p
                id="edit-project-min-age-error"
                className={styles.fieldError}
                role="alert"
              >
                {fieldErrors.minAge}
              </p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label htmlFor="edit-project-max-age" className={styles.label}>
              {projectsEditCopy.maxAgeLabel}
            </label>
            <input
              id="edit-project-max-age"
              name="max_age"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={values.maxAge}
              aria-invalid={fieldErrors.maxAge ? true : undefined}
              aria-describedby={
                fieldErrors.maxAge
                  ? "edit-project-age-hint edit-project-max-age-error"
                  : "edit-project-age-hint"
              }
              className={`${styles.input} ${styles.inputLtr}`}
            />
            {fieldErrors.maxAge ? (
              <p
                id="edit-project-max-age-error"
                className={styles.fieldError}
                role="alert"
              >
                {fieldErrors.maxAge}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="edit-project-resident" className={styles.label}>
            {projectsEditCopy.residentLabel}
          </label>
          <p id="edit-project-resident-hint" className={styles.hint}>
            {projectsEditCopy.residentHint}
          </p>
          <select
            id="edit-project-resident"
            name="required_resident_type"
            defaultValue={values.requiredResidentType || "any"}
            aria-invalid={
              fieldErrors.requiredResidentType ? true : undefined
            }
            aria-describedby={
              fieldErrors.requiredResidentType
                ? "edit-project-resident-hint edit-project-resident-error"
                : "edit-project-resident-hint"
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
              id="edit-project-resident-error"
              className={styles.fieldError}
              role="alert"
            >
              {fieldErrors.requiredResidentType}
            </p>
          ) : null}
        </div>

        <div className={styles.checkboxField}>
          <input
            id="edit-project-three-month"
            name="requires_three_month_warning"
            type="checkbox"
            value="true"
            defaultChecked={values.requiresThreeMonthWarning}
            className={styles.checkbox}
            aria-describedby="edit-project-three-month-hint"
          />
          <div className={styles.checkboxText}>
            <label htmlFor="edit-project-three-month" className={styles.label}>
              {projectsEditCopy.threeMonthLabel}
            </label>
            <p id="edit-project-three-month-hint" className={styles.hint}>
              {projectsEditCopy.threeMonthHint}
            </p>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="edit-project-eligibility" className={styles.label}>
            {projectsEditCopy.eligibilityLabel}
          </label>
          <p id="edit-project-eligibility-hint" className={styles.hint}>
            {projectsEditCopy.eligibilityHint}
          </p>
          <textarea
            id="edit-project-eligibility"
            name="eligibility_notes"
            maxLength={PROJECT_LONG_TEXT_MAX_LENGTH}
            defaultValue={values.eligibilityNotes}
            rows={4}
            aria-describedby="edit-project-eligibility-hint"
            className={styles.textarea}
          />
        </div>
      </section>

      <section
        className={styles.section}
        aria-labelledby="edit-section-contact"
      >
        <h2 id="edit-section-contact" className={styles.sectionTitle}>
          {projectsEditCopy.sectionContact}
        </h2>
        <p id="edit-project-whatsapp-hint" className={styles.hint}>
          {projectsEditCopy.whatsappHint}
        </p>
        <div className={styles.field}>
          <label htmlFor="edit-project-wa-ar" className={styles.label}>
            {projectsEditCopy.whatsappArLabel}
          </label>
          <textarea
            id="edit-project-wa-ar"
            name="whatsapp_template_ar"
            maxLength={PROJECT_LONG_TEXT_MAX_LENGTH}
            defaultValue={values.whatsappTemplateAr}
            rows={4}
            aria-describedby="edit-project-whatsapp-hint"
            className={styles.textarea}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="edit-project-wa-en" className={styles.label}>
            {projectsEditCopy.whatsappEnLabel}
          </label>
          <textarea
            id="edit-project-wa-en"
            name="whatsapp_template_en"
            maxLength={PROJECT_LONG_TEXT_MAX_LENGTH}
            defaultValue={values.whatsappTemplateEn}
            rows={4}
            aria-describedby="edit-project-whatsapp-hint"
            className={styles.textarea}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="edit-project-notes" className={styles.label}>
            {projectsEditCopy.notesLabel}
          </label>
          <p id="edit-project-notes-hint" className={styles.hint}>
            {projectsEditCopy.notesHint}
          </p>
          <textarea
            id="edit-project-notes"
            name="notes"
            maxLength={PROJECT_LONG_TEXT_MAX_LENGTH}
            defaultValue={values.notes}
            rows={4}
            aria-describedby="edit-project-notes-hint"
            className={styles.textarea}
          />
        </div>
      </section>

      <div className={styles.actions}>
        <SubmitButton disabled={noCompanies} />
        <Link href={detailHref} className={styles.cancel}>
          {projectsEditCopy.cancel}
        </Link>
      </div>
    </form>
  );
}
