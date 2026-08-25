import type { NextConfig } from "next";

// Content-Security-Policy is deliberately NOT set here — it's generated
// per-request in src/proxy.ts with a fresh nonce, since a static CSP can't
// carry a nonce. Everything below is safe to set statically.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Tells browsers to only ever talk to this origin over HTTPS, for a full
  // year, including subdomains — closes the window for a network attacker
  // to downgrade a request to plain HTTP. Harmless to send in development
  // (browsers ignore it on a non-HTTPS origin), but only meaningful once
  // deployed behind TLS (e.g. Vercel terminates TLS for you by default).
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Removes the "X-Powered-By: Next.js" response header — no reason to
  // advertise the framework/version to every visitor.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
