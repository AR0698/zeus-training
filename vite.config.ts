import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Zeus Training is a fully static, local-first single page app.
 *
 * `BASE_PATH` is what makes the same build work both on a GitHub Pages project
 * site (`https://<user>.github.io/zeus-training/`) and on a local dev server.
 * The CI workflow sets it; everything else falls back to root.
 */
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  build: {
    target: "es2022",
    // A gym phone on 3G should not download a megabyte of JS.
    chunkSizeWarningLimit: 400,
    sourcemap: true,
  },
  server: {
    host: true,
    port: 5173,
  },
  plugins: [react()],
});
