import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "motivaction_session";

const PUBLIC_ROUTES = new Set(["/login", "/login/verify"]);

function isAssetPath(pathname: string): boolean {
  return pathname.startsWith("/_next") || pathname === "/favicon.ico";
}

function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // 'strict-dynamic' lets Next's nonce'd bootstrap script load its own
    // chunks without listing every hash; 'unsafe-eval' is dev-only (React's
    // debug tooling needs it, and neither React nor Next use eval in prod).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Tailwind emits its cascade layers as a single inlined <style> tag at
    // build time with no way to attach a nonce, so style-src still needs
    // 'unsafe-inline'. This is a real, narrower trade-off than script-src:
    // injected <style> can be used for CSS-based data exfiltration or UI
    // redressing, but not for arbitrary script execution.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/**
 * Optimistic auth check only (cookie signature verification, no database
 * round-trip) — this keeps Proxy fast, per Next.js guidance. The real,
 * database-backed authorization check (active user, role) happens in the
 * Data Access Layer (`requireUser` / `requireAdmin`) used by every Server
 * Component, Server Action, and Route Handler that touches data.
 *
 * Also generates a fresh per-request CSP nonce (see buildCspHeader) — every
 * response gets its own nonce, so an attacker who wants to inject a script
 * would need to guess it fresh on every single request.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = buildCspHeader(nonce);

  function withCsp(response: NextResponse): NextResponse {
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  }

  if (isAssetPath(pathname)) {
    return NextResponse.next();
  }

  // API routes speak JSON/CSV/PDF, not HTML — they should return a proper
  // 401 from their own `requireUser()` check (see src/lib/auth/session.ts)
  // rather than being redirected to the HTML login page by Proxy. CSP is
  // irrelevant to non-HTML responses, so they're skipped entirely here.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let hasValidSession = false;

  if (token) {
    const secret = process.env.AUTH_SECRET;
    if (secret) {
      try {
        await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
        hasValidSession = true;
      } catch {
        hasValidSession = false;
      }
    }
  }

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  if (!isPublicRoute && !hasValidSession) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
    return withCsp(NextResponse.redirect(loginUrl));
  }

  if (isPublicRoute && hasValidSession) {
    return withCsp(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
