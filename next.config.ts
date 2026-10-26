import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 * Protects against clickjacking, MIME sniffing, XSS payloads, and referrer leaks.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js injects inline bootstrap scripts; styles need inline for React
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.payu.in https://api.payu.in https://www.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.blob.vercel-storage.com https://*.public.blob.vercel-storage.com",
      "connect-src 'self' https://*.blob.vercel-storage.com https://api.payu.in",
      "frame-src https://checkout.payu.in https://api.payu.in",
      "form-action 'self' https://secure.payu.in https://test.payu.in",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Immutable uploaded assets can be cached aggressively
        source: "/api/blob",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
