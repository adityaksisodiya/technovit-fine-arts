"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginActionResult {
  error?: string;
}

/**
 * Validates whether a redirect path is safe and points strictly to an internal `/admin` route.
 */
function getSafeRedirect(redirectParam?: string | null): string {
  if (
    redirectParam &&
    redirectParam.startsWith("/admin") &&
    !redirectParam.startsWith("//") &&
    !redirectParam.includes("://")
  ) {
    return redirectParam;
  }
  return "/admin/dashboard";
}

/**
 * Server Action for Administrator Login.
 *
 * Flow:
 * 1. Authenticates via Supabase Auth (email/password) using cookie-aware client
 * 2. Verifies `admin_users` record for the authenticated user ID through RLS
 * 3. Rejects if not an active admin (clearing session)
 * 4. Redirects to target /admin route
 */
export async function loginAction(
  _prevState: LoginActionResult | null,
  formData: FormData
): Promise<LoginActionResult | null> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const redirectParam = formData.get("redirect") as string | null;

  if (!email || !password) {
    return { error: "Please provide both email and password." };
  }

  const supabase = await createClient();

  // Step 1: Supabase Auth authentication (attaches auth cookies to response)
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError || !authData.user) {
    return { error: "Invalid credentials or unauthorized account." };
  }

  // Step 2: Verification against admin_users table via authenticated client
  const { data: adminRecord, error: dbError } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (dbError || !adminRecord) {
    // Authenticated in Supabase Auth, but NOT in admin_users table
    await supabase.auth.signOut();
    return { error: "Invalid credentials or unauthorized account." };
  }

  if (!adminRecord.is_active) {
    // Account deactivated
    await supabase.auth.signOut();
    return {
      error: "Your administrator account has been deactivated. Contact a Super Admin.",
    };
  }

  // Step 3: Success — Safe redirect
  const destination = getSafeRedirect(redirectParam);
  redirect(destination);
}
