/**
 * Public Supabase environment contract.
 * Reads only browser-safe NEXT_PUBLIC variables via static access.
 * Validation runs when called, not at module import.
 */

export type SupabasePublicEnv = {
  url: string;
  publishableKey: string;
};

/**
 * Returns validated public Supabase configuration.
 * Throws a stable, non-secret error if required variables are missing.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing required Supabase public environment configuration"
    );
  }

  return {
    url,
    publishableKey,
  };
}