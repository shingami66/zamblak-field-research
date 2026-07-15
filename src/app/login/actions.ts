"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveCurrentProfile } from "@/lib/auth/profile";

export type LoginActionState = {
  error: string | null;
};

const INVALID_CREDENTIALS_AR =
  "تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.";
const PROFILE_DENIED_AR =
  "لا يمكن فتح حسابك حالياً. تواصل مع مسؤول النظام.";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Email/password sign-in. Role and account come only from resolve_current_profile().
 * Fail-closed: any profile resolution failure signs the user out.
 */
export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
  const password = typeof passwordRaw === "string" ? passwordRaw : "";

  if (!email || !password || !isValidEmail(email)) {
    return { error: INVALID_CREDENTIALS_AR };
  }

  const supabase = await createClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: INVALID_CREDENTIALS_AR };
  }

  const resolved = await resolveCurrentProfile(supabase);
  if (!resolved.ok) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: PROFILE_DENIED_AR };
  }

  redirect("/");
}
