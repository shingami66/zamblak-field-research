import { notFound } from "next/navigation";
import { EditCompanyForm } from "@/components/companies/EditCompanyForm";
import { BackLink } from "@/components/shared/BackLink";
import { requireAppSession } from "@/lib/auth/session";
import { companiesDetailErrorBehavior } from "@/lib/companies/detail-view-model";
import { parseCompanyIdParam } from "@/lib/companies/detail-params";
import { companiesEditCopy } from "@/lib/companies/edit-copy";
import { initialEditCompanyState } from "@/lib/companies/edit-form";
import { getCompany } from "@/lib/companies/rpc";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/companies/new/create-company.module.css";

type EditCompanyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCompanyPage({
  params,
}: EditCompanyPageProps) {
  await requireAppSession();
  const { id: rawId } = await params;

  const parsed = parseCompanyIdParam(rawId);
  if (!parsed.ok) {
    notFound();
  }

  const supabase = await createClient();
  const result = await getCompany(supabase, parsed.companyId);

  if (!result.ok) {
    const behavior = companiesDetailErrorBehavior(result.code);
    if (behavior.kind === "not_found") {
      notFound();
    }
    return (
      <div className={styles.page}>
        <BackLink href="/companies" className={styles.backLink}>{companiesEditCopy.backToCompany}</BackLink>
        <div className={styles.formError} role="alert">
          <h1 className={styles.formErrorTitle}>
            {behavior.message ?? companiesEditCopy.errorAccess}
          </h1>
        </div>
      </div>
    );
  }

  const initialState = initialEditCompanyState(result.data);
  const detailHref = `/companies/${result.data.companyId}`;

  return (
    <div className={styles.page}>
      <BackLink href={detailHref} className={styles.backLink}>{companiesEditCopy.backToCompany}</BackLink>
      <h1 className={styles.pageTitle}>{companiesEditCopy.pageTitle}</h1>
      <p className={styles.pageDescription}>
        {companiesEditCopy.pageDescription}
      </p>
      <div className={styles.surface}>
        <EditCompanyForm initialState={initialState} />
      </div>
    </div>
  );
}
