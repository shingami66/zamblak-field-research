import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Server Supabase client factory for Server Components, Server Actions, and Route Handlers.
 * Request-scoped: creates a new client per call. Uses publishable key only.
 * Session refresh ownership belongs to a later dedicated Proxy task.
 */
export async function createClient() {
  const { url, publishableKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Cookie writes can fail in pure Server Components; Proxy task will own session refresh later.
        }
      },
    },
  });
}