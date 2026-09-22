export default {
  transpilePackages: ["@momo/db", "@momo/core"],
  // @momo/db re-exports @prisma/client; without this, Next tries to inline it through the
  // transpilePackages path above, fails every time (it has a native engine), and retries
  // the failed resolution on every single request — the "can't be external" warning spam
  // and a big chunk of the per-request slowness in dev.
  serverExternalPackages: ["@prisma/client"],
};
