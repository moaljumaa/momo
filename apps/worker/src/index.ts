try {
  process.loadEnvFile(); // local dev; in Docker the environment is injected instead
} catch {}
await import("./run.js");
