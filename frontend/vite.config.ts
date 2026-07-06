import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server proxies API, uploads and the WebSocket to the FastAPI backend
// on :8000, so the frontend can use same-origin relative URLs everywhere.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/uploads": { target: "http://localhost:8000", changeOrigin: true },
      "/ws": { target: "ws://localhost:8000", ws: true },
    },
  },
});
