import {
  applyAccept,
  applyCancel,
  applyReject,
  generateCollectionCode,
  generateFormCode,
  validateCollectionDraft,
  validateNewForm,
} from "./domain";
import { createInitialPrototypeState } from "./fixtures";
import type {
  CollectionAllocation,
  PrototypeStoreAction,
  PrototypeStoreState,
  ResearchForm,
} from "./types";

/**
 * The single pure mutation path for the prototype store. The store re-validates
 * every command with the same domain functions used by the UI, so an invalid
 * command can never corrupt state (it is returned unchanged).
 */

function yearOf(iso: string, fallback: string): number {
  const parsed = Number.parseInt(iso.slice(0, 4), 10);
  if (Number.isFinite(parsed) && parsed > 1900) {
    return parsed;
  }
  const fallbackYear = Number.parseInt(fallback.slice(0, 4), 10);
  return Number.isFinite(fallbackYear) ? fallbackYear : 2026;
}

function nextEntityId(existingIds: readonly string[], prefix: string): string {
  let max = 0;
  for (const id of existingIds) {
    if (!id.startsWith(prefix)) {
      continue;
    }
    const parsed = Number.parseInt(id.slice(prefix.length), 10);
    if (Number.isFinite(parsed) && parsed > max) {
      max = parsed;
    }
  }
  return `${prefix}${max + 1}`;
}

export function prototypeReducer(
  state: PrototypeStoreState,
  action: PrototypeStoreAction
): PrototypeStoreState {
  switch (action.type) {
    case "hydrate":
      return action.state;

    case "reset":
      return createInitialPrototypeState();

    case "create_form": {
      const validated = validateNewForm(action.input, {
        participations: state.participations,
        forms: state.forms,
      });
      if (!validated.ok) {
        return state;
      }

      const project = state.projects.find(
        (item) => item.id === action.input.projectId
      );
      const participation = state.participations.find(
        (item) =>
          item.projectId === action.input.projectId &&
          item.participantId === action.input.participantId
      );
      if (!project || !participation) {
        return state;
      }

      const code = generateFormCode(
        state.forms,
        yearOf(action.now, action.now)
      );
      const id = nextEntityId(
        state.forms.map((form) => form.id),
        "frm-"
      );

      const newForm: ResearchForm = {
        id,
        code,
        companyId: project.companyId,
        projectId: project.id,
        participantId: action.input.participantId,
        participationId: participation.id,
        attemptNumber: validated.value.attemptNumber,
        submittedDate: action.input.submittedDate,
        reviewedDate: null,
        status: "pending_review",
        rejectionReason: null,
        notes: action.input.notes,
        acceptedPriceSnapshot: null,
        history: [
          {
            id: `tr-${id}-1`,
            from: null,
            to: "pending_review",
            at: action.now,
            reason: null,
            note: null,
          },
        ],
      };

      return { ...state, forms: [...state.forms, newForm] };
    }

    case "accept_form": {
      const form = state.forms.find((item) => item.id === action.formId);
      if (!form) {
        return state;
      }
      const project = state.projects.find((item) => item.id === form.projectId);
      if (!project) {
        return state;
      }
      const transitionId = nextEntityId(
        form.history.map((entry) => entry.id),
        `tr-${form.id}-`
      );
      const result = applyAccept(
        form,
        project,
        state.forms,
        action.now,
        transitionId
      );
      if (!result.ok) {
        return state;
      }
      return {
        ...state,
        forms: state.forms.map((item) =>
          item.id === form.id ? result.value : item
        ),
      };
    }

    case "reject_form": {
      const form = state.forms.find((item) => item.id === action.formId);
      if (!form) {
        return state;
      }
      const transitionId = nextEntityId(
        form.history.map((entry) => entry.id),
        `tr-${form.id}-`
      );
      const result = applyReject(
        form,
        action.reason,
        action.now,
        transitionId
      );
      if (!result.ok) {
        return state;
      }
      return {
        ...state,
        forms: state.forms.map((item) =>
          item.id === form.id ? result.value : item
        ),
      };
    }

    case "cancel_form": {
      const form = state.forms.find((item) => item.id === action.formId);
      if (!form) {
        return state;
      }
      const transitionId = nextEntityId(
        form.history.map((entry) => entry.id),
        `tr-${form.id}-`
      );
      const result = applyCancel(form, action.now, transitionId);
      if (!result.ok) {
        return state;
      }
      return {
        ...state,
        forms: state.forms.map((item) =>
          item.id === form.id ? result.value : item
        ),
      };
    }

    case "create_collection": {
      const validated = validateCollectionDraft(action.input, {
        forms: state.forms,
        collections: state.collections,
      });
      if (!validated.ok) {
        return state;
      }

      const code = generateCollectionCode(
        state.collections,
        yearOf(action.input.date, action.now)
      );
      const id = nextEntityId(
        state.collections.map((collection) => collection.id),
        "col-"
      );

      const allocations: CollectionAllocation[] = action.input.allocations.map(
        (allocation, index) => ({
          id: `${id}-alloc-${index + 1}`,
          formId: allocation.formId,
          amount: allocation.amount,
        })
      );

      return {
        ...state,
        collections: [
          ...state.collections,
          {
            id,
            code,
            companyId: action.input.companyId,
            date: action.input.date,
            totalAmount: action.input.totalAmount,
            method: action.input.method,
            reference: action.input.reference,
            notes: action.input.notes,
            allocations,
          },
        ],
      };
    }

    default:
      return state;
  }
}
