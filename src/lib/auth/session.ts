import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  resolveCurrentProfile,
  type AppProfile,
  type ProfileFailureCode,
} from "@/lib/auth/profile";

export type AppSession = {
  user: User;
  profile: AppProfile;
};

export type SessionLoadResult =
  | { status: "authenticated"; session: AppSession }
  | { status: "unauthenticated" }
  | { status: "profile_failed"; code: ProfileFailureCode };

/**
 * Loads auth user via getUser() then resolves the active app profile.
 * Cached per React request to avoid duplicate RPC on layout + page.
 */
export const loadAppSession = cache(async (): Promise<SessionLoadResult> => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "unauthenticated" };
  }

  const resolved = await resolveCurrentProfile(supabase);
  if (!resolved.ok) {
    return { status: "profile_failed", code: resolved.code };
  }

  return {
    status: "authenticated",
    session: {
      user,
      profile: resolved.profile,
    },
  };
});

/** Optional session for shared chrome (header). Never trusts client role. */
export async function getOptionalAppSession(): Promise<AppSession | null> {
  const result = await loadAppSession();
  if (result.status !== "authenticated") {
    return null;
  }
  return result.session;
}

/**
 * Fail-closed gate for protected routes.
 * Signs out when Auth is valid but profile cannot authorize the app.
 */
export async function requireAppSession(): Promise<AppSession> {
  const result = await loadAppSession();

  if (result.status === "unauthenticated") {
    redirect("/login");
  }

  if (result.status === "profile_failed") {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login?reason=profile");
  }

  return result.session;
}

/** Redirect authenticated users with a valid profile away from /login. */
export async function redirectIfAuthenticated(): Promise<void> {
  const result = await loadAppSession();
  if (result.status === "authenticated") {
    redirect("/");
  }

  if (result.status === "profile_failed") {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }
}
