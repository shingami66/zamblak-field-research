"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const LOGOUT_FAILED_AR = "تعذر تسجيل الخروج. حاول مرة أخرى.";

/**
 * Signs out only through the request-scoped authenticated Supabase client.
 * Accepts no browser-supplied identity, role, account, or redirect authority.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    throw new Error(LOGOUT_FAILED_AR);
  }

  redirect("/login");
}
