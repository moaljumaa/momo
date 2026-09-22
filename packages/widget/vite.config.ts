import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import path from "node:path";

// Single-file IIFE bundle, no code splitting — one <script src="/widget.js"> embed.
export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: path.resolve(__dirname, "../../apps/web/public"),
    emptyOutDir: false,
    cssCodeSplit: false,
    minify: "esbuild",
    lib: {
      entry: path.resolve(__dirname, "src/index.tsx"),
      name: "MomoWidget",
      formats: ["iife"],
      fileName: () => "widget.js",
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
