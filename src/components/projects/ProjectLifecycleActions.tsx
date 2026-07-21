"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { transitionProjectStatusAction } from "@/app/projects/[projectId]/actions";
import { ZamblakLoadingMark } from "@/components/brand/ZamblakLoadingMark";
import { projectsDetailCopy } from "@/lib/projects/detail-copy";
import {
  EMPTY_TRANSITION_PROJECT_STATE,
} from "@/lib/projects/detail-transition";
import type { ProjectLifecycleActionView } from "@/lib/projects/detail-view-model";
import type { ProjectStatus } from "@/lib/projects/types";
import styles from "@/app/projects/[projectId]/project-detail.module.css";

type ProjectLifecycleActionsProps = {
  projectId: string;
  expectedUpdatedAt: string;
  projectName: string;
  actions: ProjectLifecycleActionView[];
};

type LifecycleVariant = "activate" | "cancel" | "close";

function lifecycleVariant(target: ProjectStatus): LifecycleVariant {
  if (target === "active") {
    return "activate";
  }
  if (target === "cancelled") {
    return "cancel";
  }
  return "close";
}

function lifecycleButtonClass(variant: LifecycleVariant): string {
  switch (variant) {
    case "activate":
      return `${styles.lifecycleAction} ${styles.lifecycleActivate}`;
    case "cancel":
      return `${styles.lifecycleAction} ${styles.lifecycleCancel}`;
    case "close":
      return `${styles.lifecycleAction} ${styles.lifecycleClose}`;
    default:
      return styles.lifecycleAction;
  }
}

function ConfirmationSubmitButton({
  label,
  variant,
}: {
  label: string;
  variant: LifecycleVariant;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={lifecycleButtonClass(variant)}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <span className={styles.pendingContent}>
          <ZamblakLoadingMark variant="compact" className={styles.pendingMark} />
          <span>{projectsDetailCopy.transitioning}</span>
        </span>
      ) : (
        label
      )}
    </button>
  );
}

/**
 * Owner-only lifecycle controls. Render only when server confirmed Owner role.
 * Does not grant authority by itself — action re-checks role and DB enforces.
 */
export function ProjectLifecycleActions({
  projectId,
  expectedUpdatedAt,
  projectName,
  actions,
}: ProjectLifecycleActionsProps) {
  const [state, formAction] = useActionState(
    transitionProjectStatusAction,
    EMPTY_TRANSITION_PROJECT_STATE
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pendingAction, setPendingAction] = useState<ProjectLifecycleActionView | null>(null);

  useEffect(() => {
    if (pendingAction && !dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, [pendingAction]);

  function openConfirmation(action: ProjectLifecycleActionView, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setPendingAction(action);
  }

  function restoreTriggerFocus() {
    setPendingAction(null);
    triggerRef.current?.focus();
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.lifecycleSection}
      aria-labelledby="project-lifecycle-heading"
    >
      <h2 id="project-lifecycle-heading" className={styles.sectionTitle}>
        {projectsDetailCopy.lifecycleHeading}
      </h2>
      <p className={styles.lifecycleHint}>{projectsDetailCopy.lifecycleHint}</p>

      {state.formError ? (
        <div
          className={styles.formError}
          role="alert"
          aria-atomic="true"
        >
          <strong className={styles.formErrorTitle}>
            {projectsDetailCopy.formErrorHeading}
          </strong>
          <p className={styles.formErrorText}>{state.formError}</p>
        </div>
      ) : null}

      <div className={styles.lifecycleActions}>
        {actions.map((action) => (
          <button
            key={action.targetStatus}
            type="button"
            className={lifecycleButtonClass(lifecycleVariant(action.targetStatus))}
            onClick={(event) => openConfirmation(action, event.currentTarget)}
          >
            {action.label}
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className={styles.lifecycleDialog}
        aria-labelledby="lifecycle-confirmation-title"
        onCancel={(event) => {
          event.preventDefault();
          dialogRef.current?.close();
        }}
        onClose={restoreTriggerFocus}
      >
        {pendingAction ? (
          <div className={styles.lifecycleDialogContent}>
            <h3 id="lifecycle-confirmation-title" className={styles.lifecycleDialogTitle}>
              {projectsDetailCopy.confirmLifecycleTitle}
            </h3>
            <p className={styles.lifecycleDialogText}>
              {projectsDetailCopy.confirmLifecycleDescription} <strong>{pendingAction.label}</strong> — {projectName}
            </p>
            <div className={styles.lifecycleDialogActions}>
              <form action={formAction} className={styles.lifecycleForm}>
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="expected_updated_at" value={expectedUpdatedAt} />
                <input type="hidden" name="target_status" value={pendingAction.targetStatus} />
                <ConfirmationSubmitButton
                  label={projectsDetailCopy.confirmLifecycleProceed}
                  variant={lifecycleVariant(pendingAction.targetStatus)}
                />
              </form>
              <form method="dialog" className={styles.lifecycleForm}>
                <button type="submit" className={styles.lifecycleDialogCancel}>
                  {projectsDetailCopy.confirmLifecycleCancel}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
