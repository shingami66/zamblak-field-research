"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { transitionProjectStatusAction } from "@/app/projects/[projectId]/actions";
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

function TransitionSubmitButton({
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
      {pending ? projectsDetailCopy.transitioning : label}
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
  actions,
}: ProjectLifecycleActionsProps) {
  const [state, formAction] = useActionState(
    transitionProjectStatusAction,
    EMPTY_TRANSITION_PROJECT_STATE
  );

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
          <form
            key={action.targetStatus}
            action={formAction}
            className={styles.lifecycleForm}
          >
            <input type="hidden" name="project_id" value={projectId} />
            <input
              type="hidden"
              name="expected_updated_at"
              value={expectedUpdatedAt}
            />
            <input
              type="hidden"
              name="target_status"
              value={action.targetStatus}
            />
            <TransitionSubmitButton
              label={action.label}
              variant={lifecycleVariant(action.targetStatus)}
            />
          </form>
        ))}
      </div>
    </section>
  );
}
