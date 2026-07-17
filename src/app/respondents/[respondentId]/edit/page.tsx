import Link from "next/link";
import { notFound } from "next/navigation";
import { EditRespondentForm } from "@/components/respondents/EditRespondentForm";
import { requireAppSession } from "@/lib/auth/session";
import { parseRespondentDetailParam } from "@/lib/respondents/detail-params";
import { respondentDetailErrorBehavior } from "@/lib/respondents/detail-view-model";
import { respondentsEditCopy } from "@/lib/respondents/edit-copy";
import { initialEditRespondentState } from "@/lib/respondents/edit-form";
import { getRespondent } from "@/lib/respondents/rpc";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/respondents/new/create-respondent.module.css";
import { updateRespondentAction } from "./actions";

type EditRespondentPageProps = {
  params: Promise<{ respondentId: string }>;
};

export default async function EditRespondentPage({
  params,
}: EditRespondentPageProps) {
  await requireAppSession();
  const { respondentId: rawId } = await params;

  const parsed = parseRespondentDetailParam(rawId);
  if (!parsed.ok) {
    notFound();
  }

  const supabase = await createClient();
  const result = await getRespondent(supabase, parsed.respondentId);

  if (!result.ok) {
    const behavior = respondentDetailErrorBehavior(result.code);
    if (behavior.kind === "not_found") {
      notFound();
    }
    return (
      <div className={styles.page}>
        <Link href="/respondents" className={styles.backLink}>
          ← {respondentsEditCopy.backToDetail}
        </Link>
        <div className={styles.formError} role="alert">
          <h1 className={styles.formErrorTitle}>
            {behavior.message ?? respondentsEditCopy.errorUnexpected}
          </h1>
        </div>
      </div>
    );
  }

  const respondent = result.data;
  const detailHref = `/respondents/${respondent.respondentId}`;
  const editHref = `/respondents/${respondent.respondentId}/edit`;
  const initialState = initialEditRespondentState(respondent);

  const updateAction = updateRespondentAction.bind(null, {
    respondentId: respondent.respondentId,
    expectedUpdatedAt: respondent.updatedAt,
  });

  return (
    <div className={styles.page}>
      <Link href={detailHref} className={styles.backLink}>
        ← {respondentsEditCopy.backToDetail}
      </Link>
      <h1 className={styles.pageTitle}>{respondentsEditCopy.pageTitle}</h1>
      <p className={styles.pageDescription}>
        {respondentsEditCopy.pageDescription}
      </p>
      <div className={styles.surface}>
        <EditRespondentForm
          action={updateAction}
          initialState={initialState}
          detailHref={detailHref}
          editHref={editHref}
        />
      </div>
    </div>
  );
}
