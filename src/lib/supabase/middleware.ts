import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Validates whether a redirect path is safe and points strictly to an internal `/admin` route.
 */
function getSafeAdminRedirect(redirectParam?: string | null): string {
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
 * Middleware session handler and route guard for Supabase.
 *
 * Enforces server-side route protection on all `/admin/*` routes:
 * 1. Anonymous visitors: allowed on public routes (`/`, etc.)
 * 2. Unauthenticated requests to `/admin/*`: redirected to `/admin/login`
 * 3. Authenticated requests to `/admin/*`: verified against `admin_users` table (must be `is_active = true`)
 * 4. Authenticated admins visiting `/admin/login`: redirected to `/admin/dashboard`
 * 5. Refreshes auth tokens and synchronizes response cookies
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Handle /admin route protection
  if (pathname.startsWith("/admin")) {
    const isLoginPage = pathname === "/admin/login";
    const isUnauthorizedPage = pathname === "/admin/unauthorized";

    // Unauthenticated user attempting to access protected admin route
    if (!user && !isLoginPage && !isUnauthorizedPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/login";
      if (pathname !== "/admin" && pathname !== "/admin/dashboard") {
        redirectUrl.searchParams.set("redirect", pathname);
      }
      return NextResponse.redirect(redirectUrl);
    }

    // Exact /admin path -> redirect to dashboard or login
    if (pathname === "/admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = user ? "/admin/dashboard" : "/admin/login";
      return NextResponse.redirect(redirectUrl);
    }

    // Authenticated user checks
    if (user) {
      // Query admin_users table to verify active administrator profile
      const { data: adminRecord } = await supabase
        .from("admin_users")
        .select("role, is_active")
        .eq("id", user.id)
        .maybeSingle();

      const isActiveAdmin = Boolean(adminRecord && adminRecord.is_active);

      // If user is an active admin on the login page, send them to dashboard
      if (isLoginPage && isActiveAdmin) {
        const redirectParam = request.nextUrl.searchParams.get("redirect");
        const destination = getSafeAdminRedirect(redirectParam);
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.search = "";
        redirectUrl.pathname = destination;
        return NextResponse.redirect(redirectUrl);
      }

      // If user is authenticated in Supabase Auth but NOT an active admin in admin_users
      if (!isLoginPage && !isUnauthorizedPage && !isActiveAdmin) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/admin/login";
        redirectUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return supabaseResponse;
}
