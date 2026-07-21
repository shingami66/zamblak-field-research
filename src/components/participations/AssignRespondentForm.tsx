"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  checkAssignmentWarningsAction,
  createParticipationAction,
} from "@/app/projects/[projectId]/add-respondent/actions";
import {
  EMPTY_ASSIGNMENT_WARNING_STATE,
  EMPTY_CREATE_PARTICIPATION_STATE,
  type AssignmentWarningActionState,
} from "@/app/projects/[projectId]/add-respondent/state";
import { participationCopy } from "@/lib/participations/copy";
import type { RespondentListItem } from "@/lib/respondents/types";
import styles from "@/app/projects/[projectId]/add-respondent/add-respondent.module.css";

function CreateParticipationButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={styles.primaryAction} type="submit" disabled={pending || disabled}>
      {pending
        ? participationCopy.creatingParticipation
        : participationCopy.createParticipation}
    </button>
  );
}

type AssignRespondentFormProps = {
  projectId: string;
  respondents: RespondentListItem[];
};

export function AssignRespondentForm({
  projectId,
  respondents,
}: AssignRespondentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedRespondentId, setSelectedRespondentId] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const [warningState, setWarningState] = useState<AssignmentWarningActionState>(
    EMPTY_ASSIGNMENT_WARNING_STATE
  );

  const [createState, createAction] = useActionState(
    createParticipationAction,
    EMPTY_CREATE_PARTICIPATION_STATE
  );

  useEffect(() => {
    return () => {
      requestSequence.current += 1;
    };
  }, []);

  if (respondents.length === 0) {
    return <p className={styles.emptyState}>{participationCopy.noRespondents}</p>;
  }

  function handleSelect(respondentId: string) {
    setSelectedRespondentId(respondentId);
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setWarningState(EMPTY_ASSIGNMENT_WARNING_STATE);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("project_id", projectId);
      formData.append("respondent_id", respondentId);
      const result = await checkAssignmentWarningsAction(
        EMPTY_ASSIGNMENT_WARNING_STATE,
        formData
      );
      if (requestSequence.current !== requestId) {
        return;
      }
      setWarningState(result);
    });
  }

  const hasRealWarning = Boolean(
    warningState.warning &&
      (warningState.warning.threeMonthWarning ||
        warningState.warning.eligibilityWarning)
  );

  return (
    <div className={styles.formStack}>
      <form action={createAction} className={styles.form} noValidate>
        <input name="project_id" type="hidden" value={projectId} />
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>
            {participationCopy.selectRespondent}
          </legend>
          <div className={styles.respondentList}>
            {respondents.map((respondent) => (
              <label className={styles.respondentOption} key={respondent.respondentId}>
                <input
                  name="respondent_id"
                  type="radio"
                  value={respondent.respondentId}
                  required
                  checked={selectedRespondentId === respondent.respondentId}
                  onChange={() => handleSelect(respondent.respondentId)}
                />
                <span className={styles.respondentName}>
                  {respondent.name || participationCopy.noNameFallback}
                </span>
                <span className={styles.respondentMobile} dir="ltr">
                  {respondent.mobile}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div id="participation-warnings" className={styles.warningRegion} aria-live="polite">
          {isPending ? (
            <p className={styles.checking}>{participationCopy.checkingWarnings}</p>
          ) : warningState.status === "error" ? (
            <p className={styles.formError} role="alert">
              {warningState.formError}
            </p>
          ) : warningState.status === "ready" && warningState.warning ? (
            hasRealWarning ? (
              <section className={styles.warningPanel}>
                <h2 className={styles.warningTitle}>
                  {participationCopy.warningsHeading}
                </h2>
                {warningState.warning.threeMonthWarning ? (
                  <p className={styles.warningItem}>
                    {participationCopy.threeMonthWarning}
                  </p>
                ) : null}
                {warningState.warning.eligibilityWarning ? (
                  <>
                    <p className={styles.warningItem}>
                      {participationCopy.eligibilityWarning}
                    </p>
                    <ul className={styles.warningList}>
                      {warningState.warning.eligibilityWarningCodes.map((code) => (
                        <li key={code}>{participationCopy.eligibilityWarnings[code]}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <p className={styles.warningProceed}>
                  {participationCopy.warningProceed}
                </p>
              </section>
            ) : (
              <p className={styles.noWarnings}>{participationCopy.noWarnings}</p>
            )
          ) : null}
        </div>

        {createState.formError ? (
          <p className={styles.formError} role="alert">
            {createState.formError}
          </p>
        ) : null}

        <CreateParticipationButton
          disabled={
            !selectedRespondentId ||
            isPending ||
            warningState.status !== "ready" ||
            warningState.respondentId !== selectedRespondentId
          }
        />
      </form>
    </div>
  );
}
