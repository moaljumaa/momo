const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

export default {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  transpilePackages: ["@momo/db", "@momo/core"],
  // @momo/db re-exports @prisma/client; without this, Next tries to inline it through the
  // transpilePackages path above, fails every time (it has a native engine), and retries
  // the failed resolution on every single request — the "can't be external" warning spam
  // and a big chunk of the per-request slowness in dev.
  // @napi-rs/canvas ships a native .node addon (used by @momo/core's OCR path); bundling it
  // through transpilePackages breaks its relative binary resolution the same way @prisma/client
  // does above, so it must stay external too.
  // pdf-parse bundles its own nested pdfjs-dist, which dynamically imports its worker script
  // (pdf.worker.mjs) by a path relative to its own file on disk. Bundling it through Turbopack
  // relocates the JS into .next/server/chunks without that worker file, breaking the same way
  // the two packages above do, so it must stay external too.
  serverExternalPackages: ["@prisma/client", "@napi-rs/canvas", "pdf-parse"],
};
