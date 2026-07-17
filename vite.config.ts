import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Set by `tauri android dev` so physical devices can reach the dev server.
// Android emulators reach a localhost-bound server via 10.0.2.2 regardless.
const host = process.env.TAURI_DEV_HOST;

// music-metadata pulls in some Node-ish deps; alias/optimize handled by Vite defaults.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "framer-motion"],
          supabase: ["@supabase/supabase-js"],
          metadata: ["music-metadata"],
        },
      },
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    host: "0.0.0.0",
    hmr: host
      ? { protocol: "ws", host, port: 5176, clientPort: 5176 }
      : undefined,
  },
});
